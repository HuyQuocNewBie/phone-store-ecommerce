/**
 * Bộ helper functions chuẩn hóa dữ liệu hiển thị (Formatters)
 */

/**
 * Chuẩn hóa mã đơn hàng (Order SN)
 * Cấu trúc: SZ + YYYYMMDD + MaDonHang padStart 4 chữ số.
 * Ví dụ: MaDonHang = 5, Ngay = 2026-10-15 -> "SZ202610150005"
 *
 * @param {number|string} MaDonHang - ID đơn hàng trong cơ sở dữ liệu
 * @param {string|Date} [NgayMuaHang] - Thời gian đặt hàng
 * @returns {string} Chuỗi mã đơn hàng chuẩn TMĐT (ví dụ: "SZ202610150005")
 */
export const formatOrderCode = (MaDonHang, NgayMuaHang) => {
  // 1. Phân tích ngày đặt hàng (fallback về hôm nay nếu không có hoặc không hợp lệ)
  let dateObj = NgayMuaHang ? new Date(NgayMuaHang) : new Date();
  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // 2. Nếu đã là chuỗi mã đơn chuẩn SZ đầy đủ
  if (typeof MaDonHang === 'string' && MaDonHang.startsWith('SZ') && MaDonHang.length >= 10) {
    return MaDonHang;
  }

  // 3. Làm sạch mã đơn hàng (loại bỏ ký tự không phải số nếu có như '#', 'DH')
  const cleanId = MaDonHang !== null && MaDonHang !== undefined
    ? String(MaDonHang).replace(/\D/g, '')
    : '';

  // 4. Pad tối thiểu 4 chữ số (hoặc '0001' nếu rỗng để không bao giờ xuất hiện #? hoặc NaN)
  const paddedId = cleanId ? cleanId.padStart(4, '0') : '0001';

  return `SZ${dateStr}${paddedId}`;
};

/**
 * Format tiền tệ VND
 * @param {number|string} price
 * @returns {string} ví dụ: "12.500.000 ₫"
 */
export const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

/**
 * Format ngày tháng năm (dd/mm/yyyy)
 * @param {string|Date} dateStr
 * @returns {string}
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('vi-VN');
};

/**
 * Format ngày tháng kèm giờ phút (dd/mm/yyyy, hh:mm:ss)
 * @param {string|Date} dateStr
 * @returns {string}
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString('vi-VN');
};
