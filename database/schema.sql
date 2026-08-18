-- ============================================================================
-- SCRIPT KHỞI TẠO VÀ CẬP NHẬT CƠ SỞ DỮ LIỆU PHONE STORE E-COMMERCE
-- Tương thích: MySQL 8.0+
-- Bảng mã: utf8mb4 / utf8mb4_unicode_ci
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ============================================================================
-- 1. BẢNG DANH MỤC & PHÂN QUYỀN
-- ============================================================================

-- 1.1 Bảng Vai Trò Người Dùng
CREATE TABLE `vaitro` (
  `MaVaiTro` int(11) NOT NULL AUTO_INCREMENT,
  `TenVaiTro` varchar(50) NOT NULL,
  PRIMARY KEY (`MaVaiTro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.2 Bảng Loại Sản Phẩm
CREATE TABLE `loaisanpham` (
  `MaLoaiSanPham` int(11) NOT NULL AUTO_INCREMENT,
  `TenLoaiSanPham` varchar(100) NOT NULL,
  PRIMARY KEY (`MaLoaiSanPham`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.3 Bảng Nhà Sản Xuất
CREATE TABLE `nhasanxuat` (
  `MaNhaSanXuat` int(11) NOT NULL AUTO_INCREMENT,
  `TenNhaSanXuat` varchar(100) NOT NULL,
  `DiaChi` varchar(255) NOT NULL,
  `SoDienThoai` varchar(20) NOT NULL,
  `Email` varchar(100) NOT NULL,
  PRIMARY KEY (`MaNhaSanXuat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.4 Bảng Phương Thức Thanh Toán
CREATE TABLE `phuongthucthanhtoan` (
  `MaPhuongThucThanhToan` int(11) NOT NULL AUTO_INCREMENT,
  `TenPhuongThucThanhToan` varchar(255) NOT NULL,
  PRIMARY KEY (`MaPhuongThucThanhToan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.5 Bảng Trạng Thái Thanh Toán
CREATE TABLE `trangthaithanhtoan` (
  `MaTrangThaiThanhToan` int(11) NOT NULL AUTO_INCREMENT,
  `TenTrangThai` varchar(255) NOT NULL,
  PRIMARY KEY (`MaTrangThaiThanhToan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.6 Bảng Mã Giảm Giá (Voucher) - Bổ sung TrangThai TINYINT(1) DEFAULT 1
CREATE TABLE `voucher` (
  `MaVoucher` int(11) NOT NULL AUTO_INCREMENT,
  `Code` varchar(50) NOT NULL,
  `GiaTriGiam` decimal(18,2) NOT NULL,
  `LoaiGiam` enum('tien','phantram') NOT NULL,
  `GiaTriToiThieu` decimal(18,2) DEFAULT 0.00,
  `SoLuong` int(11) NOT NULL DEFAULT 0,
  `NgayHetHan` datetime NOT NULL,
  `TrangThai` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1: Hoạt động, 0: Vô hiệu hóa',
  PRIMARY KEY (`MaVoucher`),
  UNIQUE KEY `Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. BẢNG NGƯỜI DÙNG & ĐỊA CHỈ
-- ============================================================================

-- 2.1 Bảng Người Dùng
CREATE TABLE `nguoidung` (
  `MaNguoiDung` int(11) NOT NULL AUTO_INCREMENT,
  `TaiKhoan` varchar(50) NOT NULL,
  `MatKhau` varchar(255) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `AnhDaiDien` varchar(255) DEFAULT NULL,
  `GioiTinh` enum('Nam','Nữ') DEFAULT NULL,
  `NgaySinh` date DEFAULT NULL,
  `SoDienThoai` varchar(20) DEFAULT NULL,
  `DiaChi` varchar(255) DEFAULT NULL,
  `MaVaiTro` int(11) NOT NULL,
  `NgayCapNhatMatKhau` datetime DEFAULT NULL,
  PRIMARY KEY (`MaNguoiDung`),
  UNIQUE KEY `Email` (`Email`),
  KEY `MaVaiTro` (`MaVaiTro`),
  CONSTRAINT `NguoiDung_ibfk_1` FOREIGN KEY (`MaVaiTro`) REFERENCES `vaitro` (`MaVaiTro`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2 Bảng Sổ Địa Chỉ
CREATE TABLE `sodiachi` (
  `MaDiaChi` int(11) NOT NULL AUTO_INCREMENT,
  `MaNguoiDung` int(11) NOT NULL,
  `TenGoiNho` varchar(50) DEFAULT NULL,
  `TinhThanh` varchar(100) DEFAULT NULL,
  `QuanHuyen` varchar(100) DEFAULT NULL,
  `PhuongXa` varchar(100) DEFAULT NULL,
  `DiaChiNha` varchar(255) DEFAULT NULL,
  `LaMacDinh` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`MaDiaChi`),
  KEY `MaNguoiDung` (`MaNguoiDung`),
  CONSTRAINT `sodiachi_ibfk_1` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. BẢNG SẢN PHẨM & THÔNG SỐ
-- ============================================================================

-- 3.1 Bảng Sản Phẩm (Bổ sung DungLuong, MauSac, TrangThai)
CREATE TABLE `sanpham` (
  `MaSanPham` int(11) NOT NULL AUTO_INCREMENT,
  `TenSanPham` varchar(255) NOT NULL,
  `Anh` varchar(255) DEFAULT NULL,
  `Gia` decimal(18,2) NOT NULL,
  `TonKho` int(11) DEFAULT 0,
  `DungLuong` varchar(50) DEFAULT NULL COMMENT 'Dung lượng lưu trữ (e.g. 128GB, 256GB, 1TB)',
  `MauSac` varchar(50) DEFAULT NULL COMMENT 'Màu sắc sản phẩm',
  `TrangThai` enum('DangBan','NgungBan','HetHang') NOT NULL DEFAULT 'DangBan' COMMENT 'Trạng thái kinh doanh sản phẩm',
  `MoTa` text DEFAULT NULL,
  `MaLoaiSanPham` int(11) DEFAULT NULL,
  `MaNhaSanXuat` int(11) DEFAULT NULL,
  PRIMARY KEY (`MaSanPham`),
  KEY `MaLoaiSanPham` (`MaLoaiSanPham`),
  KEY `MaNhaSanXuat` (`MaNhaSanXuat`),
  CONSTRAINT `SanPham_ibfk_1` FOREIGN KEY (`MaLoaiSanPham`) REFERENCES `loaisanpham` (`MaLoaiSanPham`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `SanPham_ibfk_2` FOREIGN KEY (`MaNhaSanXuat`) REFERENCES `nhasanxuat` (`MaNhaSanXuat`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 Bảng Thông Số Kỹ Thuật
CREATE TABLE `thongsokythuat` (
  `MaThongSo` int(11) NOT NULL AUTO_INCREMENT,
  `MaSanPham` int(11) NOT NULL,
  `NhomThongSo` varchar(255) DEFAULT 'Chung',
  `TenThongSo` varchar(100) NOT NULL,
  `GiaTri` varchar(255) NOT NULL,
  PRIMARY KEY (`MaThongSo`),
  KEY `MaSanPham` (`MaSanPham`),
  CONSTRAINT `fk_thongso_sanpham` FOREIGN KEY (`MaSanPham`) REFERENCES `sanpham` (`MaSanPham`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3 Bảng Sản Phẩm Yêu Thích
CREATE TABLE `sanphamyeuthich` (
  `MaYeuThich` int(11) NOT NULL AUTO_INCREMENT,
  `MaNguoiDung` int(11) NOT NULL,
  `MaSanPham` int(11) NOT NULL,
  `NgayThem` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`MaYeuThich`),
  UNIQUE KEY `MaNguoiDung_MaSanPham` (`MaNguoiDung`,`MaSanPham`),
  KEY `MaSanPham` (`MaSanPham`),
  CONSTRAINT `sanphamyeuthich_ibfk_1` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sanphamyeuthich_ibfk_2` FOREIGN KEY (`MaSanPham`) REFERENCES `sanpham` (`MaSanPham`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.4 Bảng Giỏ Hàng
CREATE TABLE `giohang` (
  `MaGioHang` int(11) NOT NULL AUTO_INCREMENT,
  `MaNguoiDung` int(11) NOT NULL,
  `MaSanPham` int(11) NOT NULL,
  `SoLuong` int(11) NOT NULL CHECK (`SoLuong` > 0),
  PRIMARY KEY (`MaGioHang`),
  KEY `MaNguoiDung` (`MaNguoiDung`),
  KEY `MaSanPham` (`MaSanPham`),
  CONSTRAINT `GioHang_ibfk_1` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `GioHang_ibfk_2` FOREIGN KEY (`MaSanPham`) REFERENCES `sanpham` (`MaSanPham`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. BẢNG ĐÁNH GIÁ, ĐƠN HÀNG & THANH TOÁN
-- ============================================================================

-- 4.1 Bảng Đánh Giá Sản Phẩm
CREATE TABLE `danhgia` (
  `MaDanhGia` int(11) NOT NULL AUTO_INCREMENT,
  `MaSanPham` int(11) NOT NULL,
  `MaNguoiDung` int(11) NOT NULL,
  `SoSao` tinyint(4) NOT NULL,
  `NoiDung` text NOT NULL,
  `NgayDanhGia` datetime DEFAULT current_timestamp(),
  `Anh` text DEFAULT NULL,
  `ChiTietDanhGia` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ChiTietDanhGia`)),
  PRIMARY KEY (`MaDanhGia`),
  KEY `MaSanPham` (`MaSanPham`),
  KEY `MaNguoiDung` (`MaNguoiDung`),
  CONSTRAINT `danhgia_ibfk_1` FOREIGN KEY (`MaSanPham`) REFERENCES `sanpham` (`MaSanPham`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `danhgia_ibfk_2` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.2 Bảng Trả Lời Đánh Giá
CREATE TABLE `danhgia_traloi` (
  `MaTraLoi` int(11) NOT NULL AUTO_INCREMENT,
  `MaDanhGia` int(11) NOT NULL,
  `MaNguoiDung` int(11) NOT NULL,
  `NoiDung` text NOT NULL,
  `NgayTraLoi` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`MaTraLoi`),
  KEY `idx_madanhgiatraloi` (`MaDanhGia`),
  KEY `MaNguoiDung` (`MaNguoiDung`),
  CONSTRAINT `danhgia_traloi_ibfk_1` FOREIGN KEY (`MaDanhGia`) REFERENCES `danhgia` (`MaDanhGia`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `danhgia_traloi_ibfk_2` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.3 Bảng Đơn Hàng
CREATE TABLE `donhang` (
  `MaDonHang` int(11) NOT NULL AUTO_INCREMENT,
  `MaNguoiDung` int(11) DEFAULT NULL,
  `NgayMuaHang` datetime DEFAULT current_timestamp(),
  `TrangThaiDonHang` varchar(255) NOT NULL,
  `MaVoucher` int(11) DEFAULT NULL,
  `DiaChiGiaoHang` varchar(255) DEFAULT NULL,
  `GhiChu` text DEFAULT NULL,
  `SoDienThoai` varchar(15) DEFAULT NULL,
  `TenNguoiNhan` varchar(100) DEFAULT NULL,
  `TongTien` decimal(18,2) NOT NULL,
  `PhiShip` decimal(10,2) NOT NULL DEFAULT 0.00,
  `SoTienGiam` decimal(18,2) DEFAULT 0.00,
  PRIMARY KEY (`MaDonHang`),
  KEY `MaNguoiDung` (`MaNguoiDung`),
  KEY `fk_donhang_voucher` (`MaVoucher`),
  CONSTRAINT `DonHang_ibfk_1` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_donhang_voucher` FOREIGN KEY (`MaVoucher`) REFERENCES `voucher` (`MaVoucher`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.4 Bảng Chi Tiết Đơn Hàng
CREATE TABLE `chitietdonhang` (
  `MaChiTietDonHang` int(11) NOT NULL AUTO_INCREMENT,
  `MaDonHang` int(11) NOT NULL,
  `MaSanPham` int(11) NOT NULL,
  `SoLuong` int(11) NOT NULL CHECK (`SoLuong` > 0),
  `DonGia` decimal(18,2) NOT NULL,
  `TongGia` decimal(18,2) GENERATED ALWAYS AS (`SoLuong` * `DonGia`) STORED,
  PRIMARY KEY (`MaChiTietDonHang`),
  KEY `MaDonHang` (`MaDonHang`),
  KEY `MaSanPham` (`MaSanPham`),
  CONSTRAINT `ChiTietDonHang_ibfk_1` FOREIGN KEY (`MaDonHang`) REFERENCES `donhang` (`MaDonHang`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ChiTietDonHang_ibfk_2` FOREIGN KEY (`MaSanPham`) REFERENCES `sanpham` (`MaSanPham`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.5 Bảng Giao Dịch Thanh Toán
CREATE TABLE `thanhtoan` (
  `MaThanhToan` int(11) NOT NULL AUTO_INCREMENT,
  `MaDonHang` int(11) NOT NULL,
  `MaNguoiDung` int(11) NOT NULL,
  `SoLuongMua` decimal(18,2) NOT NULL,
  `NgayThanhToan` date DEFAULT (curdate()),
  `MaTrangThaiThanhToan` int(11) NOT NULL,
  `MaPhuongThucThanhToan` int(11) NOT NULL,
  PRIMARY KEY (`MaThanhToan`),
  KEY `MaDonHang` (`MaDonHang`),
  KEY `MaNguoiDung` (`MaNguoiDung`),
  KEY `MaTrangThaiThanhToan` (`MaTrangThaiThanhToan`),
  KEY `MaPhuongThucThanhToan` (`MaPhuongThucThanhToan`),
  CONSTRAINT `ThanhToan_ibfk_1` FOREIGN KEY (`MaDonHang`) REFERENCES `donhang` (`MaDonHang`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ThanhToan_ibfk_2` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ThanhToan_ibfk_3` FOREIGN KEY (`MaTrangThaiThanhToan`) REFERENCES `trangthaithanhtoan` (`MaTrangThaiThanhToan`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ThanhToan_ibfk_4` FOREIGN KEY (`MaPhuongThucThanhToan`) REFERENCES `phuongthucthanhtoan` (`MaPhuongThucThanhToan`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.6 Bảng Lịch Sử Mua Hàng
CREATE TABLE `lichsumuahang` (
  `MaLichSuMuaHang` int(11) NOT NULL AUTO_INCREMENT,
  `MaNguoiDung` int(11) NOT NULL,
  `MaDonHang` int(11) NOT NULL,
  `NgayMua` date NOT NULL DEFAULT (curdate()),
  `TongTien` decimal(18,2) NOT NULL,
  `TrangThai` varchar(255) NOT NULL,
  `MaPhuongThucThanhToan` int(11) NOT NULL,
  `MaThanhToan` int(11) DEFAULT NULL,
  PRIMARY KEY (`MaLichSuMuaHang`),
  KEY `MaNguoiDung` (`MaNguoiDung`),
  KEY `MaDonHang` (`MaDonHang`),
  KEY `MaPhuongThucThanhToan` (`MaPhuongThucThanhToan`),
  KEY `MaThanhToan` (`MaThanhToan`),
  CONSTRAINT `LichSuMuaHang_ibfk_1` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `LichSuMuaHang_ibfk_2` FOREIGN KEY (`MaDonHang`) REFERENCES `donhang` (`MaDonHang`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `LichSuMuaHang_ibfk_3` FOREIGN KEY (`MaPhuongThucThanhToan`) REFERENCES `phuongthucthanhtoan` (`MaPhuongThucThanhToan`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `LichSuMuaHang_ibfk_4` FOREIGN KEY (`MaThanhToan`) REFERENCES `thanhtoan` (`MaThanhToan`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.7 Bảng Lịch Sử Sử Dụng Voucher
CREATE TABLE `lichsu_dung_voucher` (
  `MaLichSu` int(11) NOT NULL AUTO_INCREMENT,
  `MaNguoiDung` int(11) DEFAULT NULL,
  `MaVoucher` int(11) DEFAULT NULL,
  `MaDonHang` int(11) DEFAULT NULL,
  `NgaySuDung` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`MaLichSu`),
  KEY `MaNguoiDung` (`MaNguoiDung`),
  KEY `MaVoucher` (`MaVoucher`),
  KEY `MaDonHang` (`MaDonHang`),
  CONSTRAINT `lichsu_dung_voucher_ibfk_1` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `lichsu_dung_voucher_ibfk_2` FOREIGN KEY (`MaVoucher`) REFERENCES `voucher` (`MaVoucher`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `lichsu_dung_voucher_ibfk_3` FOREIGN KEY (`MaDonHang`) REFERENCES `donhang` (`MaDonHang`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. BẢNG QUẢN LÝ KHO (TẠO MỚI)
-- ============================================================================

-- 5.1 Bảng Phiếu Nhập Kho
CREATE TABLE `phieunhapkho` (
  `MaPhieuNhap` int(11) NOT NULL AUTO_INCREMENT,
  `MaNhaSanXuat` int(11) DEFAULT NULL,
  `MaNguoiDung` int(11) DEFAULT NULL,
  `NgayNhap` datetime DEFAULT current_timestamp(),
  `TongTienNhap` decimal(18,2) NOT NULL DEFAULT 0.00,
  `GhiChu` text DEFAULT NULL,
  PRIMARY KEY (`MaPhieuNhap`),
  KEY `MaNhaSanXuat` (`MaNhaSanXuat`),
  KEY `MaNguoiDung` (`MaNguoiDung`),
  CONSTRAINT `phieunhapkho_ibfk_1` FOREIGN KEY (`MaNhaSanXuat`) REFERENCES `nhasanxuat` (`MaNhaSanXuat`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `phieunhapkho_ibfk_2` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5.2 Bảng Chi Tiết Phiếu Nhập Kho
CREATE TABLE `chitietphieunhap` (
  `MaChiTietNhap` int(11) NOT NULL AUTO_INCREMENT,
  `MaPhieuNhap` int(11) NOT NULL,
  `MaSanPham` int(11) NOT NULL,
  `SoLuongNhap` int(11) NOT NULL CHECK (`SoLuongNhap` > 0),
  `DonGiaNhap` decimal(18,2) NOT NULL,
  `ThanhTien` decimal(18,2) GENERATED ALWAYS AS (`SoLuongNhap` * `DonGiaNhap`) STORED,
  PRIMARY KEY (`MaChiTietNhap`),
  KEY `MaPhieuNhap` (`MaPhieuNhap`),
  KEY `MaSanPham` (`MaSanPham`),
  CONSTRAINT `chitietphieunhap_ibfk_1` FOREIGN KEY (`MaPhieuNhap`) REFERENCES `phieunhapkho` (`MaPhieuNhap`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chitietphieunhap_ibfk_2` FOREIGN KEY (`MaSanPham`) REFERENCES `sanpham` (`MaSanPham`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5.3 Bảng Lịch Sử Tồn Kho
CREATE TABLE `lichsutonkho` (
  `MaLichSuTon` int(11) NOT NULL AUTO_INCREMENT,
  `MaSanPham` int(11) NOT NULL,
  `LoaiBienDong` enum('NhapKho','XuatBan','CapNhatThuCong','HuyDon') NOT NULL,
  `SoLuongThayDoi` int(11) NOT NULL,
  `TonThucTeSauDoi` int(11) NOT NULL,
  `MaThamChieu` int(11) DEFAULT NULL,
  `NgayThucHien` datetime DEFAULT current_timestamp(),
  `GhiChu` text DEFAULT NULL,
  PRIMARY KEY (`MaLichSuTon`),
  KEY `MaSanPham` (`MaSanPham`),
  CONSTRAINT `lichsutonkho_ibfk_1` FOREIGN KEY (`MaSanPham`) REFERENCES `sanpham` (`MaSanPham`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;