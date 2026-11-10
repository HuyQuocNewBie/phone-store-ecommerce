const express = require('express');
const router = express.Router();
const adminApprovalController = require('../../controllers/admin/adminApprovalController');
const { verifyToken, verifyRole } = require('../../middlewares/authMiddleware');

// PUT /api/v1/admin/inventory/adjustments/:id/approve - Admin phê duyệt hoặc từ chối phiếu lệch kho
router.put(
  '/inventory/adjustments/:id/approve',
  verifyToken,
  verifyRole(1, 'Admin'),
  adminApprovalController.approveInventoryAdjustment
);

// POST /api/v1/admin/returns/:id/refund - Admin xác nhận hoàn tiền cho phiếu đổi trả đạt kiểm định
router.post(
  '/returns/:id/refund',
  verifyToken,
  verifyRole(1, 'Admin'),
  adminApprovalController.confirmReturnRefund
);

module.exports = router;

