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
  LyDoTuChoi: row.LyDoTuChoi || null,
  TrangThai: row.TrangThai,
  MaNguoiDung_Admin: row.MaNguoiDung_Admin,
  NguoiDuyetAdmin: row.TaiKhoanAdmin || null,
  NgayTao: row.NgayTao,
  NgayDuyet: row.NgayDuyet
});

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
    // Non JSON array
  }
  return String(rawProof)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

/**
 * Helper: Xác định kênh hoàn tiền & loại kênh dựa trên phương thức thanh toán của đơn
 * Nghiệp vụ thanh toán thực tế:
 * - Đơn VNPay -> "Hoàn tự động về cổng VNPay"
 * - Đơn ZaloPay -> "Hoàn tự động về cổng ZaloPay"
 * - Đơn COD -> "Chuyển khoản ngân hàng cho đơn COD"
 */
const resolveRefundChannel = (paymentMethodName) => {
  const norm = String(paymentMethodName || '').toUpperCase().trim();
  if (norm.includes('VNPAY') || norm.includes('VN PAY')) {
    return {
      tenKenh: 'Hoàn tự động về cổng VNPay',
      loaiKenh: 'VNPay',
      isAutoGateway: true,
      moTa: 'Hoàn tự động về tài khoản/thẻ liên kết cổng VNPay của khách hàng'
    };
  }
  if (norm.includes('ZALO')) {
    return {
      tenKenh: 'Hoàn tự động về cổng ZaloPay',
      loaiKenh: 'ZaloPay',
      isAutoGateway: true,
      moTa: 'Hoàn tự động về ví ZaloPay của khách hàng'
    };
  }
  return {
    tenKenh: 'Chuyển khoản ngân hàng cho đơn COD',
    loaiKenh: 'COD_BankTransfer',
    isAutoGateway: false,
    moTa: 'Chuyển khoản ngân hàng trực tiếp cho đơn thanh toán COD'
  };
};

/**
 * Helper: format 1 bản ghi phiếu đổi trả kèm thông tin đơn hàng, sản phẩm & khách hàng
 */
