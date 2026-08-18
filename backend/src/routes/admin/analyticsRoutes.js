const express = require('express');
const router = express.Router();
const {
  getRevenueAnalytics,
  exportRevenueExcel
} = require('../../controllers/admin/analyticsController');

// GET /api/v1/admin/analytics/revenue?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
router.get('/revenue', getRevenueAnalytics);

// GET /api/v1/admin/analytics/export-excel?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
router.get('/export-excel', exportRevenueExcel);

module.exports = router;
