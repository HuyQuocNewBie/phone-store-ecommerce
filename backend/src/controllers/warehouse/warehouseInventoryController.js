const { pool } = require('../../../config/db');
const { pushNotification } = require('../../utils/notificationHelper');

/**
 * Helper tạo nhãn hiển thị biến thể SKU dễ đọc cho thông báo & phản hồi API
 */
const formatVariantDisplayName = (tenSanPham, mauSac, dungLuong, maSKU) => {
  const attrs = [mauSac, dungLuong]
    .map((v) => (v !== undefined && v !== null ? String(v).trim() : ''))
    .filter(Boolean)
    .join(' - ');
  const base = tenSanPham || 'Sản phẩm';
  if (attrs) {
    return `${base} (${attrs})`;
  }
  return maSKU ? `${base} [${maSKU}]` : base;
};

/**
 * Helper chuẩn hóa 1 dòng biến thể kho JOIN `sanpham` và `nhasanxuat`
 */
const mapWarehouseVariantRow = (item) => {
  const tonKho = Number(item.TonKho) || 0;
  let trangThaiTonKho = 'Hết hàng';
  if (tonKho >= 5) {
    trangThaiTonKho = 'Còn hàng';
  } else if (tonKho > 0) {
    trangThaiTonKho = 'Sắp hết';
  }

  const giaBan = Number(item.GiaBan) || 0;
  const giaNhapGanNhat = Number(item.GiaNhapGanNhat) || 0;
  const mauSac = item.MauSac || null;
  const dungLuong = item.DungLuong || null;

  return {
    MaBienThe: Number(item.MaBienThe),
    MaSKU: item.MaSKU,
    MaSanPham: Number(item.MaSanPham),
    TenSanPham: item.TenSanPham,
    TenHienThi: formatVariantDisplayName(item.TenSanPham, mauSac, dungLuong, item.MaSKU),
    Anh: item.Anh || null,
    MauSac: mauSac,
    DungLuong: dungLuong,
    TonKho: tonKho,
    GiaBan: giaBan,
    Gia: giaBan,
    GiaNhapGanNhat: giaNhapGanNhat,
    TrangThai: item.TrangThaiBienThe || item.TrangThai || 'DangBan',
    TrangThaiBienThe: item.TrangThaiBienThe || 'DangBan',
    TrangThaiSanPham: item.TrangThaiSanPham || 'DangBan',
    TrangThaiTonKho: trangThaiTonKho,
    MaLoaiSanPham: item.MaLoaiSanPham || null,
    TenLoaiSanPham: item.TenLoaiSanPham || null,
    MaNhaSanXuat: item.MaNhaSanXuat || null,
    TenNhaSanXuat: item.TenNhaSanXuat || null
  };
};

/**
 * 0. GET /api/v1/warehouse/variants
 * Trả về danh sách tất cả biến thể SKU JOIN `sanpham` và `nhasanxuat`
 * (hiển thị rõ TenSanPham, MauSac, DungLuong, TonKho, GiaBan, GiaNhapGanNhat, MaSKU)
 */
