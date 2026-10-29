const express = require('express');
const router = express.Router();
const wishlistController = require('../../controllers/user/wishlistController');
const { verifyToken } = require('../../middlewares/authMiddleware');

// Tất cả route yêu thích đều yêu cầu đăng nhập (JWT Token)
router.use(verifyToken);

// 1. GET /api/v1/wishlist -> Lấy danh sách sản phẩm yêu thích của người dùng
router.get('/', wishlistController.getWishlist);

// 2. POST /api/v1/wishlist/toggle -> Thêm hoặc xóa sản phẩm khỏi danh sách yêu thích
router.post('/toggle', wishlistController.toggleWishlist);

module.exports = router;

