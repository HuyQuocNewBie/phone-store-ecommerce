const { pool } = require('../../../config/db');
const { formatOrderCode } = require('../../utils/formatters');

const VALID_APPROVAL_ACTIONS = ['Approve', 'Reject'];

/**
 * Helper: format 1 bản ghi phiếu điều chỉnh kho kèm thông tin sản phẩm & nhân viên
 */
const formatAdjustmentRecord = (row) => ({
  MaPhieuAdjust: row.MaPhieuAdjust,
  MaSanPham: row.MaSanPham,
  TenSanPham: row.TenSanPham || null,
  TonKhoHienTai: row.TonKho !== null && row.TonKho !== undefined ? Number(row.TonKho) : null,
  TrangThaiSanPham: row.TrangThaiSanPham || null,
  MaNguoiDung_Kho: row.MaNguoiDung_Kho,
  NguoiTaoKho: row.TaiKhoanKho || null,
  SoLuongThucTe: Number(row.SoLuongThucTe),
  SoLuongChechLech: Number(row.SoLuongChechLech),
  LyDoGiaiTrinh: row.LyDoGiaiTrinh,
  TrangThai: row.TrangThai,
  MaNguoiDung_Admin: row.MaNguoiDung_Admin,
  NguoiDuyetAdmin: row.TaiKhoanAdmin || null,
  NgayTao: row.NgayTao,
  NgayDuyet: row.NgayDuyet
});

/**
 * Helper: format 1 bản ghi phiếu đổi trả kèm thông tin đơn hàng, sản phẩm & khách hàng
 */
const formatReturnRecord = (row) => ({
  MaPhieuDoiTra: row.MaPhieuDoiTra,
  MaDonHang: row.MaDonHang,
  CodeDonHang: formatOrderCode(row.MaDonHang, row.NgayMuaHang),
  MaSanPham: row.MaSanPham,
  TenSanPham: row.TenSanPham || null,
  MaNguoiDung_User: row.MaNguoiDung_User,
  TaiKhoan: row.TaiKhoan || null,
  Email: row.Email || null,
  LyDo: row.LyDo,
  HinhAnhProof: row.HinhAnhProof,
  KetQuaKiemDinh: row.KetQuaKiemDinh,
  GhiChuKho: row.GhiChuKho,
  TrangThaiHoanTien: row.TrangThaiHoanTien,
  TrangThaiDonHang: row.TrangThaiDonHang,
  TongTien: row.TongTien !== null && row.TongTien !== undefined ? Number(row.TongTien) : null,
  NgayTao: row.NgayTao,
  NgayCapNhat: row.NgayCapNhat
});

/**
 * 1. PUT /api/v1/admin/inventory/adjustments/:id/approve
 * Admin phê duyệt hoặc từ chối phiếu báo lệch kho:
 * - Nhận Body: { hanhDong: 'Approve' | 'Reject' }.
 * - NẾU Approve:
 *   + UPDATE phieudieuchinhkho SET TrangThai = 'DaDuyet', MaNguoiDung_Admin = req.user.MaNguoiDung, NgayDuyet = NOW().
 *   + UPDATE sanpham SET TonKho = SoLuongThucTe WHERE MaSanPham = ...
 *   + Ghi log vào lichsutonkho với LoaiBienDong = 'CapNhatThuCong'.
 * - NẾU Reject:
 *   + UPDATE phieudieuchinhkho SET TrangThai = 'TuChoi', MaNguoiDung_Admin = req.user.MaNguoiDung, NgayDuyet = NOW().
 */
