const rateLimit = require('express-rate-limit');

/**
 * Middleware giới hạn tần suất request đăng nhập (chống Brute-force)
 * Cấu hình: Tối đa 5 request thử đăng nhập / 1 phút / 1 IP
 */
const rateLimitMiddleware = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút (60.000 ms)
  max: 5, // Tối đa 5 request thử đăng nhập
  limit: 5, // Hỗ trợ express-rate-limit phiên bản mới
  standardHeaders: true, // Trả về thông tin giới hạn trong header RateLimit-*
  legacyHeaders: false, // Tắt header X-RateLimit-* cũ
  message: {
    success: false,
    message: 'Bạn đã thử đăng nhập quá nhiều lần (tối đa 5 lần/phút). Vui lòng thử lại sau 1 phút!'
  },
  handler: (req, res, next, options) => {
    return res.status(options.statusCode || 429).json(options.message);
  }
});

module.exports = rateLimitMiddleware;
module.exports.rateLimitMiddleware = rateLimitMiddleware;
module.exports.loginLimiter = rateLimitMiddleware;

