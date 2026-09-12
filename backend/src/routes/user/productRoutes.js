const express = require('express');
const router = express.Router();
const productController = require('../../controllers/user/productController');

// 1. GET /api/v1/products -> Trả về danh sách sản phẩm phân trang (kèm bộ lọc & sắp xếp)
router.get('/', productController.getProducts);

// 2. GET /api/v1/products/:id -> Trả về chi tiết sản phẩm kèm thông số kỹ thuật, DungLuong, MauSac
router.get('/:id', productController.getProductById);

module.exports = router;
