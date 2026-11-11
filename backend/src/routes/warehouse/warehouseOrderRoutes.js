const express = require('express');
const router = express.Router();
const warehouseOrderController = require('../../controllers/warehouse/warehouseOrderController');
const { verifyToken, verifyRole } = require('../../middlewares/authMiddleware');

// Chỉ cho phép Admin (Role 1) và Nhân viên Kho (Role 3) truy cập
router.use(verifyToken, verifyRole([1, 3]));

// GET /api/v1/warehouse/orders/fulfillment?stage=pending_confirm|pending_pack|ready_ship|shipping|all
router.get('/fulfillment', warehouseOrderController.getFulfillmentOrders);

// PUT /api/v1/warehouse/orders/:id/confirm (ChoXacNhan -> DaXacNhan)
router.put('/:id/confirm', warehouseOrderController.confirmOrder);

// PUT /api/v1/warehouse/orders/:id/pack (DaXacNhan -> DangDongGoi)
router.put('/:id/pack', warehouseOrderController.packOrder);

// PUT /api/v1/warehouse/orders/:id/ship (DangDongGoi -> DangGiao)
router.put('/:id/ship', warehouseOrderController.shipOrder);

// PUT /api/v1/warehouse/orders/:id/deliver (DangGiao -> DaGiao)
router.put('/:id/deliver', warehouseOrderController.deliverOrder);

module.exports = router;

