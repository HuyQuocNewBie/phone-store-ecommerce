const {
  createVnpayUrl,
  verifyVnpayReturn,
  createMomoPaymentUrl,
  verifyMomoSignature
} = require('../../utils/paymentUtil');
const { pool } = require('../../../config/db');

/**
 * Helper: Tìm thông tin đơn hàng từ DB nếu cần bổ sung hoặc xác thực
 * @param {string|number} orderId 
 * @returns {Promise<Object|null>}
 */
const findOrderById = async (orderId) => {
  try {
    const [rows] = await pool.query(
      `SELECT MaDonHang, TongTien, TrangThaiDonHang, TenNguoiNhan, SoDienThoai
       FROM donhang
       WHERE MaDonHang = ?
       LIMIT 1`,
      [orderId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error(`Lỗi truy vấn đơn hàng #${orderId}:`, err.message);
    return null;
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
      url: paymentUrl,
      data: {
        paymentUrl,
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
      data: {
        payUrl,
        orderId,
        amount: finalAmount
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
 * 3. GET /api/v1/payment/vnpay-return
 * Xử lý dữ liệu trả về khi khách hàng hoàn tất hoặc hủy thanh toán VNPay
 */
const handleVnpayReturn = async (req, res, next) => {
  try {
    const verifyResult = verifyVnpayReturn(req.query);

    if (!verifyResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Chữ ký VNPay không hợp lệ (Checksum failed)',
        data: verifyResult
      });
    }

    // Nếu thanh toán thành công, có thể cập nhật trạng thái đơn hàng
    if (verifyResult.isSuccess && verifyResult.orderId) {
      try {
        await pool.query(
          `UPDATE donhang 
           SET TrangThaiDonHang = 'Đã xác nhận' 
           WHERE MaDonHang = ? AND TrangThaiDonHang = 'Chờ xác nhận'`,
          [verifyResult.orderId]
        );
      } catch (dbErr) {
        console.error('Lỗi cập nhật trạng thái đơn hàng sau thanh toán VNPay:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: verifyResult.isSuccess,
      message: verifyResult.isSuccess ? 'Giao dịch VNPay thành công' : 'Giao dịch VNPay không thành công hoặc bị hủy',
      data: verifyResult
    });
  } catch (error) {
    console.error('Lỗi xử lý vnpay-return:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi xử lý kết quả VNPay'
    });
  }
};

/**
 * 4. GET /api/v1/payment/vnpay-ipn
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
      await pool.query(
        `UPDATE donhang 
         SET TrangThaiDonHang = 'Đã xác nhận' 
         WHERE MaDonHang = ?`,
        [verifyResult.orderId]
      );
    }

    return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (error) {
    console.error('Lỗi xử lý vnpay-ipn:', error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

/**
 * 5. GET /api/v1/payment/momo-return
 * Xử lý dữ liệu chuyển hướng trả về từ MoMo
 */
const handleMomoReturn = async (req, res, next) => {
  try {
    const verifyResult = verifyMomoSignature(req.query);

    return res.status(200).json({
      success: verifyResult.isSuccess,
      message: verifyResult.isSuccess ? 'Giao dịch MoMo thành công' : 'Giao dịch MoMo không thành công',
      data: verifyResult
    });
  } catch (error) {
    console.error('Lỗi xử lý momo-return:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi xử lý kết quả MoMo'
    });
  }
};

/**
 * 6. POST /api/v1/payment/momo-ipn
 * Webhook Server-to-Server từ MoMo
 */
const handleMomoIpn = async (req, res, next) => {
  try {
    const verifyResult = verifyMomoSignature(req.body);

    if (!verifyResult.isValid) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    if (verifyResult.isSuccess && verifyResult.orderId) {
      await pool.query(
        `UPDATE donhang 
         SET TrangThaiDonHang = 'Đã xác nhận' 
         WHERE MaDonHang = ?`,
        [verifyResult.orderId]
      );
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
  handleVnpayReturn,
  handleVnpayIpn,
  handleMomoReturn,
  handleMomoIpn
};

