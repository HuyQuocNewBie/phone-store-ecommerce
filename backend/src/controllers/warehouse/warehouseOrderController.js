const { pool } = require('../../../config/db');
const { formatOrderCode } = require('../../utils/formatters');

const STAGE_STATUS_MAP = {
  pending_pack: 'DaXacNhan',
  ready_ship: 'DangDongGoi'
};

/**
 * 1. GET /api/v1/warehouse/orders/fulfillment
 * Lấy danh sách đơn hàng phục vụ đóng gói và bàn giao vận chuyển cho Nhân viên Kho.
 * Query ?stage=pending_pack (TrangThaiDonHang = 'DaXacNhan')
 *       ?stage=ready_ship   (TrangThaiDonHang = 'DangDongGoi')
 * Nếu không truyền stage hoặc stage=all -> lấy cả 2 trạng thái ('DaXacNhan', 'DangDongGoi')
 */
const getFulfillmentOrders = async (req, res, next) => {
  try {
    const rawStage = req.query.stage;
    const stage = rawStage !== undefined && rawStage !== null ? String(rawStage).trim().toLowerCase() : '';

    let whereClause = '';
    const queryParams = [];

    if (!stage || stage === 'all') {
      whereClause = `WHERE d.TrangThaiDonHang IN (?, ?)`;
      queryParams.push(STAGE_STATUS_MAP.pending_pack, STAGE_STATUS_MAP.ready_ship);
    } else if (STAGE_STATUS_MAP[stage]) {
      whereClause = `WHERE d.TrangThaiDonHang = ?`;
      queryParams.push(STAGE_STATUS_MAP[stage]);
    } else {
      return res.status(400).json({
        success: false,
        message: "Tham số stage không hợp lệ. Chỉ chấp nhận 'pending_pack' hoặc 'ready_ship'"
      });
    }

    const [orders] = await pool.query(
      `SELECT 
         d.MaDonHang,
         d.MaNguoiDung,
         d.NgayMuaHang,
         COALESCE(d.TenNguoiNhan, u.TaiKhoan, 'Khách hàng') AS TenNguoiNhan,
         d.SoDienThoai,
         d.DiaChiGiaoHang,
         d.GhiChu,
         d.TongTien,
         d.PhiShip,
         d.SoTienGiam,
         d.TrangThaiDonHang
       FROM donhang d
       LEFT JOIN nguoidung u ON d.MaNguoiDung = u.MaNguoiDung
       ${whereClause}
       ORDER BY d.NgayMuaHang DESC, d.MaDonHang DESC`,
      queryParams
    );

    if (orders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách đơn hàng kho thành công',
        data: []
      });
    }

    const orderIds = orders.map((order) => order.MaDonHang);
    const [itemRows] = await pool.query(
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
         sp.Anh,
         sp.TonKho
       FROM chitietdonhang ct
       LEFT JOIN sanpham sp ON ct.MaSanPham = sp.MaSanPham
       WHERE ct.MaDonHang IN (?)
       ORDER BY ct.MaChiTietDonHang ASC`,
      [orderIds]
    );

    const itemsMap = new Map();
    itemRows.forEach((item) => {
      if (!itemsMap.has(item.MaDonHang)) {
        itemsMap.set(item.MaDonHang, []);
      }
      itemsMap.get(item.MaDonHang).push({
        MaChiTietDonHang: item.MaChiTietDonHang,
        MaSanPham: item.MaSanPham,
        TenSanPham: item.TenSanPham || 'Sản phẩm',
        Anh: item.Anh || null,
        DungLuong: item.DungLuong || null,
        MauSac: item.MauSac || null,
        SoLuong: Number(item.SoLuong),
        DonGia: Number(item.DonGia),
        TongGia: Number(item.TongGia || item.SoLuong * item.DonGia),
        TonKho: item.TonKho !== null && item.TonKho !== undefined ? Number(item.TonKho) : 0
      });
    });

    const formattedOrders = orders.map((order) => ({
      MaDonHang: order.MaDonHang,
      CodeDonHang: formatOrderCode(order.MaDonHang, order.NgayMuaHang),
      MaNguoiDung: order.MaNguoiDung,
      NgayMuaHang: order.NgayMuaHang,
      TenNguoiNhan: order.TenNguoiNhan,
      SoDienThoai: order.SoDienThoai,
      DiaChiGiaoHang: order.DiaChiGiaoHang,
      GhiChu: order.GhiChu,
      TongTien: Number(order.TongTien),
      PhiShip: Number(order.PhiShip || 0),
      SoTienGiam: Number(order.SoTienGiam || 0),
      TrangThaiDonHang: order.TrangThaiDonHang,
      chitietdonhang: itemsMap.get(order.MaDonHang) || []
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách đơn hàng kho thành công',
      data: formattedOrders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. PUT /api/v1/warehouse/orders/:id/pack
 * Nhân viên Kho xác nhận bắt đầu đóng gói đơn hàng:
 * Chuyển TrangThaiDonHang từ 'DaXacNhan' -> 'DangDongGoi'
 */
const packOrder = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    const orderId = Number(id);

    if (!id || !Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã đơn hàng không hợp lệ'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [orders] = await connection.query(
      `SELECT MaDonHang, NgayMuaHang, TrangThaiDonHang
       FROM donhang
       WHERE MaDonHang = ?
       FOR UPDATE`,
      [orderId]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tồn tại'
      });
    }

    const order = orders[0];

    if (order.TrangThaiDonHang !== 'DaXacNhan') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Chỉ có thể đóng gói đơn hàng ở trạng thái 'DaXacNhan'. Trạng thái hiện tại: '${order.TrangThaiDonHang}'`
      });
    }

    await connection.query(
      `UPDATE donhang SET TrangThaiDonHang = 'DangDongGoi' WHERE MaDonHang = ?`,
      [orderId]
    );

    await connection.query(
      `UPDATE lichsumuahang SET TrangThai = 'DangDongGoi' WHERE MaDonHang = ?`,
      [orderId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái đang đóng gói thành công',
      data: {
        MaDonHang: orderId,
        CodeDonHang: formatOrderCode(orderId, order.NgayMuaHang),
        TrangThaiDonHang: 'DangDongGoi'
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

/**
 * 3. PUT /api/v1/warehouse/orders/:id/ship
 * Nhân viên Kho bàn giao đơn hàng cho shipper:
 * Chuyển TrangThaiDonHang từ 'DangDongGoi' -> 'DangGiao'
 */
const shipOrder = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    const orderId = Number(id);

    if (!id || !Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã đơn hàng không hợp lệ'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [orders] = await connection.query(
      `SELECT MaDonHang, NgayMuaHang, TrangThaiDonHang
       FROM donhang
       WHERE MaDonHang = ?
       FOR UPDATE`,
      [orderId]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tồn tại'
      });
    }

    const order = orders[0];

    if (order.TrangThaiDonHang !== 'DangDongGoi') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Chỉ có thể giao shipper đơn hàng ở trạng thái 'DangDongGoi'. Trạng thái hiện tại: '${order.TrangThaiDonHang}'`
      });
    }

    await connection.query(
      `UPDATE donhang SET TrangThaiDonHang = 'DangGiao' WHERE MaDonHang = ?`,
      [orderId]
    );

    await connection.query(
      `UPDATE lichsumuahang SET TrangThai = 'DangGiao' WHERE MaDonHang = ?`,
      [orderId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái đang giao thành công',
      data: {
        MaDonHang: orderId,
        CodeDonHang: formatOrderCode(orderId, order.NgayMuaHang),
        TrangThaiDonHang: 'DangGiao'
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
  getFulfillmentOrders,
  packOrder,
  shipOrder
};

