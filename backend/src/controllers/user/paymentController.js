const {
  createVnpayUrl,
  verifyVnpayReturn,
  createZalopayPaymentUrl
} = require('../../utils/paymentUtil');
const { pool } = require('../../../config/db');
const { sendInvoiceEmail } = require('../../utils/mailer');
const crypto = require('crypto');

// Bảng ánh xạ phương thức thanh toán chuẩn số integer
const METHOD_MAP = {
  'COD': 1,
  'VNPAY': 2,
  'ZALOPAY': 3
};

/**
 * Helper: Bóc tách mã đơn hàng gốc từ chuỗi nhận diện cổng thanh toán
 * Hỗ trợ định dạng ZaloPay: YYMMDD_orderId_timestamp
 * @param {string|number} orderId 
 * @returns {string|null}
 */
const extractCleanOrderId = (orderId) => {
  if (!orderId && orderId !== 0) return null;
  let cleanId = String(orderId).trim();
  if (cleanId.includes('_')) {
    const parts = cleanId.split('_');
    if (parts.length >= 3 && /^\d{6}$/.test(parts[0])) {
      // Định dạng ZaloPay: YYMMDD_orderId_timestamp
      cleanId = parts[1];
    } else {
      cleanId = parts[0];
    }
  }
  return cleanId;
};

/**
 * Helper: Tìm thông tin đơn hàng từ DB nếu cần bổ sung hoặc xác thực
 * Hỗ trợ cả mã số (MaDonHang = 5) và mã đơn chuẩn TMĐT (SZ202610150005)
 * @param {string|number} orderId 
 * @returns {Promise<Object|null>}
 */
