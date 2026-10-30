/**
 * Payment Utility Module for VNPay & MoMo Payment Gateways
 * Supports HMAC-SHA512 (VNPay) and HMAC-SHA256 (MoMo) signature generation.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();
const crypto = require('crypto');
const qs = require('qs');
const axios = require('axios');

/**
 * Helper sắp xếp các thuộc tính của object theo thứ tự bảng chữ cái (A-Z)
 * và encode chuẩn theo yêu cầu của VNPay
 * @param {Object} obj 
 * @returns {Object} sorted object
 */
function sortObject(obj) {
  const sorted = {};
  const str = [];
  let key;

  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }

  str.sort();

  for (key = 0; key < str.length; key++) {
    const originalKey = decodeURIComponent(str[key]);
    const value = obj[originalKey];
    if (value !== undefined && value !== null && value !== '') {
      sorted[str[key]] = encodeURIComponent(String(value)).replace(/%20/g, '+');
    }
  }

  return sorted;
}

/**
 * Format date sang dạng yyyyMMddHHmmss theo múi giờ Việt Nam (GMT+7)
 * @param {Date} [date=new Date()]
 * @returns {string} yyyyMMddHHmmss
 */
function formatVnpayDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type) => parts.find((p) => p.type === type)?.value || '00';

  return `${getPart('year')}${getPart('month')}${getPart('day')}${getPart('hour')}${getPart('minute')}${getPart('second')}`;
}

/**
 * Trích xuất địa chỉ IP người dùng chuẩn IPv4 từ request hoặc orderData
 * @param {Object} [req]
 * @returns {string}
 */
function extractIpAddr(req) {
  if (!req) return '127.0.0.1';

  let ip =
    req.headers?.['x-forwarded-for'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1';

  if (typeof ip === 'string') {
    if (ip.includes(',')) ip = ip.split(',')[0].trim();
    if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';
  } else {
    ip = '127.0.0.1';
  }

  return ip;
}

/**
 * 1. TẠO URL THANH TOÁN VNPAY (HMAC-SHA512)
 * 
 * @param {Object} orderData Thông tin đơn hàng
 * @param {string|number} orderData.orderId - Mã đơn hàng (hoặc order_id, MaDonHang, txnRef)
 * @param {number} orderData.amount - Số tiền (VND, số nguyên)
 * @param {string} [orderData.orderInfo] - Mô tả đơn hàng
 * @param {string} [orderData.bankCode] - Mã ngân hàng (VNPAYQR, VNBANK, INTCARD, v.v., tùy chọn)
 * @param {string} [orderData.locale='vn'] - Ngôn ngữ hiển thị (vn | en)
 * @param {string} [orderData.ipAddr] - IP khách hàng (nếu không có sẽ lấy từ req hoặc mặc định 127.0.0.1)
 * @param {Object} [orderData.req] - Express request object để tự động lấy IP
 * @param {string} [orderData.returnUrl] - URL trả về sau thanh toán (mặc định lấy từ process.env.VNP_RETURNURL)
 * @returns {string} paymentUrl - Đường dẫn chuyển hướng người dùng đến cổng VNPay
 */
function createVnpayUrl(orderData = {}) {
  const tmnCode = process.env.VNP_TMNCODE;
  const secretKey = process.env.VNP_HASHSECRET;
  const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = orderData.returnUrl || process.env.VNP_RETURNURL;

  if (!tmnCode || !secretKey) {
    throw new Error('Thiếu cấu hình VNP_TMNCODE hoặc VNP_HASHSECRET trong biến môi trường');
  }

  // Chuẩn hóa mã đơn hàng & số tiền
  const orderId = String(
    orderData.orderId ||
    orderData.order_id ||
    orderData.MaDonHang ||
    orderData.txnRef ||
    Date.now()
  );

  const rawAmount = Number(
    orderData.amount ??
    orderData.TongTien ??
    orderData.total ??
    orderData.final_total ??
    0
  );

  if (isNaN(rawAmount) || rawAmount <= 0) {
    throw new Error('Số tiền thanh toán VNPay không hợp lệ (phải lớn hơn 0)');
  }

  // VNPay yêu cầu nhân 100 vì đơn vị tiền VND không có phần thập phân
  const vnpAmount = Math.round(rawAmount * 100);

  const orderInfo = String(
    orderData.orderInfo ||
    orderData.orderDescription ||
    orderData.order_desc ||
    `Thanh toan don hang #${orderId}`
  );

  const locale = orderData.locale || orderData.language || 'vn';
  const ipAddr = orderData.ipAddr || extractIpAddr(orderData.req);
  const createDate = formatVnpayDate(orderData.createDate ? new Date(orderData.createDate) : new Date());

  // Tập hợp tham số gửi lên VNPay
  let vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderData.orderType || 'other',
    vnp_Amount: vnpAmount,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate
  };

  // Thêm bankCode nếu có chỉ định cụ thể
  if (orderData.bankCode && String(orderData.bankCode).trim() !== '') {
    vnp_Params['vnp_BankCode'] = String(orderData.bankCode).trim();
  }

  // Sắp xếp các tham số theo bảng chữ cái A-Z và URL encode
  vnp_Params = sortObject(vnp_Params);

  // Tạo chuỗi ký signData
  const signData = qs.stringify(vnp_Params, { encode: false });

  // Băm HMAC-SHA512 với secretKey
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Thêm chữ ký bảo mật vào tham số
  vnp_Params['vnp_SecureHash'] = signed;

  // Tạo URL thanh toán hoàn chỉnh
  const paymentUrl = `${vnpUrl}?${qs.stringify(vnp_Params, { encode: false })}`;

  return paymentUrl;
}

