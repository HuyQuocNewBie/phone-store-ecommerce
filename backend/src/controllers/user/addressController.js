const { pool } = require('../../../config/db');

/**
 * Helper: Tự động đồng bộ địa chỉ mặc định từ sodiachi sang cột DiaChi của bảng nguoidung
 * Đảm bảo dữ liệu trong bảng nguoidung luôn nhất quán với sổ địa chỉ
 */
const syncDefaultAddressToUser = async (MaNguoiDung) => {
  try {
    const [rows] = await pool.query(
      `SELECT DiaChiNha, PhuongXa, QuanHuyen, TinhThanh
       FROM sodiachi
       WHERE MaNguoiDung = ? AND LaMacDinh = 1
       LIMIT 1`,
      [MaNguoiDung]
    );

    let fullAddress = null;
    if (rows.length > 0) {
      const parts = [rows[0].DiaChiNha, rows[0].PhuongXa, rows[0].QuanHuyen, rows[0].TinhThanh]
        .filter((p) => p && String(p).trim() !== '');
      fullAddress = parts.length > 0 ? parts.join(', ') : null;
    }

    await pool.query(
      'UPDATE nguoidung SET DiaChi = ? WHERE MaNguoiDung = ?',
      [fullAddress, MaNguoiDung]
    );
  } catch (err) {
    console.error('Lỗi đồng bộ địa chỉ mặc định sang bảng nguoidung:', err);
  }
};

/**
 * 1. GET /api/v1/addresses
 * Lấy danh sách địa chỉ của người dùng đang đăng nhập.
 * Sắp xếp: LaMacDinh = 1 lên đầu, sau đó theo MaDiaChi giảm dần.
 */
