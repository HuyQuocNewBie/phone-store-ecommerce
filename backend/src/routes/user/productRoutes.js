const express = require('express');
const router = express.Router();
const productController = require('../../controllers/user/productController');
const adminProductController = require('../../controllers/admin/productController');
const { verifyToken, verifyAdmin } = require('../../middlewares/authMiddleware');
const { uploadCloudinary } = require('../../../utils/cloudinary');

// 0. GET /api/v1/products/categories -> Trả về danh sách loại sản phẩm
router.get('/categories', productController.getCategories);

// 1. GET /api/v1/products -> Trả về danh sách sản phẩm phân trang (kèm bộ lọc & sắp xếp)
router.get('/', productController.getProducts);

// POST /api/v1/products -> Thêm sản phẩm mới kèm upload ảnh Cloudinary
router.post('/', verifyToken, verifyAdmin, uploadCloudinary.single('Anh'), adminProductController.createProduct);

// 2. GET /api/v1/products/:id -> Trả về chi tiết sản phẩm kèm thông số kỹ thuật, DungLuong, MauSac
router.get('/:id', productController.getProductById);

module.exports = router;
