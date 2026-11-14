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
  MaChiTietDonHang: row.MaChiTietDonHang || null,
  TenSanPham: row.TenSanPham || null,
  DungLuong:
    row.DungLuong && String(row.DungLuong).trim() !== ''
      ? String(row.DungLuong).trim()
      : null,
  MauSac:
    row.MauSac && String(row.MauSac).trim() !== ''
      ? String(row.MauSac).trim()
      : null,
  SoLuong: row.SoLuong !== null && row.SoLuong !== undefined ? Number(row.SoLuong) : null,
  DonGia: row.DonGia !== null && row.DonGia !== undefined ? Number(row.DonGia) : null,
  MaNguoiDung_User: row.MaNguoiDung_User,
  TaiKhoan: row.TaiKhoan || null,
  Email: row.Email || null,
  LyDo: row.LyDo,
  HinhAnhProof: row.HinhAnhProof,
  KetQuaKiemDinh: row.KetQuaKiemDinh,
  GhiChuKho: row.GhiChuKho,
  GhiChu:
    row.GhiChu && String(row.GhiChu).trim() !== ''
      ? String(row.GhiChu).trim()
      : null,
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
         ct.MaChiTietDonHang,
         ct.DungLuong,
         ct.MauSac,
         ct.SoLuong,
         ct.DonGia,
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
         d.GhiChu,
         sp.TenSanPham,
         u.TaiKhoan,
         u.Email
       FROM phieudoitra p
       JOIN donhang d ON p.MaDonHang = d.MaDonHang
       JOIN sanpham sp ON p.MaSanPham = sp.MaSanPham
       JOIN nguoidung u ON p.MaNguoiDung_User = u.MaNguoiDung
       LEFT JOIN chitietdonhang ct ON ct.MaChiTietDonHang = (
         SELECT ct2.MaChiTietDonHang
         FROM chitietdonhang ct2
         WHERE ct2.MaDonHang = p.MaDonHang AND ct2.MaSanPham = p.MaSanPham
         ORDER BY ct2.MaChiTietDonHang ASC
         LIMIT 1
       )
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

/**
 * 3. PUT /api/v1/admin/inventory/imports/:id/approve
 * Admin phê duyệt hoặc từ chối phiếu nhập kho:
 * - Nhận Body: { hanhDong: 'Approve' | 'Reject' } hoặc { action: 'Approve' | 'Reject' }.
 * - NẾU Approve:
 *   + UPDATE phieunhapkho SET TrangThai = 'DaDuyet', MaNguoiDung_Admin = req.user.MaNguoiDung, NgayDuyet = NOW().
 *   + Duyệt từng sản phẩm trong chitietphieunhap:
 *     * UPDATE sanpham SET TonKho = TonKho + SoLuongNhap WHERE MaSanPham = ...
 *     * Ghi log vào lichsutonkho với LoaiBienDong = 'NhapKho'.
 * - NẾU Reject:
 *   + UPDATE phieunhapkho SET TrangThai = 'TuChoi', MaNguoiDung_Admin = req.user.MaNguoiDung, NgayDuyet = NOW().
 *   + Giữ nguyên TonKho của sản phẩm, không ghi log biến động kho.
 */
