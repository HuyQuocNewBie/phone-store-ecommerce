const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../../config/db');
const redis = require('../../config/redis');
const { sendOtpEmail } = require('../../utils/mailer');

/**
 * Helper tìm MaVaiTro của Customer linh hoạt
 */
const getCustomerRoleId = async () => {
  try {
    const [rows] = await pool.query(
      `SELECT MaVaiTro FROM vaitro WHERE LOWER(TenVaiTro) = 'customer' OR LOWER(TenVaiTro) = 'khách hàng' LIMIT 1`
    );
    if (rows.length > 0) {
      return rows[0].MaVaiTro;
    }
    // Mặc định fallback là 2 nếu DB chưa seeding tên cụ thể
    return 2;
  } catch (error) {
    console.error('Error fetching Customer role:', error.message);
    return 2;
  }
};

/**
 * 1. POST /api/v1/auth/register
 * Nhận TaiKhoan, Email, MatKhau.
 * Kiểm tra trùng lặp CSDL -> Hash mật khẩu -> Sinh OTP 5 chữ số -> Lưu Redis (TTL 300s) -> Gửi Mail
 */
const register = async (req, res, next) => {
  try {
    const { TaiKhoan, Email, MatKhau } = req.body;

    // Validate dữ liệu đầu vào
    if (!TaiKhoan || !Email || !MatKhau) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tài khoản, email và mật khẩu'
      });
    }

    const trimmedTaiKhoan = String(TaiKhoan).trim();
    const trimmedEmail = String(Email).trim().toLowerCase();

    // Kiểm tra định dạng Email
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Email không đúng định dạng'
      });
    }

    // 1. Kiểm tra trùng lặp TaiKhoan hoặc Email trong CSDL nguoidung từ màn Register
    const [existingUsers] = await pool.query(
      `SELECT MaNguoiDung, TaiKhoan, Email FROM nguoidung WHERE LOWER(TaiKhoan) = LOWER(?) OR LOWER(Email) = LOWER(?)`,
      [trimmedTaiKhoan, trimmedEmail]
    );

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.TaiKhoan.toLowerCase() === trimmedTaiKhoan.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản đã tồn tại trên hệ thống'
        });
      }
      if (existing.Email.toLowerCase() === trimmedEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được đăng ký trên hệ thống'
        });
      }
    }

    // 2. Hash mật khẩu bằng bcryptjs trước khi lưu vào Redis
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(MatKhau, salt);

    // 3. Sinh mã OTP 5 chữ số ngẫu nhiên (từ 10000 đến 99999)
    const otpCode = Math.floor(10000 + Math.random() * 90000).toString();

    // 4. Lưu dữ liệu đăng ký + OTP vào Redis key otp:{email} với TTL = 300s (5 phút)
    const redisKey = `otp:${trimmedEmail}`;
    const redisData = JSON.stringify({
      otp_code: otpCode,
      TaiKhoan: trimmedTaiKhoan,
      Email: trimmedEmail,
      MatKhau: hashedPassword,
      type: 'register'
    });

    await redis.setex(redisKey, 300, redisData);

    // 5. Gửi mã OTP qua Nodemailer
    await sendOtpEmail(trimmedEmail, otpCode, 'register');

    return res.status(200).json({
      success: true,
      message: 'Mã OTP xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra và xác nhận trong 5 phút.',
      data: {
        Email: trimmedEmail
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/v1/auth/verify-otp
 * Nhận Email và otp_code. So sánh với Redis:
 * - Khớp: Xóa key khỏi Redis, tạo người dùng trong bảng nguoidung (MaVaiTro = Customer), trả về JWT token.
 * - Không khớp/Hết hạn: Trả về lỗi 400.
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { Email, otp_code, otp } = req.body;
    const inputOtp = String(otp_code || otp || '').trim();

    if (!Email || !inputOtp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Email và mã OTP'
      });
    }

    const trimmedEmail = String(Email).trim().toLowerCase();
    const redisKey = `otp:${trimmedEmail}`;

    // Lấy thông tin lưu trữ từ Redis
    const cachedData = await redis.get(redisKey);

    if (!cachedData) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không hợp lệ hoặc đã hết hạn'
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(cachedData);
    } catch (e) {
      parsedData = { otp_code: cachedData };
    }

    // So sánh mã OTP từ client và Redis
    const storedOtp = String(parsedData.otp_code || parsedData.otp || '').trim();

    if (storedOtp !== inputOtp) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không chính xác hoặc đã hết hạn'
      });
    }

    // Xóa key khỏi Redis sau khi xác thực thành công
    await redis.del(redisKey);

    // Nếu là luồng đăng ký tài khoản (có chứa thông tin đăng ký)
    if (parsedData.type === 'register' || (parsedData.TaiKhoan && parsedData.MatKhau)) {
      // Kiểm tra lại lần nữa phòng trường hợp race condition
      const [existingUsers] = await pool.query(
        `SELECT MaNguoiDung FROM nguoidung WHERE LOWER(TaiKhoan) = LOWER(?) OR LOWER(Email) = LOWER(?)`,
        [parsedData.TaiKhoan, parsedData.Email]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản hoặc Email này đã được tạo trước đó'
        });
      }

      // Tra cứu MaVaiTro linh hoạt cho Customer
      const customerRoleId = await getCustomerRoleId();

      // Ghi trực tiếp mật khẩu đã hash vào MySQL
      const [result] = await pool.query(
        `INSERT INTO nguoidung (TaiKhoan, Email, MatKhau, MaVaiTro) VALUES (?, ?, ?, ?)`,
        [parsedData.TaiKhoan, parsedData.Email, parsedData.MatKhau, customerRoleId]
      );

      const newUserId = result.insertId;

      // Token payload
      const payload = {
        MaNguoiDung: newUserId,
        MaVaiTro: customerRoleId,
        TaiKhoan: parsedData.TaiKhoan
      };

      // Tạo Access Token & Refresh Token
      const accessToken = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      );

      const refreshToken = jwt.sign(
        payload,
        process.env.JWT_REFRESH_SECRET || 'refresh_secret_key',
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Xác thực OTP thành công. Tài khoản đã được tạo thành công!',
        data: {
          token: accessToken,
          accessToken,
          refreshToken,
          user: {
            MaNguoiDung: newUserId,
            TaiKhoan: parsedData.TaiKhoan,
            Email: parsedData.Email,
            MaVaiTro: customerRoleId
          }
        }
      });
    }

    // Trường hợp verify-otp dành cho Quên mật khẩu hoặc các mục đích khác
    return res.status(200).json({
      success: true,
      message: 'Xác thực mã OTP thành công'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. POST /api/v1/auth/login
 * Kiểm tra đăng nhập (TaiKhoan/Email + MatKhau)
 */
const login = async (req, res, next) => {
  try {
    const { TaiKhoan, Email, MatKhau } = req.body;
    const loginIdentifier = String(TaiKhoan || Email || '').trim();

    if (!loginIdentifier || !MatKhau) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tài khoản/email và mật khẩu'
      });
    }

    // Query tìm người dùng theo TaiKhoan = ? OR Email = ?
    const [rows] = await pool.query(
      'SELECT * FROM nguoidung WHERE LOWER(TaiKhoan) = LOWER(?) OR LOWER(Email) = LOWER(?)',
      [loginIdentifier, loginIdentifier]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác'
      });
    }

    const user = rows[0];

    // So sánh mật khẩu bằng bcrypt.compare
    const isMatch = await bcrypt.compare(MatKhau, user.MatKhau);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác'
      });
    }

    // Token payload
    const payload = {
      MaNguoiDung: user.MaNguoiDung,
      MaVaiTro: user.MaVaiTro,
      TaiKhoan: user.TaiKhoan
    };

    // Tạo Access Token & Refresh Token
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'refresh_secret_key',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Bỏ trường MatKhau trước khi trả về client
    const { MatKhau: _, ...userInfo } = user;

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: userInfo,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. POST /api/v1/auth/forgot-password
 * Kiểm tra Email, gửi mã OTP 5 chữ số vào Redis (TTL 5 phút) + Mail.
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { Email } = req.body;

    if (!Email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Email'
      });
    }

    const trimmedEmail = String(Email).trim().toLowerCase();

    // 1. Kiểm tra Email xem có tồn tại trong CSDL nguoidung không
    const [rows] = await pool.query(
      `SELECT MaNguoiDung, Email, TaiKhoan FROM nguoidung WHERE LOWER(Email) = LOWER(?)`,
      [trimmedEmail]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Email không tồn tại trong hệ thống'
      });
    }

    // 2. Sinh mã OTP 5 chữ số ngẫu nhiên
    const otpCode = Math.floor(10000 + Math.random() * 90000).toString();

    // 3. Lưu vào Redis key otp:{email} với TTL = 300s (5 phút)
    const redisKey = `otp:${trimmedEmail}`;
    const redisData = JSON.stringify({
      otp_code: otpCode,
      Email: trimmedEmail,
      type: 'forgot_password'
    });

    await redis.setex(redisKey, 300, redisData);

    // 4. Gửi mã OTP qua Nodemailer
    await sendOtpEmail(trimmedEmail, otpCode, 'forgot_password');

    return res.status(200).json({
      success: true,
      message: 'Mã OTP khôi phục mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra trong 5 phút.',
      data: {
        Email: trimmedEmail
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyOtp,
  login,
  forgotPassword
};
