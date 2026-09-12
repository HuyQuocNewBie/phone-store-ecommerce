const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userAuthRoutes = require('./user/authRoutes');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// Mount User Auth Routes (/register, /verify-otp, /login, /forgot-password)
router.use('/', userAuthRoutes);

// POST /api/v1/auth/refresh-token -> Cấp mới access token từ refresh token
router.post('/refresh-token', authController.refreshToken);

// GET /api/v1/auth/profile -> Lấy thông tin profile Admin (yêu cầu verifyToken & verifyAdmin)
router.get('/profile', [verifyToken, verifyAdmin], authController.getAdminProfile);

module.exports = router;