const getAddresses = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;

    const sql = `
      SELECT
        s.MaDiaChi,
        s.MaNguoiDung,
        s.TenGoiNho,
        s.TinhThanh,
        s.QuanHuyen,
        s.PhuongXa,
        s.DiaChiNha,
        s.LaMacDinh,
        u.TaiKhoan,
        u.SoDienThoai
      FROM sodiachi s
      LEFT JOIN nguoidung u ON s.MaNguoiDung = u.MaNguoiDung
      WHERE s.MaNguoiDung = ?
      ORDER BY s.LaMacDinh DESC, s.MaDiaChi DESC
    `;

    const [rows] = await pool.query(sql, [MaNguoiDung]);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách địa chỉ thành công',
      data: rows.map((addr) => ({
        ...addr,
        LaMacDinh: Boolean(addr.LaMacDinh)
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/v1/addresses
 * Thêm địa chỉ mới cho người dùng đang đăng nhập.
 * LOGIC: Nếu LaMacDinh == 1, reset toàn bộ địa chỉ hiện tại của user về 0 trước khi INSERT.
 * Body: { TenGoiNho, TinhThanh, QuanHuyen, PhuongXa, DiaChiNha, LaMacDinh }
 */
const createAddress = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;
    const {
      TenGoiNho = null,
      TinhThanh = null,
      QuanHuyen = null,
      PhuongXa = null,
      DiaChiNha = null,
      LaMacDinh: rawLaMacDinh = 0
    } = req.body;

    // Chuẩn hoá LaMacDinh: chấp nhận boolean true hoặc số 1
    const laMacDinh = rawLaMacDinh === true || rawLaMacDinh == 1 ? 1 : 0;

    // Nếu địa chỉ mới là mặc định -> reset tất cả địa chỉ cũ về 0
    if (laMacDinh === 1) {
      await pool.query(
        'UPDATE sodiachi SET LaMacDinh = 0 WHERE MaNguoiDung = ?',
        [MaNguoiDung]
      );
    }

    const [result] = await pool.query(
      `INSERT INTO sodiachi (MaNguoiDung, TenGoiNho, TinhThanh, QuanHuyen, PhuongXa, DiaChiNha, LaMacDinh)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [MaNguoiDung, TenGoiNho, TinhThanh, QuanHuyen, PhuongXa, DiaChiNha, laMacDinh]
    );

    // Đồng bộ sang cột DiaChi của bảng nguoidung nếu đây là địa chỉ mặc định
    if (laMacDinh === 1) {
      await syncDefaultAddressToUser(MaNguoiDung);
    }

    return res.status(201).json({
      success: true,
      message: 'Thêm địa chỉ mới thành công',
      data: {
        MaDiaChi: result.insertId,
        MaNguoiDung,
        TenGoiNho,
        TinhThanh,
        QuanHuyen,
        PhuongXa,
        DiaChiNha,
        LaMacDinh: Boolean(laMacDinh)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. PUT /api/v1/addresses/:id
 * Cập nhật địa chỉ theo MaDiaChi (chỉ cho phép sửa địa chỉ thuộc user hiện tại).
 * LOGIC: Nếu LaMacDinh == 1, reset toàn bộ địa chỉ khác của user về 0 trước khi UPDATE.
 * Body: { TenGoiNho, TinhThanh, QuanHuyen, PhuongXa, DiaChiNha, LaMacDinh }
 */
const updateAddress = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;
    const maDiaChi = parseInt(req.params.id, 10);

    if (isNaN(maDiaChi) || maDiaChi <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã địa chỉ không hợp lệ'
      });
    }

    // Kiểm tra địa chỉ tồn tại và thuộc về user hiện tại
    const [rows] = await pool.query(
      'SELECT MaDiaChi FROM sodiachi WHERE MaDiaChi = ? AND MaNguoiDung = ?',
      [maDiaChi, MaNguoiDung]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa chỉ hoặc bạn không có quyền chỉnh sửa'
      });
    }

    const {
      TenGoiNho = null,
      TinhThanh = null,
      QuanHuyen = null,
      PhuongXa = null,
      DiaChiNha = null,
      LaMacDinh: rawLaMacDinh = 0
    } = req.body;

    const laMacDinh = rawLaMacDinh === true || rawLaMacDinh == 1 ? 1 : 0;

    // Nếu đặt làm mặc định -> reset các địa chỉ khác của user về 0
    if (laMacDinh === 1) {
      await pool.query(
        'UPDATE sodiachi SET LaMacDinh = 0 WHERE MaNguoiDung = ? AND MaDiaChi != ?',
        [MaNguoiDung, maDiaChi]
      );
    }

    await pool.query(
      `UPDATE sodiachi
       SET TenGoiNho = ?, TinhThanh = ?, QuanHuyen = ?, PhuongXa = ?, DiaChiNha = ?, LaMacDinh = ?
       WHERE MaDiaChi = ? AND MaNguoiDung = ?`,
      [TenGoiNho, TinhThanh, QuanHuyen, PhuongXa, DiaChiNha, laMacDinh, maDiaChi, MaNguoiDung]
    );

    // Tự động đồng bộ địa chỉ mặc định sang cột DiaChi của bảng nguoidung
    await syncDefaultAddressToUser(MaNguoiDung);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật địa chỉ thành công',
      data: {
        MaDiaChi: maDiaChi,
        MaNguoiDung,
        TenGoiNho,
        TinhThanh,
        QuanHuyen,
        PhuongXa,
        DiaChiNha,
        LaMacDinh: Boolean(laMacDinh)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. DELETE /api/v1/addresses/:id
 * Xóa địa chỉ theo MaDiaChi (chỉ cho phép xóa địa chỉ thuộc user hiện tại).
 * LOGIC: Nếu địa chỉ đang xóa có LaMacDinh == 1 -> CHẶN, trả về 400.
 */
const deleteAddress = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;
    const maDiaChi = parseInt(req.params.id, 10);

    if (isNaN(maDiaChi) || maDiaChi <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã địa chỉ không hợp lệ'
      });
    }

    // Kiểm tra địa chỉ tồn tại và thuộc user hiện tại
    const [rows] = await pool.query(
      'SELECT MaDiaChi, LaMacDinh FROM sodiachi WHERE MaDiaChi = ? AND MaNguoiDung = ?',
      [maDiaChi, MaNguoiDung]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa chỉ hoặc bạn không có quyền xóa'
      });
    }

    const address = rows[0];

    // Chặn xóa nếu là địa chỉ mặc định
    if (address.LaMacDinh == 1) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa địa chỉ mặc định!'
      });
    }

    await pool.query(
      'DELETE FROM sodiachi WHERE MaDiaChi = ? AND MaNguoiDung = ?',
      [maDiaChi, MaNguoiDung]
    );

    return res.status(200).json({
      success: true,
      message: 'Xóa địa chỉ thành công',
      data: { MaDiaChi: maDiaChi }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress
};

