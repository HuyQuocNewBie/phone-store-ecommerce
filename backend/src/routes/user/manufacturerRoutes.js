const express = require('express');
const router = express.Router();
const { pool } = require('../../../config/db');

/**
 * GET /api/v1/manufacturers
 * Trả về danh sách nhà sản xuất (public, không cần đăng nhập)
 */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT MaNhaSanXuat, TenNhaSanXuat FROM nhasanxuat ORDER BY TenNhaSanXuat ASC`
    );
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách nhà sản xuất thành công',
      data: rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
