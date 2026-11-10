const { pool } = require('../../../config/db');
const { formatOrderCode } = require('../../utils/formatters');

const VALID_INSPECT_RESULTS = ['Dat', 'Loi_KhongDat'];
const VALID_FILTER_RESULTS = ['ChoKiemDinh', 'Dat', 'Loi_KhongDat'];

/**
 * Helper: chuẩn hóa HinhAnhProof thành mảng URL
 */
const parseProofImages = (rawProof) => {
  if (!rawProof) return [];
  try {
    const parsed = JSON.parse(rawProof);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Không phải JSON array -> xử lý như URL đơn hoặc danh sách phân tách dấu phẩy
  }
  return String(rawProof)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

/**
 * Helper: format 1 bản ghi phiếu đổi trả kèm thông tin donhang, sanpham, nguoidung
 */
const formatReturnRecord = (row) => ({
  MaPhieuDoiTra: row.MaPhieuDoiTra,
  MaDonHang: row.MaDonHang,
  CodeDonHang: formatOrderCode(row.MaDonHang, row.NgayMuaHang),
  MaSanPham: row.MaSanPham,
  MaNguoiDung_User: row.MaNguoiDung_User,
  LyDo: row.LyDo,
  HinhAnhProof: row.HinhAnhProof,
  HinhAnhProofList: parseProofImages(row.HinhAnhProof),
  KetQuaKiemDinh: row.KetQuaKiemDinh,
  GhiChuKho: row.GhiChuKho,
  TrangThaiHoanTien: row.TrangThaiHoanTien,
  NgayTao: row.NgayTao,
  NgayCapNhat: row.NgayCapNhat,
  TrangThaiDonHang: row.TrangThaiDonHang,
  TongTien: Number(row.TongTien),
  TenSanPham: row.TenSanPham,
  AnhSanPham: row.AnhSanPham,
  GiaSanPham: Number(row.GiaSanPham),
  TenKhachHang: row.TenNguoiNhan || row.TaiKhoan,
  TaiKhoan: row.TaiKhoan,
  Email: row.Email,
  SoDienThoai: row.SoDienThoaiDonHang || row.SoDienThoaiUser || null,
  donhang: {
    MaDonHang: row.MaDonHang,
    CodeDonHang: formatOrderCode(row.MaDonHang, row.NgayMuaHang),
    NgayMuaHang: row.NgayMuaHang,
    TrangThaiDonHang: row.TrangThaiDonHang,
    TongTien: Number(row.TongTien),
    TenNguoiNhan: row.TenNguoiNhan,
    SoDienThoai: row.SoDienThoaiDonHang,
    DiaChiGiaoHang: row.DiaChiGiaoHang
  },
  sanpham: {
    MaSanPham: row.MaSanPham,
    TenSanPham: row.TenSanPham,
    Anh: row.AnhSanPham,
    Gia: Number(row.GiaSanPham),
    DungLuong: row.DungLuong,
    MauSac: row.MauSac
  },
  nguoidung: {
    MaNguoiDung: row.MaNguoiDung_User,
    TaiKhoan: row.TaiKhoan,
    Email: row.Email,
    SoDienThoai: row.SoDienThoaiUser,
    AnhDaiDien: row.AnhDaiDien
  }
});

/**
 * 1. GET /api/v1/warehouse/returns
 * Lấy danh sách phiếu đổi trả JOIN với bảng `donhang`, `sanpham`, `nguoidung`.
 * Hỗ trợ query lọc tùy chọn: ?ketQua=ChoKiemDinh|Dat|Loi_KhongDat
 */
const getReturns = async (req, res, next) => {
  try {
    const rawFilter = req.query.ketQua ?? req.query.ketQuaKiemDinh ?? req.query.status;
    const filterValue = rawFilter !== undefined && rawFilter !== null ? String(rawFilter).trim() : '';

    let whereClause = '';
    const queryParams = [];

    if (filterValue && filterValue.toLowerCase() !== 'all') {
      if (!VALID_FILTER_RESULTS.includes(filterValue)) {
        return res.status(400).json({
          success: false,
          message: "Tham số lọc ketQua không hợp lệ. Chỉ chấp nhận 'ChoKiemDinh', 'Dat' hoặc 'Loi_KhongDat'"
        });
      }
      whereClause = 'WHERE p.KetQuaKiemDinh = ?';
      queryParams.push(filterValue);
    }

    const [rows] = await pool.query(
      `SELECT
         p.MaPhieuDoiTra,
         p.MaDonHang,
         p.MaSanPham,
         p.MaNguoiDung_User,
         p.LyDo,
         p.HinhAnhProof,
         p.KetQuaKiemDinh,
         p.GhiChuKho,
         p.TrangThaiHoanTien,
         p.NgayTao,
         p.NgayCapNhat,
         d.NgayMuaHang,
         d.TrangThaiDonHang,
         d.TongTien,
         d.TenNguoiNhan,
         d.SoDienThoai AS SoDienThoaiDonHang,
         d.DiaChiGiaoHang,
         sp.TenSanPham,
         sp.Anh AS AnhSanPham,
         sp.Gia AS GiaSanPham,
         sp.DungLuong,
         sp.MauSac,
         u.TaiKhoan,
         u.Email,
         u.SoDienThoai AS SoDienThoaiUser,
         u.AnhDaiDien
       FROM phieudoitra p
       JOIN donhang d ON p.MaDonHang = d.MaDonHang
       JOIN sanpham sp ON p.MaSanPham = sp.MaSanPham
       JOIN nguoidung u ON p.MaNguoiDung_User = u.MaNguoiDung
       ${whereClause}
       ORDER BY p.NgayTao DESC, p.MaPhieuDoiTra DESC`,
      queryParams
    );

    const formattedData = rows.map(formatReturnRecord);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách phiếu đổi trả thành công',
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. PUT /api/v1/warehouse/returns/:id/inspect
 * Nhân viên Kho kiểm định hàng trả về:
 * - Bắt buộc nhận `{ ketQua: 'Dat' | 'Loi_KhongDat', ghiChuKho }`.
 * - Cập nhật `phieudoitra` SET `KetQuaKiemDinh = ketQua`, `GhiChuKho = ghiChuKho`.
 */
const inspectReturn = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    const returnId = Number(id);

    if (!id || !Number.isInteger(returnId) || returnId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã phiếu đổi trả không hợp lệ'
      });
    }

    const body = req.body || {};
    const rawKetQua = body.ketQua ?? body.KetQua ?? body.KetQuaKiemDinh ?? body.ketQuaKiemDinh;
    const rawGhiChuKho = body.ghiChuKho ?? body.GhiChuKho;

    const ketQua = rawKetQua !== undefined && rawKetQua !== null ? String(rawKetQua).trim() : '';
    const ghiChuKho = rawGhiChuKho !== undefined && rawGhiChuKho !== null ? String(rawGhiChuKho).trim() : '';

    if (!ketQua || !VALID_INSPECT_RESULTS.includes(ketQua)) {
      return res.status(400).json({
        success: false,
        message: "Kết quả kiểm định (ketQua) không hợp lệ. Chỉ chấp nhận 'Dat' hoặc 'Loi_KhongDat'"
      });
    }

    if (!ghiChuKho) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập ghi chú kiểm định kho (ghiChuKho)'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      `SELECT MaPhieuDoiTra, KetQuaKiemDinh, TrangThaiHoanTien
       FROM phieudoitra
       WHERE MaPhieuDoiTra = ?
       FOR UPDATE`,
      [returnId]
    );

    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Phiếu đổi trả không tồn tại'
      });
    }

    const existing = existingRows[0];

    if (existing.TrangThaiHoanTien !== 'ChoDuyet') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Phiếu đổi trả đã được xử lý hoàn tiền ('${existing.TrangThaiHoanTien}'), không thể cập nhật kiểm định`
      });
    }

    await connection.query(
      `UPDATE phieudoitra
       SET KetQuaKiemDinh = ?, GhiChuKho = ?
       WHERE MaPhieuDoiTra = ?`,
      [ketQua, ghiChuKho, returnId]
    );

    await connection.commit();

    const [updatedRows] = await pool.query(
      `SELECT
         p.MaPhieuDoiTra,
         p.MaDonHang,
         p.MaSanPham,
         p.MaNguoiDung_User,
         p.LyDo,
         p.HinhAnhProof,
         p.KetQuaKiemDinh,
         p.GhiChuKho,
         p.TrangThaiHoanTien,
         p.NgayTao,
         p.NgayCapNhat,
         d.NgayMuaHang,
         d.TrangThaiDonHang,
         d.TongTien,
         d.TenNguoiNhan,
         d.SoDienThoai AS SoDienThoaiDonHang,
         d.DiaChiGiaoHang,
         sp.TenSanPham,
         sp.Anh AS AnhSanPham,
         sp.Gia AS GiaSanPham,
         sp.DungLuong,
         sp.MauSac,
         u.TaiKhoan,
         u.Email,
         u.SoDienThoai AS SoDienThoaiUser,
         u.AnhDaiDien
       FROM phieudoitra p
       JOIN donhang d ON p.MaDonHang = d.MaDonHang
       JOIN sanpham sp ON p.MaSanPham = sp.MaSanPham
       JOIN nguoidung u ON p.MaNguoiDung_User = u.MaNguoiDung
       WHERE p.MaPhieuDoiTra = ?`,
      [returnId]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật kết quả kiểm định phiếu đổi trả thành công',
      data: formatReturnRecord(updatedRows[0])
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

module.exports = {
  getReturns,
  inspectReturn
};

