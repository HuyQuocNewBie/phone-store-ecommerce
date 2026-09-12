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
app.use('/api/v1/search', userSearchRoutes);
app.use('/api/v1/cart', userCartRoutes);
app.use('/api/v1/orders', userOrderRoutes);
app.use('/api/v1/shipping', userOrderRoutes);

// Centralized error handling middleware
app.use(errorHandler);

// Start server & check DB connection
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await testConnection();
});
