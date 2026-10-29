const { pool } = require('../../../config/db');

/**
 * 0. GET /api/v1/products/categories
 * Trả về danh sách loại sản phẩm dành cho khách hàng
 */
const getCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT MaLoaiSanPham, TenLoaiSanPham FROM loaisanpham ORDER BY MaLoaiSanPham ASC`
    );
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách loại sản phẩm thành công',
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 1. GET /api/v1/products
 * Trả về danh sách sản phẩm phân trang dành cho khách hàng
 * Query Params:
 * - page: Trang hiện tại (Mặc định: 1)
 * - limit: Số bản ghi mỗi trang (Mặc định: 10)
 * - category_id: Lọc theo mã loại sản phẩm (MaLoaiSanPham)
 * - price_min: Lọc khoảng giá từ price_min
 * - price_max: Lọc khoảng giá đến price_max
 * - rom: Lọc bộ nhớ trong (chuỗi/mảng phân tách bằng dấu phẩy: 128GB,256GB)
 * - sort_by: price_asc (giá tăng dần) hoặc price_desc (giá giảm dần)
 * - search: Từ khóa tìm kiếm tên/mô tả sản phẩm
 */
const getProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 12);
    const offset = (page - 1) * limit;

    const { category_id, category, brand, manufacturer_id, price_min, price_max, rom, sort_by, search, q } = req.query;

    const whereClauses = ["TrangThai = 'DangBan'"];
    const queryParams = [];

    // Lọc theo từ khóa tìm kiếm (search / q)
    const searchQuery = (search || q || '').trim();
    if (searchQuery) {
      whereClauses.push('(TenSanPham LIKE ? OR MoTa LIKE ?)');
      queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    // Lọc theo loại sản phẩm (MaLoaiSanPham / category_id / category)
    const targetCategory = category_id !== undefined && category_id !== '' ? category_id : category;
    if (targetCategory !== undefined && targetCategory !== '') {
      const parsedCategoryId = parseInt(targetCategory, 10);
      if (!isNaN(parsedCategoryId)) {
        whereClauses.push('MaLoaiSanPham = ?');
        queryParams.push(parsedCategoryId);
      }
    }

    // Lọc theo hãng sản xuất (brand / manufacturer_id)
    const targetBrand = brand !== undefined && brand !== '' ? brand : manufacturer_id;
    if (targetBrand !== undefined && String(targetBrand).trim() !== '') {
      const brandList = Array.isArray(targetBrand)
        ? targetBrand
        : String(targetBrand).split(',').map((b) => b.trim()).filter(Boolean);

      if (brandList.length > 0) {
        const numericBrands = brandList.map((b) => parseInt(b, 10)).filter((b) => !isNaN(b));
        const stringBrands = brandList.filter((b) => isNaN(parseInt(b, 10)));

        const brandConditions = [];
        if (numericBrands.length > 0) {
          brandConditions.push(`MaNhaSanXuat IN (${numericBrands.map(() => '?').join(',')})`);
          numericBrands.forEach((id) => queryParams.push(id));
        }
        if (stringBrands.length > 0) {
          brandConditions.push(`EXISTS (
            SELECT 1 FROM nhasanxuat nsx 
            WHERE nsx.MaNhaSanXuat = sanpham.MaNhaSanXuat 
              AND (${stringBrands.map(() => 'nsx.TenNhaSanXuat LIKE ?').join(' OR ')})
          )`);
          stringBrands.forEach((name) => queryParams.push(`%${name}%`));
        }

        if (brandConditions.length > 0) {
          whereClauses.push(`(${brandConditions.join(' OR ')})`);
        }
      }
    }

    // Lọc theo khoảng giá (price_min, price_max)
    if (price_min !== undefined && price_min !== '') {
      const parsedPriceMin = parseFloat(price_min);
      if (!isNaN(parsedPriceMin)) {
        whereClauses.push('Gia >= ?');
        queryParams.push(parsedPriceMin);
      }
    }

    if (price_max !== undefined && price_max !== '') {
      const parsedPriceMax = parseFloat(price_max);
      if (!isNaN(parsedPriceMax)) {
        whereClauses.push('Gia <= ?');
        queryParams.push(parsedPriceMax);
      }
    }

    // Lọc theo ROM bộ nhớ trong (hỗ trợ dạng mảng hoặc chuỗi phân tách bằng dấu phẩy e.g. 128GB,256GB)
    if (rom !== undefined && String(rom).trim() !== '') {
      const romList = Array.isArray(rom)
        ? rom
        : String(rom).split(',').map((r) => r.trim()).filter(Boolean);

      if (romList.length > 0) {
        const romConditions = romList.map(() => `
          (sanpham.DungLuong LIKE ? OR EXISTS (
            SELECT 1 FROM thongsokythuat tskt
            WHERE tskt.MaSanPham = sanpham.MaSanPham
              AND (tskt.TenThongSo = 'ROM' OR tskt.NhomThongSo LIKE '%ROM%' OR tskt.TenThongSo LIKE '%Bộ nhớ trong%')
              AND tskt.GiaTri LIKE ?
          ))
        `).join(' OR ');

        whereClauses.push(`(${romConditions})`);
        romList.forEach((r) => {
          queryParams.push(`%${r}%`, `%${r}%`);
        });
      }
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Query đếm tổng số bản ghi (dùng chung mảng điều kiện WHERE)
    const countSql = `SELECT COUNT(*) AS total FROM sanpham ${whereString}`;
    const [countRows] = await pool.query(countSql, queryParams);
    const total = countRows[0]?.total || 0;

    // Xử lý sắp xếp (sort_by)
    let orderByClause = 'ORDER BY MaSanPham DESC';
    if (sort_by === 'price_asc') {
      orderByClause = 'ORDER BY Gia ASC';
    } else if (sort_by === 'price_desc') {
      orderByClause = 'ORDER BY Gia DESC';
    }

    // Query lấy danh sách sản phẩm phân trang
    const dataSql = `
      SELECT MaSanPham, TenSanPham, Anh, Gia, TonKho, DungLuong, MauSac, TrangThai, MoTa, MaLoaiSanPham, MaNhaSanXuat
      FROM sanpham
      ${whereString}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const dataQueryParams = [...queryParams, limit, offset];
    const [rows] = await pool.query(dataSql, dataQueryParams);

    const formattedData = rows.map((item) => ({
      ...item,
      Gia: Number(item.Gia),
      TonKho: Number(item.TonKho)
    }));

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách sản phẩm thành công',
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/v1/products/:id
 * Trả về chi tiết sản phẩm kèm danh sách DungLuong, MauSac và danh sách thông số kỹ thuật từ thongsokythuat
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã sản phẩm không hợp lệ'
      });
    }

    // Lấy thông tin chi tiết sản phẩm (chỉ lấy sản phẩm có TrangThai = 'DangBan')
    const [productRows] = await pool.query(
      `SELECT * FROM sanpham WHERE MaSanPham = ? AND TrangThai = 'DangBan'`,
      [productId]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    const product = productRows[0];
    product.Gia = Number(product.Gia);
    product.TonKho = Number(product.TonKho);

    // Lấy danh sách thông số kỹ thuật từ bảng thongsokythuat
    const [specRows] = await pool.query(
      `SELECT MaThongSo, NhomThongSo, TenThongSo, GiaTri 
       FROM thongsokythuat 
       WHERE MaSanPham = ?`,
      [productId]
    );

    // Lấy danh sách DungLuong và MauSac khả dụng của cùng dòng sản phẩm
    const [dlRows] = await pool.query(
      `SELECT DISTINCT DungLuong FROM sanpham 
       WHERE TenSanPham = ? AND DungLuong IS NOT NULL AND DungLuong != '' AND TrangThai = 'DangBan'`,
      [product.TenSanPham]
    );

    const [msRows] = await pool.query(
      `SELECT DISTINCT MauSac FROM sanpham 
       WHERE TenSanPham = ? AND MauSac IS NOT NULL AND MauSac != '' AND TrangThai = 'DangBan'`,
      [product.TenSanPham]
    );

    let listDungLuong = dlRows.map((r) => r.DungLuong);
    if (listDungLuong.length === 0 && product.DungLuong) {
      listDungLuong = [product.DungLuong];
    }

    let listMauSac = msRows.map((r) => r.MauSac);
    if (listMauSac.length === 0 && product.MauSac) {
      listMauSac = [product.MauSac];
    }

    const productDetail = {
      ...product,
      danhSachDungLuong: listDungLuong,
      danhSachMauSac: listMauSac,
      thongsokythuat: specRows
    };

    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết sản phẩm thành công',
      data: productDetail
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/v1/products/compare
 * Lấy thông tin so sánh tối đa 3 sản phẩm kèm thông số kỹ thuật
 * Query params: ids=3,5 (chuỗi các MaSanPham cách nhau dấu phẩy)
 */
const getCompareProducts = async (req, res, next) => {
  try {
    const idsStr = req.query.ids || '';
    const idArray = String(idsStr)
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    const cleanIds = [...new Set(idArray)].slice(0, 3);

    if (cleanIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Danh sách sản phẩm so sánh trống',
        data: {
          products: [],
          specs: []
        }
      });
    }

    // Lấy thông tin các sản phẩm
    const [productRows] = await pool.query(
      `SELECT MaSanPham, TenSanPham, Anh, Gia, TonKho, DungLuong, MauSac, TrangThai, MoTa, MaLoaiSanPham, MaNhaSanXuat
       FROM sanpham
       WHERE MaSanPham IN (?)`,
      [cleanIds]
    );

    const formattedProducts = productRows.map((item) => ({
      ...item,
      Gia: Number(item.Gia),
      TonKho: Number(item.TonKho)
    }));

    // Giữ đúng thứ tự cleanIds
    const productMap = new Map(formattedProducts.map((p) => [p.MaSanPham, p]));
    const orderedProducts = cleanIds.map((id) => productMap.get(id)).filter(Boolean);

    if (orderedProducts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Không tìm thấy sản phẩm hợp lệ',
        data: {
          products: [],
          specs: []
        }
      });
    }

    const validProductIds = orderedProducts.map((p) => p.MaSanPham);

    // Lấy thông số kỹ thuật của các sản phẩm này (giữ nguyên thứ tự sản phẩm và thứ tự nhập thông số gốc)
    const [specRows] = await pool.query(
      `SELECT MaThongSo, MaSanPham, NhomThongSo, TenThongSo, GiaTri
       FROM thongsokythuat
       WHERE MaSanPham IN (?)
       ORDER BY FIELD(MaSanPham, ?), MaThongSo ASC`,
      [validProductIds, validProductIds]
    );

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin so sánh thành công',
      data: {
        products: orderedProducts,
        specs: specRows
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getProducts,
  getProductById,
  getCompareProducts
};
