const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
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

    // 3. Sinh mã OTP 6 chữ số ngẫu nhiên (từ 100000 đến 999999)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

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
 * Bảo vệ bởi: rateLimitMiddleware (chống Brute-force) & recaptchaMiddleware (chống Bot)
 */
const login = async (req, res, next) => {
  try {
    const { TaiKhoan, Email, MatKhau, recaptchaToken } = req.body;
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

/**
 * 5. POST /api/v1/auth/google
 * Đăng nhập Google (OAuth 2.0):
 * - Nhận accessToken từ client gửi lên (hoặc Authorization Header).
 * - Sử dụng 3 Scope cơ bản: 'openid profile email' (không yêu cầu Google Verification, tránh lỗi 403 access_denied).
 * - Chỉ bóc tách 3 thông tin chính từ Google Profile:
 *   * email -> Email
 *   * name -> TaiKhoan (Họ tên)
 *   * picture -> AnhDaiDien (Avatar)
 * - XỬ LÝ TRUY VẤN MYSQL BẢNG nguoidung:
 *   * Kiểm tra theo Email.
 *   * NẾU CHƯA TỒN TẠI (Tạo mới):
 *     - Sinh mật khẩu ngẫu nhiên: const randomPass = crypto.randomBytes(16).toString('hex');
 *     - Băm mật khẩu ngẫu nhiên: const hashedPassword = await bcrypt.hash(randomPass, 10);
 *     - Thực hiện INSERT INTO nguoidung: Gán Email, TaiKhoan, AnhDaiDien, MatKhau (băm ngẫu nhiên), gán GioiTinh = NULL, NgaySinh = NULL, MaVaiTro = 2 (Khách hàng).
 *   * NẾU ĐÃ TỒN TẠI:
 *     - Cập nhật bổ sung AnhDaiDien nếu cột này đang mang giá trị NULL hoặc rỗng.
 * - Trả về JWT Access Token & Refresh Token đăng nhập hệ thống.
 */
const googleLogin = async (req, res, next) => {
  try {
    const accessToken =
      req.body?.accessToken ||
      req.body?.token ||
      req.body?.access_token ||
      (req.headers?.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp accessToken của Google'
      });
    }

    // 1. Chỉ bóc tách 3 thông tin chính: email, name (Tên), picture (Avatar)
    let email = null;
    let name = null;
    let picture = null;

    try {
      // Ưu tiên Google UserInfo API (chuẩn OIDC với 3 scope cơ bản: openid profile email)
      const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      const data = userInfoRes.data || {};
      email = data.email;
      name = data.name || `${data.family_name || ''} ${data.given_name || ''}`.trim();
      picture = data.picture;
    } catch (userInfoError) {
      console.warn('Google UserInfo API không thành công, thử fallback sang People API:', userInfoError?.response?.data || userInfoError.message);
      try {
        // Fallback sang Google People API chỉ lấy names, photos, emailAddresses (không dùng scope nhạy cảm)
        const peopleRes = await axios.get(
          'https://people.googleapis.com/v1/people/me?personFields=names,photos,emailAddresses',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );
        const peopleData = peopleRes.data || {};
        email = peopleData.emailAddresses?.[0]?.value;
        const primaryName = peopleData.names?.find((n) => n.metadata?.primary) || peopleData.names?.[0];
        name = primaryName?.displayName || `${primaryName?.familyName || ''} ${primaryName?.givenName || ''}`.trim();
        const primaryPhoto = peopleData.photos?.find((p) => p.metadata?.primary) || peopleData.photos?.[0];
        picture = primaryPhoto?.url;
      } catch (apiError) {
        console.error('Lỗi khi xác thực Google Profile:', apiError?.response?.data || apiError.message);
        return res.status(401).json({
          success: false,
          message: 'Xác thực Google thất bại hoặc accessToken không hợp lệ',
          error: apiError?.response?.data?.error?.message || userInfoError?.response?.data?.error?.message || apiError.message
        });
      }
    }

    // Dự phòng Email nếu client gửi kèm
    if (!email && (req.body?.email || req.body?.Email)) {
      email = req.body?.email || req.body?.Email;
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy Email từ tài khoản Google'
      });
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    // 2. Chuẩn hóa 3 thông tin chính
    // Họ tên -> TaiKhoan (tối đa 50 ký tự)
    let taiKhoan = name ? String(name).trim().slice(0, 50) : '';
    if (!taiKhoan) {
      taiKhoan = trimmedEmail.split('@')[0].slice(0, 50);
    }

    // Avatar -> AnhDaiDien (tối đa 255 ký tự)
    let anhDaiDien = picture ? String(picture).trim().slice(0, 255) : null;

    // 3. XỬ LÝ TRUY VẤN MYSQL BẢNG nguoidung
    // Kiểm tra theo Email
    const [existingUsers] = await pool.query(
      'SELECT * FROM nguoidung WHERE LOWER(Email) = LOWER(?)',
      [trimmedEmail]
    );

    let user;

    if (existingUsers.length > 0) {
      // NẾU ĐÃ TỒN TẠI:
      user = existingUsers[0];

      // Cập nhật bổ sung AnhDaiDien nếu cột này đang mang giá trị NULL hoặc rỗng
      if ((user.AnhDaiDien === null || user.AnhDaiDien === '') && anhDaiDien) {
        await pool.query(
          'UPDATE nguoidung SET AnhDaiDien = ? WHERE MaNguoiDung = ?',
          [anhDaiDien, user.MaNguoiDung]
        );
        user.AnhDaiDien = anhDaiDien;
      }
    } else {
      // NẾU CHƯA TỒN TẠI (Tạo mới):
      // - Sinh mật khẩu ngẫu nhiên: const randomPass = crypto.randomBytes(16).toString('hex');
      // - Băm mật khẩu ngẫu nhiên: const hashedPassword = await bcrypt.hash(randomPass, 10);
      // - Gán Email, TaiKhoan, AnhDaiDien, MatKhau (băm ngẫu nhiên), gán GioiTinh = NULL, NgaySinh = NULL
      const randomPass = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPass, 10);

      const [insertResult] = await pool.query(
        `INSERT INTO nguoidung (TaiKhoan, Email, MatKhau, AnhDaiDien, GioiTinh, NgaySinh, MaVaiTro)
         VALUES (?, ?, ?, ?, NULL, NULL, 2)`,
        [taiKhoan, trimmedEmail, hashedPassword, anhDaiDien]
      );

      const [newUsers] = await pool.query(
        'SELECT * FROM nguoidung WHERE MaNguoiDung = ?',
        [insertResult.insertId]
      );
      user = newUsers[0];
    }

    // Định dạng lại NgaySinh chuẩn YYYY-MM-DD tránh lệch múi giờ nếu có
    if (user.NgaySinh instanceof Date) {
      const d = user.NgaySinh;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      user.NgaySinh = `${year}-${month}-${day}`;
    } else if (typeof user.NgaySinh === 'string' && user.NgaySinh.includes('T')) {
      user.NgaySinh = user.NgaySinh.split('T')[0];
    }

    // 4. Trả về JWT Access Token & Refresh Token đăng nhập hệ thống
    const payload = {
      MaNguoiDung: user.MaNguoiDung,
      MaVaiTro: user.MaVaiTro,
      TaiKhoan: user.TaiKhoan
    };

    const jwtAccessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'refresh_secret_key',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    const { MatKhau: _, ...userInfo } = user;

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập Google thành công',
      data: {
        token: jwtAccessToken,
        accessToken: jwtAccessToken,
        refreshToken,
        user: userInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. POST /api/v1/auth/zalo
 * Đăng nhập Zalo OAuth:
 * - Nhận accessToken từ Zalo Client.
 * - Gọi Zalo Graph API:
 *   GET https://graph.zalo.me/v2.0/me?fields=id,name,picture,gender,birthday
 *   với Header access_token: <accessToken>.
 * - Bóc tách & chuyển đổi dữ liệu:
 *   * id -> Email định danh: `zalo_${id}@gmail.com`
 *   * name -> TaiKhoan
 *   * picture.data.url -> AnhDaiDien
 *   * gender ('male'/'female') -> GioiTinh ('Nam'/'Nữ')
 *   * birthday (DD/MM/YYYY) -> NgaySinh ('YYYY-MM-DD')
 * - Xử lý truy vấn MySQL bảng nguoidung:
 *   * Nếu chưa tồn tại: Sinh randomPass, hash bcrypt, INSERT với MaVaiTro = 2.
 *   * Nếu đã tồn tại: Cập nhật thông tin cá nhân mới nhất từ Zalo.
 * - Phát hành và trả về JWT Access Token cho Client.
 */
const zaloLogin = async (req, res, next) => {
  try {
    let accessToken =
      req.body?.accessToken ||
      req.body?.token ||
      req.body?.access_token ||
      req.headers['access_token'] ||
      (req.headers['authorization']?.startsWith('Bearer ')
        ? req.headers['authorization'].split(' ')[1]
        : null);

    const code = req.body?.code || req.body?.oauth_code;
    const codeVerifier = req.body?.codeVerifier || req.body?.code_verifier;

    // Đổi authorization code lấy access_token nếu chưa có access_token trực tiếp
    if (!accessToken && code) {
      const appId = process.env.ZALO_APP_ID || '4287436940154377836';
      const appSecret = process.env.ZALO_APP_SECRET || 'PNEpV0EwHf7Y5sFC2PmB';
      try {
        const params = new URLSearchParams();
        params.append('code', code);
        params.append('app_id', appId);
        params.append('grant_type', 'authorization_code');
        if (codeVerifier) {
          params.append('code_verifier', codeVerifier);
        }

        const tokenRes = await axios.post(
          'https://oauth.zaloapp.com/v4/access_token',
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              secret_key: appSecret
            }
          }
        );

        if (tokenRes.data?.access_token) {
          accessToken = tokenRes.data.access_token;
        } else {
          console.error('Lỗi khi đổi Zalo code lấy access_token:', tokenRes.data);
          return res.status(400).json({
            success: false,
            message: tokenRes.data?.error_description || tokenRes.data?.error_name || tokenRes.data?.message || 'Không thể lấy access token từ Zalo',
            error: tokenRes.data
          });
        }
      } catch (tokenErr) {
        console.error('Lỗi gọi API Zalo access_token:', tokenErr?.response?.data || tokenErr.message);
        return res.status(400).json({
          success: false,
          message: 'Không thể xác thực mã Zalo code',
          error: tokenErr?.response?.data || tokenErr.message
        });
      }
    }

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp accessToken hoặc code của Zalo'
      });
    }

    // 1. Gọi Zalo Graph API
    let zaloRes;
    try {
      zaloRes = await axios.get(
        'https://graph.zalo.me/v2.0/me?fields=id,name,picture,gender,birthday',
        {
          headers: {
            access_token: accessToken
          }
        }
      );
    } catch (apiError) {
      console.error('Lỗi khi gọi Zalo Graph API:', apiError?.response?.data || apiError.message);
      return res.status(401).json({
        success: false,
        message: 'Xác thực Zalo thất bại hoặc accessToken không hợp lệ',
        error: apiError?.response?.data?.message || apiError.message
      });
    }

    const zaloData = zaloRes.data || {};

    // Kiểm tra mã lỗi trả về từ Zalo Graph API
    if (zaloData.error && zaloData.error !== 0) {
      return res.status(401).json({
        success: false,
        message: zaloData.message || 'Xác thực Zalo không hợp lệ',
        error: zaloData
      });
    }

    const { id, name, picture, gender, birthday } = zaloData;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy ID người dùng từ Zalo'
      });
    }

    // 2. Bóc tách & chuyển đổi dữ liệu
    // 2.1. id -> Email định danh
    const generatedEmail = `zalo_${id}@gmail.com`;

    // 2.2. name -> TaiKhoan
    let taiKhoan = name ? String(name).trim() : `zalo_${id}`;
    taiKhoan = taiKhoan.slice(0, 50);

    // 2.3. picture.data.url -> AnhDaiDien
    let anhDaiDien = null;
    if (picture?.data?.url) {
      anhDaiDien = picture.data.url;
    } else if (typeof picture === 'string') {
      anhDaiDien = picture;
    }
    if (anhDaiDien && anhDaiDien.length > 255) {
      anhDaiDien = anhDaiDien.slice(0, 255);
    }

    // 2.4. Parse trường gender từ Zalo Graph API:
    // * Nếu gender === 'male' hoặc gender === 1 hoặc gender === '1' -> Lưu GioiTinh = 'Nam'
    // * Nếu gender === 'female' hoặc gender === 2 hoặc gender === '2' -> Lưu GioiTinh = 'Nữ'
    // * Ngược lại -> Lưu GioiTinh = NULL
    let gioiTinh = null;
    const gVal = typeof gender === 'string' ? gender.trim().toLowerCase() : gender;
    if (gVal === 'male' || gVal === 1 || gVal === '1') {
      gioiTinh = 'Nam';
    } else if (gVal === 'female' || gVal === 2 || gVal === '2') {
      gioiTinh = 'Nữ';
    } else {
      gioiTinh = null;
    }

    // 2.5. birthday (DD/MM/YYYY) -> NgaySinh (YYYY-MM-DD)
    let ngaySinh = null;
    if (birthday && typeof birthday === 'string') {
      const parts = birthday.trim().split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        if (year.length === 4) {
          ngaySinh = `${year}-${month}-${day}`;
        }
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(birthday.trim())) {
        ngaySinh = birthday.trim();
      }
    }

    // 3. Xử lý truy vấn MySQL bảng nguoidung
    const [existingUsers] = await pool.query(
      'SELECT * FROM nguoidung WHERE LOWER(Email) = LOWER(?)',
      [generatedEmail]
    );

    let user;

    if (existingUsers.length > 0) {
      // NẾU ĐÃ TỒN TẠI: Cập nhật các thông tin cá nhân mới nhất từ Zalo
      user = existingUsers[0];
      const updateFields = [];
      const updateParams = [];

      if (taiKhoan) {
        updateFields.push('TaiKhoan = ?');
        updateParams.push(taiKhoan);
        user.TaiKhoan = taiKhoan;
      }

      if (anhDaiDien) {
        updateFields.push('AnhDaiDien = ?');
        updateParams.push(anhDaiDien);
        user.AnhDaiDien = anhDaiDien;
      }

      if (gioiTinh !== undefined) {
        updateFields.push('GioiTinh = ?');
        updateParams.push(gioiTinh);
        user.GioiTinh = gioiTinh;
      }

      if (ngaySinh) {
        updateFields.push('NgaySinh = ?');
        updateParams.push(ngaySinh);
        user.NgaySinh = ngaySinh;
      }

      if (updateFields.length > 0) {
        updateParams.push(user.MaNguoiDung);
        await pool.query(
          `UPDATE nguoidung SET ${updateFields.join(', ')} WHERE MaNguoiDung = ?`,
          updateParams
        );

        const [refreshedUsers] = await pool.query(
          'SELECT * FROM nguoidung WHERE MaNguoiDung = ?',
          [user.MaNguoiDung]
        );
        if (refreshedUsers.length > 0) {
          user = refreshedUsers[0];
        }
      }
    } else {
      // NẾU CHƯA TỒN TẠI: Tạo mới tài khoản với MaVaiTro = 2
      const randomPass = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPass, 10);

      const [insertResult] = await pool.query(
        `INSERT INTO nguoidung (TaiKhoan, Email, MatKhau, AnhDaiDien, GioiTinh, NgaySinh, MaVaiTro)
         VALUES (?, ?, ?, ?, ?, ?, 2)`,
        [taiKhoan, generatedEmail, hashedPassword, anhDaiDien, gioiTinh, ngaySinh]
      );

      const [newUsers] = await pool.query(
        'SELECT * FROM nguoidung WHERE MaNguoiDung = ?',
        [insertResult.insertId]
      );
      user = newUsers[0];
    }

    // Định dạng lại NgaySinh chuẩn YYYY-MM-DD nếu cần
    if (user.NgaySinh instanceof Date) {
      const d = user.NgaySinh;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      user.NgaySinh = `${year}-${month}-${day}`;
    } else if (typeof user.NgaySinh === 'string' && user.NgaySinh.includes('T')) {
      user.NgaySinh = user.NgaySinh.split('T')[0];
    }

    // 4. Phát hành và trả về JWT Access Token cho Client
    const payload = {
      MaNguoiDung: user.MaNguoiDung,
      MaVaiTro: user.MaVaiTro,
      TaiKhoan: user.TaiKhoan
    };

    const jwtAccessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'refresh_secret_key',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    const { MatKhau: _, ...userInfo } = user;

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập Zalo thành công',
      data: {
        token: jwtAccessToken,
        accessToken: jwtAccessToken,
        refreshToken,
        user: userInfo
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
  forgotPassword,
  googleLogin,
  zaloLogin
};
