const express = require('express');
const router = express.Router();
const adminProductController = require('../../controllers/admin/adminProductController');
const { verifyToken, verifyAdmin } = require('../../middlewares/authMiddleware');
const { uploadCloudinary } = require('../../../utils/cloudinary');

// Áp dụng middleware xác thực token & quyền Admin cho các route
router.use(verifyToken, verifyAdmin);

// 1. GET /api/v1/admin/products - Lấy danh sách sản phẩm kèm biến thể SKU
router.get('/', adminProductController.getAllProducts);

// 2. GET /api/v1/admin/products/:id - Lấy chi tiết sản phẩm kèm thông số kỹ thuật & mảng variants
router.get('/:id', adminProductController.getProductById);

// 3. POST /api/v1/admin/products - Thêm sản phẩm mới kèm mảng variants & upload ảnh Cloudinary
router.post('/', uploadCloudinary.single('Anh'), adminProductController.createProduct);

// 4. PUT /api/v1/admin/products/:id - Cập nhật sản phẩm, thông số kỹ thuật & mảng variants
router.put('/:id', uploadCloudinary.single('Anh'), adminProductController.updateProduct);

// 5. DELETE /api/v1/admin/products/:id - Xóa sản phẩm khỏi CSDL
router.delete('/:id', adminProductController.deleteProduct);

module.exports = router;
