const express = require('express');
const router = express.Router();
const adminOrderController = require('../../controllers/admin/adminOrderController');

// GET /api/v1/admin/orders
router.get('/', adminOrderController.getAllOrders);

// GET /api/v1/admin/orders/:id
router.get('/:id', adminOrderController.getOrderDetail);

// PUT /api/v1/admin/orders/:id/status
router.put('/:id/status', adminOrderController.updateOrderStatus);

module.exports = router;
