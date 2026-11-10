const jwt = require('jsonwebtoken');

/**
 * Ánh xạ tên vai trò chuẩn sang MaVaiTro
 * 1: Admin, 2: Customer, 3: Warehouse Staff (Nhân viên Kho)
 */
const ROLE_NAME_TO_ID = {
  admin: 1,
  customer: 2,
  'khách hàng': 2,
  'khach hang': 2,
  'warehouse staff': 3,
  warehouse: 3,
  'nhân viên kho': 3,
  'nhan vien kho': 3,
  kho: 3
};

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
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Chưa cung cấp token xác thực'
    });
  }

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
 * Hỗ trợ truyền mảng vai trò (ví dụ: verifyRole([1, 3])) hoặc nhiều tham số (ví dụ: verifyRole(1, 'Admin'))
 * @param  {...(number|string|Array<number|string>)} allowedRoles - Danh sách vai trò được phép (1: Admin, 2: Customer, 3: Nhân viên Kho)
 */
const verifyRole = (...allowedRoles) => {
  const roles = allowedRoles
    .flat(Infinity)
    .filter((role) => role !== null && role !== undefined && String(role).trim() !== '');

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
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Chưa cung cấp token xác thực'
        });
      }

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
    const userRole = req.user?.MaVaiTro;
    if (userRole === null || userRole === undefined || String(userRole).trim() === '') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập tài nguyên này!'
      });
    }

    const userRoleNum = Number(userRole);
    const userRoleStr = String(userRole).trim().toLowerCase();
    const mappedUserRoleId = !Number.isNaN(userRoleNum)
      ? userRoleNum
      : ROLE_NAME_TO_ID[userRoleStr];

    const isAllowed = roles.some((role) => {
      if (role === userRole) return true;

      const roleStr = String(role).trim().toLowerCase();
      const roleNum = Number(role);

      if (!Number.isNaN(roleNum) && mappedUserRoleId !== undefined && roleNum === mappedUserRoleId) {
        return true;
      }

      const mappedAllowedId = ROLE_NAME_TO_ID[roleStr];
      if (mappedAllowedId !== undefined && mappedUserRoleId !== undefined && mappedAllowedId === mappedUserRoleId) {
        return true;
      }

      if (roleStr === userRoleStr) {
        return true;
      }

      return false;
    });

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập tài nguyên này!'
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