/**
 * Map mã phản hồi VNPay sang thông điệp tiếng Việt dễ hiểu
 * @param {string} responseCode
 * @returns {string}
 */
function getVnpayErrorMessage(responseCode) {
  const codeMap = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09': 'Giao dịch không thành công: Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking.',
    '10': 'Giao dịch không thành công: Khách hàng xác thực thông tin không đúng quá 3 lần.',
    '11': 'Giao dịch không thành công: Đã hết hạn chờ thanh toán.',
    '12': 'Giao dịch không thành công: Thẻ/Tài khoản của khách hàng đang bị khóa.',
    '24': 'Giao dịch không thành công: Khách hàng đã hủy giao dịch.',
    '51': 'Giao dịch không thành công: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
    '65': 'Giao dịch không thành công: Tài khoản của quý khách đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Giao dịch không thành công: Khách hàng nhập sai mật khẩu quá số lần quy định.',
    '99': 'Các lỗi khác (lỗi phát sinh từ ngân hàng hoặc hệ thống VNPay).'
  };
  return codeMap[responseCode] || `Giao dịch không thành công (Mã lỗi VNPay: ${responseCode || 'N/A'})`;
}

/**
 * Map mã phản hồi MoMo sang thông điệp tiếng Việt
 * @param {string|number} resultCode
 * @returns {string}
 */
function getMomoErrorMessage(resultCode) {
  const code = Number(resultCode);
  const codeMap = {
    0: 'Thành công',
    9000: 'Giao dịch đã được xác nhận thành công.',
    1000: 'Giao dịch đã được khởi tạo, chờ người dùng xác nhận.',
    1001: 'Giao dịch thất bại do không đủ số dư.',
    1002: 'Giao dịch bị từ chối do nhà phát hành tài khoản thanh toán.',
    1003: 'Giao dịch bị hủy do người dùng không xác thực trong thời gian quy định.',
    1004: 'Giao dịch thất bại do số tiền vượt quá hạn mức.',
    1005: 'Giao dịch thất bại do URL hoặc mã QR hết hạn.',
    1006: 'Người dùng đã hủy giao dịch.',
    1007: 'Giao dịch bị từ chối do tài khoản người dùng đang bị tạm khóa.',
    41: 'Giao dịch bị từ chối do thông tin thanh toán không hợp lệ.',
    99: 'Lỗi không xác định từ hệ thống MoMo.'
  };
  return codeMap[code] || `Giao dịch MoMo không thành công (Mã lỗi: ${resultCode ?? 'N/A'})`;
}

/**
 * Xác thực chữ ký phản hồi từ VNPay (Return URL hoặc IPN Webhook)
 * @param {Object} vnpParams - req.query hoặc req.body
 * @returns {Object} { isValid: boolean, isSuccess: boolean, orderId: string, amount: number, ... }
 */