const approveInventoryAdjustment = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    const adjustmentId = Number(id);

    if (!id || !Number.isInteger(adjustmentId) || adjustmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã phiếu điều chỉnh kho không hợp lệ'
      });
    }

    const adminId = req.user ? (req.user.MaNguoiDung || req.user.id) : null;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin Admin thực hiện'
      });
    }

    const body = req.body || {};
    const rawHanhDong = body.hanhDong ?? body.HanhDong;
    const hanhDong =
      rawHanhDong !== undefined && rawHanhDong !== null ? String(rawHanhDong).trim() : '';

    if (!hanhDong || !VALID_APPROVAL_ACTIONS.includes(hanhDong)) {
      return res.status(400).json({
        success: false,
        message: "Hành động (hanhDong) không hợp lệ. Chỉ chấp nhận 'Approve' hoặc 'Reject'"
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Khóa dòng phiếu điều chỉnh kho để tránh duyệt đồng thời
    const [adjustRows] = await connection.query(
      `SELECT
         MaPhieuAdjust,
         MaSanPham,
         MaNguoiDung_Kho,
         SoLuongThucTe,
         SoLuongChechLech,
         LyDoGiaiTrinh,
         TrangThai,
         MaNguoiDung_Admin,
         NgayTao,
         NgayDuyet
       FROM phieudieuchinhkho
       WHERE MaPhieuAdjust = ?
       FOR UPDATE`,
      [adjustmentId]
    );

    if (adjustRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Phiếu điều chỉnh kho không tồn tại'
      });
    }

    const adjustment = adjustRows[0];

    if (adjustment.TrangThai !== 'ChoDuyet') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Phiếu điều chỉnh kho đã được xử lý ('${adjustment.TrangThai}'), không thể thao tác lại`
      });
    }

    let tonKhoTruoc = null;
    let tonKhoMoi = null;
    let soLuongThayDoi = null;

    if (hanhDong === 'Approve') {
      // Khóa dòng sản phẩm để cập nhật tồn kho an toàn
      const [productRows] = await connection.query(
        `SELECT MaSanPham, TenSanPham, TonKho, TrangThai
         FROM sanpham
         WHERE MaSanPham = ?
         FOR UPDATE`,
        [adjustment.MaSanPham]
      );

      if (productRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `Sản phẩm có mã ${adjustment.MaSanPham} không tồn tại`
        });
      }

      const product = productRows[0];
      tonKhoTruoc = Number(product.TonKho) || 0;
      tonKhoMoi = Number(adjustment.SoLuongThucTe);

      if (!Number.isInteger(tonKhoMoi) || tonKhoMoi < 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Số lượng thực tế trong phiếu điều chỉnh không hợp lệ'
        });
      }

      soLuongThayDoi = tonKhoMoi - tonKhoTruoc;

      // 1. UPDATE phieudieuchinhkho SET TrangThai = 'DaDuyet', MaNguoiDung_Admin, NgayDuyet = NOW()
      await connection.query(
        `UPDATE phieudieuchinhkho
         SET TrangThai = 'DaDuyet',
             MaNguoiDung_Admin = ?,
             NgayDuyet = NOW()
         WHERE MaPhieuAdjust = ?`,
        [adminId, adjustmentId]
      );

      // 2. UPDATE sanpham SET TonKho = SoLuongThucTe WHERE MaSanPham = ...
      let nextProductStatus = product.TrangThai;
      if (tonKhoMoi <= 0 && product.TrangThai === 'DangBan') {
        nextProductStatus = 'HetHang';
      } else if (tonKhoMoi > 0 && product.TrangThai === 'HetHang') {
        nextProductStatus = 'DangBan';
      }

      await connection.query(
        `UPDATE sanpham
         SET TonKho = ?, TrangThai = ?
         WHERE MaSanPham = ?`,
        [tonKhoMoi, nextProductStatus, adjustment.MaSanPham]
      );

      // 3. Ghi log vào lichsutonkho với LoaiBienDong = 'CapNhatThuCong'
      const logNote = `Admin duyệt phiếu điều chỉnh kho #${adjustmentId}: ${adjustment.LyDoGiaiTrinh}`;
      await connection.query(
        `INSERT INTO lichsutonkho
           (MaSanPham, LoaiBienDong, SoLuongThayDoi, TonThucTeSauDoi, MaThamChieu, NgayThucHien, GhiChu)
         VALUES (?, 'CapNhatThuCong', ?, ?, ?, NOW(), ?)`,
        [adjustment.MaSanPham, soLuongThayDoi, tonKhoMoi, adjustmentId, logNote]
      );
    } else {
      // Trường hợp Reject: cập nhật TrangThai = 'TuChoi', giữ nguyên TonKho của sanpham
      await connection.query(
        `UPDATE phieudieuchinhkho
         SET TrangThai = 'TuChoi',
             MaNguoiDung_Admin = ?,
             NgayDuyet = NOW()
         WHERE MaPhieuAdjust = ?`,
        [adminId, adjustmentId]
      );
    }

    await connection.commit();

    const [updatedRows] = await pool.query(
      `SELECT
         p.MaPhieuAdjust,
         p.MaSanPham,
         sp.TenSanPham,
         sp.TonKho,
         sp.TrangThai AS TrangThaiSanPham,
         p.MaNguoiDung_Kho,
         uk.TaiKhoan AS TaiKhoanKho,
         p.SoLuongThucTe,
         p.SoLuongChechLech,
         p.LyDoGiaiTrinh,
         p.TrangThai,
         p.MaNguoiDung_Admin,
         ua.TaiKhoan AS TaiKhoanAdmin,
         p.NgayTao,
         p.NgayDuyet
       FROM phieudieuchinhkho p
       LEFT JOIN sanpham sp ON p.MaSanPham = sp.MaSanPham
       LEFT JOIN nguoidung uk ON p.MaNguoiDung_Kho = uk.MaNguoiDung
       LEFT JOIN nguoidung ua ON p.MaNguoiDung_Admin = ua.MaNguoiDung
       WHERE p.MaPhieuAdjust = ?`,
      [adjustmentId]
    );

    const responseData = formatAdjustmentRecord(updatedRows[0]);
    if (hanhDong === 'Approve') {
      responseData.TonKhoTruoc = tonKhoTruoc;
      responseData.TonKhoMoi = tonKhoMoi;
      responseData.SoLuongThayDoi = soLuongThayDoi;
    }

    return res.status(200).json({
      success: true,
      message:
        hanhDong === 'Approve'
          ? 'Phê duyệt phiếu điều chỉnh kho và cập nhật tồn kho thành công'
          : 'Từ chối phiếu điều chỉnh kho thành công',
      data: responseData
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
 * 2. POST /api/v1/admin/returns/:id/refund
 * Admin xác nhận hoàn tiền cho phiếu đổi trả:
 * - Kiểm tra phieudoitra có KetQuaKiemDinh = 'Dat'.
 * - UPDATE phieudoitra SET TrangThaiHoanTien = 'DaHoanTien'.
 * - UPDATE donhang SET TrangThaiDonHang = 'DaHoanTien' WHERE MaDonHang = ...
 * - Đồng bộ lichsumuahang SET TrangThai = 'DaHoanTien' WHERE MaDonHang = ...
 */
const confirmReturnRefund = async (req, res, next) => {
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

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Khóa bản ghi phieudoitra
    const [returnRows] = await connection.query(
      `SELECT
         MaPhieuDoiTra,
         MaDonHang,
         MaSanPham,
         MaNguoiDung_User,
         LyDo,
         HinhAnhProof,
         KetQuaKiemDinh,
         GhiChuKho,
         TrangThaiHoanTien,
         NgayTao,
         NgayCapNhat
       FROM phieudoitra
       WHERE MaPhieuDoiTra = ?
       FOR UPDATE`,
      [returnId]
    );

    if (returnRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Phiếu đổi trả không tồn tại'
      });
    }

    const returnRecord = returnRows[0];

    if (returnRecord.TrangThaiHoanTien !== 'ChoDuyet') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Phiếu đổi trả đã được xử lý ('${returnRecord.TrangThaiHoanTien}'), không thể xác nhận hoàn tiền lại`
      });
    }

    if (returnRecord.KetQuaKiemDinh !== 'Dat') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Chỉ có thể xác nhận hoàn tiền khi phiếu đổi trả có kết quả kiểm định 'Dat'. Kết quả hiện tại: '${returnRecord.KetQuaKiemDinh}'`
      });
    }

    // Khóa đơn hàng liên kết
    const [orderRows] = await connection.query(
      `SELECT MaDonHang, NgayMuaHang, TrangThaiDonHang, TongTien
       FROM donhang
       WHERE MaDonHang = ?
       FOR UPDATE`,
      [returnRecord.MaDonHang]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: `Đơn hàng mã #${returnRecord.MaDonHang} không tồn tại`
      });
    }

    // 1. UPDATE phieudoitra SET TrangThaiHoanTien = 'DaHoanTien'
    await connection.query(
      `UPDATE phieudoitra
       SET TrangThaiHoanTien = 'DaHoanTien'
       WHERE MaPhieuDoiTra = ?`,
      [returnId]
    );

    // 2. UPDATE donhang SET TrangThaiDonHang = 'DaHoanTien' WHERE MaDonHang = ...
    await connection.query(
      `UPDATE donhang
       SET TrangThaiDonHang = 'DaHoanTien'
       WHERE MaDonHang = ?`,
      [returnRecord.MaDonHang]
    );

    // Đồng bộ trạng thái trên bảng lịch sử mua hàng (nếu có)
    await connection.query(
      `UPDATE lichsumuahang
       SET TrangThai = 'DaHoanTien'
       WHERE MaDonHang = ?`,
      [returnRecord.MaDonHang]
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
         sp.TenSanPham,
         u.TaiKhoan,
         u.Email
       FROM phieudoitra p
       JOIN donhang d ON p.MaDonHang = d.MaDonHang
       JOIN sanpham sp ON p.MaSanPham = sp.MaSanPham
       JOIN nguoidung u ON p.MaNguoiDung_User = u.MaNguoiDung
       WHERE p.MaPhieuDoiTra = ?`,
      [returnId]
    );

    return res.status(200).json({
      success: true,
      message: 'Xác nhận hoàn tiền thành công',
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
  approveInventoryAdjustment,
  confirmReturnRefund
};

