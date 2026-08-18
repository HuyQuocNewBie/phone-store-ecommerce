const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/admin/orderController');

// GET /api/v1/admin/orders
router.get('/', orderController.getAllOrders);

// PUT /api/v1/admin/orders/:id/status
router.put('/:id/status', orderController.updateOrderStatus);

module.exports = router;