const findOrderById = async (orderId) => {
  try {
    if (!orderId && orderId !== 0) return null;

    let cleanId = extractCleanOrderId(orderId);
    if (!cleanId) return null;

    let numericId = Number(cleanId);
    if (isNaN(numericId) && typeof cleanId === 'string' && cleanId.startsWith('SZ')) {
      const match = cleanId.match(/^SZ\d{8}(\d+)$/);
      if (match) {
        numericId = parseInt(match[1], 10);
      }
    }

    const [rows] = await pool.query(
      `SELECT MaDonHang, MaNguoiDung, TongTien, TrangThaiDonHang, TenNguoiNhan, SoDienThoai, DiaChiGiaoHang, PhiShip, SoTienGiam, NgayMuaHang
       FROM donhang
       WHERE MaDonHang = ? OR MaDonHang = ?
       LIMIT 1`,
      [cleanId, isNaN(numericId) ? cleanId : numericId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error(`Lỗi truy vấn đơn hàng #${orderId}:`, err.message);
    return null;
  }
};

/**
 * Helper: Lấy danh sách sản phẩm chi tiết của đơn hàng kèm thông tin phân loại và hình ảnh
 * @param {string|number} orderId
 * @returns {Promise<Array>}
 */
const getOrderItems = async (orderId) => {
  try {
    if (!orderId && orderId !== 0) return [];
    let cleanId = extractCleanOrderId(orderId);
    if (!cleanId) return [];

    let numericId = Number(cleanId);
    if (isNaN(numericId) && typeof cleanId === 'string' && cleanId.startsWith('SZ')) {
      const match = cleanId.match(/^SZ\d{8}(\d+)$/);
      if (match) {
        numericId = parseInt(match[1], 10);
      }
    }

    const [rows] = await pool.query(
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
       WHERE ct.MaDonHang = ? OR ct.MaDonHang = ?
       ORDER BY ct.MaChiTietDonHang ASC`,
      [cleanId, isNaN(numericId) ? cleanId : numericId]
    );
    return rows;
  } catch (err) {
    console.error(`Lỗi lấy chi tiết sản phẩm đơn hàng #${orderId}:`, err.message);
    return [];
  }
};

/**
 * Helper: Lấy ID phương thức thanh toán từ bảng phuongthucthanhtoan
 * @param {string} [name='Zalo'] 
 * @param {number} [fallbackId=3] 
 * @returns {Promise<number>}
 */
const getPaymentMethodId = async (name = 'Zalo', fallbackId = 3) => {
  try {
    const [rows] = await pool.query(
      `SELECT MaPhuongThucThanhToan FROM phuongthucthanhtoan WHERE TenPhuongThucThanhToan LIKE ? LIMIT 1`,
      [`%${name}%`]
    );
    if (rows.length > 0) {
      return rows[0].MaPhuongThucThanhToan;
    }
  } catch (e) {
    console.warn(`Lỗi tìm MaPhuongThucThanhToan cho '${name}':`, e.message);
  }
  return fallbackId;
};

/**
 * Helper xử lý cập nhật trạng thái đơn hàng và lưu log giao dịch khi thanh toán thành công
 * Đảm bảo tính IDEMPOTENCY (không trùng lặp nếu callback/IPN gọi nhiều lần)
 * 
 * @param {Object} params
 * @param {string|number} params.orderId - Mã đơn hàng
 * @param {number} [params.amount] - Số tiền thực tế thanh toán
 * @param {number|string} [params.paymentMethodId] - 1 (COD), 2 (VNPay), 3 (ZaloPay)
 * @param {string} [params.phuongThucThanhToan] - Chuỗi phương thức thanh toán từ client
 * @param {string} [params.paymentMethod] - Chuỗi phương thức thanh toán từ client
 * @param {string} [params.transactionNo] - Mã giao dịch cổng thanh toán
 * @param {string} [params.bankCode] - Mã ngân hàng
 * @returns {Promise<Object>} { order, isNewRecord, maThanhToan }
 */
const processSuccessfulPayment = async (params) => {
  const {
    orderId,
    amount,
    paymentMethodId,
    transactionNo,
    bankCode,
    phuongThucThanhToan,
    paymentMethod
  } = params || {};

  const order = await findOrderById(orderId);
  if (!order) {
    throw new Error(`Không tìm thấy đơn hàng #${orderId} trong hệ thống`);
  }

  // Lấy chuỗi phương thức thanh toán từ request body / params
  const rawMethod = String(
    phuongThucThanhToan ||
    paymentMethod ||
    (paymentMethodId === 2 ? 'VNPAY' : (paymentMethodId === 3 || paymentMethodId === 4 ? 'ZALOPAY' : (paymentMethodId === 1 ? 'COD' : ''))) ||
    paymentMethodId ||
    ''
  ).toUpperCase().trim();

  // Chuyển thành chữ hoa và map sang ID chuẩn số integer (Fallback mặc định 1 (COD) nếu không khớp)
  const maPhuongThucId = Number(
    METHOD_MAP[rawMethod] ||
    (rawMethod === 'ZALO' || rawMethod === '4' ? 3 : (rawMethod === 'VN PAY' || rawMethod === '2' ? 2 : (typeof paymentMethodId === 'number' && [1, 2, 3].includes(paymentMethodId) ? paymentMethodId : 1)))
  );

  // 1. Kiểm tra Idempotency: nếu đơn hàng đã có bản ghi thanh toán thành công với phương thức này
  const [existingPayments] = await pool.query(
    `SELECT MaThanhToan, MaTrangThaiThanhToan, MaPhuongThucThanhToan 
     FROM thanhtoan 
     WHERE MaDonHang = ? AND MaPhuongThucThanhToan = ? AND MaTrangThaiThanhToan = 1 
     LIMIT 1`,
    [order.MaDonHang, maPhuongThucId]
  );

  // Đảm bảo trạng thái đơn hàng trong bảng donhang luôn là 'Đang xử lý'
  if (order.TrangThaiDonHang !== 'Đang xử lý') {
    await pool.query(
      `UPDATE donhang 
       SET TrangThaiDonHang = 'Đang xử lý' 
       WHERE MaDonHang = ?`,
      [order.MaDonHang]
    );
    order.TrangThaiDonHang = 'Đang xử lý';
  }

  if (existingPayments.length > 0) {
    return {
      order,
      isNewRecord: false,
      maThanhToan: existingPayments[0].MaThanhToan
    };
  }

  // 2. Lưu bản ghi vào thanhtoan và lichsumuahang bằng Database Transaction
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Cập nhật TrangThaiDonHang = "Đang xử lý"
    await connection.query(
      `UPDATE donhang 
       SET TrangThaiDonHang = 'Đang xử lý' 
       WHERE MaDonHang = ?`,
      [order.MaDonHang]
    );

    const finalAmount = Number(amount) > 0 ? Number(amount) : Number(order.TongTien);
    let userId = order.MaNguoiDung;
    if (!userId) {
      const [uRows] = await connection.query(`SELECT MaNguoiDung FROM nguoidung LIMIT 1`);
      userId = uRows.length > 0 ? uRows[0].MaNguoiDung : 3;
    }

    // Kiểm tra xem đã có bản ghi trong thanhtoan cho đơn hàng này chưa (ví dụ lúc tạo đơn MaTrangThaiThanhToan = 2)
    const [pendingPayments] = await connection.query(
      `SELECT MaThanhToan FROM thanhtoan WHERE MaDonHang = ? LIMIT 1`,
      [order.MaDonHang]
    );

    let maThanhToan;

    // Log debug kiểm tra Terminal
    console.log("-> Processing Payment Method:", rawMethod, "Mapped ID:", maPhuongThucId);

    if (pendingPayments.length > 0) {
      maThanhToan = pendingPayments[0].MaThanhToan;
      await connection.query(
        `UPDATE thanhtoan 
         SET MaTrangThaiThanhToan = 1,
             SoLuongMua = ?,
             NgayThanhToan = CURDATE(),
             MaPhuongThucThanhToan = ?
         WHERE MaThanhToan = ?`,
        [finalAmount, maPhuongThucId, maThanhToan]
      );
    } else {
      // Lưu bản ghi mới vào bảng thanhtoan (MaTrangThaiThanhToan = 1: Thành công)
      const [insertThanhToan] = await connection.query(
        `INSERT INTO thanhtoan 
          (MaDonHang, MaNguoiDung, SoLuongMua, NgayThanhToan, MaTrangThaiThanhToan, MaPhuongThucThanhToan)
         VALUES (?, ?, ?, CURDATE(), 1, ?)`,
        [order.MaDonHang, userId, finalAmount, maPhuongThucId]
      );
      maThanhToan = insertThanhToan.insertId;
    }

    // Cập nhật hoặc lưu bản ghi vào bảng lichsumuahang (TrangThai = 'Đang xử lý')
    const [existingHistory] = await connection.query(
      `SELECT MaLichSuMuaHang FROM lichsumuahang WHERE MaDonHang = ? LIMIT 1`,
      [order.MaDonHang]
    );

    if (existingHistory.length > 0) {
      await connection.query(
        `UPDATE lichsumuahang 
         SET TrangThai = 'Đang xử lý',
             MaPhuongThucThanhToan = ?,
             MaThanhToan = ?,
             TongTien = ?
         WHERE MaLichSuMuaHang = ?`,
        [maPhuongThucId, maThanhToan, Number(order.TongTien), existingHistory[0].MaLichSuMuaHang]
      );
    } else {
      await connection.query(
        `INSERT INTO lichsumuahang 
          (MaNguoiDung, MaDonHang, NgayMua, TongTien, TrangThai, MaPhuongThucThanhToan, MaThanhToan)
         VALUES (?, ?, CURDATE(), ?, 'Đang xử lý', ?, ?)`,
        [userId, order.MaDonHang, Number(order.TongTien), maPhuongThucId, maThanhToan]
      );
    }

    await connection.commit();
    connection.release();

    return {
      order,
      isNewRecord: true,
      maThanhToan
    };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
};

/**
 * 1. POST /api/v1/payment/create-vnpay
 * Nhận { orderId, amount, [bankCode], [orderInfo], [locale] }
 * Tạo URL thanh toán VNPay và trả về client.
 */
const createVnpayPayment = async (req, res, next) => {
  try {
    const { orderId, amount, bankCode, orderInfo, locale } = req.body;

    // 1. Kiểm tra mã đơn hàng
    if (!orderId && orderId !== 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã đơn hàng (orderId) là bắt buộc'
      });
    }

    // 2. Xác định số tiền thanh toán
    let finalAmount = Number(amount);

    // Nếu không truyền amount hoặc amount <= 0, thử tra cứu TongTien từ bảng donhang
    if (isNaN(finalAmount) || finalAmount <= 0) {
      const order = await findOrderById(orderId);
      if (order && Number(order.TongTien) > 0) {
        finalAmount = Number(order.TongTien);
      }
    }

    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền thanh toán (amount) không hợp lệ (phải lớn hơn 0)'
      });
    }

    // 3. Khởi tạo URL VNPay
    const paymentUrl = createVnpayUrl({
      orderId,
      amount: finalAmount,
      bankCode: bankCode || undefined,
      orderInfo: orderInfo || `Thanh toan don hang #${orderId}`,
      locale: locale || 'vn',
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Tạo URL thanh toán VNPay thành công',
      paymentUrl,
      payUrl: paymentUrl,
      url: paymentUrl,
      data: {
        paymentUrl,
        payUrl: paymentUrl,
        orderId,
        amount: finalAmount
      }
    });
  } catch (error) {
    console.error('Lỗi khi tạo URL thanh toán VNPay:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi tạo link thanh toán VNPay'
    });
  }
};

