const { pool } = require('../../../config/db');

/**
 * 1. GET /api/v1/admin/orders
 * Lấy danh sách đơn hàng (MaDonHang, NgayMuaHang, TenNguoiNhan/KhachHang, TongTien, TrangThaiDonHang)
 * Không bao gồm chi tiết sản phẩm đã mua
 */
const getAllOrders = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         d.MaDonHang,
         d.NgayMuaHang,
         COALESCE(d.TenNguoiNhan, u.TaiKhoan, 'Khách hàng') AS TenNguoiNhan,
         d.TongTien,
         d.TrangThaiDonHang
       FROM donhang d
       LEFT JOIN nguoidung u ON d.MaNguoiDung = u.MaNguoiDung
       ORDER BY d.MaDonHang DESC`
    );

    const orders = rows.map((row) => ({
      MaDonHang: row.MaDonHang,
      NgayMuaHang: row.NgayMuaHang,
      TenNguoiNhan: row.TenNguoiNhan,
      KhachHang: row.TenNguoiNhan,
      TongTien: Number(row.TongTien),
      TrangThaiDonHang: row.TrangThaiDonHang
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách đơn hàng thành công',
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. PUT /api/v1/admin/orders/:id/status
 * Cập nhật nhanh TrangThaiDonHang của đơn hàng
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orderId = Number(id);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã đơn hàng không hợp lệ'
      });
    }

    const { TrangThaiDonHang, trangThai } = req.body;
    const statusToUpdate = TrangThaiDonHang || trangThai;

    if (!statusToUpdate || !String(statusToUpdate).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái đơn hàng không được để trống'
      });
    }

    // Kiểm tra đơn hàng có tồn tại không
    const [existing] = await pool.query(
      `SELECT MaDonHang FROM donhang WHERE MaDonHang = ?`,
      [orderId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tồn tại'
      });
    }

    // Cập nhật trạng thái đơn hàng
    await pool.query(
      `UPDATE donhang SET TrangThaiDonHang = ? WHERE MaDonHang = ?`,
      [String(statusToUpdate).trim(), orderId]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data: {
        MaDonHang: orderId,
        TrangThaiDonHang: String(statusToUpdate).trim()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrders,
  updateOrderStatus
};
