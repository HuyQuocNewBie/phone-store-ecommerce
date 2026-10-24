const { pool } = require('../../../config/db');
const { formatOrderCode } = require('../../utils/formatters');

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
         d.PhiShip,
         d.SoTienGiam,
         d.SoDienThoai,
         d.DiaChiGiaoHang,
         d.GhiChu,
         d.TrangThaiDonHang
       FROM donhang d
       LEFT JOIN nguoidung u ON d.MaNguoiDung = u.MaNguoiDung
       ORDER BY d.MaDonHang DESC`
    );

    const orders = rows.map((row) => ({
      MaDonHang: row.MaDonHang,
      CodeDonHang: formatOrderCode(row.MaDonHang, row.NgayMuaHang),
      NgayMuaHang: row.NgayMuaHang,
      TenNguoiNhan: row.TenNguoiNhan,
      KhachHang: row.TenNguoiNhan,
      SoDienThoai: row.SoDienThoai,
      DiaChiGiaoHang: row.DiaChiGiaoHang,
      GhiChu: row.GhiChu,
      TongTien: Number(row.TongTien),
      PhiShip: Number(row.PhiShip || 0),
      SoTienGiam: Number(row.SoTienGiam || 0),
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
 * 2. GET /api/v1/admin/orders/:id
 * Lấy chi tiết đơn hàng kèm danh sách sản phẩm (chitietdonhang)
 */
const getOrderDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orderId = Number(id);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã đơn hàng không hợp lệ'
      });
    }

    const [orders] = await pool.query(
      `SELECT 
         d.MaDonHang,
         d.NgayMuaHang,
         d.TrangThaiDonHang,
         d.MaVoucher,
         d.DiaChiGiaoHang,
         d.GhiChu,
         d.SoDienThoai,
         COALESCE(d.TenNguoiNhan, u.TaiKhoan, 'Khách hàng') AS TenNguoiNhan,
         d.TongTien,
         d.PhiShip,
         d.SoTienGiam,
         d.PhuongThucThanhToan,
         u.Email,
         u.TaiKhoan
       FROM donhang d
       LEFT JOIN nguoidung u ON d.MaNguoiDung = u.MaNguoiDung
       WHERE d.MaDonHang = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tồn tại'
      });
    }

    const order = orders[0];

    const [items] = await pool.query(
      `SELECT 
         ct.MaChiTietDonHang,
         ct.MaDonHang,
         ct.MaSanPham,
         ct.SoLuong,
         ct.DonGia,
         ct.DungLuong,
         ct.MauSac,
         (ct.SoLuong * ct.DonGia) AS TongGia,
         sp.TenSanPham,
         sp.Anh
       FROM chitietdonhang ct
       LEFT JOIN sanpham sp ON ct.MaSanPham = sp.MaSanPham
       WHERE ct.MaDonHang = ?
       ORDER BY ct.MaChiTietDonHang ASC`,
      [orderId]
    );

    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết đơn hàng thành công',
      data: {
        MaDonHang: order.MaDonHang,
        CodeDonHang: formatOrderCode(order.MaDonHang, order.NgayMuaHang),
        NgayMuaHang: order.NgayMuaHang,
        TenNguoiNhan: order.TenNguoiNhan,
        KhachHang: order.TenNguoiNhan,
        Email: order.Email,
        TaiKhoan: order.TaiKhoan,
        SoDienThoai: order.SoDienThoai,
        DiaChiGiaoHang: order.DiaChiGiaoHang,
        GhiChu: order.GhiChu,
        TongTien: Number(order.TongTien),
        PhiShip: Number(order.PhiShip || 0),
        SoTienGiam: Number(order.SoTienGiam || 0),
        TrangThaiDonHang: order.TrangThaiDonHang,
        PhuongThucThanhToan: order.PhuongThucThanhToan || 'Thanh toán khi nhận hàng (COD)',
        chitietdonhang: items.map((item) => ({
          MaChiTietDonHang: item.MaChiTietDonHang,
          MaSanPham: item.MaSanPham,
          TenSanPham: item.TenSanPham || 'Sản phẩm',
          Anh: item.Anh,
          DungLuong: item.DungLuong,
          MauSac: item.MauSac,
          SoLuong: Number(item.SoLuong),
          DonGia: Number(item.DonGia),
          TongGia: Number(item.TongGia || item.SoLuong * item.DonGia)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. PUT /api/v1/admin/orders/:id/status
 * Cập nhật nhanh TrangThaiDonHang của đơn hàng (chỉ nhận 5 trạng thái chuẩn)
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
    const statusToUpdate = String(TrangThaiDonHang || trangThai || '').trim();

    if (!statusToUpdate) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái đơn hàng không được để trống'
      });
    }

    // Validate chỉ nhận 5 trạng thái chuẩn
    const VALID_STATUSES = ['Chờ xác nhận', 'Đang xử lý', 'Đang giao', 'Đã giao', 'Đã hủy'];
    if (!VALID_STATUSES.includes(statusToUpdate)) {
      return res.status(400).json({
        success: false,
        message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}`
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
      [statusToUpdate, orderId]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data: {
        MaDonHang: orderId,
        TrangThaiDonHang: statusToUpdate
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrders,
  getOrderDetail,
  updateOrderStatus
};