function verifyVnpayReturn(vnpParams = {}) {
  const secretKey = process.env.VNP_HASHSECRET;
  if (!secretKey) {
    throw new Error('Thiếu VNP_HASHSECRET trong biến môi trường để xác thực chữ ký');
  }

  const secureHash = vnpParams['vnp_SecureHash'];
  const cloneParams = {};

  // Chỉ lấy các tham số bắt đầu bằng 'vnp_' (loại bỏ vnp_SecureHash & vnp_SecureHashType và các tham số ngoài như gateway, token...)
  for (const key of Object.keys(vnpParams)) {
    if (key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
      cloneParams[key] = vnpParams[key];
    }
  }

  const sortedParams = sortObject(cloneParams);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  const isValid = Boolean(secureHash) && signed.toLowerCase() === String(secureHash).toLowerCase();
  const responseCode = vnpParams['vnp_ResponseCode'];
  const isSuccess = isValid && responseCode === '00';

  return {
    isValid,
    isSuccess,
    orderId: vnpParams['vnp_TxnRef'],
    amount: vnpParams['vnp_Amount'] ? Number(vnpParams['vnp_Amount']) / 100 : 0,
    responseCode,
    transactionNo: vnpParams['vnp_TransactionNo'],
    bankCode: vnpParams['vnp_BankCode'],
    payDate: vnpParams['vnp_PayDate'],
    orderInfo: vnpParams['vnp_OrderInfo'],
    message: getVnpayErrorMessage(responseCode)
  };
}

/**
 * 2. TẠO URL THANH TOÁN MOMO SANDBOX (HMAC-SHA256 & AXIOS.POST)
 * Chuẩn chính thức theo tài liệu MoMo API v2
 * 
 * @param {Object} orderData Thông tin đơn hàng
 * @param {string|number} [orderData.orderId] - Mã đơn hàng từ DB (hoặc order_id, MaDonHang)
 * @param {number|string} [orderData.amount] - Số tiền thanh toán (VND)
 * @param {string} [orderData.orderInfo] - Mô tả đơn hàng (tùy chọn)
 * @param {string} [orderData.extraData] - Dữ liệu kèm theo (tùy chọn)
 * @param {string} [orderData.redirectUrl] - URL redirect sau thanh toán
 * @param {string} [orderData.ipnUrl] - URL Webhook nhận IPN
 * @param {boolean} [orderData.returnFullResponse] - Trả về toàn bộ response object thay vì chỉ payUrl
 * @returns {Promise<string|Object>} payUrl - Link thanh toán MoMo để chuyển hướng
 */
async function createMomoPaymentUrl(orderData = {}) {
  // 1. KIỂM TRA BIẾN MÔI TRƯỜNG BẮT BUỘC (ENV CHECK)
  const requiredEnv = [
    'MOMO_PARTNER_CODE',
    'MOMO_ACCESS_KEY',
    'MOMO_SECRET_KEY',
    'MOMO_REDIRECT_URL',
    'MOMO_IPN_URL',
    'MOMO_ENDPOINT'
  ];

  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  if (missingEnv.length > 0) {
    throw new Error(`Thiếu cấu hình MoMo: ${missingEnv.join(', ')}`);
  }

  const partnerCode = process.env.MOMO_PARTNER_CODE;
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;
  const redirectUrl = orderData.redirectUrl || process.env.MOMO_REDIRECT_URL;
  const ipnUrl = orderData.ipnUrl || process.env.MOMO_IPN_URL;
  const endpoint = process.env.MOMO_ENDPOINT;

  // 2. CẢI TIẾN TẠO MÃ REQUESTID & ORDERID:
  const orderIdFromDb = orderData.orderId || orderData.order_id || orderData.MaDonHang || '';
  const amountFromDb = orderData.amount ?? orderData.TongTien ?? orderData.total ?? orderData.final_total ?? 0;

  const requestId = crypto.randomUUID();
  const orderId = `${orderIdFromDb}_${Date.now()}`;
  const amount = Math.round(Number(amountFromDb)).toString();

  const orderInfo = orderData.orderInfo || `Thanh toan don hang #${orderIdFromDb}`;
  const requestType = 'captureWallet';
  const extraData = orderData.extraData !== undefined ? String(orderData.extraData) : '';

  // Chuỗi tạo chữ ký (raw signature)
  const rawSignature =
    'accessKey=' + accessKey +
    '&amount=' + amount +
    '&extraData=' + extraData +
    '&ipnUrl=' + ipnUrl +
    '&orderId=' + orderId +
    '&orderInfo=' + orderInfo +
    '&partnerCode=' + partnerCode +
    '&redirectUrl=' + redirectUrl +
    '&requestId=' + requestId +
    '&requestType=' + requestType;

  // Tạo signature HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  const requestBody = {
    partnerCode: partnerCode,
    partnerName: 'Test',
    storeId: 'MomoTestStore',
    requestId: requestId,
    amount: amount,
    orderId: orderId,
    orderInfo: orderInfo,
    redirectUrl: redirectUrl,
    ipnUrl: ipnUrl,
    lang: 'vi',
    extraData: extraData,
    requestType: requestType,
    signature: signature
  };

  try {
    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json; charset=UTF-8'
      },
      timeout: 10000
    });

    console.log('[MOMO CREATE PAYMENT RESPONSE]', {
      status: response.status,
      resultCode: response.data?.resultCode,
      message: response.data?.message,
      payUrl: response.data?.payUrl
    });

    if (!response.data || Number(response.data.resultCode) !== 0) {
      const declinedErr = new Error(`MoMo API declined [code ${response.data?.resultCode}]: ${response.data?.message || 'Giao dịch bị từ chối'}`);
      declinedErr.momoResponse = response.data;
      throw declinedErr;
    }

    if (typeof response.data.payUrl !== 'string' || !response.data.payUrl.startsWith('https://test-payment.momo.vn/')) {
      throw new Error('MoMo không trả về payUrl Sandbox hợp lệ');
    }

    return response.data.payUrl;
  } catch (error) {
    if (error.response) {
      const errData = error.response.data;
      const message = `Lỗi từ MoMo API [HTTP ${error.response.status}]: ${errData?.message || JSON.stringify(errData)}`;
      const customErr = new Error(message);
      customErr.response = error.response;
      customErr.momoResponse = errData;
      throw customErr;
    }
    throw error;
  }
}

