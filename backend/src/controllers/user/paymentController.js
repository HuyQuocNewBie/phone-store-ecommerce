const {
  createVnpayUrl,
  verifyVnpayReturn,
  createMomoPaymentUrl,
  verifyMomoSignature
} = require('../../utils/paymentUtil');
const { pool } = require('../../../config/db');
const { sendInvoiceEmail } = require('../../utils/mailer');

/**
 * Helper: Tìm thông tin đơn hàng từ DB nếu cần bổ sung hoặc xác thực
 * Hỗ trợ cả mã số (MaDonHang = 5) và mã đơn chuẩn TMĐT (SZ202610150005)
 * @param {string|number} orderId 
 * @returns {Promise<Object|null>}
 */
const findOrderById = async (orderId) => {
  try {
    if (!orderId && orderId !== 0) return null;

    let cleanId = String(orderId).trim();
    // Hỗ trợ bóc tách orderId gốc nếu MoMo/cổng thanh toán trả về dạng orderId_timestamp hoặc orderId_uuid
    if (cleanId.includes('_')) {
      cleanId = cleanId.split('_')[0];
    }

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
    let cleanId = String(orderId).trim();
    if (cleanId.includes('_')) {
      cleanId = cleanId.split('_')[0];
    }
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
 * Helper xử lý cập nhật trạng thái đơn hàng và lưu log giao dịch khi thanh toán thành công
 * Đảm bảo tính IDEMPOTENCY (không trùng lặp nếu callback/IPN gọi nhiều lần)
 * 
 * @param {Object} params
 * @param {string|number} params.orderId - Mã đơn hàng
 * @param {number} [params.amount] - Số tiền thực tế thanh toán
 * @param {number} params.paymentMethodId - 2 (VNPay) hoặc 3 (MoMo)
 * @param {string} [params.transactionNo] - Mã giao dịch cổng thanh toán
 * @param {string} [params.bankCode] - Mã ngân hàng
 * @returns {Promise<Object>} { order, isNewRecord, maThanhToan }
 */
const processSuccessfulPayment = async ({ orderId, amount, paymentMethodId, transactionNo, bankCode }) => {
  const order = await findOrderById(orderId);
  if (!order) {
    throw new Error(`Không tìm thấy đơn hàng #${orderId} trong hệ thống`);
  }

  // 1. Kiểm tra Idempotency: nếu đơn hàng đã có bản ghi thanh toán thành công với phương thức này
  const [existingPayments] = await pool.query(
    `SELECT MaThanhToan, MaTrangThaiThanhToan, MaPhuongThucThanhToan 
     FROM thanhtoan 
     WHERE MaDonHang = ? AND MaPhuongThucThanhToan = ? AND MaTrangThaiThanhToan = 1 
     LIMIT 1`,
    [order.MaDonHang, paymentMethodId]
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
    const userId = order.MaNguoiDung || 1;

    // Lưu bản ghi vào bảng thanhtoan (MaTrangThaiThanhToan = 1: Thành công)
    const [insertThanhToan] = await connection.query(
      `INSERT INTO thanhtoan 
        (MaDonHang, MaNguoiDung, SoLuongMua, NgayThanhToan, MaTrangThaiThanhToan, MaPhuongThucThanhToan)
       VALUES (?, ?, ?, CURDATE(), 1, ?)`,
      [order.MaDonHang, userId, finalAmount, paymentMethodId]
    );
    const maThanhToan = insertThanhToan.insertId;

    // Lưu bản ghi vào bảng lichsumuahang (TrangThai = 'Đang xử lý')
    await connection.query(
      `INSERT INTO lichsumuahang 
        (MaNguoiDung, MaDonHang, NgayMua, TongTien, TrangThai, MaPhuongThucThanhToan, MaThanhToan)
       VALUES (?, ?, CURDATE(), ?, 'Đang xử lý', ?, ?)`,
      [userId, order.MaDonHang, Number(order.TongTien), paymentMethodId, maThanhToan]
    );

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
 * 2. POST /api/v1/payment/create-momo
 * Nhận { orderId, amount, [orderInfo], [extraData] }
 * Gọi API MoMo Sandbox và trả về payUrl cho client.
 */
const createMomoPayment = async (req, res, next) => {
  try {
    const { orderId, amount, orderInfo, extraData } = req.body;

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

    // 3. Gọi API MoMo Sandbox
    let payUrl;
    try {
      payUrl = await createMomoPaymentUrl({
        orderId,
        amount: finalAmount,
        orderInfo: orderInfo || `Thanh toan don hang #${orderId}`,
        extraData: extraData || ''
      });
    } catch (momoErr) {
      // Hỗ trợ fallback sandbox URL khi MoMo test server từ chối tài khoản test công khai (resultCode 99)
      const allowFallback =
        req.query.fallback === 'true' ||
        req.body.fallback === true ||
        req.body.fallback === 'true' ||
        process.env.MOMO_SANDBOX_FALLBACK === 'true';

      if (allowFallback) {
        payUrl = `https://test-payment.momo.vn/v2/gateway/pay?t=${Buffer.from(String(orderId)).toString('base64')}`;
      } else {
        throw momoErr;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Tạo link thanh toán MoMo thành công',
      payUrl,
      paymentUrl: payUrl,
      url: payUrl,
      data: {
        payUrl,
        paymentUrl: payUrl,
        orderId,
        amount: Math.round(finalAmount).toString()
      }
    });
  } catch (error) {
    console.error('Lỗi khi gọi API MoMo Sandbox:', error.message);
    const statusCode = error.response?.status || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi khi gọi API MoMo Sandbox',
      momoResponse: error.momoResponse || error.response?.data
    });
  }
};

/**
 * 3. GET /api/v1/payment/verify-payment
 * Endpoint Callback/Return kiểm tra kết quả thanh toán từ VNPay & MoMo:
 * 1. Nhận diện cổng thanh toán (VNPay hoặc MoMo).
 * 2. Kiểm tra checksum/signature trả về:
 *    - VNPay: kiểm tra chữ ký HMAC-SHA512 & vnp_ResponseCode === '00'.
 *    - MoMo: kiểm tra chữ ký HMAC-SHA256 & resultCode === 0.
 * 3. Nếu THÀNH CÔNG:
 *    - Cập nhật trạng thái đơn hàng trong bảng donhang thành TrangThaiDonHang = "Đang xử lý".
 *    - Đồng thời lưu bản ghi vào bảng thanhtoan (MaTrangThaiThanhToan = 1) và lichsumuahang.
 * 4. Trả về JSON kết quả chi tiết thành công/thất bại cho Frontend hiển thị.
 */
const verifyPayment = async (req, res, next) => {
  try {
    const params = { ...req.query, ...req.body };

    // 1. Nhận diện cổng thanh toán (VNPay vs MoMo)
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
      specifiedGateway === 'momo' ||
      params.partnerCode !== undefined ||
      params.resultCode !== undefined ||
      params.transId !== undefined ||
      params.signature !== undefined
    ) {
      gateway = 'momo';
    }

    if (!gateway) {
      return res.status(400).json({
        success: false,
        isSuccess: false,
        message: 'Không xác định được cổng thanh toán (VNPay hoặc MoMo) hoặc thiếu tham số callback kiểm tra',
        data: null
      });
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
        transactionNo: verifyResult.transactionNo,
        bankCode: verifyResult.bankCode
      });

      // Lấy danh sách sản phẩm của đơn hàng
      const items = await getOrderItems(processResult.order.MaDonHang);

      // LÚC NÀY MỚI GỌI HÀM sendInvoiceEmail(orderId) để gửi mail hóa đơn cho khách hàng
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

    // 3. Xử lý cho MoMo
    if (gateway === 'momo') {
      const verifyResult = verifyMomoSignature(params);

      // 3.1 Kiểm tra checksum/signature
      if (!verifyResult.isValid) {
        const orderInfo = await findOrderById(verifyResult.orderId);
        const items = orderInfo ? await getOrderItems(orderInfo.MaDonHang) : [];
        return res.status(400).json({
          success: false,
          isSuccess: false,
          message: 'Chữ ký MoMo không hợp lệ (Signature verification failed)',
          data: {
            gateway: 'MoMo',
            orderId: verifyResult.orderId,
            resultCode: verifyResult.resultCode,
            amount: verifyResult.amount,
            order: orderInfo,
            items
          }
        });
      }

      // 3.2 Kiểm tra resultCode (resultCode === 0)
      if (!verifyResult.isSuccess) {
        const orderInfo = await findOrderById(verifyResult.orderId);
        const items = orderInfo ? await getOrderItems(orderInfo.MaDonHang) : [];
        return res.status(200).json({
          success: false,
          isSuccess: false,
          message: verifyResult.message || 'Giao dịch MoMo không thành công hoặc khách hàng đã hủy',
          data: {
            gateway: 'MoMo',
            orderId: verifyResult.orderId,
            resultCode: verifyResult.resultCode,
            amount: verifyResult.amount || (orderInfo ? Number(orderInfo.TongTien) : 0),
            transId: verifyResult.transId,
            transactionNo: verifyResult.transId,
            payType: verifyResult.payType,
            order: orderInfo,
            items
          }
        });
      }

      // 3.3 Thành công: Cập nhật donhang thành "Đang xử lý", lưu thanhtoan & lichsumuahang
      const processResult = await processSuccessfulPayment({
        orderId: verifyResult.orderId,
        amount: verifyResult.amount,
        paymentMethodId: 3, // MoMo
        transactionNo: verifyResult.transId
      });

      // Lấy danh sách sản phẩm của đơn hàng
      const items = await getOrderItems(processResult.order.MaDonHang);

      // LÚC NÀY MỚI GỌI HÀM sendInvoiceEmail(orderId) để gửi mail hóa đơn cho khách hàng
      sendInvoiceEmail(processResult.order.MaDonHang).catch((mailErr) => {
        console.error(`[sendInvoiceEmail] Lỗi gửi email hóa đơn sau thanh toán MoMo đơn hàng #${processResult.order.MaDonHang}:`, mailErr.message);
      });

      return res.status(200).json({
        success: true,
        isSuccess: true,
        message: 'Xác nhận thanh toán MoMo thành công. Đơn hàng đang được xử lý.',
        data: {
          gateway: 'MoMo',
          orderId: processResult.order.MaDonHang,
          amount: verifyResult.amount || Number(processResult.order.TongTien),
          transactionNo: verifyResult.transId || null,
          payType: verifyResult.payType || null,
          orderStatus: 'Đang xử lý',
          paymentMethod: 'MoMo',
          paymentStatus: 'Thành công',
          paymentId: processResult.maThanhToan,
          isNewRecord: processResult.isNewRecord,
          order: processResult.order,
          items
        }
      });
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
 * Xử lý dữ liệu trả về khi khách hàng hoàn tất hoặc hủy thanh toán VNPay
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
 * 6. GET /api/v1/payment/momo-return
 * Xử lý dữ liệu chuyển hướng trả về từ MoMo
 */
const handleMomoReturn = async (req, res, next) => {
  return verifyPayment(req, res, next);
};

/**
 * 7. POST /api/v1/payment/momo-ipn
 * Webhook Server-to-Server từ MoMo
 */
const handleMomoIpn = async (req, res, next) => {
  try {
    const verifyResult = verifyMomoSignature(req.body);

    if (!verifyResult.isValid) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    if (verifyResult.isSuccess && verifyResult.orderId) {
      const processResult = await processSuccessfulPayment({
        orderId: verifyResult.orderId,
        amount: verifyResult.amount,
        paymentMethodId: 3, // MoMo
        transactionNo: verifyResult.transId
      });
      if (processResult.isNewRecord) {
        sendInvoiceEmail(processResult.order.MaDonHang).catch((err) =>
          console.error(`[sendInvoiceEmail MoMo IPN] Lỗi:`, err.message)
        );
      }
    }

    // MoMo yêu cầu phản hồi HTTP 204 No Content khi nhận IPN thành công
    return res.status(204).send();
  } catch (error) {
    console.error('Lỗi xử lý momo-ipn:', error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createVnpayPayment,
  createMomoPayment,
  verifyPayment,
  handleVnpayReturn,
  handleVnpayIpn,
  handleMomoReturn,
  handleMomoIpn
};

