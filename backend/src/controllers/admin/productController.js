const { pool } = require('../../../config/db');

/**
 * 1. GET /api/v1/admin/products
 * Lấy danh sách toàn bộ sản phẩm (STT, MaSanPham, TenSanPham, Anh, Gia, TonKho)
 */
const getAllProducts = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT MaSanPham, TenSanPham, Anh, Gia, TonKho
       FROM sanpham
       ORDER BY MaSanPham DESC`
    );

    const data = rows.map((item, index) => ({
      STT: index + 1,
      MaSanPham: item.MaSanPham,
      TenSanPham: item.TenSanPham,
      Anh: item.Anh,
      Gia: Number(item.Gia),
      TonKho: Number(item.TonKho)
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách sản phẩm thành công',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/products/:id (Bổ trợ lấy chi tiết sản phẩm kèm thông số kỹ thuật)
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [productRows] = await pool.query(
      `SELECT * FROM sanpham WHERE MaSanPham = ?`,
      [id]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    const [specRows] = await pool.query(
      `SELECT MaThongSo, NhomThongSo, TenThongSo, GiaTri 
       FROM thongsokythuat 
       WHERE MaSanPham = ?`,
      [id]
    );

    const product = productRows[0];
    product.Gia = Number(product.Gia);
    product.TonKho = Number(product.TonKho);
    product.thongsokythuat = specRows;

    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết sản phẩm thành công',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/v1/admin/products
 * Thêm sản phẩm mới kèm mảng thongsokythuat và upload ảnh Cloudinary
 */
const createProduct = async (req, res, next) => {
  let connection;
  try {
    const {
      TenSanPham,
      Gia,
      TonKho,
      DungLuong,
      MauSac,
      TrangThai,
      MoTa,
      MaLoaiSanPham,
      MaNhaSanXuat
    } = req.body;

    // Validate dữ liệu đầu vào
    if (!TenSanPham || !String(TenSanPham).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên sản phẩm không được để trống'
      });
    }

    const numericGia = Number(Gia);
    if (isNaN(numericGia) || numericGia <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá sản phẩm phải là số và lớn hơn 0'
      });
    }

    const numericTonKho = TonKho !== undefined && TonKho !== '' && TonKho !== null ? Number(TonKho) : 0;
    if (isNaN(numericTonKho) || numericTonKho < 0) {
      return res.status(400).json({
        success: false,
        message: 'Tồn kho phải là số và lớn hơn hoặc bằng 0'
      });
    }

    // Xử lý ảnh: Lấy URL từ Cloudinary upload (req.file.path) hoặc body.Anh
    const anhUrl = req.file ? req.file.path : (req.body.Anh && String(req.body.Anh).trim() ? String(req.body.Anh).trim() : null);

    if (!anhUrl) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file ảnh hoặc nhập URL ảnh'
      });
    }

    // Xử lý mảng thongsokythuat (nếu truyền dạng String khi dùng multipart/form-data)
    let specs = req.body.thongsokythuat;
    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs);
      } catch (e) {
        specs = [];
      }
    }

    // Thực hiện Database Transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [productResult] = await connection.query(
      `INSERT INTO sanpham 
       (TenSanPham, Anh, Gia, TonKho, DungLuong, MauSac, TrangThai, MoTa, MaLoaiSanPham, MaNhaSanXuat) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(TenSanPham).trim(),
        anhUrl,
        numericGia,
        numericTonKho,
        DungLuong || null,
        MauSac || null,
        TrangThai || 'DangBan',
        MoTa || null,
        MaLoaiSanPham ? Number(MaLoaiSanPham) : null,
        MaNhaSanXuat ? Number(MaNhaSanXuat) : null
      ]
    );

    const newProductId = productResult.insertId;

    // Chèn danh sách thongsokythuat nếu có
    if (Array.isArray(specs) && specs.length > 0) {
      const specValues = specs.map((spec) => [
        newProductId,
        spec.NhomThongSo || 'Chung',
        spec.TenThongSo,
        spec.GiaTri
      ]);

      await connection.query(
        `INSERT INTO thongsokythuat (MaSanPham, NhomThongSo, TenThongSo, GiaTri) VALUES ?`,
        [specValues]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm mới thành công',
      data: {
        MaSanPham: newProductId,
        TenSanPham: String(TenSanPham).trim(),
        Anh: anhUrl,
        Gia: numericGia,
        TonKho: numericTonKho
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

/**
 * 3. PUT /api/v1/admin/products/:id
 * Cập nhật thông tin sản phẩm và ghi đè/cập nhật danh sách thông số kỹ thuật
 */
const updateProduct = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    const productId = Number(id);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã sản phẩm không hợp lệ'
      });
    }

    connection = await pool.getConnection();

    // Kiểm tra sản phẩm có tồn tại hay không
    const [existing] = await connection.query(
      `SELECT * FROM sanpham WHERE MaSanPham = ?`,
      [productId]
    );

    if (existing.length === 0) {
      connection.release();
      connection = null;
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại'
      });
    }

    const currentProduct = existing[0];

    const {
      TenSanPham,
      Gia,
      TonKho,
      DungLuong,
      MauSac,
      TrangThai,
      MoTa,
      MaLoaiSanPham,
      MaNhaSanXuat
    } = req.body;

    // Validate dữ liệu nếu có truyền lên
    const updatedTenSanPham = TenSanPham !== undefined ? String(TenSanPham).trim() : currentProduct.TenSanPham;
    if (!updatedTenSanPham) {
      connection.release();
      connection = null;
      return res.status(400).json({
        success: false,
        message: 'Tên sản phẩm không được để trống'
      });
    }

    const updatedGia = Gia !== undefined ? Number(Gia) : Number(currentProduct.Gia);
    if (isNaN(updatedGia) || updatedGia <= 0) {
      connection.release();
      connection = null;
      return res.status(400).json({
        success: false,
        message: 'Giá sản phẩm phải lớn hơn 0'
      });
    }

    const updatedTonKho = TonKho !== undefined && TonKho !== '' && TonKho !== null ? Number(TonKho) : Number(currentProduct.TonKho);
    if (isNaN(updatedTonKho) || updatedTonKho < 0) {
      connection.release();
      connection = null;
      return res.status(400).json({
        success: false,
        message: 'Tồn kho phải lớn hơn hoặc bằng 0'
      });
    }

    // Xử lý giữ lại ảnh cũ khi Cập nhật nếu không có file mới upload
    let updatedAnh = null;
    if (req.file) {
      updatedAnh = req.file.path;
    } else if (req.body.Anh !== undefined && String(req.body.Anh).trim() !== '') {
      updatedAnh = String(req.body.Anh).trim();
    } else if (currentProduct.Anh) {
      updatedAnh = currentProduct.Anh;
    }

    if (!updatedAnh) {
      connection.release();
      connection = null;
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file ảnh hoặc nhập URL ảnh'
      });
    }

    // Parse thongsokythuat nếu gửi dạng JSON string trong form-data
    let specs = req.body.thongsokythuat;
    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs);
      } catch (e) {
        specs = undefined;
      }
    }

    // Bắt đầu Transaction
    await connection.beginTransaction();

    await connection.query(
      `UPDATE sanpham SET
         TenSanPham = ?,
         Anh = ?,
         Gia = ?,
         TonKho = ?,
         DungLuong = ?,
         MauSac = ?,
         TrangThai = ?,
         MoTa = ?,
         MaLoaiSanPham = ?,
         MaNhaSanXuat = ?
       WHERE MaSanPham = ?`,
      [
        updatedTenSanPham,
        updatedAnh,
        updatedGia,
        updatedTonKho,
        DungLuong !== undefined ? DungLuong : currentProduct.DungLuong,
        MauSac !== undefined ? MauSac : currentProduct.MauSac,
        TrangThai !== undefined ? TrangThai : currentProduct.TrangThai,
        MoTa !== undefined ? MoTa : currentProduct.MoTa,
        MaLoaiSanPham !== undefined ? (MaLoaiSanPham ? Number(MaLoaiSanPham) : null) : currentProduct.MaLoaiSanPham,
        MaNhaSanXuat !== undefined ? (MaNhaSanXuat ? Number(MaNhaSanXuat) : null) : currentProduct.MaNhaSanXuat,
        productId
      ]
    );

    // Ghi đè danh sách thông số kỹ thuật nếu được truyền vào
    if (specs !== undefined && specs !== null) {
      // Xóa thông số cũ
      await connection.query(`DELETE FROM thongsokythuat WHERE MaSanPham = ?`, [productId]);

      // Chèn danh sách thông số mới
      if (Array.isArray(specs) && specs.length > 0) {
        const specValues = specs.map((spec) => [
          productId,
          spec.NhomThongSo || 'Chung',
          spec.TenThongSo,
          spec.GiaTri
        ]);

        await connection.query(
          `INSERT INTO thongsokythuat (MaSanPham, NhomThongSo, TenThongSo, GiaTri) VALUES ?`,
          [specValues]
        );
      }
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: {
        MaSanPham: productId,
        TenSanPham: updatedTenSanPham,
        Anh: updatedAnh,
        Gia: updatedGia,
        TonKho: updatedTonKho
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

/**
 * 4. DELETE /api/v1/admin/products/:id
 * Hard Delete sản phẩm khỏi CSDL. Xử lý trường hợp dính ràng buộc khóa ngoại (ví dụ: chitietdonhang)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const productId = Number(id);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã sản phẩm không hợp lệ'
      });
    }

    const [existing] = await pool.query(
      `SELECT * FROM sanpham WHERE MaSanPham = ?`,
      [productId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại'
      });
    }

    await pool.query(`DELETE FROM sanpham WHERE MaSanPham = ?`, [productId]);

    return res.status(200).json({
      success: true,
      message: 'Xóa sản phẩm thành công'
    });
  } catch (error) {
    // Bắt lỗi ràng buộc khóa ngoại với chitietdonhang hoặc các bảng tham chiếu khác
    if (
      error.code === 'ER_ROW_IS_REFERENCED_2' ||
      error.errno === 1451 ||
      (error.message && (error.message.includes('foreign key constraint') || error.message.includes('chitietdonhang')))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa sản phẩm do đã có trong đơn hàng (ràng buộc chi tiết đơn hàng)'
      });
    }
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
