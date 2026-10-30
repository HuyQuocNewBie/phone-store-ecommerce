const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/authMiddleware');
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword
} = require('../../controllers/user/profileController');

// Tất cả các route hồ sơ đều yêu cầu JWT Token
router.use(verifyToken);

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/v1/profile        → Lấy thông tin hồ sơ cá nhân (JOIN địa chỉ mặc định)
// PUT  /api/v1/profile        → Cập nhật hồ sơ (GioiTinh, NgaySinh, SoDienThoai, AnhDaiDien)
// POST /api/v1/upload/avatar  → Upload ảnh đại diện lên Cloudinary  ← được gắn ở đây
// PUT  /api/v1/profile/change-password → Đổi mật khẩu
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/change-password', changePassword);

module.exports = router;