/**
 * 2. POST /api/v1/payment/create-zalopay
 * Nhận { orderId, amount, [orderInfo], [description], [embedData], [items] }
 * Gọi hàm createZalopayPaymentUrl và trả về JSON: { success: true, payUrl: order_url }
 */
const createZalopayPayment = async (req, res, next) => {
  try {
    const { orderId, amount, orderInfo, description, embedData, embed_data, items, item, app_user, userId } = req.body;

    // 1. Kiểm tra mã đơn hàng
    if (!orderId && orderId !== 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã đơn hàng (orderId) là bắt buộc'
      });
    }

    // 2. Xác định số tiền thanh toán
    let finalAmount = Number(amount);

    // Nếu không truyền amount hoặc amount <= 0, thử tra cứu TongTien từ bảng donhang
    let order = null;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      order = await findOrderById(orderId);
      if (order && Number(order.TongTien) > 0) {
        finalAmount = Number(order.TongTien);
      }
    }

    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền thanh toán (amount) không hợp lệ (phải lớn hơn 0)'
      });
    }

    // Lấy chi tiết sản phẩm nếu có
    let orderItems = items || item;
    if (!orderItems) {
      const dbItems = await getOrderItems(orderId);
      if (dbItems && dbItems.length > 0) {
        orderItems = dbItems.map((it) => ({
          itemid: String(it.MaSanPham),
          itemname: it.TenSanPham || `Sản phẩm #${it.MaSanPham}`,
          itemprice: Number(it.DonGia),
          itemquantity: Number(it.SoLuong)
        }));
      }
    }

    const orderData = {
      ...req.body,
      orderId,
      amount: finalAmount,
      app_user: app_user || userId || (order ? order.MaNguoiDung : 'User'),
      orderInfo: orderInfo || description || `Thanh toan don hang #${orderId}`,
      description: description || orderInfo || `Thanh toan don hang #${orderId}`,
      embed_data: embed_data || embedData,
      item: orderItems
    };

    // 3. Gọi hàm createZalopayPaymentUrl và trả về JSON: { success: true, payUrl: order_url }
    const payUrl = await createZalopayPaymentUrl(orderData);
    console.log('[CONTROLLER ZALOPAY PAYURL SUCCESS]:', payUrl);
    return res.status(200).json({
      success: true,
      payUrl
    });
  } catch (error) {
    console.error('[CONTROLLER ZALOPAY ERROR]:', error.message, error.zalopayResponse);
    return res.status(400).json({
      success: false,
      message: error.message || 'Khởi tạo thanh toán ZaloPay thất bại'
    });
  }
};

