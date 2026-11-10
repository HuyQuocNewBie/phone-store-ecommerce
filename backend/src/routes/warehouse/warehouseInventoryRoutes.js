const express = require('express');
const router = express.Router();
const warehouseInventoryController = require('../../controllers/warehouse/warehouseInventoryController');
const { verifyToken, verifyRole } = require('../../middlewares/authMiddleware');

// Chỉ cho phép Admin (Role 1) và Nhân viên Kho (Role 3) truy cập
router.use(verifyToken, verifyRole([1, 3]));

// GET /api/v1/warehouse/inventory/stock-list - Lấy danh sách sản phẩm và TonKho thực tế
router.get('/stock-list', warehouseInventoryController.getWarehouseStockList);

// GET /api/v1/warehouse/inventory/adjust-requests - Lấy danh sách phiếu báo lệch kho
router.get('/adjust-requests', warehouseInventoryController.getAdjustRequests);

// POST /api/v1/warehouse/inventory/import - Nhập kho thực tế
router.post('/import', warehouseInventoryController.importInventory);

// POST /api/v1/warehouse/inventory/adjust-request - Lập phiếu đề nghị điều chỉnh lệch kho
router.post('/adjust-request', warehouseInventoryController.createAdjustRequest);

module.exports = router;

