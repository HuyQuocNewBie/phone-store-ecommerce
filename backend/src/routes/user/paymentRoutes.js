const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/user/paymentController');

// 1. POST /api/v1/payment/create-vnpay
// Nhận { orderId, amount } -> Tạo URL thanh toán VNPay
router.post('/create-vnpay', paymentController.createVnpayPayment);

// 2. POST /api/v1/payment/create-zalopay
// Nhận { orderId, amount } -> Gọi API ZaloPay Sandbox và trả về payUrl
router.post('/create-zalopay', paymentController.createZalopayPayment);

// 3. GET & POST /api/v1/payment/verify-payment (Callback / Return kiểm tra kết quả thanh toán VNPay & ZaloPay)
router.get('/verify-payment', paymentController.verifyPayment);
router.post('/verify-payment', paymentController.verifyPayment);

// 4. GET /api/v1/payment/vnpay-return (Redirect URL sau thanh toán VNPay)
router.get('/vnpay-return', paymentController.handleVnpayReturn);

// 5. GET /api/v1/payment/vnpay-ipn (Webhook IPN từ VNPay)
router.get('/vnpay-ipn', paymentController.handleVnpayIpn);

// 6. GET /api/v1/payment/zalopay-return (Redirect URL sau thanh toán ZaloPay)
router.get('/zalopay-return', paymentController.handleZalopayReturn);

// 7. POST /api/v1/payment/zalopay-ipn (Webhook IPN từ ZaloPay)
router.post('/zalopay-ipn', paymentController.handleZalopayIpn);
router.post('/zalopay-callback', paymentController.handleZalopayIpn);

module.exports = router;
