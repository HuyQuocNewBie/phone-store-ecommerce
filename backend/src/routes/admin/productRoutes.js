const express = require('express');
const router = express.Router();
const productController = require('../../controllers/admin/productController');
const { verifyToken, verifyAdmin } = require('../../middlewares/authMiddleware');
const { uploadCloudinary } = require('../../../utils/cloudinary');

// Áp dụng middleware xác thực token & quyền Admin cho các route
router.use(verifyToken, verifyAdmin);

// 1. GET /api/v1/admin/products - Lấy danh sách sản phẩm (STT, MaSanPham, TenSanPham, Anh, Gia, TonKho)
router.get('/', productController.getAllProducts);

// GET /api/v1/admin/products/:id - Lấy chi tiết sản phẩm kèm thông số kỹ thuật
router.get('/:id', productController.getProductById);

// 2. POST /api/v1/admin/products - Thêm sản phẩm mới kèm upload ảnh Cloudinary
router.post('/', uploadCloudinary.single('Anh'), productController.createProduct);

// 3. PUT /api/v1/admin/products/:id - Cập nhật sản phẩm & ghi đè thông số kỹ thuật
router.put('/:id', uploadCloudinary.single('Anh'), productController.updateProduct);

// 4. DELETE /api/v1/admin/products/:id - Hard delete sản phẩm khỏi CSDL
router.delete('/:id', productController.deleteProduct);

module.exports = router;
