/**
 * Payment Utility Module for VNPay & ZaloPay Payment Gateways
 * Supports HMAC-SHA512 (VNPay) and HMAC-SHA256 (ZaloPay) signature generation.
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
 * 2. TẠO LINK THANH TOÁN ZALOPAY SANDBOX (HMAC-SHA256 & AXIOS.POST)
 * Chuẩn API v2 ZaloPay Create Order (https://sb-openapi.zalopay.vn/v2/create)
 * 
 * @param {Object} orderData Thông tin đơn hàng
 * @param {string|number} orderData.orderId - Mã đơn hàng (hoặc order_id, MaDonHang, txnRef)
 * @param {number|string} orderData.amount - Số tiền thanh toán (VND, số nguyên)
 * @param {string} [orderData.app_user] - Định danh người dùng thanh toán (hoặc appUser, userId)
 * @param {string} [orderData.orderInfo] - Mô tả đơn hàng (hoặc description)
 * @param {Array|string} [orderData.item] - Mảng sản phẩm hoặc chuỗi JSON mảng sản phẩm (hoặc items)
 * @param {Object|string} [orderData.embed_data] - Dữ liệu kèm theo hoặc chuỗi JSON (hoặc embedData)
 * @param {string} [orderData.bankCode] - Mã ngân hàng hoặc phương thức (tùy chọn)
 * @param {string} [orderData.redirectUrl] - URL chuyển hướng sau thanh toán
 * @returns {Promise<string>} order_url - URL thanh toán ZaloPay để chuyển hướng người dùng
 */
async function createZalopayPaymentUrl(orderData = {}) {
  const endpoint = process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/create';
  const appId = process.env.ZALOPAY_APP_ID;
  const key1 = process.env.ZALOPAY_KEY1;
  const redirectUrl = orderData.redirectUrl || process.env.ZALOPAY_REDIRECT_URL;

  if (!appId || !key1) {
    throw new Error('Thiếu cấu hình ZALOPAY_APP_ID hoặc ZALOPAY_KEY1 trong biến môi trường');
  }

  // 1. Chuẩn hóa mã đơn hàng & số tiền
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
    throw new Error('Số tiền thanh toán ZaloPay không hợp lệ (phải lớn hơn 0)');
  }

  const amount = Math.round(rawAmount);

  // 2. app_trans_id: Phải bắt đầu bằng YYMMDD của ngày hiện tại kèm mã đơn hàng
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const getPart = (type) => parts.find((p) => p.type === type)?.value || '';
  const transDate = `${getPart('year')}${getPart('month')}${getPart('day')}`;
  const app_trans_id = `${transDate}_${orderId}_${Date.now()}`;

  // 3. app_time & app_user
  const app_time = Date.now();
  const app_id = Number(appId);
  const app_user = String(
    orderData.app_user ||
    orderData.appUser ||
    orderData.userId ||
    orderData.MaNguoiDung ||
    'User'
  );

  // 4. embed_data: JSON string chứa redirecturl: process.env.ZALOPAY_REDIRECT_URL
  let embedDataObj = { redirecturl: redirectUrl };
  if (orderData.embed_data) {
    if (typeof orderData.embed_data === 'object') {
      embedDataObj = { ...embedDataObj, ...orderData.embed_data };
    } else if (typeof orderData.embed_data === 'string') {
      try {
        const parsed = JSON.parse(orderData.embed_data);
        embedDataObj = { ...embedDataObj, ...parsed };
      } catch (e) {
        // keep default
      }
    }
  } else if (orderData.embedData && typeof orderData.embedData === 'object') {
    embedDataObj = { ...embedDataObj, ...orderData.embedData };
  }
  const embed_data = JSON.stringify(embedDataObj);

  // 5. item: JSON string đại diện cho mảng sản phẩm trong đơn hàng
  let item = '[]';
  const rawItems = orderData.item || orderData.items;
  if (Array.isArray(rawItems)) {
    item = JSON.stringify(rawItems);
  } else if (typeof rawItems === 'string' && rawItems.trim() !== '') {
    item = rawItems;
  } else {
    item = JSON.stringify([]);
  }

  // 6. Chuỗi Data băm MAC: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
  const dataMac = `${app_id}|${app_trans_id}|${app_user}|${amount}|${app_time}|${embed_data}|${item}`;

  // 7. Băm MAC: Dùng crypto.createHmac('sha256', process.env.ZALOPAY_KEY1).update(dataMac).digest('hex')
  const mac = crypto
    .createHmac('sha256', key1)
    .update(dataMac)
    .digest('hex');

  const description = String(
    orderData.description ||
    orderData.orderInfo ||
    `Thanh toán đơn hàng #${orderId}`
  );

  const payload = {
    app_id,
    app_user,
    app_trans_id,
    app_time,
    amount,
    item,
    description,
    embed_data,
    bank_code: orderData.bankCode || orderData.bank_code || '',
    mac
  };

  try {
    const response = await axios.post(endpoint, null, {
      params: payload,
      timeout: 15000
    });

    console.log('[ZALOPAY CREATE PAYMENT RESPONSE]', {
      return_code: response.data?.return_code,
      return_message: response.data?.return_message,
      sub_return_code: response.data?.sub_return_code,
      sub_return_message: response.data?.sub_return_message,
      order_url: response.data?.order_url
    });

    if (!response.data || response.data.return_code !== 1) {
      const errorMsg =
        response.data?.sub_return_message ||
        response.data?.return_message ||
        'Khởi tạo đơn hàng ZaloPay thất bại';
      const declinedErr = new Error(`ZaloPay API declined [code ${response.data?.return_code} / ${response.data?.sub_return_code}]: ${errorMsg}`);
      declinedErr.zalopayResponse = response.data;
      throw declinedErr;
    }

    const orderUrl = response.data?.order_url || response.data?.orderurl;
    if (!orderUrl) {
      throw new Error('ZaloPay không trả về order_url hợp lệ');
    }

    return orderUrl;
  } catch (error) {
    if (error.response) {
      const errData = error.response.data;
      const message = `Lỗi từ ZaloPay API [HTTP ${error.response.status}]: ${errData?.return_message || errData?.message || JSON.stringify(errData)}`;
      const customErr = new Error(message);
      customErr.response = error.response;
      customErr.zalopayResponse = errData;
      throw customErr;
    }
    throw error;
  }
}

module.exports = {
  createVnpayUrl,
  verifyVnpayReturn,
  createZalopayPaymentUrl,
  getVnpayErrorMessage,
  sortObject,
  formatVnpayDate
};