const formatReturnRecord = (row) => {
  const pttt = row.PhuongThucThanhToan || 'COD';
  const channelInfo = resolveRefundChannel(pttt);
  const kenh = row.PhuongThucHoanTien || channelInfo.tenKenh;

  return {
    MaPhieuDoiTra: row.MaPhieuDoiTra,
    MaDonHang: row.MaDonHang,
    CodeDonHang: formatOrderCode(row.MaDonHang, row.NgayMuaHang),
    MaSanPham: row.MaSanPham,
    MaChiTietDonHang: row.MaChiTietDonHang || null,
    TenSanPham: row.TenSanPham || null,
    AnhSanPham: row.AnhSanPham || null,
    GiaSanPham:
      row.GiaSanPham !== null && row.GiaSanPham !== undefined
        ? Number(row.GiaSanPham)
        : null,
    DungLuong:
      row.DungLuong && String(row.DungLuong).trim() !== ''
        ? String(row.DungLuong).trim()
        : null,
    MauSac:
      row.MauSac && String(row.MauSac).trim() !== ''
        ? String(row.MauSac).trim()
        : null,
    SoLuong:
      row.SoLuong !== null && row.SoLuong !== undefined ? Number(row.SoLuong) : null,
    DonGia:
      row.DonGia !== null && row.DonGia !== undefined ? Number(row.DonGia) : null,
    MaNguoiDung_User: row.MaNguoiDung_User,
    TaiKhoan: row.TaiKhoan || null,
    TenKhachHang: row.TenNguoiNhan || row.TaiKhoan || 'Khách hàng',
    Email: row.Email || null,
    SoDienThoai: row.SoDienThoaiDonHang || row.SoDienThoaiUser || null,
    LyDo: row.LyDo,
    HinhAnhProof: row.HinhAnhProof,
    HinhAnhProofList: parseProofImages(row.HinhAnhProof),
    KetQuaKiemDinh: row.KetQuaKiemDinh,
    GhiChuKho: row.GhiChuKho,
    GhiChu:
      row.GhiChu && String(row.GhiChu).trim() !== ''
        ? String(row.GhiChu).trim()
        : null,
    TrangThaiHoanTien: row.TrangThaiHoanTien,
    TrangThaiDonHang: row.TrangThaiDonHang,
    TongTien:
      row.TongTien !== null && row.TongTien !== undefined ? Number(row.TongTien) : null,
    PhuongThucThanhToan: pttt,
    PhuongThucHoanTien: kenh,
    KenhHoanTien: kenh,
    IsAutoGateway: channelInfo.isAutoGateway,
    MaGiaoDichHoanTien: row.MaGiaoDichHoanTien || null,
    GhiChuHoanTien: row.GhiChuHoanTien || null,
    NgayHoanTien: row.NgayHoanTien || null,
    MaNguoiDung_Admin: row.MaNguoiDung_Admin || null,
    TaiKhoanAdmin: row.TaiKhoanAdmin || null,
    NguoiDuyetHoanTien: row.TaiKhoanAdmin || null,
    NgayTao: row.NgayTao,
    NgayCapNhat: row.NgayCapNhat,
    donhang: {
      MaDonHang: row.MaDonHang,
      CodeDonHang: formatOrderCode(row.MaDonHang, row.NgayMuaHang),
      NgayMuaHang: row.NgayMuaHang,
      TrangThaiDonHang: row.TrangThaiDonHang,
      TongTien:
        row.TongTien !== null && row.TongTien !== undefined ? Number(row.TongTien) : null,
      TenNguoiNhan: row.TenNguoiNhan,
      SoDienThoai: row.SoDienThoaiDonHang,
      DiaChiGiaoHang: row.DiaChiGiaoHang,
      GhiChu: row.GhiChu
    },
    sanpham: {
      MaSanPham: row.MaSanPham,
      TenSanPham: row.TenSanPham,
      Anh: row.AnhSanPham
    }
  };
};

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

    const rawLyDoTuChoi =
      body.lyDoTuChoi ?? body.lyDo ?? body.LyDoTuChoi ?? body.ghiChu ?? body.GhiChu;
    const lyDoTuChoi =
      rawLyDoTuChoi !== undefined && rawLyDoTuChoi !== null ? String(rawLyDoTuChoi).trim() : null;

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
      // Trường hợp Reject: cập nhật TrangThai = 'TuChoi', ghi nhận LyDoTuChoi, giữ nguyên TonKho của sanpham
      await connection.query(
        `UPDATE phieudieuchinhkho
         SET TrangThai = 'TuChoi',
             MaNguoiDung_Admin = ?,
             LyDoTuChoi = ?,
             NgayDuyet = NOW()
         WHERE MaPhieuAdjust = ?`,
        [adminId, lyDoTuChoi, adjustmentId]
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
         p.LyDoTuChoi,
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
 * Quy trình Hoàn tiền đổi trả chuẩn nghiệp vụ thanh toán thực tế (2 Giai đoạn):
 * 
 * - Giai đoạn 1 (Từ ChoDuyet -> DangHoanTien):
 *   Admin bấm "Duyệt yêu cầu hoàn tiền" -> Hệ thống tạo lệnh hoàn tiền:
 *   Xác định rõ kênh hoàn tiền dựa theo phương thức thanh toán của đơn:
 *   * "Hoàn tự động về cổng VNPay" (với đơn thanh toán VNPay)
 *   * "Hoàn tự động về cổng ZaloPay" (với đơn thanh toán ZaloPay)
 *   * "Chuyển khoản ngân hàng cho đơn COD" (với đơn thanh toán COD/tiền mặt)
 *   Cập nhật phieudoitra SET TrangThaiHoanTien = 'DangHoanTien', PhuongThucHoanTien = ...
 * 
 * - Giai đoạn 2 (Từ DangHoanTien -> DaHoanTien):
 *   Admin nhập Mã giao dịch hoàn tiền / Mã tham chiếu ngân hàng (VD: REF2026...) và bấm "Xác nhận đã chuyển tiền":
 *   Kiểm tra bắt buộc có mã giao dịch đối soát thực tế.
 *   Cập nhật phieudoitra SET TrangThaiHoanTien = 'DaHoanTien', MaGiaoDichHoanTien = ..., GhiChuHoanTien = ..., NgayHoanTien = NOW().
 *   Cập nhật donhang SET TrangThaiDonHang = 'DaHoanTien'.
 *   Đồng bộ lichsumuahang SET TrangThai = 'DaHoanTien'.
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

    const adminId = req.user ? (req.user.MaNguoiDung || req.user.id) : null;
    const body = req.body || {};
    const rawAction = body.action || body.Action;
    const action =
      rawAction !== undefined && rawAction !== null ? String(rawAction).trim() : '';
    const rawMaGiaoDich =
      body.maGiaoDich ?? body.MaGiaoDich ?? body.maThamChieu ?? body.MaThamChieu;
    const maGiaoDich =
      rawMaGiaoDich !== undefined && rawMaGiaoDich !== null
        ? String(rawMaGiaoDich).trim()
        : '';
    const rawGhiChu =
      body.ghiChu ?? body.GhiChu ?? body.ghiChuHoanTien ?? body.GhiChuHoanTien;
    const ghiChuHoanTien =
      rawGhiChu !== undefined && rawGhiChu !== null ? String(rawGhiChu).trim() : '';

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Khóa bản ghi phieudoitra để chống xử lý trùng lặp đồng thời
    const [returnRows] = await connection.query(
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
         p.MaGiaoDichHoanTien,
         p.PhuongThucHoanTien,
         p.GhiChuHoanTien,
         p.NgayHoanTien,
         p.NgayTao,
         p.NgayCapNhat
       FROM phieudoitra p
       WHERE p.MaPhieuDoiTra = ?
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

    // Kiểm tra kết quả kiểm định của Kho
    if (returnRecord.KetQuaKiemDinh !== 'Dat') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Chỉ có thể xử lý hoàn tiền khi phiếu đổi trả có kết quả kiểm định 'Dat'. Kết quả hiện tại: '${returnRecord.KetQuaKiemDinh}'`
      });
    }

    // Tra cứu phương thức thanh toán ban đầu của đơn hàng
    const [paymentRows] = await connection.query(
      `SELECT COALESCE(
         (SELECT pt.TenPhuongThucThanhToan FROM thanhtoan tt JOIN phuongthucthanhtoan pt ON tt.MaPhuongThucThanhToan = pt.MaPhuongThucThanhToan WHERE tt.MaDonHang = ? ORDER BY tt.MaThanhToan DESC LIMIT 1),
         (SELECT pt.TenPhuongThucThanhToan FROM lichsumuahang lsm JOIN phuongthucthanhtoan pt ON lsm.MaPhuongThucThanhToan = pt.MaPhuongThucThanhToan WHERE lsm.MaDonHang = ? ORDER BY lsm.MaLichSuMuaHang DESC LIMIT 1),
         'COD'
       ) AS PhuongThucThanhToan`,
      [returnRecord.MaDonHang, returnRecord.MaDonHang]
    );

    const phuongThucThanhToan = paymentRows[0]?.PhuongThucThanhToan || 'COD';
    const channelInfo = resolveRefundChannel(phuongThucThanhToan);
    const selectedChannel =
      body.kenhHoanTien || returnRecord.PhuongThucHoanTien || channelInfo.tenKenh;

    // Phân loại giai đoạn xử lý:
    // Nếu action = 'confirm' / 'DaHoanTien' HOẶC có maGiaoDich -> Xử lý Giai đoạn 2 (Xác nhận đã chuyển tiền)
    // Ngược lại -> Xử lý Giai đoạn 1 (Duyệt yêu cầu hoàn tiền)
    const actionLower = action.toLowerCase();
    const isStage2 =
      actionLower === 'confirm' ||
      actionLower === 'dahoantien' ||
      actionLower === 'xacnhan' ||
      Boolean(maGiaoDich);

    if (!isStage2) {
      // =========================================================================
      // GIAI ĐOẠN 1: DUYỆT YÊU CẦU HOÀN TIỀN (ChoDuyet -> DangHoanTien)
      // =========================================================================
      if (returnRecord.TrangThaiHoanTien === 'DangHoanTien') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Phiếu đổi trả này đã được duyệt tạo lệnh hoàn tiền ('DangHoanTien'). Vui lòng thực hiện Giai đoạn 2: Nhập mã giao dịch đối soát để chốt hoàn tất."
        });
      }

      if (returnRecord.TrangThaiHoanTien === 'DaHoanTien') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Phiếu đổi trả đã hoàn tất hoàn tiền trước đó ('DaHoanTien'), không thể duyệt lại"
        });
      }

      if (returnRecord.TrangThaiHoanTien !== 'ChoDuyet') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Trạng thái hoàn tiền hiện tại ('${returnRecord.TrangThaiHoanTien}') không hợp lệ để duyệt lệnh hoàn`
        });
      }

      // Cập nhật phieudoitra sang trạng thái 'DangHoanTien' và lưu kênh hoàn tiền
      await connection.query(
        `UPDATE phieudoitra
         SET TrangThaiHoanTien = 'DangHoanTien',
             PhuongThucHoanTien = ?,
             MaNguoiDung_Admin = ?,
             NgayCapNhat = NOW()
         WHERE MaPhieuDoiTra = ?`,
        [selectedChannel, adminId, returnId]
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
           p.MaGiaoDichHoanTien,
           p.PhuongThucHoanTien,
           p.GhiChuHoanTien,
           p.NgayHoanTien,
           p.MaNguoiDung_Admin,
           ua.TaiKhoan AS TaiKhoanAdmin,
           p.NgayTao,
           p.NgayCapNhat,
           d.NgayMuaHang,
           d.TrangThaiDonHang,
           d.TongTien,
           d.TenNguoiNhan,
           d.SoDienThoai AS SoDienThoaiDonHang,
           d.DiaChiGiaoHang,
           d.GhiChu,
           sp.TenSanPham,
           sp.Anh AS AnhSanPham,
           sp.Gia AS GiaSanPham,
           u.TaiKhoan,
           u.Email,
           u.SoDienThoai AS SoDienThoaiUser,
           ? AS PhuongThucThanhToan
         FROM phieudoitra p
         JOIN donhang d ON p.MaDonHang = d.MaDonHang
         JOIN sanpham sp ON p.MaSanPham = sp.MaSanPham
         JOIN nguoidung u ON p.MaNguoiDung_User = u.MaNguoiDung
         LEFT JOIN nguoidung ua ON p.MaNguoiDung_Admin = ua.MaNguoiDung
         LEFT JOIN chitietdonhang ct ON ct.MaChiTietDonHang = (
           SELECT ct2.MaChiTietDonHang
           FROM chitietdonhang ct2
           WHERE ct2.MaDonHang = p.MaDonHang AND ct2.MaSanPham = p.MaSanPham
           ORDER BY ct2.MaChiTietDonHang ASC
           LIMIT 1
         )
         WHERE p.MaPhieuDoiTra = ?`,
        [phuongThucThanhToan, returnId]
      );

      const suggestedCode = `REF${new Date().getFullYear()}${String(returnRecord.MaDonHang).padStart(4, '0')}${String(returnId).padStart(4, '0')}`;
      const responseData = formatReturnRecord(updatedRows[0]);
      responseData.GoiYMaThamChieu = suggestedCode;

      return res.status(200).json({
        success: true,
        stage: 1,
        message: `Đã duyệt yêu cầu hoàn tiền thành công! Hệ thống đã tạo lệnh hoàn tiền qua kênh: "${selectedChannel}".`,
        data: responseData
      });
    }

    // =========================================================================
    // GIAI ĐOẠN 2: XÁC NHẬN ĐÃ CHUYỂN TIỀN (DangHoanTien -> DaHoanTien)
    // =========================================================================
    if (returnRecord.TrangThaiHoanTien === 'DaHoanTien') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Phiếu đổi trả này đã được xác nhận hoàn tiền hoàn tất ('DaHoanTien'), không thể thao tác lại"
      });
    }

    // Bắt buộc phải có mã giao dịch đối soát thực tế
    if (!maGiaoDich) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message:
          'Vui lòng nhập Mã giao dịch hoàn tiền hoặc Mã tham chiếu ngân hàng thực tế (Ví dụ: REF2026...) để hoàn tất xác nhận chuyển tiền'
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

    // 1. UPDATE phieudoitra SET TrangThaiHoanTien = 'DaHoanTien', MaGiaoDichHoanTien, NgayHoanTien = NOW()
    await connection.query(
      `UPDATE phieudoitra
       SET TrangThaiHoanTien = 'DaHoanTien',
           PhuongThucHoanTien = COALESCE(PhuongThucHoanTien, ?),
           MaGiaoDichHoanTien = ?,
           GhiChuHoanTien = ?,
           NgayHoanTien = NOW(),
           MaNguoiDung_Admin = ?,
           NgayCapNhat = NOW()
       WHERE MaPhieuDoiTra = ?`,
      [selectedChannel, maGiaoDich, ghiChuHoanTien || null, adminId, returnId]
    );

    // 2. UPDATE donhang SET TrangThaiDonHang = 'DaHoanTien' WHERE MaDonHang = ...
    await connection.query(
      `UPDATE donhang
       SET TrangThaiDonHang = 'DaHoanTien'
       WHERE MaDonHang = ?`,
      [returnRecord.MaDonHang]
    );

    // 3. Đồng bộ trạng thái trên bảng lịch sử mua hàng (nếu có)
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
         p.MaGiaoDichHoanTien,
         p.PhuongThucHoanTien,
         p.GhiChuHoanTien,
         p.NgayHoanTien,
         p.MaNguoiDung_Admin,
         ua.TaiKhoan AS TaiKhoanAdmin,
         p.NgayTao,
         p.NgayCapNhat,
         d.NgayMuaHang,
         d.TrangThaiDonHang,
         d.TongTien,
         d.TenNguoiNhan,
         d.SoDienThoai AS SoDienThoaiDonHang,
         d.DiaChiGiaoHang,
         d.GhiChu,
         sp.TenSanPham,
         sp.Anh AS AnhSanPham,
         sp.Gia AS GiaSanPham,
         u.TaiKhoan,
         u.Email,
         u.SoDienThoai AS SoDienThoaiUser,
         ? AS PhuongThucThanhToan
       FROM phieudoitra p
       JOIN donhang d ON p.MaDonHang = d.MaDonHang
       JOIN sanpham sp ON p.MaSanPham = sp.MaSanPham
       JOIN nguoidung u ON p.MaNguoiDung_User = u.MaNguoiDung
       LEFT JOIN nguoidung ua ON p.MaNguoiDung_Admin = ua.MaNguoiDung
       LEFT JOIN chitietdonhang ct ON ct.MaChiTietDonHang = (
         SELECT ct2.MaChiTietDonHang
         FROM chitietdonhang ct2
         WHERE ct2.MaDonHang = p.MaDonHang AND ct2.MaSanPham = p.MaSanPham
         ORDER BY ct2.MaChiTietDonHang ASC
         LIMIT 1
       )
       WHERE p.MaPhieuDoiTra = ?`,
      [phuongThucThanhToan, returnId]
    );

    return res.status(200).json({
      success: true,
      stage: 2,
      message: `Xác nhận đã chuyển tiền thành công cho phiếu #${String(returnId).padStart(4, '0')} (Mã GD: ${maGiaoDich}). Đơn hàng đã chuyển sang trạng thái Đã hoàn tiền.`,
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
 * GET /api/v1/admin/returns
 * Admin lấy danh sách phiếu đổi trả hoàn tiền (đạt kiểm định kho) kèm phương thức thanh toán & thông tin đối soát
 */
const getReturnRefunds = async (req, res, next) => {
  try {
    const { trangThaiHoanTien, search } = req.query || {};
    let whereClause = "WHERE p.KetQuaKiemDinh = 'Dat'";
    const queryParams = [];

    if (trangThaiHoanTien && trangThaiHoanTien !== 'ALL') {
      whereClause += ' AND p.TrangThaiHoanTien = ?';
      queryParams.push(trangThaiHoanTien);
    }

    if (search && String(search).trim() !== '') {
      const kw = `%${String(search).trim()}%`;
      whereClause += ` AND (
        p.MaPhieuDoiTra LIKE ? OR
        p.MaDonHang LIKE ? OR
        p.MaGiaoDichHoanTien LIKE ? OR
        sp.TenSanPham LIKE ? OR
        u.TaiKhoan LIKE ? OR
        u.Email LIKE ? OR
        d.SoDienThoai LIKE ? OR
        d.TenNguoiNhan LIKE ?
      )`;
      queryParams.push(kw, kw, kw, kw, kw, kw, kw, kw);
    }

    const [rows] = await pool.query(
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
         p.MaGiaoDichHoanTien,
         p.PhuongThucHoanTien,
         p.GhiChuHoanTien,
         p.NgayHoanTien,
         p.MaNguoiDung_Admin,
         ua.TaiKhoan AS TaiKhoanAdmin,
         p.NgayTao,
         p.NgayCapNhat,
         d.NgayMuaHang,
         d.TrangThaiDonHang,
         d.TongTien,
         d.TenNguoiNhan,
         d.SoDienThoai AS SoDienThoaiDonHang,
         d.DiaChiGiaoHang,
         d.GhiChu,
         sp.TenSanPham,
         sp.Anh AS AnhSanPham,
         sp.Gia AS GiaSanPham,
         u.TaiKhoan,
         u.Email,
         u.SoDienThoai AS SoDienThoaiUser,
         u.AnhDaiDien,
         COALESCE(
           (SELECT pt.TenPhuongThucThanhToan FROM thanhtoan tt JOIN phuongthucthanhtoan pt ON tt.MaPhuongThucThanhToan = pt.MaPhuongThucThanhToan WHERE tt.MaDonHang = d.MaDonHang ORDER BY tt.MaThanhToan DESC LIMIT 1),
           (SELECT pt.TenPhuongThucThanhToan FROM lichsumuahang lsm JOIN phuongthucthanhtoan pt ON lsm.MaPhuongThucThanhToan = pt.MaPhuongThucThanhToan WHERE lsm.MaDonHang = d.MaDonHang ORDER BY lsm.MaLichSuMuaHang DESC LIMIT 1),
           'COD'
         ) AS PhuongThucThanhToan
       FROM phieudoitra p
       JOIN donhang d ON p.MaDonHang = d.MaDonHang
       JOIN sanpham sp ON p.MaSanPham = sp.MaSanPham
       JOIN nguoidung u ON p.MaNguoiDung_User = u.MaNguoiDung
       LEFT JOIN nguoidung ua ON p.MaNguoiDung_Admin = ua.MaNguoiDung
       LEFT JOIN chitietdonhang ct ON ct.MaChiTietDonHang = (
         SELECT ct2.MaChiTietDonHang
         FROM chitietdonhang ct2
         WHERE ct2.MaDonHang = p.MaDonHang AND ct2.MaSanPham = p.MaSanPham
         ORDER BY ct2.MaChiTietDonHang ASC
         LIMIT 1
       )
       ${whereClause}
       ORDER BY p.NgayTao DESC, p.MaPhieuDoiTra DESC`,
      queryParams
    );

    const formattedData = rows.map(formatReturnRecord);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách phiếu đổi trả hoàn tiền thành công',
      data: formattedData
    });
  } catch (error) {
    next(error);
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
  getReturnRefunds,
  approveInventoryImport,
  getImportReceipts
};

