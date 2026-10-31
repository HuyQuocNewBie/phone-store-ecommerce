const express = require('express');
const router = express.Router();
const authController = require('../../controllers/user/authController');
const rateLimitMiddleware = require('../../middlewares/rateLimitMiddleware');
const recaptchaMiddleware = require('../../middlewares/recaptchaMiddleware');

// 1. POST /api/v1/auth/register -> Đăng ký người dùng & Gửi OTP qua mail
router.post('/register', authController.register);

// 2. POST /api/v1/auth/verify-otp -> Xác thực OTP & Tạo người dùng trong CSDL
router.post('/verify-otp', authController.verifyOtp);

// 3. POST /api/v1/auth/login -> Kiểm tra đăng nhập (TaiKhoan/Email + MatKhau)
// Bảo vệ bởi Rate Limiter (tối đa 5 lần/phút/IP) và reCAPTCHA v3 (chống bot)
router.post('/login', rateLimitMiddleware, recaptchaMiddleware, authController.login);

// 4. POST /api/v1/auth/forgot-password -> Gửi OTP khôi phục mật khẩu qua Mail & Redis
router.post('/forgot-password', authController.forgotPassword);

// 5. POST /api/v1/auth/google -> Đăng nhập bằng Google People API
router.post('/google', authController.googleLogin);

module.exports = router;
