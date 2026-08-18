const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../../middlewares/authMiddleware');

const dashboardRoutes = require('./dashboardRoutes');
const productRoutes = require('./productRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const orderRoutes = require('./orderRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const manufacturerRoutes = require('./manufacturerRoutes');
const voucherRoutes = require('./voucherRoutes');
const analyticsRoutes = require('./analyticsRoutes');

// Áp dụng middleware xác thực token & kiểm tra quyền Admin cho tất cả route Admin
router.use(verifyToken, verifyAdmin);

// Đăng ký các route con Admin
router.use('/dashboard', dashboardRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/manufacturers', manufacturerRoutes);
router.use('/vouchers', voucherRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
