const { pool } = require('../../../config/db');

/**
 * Helper format VND tiền tệ
 */
const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

/**
 * 1. GET /api/v1/vouchers/active
 * Query danh sách voucher có TrangThai = 1, SoLuong > 0, và NgayHetHan >= NOW().
 * Khớp chính xác tên cột DB: Code, GiaTriGiam, GiaTriToiThieu, LoaiGiam.
 */
const getActiveVouchers = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         MaVoucher,
         Code,
         GiaTriGiam,
         LoaiGiam,
         GiaTriToiThieu,
         SoLuong,
         NgayHetHan,
         TrangThai
       FROM voucher
       WHERE TrangThai = 1
         AND SoLuong > 0
         AND NgayHetHan >= NOW()
       ORDER BY GiaTriGiam DESC, MaVoucher DESC`
    );

    const vouchers = rows.map((item, index) => ({
      STT: index + 1,
      MaVoucher: item.MaVoucher,
      Code: item.Code,
      GiaTriGiam: Number(item.GiaTriGiam),
      LoaiGiam: item.LoaiGiam,
      GiaTriToiThieu: Number(item.GiaTriToiThieu),
      SoLuong: item.SoLuong,
      NgayHetHan: item.NgayHetHan,
      TrangThai: item.TrangThai
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách mã giảm giá hoạt động thành công',
      data: vouchers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/v1/vouchers/apply
 * Nhận code và orderSubtotal.
 * So sánh chính xác không phân biệt hoa thường (UPPER(Code)).
 * Kiểm tra nếu orderSubtotal >= GiaTriToiThieu thì trả về số tiền giảm,
 * ngược lại báo lỗi cụ thể ("Đơn hàng chưa đạt giá trị tối thiểu...").
 */
const applyVoucher = async (req, res, next) => {
  try {
    const { code, orderSubtotal } = req.body;

    // 1. Validate Code
    if (!code || !String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã giảm giá'
      });
    }

    // 2. Validate orderSubtotal
    const subtotal = Number(orderSubtotal);
    if (orderSubtotal === undefined || orderSubtotal === null || isNaN(subtotal) || subtotal < 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị đơn hàng không hợp lệ'
      });
    }

    const formattedCode = String(code).trim().toUpperCase();

    // 3. Tìm voucher trong database (so sánh không phân biệt hoa thường)
    const [rows] = await pool.query(
      `SELECT 
         MaVoucher,
         Code,
         GiaTriGiam,
         LoaiGiam,
         GiaTriToiThieu,
         SoLuong,
         NgayHetHan,
         TrangThai
       FROM voucher
       WHERE UPPER(Code) = ?`,
      [formattedCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mã giảm giá không tồn tại trên hệ thống'
      });
    }

    const voucher = rows[0];

    // 4. Kiểm tra trạng thái hoạt động
    if (Number(voucher.TrangThai) !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá hiện đã bị tạm dừng hoặc không còn hoạt động'
      });
    }

    // 5. Kiểm tra thời hạn
    const expireDate = new Date(voucher.NgayHetHan);
    if (expireDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá này đã hết hạn sử dụng'
      });
    }

    // 6. Kiểm tra số lượng
    if (voucher.SoLuong <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá này đã hết lượt sử dụng'
      });
    }

    // 7. Kiểm tra giá trị đơn hàng tối thiểu
    const giaTriToiThieu = Number(voucher.GiaTriToiThieu);
    if (subtotal < giaTriToiThieu) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng chưa đạt giá trị tối thiểu ${formatVND(giaTriToiThieu)} để áp dụng mã giảm giá này`
      });
    }

    // 8. Tính số tiền được giảm
    const giaTriGiam = Number(voucher.GiaTriGiam);
    let discountAmount = 0;

    if (voucher.LoaiGiam === 'phantram') {
      discountAmount = Math.round((subtotal * giaTriGiam) / 100);
    } else {
      discountAmount = giaTriGiam;
    }

    // Số tiền giảm không được vượt quá tổng phụ đơn hàng
    discountAmount = Math.min(discountAmount, subtotal);
    const finalTotal = Math.max(0, subtotal - discountAmount);

    return res.status(200).json({
      success: true,
      message: 'Áp dụng mã giảm giá thành công',
      data: {
        voucher: {
          MaVoucher: voucher.MaVoucher,
          Code: voucher.Code,
          GiaTriGiam: giaTriGiam,
          LoaiGiam: voucher.LoaiGiam,
          GiaTriToiThieu: giaTriToiThieu,
          NgayHetHan: voucher.NgayHetHan
        },
        discountAmount,
        subtotal,
        finalTotal
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveVouchers,
  applyVoucher
};
