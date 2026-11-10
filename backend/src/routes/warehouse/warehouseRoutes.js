const express = require('express');
const router = express.Router();
const warehouseReturnController = require('../../controllers/warehouse/warehouseReturnController');
const { verifyToken, verifyRole } = require('../../middlewares/authMiddleware');

// Chỉ cho phép Admin (Role 1) và Nhân viên Kho (Role 3) truy cập
router.use(verifyToken, verifyRole([1, 3]));

// GET /api/v1/warehouse/returns - Lấy danh sách phiếu đổi trả (JOIN donhang, sanpham, nguoidung)
router.get('/returns', warehouseReturnController.getReturns);

// PUT /api/v1/warehouse/returns/:id/inspect - Nhân viên Kho kiểm định hàng trả về
router.put('/returns/:id/inspect', warehouseReturnController.inspectReturn);

module.exports = router;

