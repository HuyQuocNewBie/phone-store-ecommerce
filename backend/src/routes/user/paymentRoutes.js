const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/user/paymentController');

// 1. POST /api/v1/payment/create-vnpay
// Nhận { orderId, amount } -> Tạo URL thanh toán VNPay
router.post('/create-vnpay', paymentController.createVnpayPayment);

// 2. POST /api/v1/payment/create-momo
// Nhận { orderId, amount } -> Gọi API MoMo Sandbox và trả về payUrl
router.post('/create-momo', paymentController.createMomoPayment);

// 3. GET /api/v1/payment/verify-payment (Callback / Return kiểm tra kết quả thanh toán VNPay & MoMo)
router.get('/verify-payment', paymentController.verifyPayment);
router.post('/verify-payment', paymentController.verifyPayment);

// 4. GET /api/v1/payment/vnpay-return (Redirect URL sau thanh toán VNPay)
router.get('/vnpay-return', paymentController.handleVnpayReturn);

// 5. GET /api/v1/payment/vnpay-ipn (Webhook IPN từ VNPay)
router.get('/vnpay-ipn', paymentController.handleVnpayIpn);

// 6. GET /api/v1/payment/momo-return (Redirect URL sau thanh toán MoMo)
router.get('/momo-return', paymentController.handleMomoReturn);

// 7. POST /api/v1/payment/momo-ipn (Webhook IPN từ MoMo)
router.post('/momo-ipn', paymentController.handleMomoIpn);

module.exports = router;

