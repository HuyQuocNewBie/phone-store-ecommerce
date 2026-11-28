/**
 * Helper dùng chung cho nghiệp vụ tồn kho theo biến thể SKU (`sanpham_bienthe`).
 *
 * - Tồn kho "thật" được quản lý trên từng `MaBienThe`.
 * - Cột `sanpham.TonKho` chỉ là giá trị tổng hợp (SUM các biến thể chưa ngừng bán),
 *   luôn được đồng bộ lại sau mỗi lần biến động kho.
 */

/**
 * Chuẩn hóa chuỗi thuộc tính biến thể để so khớp (không phân biệt hoa thường, khoảng trắng)
 */
const normalizeAttr = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).toLowerCase().replace(/\s+/g, '').trim();
};

/**
 * Tạo nhãn hiển thị biến thể: "iPhone 15 (Đen - 128GB)" hoặc "iPhone 15 [SKU]"
 */
const formatVariantLabel = (tenSanPham, mauSac, dungLuong, maSKU) => {
  const attrs = [mauSac, dungLuong]
    .map((v) => (v !== undefined && v !== null ? String(v).trim() : ''))
    .filter(Boolean)
    .join(' - ');
  const base = tenSanPham || 'Sản phẩm';
  if (attrs) return `${base} (${attrs})`;
  return maSKU ? `${base} [${maSKU}]` : base;
};

/**
 * Lấy toàn bộ biến thể thuộc danh sách MaSanPham (tùy chọn khóa FOR UPDATE trong transaction)
 * @returns {Promise<Map<number, Array<Object>>>} Map MaSanPham -> danh sách biến thể
 */
