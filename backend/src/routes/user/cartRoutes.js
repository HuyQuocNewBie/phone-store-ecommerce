const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/user/cartController');
const { verifyToken } = require('../../middlewares/authMiddleware');

// Tất cả các route giỏ hàng đều yêu cầu JWT Token
router.use(verifyToken);

// 1. GET /api/v1/cart -> Lấy danh sách sản phẩm trong giỏ của người dùng từ bảng giohang
router.get('/', cartController.getCart);

// 2. POST /api/v1/cart/items -> Thêm sản phẩm vào giỏ. Nếu đã tồn tại thì cộng dồn SoLuong (không vượt TonKho)
router.post('/items', cartController.addToCart);

// 3. PUT /api/v1/cart/items -> Cập nhật SoLuong (+/-) của 1 mục trong giỏ
router.put('/items', cartController.updateCartItem);

// 4. POST /api/v1/cart/items/batch-delete -> Nhận mảng cart_item_ids: []. Thực hiện xóa 1 hoặc nhiều dòng sản phẩm khỏi bảng giohang
router.post('/items/batch-delete', cartController.batchDeleteCartItems);

module.exports = router;