const getWarehouseVariants = async (req, res, next) => {
  try {
    const { maSanPham, maNhaSanXuat, search } = req.query || {};
    const whereClauses = [];
    const params = [];

    if (maSanPham !== undefined && String(maSanPham).trim() !== '') {
      const parsedSp = Number(maSanPham);
      if (Number.isInteger(parsedSp) && parsedSp > 0) {
        whereClauses.push('bt.MaSanPham = ?');
        params.push(parsedSp);
      }
    }

    if (maNhaSanXuat !== undefined && String(maNhaSanXuat).trim() !== '') {
      const parsedNsx = Number(maNhaSanXuat);
      if (Number.isInteger(parsedNsx) && parsedNsx > 0) {
        whereClauses.push('sp.MaNhaSanXuat = ?');
        params.push(parsedNsx);
      }
    }

    if (search !== undefined && String(search).trim() !== '') {
      const kw = `%${String(search).trim()}%`;
      whereClauses.push(
        '(sp.TenSanPham LIKE ? OR bt.MaSKU LIKE ? OR bt.MauSac LIKE ? OR bt.DungLuong LIKE ? OR nsx.TenNhaSanXuat LIKE ?)'
      );
      params.push(kw, kw, kw, kw, kw);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT
         bt.MaBienThe,
         bt.MaSKU,
         bt.MaSanPham,
         sp.TenSanPham,
         sp.Anh,
         bt.MauSac,
         bt.DungLuong,
         COALESCE(bt.TonKho, 0) AS TonKho,
         bt.GiaBan,
         bt.GiaNhapGanNhat,
         bt.TrangThai AS TrangThaiBienThe,
         sp.TrangThai AS TrangThaiSanPham,
         sp.MaLoaiSanPham,
         lsp.TenLoaiSanPham,
         sp.MaNhaSanXuat,
         nsx.TenNhaSanXuat
       FROM sanpham_bienthe bt
       INNER JOIN sanpham sp ON bt.MaSanPham = sp.MaSanPham
       LEFT JOIN nhasanxuat nsx ON sp.MaNhaSanXuat = nsx.MaNhaSanXuat
       LEFT JOIN loaisanpham lsp ON sp.MaLoaiSanPham = lsp.MaLoaiSanPham
       ${whereSql}
       ORDER BY sp.MaSanPham DESC, bt.MaBienThe ASC`,
      params
    );

    const data = rows.map(mapWarehouseVariantRow);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách biến thể sản phẩm trong kho thành công',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 0a. GET /api/v1/warehouse/inventory/stock-list
 * Lấy toàn bộ danh sách tồn kho theo từng biến thể SKU (`sanpham_bienthe` JOIN `sanpham`, `nhasanxuat`, `loaisanpham`)
 * dành cho Nhân viên Kho (Role 3) và Admin (Role 1).
 */
const getWarehouseStockList = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         bt.MaBienThe,
         bt.MaSKU,
         bt.MaSanPham,
         sp.TenSanPham,
         sp.Anh,
         bt.MauSac,
         bt.DungLuong,
         COALESCE(bt.TonKho, 0) AS TonKho,
         bt.GiaBan,
         bt.GiaNhapGanNhat,
         bt.TrangThai AS TrangThaiBienThe,
         sp.TrangThai AS TrangThaiSanPham,
         sp.MaLoaiSanPham,
         lsp.TenLoaiSanPham,
         sp.MaNhaSanXuat,
         nsx.TenNhaSanXuat
       FROM sanpham_bienthe bt
       INNER JOIN sanpham sp ON bt.MaSanPham = sp.MaSanPham
       LEFT JOIN loaisanpham lsp ON sp.MaLoaiSanPham = lsp.MaLoaiSanPham
       LEFT JOIN nhasanxuat nsx ON sp.MaNhaSanXuat = nsx.MaNhaSanXuat
       ORDER BY sp.MaSanPham DESC, bt.MaBienThe ASC`
    );

    const data = rows.map(mapWarehouseVariantRow);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách tồn kho biến thể thành công',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 0b. GET /api/v1/warehouse/inventory/adjust-requests
 * Lấy danh sách phiếu đề nghị điều chỉnh lệch kho gắn với từng biến thể (`MaBienThe`)
 */
const getAdjustRequests = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         p.MaPhieuAdjust,
         p.MaSanPham,
         p.MaBienThe,
         bt.MaSKU,
         COALESCE(bt.MauSac, sp.MauSac) AS MauSac,
         COALESCE(bt.DungLuong, sp.DungLuong) AS DungLuong,
         COALESCE(bt.GiaBan, sp.Gia, 0) AS GiaBan,
         sp.TenSanPham,
         sp.Anh AS AnhSanPham,
         COALESCE(bt.TonKho, sp.TonKho, 0) AS TonKhoHeThong,
         p.MaNguoiDung_Kho,
         uk.TaiKhoan AS NguoiTaoKho,
         p.SoLuongThucTe,
         p.SoLuongChechLech,
         p.LyDoGiaiTrinh,
         p.LyDoTuChoi,
         p.TrangThai,
         p.MaNguoiDung_Admin,
         ua.TaiKhoan AS NguoiDuyetAdmin,
         p.NgayTao,
         p.NgayDuyet
       FROM phieudieuchinhkho p
       LEFT JOIN sanpham_bienthe bt ON p.MaBienThe = bt.MaBienThe
       LEFT JOIN sanpham sp ON COALESCE(bt.MaSanPham, p.MaSanPham) = sp.MaSanPham
       LEFT JOIN nguoidung uk ON p.MaNguoiDung_Kho = uk.MaNguoiDung
       LEFT JOIN nguoidung ua ON p.MaNguoiDung_Admin = ua.MaNguoiDung
       ORDER BY p.NgayTao DESC, p.MaPhieuAdjust DESC`
    );

    const data = rows.map((row) => ({
      MaPhieuAdjust: row.MaPhieuAdjust,
      MaSanPham: row.MaSanPham,
      MaBienThe: row.MaBienThe || null,
      MaSKU: row.MaSKU || null,
      TenSanPham: row.TenSanPham || `Sản phẩm #${row.MaSanPham}`,
      MauSac: row.MauSac || null,
      DungLuong: row.DungLuong || null,
      GiaBan: Number(row.GiaBan) || 0,
      AnhSanPham: row.AnhSanPham || null,
      TonKhoHeThong: Number(row.TonKhoHeThong) || 0,
      MaNguoiDung_Kho: row.MaNguoiDung_Kho,
      NguoiTaoKho: row.NguoiTaoKho || null,
      SoLuongThucTe: Number(row.SoLuongThucTe),
      SoLuongChechLech: Number(row.SoLuongChechLech),
      LyDoGiaiTrinh: row.LyDoGiaiTrinh,
      LyDoTuChoi: row.LyDoTuChoi || null,
      TrangThai: row.TrangThai,
      MaNguoiDung_Admin: row.MaNguoiDung_Admin,
      NguoiDuyetAdmin: row.NguoiDuyetAdmin || null,
      NgayTao: row.NgayTao,
      NgayDuyet: row.NgayDuyet
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách phiếu điều chỉnh kho thành công',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 1. POST /api/v1/warehouse/inventory/import
 * Lập phiếu nhập kho theo Biến thể SKU (`MaBienThe`, `SoLuongNhap`, `DonGiaNhap` >= 1.000.000đ):
 * - Lưu `phieunhapkho` ở trạng thái `ChoDuyet` (chưa cộng tồn kho).
 * - Lưu `chitietphieunhap` gắn với `MaBienThe` và `MaSanPham`.
 * - Gọi `pushNotification` báo cho Admin (`VaiTroNhan = 1`).
 */
const importInventory = async (req, res, next) => {
  let connection;
  try {
    const body = req.body || {};
    const userId = req.user ? (req.user.MaNguoiDung || req.user.id) : null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng thực hiện'
      });
    }

    const rawMaNhaSanXuat = body.MaNhaSanXuat ?? body.maNhaSanXuat;
    const rawGhiChu = body.GhiChu ?? body.ghiChu;
    const ghiChu =
      rawGhiChu !== undefined && rawGhiChu !== null && String(rawGhiChu).trim() !== ''
        ? String(rawGhiChu).trim()
        : null;

    let maNhaSanXuat = null;
    if (
      rawMaNhaSanXuat !== undefined &&
      rawMaNhaSanXuat !== null &&
      String(rawMaNhaSanXuat).trim() !== ''
    ) {
      maNhaSanXuat = Number(rawMaNhaSanXuat);
      if (!Number.isInteger(maNhaSanXuat) || maNhaSanXuat <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Mã nhà sản xuất không hợp lệ'
        });
      }
    }

    // Hỗ trợ danh sách chi tiết hoặc dữ liệu 1 biến thể trực tiếp ở root body
    let rawDetails =
      body.ChiTietPhieuNhap ||
      body.chiTietPhieuNhap ||
      body.items ||
      body.chiTiet ||
      body.details;

    if (
      rawDetails === undefined &&
      (body.MaBienThe !== undefined || body.maBienThe !== undefined)
    ) {
      rawDetails = [
        {
          MaBienThe: body.MaBienThe ?? body.maBienThe,
          SoLuongNhap: body.SoLuongNhap ?? body.soLuongNhap ?? body.SoLuong ?? body.soLuong,
          DonGiaNhap: body.DonGiaNhap ?? body.donGiaNhap ?? body.GiaNhap ?? body.giaNhap
        }
      ];
    }

    if (!Array.isArray(rawDetails) || rawDetails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp thông tin biến thể nhập kho (MaBienThe, SoLuongNhap, DonGiaNhap)'
      });
    }

    const normalizedItems = [];
    for (let i = 0; i < rawDetails.length; i++) {
      const item = rawDetails[i] || {};
      const maBienThe = Number(item.MaBienThe ?? item.maBienThe);
      const soLuongNhap = Number(
        item.SoLuongNhap ?? item.soLuongNhap ?? item.SoLuong ?? item.soLuong
      );
      const donGiaNhap = Number(
        item.DonGiaNhap ?? item.donGiaNhap ?? item.GiaNhap ?? item.giaNhap
      );

      if (!Number.isInteger(maBienThe) || maBienThe <= 0) {
        return res.status(400).json({
          success: false,
          message: `Dòng ${i + 1}: Mã biến thể (MaBienThe) không hợp lệ`
        });
      }

      if (!Number.isInteger(soLuongNhap) || soLuongNhap <= 0) {
        return res.status(400).json({
          success: false,
          message: `Số lượng nhập phải là số nguyên lớn hơn 0 (biến thể mã #${maBienThe})`
        });
      }

      if (!Number.isFinite(donGiaNhap) || donGiaNhap < 1000000) {
        return res.status(400).json({
          success: false,
          message: 'Đơn giá nhập tối thiểu là 1.000.000đ'
        });
      }

      normalizedItems.push({ maBienThe, soLuongNhap, donGiaNhap });
    }

    const tongTienNhap = normalizedItems.reduce(
      (sum, item) => sum + item.soLuongNhap * item.donGiaNhap,
      0
    );

    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (maNhaSanXuat !== null) {
      const [nsxRows] = await connection.query(
        `SELECT MaNhaSanXuat FROM nhasanxuat WHERE MaNhaSanXuat = ?`,
        [maNhaSanXuat]
      );
      if (nsxRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `Nhà sản xuất có mã ${maNhaSanXuat} không tồn tại`
        });
      }
    }

    // Kiểm tra sự tồn tại của từng biến thể SKU và đối chiếu DonGiaNhap < GiaBan
    const validatedVariants = new Map();
    for (const item of normalizedItems) {
      const [btRows] = await connection.query(
        `SELECT
           bt.MaBienThe,
           bt.MaSanPham,
           bt.MaSKU,
           bt.MauSac,
           bt.DungLuong,
           bt.GiaBan,
           bt.GiaNhapGanNhat,
           bt.TonKho,
           bt.TrangThai AS TrangThaiBienThe,
           sp.TenSanPham,
           sp.MaNhaSanXuat
         FROM sanpham_bienthe bt
         INNER JOIN sanpham sp ON bt.MaSanPham = sp.MaSanPham
         WHERE bt.MaBienThe = ?`,
        [item.maBienThe]
      );

      if (btRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `Biến thể sản phẩm có mã #${item.maBienThe} không tồn tại`
        });
      }

      const variant = btRows[0];
      const variantPrice = Number(variant.GiaBan) || 0;

      if (variantPrice > 0 && item.donGiaNhap >= variantPrice) {
        await connection.rollback();
        const label = formatVariantDisplayName(
          variant.TenSanPham,
          variant.MauSac,
          variant.DungLuong,
          variant.MaSKU
        );
        return res.status(400).json({
          success: false,
          message: `Đơn giá nhập (${item.donGiaNhap.toLocaleString('vi-VN')}đ) phải nhỏ hơn giá bán niêm yết (${variantPrice.toLocaleString('vi-VN')}đ) của biến thể "${label}"`
        });
      }

      validatedVariants.set(item.maBienThe, variant);
    }

    // Nếu không truyền MaNhaSanXuat, tự động suy ra từ sản phẩm của biến thể đầu tiên
    if (maNhaSanXuat === null) {
      const firstVariant = validatedVariants.get(normalizedItems[0].maBienThe);
      if (firstVariant?.MaNhaSanXuat) {
        maNhaSanXuat = Number(firstVariant.MaNhaSanXuat);
      }
    }

    // 1. Chèn phiếu nhập kho ở trạng thái 'ChoDuyet'
    const [phieuResult] = await connection.query(
      `INSERT INTO phieunhapkho (MaNhaSanXuat, MaNguoiDung, TongTienNhap, GhiChu, TrangThai)
       VALUES (?, ?, ?, ?, 'ChoDuyet')`,
      [maNhaSanXuat, userId, tongTienNhap, ghiChu]
    );

    const maPhieuNhap = phieuResult.insertId;
    const processedItems = [];

    // 2. Chèn chi tiết phiếu nhập gắn với MaBienThe và MaSanPham
    for (const item of normalizedItems) {
      const variant = validatedVariants.get(item.maBienThe);

      const [detailResult] = await connection.query(
        `INSERT INTO chitietphieunhap (MaPhieuNhap, MaSanPham, MaBienThe, SoLuongNhap, DonGiaNhap)
         VALUES (?, ?, ?, ?, ?)`,
        [maPhieuNhap, variant.MaSanPham, item.maBienThe, item.soLuongNhap, item.donGiaNhap]
      );

      processedItems.push({
        MaChiTietNhap: detailResult.insertId,
        MaBienThe: item.maBienThe,
        MaSKU: variant.MaSKU,
        MaSanPham: variant.MaSanPham,
        TenSanPham: variant.TenSanPham,
        MauSac: variant.MauSac || null,
        DungLuong: variant.DungLuong || null,
        SoLuongNhap: item.soLuongNhap,
        DonGiaNhap: item.donGiaNhap,
        ThanhTien: item.soLuongNhap * item.donGiaNhap,
        TonKhoHienTai: Number(variant.TonKho) || 0
      });
    }

    await connection.commit();

    // 3. Gửi thông báo nội bộ cho Admin (VaiTroNhan = 1)
    const firstItem = processedItems[0];
    const itemSummary =
      processedItems.length === 1
        ? `${formatVariantDisplayName(firstItem.TenSanPham, firstItem.MauSac, firstItem.DungLuong, firstItem.MaSKU)} x${firstItem.SoLuongNhap}`
        : `${processedItems.length} biến thể SKU`;

    await pushNotification({
      vaiTroNhan: 1,
      tieuDe: `Phiếu nhập kho #${maPhieuNhap} chờ phê duyệt`,
      noiDung: `Kho vừa tạo phiếu nhập #${maPhieuNhap} (${itemSummary}) tổng trị giá ${tongTienNhap.toLocaleString('vi-VN')}đ. Vui lòng kiểm tra và phê duyệt.`,
      loaiThongBao: 'KhoVan',
      lienKet: '/admin/inventory/adjustments'
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo phiếu nhập kho theo biến thể thành công. Phiếu đang ở trạng thái Chờ duyệt bởi Admin.',
      data: {
        MaPhieuNhap: maPhieuNhap,
        MaNhaSanXuat: maNhaSanXuat,
        MaNguoiDung: userId,
        TongTienNhap: tongTienNhap,
        GhiChu: ghiChu,
        TrangThai: 'ChoDuyet',
        ChiTietPhieuNhap: processedItems
      }
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * 2. POST /api/v1/warehouse/inventory/adjust-request
 * Lập phiếu báo lệch kho gắn với `MaBienThe` và gọi `pushNotification` báo cho Admin (`VaiTroNhan = 1`).
 */
const createAdjustRequest = async (req, res, next) => {
  try {
    const body = req.body || {};
    const maNguoiDungKho = req.user ? (req.user.MaNguoiDung || req.user.id) : null;

    if (!maNguoiDungKho) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên kho thực hiện'
      });
    }

    const rawMaBienThe = body.MaBienThe ?? body.maBienThe;
    const rawSoLuongThucTe = body.SoLuongThucTe ?? body.soLuongThucTe;
    const rawSoLuongChechLech = body.SoLuongChechLech ?? body.soLuongChechLech;
    const rawLyDoGiaiTrinh =
      body.LyDoGiaiTrinh ?? body.lyDoGiaiTrinh ?? body.LyDo ?? body.lyDo;

    if (
      rawMaBienThe === undefined ||
      rawMaBienThe === null ||
      String(rawMaBienThe).trim() === '' ||
      rawSoLuongThucTe === undefined ||
      rawSoLuongThucTe === null ||
      String(rawSoLuongThucTe).trim() === '' ||
      rawLyDoGiaiTrinh === undefined ||
      rawLyDoGiaiTrinh === null ||
      String(rawLyDoGiaiTrinh).trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: MaBienThe, SoLuongThucTe, LyDoGiaiTrinh'
      });
    }

    const maBienThe = Number(rawMaBienThe);
    if (!Number.isInteger(maBienThe) || maBienThe <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã biến thể (MaBienThe) không hợp lệ'
      });
    }

    const soLuongThucTe = Number(rawSoLuongThucTe);
    if (!Number.isInteger(soLuongThucTe) || soLuongThucTe < 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng thực tế phải là số nguyên không âm'
      });
    }

    const lyDoGiaiTrinh = String(rawLyDoGiaiTrinh).trim();

    // Tra cứu biến thể và sản phẩm cha
    const [btRows] = await pool.query(
      `SELECT
         bt.MaBienThe,
         bt.MaSanPham,
         bt.MaSKU,
         bt.MauSac,
         bt.DungLuong,
         bt.TonKho,
         sp.TenSanPham
       FROM sanpham_bienthe bt
       INNER JOIN sanpham sp ON bt.MaSanPham = sp.MaSanPham
       WHERE bt.MaBienThe = ?`,
      [maBienThe]
    );

    if (btRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Biến thể sản phẩm có mã #${maBienThe} không tồn tại`
      });
    }

    const variant = btRows[0];
    const tonKhoHeThong = Number(variant.TonKho) || 0;

    let soLuongChechLech;
    if (
      rawSoLuongChechLech !== undefined &&
      rawSoLuongChechLech !== null &&
      String(rawSoLuongChechLech).trim() !== ''
    ) {
      soLuongChechLech = Number(rawSoLuongChechLech);
      if (!Number.isInteger(soLuongChechLech)) {
        return res.status(400).json({
          success: false,
          message: 'Số lượng chênh lệch phải là số nguyên hợp lệ'
        });
      }
    } else {
      soLuongChechLech = soLuongThucTe - tonKhoHeThong;
    }

    const [insertResult] = await pool.query(
      `INSERT INTO phieudieuchinhkho
         (MaSanPham, MaBienThe, MaNguoiDung_Kho, SoLuongThucTe, SoLuongChechLech, LyDoGiaiTrinh, TrangThai)
       VALUES (?, ?, ?, ?, ?, ?, 'ChoDuyet')`,
      [
        variant.MaSanPham,
        maBienThe,
        maNguoiDungKho,
        soLuongThucTe,
        soLuongChechLech,
        lyDoGiaiTrinh
      ]
    );

    const maPhieuAdjust = insertResult.insertId;

    const [createdRows] = await pool.query(
      `SELECT
         p.MaPhieuAdjust,
         p.MaSanPham,
         p.MaBienThe,
         bt.MaSKU,
         bt.MauSac,
         bt.DungLuong,
         bt.GiaBan,
         sp.TenSanPham,
         COALESCE(bt.TonKho, 0) AS TonKhoHeThong,
         p.MaNguoiDung_Kho,
         p.SoLuongThucTe,
         p.SoLuongChechLech,
         p.LyDoGiaiTrinh,
         p.LyDoTuChoi,
         p.TrangThai,
         p.MaNguoiDung_Admin,
         p.NgayTao,
         p.NgayDuyet
       FROM phieudieuchinhkho p
       INNER JOIN sanpham_bienthe bt ON p.MaBienThe = bt.MaBienThe
       INNER JOIN sanpham sp ON bt.MaSanPham = sp.MaSanPham
       WHERE p.MaPhieuAdjust = ?`,
      [maPhieuAdjust]
    );

    // Gửi thông báo nội bộ cho Admin (VaiTroNhan = 1)
    const variantLabel = formatVariantDisplayName(
      variant.TenSanPham,
      variant.MauSac,
      variant.DungLuong,
      variant.MaSKU
    );
    const diffStr = soLuongChechLech > 0 ? `+${soLuongChechLech}` : `${soLuongChechLech}`;

    await pushNotification({
      vaiTroNhan: 1,
      tieuDe: `Phiếu báo lệch kho #${maPhieuAdjust} chờ phê duyệt`,
      noiDung: `Kho báo lệch tồn biến thể ${variantLabel} (Tồn hệ thống: ${tonKhoHeThong}, Thực tế: ${soLuongThucTe}, Lệch: ${diffStr}). Lý do: ${lyDoGiaiTrinh}`,
      loaiThongBao: 'KhoVan',
      lienKet: '/admin/inventory/adjustments?tab=adjustments'
    });

    return res.status(201).json({
      success: true,
      message: 'Lập phiếu đề nghị điều chỉnh lệch kho thành công, đang chờ Admin duyệt',
      data: createdRows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/v1/warehouse/inventory/import-receipts
 * Lấy danh sách phiếu nhập kho kèm chi tiết các biến thể SKU
 */
const getImportReceipts = async (req, res, next) => {
  try {
    const [receipts] = await pool.query(
      `SELECT
         p.MaPhieuNhap,
         p.MaNhaSanXuat,
         nsx.TenNhaSanXuat,
         p.MaNguoiDung,
         uk.TaiKhoan AS TaiKhoanKho,
         uk.Email AS EmailKho,
         p.NgayNhap,
         p.TongTienNhap,
         p.GhiChu,
         p.TrangThai,
         p.MaNguoiDung_Admin,
         ua.TaiKhoan AS TaiKhoanAdmin,
         ua.Email AS EmailAdmin,
         p.NgayDuyet
       FROM phieunhapkho p
       LEFT JOIN nhasanxuat nsx ON p.MaNhaSanXuat = nsx.MaNhaSanXuat
       LEFT JOIN nguoidung uk ON p.MaNguoiDung = uk.MaNguoiDung
       LEFT JOIN nguoidung ua ON p.MaNguoiDung_Admin = ua.MaNguoiDung
       ORDER BY p.NgayNhap DESC, p.MaPhieuNhap DESC`
    );

    if (receipts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách phiếu nhập kho thành công',
        data: []
      });
    }

    const importIds = receipts.map((r) => r.MaPhieuNhap);
    const [details] = await pool.query(
      `SELECT
         ct.MaChiTietNhap,
         ct.MaPhieuNhap,
         ct.MaSanPham,
         ct.MaBienThe,
         bt.MaSKU,
         sp.TenSanPham,
         sp.Anh,
         COALESCE(bt.DungLuong, sp.DungLuong) AS DungLuong,
         COALESCE(bt.MauSac, sp.MauSac) AS MauSac,
         COALESCE(bt.GiaBan, sp.Gia, 0) AS GiaBan,
         COALESCE(bt.GiaNhapGanNhat, 0) AS GiaNhapGanNhat,
         COALESCE(bt.TonKho, sp.TonKho, 0) AS TonKhoHienTai,
         ct.SoLuongNhap,
         ct.DonGiaNhap,
         (ct.SoLuongNhap * ct.DonGiaNhap) AS ThanhTien
       FROM chitietphieunhap ct
       LEFT JOIN sanpham_bienthe bt ON ct.MaBienThe = bt.MaBienThe
       LEFT JOIN sanpham sp ON COALESCE(bt.MaSanPham, ct.MaSanPham) = sp.MaSanPham
       WHERE ct.MaPhieuNhap IN (?)
       ORDER BY ct.MaChiTietNhap ASC`,
      [importIds]
    );

    const detailsByImportId = new Map();
    for (const d of details) {
      if (!detailsByImportId.has(d.MaPhieuNhap)) {
        detailsByImportId.set(d.MaPhieuNhap, []);
      }
      const giaBan = Number(d.GiaBan) || 0;
      detailsByImportId.get(d.MaPhieuNhap).push({
        MaChiTietNhap: d.MaChiTietNhap,
        MaSanPham: d.MaSanPham,
        MaBienThe: d.MaBienThe || null,
        MaSKU: d.MaSKU || null,
        TenSanPham: d.TenSanPham || `Sản phẩm #${d.MaSanPham}`,
        Anh: d.Anh || null,
        DungLuong: d.DungLuong || null,
        MauSac: d.MauSac || null,
        GiaBan: giaBan,
        Gia: giaBan,
        GiaNhapGanNhat: Number(d.GiaNhapGanNhat) || 0,
        TonKhoHienTai: Number(d.TonKhoHienTai) || 0,
        SoLuongNhap: Number(d.SoLuongNhap),
        DonGiaNhap: Number(d.DonGiaNhap),
        ThanhTien: Number(d.ThanhTien)
      });
    }

    const data = receipts.map((r) => ({
      MaPhieuNhap: r.MaPhieuNhap,
      MaNhaSanXuat: r.MaNhaSanXuat,
      TenNhaSanXuat: r.TenNhaSanXuat || null,
      MaNguoiDung: r.MaNguoiDung,
      TaiKhoanKho: r.TaiKhoanKho || null,
      EmailKho: r.EmailKho || null,
      NgayNhap: r.NgayNhap,
      TongTienNhap: Number(r.TongTienNhap) || 0,
      GhiChu: r.GhiChu || null,
      TrangThai: r.TrangThai || 'ChoDuyet',
      MaNguoiDung_Admin: r.MaNguoiDung_Admin,
      TaiKhoanAdmin: r.TaiKhoanAdmin || null,
      EmailAdmin: r.EmailAdmin || null,
      NgayDuyet: r.NgayDuyet,
      ChiTiet: detailsByImportId.get(r.MaPhieuNhap) || []
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách phiếu nhập kho thành công',
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWarehouseVariants,
  getWarehouseStockList,
  getAdjustRequests,
  importInventory,
  createAdjustRequest,
  getImportReceipts
};
