const express = require('express');
const router = express.Router();
const voucherController = require('../../controllers/user/voucherController');

// GET /api/v1/vouchers/active - Lấy danh sách voucher còn hạn và hoạt động
router.get('/active', voucherController.getActiveVouchers);

// GET /api/v1/vouchers - Alias lấy danh sách voucher hoạt động
router.get('/', voucherController.getActiveVouchers);

// POST /api/v1/vouchers/apply - Áp dụng mã voucher
router.post('/apply', voucherController.applyVoucher);

module.exports = router;
