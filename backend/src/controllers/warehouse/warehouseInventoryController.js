const { pool } = require('../../../config/db');

/**
 * 0a. GET /api/v1/warehouse/inventory/stock-list
 * Lấy toàn bộ danh sách sản phẩm kèm TonKho thực tế từ bảng `sanpham` (bao gồm cả DangBan, HetHang, NgungBan)
 * dành cho Nhân viên Kho (Role 3) và Admin (Role 1).
 */
const getWarehouseStockList = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         sp.MaSanPham,
         sp.TenSanPham,
         sp.Anh,
         sp.Gia,
         COALESCE(sp.TonKho, 0) AS TonKho,
         sp.DungLuong,
         sp.MauSac,
         sp.TrangThai,
         sp.MaLoaiSanPham,
         lsp.TenLoaiSanPham,
         sp.MaNhaSanXuat,
         nsx.TenNhaSanXuat
       FROM sanpham sp
       LEFT JOIN loaisanpham lsp ON sp.MaLoaiSanPham = lsp.MaLoaiSanPham
       LEFT JOIN nhasanxuat nsx ON sp.MaNhaSanXuat = nsx.MaNhaSanXuat
       ORDER BY sp.MaSanPham DESC`
    );

    const data = rows.map((item) => {
      const tonKho = Number(item.TonKho) || 0;
      let trangThaiTonKho = 'Hết hàng';
      if (tonKho >= 5) {
        trangThaiTonKho = 'Còn hàng';
      } else if (tonKho > 0) {
        trangThaiTonKho = 'Sắp hết';
      }

      return {
        MaSanPham: item.MaSanPham,
        TenSanPham: item.TenSanPham,
        Anh: item.Anh || null,
        Gia: Number(item.Gia) || 0,
        TonKho: tonKho,
        DungLuong: item.DungLuong || null,
        MauSac: item.MauSac || null,
        TrangThai: item.TrangThai,
        TrangThaiTonKho: trangThaiTonKho,
        MaLoaiSanPham: item.MaLoaiSanPham || null,
        TenLoaiSanPham: item.TenLoaiSanPham || null,
        MaNhaSanXuat: item.MaNhaSanXuat || null,
        TenNhaSanXuat: item.TenNhaSanXuat || null
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách tồn kho thành công',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 0b. GET /api/v1/warehouse/inventory/adjust-requests
 * Lấy danh sách phiếu đề nghị điều chỉnh lệch kho từ bảng `phieudieuchinhkho`
 * dành cho Nhân viên Kho (Role 3) và Admin (Role 1).
 */
const getAdjustRequests = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         p.MaPhieuAdjust,
         p.MaSanPham,
         sp.TenSanPham,
         sp.Anh AS AnhSanPham,
         COALESCE(sp.TonKho, 0) AS TonKhoHeThong,
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
       LEFT JOIN sanpham sp ON p.MaSanPham = sp.MaSanPham
       LEFT JOIN nguoidung uk ON p.MaNguoiDung_Kho = uk.MaNguoiDung
       LEFT JOIN nguoidung ua ON p.MaNguoiDung_Admin = ua.MaNguoiDung
       ORDER BY p.NgayTao DESC, p.MaPhieuAdjust DESC`
    );

    const data = rows.map((row) => ({
      MaPhieuAdjust: row.MaPhieuAdjust,
      MaSanPham: row.MaSanPham,
      TenSanPham: row.TenSanPham || `Sản phẩm #${row.MaSanPham}`,
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
 * Nhập kho thực tế dành cho Nhân viên Kho (Role 3) và Admin (Role 1):
 * - Chèn 1 record vào bảng `phieunhapkho` (MaNhaSanXuat, MaNguoiDung, TongTienNhap, GhiChu).
 * - Chèn các record chi tiết vào bảng `chitietphieunhap` (MaPhieuNhap, MaSanPham, SoLuongNhap, DonGiaNhap).
 * - Tự động UPDATE `sanpham` SET `TonKho = TonKho + SoLuongNhap` WHERE `MaSanPham = ...`
 *   (và khôi phục `TrangThai = 'DangBan'` nếu sản phẩm trước đó ở trạng thái `'HetHang'`).
 * - Ghi lịch sử vào bảng `lichsutonkho` với `LoaiBienDong = 'NhapKho'`.
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

    // Hỗ trợ danh sách chi tiết hoặc dữ liệu 1 sản phẩm trực tiếp ở root body
    let rawDetails =
      body.ChiTietPhieuNhap ||
      body.chiTietPhieuNhap ||
      body.items ||
      body.chiTiet ||
      body.details;

    if (
      rawDetails === undefined &&
      (body.MaSanPham !== undefined || body.maSanPham !== undefined)
    ) {
      rawDetails = [
        {
          MaSanPham: body.MaSanPham ?? body.maSanPham,
          SoLuongNhap: body.SoLuongNhap ?? body.soLuongNhap ?? body.SoLuong ?? body.soLuong,
          DonGiaNhap: body.DonGiaNhap ?? body.donGiaNhap ?? body.GiaNhap ?? body.giaNhap
        }
      ];
    }

    if (!Array.isArray(rawDetails) || rawDetails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách chi tiết phiếu nhập kho không được để trống'
      });
    }

    const normalizedItems = [];
    for (let i = 0; i < rawDetails.length; i++) {
      const item = rawDetails[i] || {};
      const maSanPham = Number(item.MaSanPham ?? item.maSanPham);
      const soLuongNhap = Number(
        item.SoLuongNhap ?? item.soLuongNhap ?? item.SoLuong ?? item.soLuong
      );
      const donGiaNhap = Number(
        item.DonGiaNhap ?? item.donGiaNhap ?? item.GiaNhap ?? item.giaNhap
      );

      if (!Number.isInteger(maSanPham) || maSanPham <= 0) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ở vị trí ${i + 1} không có Mã sản phẩm hợp lệ`
        });
      }

      if (!Number.isInteger(soLuongNhap) || soLuongNhap <= 0) {
        return res.status(400).json({
          success: false,
          message: `Số lượng nhập phải là số nguyên lớn hơn 0 (sản phẩm mã ${maSanPham})`
        });
      }

      if (!Number.isFinite(donGiaNhap) || donGiaNhap < 1000000) {
        return res.status(400).json({
          success: false,
          message: 'Đơn giá nhập tối thiểu là 1.000.000đ'
        });
      }

      normalizedItems.push({ maSanPham, soLuongNhap, donGiaNhap });
    }

    const tongTienNhap = normalizedItems.reduce(
      (sum, item) => sum + item.soLuongNhap * item.donGiaNhap,
      0
    );

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Kiểm tra Nhà sản xuất nếu được cung cấp
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

    // Kiểm tra trước sự tồn tại của sản phẩm và so sánh DonGiaNhap < Gia
    const validatedProducts = new Map();
    for (const item of normalizedItems) {
      const [spRows] = await connection.query(
        `SELECT MaSanPham, TenSanPham, Gia, TonKho, TrangThai
         FROM sanpham
         WHERE MaSanPham = ?`,
        [item.maSanPham]
      );

      if (spRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `Sản phẩm có mã ${item.maSanPham} không tồn tại`
        });
      }

      const product = spRows[0];
      const productPrice = Number(product.Gia);

      // Validation quy định: DonGiaNhap < Gia (giá nhập phải thấp hơn giá bán niêm yết)
      if (item.donGiaNhap >= productPrice) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Đơn giá nhập (${item.donGiaNhap.toLocaleString('vi-VN')}đ) phải nhỏ hơn giá bán niêm yết (${productPrice.toLocaleString('vi-VN')}đ) của sản phẩm "${product.TenSanPham}"`
        });
      }

      validatedProducts.set(item.maSanPham, product);
    }

    // 1. Chèn record vào bảng phieunhapkho với TrangThai = 'ChoDuyet' (CHƯA cộng TonKho)
    const [phieuResult] = await connection.query(
      `INSERT INTO phieunhapkho (MaNhaSanXuat, MaNguoiDung, TongTienNhap, GhiChu, TrangThai)
       VALUES (?, ?, ?, ?, 'ChoDuyet')`,
      [maNhaSanXuat, userId, tongTienNhap, ghiChu]
    );

    const maPhieuNhap = phieuResult.insertId;
    const processedItems = [];

    // 2. Chèn record vào bảng chitietphieunhap (KHÔNG cập nhật sanpham.TonKho và KHÔNG ghi lichsutonkho lúc này)
    for (const item of normalizedItems) {
      const product = validatedProducts.get(item.maSanPham);

      const [detailResult] = await connection.query(
        `INSERT INTO chitietphieunhap (MaPhieuNhap, MaSanPham, SoLuongNhap, DonGiaNhap)
         VALUES (?, ?, ?, ?)`,
        [maPhieuNhap, item.maSanPham, item.soLuongNhap, item.donGiaNhap]
      );

      processedItems.push({
        MaChiTietNhap: detailResult.insertId,
        MaSanPham: item.maSanPham,
        TenSanPham: product.TenSanPham,
        SoLuongNhap: item.soLuongNhap,
        DonGiaNhap: item.donGiaNhap,
        ThanhTien: item.soLuongNhap * item.donGiaNhap,
        TonKhoHienTai: Number(product.TonKho) || 0
      });
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Tạo phiếu nhập kho thành công. Phiếu đang ở trạng thái Chờ duyệt bởi Admin.',
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
 * Lập phiếu đề nghị điều chỉnh lệch kho gửi Admin chờ duyệt:
 * - Bắt buộc nhận: { maSanPham, soLuongThucTe, soLuongChechLech, lyDoGiaiTrinh }.
 * - Chèn record vào bảng `phieudieuchinhkho` với TrangThai = 'ChoDuyet', MaNguoiDung_Kho = req.user.MaNguoiDung.
 * - KHÔNG thay đổi cột `TonKho` trong bảng `sanpham`.
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

    const rawMaSanPham = body.maSanPham ?? body.MaSanPham;
    const rawSoLuongThucTe = body.soLuongThucTe ?? body.SoLuongThucTe;
    const rawSoLuongChechLech = body.soLuongChechLech ?? body.SoLuongChechLech;
    const rawLyDoGiaiTrinh = body.lyDoGiaiTrinh ?? body.LyDoGiaiTrinh;

    if (
      rawMaSanPham === undefined ||
      rawMaSanPham === null ||
      String(rawMaSanPham).trim() === '' ||
      rawSoLuongThucTe === undefined ||
      rawSoLuongThucTe === null ||
      String(rawSoLuongThucTe).trim() === '' ||
      rawSoLuongChechLech === undefined ||
      rawSoLuongChechLech === null ||
      String(rawSoLuongChechLech).trim() === '' ||
      rawLyDoGiaiTrinh === undefined ||
      rawLyDoGiaiTrinh === null ||
      String(rawLyDoGiaiTrinh).trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: maSanPham, soLuongThucTe, soLuongChechLech, lyDoGiaiTrinh'
      });
    }

    const maSanPham = Number(rawMaSanPham);
    if (!Number.isInteger(maSanPham) || maSanPham <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã sản phẩm không hợp lệ'
      });
    }

    const soLuongThucTe = Number(rawSoLuongThucTe);
    if (!Number.isInteger(soLuongThucTe) || soLuongThucTe < 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng thực tế phải là số nguyên không âm'
      });
    }

    const soLuongChechLech = Number(rawSoLuongChechLech);
    if (!Number.isInteger(soLuongChechLech)) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng chênh lệch phải là số nguyên hợp lệ'
      });
    }

    const lyDoGiaiTrinh = String(rawLyDoGiaiTrinh).trim();

    // Kiểm tra sản phẩm có tồn tại trong hệ thống (không thay đổi TonKho)
    const [spRows] = await pool.query(
      `SELECT MaSanPham, TenSanPham, TonKho FROM sanpham WHERE MaSanPham = ?`,
      [maSanPham]
    );

    if (spRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Sản phẩm có mã ${maSanPham} không tồn tại`
      });
    }

    const [insertResult] = await pool.query(
      `INSERT INTO phieudieuchinhkho
         (MaSanPham, MaNguoiDung_Kho, SoLuongThucTe, SoLuongChechLech, LyDoGiaiTrinh, TrangThai)
       VALUES (?, ?, ?, ?, ?, 'ChoDuyet')`,
      [maSanPham, maNguoiDungKho, soLuongThucTe, soLuongChechLech, lyDoGiaiTrinh]
    );

    const [createdRows] = await pool.query(
      `SELECT
         p.MaPhieuAdjust,
         p.MaSanPham,
         sp.TenSanPham,
         sp.TonKho AS TonKhoHeThong,
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
       LEFT JOIN sanpham sp ON p.MaSanPham = sp.MaSanPham
       WHERE p.MaPhieuAdjust = ?`,
      [insertResult.insertId]
    );

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
 * Lấy danh sách phiếu nhập kho kèm chi tiết các sản phẩm
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
         sp.TenSanPham,
         sp.Anh,
         sp.DungLuong,
         sp.MauSac,
         sp.Gia,
         COALESCE(sp.TonKho, 0) AS TonKhoHienTai,
         ct.SoLuongNhap,
         ct.DonGiaNhap,
         (ct.SoLuongNhap * ct.DonGiaNhap) AS ThanhTien
       FROM chitietphieunhap ct
       LEFT JOIN sanpham sp ON ct.MaSanPham = sp.MaSanPham
       WHERE ct.MaPhieuNhap IN (?)
       ORDER BY ct.MaChiTietNhap ASC`,
      [importIds]
    );

    const detailsByImportId = new Map();
    for (const d of details) {
      if (!detailsByImportId.has(d.MaPhieuNhap)) {
        detailsByImportId.set(d.MaPhieuNhap, []);
      }
      detailsByImportId.get(d.MaPhieuNhap).push({
        MaChiTietNhap: d.MaChiTietNhap,
        MaSanPham: d.MaSanPham,
        TenSanPham: d.TenSanPham || `Sản phẩm #${d.MaSanPham}`,
        Anh: d.Anh || null,
        DungLuong: d.DungLuong || null,
        MauSac: d.MauSac || null,
        Gia: Number(d.Gia) || 0,
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
  getWarehouseStockList,
  getAdjustRequests,
  importInventory,
  createAdjustRequest,
  getImportReceipts
};

