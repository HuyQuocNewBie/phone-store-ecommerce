-- ============================================================================
-- MIGRATION V2: PHONE STORE E-COMMERCE
-- Tương thích: MariaDB 10.4+ & MySQL 8.0+
-- Bảng mã: utf8mb4 / utf8mb4_unicode_ci
-- Đặc điểm: Idempotent (an toàn khi chạy lại nhiều lần), không làm mất dữ liệu cũ
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. TẠO BẢNG `banner`
-- ============================================================================
CREATE TABLE IF NOT EXISTS `banner` (
  `MaBanner` int(11) NOT NULL AUTO_INCREMENT,
  `TieuDe` varchar(255) NOT NULL,
  `MoTaNgan` varchar(500) DEFAULT NULL,
  `HinhAnh` varchar(255) NOT NULL,
  `LienKetDich` varchar(255) DEFAULT NULL,
  `ThuTuHienThi` int(11) NOT NULL DEFAULT 1,
  `TrangThai` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1: Hiển thị, 0: Ẩn',
  `NgayTao` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`MaBanner`),
  KEY `idx_banner_trangthai_thutu` (`TrangThai`, `ThuTuHienThi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. TẠO BẢNG `sanpham_bienthe` & MIGRATE DỮ LIỆU TỪ `sanpham`
-- ============================================================================
CREATE TABLE IF NOT EXISTS `sanpham_bienthe` (
  `MaBienThe` int(11) NOT NULL AUTO_INCREMENT,
  `MaSanPham` int(11) NOT NULL,
  `MaSKU` varchar(100) NOT NULL,
  `MauSac` varchar(50) DEFAULT NULL,
  `DungLuong` varchar(50) DEFAULT NULL,
  `GiaBan` decimal(18,2) NOT NULL,
  `GiaNhapGanNhat` decimal(18,2) NOT NULL DEFAULT 0.00,
  `TonKho` int(11) NOT NULL DEFAULT 0,
  `TrangThai` enum('DangBan','HetHang','NgungBan') NOT NULL DEFAULT 'DangBan',
  PRIMARY KEY (`MaBienThe`),
  UNIQUE KEY `MaSKU` (`MaSKU`),
  KEY `idx_bienthe_sanpham` (`MaSanPham`),
  CONSTRAINT `fk_bienthe_sanpham` FOREIGN KEY (`MaSanPham`) REFERENCES `sanpham` (`MaSanPham`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ánh xạ toàn bộ sản phẩm hiện có sang biến thể mặc định để giữ nguyên tồn kho cũ
-- (Chỉ chèn cho các sản phẩm chưa có biến thể nào trong `sanpham_bienthe`)
INSERT INTO `sanpham_bienthe` (
  `MaSanPham`,
  `MaSKU`,
  `MauSac`,
  `DungLuong`,
  `GiaBan`,
  `GiaNhapGanNhat`,
  `TonKho`,
  `TrangThai`
)
SELECT
  sp.`MaSanPham`,
  CONCAT('SP', LPAD(sp.`MaSanPham`, 4, '0'), '-DEFAULT') AS `MaSKU`,
  COALESCE(NULLIF(TRIM(SUBSTRING_INDEX(COALESCE(sp.`MauSac`, ''), ',', 1)), ''), 'Mặc định') AS `MauSac`,
  COALESCE(NULLIF(TRIM(SUBSTRING_INDEX(COALESCE(sp.`DungLuong`, ''), ',', 1)), ''), 'Tiêu chuẩn') AS `DungLuong`,
  sp.`Gia` AS `GiaBan`,
  COALESCE(
    (
      SELECT ctpn.`DonGiaNhap`
      FROM `chitietphieunhap` ctpn
      INNER JOIN `phieunhapkho` pnk ON ctpn.`MaPhieuNhap` = pnk.`MaPhieuNhap`
      WHERE ctpn.`MaSanPham` = sp.`MaSanPham`
        AND pnk.`TrangThai` = 'DaDuyet'
      ORDER BY pnk.`NgayNhap` DESC, ctpn.`MaChiTietNhap` DESC
      LIMIT 1
    ),
    0.00
  ) AS `GiaNhapGanNhat`,
  COALESCE(sp.`TonKho`, 0) AS `TonKho`,
  CASE
    WHEN sp.`TrangThai` = 'NgungBan' THEN 'NgungBan'
    WHEN COALESCE(sp.`TonKho`, 0) <= 0 THEN 'HetHang'
    ELSE 'DangBan'
  END AS `TrangThai`
FROM `sanpham` sp
WHERE NOT EXISTS (
  SELECT 1
  FROM `sanpham_bienthe` bt
  WHERE bt.`MaSanPham` = sp.`MaSanPham`
);

-- ============================================================================
-- 3. CẬP NHẬT BẢNG `voucher`
-- ============================================================================
-- 3.1 Thêm cột `NhomVoucher`
SET @sql = IF(
  (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'voucher'
      AND COLUMN_NAME = 'NhomVoucher'
  ) = 0,
  "ALTER TABLE `voucher` ADD COLUMN `NhomVoucher` ENUM('GiamGiaDon','FreeShip') NOT NULL DEFAULT 'GiamGiaDon' AFTER `Code`",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3.2 Mở rộng ENUM `LoaiGiam` thêm 'freeship'
ALTER TABLE `voucher`
  MODIFY COLUMN `LoaiGiam` ENUM('tien','phantram','freeship') NOT NULL;

-- 3.3 Thêm cột `GiamToiDa`
SET @sql = IF(
  (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'voucher'
      AND COLUMN_NAME = 'GiamToiDa'
  ) = 0,
  'ALTER TABLE `voucher` ADD COLUMN `GiamToiDa` DECIMAL(18,2) DEFAULT NULL AFTER `LoaiGiam`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- 4. TẠO BẢNG `donhang_voucher` & ĐỒNG BỘ DỮ LIỆU VOUCHER ĐƠN HÀNG CŨ
-- ============================================================================
CREATE TABLE IF NOT EXISTS `donhang_voucher` (
  `MaDonHang` int(11) NOT NULL,
  `MaVoucher` int(11) NOT NULL,
  `SoTienGiam` decimal(18,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`MaDonHang`, `MaVoucher`),
  KEY `idx_donhang_voucher_voucher` (`MaVoucher`),
  CONSTRAINT `fk_donhang_voucher_donhang` FOREIGN KEY (`MaDonHang`) REFERENCES `donhang` (`MaDonHang`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_donhang_voucher_voucher` FOREIGN KEY (`MaVoucher`) REFERENCES `voucher` (`MaVoucher`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Đồng bộ dữ liệu đơn hàng cũ đã dùng voucher sang bảng `donhang_voucher`
INSERT IGNORE INTO `donhang_voucher` (`MaDonHang`, `MaVoucher`, `SoTienGiam`)
SELECT
  dh.`MaDonHang`,
  dh.`MaVoucher`,
  COALESCE(dh.`SoTienGiam`, 0.00)
FROM `donhang` dh
WHERE dh.`MaVoucher` IS NOT NULL;

-- ============================================================================
-- 5. TẠO BẢNG `thongbao`
-- ============================================================================
CREATE TABLE IF NOT EXISTS `thongbao` (
  `MaThongBao` int(11) NOT NULL AUTO_INCREMENT,
  `VaiTroNhan` int(11) NOT NULL COMMENT '1: Admin, 3: Warehouse',
  `TieuDe` varchar(255) NOT NULL,
  `NoiDung` text DEFAULT NULL,
  `LoaiThongBao` enum('DonHang','KhoVan','DoiTra','DanhGia') NOT NULL,
  `LienKet` varchar(255) DEFAULT NULL,
  `DaDoc` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0: Chưa đọc, 1: Đã đọc',
  `NgayTao` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`MaThongBao`),
  KEY `idx_thongbao_vaitro_dadoc` (`VaiTroNhan`, `DaDoc`, `NgayTao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. THÊM CỘT KHÓA NGOẠI `MaBienThe` VÀO 5 BẢNG LIÊN QUAN
--    (`giohang`, `chitietdonhang`, `chitietphieunhap`, `phieudieuchinhkho`, `lichsutonkho`)
-- ============================================================================

-- 6.1 Bảng `giohang`
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'giohang' AND COLUMN_NAME = 'MaBienThe') = 0,
  'ALTER TABLE `giohang` ADD COLUMN `MaBienThe` INT(11) NULL AFTER `MaSanPham`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'giohang' AND INDEX_NAME = 'idx_giohang_bienthe') = 0,
  'ALTER TABLE `giohang` ADD KEY `idx_giohang_bienthe` (`MaBienThe`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'giohang' AND CONSTRAINT_NAME = 'fk_giohang_bienthe') = 0,
  'ALTER TABLE `giohang` ADD CONSTRAINT `fk_giohang_bienthe` FOREIGN KEY (`MaBienThe`) REFERENCES `sanpham_bienthe` (`MaBienThe`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6.2 Bảng `chitietdonhang`
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chitietdonhang' AND COLUMN_NAME = 'MaBienThe') = 0,
  'ALTER TABLE `chitietdonhang` ADD COLUMN `MaBienThe` INT(11) NULL AFTER `MaSanPham`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chitietdonhang' AND INDEX_NAME = 'idx_chitietdonhang_bienthe') = 0,
  'ALTER TABLE `chitietdonhang` ADD KEY `idx_chitietdonhang_bienthe` (`MaBienThe`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'chitietdonhang' AND CONSTRAINT_NAME = 'fk_chitietdonhang_bienthe') = 0,
  'ALTER TABLE `chitietdonhang` ADD CONSTRAINT `fk_chitietdonhang_bienthe` FOREIGN KEY (`MaBienThe`) REFERENCES `sanpham_bienthe` (`MaBienThe`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6.3 Bảng `chitietphieunhap`
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chitietphieunhap' AND COLUMN_NAME = 'MaBienThe') = 0,
  'ALTER TABLE `chitietphieunhap` ADD COLUMN `MaBienThe` INT(11) NULL AFTER `MaSanPham`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chitietphieunhap' AND INDEX_NAME = 'idx_chitietphieunhap_bienthe') = 0,
  'ALTER TABLE `chitietphieunhap` ADD KEY `idx_chitietphieunhap_bienthe` (`MaBienThe`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'chitietphieunhap' AND CONSTRAINT_NAME = 'fk_chitietphieunhap_bienthe') = 0,
  'ALTER TABLE `chitietphieunhap` ADD CONSTRAINT `fk_chitietphieunhap_bienthe` FOREIGN KEY (`MaBienThe`) REFERENCES `sanpham_bienthe` (`MaBienThe`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6.4 Bảng `phieudieuchinhkho`
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phieudieuchinhkho' AND COLUMN_NAME = 'MaBienThe') = 0,
  'ALTER TABLE `phieudieuchinhkho` ADD COLUMN `MaBienThe` INT(11) NULL AFTER `MaSanPham`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phieudieuchinhkho' AND INDEX_NAME = 'idx_phieudieuchinhkho_bienthe') = 0,
  'ALTER TABLE `phieudieuchinhkho` ADD KEY `idx_phieudieuchinhkho_bienthe` (`MaBienThe`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'phieudieuchinhkho' AND CONSTRAINT_NAME = 'fk_phieudieuchinhkho_bienthe') = 0,
  'ALTER TABLE `phieudieuchinhkho` ADD CONSTRAINT `fk_phieudieuchinhkho_bienthe` FOREIGN KEY (`MaBienThe`) REFERENCES `sanpham_bienthe` (`MaBienThe`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6.5 Bảng `lichsutonkho`
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lichsutonkho' AND COLUMN_NAME = 'MaBienThe') = 0,
  'ALTER TABLE `lichsutonkho` ADD COLUMN `MaBienThe` INT(11) NULL AFTER `MaSanPham`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lichsutonkho' AND INDEX_NAME = 'idx_lichsutonkho_bienthe') = 0,
  'ALTER TABLE `lichsutonkho` ADD KEY `idx_lichsutonkho_bienthe` (`MaBienThe`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'lichsutonkho' AND CONSTRAINT_NAME = 'fk_lichsutonkho_bienthe') = 0,
  'ALTER TABLE `lichsutonkho` ADD CONSTRAINT `fk_lichsutonkho_bienthe` FOREIGN KEY (`MaBienThe`) REFERENCES `sanpham_bienthe` (`MaBienThe`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================================
-- 7. ÁNH XẠ `MaBienThe` MẶC ĐỊNH CHO DỮ LIỆU LỊCH SỬ CŨ (CHỈ KHI ĐANG NULL)
-- ============================================================================
UPDATE `giohang` g
INNER JOIN (
  SELECT `MaSanPham`, MIN(`MaBienThe`) AS `MaBienThe`
  FROM `sanpham_bienthe`
  GROUP BY `MaSanPham`
) bt ON g.`MaSanPham` = bt.`MaSanPham`
SET g.`MaBienThe` = bt.`MaBienThe`
WHERE g.`MaBienThe` IS NULL;

UPDATE `chitietdonhang` ct
INNER JOIN (
  SELECT `MaSanPham`, MIN(`MaBienThe`) AS `MaBienThe`
  FROM `sanpham_bienthe`
  GROUP BY `MaSanPham`
) bt ON ct.`MaSanPham` = bt.`MaSanPham`
SET ct.`MaBienThe` = bt.`MaBienThe`
WHERE ct.`MaBienThe` IS NULL;

UPDATE `chitietphieunhap` ctpn
INNER JOIN (
  SELECT `MaSanPham`, MIN(`MaBienThe`) AS `MaBienThe`
  FROM `sanpham_bienthe`
  GROUP BY `MaSanPham`
) bt ON ctpn.`MaSanPham` = bt.`MaSanPham`
SET ctpn.`MaBienThe` = bt.`MaBienThe`
WHERE ctpn.`MaBienThe` IS NULL;

UPDATE `phieudieuchinhkho` pdc
INNER JOIN (
  SELECT `MaSanPham`, MIN(`MaBienThe`) AS `MaBienThe`
  FROM `sanpham_bienthe`
  GROUP BY `MaSanPham`
) bt ON pdc.`MaSanPham` = bt.`MaSanPham`
SET pdc.`MaBienThe` = bt.`MaBienThe`
WHERE pdc.`MaBienThe` IS NULL;

UPDATE `lichsutonkho` ls
INNER JOIN (
  SELECT `MaSanPham`, MIN(`MaBienThe`) AS `MaBienThe`
  FROM `sanpham_bienthe`
  GROUP BY `MaSanPham`
) bt ON ls.`MaSanPham` = bt.`MaSanPham`
SET ls.`MaBienThe` = bt.`MaBienThe`
WHERE ls.`MaBienThe` IS NULL;

SET FOREIGN_KEY_CHECKS = 1;
