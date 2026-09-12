const express = require('express');
const router = express.Router();
const { verifyRole } = require('../../middlewares/authMiddleware');

const dashboardRoutes = require('./dashboardRoutes');
const productRoutes = require('./productRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const orderRoutes = require('./orderRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const manufacturerRoutes = require('./manufacturerRoutes');
const voucherRoutes = require('./voucherRoutes');
const analyticsRoutes = require('./analyticsRoutes');

// Áp dụng middleware verifyRole bọc toàn bộ các tuyến đường Admin (quyền Admin: MaVaiTro = 1)
router.use(verifyRole(1, 'Admin'));

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
