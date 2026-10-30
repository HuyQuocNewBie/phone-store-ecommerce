const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Common middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/admin/index');
const userProductRoutes = require('./src/routes/user/productRoutes');
const userSearchRoutes = require('./src/routes/user/searchRoutes');
const userCartRoutes = require('./src/routes/user/cartRoutes');
const userOrderRoutes = require('./src/routes/user/orderRoutes');
const userManufacturerRoutes = require('./src/routes/user/manufacturerRoutes');
const userVoucherRoutes = require('./src/routes/user/voucherRoutes');
const userReviewRoutes = require('./src/routes/user/reviewRoutes');
const userWishlistRoutes = require('./src/routes/user/wishlistRoutes');
const userAddressRoutes = require('./src/routes/user/addressRoutes');
const userProfileRoutes = require('./src/routes/user/profileRoutes');
const { verifyToken } = require('./src/middlewares/authMiddleware');
const { uploadAvatar } = require('./src/controllers/user/profileController');

// Basic status route
app.get('/', (req, res) => {
  res.json({
    message: 'SmartZone E-commerce API is running',
    status: 'OK'
  });
});

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/products', userProductRoutes);
app.use('/api/v1/sanpham', userProductRoutes);
app.use('/api/v1/search', userSearchRoutes);
app.use('/api/v1/cart', userCartRoutes);
app.use('/api/v1/orders', userOrderRoutes);
app.use('/api/v1/shipping', userOrderRoutes);
app.use('/api/v1/manufacturers', userManufacturerRoutes);
app.use('/api/v1/vouchers', userVoucherRoutes);
app.use('/api/v1/reviews', userReviewRoutes);
app.use('/api/v1/wishlist', userWishlistRoutes);
app.use('/api/v1/addresses', userAddressRoutes);
app.use('/api/v1/profile', userProfileRoutes);
// POST /api/v1/upload/avatar – upload ảnh đại diện (yêu cầu JWT)
app.post('/api/v1/upload/avatar', verifyToken, ...uploadAvatar);
app.get('/api/v1/categories', require('./src/controllers/user/productController').getCategories);

// Centralized error handling middleware
app.use(errorHandler);

// Start server & check DB connection
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await testConnection();
});
