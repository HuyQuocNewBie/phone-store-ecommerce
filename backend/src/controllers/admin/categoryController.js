const { pool } = require('../../../config/db');

/**
 * 1. GET /api/v1/admin/categories
 * Lấy danh sách danh mục loại sản phẩm (không trả về cột số lượng sản phẩm)
 */
const getAllCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT MaLoaiSanPham, TenLoaiSanPham 
       FROM loaisanpham 
       ORDER BY MaLoaiSanPham DESC`
    );

    const categories = rows.map((item, index) => ({
      STT: index + 1,
      MaLoaiSanPham: item.MaLoaiSanPham,
      TenLoaiSanPham: item.TenLoaiSanPham
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách loại sản phẩm thành công',
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/v1/admin/categories/:id
 * Lấy chi tiết danh mục loại sản phẩm theo ID
 */
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const categoryId = Number(id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã loại sản phẩm không hợp lệ'
      });
    }

    const [rows] = await pool.query(
      `SELECT MaLoaiSanPham, TenLoaiSanPham FROM loaisanpham WHERE MaLoaiSanPham = ?`,
      [categoryId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy loại sản phẩm'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết loại sản phẩm thành công',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. POST /api/v1/admin/categories
 * Thêm mới loại sản phẩm
 */
const createCategory = async (req, res, next) => {
  try {
    const { TenLoaiSanPham } = req.body;

    if (!TenLoaiSanPham || !String(TenLoaiSanPham).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên loại sản phẩm không được để trống'
      });
    }

    const categoryName = String(TenLoaiSanPham).trim();

    // Kiểm tra tên loại sản phẩm trùng lặp
    const [existing] = await pool.query(
      `SELECT MaLoaiSanPham FROM loaisanpham WHERE LOWER(TenLoaiSanPham) = LOWER(?)`,
      [categoryName]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tên loại sản phẩm này đã tồn tại'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO loaisanpham (TenLoaiSanPham) VALUES (?)`,
      [categoryName]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm loại sản phẩm thành công',
      data: {
        MaLoaiSanPham: result.insertId,
        TenLoaiSanPham: categoryName
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. PUT /api/v1/admin/categories/:id
 * Cập nhật tên loại sản phẩm
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const categoryId = Number(id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã loại sản phẩm không hợp lệ'
      });
    }

    const { TenLoaiSanPham } = req.body;

    if (!TenLoaiSanPham || !String(TenLoaiSanPham).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên loại sản phẩm không được để trống'
      });
    }

    const categoryName = String(TenLoaiSanPham).trim();

    // Kiểm tra loại sản phẩm có tồn tại hay không
    const [existingCategory] = await pool.query(
      `SELECT MaLoaiSanPham FROM loaisanpham WHERE MaLoaiSanPham = ?`,
      [categoryId]
    );

    if (existingCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loại sản phẩm không tồn tại'
      });
    }

    // Kiểm tra trùng tên với loại sản phẩm khác
    const [duplicates] = await pool.query(
      `SELECT MaLoaiSanPham FROM loaisanpham WHERE LOWER(TenLoaiSanPham) = LOWER(?) AND MaLoaiSanPham != ?`,
      [categoryName, categoryId]
    );

    if (duplicates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tên loại sản phẩm này đã trùng với một loại sản phẩm khác'
      });
    }

    await pool.query(
      `UPDATE loaisanpham SET TenLoaiSanPham = ? WHERE MaLoaiSanPham = ?`,
      [categoryName, categoryId]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật loại sản phẩm thành công',
      data: {
        MaLoaiSanPham: categoryId,
        TenLoaiSanPham: categoryName
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. DELETE /api/v1/admin/categories/:id
 * Xóa loại sản phẩm. Bắt lỗi FK 1451 nếu có sản phẩm liên kết
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const categoryId = Number(id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã loại sản phẩm không hợp lệ'
      });
    }

    const [existingCategory] = await pool.query(
      `SELECT MaLoaiSanPham FROM loaisanpham WHERE MaLoaiSanPham = ?`,
      [categoryId]
    );

    if (existingCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loại sản phẩm không tồn tại'
      });
    }

    await pool.query(`DELETE FROM loaisanpham WHERE MaLoaiSanPham = ?`, [categoryId]);

    return res.status(200).json({
      success: true,
      message: 'Xóa loại sản phẩm thành công'
    });
  } catch (error) {
    // Bắt lỗi ràng buộc khóa ngoại MySQL 1451 (ER_ROW_IS_REFERENCED_2)
    if (
      error.code === 'ER_ROW_IS_REFERENCED_2' ||
      error.errno === 1451 ||
      (error.message && error.message.includes('foreign key constraint'))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa danh mục này do đã có sản phẩm liên kết'
      });
    }
    next(error);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
