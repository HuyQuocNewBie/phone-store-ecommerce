const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../config/db');

/**
 * Controller Đăng nhập (login)
 */
const login = async (req, res, next) => {
  try {
    const { TaiKhoan, Email, MatKhau } = req.body;
    const loginIdentifier = TaiKhoan || Email;

    if (!loginIdentifier || !MatKhau) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tài khoản/email và mật khẩu'
      });
    }

    // Query tìm người dùng theo TaiKhoan = ? OR Email = ?
    const [rows] = await pool.query(
      'SELECT * FROM nguoidung WHERE TaiKhoan = ? OR Email = ?',
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
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET,
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
 * Controller Refresh Token (refreshToken)
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Chưa cung cấp refresh token'
      });
    }

    // Xác thực refresh token với JWT_REFRESH_SECRET
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token không hợp lệ hoặc đã hết hạn'
      });
    }

    // Cấp mới Access Token
    const payload = {
      MaNguoiDung: decoded.MaNguoiDung,
      MaVaiTro: decoded.MaVaiTro,
      TaiKhoan: decoded.TaiKhoan
    };

    const newAccessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Cấp mới access token thành công',
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Profile Admin (getAdminProfile)
 */
const getAdminProfile = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;

    const [rows] = await pool.query(
      `SELECT n.MaNguoiDung, n.TaiKhoan, n.Email, n.AnhDaiDien, n.MaVaiTro, v.TenVaiTro 
       FROM nguoidung n 
       JOIN vaitro v ON n.MaVaiTro = v.MaVaiTro 
       WHERE n.MaNguoiDung = ?`,
      [MaNguoiDung]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin tài khoản'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin Admin thành công',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refreshToken,
  getAdminProfile
};
