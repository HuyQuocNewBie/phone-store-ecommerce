const express = require('express');
const router = express.Router();
const searchController = require('../../controllers/user/searchController');

// 1. GET /api/v1/search/suggest?q=... -> Trả về top 5 gợi ý sản phẩm khớp nhất
router.get('/suggest', searchController.getSearchSuggestions);

module.exports = router;
