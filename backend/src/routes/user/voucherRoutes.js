const express = require('express');
const router = express.Router();
const voucherController = require('../../controllers/user/voucherController');

// GET /api/v1/vouchers/available - Lấy danh sách voucher khả dụng phân nhóm giamGiaDon & freeShip
router.get('/available', voucherController.getAvailableVouchers);

// GET /api/v1/vouchers/active - Lấy danh sách voucher còn hạn và hoạt động
router.get('/active', voucherController.getActiveVouchers);

// GET /api/v1/vouchers - Alias lấy danh sách voucher hoạt động
router.get('/', voucherController.getActiveVouchers);

// POST /api/v1/vouchers/apply - Áp dụng 01 mã voucher
router.post('/apply', voucherController.applyVoucher);

// POST /api/v1/vouchers/apply-multi - Áp dụng nhiều voucher (tối đa 01 GiamGiaDon + 01 FreeShip)
router.post('/apply-multi', voucherController.applyMultiVouchers);

module.exports = router;