/**
 * 3. GET/POST /api/v1/payment/verify-payment
 * Endpoint Callback / Return kiểm tra kết quả thanh toán từ VNPay & ZaloPay:
 * 
 * - Nhận diện cổng thanh toán (VNPay hoặc ZaloPay).
 * - Với ZaloPay: Nhận các tham số trả về từ URL/Callback (status, apptransid, amount).
 *   * Nếu status == 1 (Thanh toán thành công):
 *     - Cập nhật TrangThaiDonHang = "Đang xử lý".
 *     - Kích hoạt hàm gửi Email hóa đơn (sendInvoiceEmail).
 *     - Lưu bản ghi vào bảng thanhtoan / lichsumuahang.
 *     - Trả về JSON thông báo thành công.
 *   * Nếu status != 1:
 *     - Giữ nguyên "Chờ thanh toán", không gửi email và trả về lỗi.
 */
const verifyPayment = async (req, res, next) => {
  try {
    const params = { ...req.query, ...req.body };

    // 1. Nhận diện cổng thanh toán (VNPay vs ZaloPay)
    let gateway = '';
    const specifiedGateway = String(params.gateway || '').toLowerCase().trim();

    if (
      specifiedGateway === 'vnpay' ||
      params.vnp_SecureHash !== undefined ||
      params.vnp_ResponseCode !== undefined ||
      params.vnp_TxnRef !== undefined
    ) {
      gateway = 'vnpay';
    } else if (
      specifiedGateway === 'zalopay' ||
      specifiedGateway === 'zalo' ||
      params.apptransid !== undefined ||
      params.app_trans_id !== undefined ||
      (params.status !== undefined && (params.appid !== undefined || params.pmcid !== undefined || params.checksum !== undefined))
    ) {
      gateway = 'zalopay';
    }

    if (!gateway) {
      // Fallback: nếu có apptransid hoặc status thì mặc định kiểm tra ZaloPay
      if (params.apptransid !== undefined || params.status !== undefined) {
        gateway = 'zalopay';
      } else {
        return res.status(400).json({
          success: false,
          isSuccess: false,
          message: 'Không xác định được cổng thanh toán (VNPay hoặc ZaloPay) hoặc thiếu tham số callback kiểm tra',
          data: null
        });
      }
    }

    // 2. Xử lý cho VNPay
    if (gateway === 'vnpay') {
      const verifyResult = verifyVnpayReturn(params);

      // 2.1 Kiểm tra checksum/signature
      if (!verifyResult.isValid) {
        const orderInfo = await findOrderById(verifyResult.orderId);
        const items = orderInfo ? await getOrderItems(orderInfo.MaDonHang) : [];
        return res.status(400).json({
          success: false,
          isSuccess: false,
          message: 'Chữ ký VNPay không hợp lệ (Checksum failed)',
          data: {
            gateway: 'VNPay',
            orderId: verifyResult.orderId,
            responseCode: verifyResult.responseCode,
            amount: verifyResult.amount,
            order: orderInfo,
            items
          }
        });
      }

      // 2.2 Kiểm tra responseCode (vnp_ResponseCode === '00')
      if (!verifyResult.isSuccess) {
        const orderInfo = await findOrderById(verifyResult.orderId);
        const items = orderInfo ? await getOrderItems(orderInfo.MaDonHang) : [];
        return res.status(200).json({
          success: false,
          isSuccess: false,
          message: verifyResult.message || 'Giao dịch VNPay không thành công hoặc khách hàng đã hủy',
          data: {
            gateway: 'VNPay',
            orderId: verifyResult.orderId,
            responseCode: verifyResult.responseCode,
            amount: verifyResult.amount || (orderInfo ? Number(orderInfo.TongTien) : 0),
            bankCode: verifyResult.bankCode,
            transactionNo: verifyResult.transactionNo,
            orderInfo: verifyResult.orderInfo,
            order: orderInfo,
            items
          }
        });
      }

      // 2.3 Thành công: Cập nhật donhang thành "Đang xử lý", lưu thanhtoan & lichsumuahang
      const processResult = await processSuccessfulPayment({
        orderId: verifyResult.orderId,
        amount: verifyResult.amount,
        paymentMethodId: 2, // VNPay
        phuongThucThanhToan: 'VNPAY',
        paymentMethod: 'VNPAY',
        transactionNo: verifyResult.transactionNo,
        bankCode: verifyResult.bankCode
      });

      const items = await getOrderItems(processResult.order.MaDonHang);

      // Gửi email hóa đơn cho khách hàng
      sendInvoiceEmail(processResult.order.MaDonHang).catch((mailErr) => {
        console.error(`[sendInvoiceEmail] Lỗi gửi email hóa đơn sau thanh toán VNPay đơn hàng #${processResult.order.MaDonHang}:`, mailErr.message);
      });

      return res.status(200).json({
        success: true,
        isSuccess: true,
        message: 'Xác nhận thanh toán VNPay thành công. Đơn hàng đang được xử lý.',
        data: {
          gateway: 'VNPay',
          orderId: processResult.order.MaDonHang,
          amount: verifyResult.amount || Number(processResult.order.TongTien),
          transactionNo: verifyResult.transactionNo || null,
          bankCode: verifyResult.bankCode || null,
          orderInfo: verifyResult.orderInfo || null,
          payDate: verifyResult.payDate || null,
          orderStatus: 'Đang xử lý',
          paymentMethod: 'VNPay',
          paymentStatus: 'Thành công',
          paymentId: processResult.maThanhToan,
          isNewRecord: processResult.isNewRecord,
          order: processResult.order,
          items
        }
      });
    }

    // 3. Xử lý cho ZaloPay
    if (gateway === 'zalopay') {
      const { status, apptransid, app_trans_id, amount } = params;
      const currentAppTransId = apptransid || app_trans_id || params.transId || '';

      // Trích xuất mã đơn hàng từ query hoặc apptransid (dạng YYMMDD_orderId_timestamp)
      let targetOrderId = params.orderId || params.order_id;
      if (!targetOrderId && currentAppTransId) {
        const parts = String(currentAppTransId).split('_');
        if (parts.length >= 3 && /^\d{6}$/.test(parts[0])) {
          targetOrderId = parts[1];
        } else if (parts.length === 2) {
          targetOrderId = parts[0];
        } else {
          targetOrderId = currentAppTransId;
        }
      }

      const orderInfo = await findOrderById(targetOrderId || currentAppTransId);
      const finalOrderId = orderInfo ? orderInfo.MaDonHang : targetOrderId;
      const items = finalOrderId ? await getOrderItems(finalOrderId) : [];

      // KIỂM TRA STATUS TRẢ VỀ TỪ ZALOPAY:
      // Nếu status == 1: Thanh toán thành công
      if (status == 1 || String(status) === '1') {
        // 1. Cập nhật TrangThaiDonHang = "Đang xử lý"
        if (finalOrderId) {
          try {
            await pool.query(
              `UPDATE donhang 
               SET TrangThaiDonHang = 'Đang xử lý' 
               WHERE MaDonHang = ?`,
              [finalOrderId]
            );
          } catch (dbErr) {
            console.error(`Lỗi cập nhật trạng thái đơn hàng #${finalOrderId}:`, dbErr.message);
          }
        }

        // 2. Lưu bản ghi vào bảng thanhtoan / lichsumuahang
        let processResult = null;
        try {
          const zalopayMethodId = await getPaymentMethodId('Zalo', 3);
          processResult = await processSuccessfulPayment({
            orderId: finalOrderId || currentAppTransId,
            amount: Number(amount) || (orderInfo ? Number(orderInfo.TongTien) : 0),
            paymentMethodId: zalopayMethodId,
            phuongThucThanhToan: 'ZALOPAY',
            paymentMethod: 'ZALOPAY',
            transactionNo: currentAppTransId,
            bankCode: params.bankcode || params.bankCode || 'ZALOPAY'
          });
        } catch (procErr) {
          console.warn('[ZaloPay Return] Ghi log thanh toán:', procErr.message);
        }

        // 3. Kích hoạt hàm gửi Email hóa đơn (sendInvoiceEmail)
        if (finalOrderId) {
          sendInvoiceEmail(finalOrderId).catch((mailErr) => {
            console.error(`[sendInvoiceEmail] Lỗi gửi email hóa đơn sau thanh toán ZaloPay đơn hàng #${finalOrderId}:`, mailErr.message);
          });
        }

        // 4. Trả về JSON thông báo thành công
        return res.status(200).json({
          success: true,
          isSuccess: true,
          message: 'Thanh toán ZaloPay thành công! Đơn hàng đang được xử lý.',
          orderId: finalOrderId,
          amount: Number(amount) || (orderInfo ? Number(orderInfo.TongTien) : 0),
          apptransid: currentAppTransId,
          transId: currentAppTransId,
          status: 1,
          method: 'ZaloPay',
          gateway: 'ZaloPay',
          data: {
            gateway: 'ZaloPay',
            orderId: finalOrderId,
            amount: Number(amount) || (orderInfo ? Number(orderInfo.TongTien) : 0),
            transactionNo: currentAppTransId,
            transId: currentAppTransId,
            apptransid: currentAppTransId,
            orderStatus: 'Đang xử lý',
            paymentMethod: 'ZaloPay',
            paymentStatus: 'Thành công',
            paymentId: processResult?.maThanhToan,
            isNewRecord: processResult?.isNewRecord,
            order: orderInfo ? { ...orderInfo, TrangThaiDonHang: 'Đang xử lý' } : null,
            items
          }
        });
      } else {
        // Nếu status != 1: Giữ nguyên "Chờ thanh toán", không gửi email và trả về lỗi
        if (finalOrderId && orderInfo) {
          if (orderInfo.TrangThaiDonHang !== 'Chờ thanh toán') {
            try {
              await pool.query(
                `UPDATE donhang 
                 SET TrangThaiDonHang = 'Chờ thanh toán' 
                 WHERE MaDonHang = ?`,
                [finalOrderId]
              );
            } catch (dbErr) {
              console.error(`Lỗi giữ nguyên trạng thái đơn hàng #${finalOrderId}:`, dbErr.message);
            }
          }
        }

        // KHÔNG gửi email và trả về lỗi
        return res.status(400).json({
          success: false,
          isSuccess: false,
          message: params.message || `Giao dịch ZaloPay không thành công hoặc khách hàng đã hủy (status: ${status})`,
          orderId: finalOrderId,
          amount: Number(amount) || 0,
          apptransid: currentAppTransId,
          status: status !== undefined ? Number(status) : 0,
          orderStatus: 'Chờ thanh toán',
          data: {
            gateway: 'ZaloPay',
            orderId: finalOrderId,
            status: status !== undefined ? Number(status) : 0,
            orderStatus: 'Chờ thanh toán',
            order: orderInfo ? { ...orderInfo, TrangThaiDonHang: 'Chờ thanh toán' } : null,
            items
          }
        });
      }
    }
  } catch (error) {
    console.error('Lỗi khi verify thanh toán:', error);
    return res.status(500).json({
      success: false,
      isSuccess: false,
      message: error.message || 'Lỗi server khi xác thực kết quả thanh toán',
      data: null
    });
  }
};

