const express = require('express');
const router = express.Router();
const inventoryController = require('../../controllers/admin/inventoryController');
const { verifyToken, verifyAdmin } = require('../../middlewares/authMiddleware');

// Áp dụng middleware xác thực token & kiểm tra quyền Admin
router.use(verifyToken, verifyAdmin);

// 1. GET /api/v1/admin/inventory/stock-list - Lấy danh sách tồn kho
router.get('/stock-list', inventoryController.getStockList);

// 2. POST /api/v1/admin/inventory/import - Tạo phiếu nhập kho mới
router.post('/import', inventoryController.createImportReceipt);

module.exports = router;