const loadVariantsByProducts = async (conn, productIds, { forUpdate = false } = {}) => {
  const ids = Array.from(
    new Set((productIds || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))
  );
  const map = new Map();
  if (ids.length === 0) return map;

  const [rows] = await conn.query(
    `SELECT MaBienThe, MaSanPham, MaSKU, MauSac, DungLuong, GiaBan, TonKho, TrangThai
     FROM sanpham_bienthe
     WHERE MaSanPham IN (?)
     ORDER BY MaBienThe ASC
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [ids]
  );

  rows.forEach((row) => {
    const key = Number(row.MaSanPham);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });

  return map;
};

/**
 * Chọn đúng biến thể trong danh sách biến thể của 1 sản phẩm.
 * Thứ tự ưu tiên:
 *   1. `maBienThe` được chỉ định rõ (phải thuộc sản phẩm).
 *   2. Khớp chính xác cả MauSac + DungLuong (bỏ qua thuộc tính không truyền).
 *   3. Sản phẩm chỉ có đúng 1 biến thể (SKU mặc định từ dữ liệu cũ) -> dùng biến thể đó.
 *
 * @returns {{ variant: Object|null, reason?: string }}
 */
const pickVariant = (variants, { maBienThe = null, dungLuong = null, mauSac = null } = {}) => {
  const list = Array.isArray(variants) ? variants : [];

  if (list.length === 0) {
    return { variant: null, reason: 'NO_VARIANT' };
  }

  const explicitId = Number(maBienThe);
  if (Number.isInteger(explicitId) && explicitId > 0) {
    const found = list.find((v) => Number(v.MaBienThe) === explicitId);
    return found ? { variant: found } : { variant: null, reason: 'VARIANT_NOT_IN_PRODUCT' };
  }

  const wantDungLuong = normalizeAttr(dungLuong);
  const wantMauSac = normalizeAttr(mauSac);

  if (wantDungLuong || wantMauSac) {
    const matches = list.filter(
      (v) =>
        (!wantDungLuong || normalizeAttr(v.DungLuong) === wantDungLuong) &&
        (!wantMauSac || normalizeAttr(v.MauSac) === wantMauSac)
    );
    if (matches.length === 1) return { variant: matches[0] };
    if (matches.length > 1) {
      // Còn mơ hồ (chỉ truyền 1 thuộc tính) -> ưu tiên biến thể đang bán còn hàng
      const inStock = matches.find((v) => v.TrangThai !== 'NgungBan' && Number(v.TonKho) > 0);
      return { variant: inStock || matches[0] };
    }
  }

  if (list.length === 1) {
    return { variant: list[0] };
  }

  return { variant: null, reason: 'VARIANT_AMBIGUOUS' };
};

/**
 * Tìm biến thể cho 1 sản phẩm (tự query DB)
 */
const resolveVariant = async (conn, { maSanPham, maBienThe = null, dungLuong = null, mauSac = null, forUpdate = false }) => {
  const map = await loadVariantsByProducts(conn, [maSanPham], { forUpdate });
  return pickVariant(map.get(Number(maSanPham)) || [], { maBienThe, dungLuong, mauSac });
};

/**
 * Thông điệp lỗi thân thiện khi không xác định được biến thể
 */
const variantErrorMessage = (reason, tenSanPham) => {
  const name = tenSanPham ? `"${tenSanPham}"` : 'này';
  switch (reason) {
    case 'NO_VARIANT':
      return `Sản phẩm ${name} chưa được cấu hình biến thể SKU trong kho`;
    case 'VARIANT_NOT_IN_PRODUCT':
      return `Phiên bản (MaBienThe) đã chọn không thuộc sản phẩm ${name}`;
    default:
      return `Vui lòng chọn phiên bản (màu sắc / dung lượng) hợp lệ cho sản phẩm ${name}`;
  }
};

/**
 * Đồng bộ `sanpham.TonKho` = tổng tồn kho các biến thể chưa ngừng bán,
 * đồng thời chuyển trạng thái sản phẩm cha giữa 'DangBan' <-> 'HetHang'.
 */
const syncParentProductStock = async (conn, maSanPham) => {
  const [[sumRow]] = await conn.query(
    `SELECT COALESCE(SUM(TonKho), 0) AS totalTonKho
     FROM sanpham_bienthe
     WHERE MaSanPham = ? AND TrangThai != 'NgungBan'`,
    [maSanPham]
  );

  const [spRows] = await conn.query(
    `SELECT MaSanPham, TrangThai FROM sanpham WHERE MaSanPham = ?`,
    [maSanPham]
  );

  if (spRows.length === 0) return null;

  const totalTonKho = Number(sumRow?.totalTonKho) || 0;
  let nextStatus = spRows[0].TrangThai;
  if (totalTonKho <= 0 && nextStatus === 'DangBan') {
    nextStatus = 'HetHang';
  } else if (totalTonKho > 0 && nextStatus === 'HetHang') {
    nextStatus = 'DangBan';
  }

  await conn.query(
    `UPDATE sanpham SET TonKho = ?, TrangThai = ? WHERE MaSanPham = ?`,
    [totalTonKho, nextStatus, maSanPham]
  );

  return { TonKho: totalTonKho, TrangThai: nextStatus };
};

/**
 * Trừ tồn kho của đúng 1 biến thể (atomic, chống race condition).
 * @returns {Promise<number|null>} Tồn kho biến thể sau khi trừ, hoặc null nếu không đủ hàng
 */
const deductVariantStock = async (conn, maBienThe, soLuong) => {
  const [result] = await conn.query(
    `UPDATE sanpham_bienthe
     SET TonKho = TonKho - ?
     WHERE MaBienThe = ? AND TonKho >= ? AND TrangThai != 'NgungBan'`,
    [soLuong, maBienThe, soLuong]
  );

  if (result.affectedRows === 0) return null;

  const [[row]] = await conn.query(
    `SELECT TonKho FROM sanpham_bienthe WHERE MaBienThe = ?`,
    [maBienThe]
  );
  const newTonKho = Number(row?.TonKho) || 0;

  if (newTonKho <= 0) {
    await conn.query(
      `UPDATE sanpham_bienthe SET TrangThai = 'HetHang' WHERE MaBienThe = ? AND TrangThai = 'DangBan'`,
      [maBienThe]
    );
  }

  return newTonKho;
};

/**
 * Hoàn trả tồn kho cho 1 dòng chi tiết đơn hàng (dùng khi hủy đơn).
 * - Cộng `TonKho` cho đúng `MaBienThe` (fallback: biến thể khớp DungLuong/MauSac hoặc biến thể mặc định).
 * - Đồng bộ `sanpham.TonKho` và ghi log `lichsutonkho` (LoaiBienDong = 'HuyDon').
 */
const restoreOrderItemStock = async (conn, { maSanPham, maBienThe = null, dungLuong = null, mauSac = null, soLuong, maThamChieu, ghiChu }) => {
  const qty = Number(soLuong) || 0;
  if (qty <= 0) return null;

  const { variant } = await resolveVariant(conn, {
    maSanPham,
    maBienThe,
    dungLuong,
    mauSac,
    forUpdate: true
  });

  // Dữ liệu cũ: sản phẩm chưa có biến thể -> hoàn trả trực tiếp trên bảng sanpham
  if (!variant) {
    await conn.query(`UPDATE sanpham SET TonKho = TonKho + ? WHERE MaSanPham = ?`, [qty, maSanPham]);
    const [[sp]] = await conn.query(`SELECT TonKho, TrangThai FROM sanpham WHERE MaSanPham = ?`, [maSanPham]);
    const newTonKho = Number(sp?.TonKho) || 0;
    if (sp && sp.TrangThai === 'HetHang' && newTonKho > 0) {
      await conn.query(`UPDATE sanpham SET TrangThai = 'DangBan' WHERE MaSanPham = ?`, [maSanPham]);
    }
    await conn.query(
      `INSERT INTO lichsutonkho
         (MaSanPham, MaBienThe, LoaiBienDong, SoLuongThayDoi, TonThucTeSauDoi, MaThamChieu, NgayThucHien, GhiChu)
       VALUES (?, NULL, 'HuyDon', ?, ?, ?, NOW(), ?)`,
      [maSanPham, qty, newTonKho, maThamChieu, ghiChu]
    );
    return { MaBienThe: null, TonKho: newTonKho };
  }

  await conn.query(
    `UPDATE sanpham_bienthe
     SET TonKho = TonKho + ?,
         TrangThai = IF(TrangThai = 'HetHang', 'DangBan', TrangThai)
     WHERE MaBienThe = ?`,
    [qty, variant.MaBienThe]
  );

  const [[row]] = await conn.query(`SELECT TonKho FROM sanpham_bienthe WHERE MaBienThe = ?`, [variant.MaBienThe]);
  const newTonKho = Number(row?.TonKho) || 0;

  await syncParentProductStock(conn, maSanPham);

  await conn.query(
    `INSERT INTO lichsutonkho
       (MaSanPham, MaBienThe, LoaiBienDong, SoLuongThayDoi, TonThucTeSauDoi, MaThamChieu, NgayThucHien, GhiChu)
     VALUES (?, ?, 'HuyDon', ?, ?, ?, NOW(), ?)`,
    [maSanPham, variant.MaBienThe, qty, newTonKho, maThamChieu, ghiChu]
  );

  return { MaBienThe: variant.MaBienThe, TonKho: newTonKho };
};

/**
 * Định dạng số tiền VNĐ cho nội dung thông báo
 */
const formatVND = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')}đ`;

/**
 * Kiểm tra (và tự động bổ sung nếu thiếu) cột `MaBienThe` trên bảng `phieudoitra`.
 * Cache kết quả khi cột đã tồn tại để không tốn truy vấn lặp lại.
 */
let returnVariantColReady = false;
const ensureReturnVariantColumn = async (conn) => {
  if (returnVariantColReady) return true;

  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phieudoitra' AND COLUMN_NAME = 'MaBienThe'`
  );

  if (Number(rows[0]?.cnt) > 0) {
    returnVariantColReady = true;
    return true;
  }

  try {
    await conn.query(
      `ALTER TABLE phieudoitra
         ADD COLUMN MaBienThe INT(11) NULL AFTER MaSanPham,
         ADD KEY idx_phieudoitra_bienthe (MaBienThe),
         ADD CONSTRAINT fk_doitra_bienthe FOREIGN KEY (MaBienThe) REFERENCES sanpham_bienthe (MaBienThe) ON DELETE SET NULL ON UPDATE CASCADE`
    );
    returnVariantColReady = true;
    return true;
  } catch (err) {
    // Có thể cột vừa được thêm bởi tiến trình song song
    const [recheck] = await conn.query(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phieudoitra' AND COLUMN_NAME = 'MaBienThe'`
    );
    if (Number(recheck[0]?.cnt) > 0) {
      returnVariantColReady = true;
      return true;
    }
    console.warn('[variantStockHelper] Không thể tự động thêm cột phieudoitra.MaBienThe:', err.message);
    return false;
  }
};

module.exports = {
  normalizeAttr,
  formatVariantLabel,
  loadVariantsByProducts,
  pickVariant,
  resolveVariant,
  variantErrorMessage,
  syncParentProductStock,
  deductVariantStock,
  restoreOrderItemStock,
  formatVND,
  ensureReturnVariantColumn
};