/**
 * Xác thực chữ ký phản hồi từ MoMo (IPN Webhook hoặc Return URL)
 * @param {Object} momoData - req.body (IPN) hoặc req.query (Redirect)
 * @returns {Object} { isValid: boolean, isSuccess: boolean, orderId: string, amount: number, ... }
 */
function verifyMomoSignature(momoData = {}) {
  const secretKey = process.env.MOMO_SECRET_KEY;
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const partnerCode = process.env.MOMO_PARTNER_CODE;

  const missingEnv = ['MOMO_SECRET_KEY', 'MOMO_ACCESS_KEY', 'MOMO_PARTNER_CODE'].filter(
    (key) => !process.env[key]
  );
  if (missingEnv.length > 0) {
    throw new Error(`Thiếu cấu hình MoMo: ${missingEnv.join(', ')}`);
  }

  // Chuỗi chữ ký trả về của MoMo:
  // accessKey -> amount -> extraData -> message -> orderId -> orderInfo -> orderType -> partnerCode -> payType -> requestId -> responseTime -> resultCode -> transId
  const rawSignature =
    `accessKey=${accessKey}` +
    `&amount=${momoData.amount}` +
    `&extraData=${momoData.extraData || ''}` +
    `&message=${momoData.message || ''}` +
    `&orderId=${momoData.orderId}` +
    `&orderInfo=${momoData.orderInfo}` +
    `&orderType=${momoData.orderType || ''}` +
    `&partnerCode=${partnerCode}` +
    `&payType=${momoData.payType || ''}` +
    `&requestId=${momoData.requestId}` +
    `&responseTime=${momoData.responseTime}` +
    `&resultCode=${momoData.resultCode}` +
    `&transId=${momoData.transId}`;

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  const isValid = Boolean(momoData.signature) && signature.toLowerCase() === String(momoData.signature || '').toLowerCase();
  const isSuccess = isValid && String(momoData.resultCode) === '0';

  return {
    isValid,
    isSuccess,
    orderId: momoData.orderId,
    amount: Number(momoData.amount) || 0,
    resultCode: momoData.resultCode,
    message: momoData.message || getMomoErrorMessage(momoData.resultCode),
    transId: momoData.transId,
    payType: momoData.payType
  };
}

module.exports = {
  createVnpayUrl,
  verifyVnpayReturn,
  createMomoPaymentUrl,
  verifyMomoSignature,
  getVnpayErrorMessage,
  getMomoErrorMessage,
  sortObject,
  formatVnpayDate
};

