const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// POST /api/v1/auth/login -> Đăng nhập hệ thống
router.post('/login', authController.login);

// POST /api/v1/auth/refresh-token -> Cấp mới access token từ refresh token
router.post('/refresh-token', authController.refreshToken);

// GET /api/v1/auth/profile -> Lấy thông tin profile Admin (yêu cầu verifyToken & verifyAdmin)
router.get('/profile', [verifyToken, verifyAdmin], authController.getAdminProfile);

module.exports = router;
