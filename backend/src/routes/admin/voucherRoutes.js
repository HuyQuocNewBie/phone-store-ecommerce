const express = require('express');
const router = express.Router();
const voucherController = require('../../controllers/admin/voucherController');

// GET /api/v1/admin/vouchers - Lấy danh sách mã giảm giá
router.get('/', voucherController.getAllVouchers);

// GET /api/v1/admin/vouchers/:id - Lấy chi tiết mã giảm giá theo ID
router.get('/:id', voucherController.getVoucherById);

// POST /api/v1/admin/vouchers - Thêm mã giảm giá mới
router.post('/', voucherController.createVoucher);

// PUT /api/v1/admin/vouchers/:id - Sửa thông tin mã giảm giá
router.put('/:id', voucherController.updateVoucher);

// PATCH /api/v1/admin/vouchers/:id/toggle-status - Đổi trạng thái Bật/Tắt thủ công
router.patch('/:id/toggle-status', voucherController.toggleVoucherStatus);

// DELETE /api/v1/admin/vouchers/:id - Xóa mã giảm giá
router.delete('/:id', voucherController.deleteVoucher);

module.exports = router;
