const { pool } = require('../../../config/db');
const { formatOrderCode } = require('../../utils/formatters');
const {
  ORDER_STATUS,
  normalizeOrderStatus,
  canTransitionOrderStatus
} = require('../../utils/orderStatus');
const { pushNotification } = require('../../utils/notificationHelper');
const { restoreOrderItemStock, formatVariantLabel } = require('../../utils/variantStockHelper');

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
 * Lấy chi tiết đơn hàng kèm danh sách sản phẩm (chitietdonhang + biến thể SKU)
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
         COALESCE(
           (SELECT pt1.TenPhuongThucThanhToan FROM thanhtoan tt JOIN phuongthucthanhtoan pt1 ON tt.MaPhuongThucThanhToan = pt1.MaPhuongThucThanhToan WHERE tt.MaDonHang = d.MaDonHang ORDER BY tt.MaThanhToan DESC LIMIT 1),
           pt.TenPhuongThucThanhToan
         ) AS PhuongThucThanhToan,
         u.Email,
         u.TaiKhoan
       FROM donhang d
       LEFT JOIN nguoidung u ON d.MaNguoiDung = u.MaNguoiDung
       LEFT JOIN phuongthucthanhtoan pt ON pt.MaPhuongThucThanhToan = (
         SELECT lsm.MaPhuongThucThanhToan
         FROM lichsumuahang lsm
         WHERE lsm.MaDonHang = d.MaDonHang
         ORDER BY lsm.MaLichSuMuaHang DESC
         LIMIT 1
       )
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
         ct.MaBienThe,
         ct.SoLuong,
         ct.DonGia,
         ct.DungLuong,
         ct.MauSac,
         (ct.SoLuong * ct.DonGia) AS TongGia,
         sp.TenSanPham,
         sp.Anh,
         bt.MaSKU
       FROM chitietdonhang ct
       LEFT JOIN sanpham sp ON ct.MaSanPham = sp.MaSanPham
       LEFT JOIN sanpham_bienthe bt ON ct.MaBienThe = bt.MaBienThe
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
        Email: order.Email || null,
        TaiKhoan: order.TaiKhoan || null,
        SoDienThoai: order.SoDienThoai,
        DiaChiGiaoHang: order.DiaChiGiaoHang,
        GhiChu: order.GhiChu,
        MaVoucher: order.MaVoucher,
        PhuongThucThanhToan: order.PhuongThucThanhToan || 'COD',
        TongTien: Number(order.TongTien),
        PhiShip: Number(order.PhiShip || 0),
        SoTienGiam: Number(order.SoTienGiam || 0),
        TrangThaiDonHang: order.TrangThaiDonHang,
        items: items.map((item) => ({
          MaChiTietDonHang: item.MaChiTietDonHang,
          MaSanPham: item.MaSanPham,
          MaBienThe: item.MaBienThe || null,
          MaSKU: item.MaSKU || null,
          TenSanPham: item.TenSanPham,
          Anh: item.Anh,
          DungLuong: item.DungLuong || null,
          MauSac: item.MauSac || null,
          SoLuong: Number(item.SoLuong),
          DonGia: Number(item.DonGia),
          TongGia: Number(item.TongGia)
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
 * - Khi Admin xác nhận đơn (ChoXacNhan -> DaXacNhan): gửi thông báo tự động cho Kho (VaiTroNhan = 3).
 * - Khi Admin hủy đơn (-> DaHuy): hoàn trả TonKho theo đúng MaBienThe.
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
      `SELECT MaDonHang, TrangThaiDonHang, MaVoucher, NgayMuaHang, TenNguoiNhan FROM donhang WHERE MaDonHang = ? FOR UPDATE`,
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

    // Nếu chuyển từ trạng thái chưa hủy sang 'DaHuy', hoàn trả tồn kho đúng theo MaBienThe & voucher
    if (
      targetStatus === ORDER_STATUS.DA_HUY &&
      transition.fromStatus !== ORDER_STATUS.DA_HUY
    ) {
      const [items] = await connection.query(
        `SELECT MaSanPham, MaBienThe, SoLuong, DungLuong, MauSac FROM chitietdonhang WHERE MaDonHang = ?`,
        [orderId]
      );

      for (const item of items) {
        await restoreOrderItemStock(connection, {
          maSanPham: item.MaSanPham,
          maBienThe: item.MaBienThe,
          dungLuong: item.DungLuong,
          mauSac: item.MauSac,
          soLuong: item.SoLuong,
          maThamChieu: orderId,
          ghiChu: `Hoàn tồn do quản trị viên hủy đơn hàng #${orderId}`
        });
      }

      if (order.MaVoucher) {
        await connection.query(
          `UPDATE voucher SET SoLuong = SoLuong + 1 WHERE MaVoucher = ?`,
          [order.MaVoucher]
        );
      }
    }

    await connection.commit();

    // Khi Admin xác nhận đơn (ChoXacNhan -> DaXacNhan): bắn thông báo cho Kho (VaiTroNhan = 3)
    if (
      transition.fromStatus === ORDER_STATUS.CHO_XAC_NHAN &&
      targetStatus === ORDER_STATUS.DA_XAC_NHAN
    ) {
      const orderCode = formatOrderCode(orderId, order.NgayMuaHang);
      const [detailRows] = await pool.query(
        `SELECT ct.SoLuong, ct.DungLuong, ct.MauSac, sp.TenSanPham, bt.MaSKU,
                bt.MauSac AS MauSacBienThe, bt.DungLuong AS DungLuongBienThe
         FROM chitietdonhang ct
         JOIN sanpham sp ON ct.MaSanPham = sp.MaSanPham
         LEFT JOIN sanpham_bienthe bt ON ct.MaBienThe = bt.MaBienThe
         WHERE ct.MaDonHang = ?
         ORDER BY ct.MaChiTietDonHang ASC`,
        [orderId]
      );

      const totalQty = detailRows.reduce((sum, r) => sum + Number(r.SoLuong || 0), 0);
      const itemSummary = detailRows
        .slice(0, 3)
        .map((r) => {
          const label = formatVariantLabel(
            r.TenSanPham,
            r.MauSacBienThe || r.MauSac,
            r.DungLuongBienThe || r.DungLuong,
            r.MaSKU
          );
          return `${label}${r.MaSKU ? ` [${r.MaSKU}]` : ''} x${r.SoLuong}`;
        })
        .join(', ');

      await pushNotification({
        vaiTroNhan: 3,
        tieuDe: `Đơn hàng ${orderCode} đã được xác nhận - cần soạn hàng`,
        noiDung: `Admin đã xác nhận đơn hàng ${orderCode} của ${order.TenNguoiNhan || 'khách hàng'} (${totalQty} sản phẩm${itemSummary ? `: ${itemSummary}${detailRows.length > 3 ? ', ...' : ''}` : ''}). Vui lòng chuẩn bị đóng gói.`,
        loaiThongBao: 'DonHang',
        lienKet: '/warehouse/fulfillment'
      });
    }

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
