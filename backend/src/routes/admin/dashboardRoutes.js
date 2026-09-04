const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboardController');
const { verifyToken, verifyAdmin } = require('../../middlewares/authMiddleware');

// Áp dụng middleware xác thực token & kiểm tra quyền Admin cho tất cả route dashboard
router.use(verifyToken, verifyAdmin);

// 1. GET /api/v1/admin/dashboard/cards -> 4 thẻ thống kê
router.get('/cards', dashboardController.getDashboardCards);

// 2. GET /api/v1/admin/dashboard/charts/revenue-monthly -> Biểu đồ doanh thu 12 tháng năm hiện tại
router.get('/charts/revenue-monthly', dashboardController.getMonthlyRevenueChart);

// 2b. GET /api/v1/admin/dashboard/charts/revenue-yearly -> Biểu đồ doanh thu theo năm
router.get('/charts/revenue-yearly', dashboardController.getYearlyRevenueChart);

// 3. GET /api/v1/admin/dashboard/charts/order-status -> Biểu đồ số lượng đơn hàng theo trạng thái
router.get('/charts/order-status', dashboardController.getOrderStatusChart);

// 4. GET /api/v1/admin/dashboard/top-products -> Top 5 sản phẩm bán chạy nhất
router.get('/top-products', dashboardController.getTopProducts);

module.exports = router;
