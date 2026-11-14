const express = require('express');
const router = express.Router();
const userReturnController = require('../../controllers/user/userReturnController');
const orderController = require('../../controllers/user/orderController');
const { verifyToken } = require('../../middlewares/authMiddleware');

// Tất cả route của user đều yêu cầu xác thực JWT Token
router.use(verifyToken);

// PUT /api/v1/user/orders/:id/confirm-received - Khách hàng xác nhận đã nhận được hàng (DangGiao -> DaGiao)
router.put('/orders/:id/confirm-received', orderController.confirmReceived);
router.post('/orders/:id/confirm-received', orderController.confirmReceived);

// POST /api/v1/user/returns - User gửi yêu cầu đổi trả (kèm upload ảnh bằng Multer)
router.post(
  '/returns',
  userReturnController.handleReturnProofUpload,
  userReturnController.createReturnRequest
);

module.exports = router;

