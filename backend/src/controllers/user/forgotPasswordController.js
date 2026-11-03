const crypto = require('crypto');
const { pool } = require('../../../config/db');
const {
  checkCooldown,
  setOtp,
  getOtp,
  deleteOtp,
  incrementAttempts,
  setResetToken,
  hashOtp,
  normalizeEmail
} = require('../../utils/otpStoreUtil');
const { sendOtpEmail } = require('../../utils/mailer');

/**
 * Kiểm tra định dạng Email hợp lệ
 * @param {string} email
 * @returns {boolean}
 */
const isEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Controller tiếp nhận yêu cầu Quên mật khẩu và gửi mã OTP:
 * - Validate định dạng email (isEmail).
 * - Query MySQL bảng nguoidung: Nếu không tìm thấy Email -> Trả về HTTP 404: "Email không tồn tại trên hệ thống".
 * - Gọi checkCooldown(email): Nếu chưa qua 60s kể từ lần gửi trước -> Trả về HTTP 429: "Vui lòng đợi [X] giây trước khi xin mã mới".
 * - Sinh OTP 6 số ngẫu nhiên (crypto.randomInt(100000, 1000000)).
 * - Lưu OTP vào otpStoreUtil (TTL 5 phút) và đặt Cooldown 60s.
 * - Gọi sendOtpEmail gửi mail về cho người dùng.
 * 
 * @route POST /api/v1/auth/forgot-password/send-otp
 */
const sendOtp = async (req, res, next) => {
  try {
    const rawEmail = req.body?.email || req.body?.Email;

    // 1. Validate định dạng email
    if (!rawEmail || !isEmail(rawEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Email không đúng định dạng hoặc không hợp lệ'
      });
    }

    const email = normalizeEmail(rawEmail);

    // 2. Query MySQL bảng nguoidung: Nếu không tìm thấy Email -> Trả về HTTP 404
    const [users] = await pool.query(
      'SELECT MaNguoiDung, Email, TaiKhoan FROM nguoidung WHERE LOWER(Email) = LOWER(?) LIMIT 1',
      [email]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email không tồn tại trên hệ thống'
      });
    }

    // 3. Gọi checkCooldown(email): Nếu chưa qua 60s kể từ lần gửi trước -> Trả về HTTP 429
    const remainingSeconds = await checkCooldown(email, 60);
    if (remainingSeconds > 0) {
      return res.status(429).json({
        success: false,
        message: `Vui lòng đợi ${remainingSeconds} giây trước khi xin mã mới`,
        remainingSeconds
      });
    }

    // 4. Sinh OTP 6 số ngẫu nhiên (100000 đến 999999)
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // 5. Lưu OTP vào otpStoreUtil (TTL 5 phút = 300s) và đặt Cooldown 60s
    await setOtp(email, otpCode, 300, 60);

    // 6. Gọi sendOtpEmail gửi mail về cho người dùng
    await sendOtpEmail(email, otpCode, 'forgot_password');

    // 7. Trả về phản hồi thành công
    return res.status(200).json({
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư trong 5 phút.',
      data: {
        email,
        cooldown: 60,
        expiresIn: 300
      }
    });
  } catch (error) {
    console.error('[sendOtp] Lỗi xử lý gửi OTP quên mật khẩu:', error);
    next(error);
  }
};

/**
 * Controller xác thực mã OTP 2 lớp cấp phép cho bước đổi mật khẩu:
 * - Bắt buộc nhận email và otp (chuỗi 6 chữ số).
 * - Kiểm tra tồn tại OTP trong otpStoreUtil: Nếu không có -> HTTP 400: "Mã OTP đã hết hạn hoặc không hợp lệ".
 * - Kiểm tra số lần thử sai (incrementAttempts): Nếu quá 5 lần -> Hủy OTP và trả về HTTP 429: "Bạn đã nhập sai quá 5 lần. Vui lòng xin mã mới!".
 * - So sánh mã OTP. NẾU ĐÚNG:
 *   - Xóa OTP khỏi store.
 *   - Sinh mã resetToken duy nhất (crypto.randomBytes(32).toString('hex')).
 *   - Lưu resetToken ứng với email vào store (TTL 10 phút = 600s).
 *   - Trả về JSON: { success: true, resetToken, message: "Xác thực OTP thành công!" }.
 * 
 * @route POST /api/v1/auth/forgot-password/verify-otp
 */
const verifyOtp = async (req, res, next) => {
  try {
    const rawEmail = req.body?.email || req.body?.Email;
    const rawOtp = req.body?.otp || req.body?.otp_code || req.body?.Otp;

    // 1. Bắt buộc nhận email và otp (chuỗi 6 chữ số)
    if (!rawEmail || !rawOtp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email và mã OTP'
      });
    }

    if (!isEmail(rawEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Email không đúng định dạng hoặc không hợp lệ'
      });
    }

    const otp = String(rawOtp).trim();
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không hợp lệ, vui lòng cung cấp chuỗi 6 chữ số'
      });
    }

    const email = normalizeEmail(rawEmail);

    // 2. Kiểm tra tồn tại OTP trong otpStoreUtil: Nếu không có -> HTTP 400: "Mã OTP đã hết hạn hoặc không hợp lệ"
    const otpData = await getOtp(email);
    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn hoặc không hợp lệ'
      });
    }

    // Kiểm tra số lần thử sai trước đó: Nếu đã vượt quá giới hạn (>= 5 lần) -> Hủy OTP và trả về HTTP 429
    if ((otpData.attempts || 0) >= 5) {
      await deleteOtp(email);
      return res.status(429).json({
        success: false,
        message: 'Bạn đã nhập sai quá 5 lần. Vui lòng xin mã mới!'
      });
    }

    // 3. So sánh mã OTP bằng mã hóa HMAC-SHA256 & timingSafeEqual
    const inputHashed = hashOtp(otp);
    const bufA = Buffer.from(inputHashed, 'hex');
    const bufB = Buffer.from(otpData.hashedOtp, 'hex');
    const isMatch = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

    if (!isMatch) {
      // Tăng số lần thử sai qua incrementAttempts
      const attemptResult = await incrementAttempts(email);

      // Nếu quá 5 lần -> Hủy OTP và trả về HTTP 429: "Bạn đã nhập sai quá 5 lần. Vui lòng xin mã mới!"
      if (attemptResult.locked || attemptResult.attempts > 5) {
        await deleteOtp(email);
        return res.status(429).json({
          success: false,
          message: 'Bạn đã nhập sai quá 5 lần. Vui lòng xin mã mới!'
        });
      }

      return res.status(400).json({
        success: false,
        message: attemptResult.message || `Mã OTP không chính xác. Bạn còn ${attemptResult.remainingAttempts} lần thử.`,
        remainingAttempts: attemptResult.remainingAttempts
      });
    }

    // 4. So sánh mã OTP. NẾU ĐÚNG:
    // - Xóa OTP khỏi store
    await deleteOtp(email);

    // - Sinh mã resetToken duy nhất (crypto.randomBytes(32).toString('hex'))
    const resetToken = crypto.randomBytes(32).toString('hex');

    // - Lưu resetToken ứng với email vào store (TTL 10 phút = 600s)
    await setResetToken(resetToken, email, 600);

    // - Trả về JSON: { success: true, resetToken, message: "Xác thực OTP thành công!" }
    return res.status(200).json({
      success: true,
      resetToken,
      message: 'Xác thực OTP thành công!'
    });
  } catch (error) {
    console.error('[verifyOtp] Lỗi xử lý xác thực OTP quên mật khẩu:', error);
    next(error);
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  isEmail
};

