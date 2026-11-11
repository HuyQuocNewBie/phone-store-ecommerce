const { pool } = require('../../../config/db');
const { formatOrderCode } = require('../../utils/formatters');
const {
  ORDER_STATUS,
  STATUS_DB_GROUPS,
  normalizeOrderStatus
} = require('../../utils/orderStatus');

const STAGE_STATUS_MAP = {
  pending_confirm: ORDER_STATUS.CHO_XAC_NHAN,
  pending_pack: ORDER_STATUS.DA_XAC_NHAN,
  ready_ship: ORDER_STATUS.DANG_DONG_GOI,
  shipping: ORDER_STATUS.DANG_GIAO
};

/**
 * 1. GET /api/v1/warehouse/orders/fulfillment
 * Lấy danh sách đơn hàng phục vụ xác nhận, đóng gói, bàn giao shipper & hoàn tất cho Nhân viên Kho.
 * Query ?stage=pending_confirm (TrangThaiDonHang = 'ChoXacNhan')
 *       ?stage=pending_pack    (TrangThaiDonHang = 'DaXacNhan' -> Tab "Chờ đóng gói")
 *       ?stage=ready_ship      (TrangThaiDonHang = 'DangDongGoi' -> Tab "Sẵn sàng giao")
 *       ?stage=shipping        (TrangThaiDonHang = 'DangGiao' -> Tab "Đang giao")
 * Nếu không truyền stage hoặc stage=all -> lấy tất cả 4 nấc xử lý của Kho
 */
const getFulfillmentOrders = async (req, res, next) => {
  try {
    const rawStage = req.query.stage;
    const stage = rawStage !== undefined && rawStage !== null ? String(rawStage).trim().toLowerCase() : '';

    let whereClause = '';
    const queryParams = [];

    if (!stage || stage === 'all') {
      const allWarehouseStatuses = [
        ...STATUS_DB_GROUPS[ORDER_STATUS.CHO_XAC_NHAN],
        ...STATUS_DB_GROUPS[ORDER_STATUS.DA_XAC_NHAN],
        ...STATUS_DB_GROUPS[ORDER_STATUS.DANG_DONG_GOI],
        ...STATUS_DB_GROUPS[ORDER_STATUS.DANG_GIAO]
      ];
      whereClause = `WHERE d.TrangThaiDonHang IN (?)`;
      queryParams.push(allWarehouseStatuses);
    } else if (STAGE_STATUS_MAP[stage]) {
      const targetCode = STAGE_STATUS_MAP[stage];
      const allowedRawValues = STATUS_DB_GROUPS[targetCode] || [targetCode];
      whereClause = `WHERE d.TrangThaiDonHang IN (?)`;
      queryParams.push(allowedRawValues);
    } else {
      return res.status(400).json({
        success: false,
        message: "Tham số stage không hợp lệ. Chỉ chấp nhận 'pending_confirm', 'pending_pack', 'ready_ship', 'shipping' hoặc 'all'"
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
      TrangThaiDonHang: normalizeOrderStatus(order.TrangThaiDonHang) || order.TrangThaiDonHang,
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
 * Helper chuyển nấc trạng thái Kho nghiêm ngặt theo đúng thứ tự 5 bước
 */
const transitionWarehouseOrderStage = async ({ req, res, next, expectedStatus, nextStatus, successMessage, invalidMessage }) => {
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
    const currentCanonicalStatus = normalizeOrderStatus(order.TrangThaiDonHang);

    if (currentCanonicalStatus !== expectedStatus) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `${invalidMessage}. Trạng thái hiện tại: '${order.TrangThaiDonHang}'`
      });
    }

    await connection.query(
      `UPDATE donhang SET TrangThaiDonHang = ? WHERE MaDonHang = ?`,
      [nextStatus, orderId]
    );

    await connection.query(
      `UPDATE lichsumuahang SET TrangThai = ? WHERE MaDonHang = ?`,
      [nextStatus, orderId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: successMessage,
      data: {
        MaDonHang: orderId,
        CodeDonHang: formatOrderCode(orderId, order.NgayMuaHang),
        TrangThaiDonHang: nextStatus
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
 * 2. PUT /api/v1/warehouse/orders/:id/confirm
 * Admin/Kho xác nhận đơn hàng mới:
 * Chuyển TrangThaiDonHang từ 'ChoXacNhan' -> 'DaXacNhan' (Hiện ở Tab "Chờ đóng gói" của Kho)
 */
const confirmOrder = async (req, res, next) =>
  transitionWarehouseOrderStage({
    req,
    res,
    next,
    expectedStatus: ORDER_STATUS.CHO_XAC_NHAN,
    nextStatus: ORDER_STATUS.DA_XAC_NHAN,
    successMessage: 'Xác nhận đơn hàng thành công — đã chuyển sang Chờ đóng gói',
    invalidMessage: `Chỉ có thể xác nhận đơn hàng ở trạng thái '${ORDER_STATUS.CHO_XAC_NHAN}'`
  });

/**
 * 3. PUT /api/v1/warehouse/orders/:id/pack
 * Nhân viên Kho xác nhận bắt đầu đóng gói đơn hàng:
 * Chuyển TrangThaiDonHang từ 'DaXacNhan' -> 'DangDongGoi' (Hiện ở Tab "Sẵn sàng giao" của Kho)
 */
const packOrder = async (req, res, next) =>
  transitionWarehouseOrderStage({
    req,
    res,
    next,
    expectedStatus: ORDER_STATUS.DA_XAC_NHAN,
    nextStatus: ORDER_STATUS.DANG_DONG_GOI,
    successMessage: 'Cập nhật trạng thái đang đóng gói thành công',
    invalidMessage: `Chỉ có thể đóng gói đơn hàng ở trạng thái '${ORDER_STATUS.DA_XAC_NHAN}'`
  });

/**
 * 4. PUT /api/v1/warehouse/orders/:id/ship
 * Nhân viên Kho bàn giao đơn hàng cho shipper:
 * Chuyển TrangThaiDonHang từ 'DangDongGoi' -> 'DangGiao'
 */
const shipOrder = async (req, res, next) =>
  transitionWarehouseOrderStage({
    req,
    res,
    next,
    expectedStatus: ORDER_STATUS.DANG_DONG_GOI,
    nextStatus: ORDER_STATUS.DANG_GIAO,
    successMessage: 'Cập nhật trạng thái đang giao thành công',
    invalidMessage: `Chỉ có thể giao shipper đơn hàng ở trạng thái '${ORDER_STATUS.DANG_DONG_GOI}'`
  });

/**
 * 5. PUT /api/v1/warehouse/orders/:id/deliver
 * Hoàn tất giao đơn hàng cho khách:
 * Chuyển TrangThaiDonHang từ 'DangGiao' -> 'DaGiao'
 */
const deliverOrder = async (req, res, next) =>
  transitionWarehouseOrderStage({
    req,
    res,
    next,
    expectedStatus: ORDER_STATUS.DANG_GIAO,
    nextStatus: ORDER_STATUS.DA_GIAO,
    successMessage: 'Xác nhận hoàn tất giao hàng thành công',
    invalidMessage: `Chỉ có thể hoàn tất đơn hàng ở trạng thái '${ORDER_STATUS.DANG_GIAO}'`
  });

module.exports = {
  getFulfillmentOrders,
  confirmOrder,
  packOrder,
  shipOrder,
  deliverOrder
};

