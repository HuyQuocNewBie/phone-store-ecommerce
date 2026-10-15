/**
 * Helper functions chuẩn hóa dữ liệu trên Backend
 */

/**
 * Chuẩn hóa mã đơn hàng (Order SN)
 * Cấu trúc: SZ + YYYYMMDD + MaDonHang padStart 4 chữ số.
 * Ví dụ: MaDonHang = 5, Ngay = 2026-10-15 -> "SZ202610150005"
 *
 * @param {number|string} MaDonHang
 * @param {string|Date} [NgayMuaHang]
 * @returns {string} Mã đơn hàng chuẩn TMĐT
 */
const formatOrderCode = (MaDonHang, NgayMuaHang) => {
  let dateObj = NgayMuaHang ? new Date(NgayMuaHang) : new Date();
  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  if (typeof MaDonHang === 'string' && MaDonHang.startsWith('SZ') && MaDonHang.length >= 10) {
    return MaDonHang;
  }

  const cleanId = MaDonHang !== null && MaDonHang !== undefined
    ? String(MaDonHang).replace(/\D/g, '')
    : '';

  const paddedId = cleanId ? cleanId.padStart(4, '0') : '0001';

  return `SZ${dateStr}${paddedId}`;
};

module.exports = {
  formatOrderCode
};