/**
 * 4. GET /api/v1/payment/vnpay-return
 * Xử lý dữ liệu chuyển hướng trả về khi khách hàng hoàn tất hoặc hủy thanh toán VNPay
 */
const handleVnpayReturn = async (req, res, next) => {
  return verifyPayment(req, res, next);
};

/**
 * 5. GET /api/v1/payment/vnpay-ipn
 * Webhook Server-to-Server từ VNPay
 */
const handleVnpayIpn = async (req, res, next) => {
  try {
    const verifyResult = verifyVnpayReturn(req.query);

    if (!verifyResult.isValid) {
      return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
    }

    const order = await findOrderById(verifyResult.orderId);
    if (!order) {
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    if (Math.round(Number(order.TongTien)) !== Math.round(Number(verifyResult.amount))) {
      return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    }

    if (verifyResult.isSuccess) {
      const processResult = await processSuccessfulPayment({
        orderId: verifyResult.orderId,
        amount: verifyResult.amount,
        paymentMethodId: 2, // VNPay
        phuongThucThanhToan: 'VNPAY',
        paymentMethod: 'VNPAY',
        transactionNo: verifyResult.transactionNo,
        bankCode: verifyResult.bankCode
      });
      if (processResult.isNewRecord) {
        sendInvoiceEmail(processResult.order.MaDonHang).catch((err) =>
          console.error(`[sendInvoiceEmail VNPay IPN] Lỗi:`, err.message)
        );
      }
    }

    return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (error) {
    console.error('Lỗi xử lý vnpay-ipn:', error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

/**
 * 6. GET /api/v1/payment/zalopay-return
 * Xử lý dữ liệu chuyển hướng trả về từ ZaloPay
 */
const handleZalopayReturn = async (req, res, next) => {
  return verifyPayment(req, res, next);
};

/**
 * 7. POST /api/v1/payment/zalopay-ipn (hoặc /zalopay-callback)
 * Webhook Server-to-Server từ ZaloPay
 */
const handleZalopayIpn = async (req, res, next) => {
  let result = {};
  try {
    const dataStr = req.body?.data;
    const reqMac = req.body?.mac;
    const key2 = process.env.ZALOPAY_KEY2;

    if (dataStr && reqMac && key2) {
      const mac = crypto
        .createHmac('sha256', key2)
        .update(typeof dataStr === 'string' ? dataStr : JSON.stringify(dataStr))
        .digest('hex');

      if (reqMac !== mac) {
        result.return_code = -1;
        result.return_message = 'mac not equal';
        return res.json(result);
      }

      // MAC hợp lệ
      const dataJson = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
      const apptransid = dataJson.app_trans_id;
      const amount = dataJson.amount;

      let orderId = dataJson.orderId;
      if (!orderId && apptransid) {
        const parts = String(apptransid).split('_');
        if (parts.length >= 3 && /^\d{6}$/.test(parts[0])) {
          orderId = parts[1];
        } else if (parts.length === 2) {
          orderId = parts[0];
        } else {
          orderId = apptransid;
        }
      }

      const zalopayMethodId = await getPaymentMethodId('Zalo', 3);
      const processResult = await processSuccessfulPayment({
        orderId,
        amount,
        paymentMethodId: zalopayMethodId,
        phuongThucThanhToan: 'ZALOPAY',
        paymentMethod: 'ZALOPAY',
        transactionNo: dataJson.zp_trans_id || apptransid
      });

      if (processResult.isNewRecord) {
        sendInvoiceEmail(processResult.order.MaDonHang).catch((err) =>
          console.error(`[sendInvoiceEmail ZaloPay IPN] Lỗi:`, err.message)
        );
      }

      result.return_code = 1;
      result.return_message = 'success';
      return res.json(result);
    }

    // Nếu IPN / Callback dạng flat params
    return verifyPayment(req, res, next);
  } catch (error) {
    console.error('Lỗi xử lý zalopay-ipn:', error);
    result.return_code = 0; // ZaloPay server will retry
    result.return_message = error.message;
    return res.json(result);
  }
};

module.exports = {
  createVnpayPayment,
  createZalopayPayment,
  verifyPayment,
  handleVnpayReturn,
  handleVnpayIpn,
  handleZalopayReturn,
  handleZalopayIpn
};
