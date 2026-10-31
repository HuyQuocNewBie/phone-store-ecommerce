const axios = require('axios');

/**
 * Middleware xác thực Google reCAPTCHA (chống Bot)
 * - Đọc recaptchaToken từ req.body
 * - Gửi yêu cầu xác minh tới Google API: POST https://www.google.com/recaptcha/api/siteverify
 * - Kiểm tra nếu success === false hoặc score < 0.5 -> Trả về HTTP 403: { message: "Phát hiện hành vi bất thường từ Bot!" }
 */
const recaptchaMiddleware = async (req, res, next) => {
  try {
    const recaptchaToken = req.body?.recaptchaToken;

    // Nếu không có token -> Chặn hành vi bất thường từ bot
    if (!recaptchaToken) {
      return res.status(403).json({
        success: false,
        message: 'Phát hiện hành vi bất thường từ Bot!'
      });
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error('Lỗi: Chưa cấu hình RECAPTCHA_SECRET_KEY trong biến môi trường');
      return res.status(500).json({
        success: false,
        message: 'Hệ thống chưa cấu hình reCAPTCHA'
      });
    }

    // Gọi Google reCAPTCHA siteverify API
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: secretKey,
          response: recaptchaToken,
          remoteip: req.ip
        }
      }
    );

    const { success, score } = response.data || {};

    // Kiểm tra nếu success === false hoặc score < 0.5 (đối với reCAPTCHA v3)
    if (!success || (typeof score === 'number' && score < 0.5)) {
      return res.status(403).json({
        success: false,
        message: 'Phát hiện hành vi bất thường từ Bot!'
      });
    }

    // Lưu thông tin kết quả recaptcha vào req
    req.recaptcha = response.data;

    return next();
  } catch (error) {
    console.error('Lỗi xác thực reCAPTCHA:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực reCAPTCHA với máy chủ'
    });
  }
};

module.exports = recaptchaMiddleware;
module.exports.recaptchaMiddleware = recaptchaMiddleware;

