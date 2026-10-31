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
 * Đăng nhập Google:
 * - Nhận accessToken từ client gửi lên.
 * - Gọi Google People API:
 *   GET https://people.googleapis.com/v1/people/me?personFields=names,photos,genders,birthdays
 *   với Header Authorization: Bearer <accessToken>.
 * - Bóc tách thông tin:
 *   * Email -> Email
 *   * Họ tên -> TaiKhoan
 *   * Image URL -> AnhDaiDien
 *   * Gender ('male'/'female') -> GioiTinh ('Nam'/'Nữ')
 *   * Birthday (year, month, day) -> NgaySinh ('YYYY-MM-DD')
 * - XỬ LÝ TRUY VẤN MYSQL BẢNG nguoidung:
 *   * Kiểm tra theo Email.
 *   * NẾU CHƯA TỒN TẠI (Tạo mới):
 *     - Sinh mật khẩu ngẫu nhiên: const randomPass = crypto.randomBytes(16).toString('hex');
 *     - Băm mật khẩu: const hashedPassword = await bcrypt.hash(randomPass, 10);
 *     - Thực hiện INSERT INTO nguoidung (TaiKhoan, Email, MatKhau, AnhDaiDien, GioiTinh, NgaySinh, MaVaiTro) VALUES (...) với MaVaiTro = 2 (Khách hàng).
 *   * NẾU ĐÃ TỒN TẠI (Cập nhật):
 *     - Cập nhật bổ sung AnhDaiDien, GioiTinh, NgaySinh nếu các cột này đang mang giá trị NULL.
 * - Trả về JWT Access Token đăng nhập hệ thống.
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

    // 1. Gọi Google People API
    let googlePeopleRes;
    try {
      googlePeopleRes = await axios.get(
        'https://people.googleapis.com/v1/people/me?personFields=names,photos,genders,birthdays',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
    } catch (apiError) {
      console.error('Lỗi khi gọi Google People API:', apiError?.response?.data || apiError.message);
      return res.status(401).json({
        success: false,
        message: 'Xác thực Google thất bại hoặc accessToken không hợp lệ',
        error: apiError?.response?.data?.error?.message || apiError.message
      });
    }

    const peopleData = googlePeopleRes.data || {};

    // 2. Lấy Email người dùng
    let email =
      peopleData.emailAddresses?.[0]?.value ||
      peopleData.email ||
      req.body?.email ||
      req.body?.Email;

    // Dự phòng: Nếu personFields không trả về email, truy vấn thêm Google UserInfo bằng accessToken
    if (!email) {
      try {
        const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        if (userInfoRes.data?.email) {
          email = userInfoRes.data.email;
        }
      } catch (err) {
        console.warn('Không thể lấy email từ Google UserInfo:', err.message);
      }
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy Email từ tài khoản Google'
      });
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    // 3. Bóc tách thông tin:
    // 3.1. Họ tên -> TaiKhoan
    let taiKhoan = null;
    if (Array.isArray(peopleData.names) && peopleData.names.length > 0) {
      const primaryName = peopleData.names.find((n) => n.metadata?.primary) || peopleData.names[0];
      taiKhoan =
        primaryName.displayName ||
        `${primaryName.familyName || ''} ${primaryName.givenName || ''}`.trim() ||
        primaryName.unstructuredName;
    }
    if (!taiKhoan) {
      taiKhoan = trimmedEmail.split('@')[0];
    }
    taiKhoan = String(taiKhoan).trim().slice(0, 50);

    // 3.2. Image URL -> AnhDaiDien
    let anhDaiDien = null;
    if (Array.isArray(peopleData.photos) && peopleData.photos.length > 0) {
      const primaryPhoto = peopleData.photos.find((p) => p.metadata?.primary) || peopleData.photos[0];
      anhDaiDien = primaryPhoto.url || null;
    }
    if (!anhDaiDien && peopleData.picture) {
      anhDaiDien = peopleData.picture;
    }
    if (anhDaiDien && anhDaiDien.length > 255) {
      anhDaiDien = anhDaiDien.slice(0, 255);
    }

    // 3.3. Gender ('male'/'female') -> GioiTinh ('Nam'/'Nữ')
    let gioiTinh = null;
    if (Array.isArray(peopleData.genders) && peopleData.genders.length > 0) {
      const primaryGender = peopleData.genders.find((g) => g.metadata?.primary) || peopleData.genders[0];
      const gVal = String(primaryGender.value || primaryGender.gender || '').toLowerCase().trim();
      if (gVal === 'male') {
        gioiTinh = 'Nam';
      } else if (gVal === 'female') {
        gioiTinh = 'Nữ';
      }
    }

    // 3.4. Birthday (year, month, day) -> NgaySinh ('YYYY-MM-DD')
    let ngaySinh = null;
    if (Array.isArray(peopleData.birthdays) && peopleData.birthdays.length > 0) {
      for (const item of peopleData.birthdays) {
        const d = item.date || item;
        if (d && d.year && d.month && d.day) {
          const year = String(d.year).padStart(4, '0');
          const month = String(d.month).padStart(2, '0');
          const day = String(d.day).padStart(2, '0');
          ngaySinh = `${year}-${month}-${day}`;
          break;
        } else if (typeof item === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item)) {
          ngaySinh = item;
          break;
        }
      }
    }

    // 4. XỬ LÝ TRUY VẤN MYSQL BẢNG nguoidung
    // Kiểm tra theo Email
    const [existingUsers] = await pool.query(
      'SELECT * FROM nguoidung WHERE LOWER(Email) = LOWER(?)',
      [trimmedEmail]
    );

    let user;

    if (existingUsers.length > 0) {
      // NẾU ĐÃ TỒN TẠI (Cập nhật):
      // Cập nhật bổ sung AnhDaiDien, GioiTinh, NgaySinh nếu các cột này đang mang giá trị NULL
      user = existingUsers[0];
      const updateFields = [];
      const updateParams = [];

      if ((user.AnhDaiDien === null || user.AnhDaiDien === '') && anhDaiDien) {
        updateFields.push('AnhDaiDien = ?');
        updateParams.push(anhDaiDien);
        user.AnhDaiDien = anhDaiDien;
      }

      if ((user.GioiTinh === null || user.GioiTinh === '') && gioiTinh) {
        updateFields.push('GioiTinh = ?');
        updateParams.push(gioiTinh);
        user.GioiTinh = gioiTinh;
      }

      if ((user.NgaySinh === null || user.NgaySinh === '') && ngaySinh) {
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
      // NẾU CHƯA TỒN TẠI (Tạo mới):
      // - Sinh mật khẩu ngẫu nhiên: const randomPass = crypto.randomBytes(16).toString('hex');
      // - Băm mật khẩu: const hashedPassword = await bcrypt.hash(randomPass, 10);
      // - Thực hiện INSERT INTO nguoidung (TaiKhoan, Email, MatKhau, AnhDaiDien, GioiTinh, NgaySinh, MaVaiTro) VALUES (...) với MaVaiTro = 2 (Khách hàng).
      const randomPass = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPass, 10);

      const [insertResult] = await pool.query(
        `INSERT INTO nguoidung (TaiKhoan, Email, MatKhau, AnhDaiDien, GioiTinh, NgaySinh, MaVaiTro)
         VALUES (?, ?, ?, ?, ?, ?, 2)`,
        [taiKhoan, trimmedEmail, hashedPassword, anhDaiDien, gioiTinh, ngaySinh]
      );

      const [newUsers] = await pool.query(
        'SELECT * FROM nguoidung WHERE MaNguoiDung = ?',
        [insertResult.insertId]
      );
      user = newUsers[0];
    }

    // Định dạng lại NgaySinh chuẩn YYYY-MM-DD tránh lệch múi giờ
    if (user.NgaySinh instanceof Date) {
      const d = user.NgaySinh;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      user.NgaySinh = `${year}-${month}-${day}`;
    } else if (typeof user.NgaySinh === 'string' && user.NgaySinh.includes('T')) {
      user.NgaySinh = user.NgaySinh.split('T')[0];
    }

    // 5. Trả về JWT Access Token đăng nhập hệ thống
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
    const accessToken =
      req.body?.accessToken ||
      req.body?.token ||
      req.body?.access_token ||
      req.headers['access_token'] ||
      (req.headers['authorization']?.startsWith('Bearer ')
        ? req.headers['authorization'].split(' ')[1]
        : null);

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp accessToken của Zalo'
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

    // 2.4. gender ('male'/'female') -> GioiTinh ('Nam'/'Nữ')
    let gioiTinh = null;
    const gVal = String(gender || '').toLowerCase().trim();
    if (gVal === 'male') {
      gioiTinh = 'Nam';
    } else if (gVal === 'female') {
      gioiTinh = 'Nữ';
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

      if (gioiTinh) {
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
