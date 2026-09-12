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
 * Middleware phân quyền theo vai trò (verifyRole)
 * @param  {...any} allowedRoles - Danh sách vai trò được phép (ví dụ: 1, 2, 'Admin', 'Customer')
 */
const verifyRole = (...allowedRoles) => {
  const roles = allowedRoles.flat();

  return (req, res, next) => {
    // 1. Kiểm tra Token JWT nếu req.user chưa tồn tại (Guest -> 401 Unauthorized)
    if (!req.user) {
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
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Token hết hạn hoặc không hợp lệ'
        });
      }
    }

    // 2. Kiểm tra MaVaiTro của người dùng có thuộc danh sách được phép không (Forbidden -> 403)
    const userRole = req.user.MaVaiTro;

    const isAllowed = roles.some(role => {
      if (role === userRole) return true;
      if (role !== null && role !== undefined && userRole !== null && userRole !== undefined) {
        if (Number(role) === Number(userRole)) return true;
        if (String(role).toLowerCase() === String(userRole).toLowerCase()) return true;
      }
      return false;
    });

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập tài nguyên Admin!'
      });
    }

    next();
  };
};

/**
 * Middleware kiểm tra quyền Admin (verifyAdmin)
 */
const verifyAdmin = (req, res, next) => {
  if (!req.user || Number(req.user.MaVaiTro) !== 1) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập tài nguyên Admin!'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  verifyRole,
  verifyAdmin
};

