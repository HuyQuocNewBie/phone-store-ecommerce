const { pool } = require('../../../config/db');

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

      if (!Number.isFinite(donGiaNhap) || donGiaNhap <= 0) {
        return res.status(400).json({
          success: false,
          message: `Đơn giá nhập phải lớn hơn 0 (sản phẩm mã ${maSanPham})`
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

    // 1. Chèn record vào bảng phieunhapkho
    const [phieuResult] = await connection.query(
      `INSERT INTO phieunhapkho (MaNhaSanXuat, MaNguoiDung, TongTienNhap, GhiChu)
       VALUES (?, ?, ?, ?)`,
      [maNhaSanXuat, userId, tongTienNhap, ghiChu]
    );

    const maPhieuNhap = phieuResult.insertId;
    const processedItems = [];

    for (const item of normalizedItems) {
      // Khóa dòng sản phẩm để tránh race condition khi cập nhật tồn kho
      const [spRows] = await connection.query(
        `SELECT MaSanPham, TenSanPham, TonKho, TrangThai
         FROM sanpham
         WHERE MaSanPham = ?
         FOR UPDATE`,
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
      const tonKhoTruoc = Number(product.TonKho) || 0;

      // 2. Chèn record vào bảng chitietphieunhap
      const [detailResult] = await connection.query(
        `INSERT INTO chitietphieunhap (MaPhieuNhap, MaSanPham, SoLuongNhap, DonGiaNhap)
         VALUES (?, ?, ?, ?)`,
        [maPhieuNhap, item.maSanPham, item.soLuongNhap, item.donGiaNhap]
      );

      // 3. Tự động UPDATE sanpham SET TonKho = TonKho + SoLuongNhap WHERE MaSanPham = ...
      await connection.query(
        `UPDATE sanpham
         SET TonKho = COALESCE(TonKho, 0) + ?
         WHERE MaSanPham = ?`,
        [item.soLuongNhap, item.maSanPham]
      );

      const [updatedRows] = await connection.query(
        `SELECT TonKho FROM sanpham WHERE MaSanPham = ?`,
        [item.maSanPham]
      );
      const tonKhoMoi = Number(updatedRows[0].TonKho) || 0;

      // Khôi phục trạng thái kinh doanh nếu sản phẩm trước đó đang HetHang
      if (product.TrangThai === 'HetHang' && tonKhoMoi > 0) {
        await connection.query(
          `UPDATE sanpham SET TrangThai = 'DangBan' WHERE MaSanPham = ?`,
          [item.maSanPham]
        );
      }

      // 4. Ghi lịch sử vào bảng lichsutonkho với LoaiBienDong = 'NhapKho'
      const logNote = ghiChu
        ? `Nhập kho theo phiếu nhập #${maPhieuNhap} - ${ghiChu}`
        : `Nhập kho theo phiếu nhập #${maPhieuNhap}`;

      await connection.query(
        `INSERT INTO lichsutonkho (MaSanPham, LoaiBienDong, SoLuongThayDoi, TonThucTeSauDoi, MaThamChieu, GhiChu)
         VALUES (?, 'NhapKho', ?, ?, ?, ?)`,
        [item.maSanPham, item.soLuongNhap, tonKhoMoi, maPhieuNhap, logNote]
      );

      processedItems.push({
        MaChiTietNhap: detailResult.insertId,
        MaSanPham: item.maSanPham,
        TenSanPham: product.TenSanPham,
        SoLuongNhap: item.soLuongNhap,
        DonGiaNhap: item.donGiaNhap,
        ThanhTien: item.soLuongNhap * item.donGiaNhap,
        TonKhoTruoc: tonKhoTruoc,
        TonKhoMoi: tonKhoMoi
      });
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Nhập kho thực tế thành công',
      data: {
        MaPhieuNhap: maPhieuNhap,
        MaNhaSanXuat: maNhaSanXuat,
        MaNguoiDung: userId,
        TongTienNhap: tongTienNhap,
        GhiChu: ghiChu,
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

module.exports = {
  importInventory,
  createAdjustRequest
};

