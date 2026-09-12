const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/user/orderController');
const { verifyToken } = require('../../middlewares/authMiddleware');

// Tất cả các route đơn hàng & shipping đều yêu cầu người dùng xác thực JWT Token
router.use(verifyToken);

// 1. POST /api/v1/shipping/calculate (hoặc /api/v1/orders/shipping/calculate)
router.post('/shipping/calculate', orderController.calculateShipping);
router.post('/calculate-shipping', orderController.calculateShipping);

// 2. POST /api/v1/orders -> Tạo đơn hàng mới
router.post('/', orderController.createOrder);

// 3. GET /api/v1/orders?tab=... -> Lấy danh sách đơn hàng theo tab
router.get('/', orderController.getUserOrders);

// 4. POST /api/v1/orders/:order_id/reorder -> Thêm toàn bộ sản phẩm thuộc đơn hàng cũ vào giỏ hàng
router.post('/:order_id/reorder', orderController.reorder);
router.post('/:id/reorder', orderController.reorder);

module.exports = router;
