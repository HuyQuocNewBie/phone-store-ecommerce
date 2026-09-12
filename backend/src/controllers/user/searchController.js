const { pool } = require('../../../config/db');
const { normalizeSearchQuery } = require('../../utils/searchNormalizer');

/**
 * GET /api/v1/search/suggest?q=...
 * Lấy chuỗi query qua normalizeSearchQuery, tìm LIKE trong bảng sanpham (TrangThai = 'DangBan'),
 * trả về top 5 sản phẩm khớp nhất (MaSanPham, TenSanPham, Gia, Anh).
 */
const getSearchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim() === '') {
      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách gợi ý tìm kiếm thành công',
        data: []
      });
    }

    const normalizedQuery = normalizeSearchQuery(q);

    if (!normalizedQuery) {
      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách gợi ý tìm kiếm thành công',
        data: []
      });
    }

    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

    // Xây dựng điều kiện WHERE cho từng token (AND LIKE)
    const whereClauses = ["TrangThai = 'DangBan'"];
    const queryParams = [];

    tokens.forEach((token) => {
      whereClauses.push('TenSanPham LIKE ?');
      queryParams.push(`%${token}%`);
    });

    const whereString = `WHERE ${whereClauses.join(' AND ')}`;

    // Query lấy top 5 sản phẩm khớp nhất
    const sql = `
      SELECT MaSanPham, TenSanPham, Gia, Anh
      FROM sanpham
      ${whereString}
      ORDER BY 
        CASE 
          WHEN TenSanPham LIKE ? THEN 1
          WHEN TenSanPham LIKE ? THEN 2
          ELSE 3
        END,
        MaSanPham DESC
      LIMIT 5
    `;

    // Ưu tiên kết quả tên sản phẩm bắt đầu bằng hoặc chứa cụm tìm kiếm normalizedQuery
    const finalParams = [
      ...queryParams,
      `${normalizedQuery}%`,
      `%${normalizedQuery}%`
    ];

    const [rows] = await pool.query(sql, finalParams);

    const formattedData = rows.map((item) => ({
      MaSanPham: item.MaSanPham,
      TenSanPham: item.TenSanPham,
      Gia: Number(item.Gia),
      Anh: item.Anh
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách gợi ý tìm kiếm thành công',
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSearchSuggestions
};
