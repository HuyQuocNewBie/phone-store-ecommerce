const jwt = require('jsonwebtoken');

/**
 * Middleware xác thực Access Token (verifyToken)
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Chưa cung cấp token xác thực'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token hết hạn hoặc không hợp lệ'
    });
  }
};

/**
 * Middleware kiểm tra quyền Admin (verifyAdmin)
 */
const verifyAdmin = (req, res, next) => {
  if (!req.user || Number(req.user.MaVaiTro) !== 1) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập phân hệ Admin'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  verifyAdmin
};
