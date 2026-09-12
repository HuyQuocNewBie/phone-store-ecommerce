const express = require('express');
const router = express.Router();
const authController = require('../../controllers/user/authController');

// 1. POST /api/v1/auth/register -> Đăng ký người dùng & Gửi OTP qua mail
router.post('/register', authController.register);

// 2. POST /api/v1/auth/verify-otp -> Xác thực OTP & Tạo người dùng trong CSDL
router.post('/verify-otp', authController.verifyOtp);

// 3. POST /api/v1/auth/login -> Kiểm tra đăng nhập (TaiKhoan/Email + MatKhau)
router.post('/login', authController.login);

// 4. POST /api/v1/auth/forgot-password -> Gửi OTP khôi phục mật khẩu qua Mail & Redis
router.post('/forgot-password', authController.forgotPassword);

module.exports = router;
