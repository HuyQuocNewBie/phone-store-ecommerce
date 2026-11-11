const { pool } = require('../../../config/db');
const { formatOrderCode } = require('../../utils/formatters');
const {
  ORDER_STATUS,
  normalizeOrderStatus,
  canTransitionOrderStatus
} = require('../../utils/orderStatus');

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
 * Cập nhật TrangThaiDonHang theo đúng thứ tự 5 bước chuẩn:
 *   ChoXacNhan -> DaXacNhan -> DangDongGoi -> DangGiao -> DaGiao (hoặc DaHuy trước khi đóng gói)
 */
const updateOrderStatus = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    const orderId = Number(id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã đơn hàng không hợp lệ'
      });
    }

    const { TrangThaiDonHang, trangThai } = req.body;
    const rawTarget = String(TrangThaiDonHang || trangThai || '').trim();

    if (!rawTarget) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái đơn hàng không được để trống'
      });
    }

    const targetStatus = normalizeOrderStatus(rawTarget);
    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        message: `Trạng thái '${rawTarget}' không hợp lệ. Các trạng thái chuẩn: ChoXacNhan, DaXacNhan, DangDongGoi, DangGiao, DaGiao, DaHuy`
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Kiểm tra đơn hàng có tồn tại không & khóa dòng tránh xung đột đồng thời
    const [existing] = await connection.query(
      `SELECT MaDonHang, TrangThaiDonHang, MaVoucher FROM donhang WHERE MaDonHang = ? FOR UPDATE`,
      [orderId]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tồn tại'
      });
    }

    const order = existing[0];
    const transition = canTransitionOrderStatus(order.TrangThaiDonHang, targetStatus);

    if (!transition.valid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: transition.message
      });
    }

    // Cập nhật trạng thái đơn hàng ở cả `donhang` và `lichsumuahang`
    await connection.query(
      `UPDATE donhang SET TrangThaiDonHang = ? WHERE MaDonHang = ?`,
      [targetStatus, orderId]
    );

    await connection.query(
      `UPDATE lichsumuahang SET TrangThai = ? WHERE MaDonHang = ?`,
      [targetStatus, orderId]
    );

    // Nếu chuyển từ trạng thái chưa hủy sang 'DaHuy', hoàn trả tồn kho & voucher
    if (
      targetStatus === ORDER_STATUS.DA_HUY &&
      transition.fromStatus !== ORDER_STATUS.DA_HUY
    ) {
      const [items] = await connection.query(
        `SELECT MaSanPham, SoLuong FROM chitietdonhang WHERE MaDonHang = ?`,
        [orderId]
      );

      for (const item of items) {
        const soLuongHoanTra = Number(item.SoLuong) || 0;
        if (soLuongHoanTra > 0) {
          await connection.query(
            `UPDATE sanpham SET TonKho = TonKho + ? WHERE MaSanPham = ?`,
            [soLuongHoanTra, item.MaSanPham]
          );

          const [prodRows] = await connection.query(
            `SELECT TonKho, TrangThai FROM sanpham WHERE MaSanPham = ?`,
            [item.MaSanPham]
          );

          if (prodRows.length > 0) {
            const newTonKho = Number(prodRows[0].TonKho);
            if (prodRows[0].TrangThai === 'HetHang' && newTonKho > 0) {
              await connection.query(
                `UPDATE sanpham SET TrangThai = 'DangBan' WHERE MaSanPham = ?`,
                [item.MaSanPham]
              );
            }

            await connection.query(
              `INSERT INTO lichsutonkho
                (MaSanPham, LoaiBienDong, SoLuongThayDoi, TonThucTeSauDoi, MaThamChieu, NgayThucHien, GhiChu)
               VALUES (?, 'HuyDon', ?, ?, ?, NOW(), ?)`,
              [
                item.MaSanPham,
                soLuongHoanTra,
                newTonKho,
                orderId,
                `Hoàn tồn do quản trị viên hủy đơn hàng #${orderId}`
              ]
            );
          }
        }
      }

      if (order.MaVoucher) {
        await connection.query(
          `UPDATE voucher SET SoLuong = SoLuong + 1 WHERE MaVoucher = ?`,
          [order.MaVoucher]
        );
      }
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data: {
        MaDonHang: orderId,
        TrangThaiDonHang: targetStatus
      }
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  getAllOrders,
  getOrderDetail,
  updateOrderStatus
};
