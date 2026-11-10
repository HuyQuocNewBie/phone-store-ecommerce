const express = require('express');
const router = express.Router();
const userReturnController = require('../../controllers/user/userReturnController');
const { verifyToken } = require('../../middlewares/authMiddleware');

// Tất cả route của user đều yêu cầu xác thực JWT Token
router.use(verifyToken);

// POST /api/v1/user/returns - User gửi yêu cầu đổi trả (kèm upload ảnh bằng Multer)
router.post(
  '/returns',
  userReturnController.handleReturnProofUpload,
  userReturnController.createReturnRequest
);

module.exports = router;

