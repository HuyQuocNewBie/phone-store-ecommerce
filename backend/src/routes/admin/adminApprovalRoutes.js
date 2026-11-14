const express = require('express');
const router = express.Router();
const adminApprovalController = require('../../controllers/admin/adminApprovalController');
const { verifyToken, verifyRole } = require('../../middlewares/authMiddleware');

// GET /api/v1/admin/inventory/imports - Admin lấy danh sách phiếu nhập kho
router.get(
  '/inventory/imports',
  verifyToken,
  verifyRole(1, 'Admin'),
  adminApprovalController.getImportReceipts
);

// PUT /api/v1/admin/inventory/imports/:id/approve - Admin phê duyệt hoặc từ chối phiếu nhập kho
router.put(
  '/inventory/imports/:id/approve',
  verifyToken,
  verifyRole(1, 'Admin'),
  adminApprovalController.approveInventoryImport
);

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

