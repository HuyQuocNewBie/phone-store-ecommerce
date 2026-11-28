const { pool } = require('../../../config/db');

const VALID_PRODUCT_STATUSES = ['DangBan', 'NgungBan', 'HetHang'];
const VALID_VARIANT_STATUSES = ['DangBan', 'HetHang', 'NgungBan'];

/**
 * Chuẩn hóa chuỗi tiếng Việt thành mã code viết hoa không dấu phục vụ sinh MaSKU
 */
const normalizeSkuPart = (value, fallback = 'STD', maxLen = 16) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }

  const normalized = String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, maxLen);
};

/**
 * Tự sinh MaSKU duy nhất cho biến thể mới (kiểm tra cả Set trong transaction và DB)
 */
const generateUniqueSKU = async (connection, maSanPham, mauSac, dungLuong, reservedSkus = new Set()) => {
  const spCode = `SP${String(maSanPham).padStart(4, '0')}`;
  const capCode = normalizeSkuPart(dungLuong, 'STD', 12);
  const colorCode = normalizeSkuPart(mauSac, 'DEF', 16);
  const baseSku = `${spCode}-${capCode}-${colorCode}`;

  let candidate = baseSku;
  let attempt = 1;

  while (true) {
    if (!reservedSkus.has(candidate)) {
      const [rows] = await connection.query(
        `SELECT MaBienThe FROM sanpham_bienthe WHERE MaSKU = ? LIMIT 1`,
        [candidate]
      );
      if (rows.length === 0) {
        reservedSkus.add(candidate);
        return candidate;
      }
    }

    attempt += 1;
    const suffix =
      attempt <= 20
        ? `V${attempt}`
        : `${Date.now().toString(36).toUpperCase().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
    candidate = `${baseSku.slice(0, 85)}-${suffix}`;
  }
};

/**
 * Format dữ liệu 1 dòng biến thể từ bảng `sanpham_bienthe`
 * Trả về đầy đủ cả PascalCase chuẩn DB và camelCase tương thích trực tiếp với Frontend
 */
const formatVariant = (row) => {
  const maBienThe = Number(row.MaBienThe);
  const maSanPham = Number(row.MaSanPham);
  const giaBan = Number(row.GiaBan) || 0;
  const giaNhapGanNhat = Number(row.GiaNhapGanNhat) || 0;
  const tonKho = Number(row.TonKho) || 0;
  const mauSac = row.MauSac !== undefined && row.MauSac !== null && String(row.MauSac).trim() !== ''
    ? String(row.MauSac).trim()
    : null;
  const dungLuong = row.DungLuong !== undefined && row.DungLuong !== null && String(row.DungLuong).trim() !== ''
    ? String(row.DungLuong).trim()
    : null;
  const trangThai = row.TrangThai || 'DangBan';

  return {
    MaBienThe: maBienThe,
    MaSanPham: maSanPham,
    MaSKU: row.MaSKU,
    MauSac: mauSac,
    DungLuong: dungLuong,
    GiaBan: giaBan,
    GiaNhapGanNhat: giaNhapGanNhat,
    TonKho: tonKho,
    TrangThai: trangThai,
    maBienThe,
    maSanPham,
    maSKU: row.MaSKU,
    mauSac,
    dungLuong,
    giaBan,
    giaNhapGanNhat,
    tonKho,
    trangThai
  };
};

/**
 * Parse và validate mảng `variants` từ req.body (hỗ trợ cả JSON và multipart/form-data)
 * Trả về:
 *   - { provided: false, variants: [] } nếu client không truyền `variants`
 *   - { provided: true, variants: [...] } nếu hợp lệ
 *   - { error: 'message' } nếu dữ liệu không hợp lệ
 */
const parseAndValidateVariants = (body = {}) => {
  let rawVariants =
    body.variants ?? body.Variants ?? body.sanpham_bienthe ?? body.bienthe;

  if (rawVariants === undefined || rawVariants === null || rawVariants === '') {
    return { provided: false, variants: [] };
  }

  if (typeof rawVariants === 'string') {
    try {
      rawVariants = JSON.parse(rawVariants);
    } catch {
      return { error: 'Định dạng danh sách biến thể (variants) không hợp lệ' };
    }
  }

  if (!Array.isArray(rawVariants) || rawVariants.length === 0) {
    return { error: 'Danh sách biến thể (variants) phải là mảng và có ít nhất 1 biến thể' };
  }

  const normalized = [];
  const pairSet = new Set();

  for (let i = 0; i < rawVariants.length; i++) {
    const item = rawVariants[i] || {};
    const rawId = item.maBienThe ?? item.MaBienThe;
    let maBienThe = null;

    if (rawId !== undefined && rawId !== null && String(rawId).trim() !== '') {
      const parsedId = Number(rawId);
      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return { error: `Mã biến thể (maBienThe) ở vị trí ${i + 1} không hợp lệ` };
      }
      maBienThe = parsedId;
    }

    const rawMauSac = item.mauSac ?? item.MauSac;
    const rawDungLuong = item.dungLuong ?? item.DungLuong;
    const rawGiaBan = item.giaBan ?? item.GiaBan ?? item.gia ?? item.Gia;
    const rawTrangThai = item.trangThai ?? item.TrangThai;

    const mauSac =
      rawMauSac !== undefined && rawMauSac !== null && String(rawMauSac).trim() !== ''
        ? String(rawMauSac).trim()
        : null;
    const dungLuong =
      rawDungLuong !== undefined && rawDungLuong !== null && String(rawDungLuong).trim() !== ''
        ? String(rawDungLuong).trim()
        : null;

    if (!mauSac && !dungLuong) {
      return {
        error: `Biến thể ở vị trí ${i + 1} phải có ít nhất Màu sắc hoặc Dung lượng`
      };
    }

    const giaBan = Number(rawGiaBan);
    if (!Number.isFinite(giaBan) || giaBan <= 0) {
      return {
        error: `Giá bán (giaBan) của biến thể ở vị trí ${i + 1} phải là số lớn hơn 0`
      };
    }

    const pairKey = `${(mauSac || '').toLowerCase()}__${(dungLuong || '').toLowerCase()}`;
    if (pairSet.has(pairKey)) {
      return {
        error: `Biến thể cặp Màu sắc "${mauSac || 'Mặc định'}" - Dung lượng "${dungLuong || 'Tiêu chuẩn'}" bị trùng lặp`
      };
    }
    pairSet.add(pairKey);

    const trangThai =
      rawTrangThai && VALID_VARIANT_STATUSES.includes(String(rawTrangThai).trim())
        ? String(rawTrangThai).trim()
        : null;

    normalized.push({
      maBienThe,
      mauSac,
      dungLuong,
      giaBan,
      trangThai
    });
  }

  return { provided: true, variants: normalized };
};

/**
 * Xây dựng mảng biến thể fallback khi client cũ chỉ gửi Gia, MauSac, DungLuong ở cấp sản phẩm
 */
const buildFallbackVariantsFromLegacyFields = ({ gia, mauSac, dungLuong }) => {
  const colors = String(mauSac || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const capacities = String(dungLuong || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const colorList = colors.length > 0 ? colors : ['Mặc định'];
  const capList = capacities.length > 0 ? capacities : ['Tiêu chuẩn'];

  const list = [];
  for (const cap of capList) {
    for (const color of colorList) {
      list.push({
        maBienThe: null,
        mauSac: color,
        dungLuong: cap,
        giaBan: gia,
        trangThai: 'DangBan'
      });
    }
  }
  return list;
};

/**
 * 1. GET /api/v1/admin/products
 * Lấy danh sách toàn bộ sản phẩm kèm tổng tồn kho, giá thấp nhất và danh sách biến thể SKU
 */
const getAllProducts = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         sp.MaSanPham,
         sp.TenSanPham,
         sp.Anh,
         sp.Gia,
         sp.TonKho,
         sp.DungLuong,
         sp.MauSac,
         sp.TrangThai,
         sp.MaLoaiSanPham,
         sp.MaNhaSanXuat
       FROM sanpham sp
       ORDER BY sp.MaSanPham DESC`
    );

    let variantsByProduct = new Map();
    if (rows.length > 0) {
      const productIds = rows.map((r) => r.MaSanPham);
      const [variantRows] = await pool.query(
        `SELECT
           MaBienThe,
           MaSanPham,
           MaSKU,
           MauSac,
           DungLuong,
           GiaBan,
           GiaNhapGanNhat,
           TonKho,
           TrangThai
         FROM sanpham_bienthe
         WHERE MaSanPham IN (?)
         ORDER BY MaBienThe ASC`,
        [productIds]
      );

      for (const v of variantRows) {
        const pid = Number(v.MaSanPham);
        if (!variantsByProduct.has(pid)) {
          variantsByProduct.set(pid, []);
        }
        variantsByProduct.get(pid).push(formatVariant(v));
      }
    }

    const data = rows.map((item, index) => {
      const variants = variantsByProduct.get(Number(item.MaSanPham)) || [];
      const activeVariants = variants.filter((v) => v.TrangThai !== 'NgungBan');
      const sourceVariants = activeVariants.length > 0 ? activeVariants : variants;

      const computedTonKho =
        variants.length > 0
          ? sourceVariants.reduce((sum, v) => sum + (Number(v.TonKho) || 0), 0)
          : Number(item.TonKho) || 0;

      const computedGia =
        sourceVariants.length > 0
          ? Math.min(...sourceVariants.map((v) => Number(v.GiaBan) || 0))
          : Number(item.Gia) || 0;

      return {
        STT: index + 1,
        MaSanPham: item.MaSanPham,
        TenSanPham: item.TenSanPham,
        Anh: item.Anh,
        Gia: computedGia,
        TonKho: computedTonKho,
        TrangThai: item.TrangThai,
        MaLoaiSanPham: item.MaLoaiSanPham,
        MaNhaSanXuat: item.MaNhaSanXuat,
        SoLuongBienThe: sourceVariants.length,
        variants
      };
    });

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
 * 2. GET /api/v1/admin/products/:id
 * Lấy chi tiết sản phẩm kèm thông số kỹ thuật và đầy đủ mảng `variants` (gồm GiaNhapGanNhat & TonKho từng biến thể)
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã sản phẩm không hợp lệ'
      });
    }

    const [productRows] = await pool.query(
      `SELECT * FROM sanpham WHERE MaSanPham = ?`,
      [productId]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    const [[specRows], [variantRows]] = await Promise.all([
      pool.query(
        `SELECT MaThongSo, NhomThongSo, TenThongSo, GiaTri
         FROM thongsokythuat
         WHERE MaSanPham = ?`,
        [productId]
      ),
      pool.query(
        `SELECT
           MaBienThe,
           MaSanPham,
           MaSKU,
           MauSac,
           DungLuong,
           GiaBan,
           GiaNhapGanNhat,
           TonKho,
           TrangThai
         FROM sanpham_bienthe
         WHERE MaSanPham = ?
         ORDER BY MaBienThe ASC`,
        [productId]
      )
    ]);

    const variants = variantRows.map(formatVariant);
    const activeVariants = variants.filter((v) => v.TrangThai !== 'NgungBan');
    const sourceVariants = activeVariants.length > 0 ? activeVariants : variants;

    const product = productRows[0];
    product.Gia =
      sourceVariants.length > 0
        ? Math.min(...sourceVariants.map((v) => v.GiaBan))
        : Number(product.Gia) || 0;
    product.TonKho =
      variants.length > 0
        ? sourceVariants.reduce((sum, v) => sum + v.TonKho, 0)
        : Number(product.TonKho) || 0;
    product.thongsokythuat = specRows;
    product.variants = variants;

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
 * 3. POST /api/v1/admin/products
 * Tạo sản phẩm mới kèm mảng `variants`: [{ maBienThe, mauSac, dungLuong, giaBan }]
 * - Biến thể tạo mới mặc định TonKho = 0, GiaNhapGanNhat = 0, tự sinh MaSKU duy nhất.
 */
const createProduct = async (req, res, next) => {
  let connection;
  try {
    const body = req.body || {};
    const {
      TenSanPham,
      Gia,
      DungLuong,
      MauSac,
      TrangThai,
      MoTa,
      MaLoaiSanPham,
      MaNhaSanXuat
    } = body;

    if (!TenSanPham || !String(TenSanPham).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên sản phẩm không được để trống'
      });
    }

    // Parse & validate danh sách biến thể
    const parsedVariantsResult = parseAndValidateVariants(body);
    if (parsedVariantsResult.error) {
      return res.status(400).json({
        success: false,
        message: parsedVariantsResult.error
      });
    }

    let variantsToCreate = parsedVariantsResult.variants;
    let numericGia = Gia !== undefined && Gia !== null && String(Gia).trim() !== '' ? Number(Gia) : NaN;

    if (parsedVariantsResult.provided) {
      const minVariantPrice = Math.min(...variantsToCreate.map((v) => v.giaBan));
      if (!Number.isFinite(numericGia) || numericGia <= 0) {
        numericGia = minVariantPrice;
      }
    } else {
      if (!Number.isFinite(numericGia) || numericGia <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp danh sách biến thể (variants) hoặc Giá sản phẩm hợp lệ lớn hơn 0'
        });
      }
      variantsToCreate = buildFallbackVariantsFromLegacyFields({
        gia: numericGia,
        mauSac: MauSac,
        dungLuong: DungLuong
      });
    }

    const anhUrl = req.file
      ? req.file.path
      : body.Anh && String(body.Anh).trim()
      ? String(body.Anh).trim()
      : null;

    if (!anhUrl && !parsedVariantsResult.provided) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file ảnh hoặc nhập URL ảnh'
      });
    }

    // Tổng hợp chuỗi MauSac & DungLuong cho bảng `sanpham` để đồng bộ tìm kiếm / bộ lọc khách hàng
    const uniqueColors = [...new Set(variantsToCreate.map((v) => v.mauSac).filter(Boolean))];
    const uniqueCapacities = [...new Set(variantsToCreate.map((v) => v.dungLuong).filter(Boolean))];
    const summaryMauSac =
      MauSac && String(MauSac).trim() !== ''
        ? String(MauSac).trim()
        : uniqueColors.length > 0
        ? uniqueColors.join(', ')
        : null;
    const summaryDungLuong =
      DungLuong && String(DungLuong).trim() !== ''
        ? String(DungLuong).trim()
        : uniqueCapacities.length > 0
        ? uniqueCapacities.join(', ')
        : null;

    const productStatus =
      TrangThai && VALID_PRODUCT_STATUSES.includes(String(TrangThai).trim())
        ? String(TrangThai).trim()
        : 'DangBan';

    let specs = body.thongsokythuat;
    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs);
      } catch {
        specs = [];
      }
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Tồn kho khởi tạo khi thêm mới sản phẩm & biến thể luôn mặc định = 0
    const [productResult] = await connection.query(
      `INSERT INTO sanpham
         (TenSanPham, Anh, Gia, TonKho, DungLuong, MauSac, TrangThai, MoTa, MaLoaiSanPham, MaNhaSanXuat)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [
        String(TenSanPham).trim(),
        anhUrl,
        numericGia,
        summaryDungLuong,
        summaryMauSac,
        productStatus,
        MoTa || null,
        MaLoaiSanPham ? Number(MaLoaiSanPham) : null,
        MaNhaSanXuat ? Number(MaNhaSanXuat) : null
      ]
    );

    const newProductId = productResult.insertId;
    const reservedSkus = new Set();

    for (const v of variantsToCreate) {
      const maSKU = await generateUniqueSKU(
        connection,
        newProductId,
        v.mauSac,
        v.dungLuong,
        reservedSkus
      );
      const variantStatus =
        productStatus === 'NgungBan' ? 'NgungBan' : v.trangThai || 'DangBan';

      // Khi tạo mới biến thể: Mặc định TonKho = 0, GiaNhapGanNhat = 0, tự sinh MaSKU duy nhất
      await connection.query(
        `INSERT INTO sanpham_bienthe
           (MaSanPham, MaSKU, MauSac, DungLuong, GiaBan, GiaNhapGanNhat, TonKho, TrangThai)
         VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
        [newProductId, maSKU, v.mauSac, v.dungLuong, v.giaBan, variantStatus]
      );
    }

    // Chèn danh sách thông số kỹ thuật nếu có
    if (Array.isArray(specs) && specs.length > 0) {
      const validSpecs = specs.filter(
        (s) => s && s.TenThongSo && String(s.TenThongSo).trim() !== ''
      );
      if (validSpecs.length > 0) {
        const specValues = validSpecs.map((spec) => [
          newProductId,
          spec.NhomThongSo || 'Chung',
          String(spec.TenThongSo).trim(),
          spec.GiaTri !== undefined && spec.GiaTri !== null ? String(spec.GiaTri).trim() : ''
        ]);

        await connection.query(
          `INSERT INTO thongsokythuat (MaSanPham, NhomThongSo, TenThongSo, GiaTri) VALUES ?`,
          [specValues]
        );
      }
    }

    const [insertedVariants] = await connection.query(
      `SELECT
         MaBienThe,
         MaSanPham,
         MaSKU,
         MauSac,
         DungLuong,
         GiaBan,
         GiaNhapGanNhat,
         TonKho,
         TrangThai
       FROM sanpham_bienthe
       WHERE MaSanPham = ?
       ORDER BY MaBienThe ASC`,
      [newProductId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm và danh sách biến thể SKU thành công',
      data: {
        MaSanPham: newProductId,
        TenSanPham: String(TenSanPham).trim(),
        Anh: anhUrl,
        Gia: numericGia,
        TonKho: 0,
        DungLuong: summaryDungLuong,
        MauSac: summaryMauSac,
        TrangThai: productStatus,
        variants: insertedVariants.map(formatVariant)
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
 * 4. PUT /api/v1/admin/products/:id
 * Cập nhật thông tin sản phẩm, thông số kỹ thuật và danh sách biến thể `variants`:
 * - Biến thể đã có `maBienThe`: Cập nhật MauSac, DungLuong, GiaBan (giữ nguyên TonKho, GiaNhapGanNhat, MaSKU).
 * - Biến thể mới chưa có `maBienThe`: Tạo mới với TonKho = 0, GiaNhapGanNhat = 0, tự sinh MaSKU duy nhất.
 * - Biến thể cũ không còn trong mảng `variants`: Chặn xóa nếu còn TonKho > 0 hoặc đang có phiếu chờ duyệt;
 *   chuyển NgungBan nếu đã có lịch sử phát sinh, hoặc xóa hẳn nếu chưa từng phát sinh dữ liệu.
 */
const updateProduct = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã sản phẩm không hợp lệ'
      });
    }

    const body = req.body || {};
    const parsedVariantsResult = parseAndValidateVariants(body);
    if (parsedVariantsResult.error) {
      return res.status(400).json({
        success: false,
        message: parsedVariantsResult.error
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.query(
      `SELECT * FROM sanpham WHERE MaSanPham = ? FOR UPDATE`,
      [productId]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại'
      });
    }

    const currentProduct = existing[0];
    const {
      TenSanPham,
      Gia,
      DungLuong,
      MauSac,
      TrangThai,
      MoTa,
      MaLoaiSanPham,
      MaNhaSanXuat
    } = body;

    const updatedTenSanPham =
      TenSanPham !== undefined ? String(TenSanPham).trim() : currentProduct.TenSanPham;
    if (!updatedTenSanPham) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Tên sản phẩm không được để trống'
      });
    }

    let updatedAnh = null;
    if (req.file) {
      updatedAnh = req.file.path;
    } else if (body.Anh !== undefined && String(body.Anh).trim() !== '') {
      updatedAnh = String(body.Anh).trim();
    } else if (currentProduct.Anh) {
      updatedAnh = currentProduct.Anh;
    }

    if (!updatedAnh && !parsedVariantsResult.provided) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file ảnh hoặc nhập URL ảnh'
      });
    }

    let specs = body.thongsokythuat;
    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs);
      } catch {
        specs = undefined;
      }
    }

    const [existingVariants] = await connection.query(
      `SELECT * FROM sanpham_bienthe WHERE MaSanPham = ? FOR UPDATE`,
      [productId]
    );
    const existingVariantMap = new Map(
      existingVariants.map((v) => [Number(v.MaBienThe), v])
    );
    const reservedSkus = new Set(existingVariants.map((v) => v.MaSKU));

    if (parsedVariantsResult.provided) {
      const incomingVariants = parsedVariantsResult.variants;
      const submittedIds = new Set();

      for (const v of incomingVariants) {
        if (v.maBienThe !== null) {
          if (!existingVariantMap.has(v.maBienThe)) {
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: `Biến thể có mã #${v.maBienThe} không tồn tại hoặc không thuộc sản phẩm này`
            });
          }
          if (submittedIds.has(v.maBienThe)) {
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: `Mã biến thể #${v.maBienThe} bị lặp lại trong danh sách cập nhật`
            });
          }
          submittedIds.add(v.maBienThe);

          const prevVar = existingVariantMap.get(v.maBienThe);
          const nextVarStatus =
            v.trangThai ||
            (prevVar.TrangThai === 'NgungBan'
              ? Number(prevVar.TonKho) > 0
                ? 'DangBan'
                : 'HetHang'
              : prevVar.TrangThai);

          // Cập nhật thông tin hiển thị & giá bán, giữ nguyên TonKho, GiaNhapGanNhat và MaSKU
          await connection.query(
            `UPDATE sanpham_bienthe
             SET MauSac = ?,
                 DungLuong = ?,
                 GiaBan = ?,
                 TrangThai = ?
             WHERE MaBienThe = ? AND MaSanPham = ?`,
            [v.mauSac, v.dungLuong, v.giaBan, nextVarStatus, v.maBienThe, productId]
          );
        } else {
          // Tạo mới biến thể: TonKho = 0, GiaNhapGanNhat = 0, tự sinh MaSKU duy nhất
          const newSku = await generateUniqueSKU(
            connection,
            productId,
            v.mauSac,
            v.dungLuong,
            reservedSkus
          );
          const newVarStatus = v.trangThai || 'DangBan';

          const [insRes] = await connection.query(
            `INSERT INTO sanpham_bienthe
               (MaSanPham, MaSKU, MauSac, DungLuong, GiaBan, GiaNhapGanNhat, TonKho, TrangThai)
             VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
            [productId, newSku, v.mauSac, v.dungLuong, v.giaBan, newVarStatus]
          );
          submittedIds.add(Number(insRes.insertId));
        }
      }

      // Xử lý các biến thể cũ bị loại khỏi danh sách cập nhật
      for (const oldVar of existingVariants) {
        const oldId = Number(oldVar.MaBienThe);
        if (!submittedIds.has(oldId)) {
          if (Number(oldVar.TonKho) > 0) {
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: `Không thể xóa biến thể "${[oldVar.MauSac, oldVar.DungLuong].filter(Boolean).join(' - ')}" (${oldVar.MaSKU}) vì đang còn tồn kho (${oldVar.TonKho})`
            });
          }

          // Kiểm tra phiếu nhập hoặc phiếu điều chỉnh đang chờ duyệt của biến thể này
          const [[pendingImport], [pendingAdjust]] = await Promise.all([
            connection.query(
              `SELECT ctpn.MaChiTietNhap
               FROM chitietphieunhap ctpn
               INNER JOIN phieunhapkho pnk ON ctpn.MaPhieuNhap = pnk.MaPhieuNhap
               WHERE ctpn.MaBienThe = ? AND pnk.TrangThai = 'ChoDuyet'
               LIMIT 1`,
              [oldId]
            ),
            connection.query(
              `SELECT MaPhieuAdjust
               FROM phieudieuchinhkho
               WHERE MaBienThe = ? AND TrangThai = 'ChoDuyet'
               LIMIT 1`,
              [oldId]
            )
          ]);

          if (pendingImport.length > 0 || pendingAdjust.length > 0) {
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: `Biến thể "${oldVar.MaSKU}" đang có phiếu kho chờ duyệt, không thể xóa`
            });
          }

          // Kiểm tra lịch sử tham chiếu để bảo toàn dữ liệu SKU cũ
          const [[refCounts]] = await connection.query(
            `SELECT
               (SELECT COUNT(*) FROM chitietdonhang WHERE MaBienThe = ?) +
               (SELECT COUNT(*) FROM chitietphieunhap WHERE MaBienThe = ?) +
               (SELECT COUNT(*) FROM phieudieuchinhkho WHERE MaBienThe = ?) +
               (SELECT COUNT(*) FROM lichsutonkho WHERE MaBienThe = ?) AS totalRefs`,
            [oldId, oldId, oldId, oldId]
          );

          if (Number(refCounts.totalRefs) > 0) {
            await connection.query(
              `UPDATE sanpham_bienthe SET TrangThai = 'NgungBan' WHERE MaBienThe = ?`,
              [oldId]
            );
          } else {
            await connection.query(
              `DELETE FROM sanpham_bienthe WHERE MaBienThe = ? AND MaSanPham = ?`,
              [oldId, productId]
            );
          }
        }
      }
    }

    // Lấy lại danh sách biến thể sau cập nhật để đồng bộ thông tin tổng hợp lên bảng `sanpham`
    const [latestVariants] = await connection.query(
      `SELECT
         MaBienThe,
         MaSanPham,
         MaSKU,
         MauSac,
         DungLuong,
         GiaBan,
         GiaNhapGanNhat,
         TonKho,
         TrangThai
       FROM sanpham_bienthe
       WHERE MaSanPham = ?
       ORDER BY MaBienThe ASC`,
      [productId]
    );

    const activeVariants = latestVariants.filter((v) => v.TrangThai !== 'NgungBan');
    const sourceVariants = activeVariants.length > 0 ? activeVariants : latestVariants;

    let updatedGia =
      Gia !== undefined && Gia !== null && String(Gia).trim() !== ''
        ? Number(Gia)
        : Number(currentProduct.Gia);

    if (parsedVariantsResult.provided && sourceVariants.length > 0) {
      const minVariantGia = Math.min(...sourceVariants.map((v) => Number(v.GiaBan) || 0));
      if (Gia === undefined || Gia === null || String(Gia).trim() === '' || Number(Gia) <= 0) {
        updatedGia = minVariantGia;
      } else {
        updatedGia = minVariantGia;
      }
    }

    if (!Number.isFinite(updatedGia) || updatedGia <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Giá sản phẩm phải lớn hơn 0'
      });
    }

    const totalTonKho =
      latestVariants.length > 0
        ? sourceVariants.reduce((sum, v) => sum + (Number(v.TonKho) || 0), 0)
        : Number(currentProduct.TonKho) || 0;

    const uniqueColors = [
      ...new Set(sourceVariants.map((v) => v.MauSac).filter((c) => c && String(c).trim() !== ''))
    ];
    const uniqueCapacities = [
      ...new Set(sourceVariants.map((v) => v.DungLuong).filter((d) => d && String(d).trim() !== ''))
    ];

    const updatedMauSac = parsedVariantsResult.provided
      ? uniqueColors.length > 0
        ? uniqueColors.join(', ')
        : currentProduct.MauSac
      : MauSac !== undefined
      ? MauSac
      : currentProduct.MauSac;

    const updatedDungLuong = parsedVariantsResult.provided
      ? uniqueCapacities.length > 0
        ? uniqueCapacities.join(', ')
        : currentProduct.DungLuong
      : DungLuong !== undefined
      ? DungLuong
      : currentProduct.DungLuong;

    const updatedTrangThai =
      TrangThai !== undefined && VALID_PRODUCT_STATUSES.includes(String(TrangThai).trim())
        ? String(TrangThai).trim()
        : currentProduct.TrangThai;

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
        totalTonKho,
        updatedDungLuong,
        updatedMauSac,
        updatedTrangThai,
        MoTa !== undefined ? MoTa : currentProduct.MoTa,
        MaLoaiSanPham !== undefined
          ? MaLoaiSanPham
            ? Number(MaLoaiSanPham)
            : null
          : currentProduct.MaLoaiSanPham,
        MaNhaSanXuat !== undefined
          ? MaNhaSanXuat
            ? Number(MaNhaSanXuat)
            : null
          : currentProduct.MaNhaSanXuat,
        productId
      ]
    );

    // Ghi đè danh sách thông số kỹ thuật nếu được truyền vào
    if (specs !== undefined && specs !== null) {
      await connection.query(`DELETE FROM thongsokythuat WHERE MaSanPham = ?`, [productId]);

      if (Array.isArray(specs) && specs.length > 0) {
        const validSpecs = specs.filter(
          (s) => s && s.TenThongSo && String(s.TenThongSo).trim() !== ''
        );
        if (validSpecs.length > 0) {
          const specValues = validSpecs.map((spec) => [
            productId,
            spec.NhomThongSo || 'Chung',
            String(spec.TenThongSo).trim(),
            spec.GiaTri !== undefined && spec.GiaTri !== null ? String(spec.GiaTri).trim() : ''
          ]);

          await connection.query(
            `INSERT INTO thongsokythuat (MaSanPham, NhomThongSo, TenThongSo, GiaTri) VALUES ?`,
            [specValues]
          );
        }
      }
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật sản phẩm và biến thể SKU thành công',
      data: {
        MaSanPham: productId,
        TenSanPham: updatedTenSanPham,
        Anh: updatedAnh,
        Gia: updatedGia,
        TonKho: totalTonKho,
        DungLuong: updatedDungLuong,
        MauSac: updatedMauSac,
        TrangThai: updatedTrangThai,
        variants: latestVariants.map(formatVariant)
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
 * 5. DELETE /api/v1/admin/products/:id
 * Hard Delete sản phẩm khỏi CSDL (xử lý an toàn ràng buộc khóa ngoại đơn hàng / phiếu nhập)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã sản phẩm không hợp lệ'
      });
    }

    const [existing] = await pool.query(
      `SELECT MaSanPham, TenSanPham FROM sanpham WHERE MaSanPham = ?`,
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
    if (
      error.code === 'ER_ROW_IS_REFERENCED_2' ||
      error.errno === 1451 ||
      (error.message &&
        (error.message.includes('foreign key constraint') ||
          error.message.includes('chitietdonhang')))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa sản phẩm do đã phát sinh đơn hàng hoặc phiếu kho liên quan'
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