const approveInventoryImport = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    const importId = Number(id);

    if (!id || !Number.isInteger(importId) || importId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã phiếu nhập kho không hợp lệ'
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
    const rawHanhDong = body.hanhDong ?? body.HanhDong ?? body.action ?? body.Action;
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

    // Khóa dòng phiếu nhập kho để tránh duyệt đồng thời
    const [importRows] = await connection.query(
      `SELECT
         MaPhieuNhap,
         MaNhaSanXuat,
         MaNguoiDung,
         NgayNhap,
         TongTienNhap,
         GhiChu,
         TrangThai,
         MaNguoiDung_Admin,
         NgayDuyet
       FROM phieunhapkho
       WHERE MaPhieuNhap = ?
       FOR UPDATE`,
      [importId]
    );

    if (importRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Phiếu nhập kho không tồn tại'
      });
    }

    const receipt = importRows[0];

    if (receipt.TrangThai !== 'ChoDuyet') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Phiếu nhập kho đã được xử lý ('${receipt.TrangThai}'), không thể thao tác lại`
      });
    }

    // Lấy chi tiết các sản phẩm trong phiếu nhập kho
    const [detailRows] = await connection.query(
      `SELECT
         MaChiTietNhap,
         MaPhieuNhap,
         MaSanPham,
         SoLuongNhap,
         DonGiaNhap
       FROM chitietphieunhap
       WHERE MaPhieuNhap = ?`,
      [importId]
    );

    if (detailRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Phiếu nhập kho không có chi tiết sản phẩm hợp lệ'
      });
    }

    const updatedProductDetails = [];

    if (hanhDong === 'Approve') {
      for (const item of detailRows) {
        const maSanPham = Number(item.MaSanPham);
        const soLuongNhap = Number(item.SoLuongNhap);

        // Khóa dòng sản phẩm để cập nhật tồn kho an toàn
        const [spRows] = await connection.query(
          `SELECT MaSanPham, TenSanPham, TonKho, TrangThai
           FROM sanpham
           WHERE MaSanPham = ?
           FOR UPDATE`,
          [maSanPham]
        );

        if (spRows.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: `Sản phẩm có mã ${maSanPham} không tồn tại`
          });
        }

        const product = spRows[0];
        const tonKhoTruoc = Number(product.TonKho) || 0;
        const tonKhoMoi = tonKhoTruoc + soLuongNhap;

        let nextStatus = product.TrangThai;
        if (product.TrangThai === 'HetHang' && tonKhoMoi > 0) {
          nextStatus = 'DangBan';
        }

        // 1. UPDATE sanpham SET TonKho = TonKho + SoLuongNhap WHERE MaSanPham = ...
        await connection.query(
          `UPDATE sanpham
           SET TonKho = ?, TrangThai = ?
           WHERE MaSanPham = ?`,
          [tonKhoMoi, nextStatus, maSanPham]
        );

        // 2. Ghi nhật ký vào bảng lichsutonkho với LoaiBienDong = 'NhapKho'
        const logNote = receipt.GhiChu
          ? `Admin duyệt phiếu nhập kho #${importId}: ${receipt.GhiChu}`
          : `Admin duyệt phiếu nhập kho #${importId}`;

        await connection.query(
          `INSERT INTO lichsutonkho
             (MaSanPham, LoaiBienDong, SoLuongThayDoi, TonThucTeSauDoi, MaThamChieu, NgayThucHien, GhiChu)
           VALUES (?, 'NhapKho', ?, ?, ?, NOW(), ?)`,
          [maSanPham, soLuongNhap, tonKhoMoi, importId, logNote]
        );

        updatedProductDetails.push({
          MaSanPham: maSanPham,
          TenSanPham: product.TenSanPham,
          SoLuongNhap: soLuongNhap,
          DonGiaNhap: Number(item.DonGiaNhap),
          TonKhoTruoc: tonKhoTruoc,
          TonKhoMoi: tonKhoMoi
        });
      }

      // 3. UPDATE phieunhapkho SET TrangThai = 'DaDuyet', MaNguoiDung_Admin, NgayDuyet = NOW()
      await connection.query(
        `UPDATE phieunhapkho
         SET TrangThai = 'DaDuyet',
             MaNguoiDung_Admin = ?,
             NgayDuyet = NOW()
         WHERE MaPhieuNhap = ?`,
        [adminId, importId]
      );
    } else {
      // Trường hợp Reject: Cập nhật TrangThai = 'TuChoi', giữ nguyên tồn kho sanpham
      await connection.query(
        `UPDATE phieunhapkho
         SET TrangThai = 'TuChoi',
             MaNguoiDung_Admin = ?,
             NgayDuyet = NOW()
         WHERE MaPhieuNhap = ?`,
        [adminId, importId]
      );
    }

    await connection.commit();

    // Lấy thông tin phiếu sau khi cập nhật
    const [resultRows] = await pool.query(
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
       WHERE p.MaPhieuNhap = ?`,
      [importId]
    );

    const updatedRecord = resultRows[0] || {};
    updatedRecord.TongTienNhap = Number(updatedRecord.TongTienNhap) || 0;
    if (hanhDong === 'Approve') {
      updatedRecord.ChiTietCapNhat = updatedProductDetails;
    }

    return res.status(200).json({
      success: true,
      message:
        hanhDong === 'Approve'
          ? 'Phê duyệt phiếu nhập kho và cập nhật tồn kho thành công'
          : 'Từ chối phiếu nhập kho thành công',
      data: updatedRecord
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
 * 4. GET /api/v1/admin/inventory/imports
 * Admin lấy danh sách phiếu nhập kho
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
  approveInventoryAdjustment,
  confirmReturnRefund,
  approveInventoryImport,
  getImportReceipts
};

