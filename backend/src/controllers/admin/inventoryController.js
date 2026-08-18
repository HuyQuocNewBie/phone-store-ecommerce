const { pool } = require('../../../config/db');

/**
 * 1. GET /api/v1/admin/inventory/stock-list
 * Trả về danh sách tồn kho gồm: MaSanPham, TenSanPham, TonKho, TrangThaiTonKho
 * ('Còn hàng' if TonKho >= 5, 'Sắp hết' if 0 < TonKho < 5, 'Hết hàng' if TonKho == 0)
 * Tuyệt đối không trả về DungLuong hay MauSac.
 */
const getStockList = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT MaSanPham, TenSanPham, TonKho
       FROM sanpham
       ORDER BY MaSanPham DESC`
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
        TonKho: tonKho,
        TrangThaiTonKho: trangThaiTonKho
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
 * 2. POST /api/v1/admin/inventory/import
 * Tạo phiếu nhập kho mới:
 * - Thêm 1 dòng vào phieunhapkho (MaNhaSanXuat, MaNguoiDung = admin_id, TongTienNhap, GhiChu).
 * - Thêm các dòng vào chitietphieunhap (MaPhieuNhap, MaSanPham, SoLuongNhap, DonGiaNhap).
 * - Cộng dồn SoLuongNhap vào cột TonKho của bảng sanpham.
 * - Ghi nhật ký biến động kho vào bảng lichsutonkho với LoaiBienDong = 'NhapKho'.
 */
const createImportReceipt = async (req, res, next) => {
  let connection;
  try {
    const { MaNhaSanXuat, GhiChu } = req.body;
    const admin_id = req.user ? (req.user.MaNguoiDung || req.user.id) : null;

    if (!admin_id) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin Admin thực hiện'
      });
    }

    const details = req.body.ChiTietPhieuNhap || req.body.chiTietPhieuNhap || req.body.items || req.body.chiTiet;

    if (!Array.isArray(details) || details.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách chi tiết phiếu nhập kho không được để trống'
      });
    }

    // Validate SoLuongNhap > 0 và DonGiaNhap > 0
    for (let i = 0; i < details.length; i++) {
      const item = details[i];
      const maSanPham = Number(item.MaSanPham);
      const soLuongNhap = Number(item.SoLuongNhap);
      const donGiaNhap = Number(item.DonGiaNhap);

      if (!maSanPham || isNaN(maSanPham)) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ở vị trí ${i + 1} không có Mã sản phẩm hợp lệ`
        });
      }

      if (isNaN(soLuongNhap) || soLuongNhap <= 0) {
        return res.status(400).json({
          success: false,
          message: `Số lượng nhập phải lớn hơn 0 (sản phẩm mã ${maSanPham})`
        });
      }

      if (isNaN(donGiaNhap) || donGiaNhap <= 0) {
        return res.status(400).json({
          success: false,
          message: `Đơn giá nhập phải lớn hơn 0 (sản phẩm mã ${maSanPham})`
        });
      }
    }

    // Tính tổng tiền nhập
    let tongTienNhap = 0;
    for (const item of details) {
      tongTienNhap += Number(item.SoLuongNhap) * Number(item.DonGiaNhap);
    }

    // Bắt đầu Transaction MySQL
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Thêm 1 dòng vào phieunhapkho (MaNhaSanXuat, MaNguoiDung = admin_id, TongTienNhap, GhiChu)
    const [phieuResult] = await connection.query(
      `INSERT INTO phieunhapkho (MaNhaSanXuat, MaNguoiDung, TongTienNhap, GhiChu)
       VALUES (?, ?, ?, ?)`,
      [
        MaNhaSanXuat ? Number(MaNhaSanXuat) : null,
        admin_id,
        tongTienNhap,
        GhiChu || null
      ]
    );

    const maPhieuNhap = phieuResult.insertId;

    // Lần lượt xử lý từng chi tiết phiếu nhập
    for (const item of details) {
      const maSanPham = Number(item.MaSanPham);
      const soLuongNhap = Number(item.SoLuongNhap);
      const donGiaNhap = Number(item.DonGiaNhap);

      // Kiểm tra sản phẩm có tồn tại và khóa dòng dữ liệu (FOR UPDATE)
      const [spRows] = await connection.query(
        `SELECT MaSanPham, TonKho FROM sanpham WHERE MaSanPham = ? FOR UPDATE`,
        [maSanPham]
      );

      if (spRows.length === 0) {
        throw new Error(`Sản phẩm có mã ${maSanPham} không tồn tại`);
      }

      const currentTonKho = Number(spRows[0].TonKho) || 0;
      const newTonKho = currentTonKho + soLuongNhap;

      // 2. Thêm các dòng vào chitietphieunhap (MaPhieuNhap, MaSanPham, SoLuongNhap, DonGiaNhap)
      await connection.query(
        `INSERT INTO chitietphieunhap (MaPhieuNhap, MaSanPham, SoLuongNhap, DonGiaNhap)
         VALUES (?, ?, ?, ?)`,
        [maPhieuNhap, maSanPham, soLuongNhap, donGiaNhap]
      );

      // 3. Cộng dồn SoLuongNhap vào cột TonKho của bảng sanpham
      await connection.query(
        `UPDATE sanpham SET TonKho = ? WHERE MaSanPham = ?`,
        [newTonKho, maSanPham]
      );

      // 4. Ghi nhật ký biến động kho vào bảng lichsutonkho với LoaiBienDong = 'NhapKho'
      await connection.query(
        `INSERT INTO lichsutonkho (MaSanPham, LoaiBienDong, SoLuongThayDoi, TonThucTeSauDoi, MaThamChieu, GhiChu)
         VALUES (?, 'NhapKho', ?, ?, ?, ?)`,
        [
          maSanPham,
          soLuongNhap,
          newTonKho,
          maPhieuNhap,
          `Nhập kho theo phiếu nhập #${maPhieuNhap}`
        ]
      );
    }

    // Commit Transaction
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Tạo phiếu nhập kho thành công',
      data: {
        MaPhieuNhap: maPhieuNhap,
        MaNhaSanXuat: MaNhaSanXuat ? Number(MaNhaSanXuat) : null,
        MaNguoiDung: admin_id,
        TongTienNhap: tongTienNhap,
        GhiChu: GhiChu || null
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.message && error.message.includes('không tồn tại')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getStockList,
  createImportReceipt
};
