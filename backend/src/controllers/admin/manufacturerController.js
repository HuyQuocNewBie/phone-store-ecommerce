const { pool } = require('../../../config/db');

// Helper regex validation
const PHONE_REGEX = /^0\d{9}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

/**
 * 1. GET /api/v1/admin/manufacturers
 * Lấy danh sách nhà sản xuất
 */
const getAllManufacturers = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT MaNhaSanXuat, TenNhaSanXuat, DiaChi, SoDienThoai, Email 
       FROM nhasanxuat 
       ORDER BY MaNhaSanXuat DESC`
    );

    const manufacturers = rows.map((item, index) => ({
      STT: index + 1,
      MaNhaSanXuat: item.MaNhaSanXuat,
      TenNhaSanXuat: item.TenNhaSanXuat,
      DiaChi: item.DiaChi,
      SoDienThoai: item.SoDienThoai,
      Email: item.Email
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách nhà sản xuất thành công',
      data: manufacturers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/v1/admin/manufacturers/:id
 * Lấy chi tiết nhà sản xuất theo ID
 */
const getManufacturerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const manufacturerId = Number(id);

    if (isNaN(manufacturerId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã nhà sản xuất không hợp lệ'
      });
    }

    const [rows] = await pool.query(
      `SELECT MaNhaSanXuat, TenNhaSanXuat, DiaChi, SoDienThoai, Email 
       FROM nhasanxuat 
       WHERE MaNhaSanXuat = ?`,
      [manufacturerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhà sản xuất'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết nhà sản xuất thành công',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. POST /api/v1/admin/manufacturers
 * Thêm mới nhà sản xuất (Validate SĐT đúng định dạng Việt Nam 10 chữ số và Email hợp lệ)
 */
const createManufacturer = async (req, res, next) => {
  try {
    const { TenNhaSanXuat, DiaChi, SoDienThoai, Email } = req.body;

    if (!TenNhaSanXuat || !String(TenNhaSanXuat).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên nhà sản xuất không được để trống'
      });
    }

    if (!DiaChi || !String(DiaChi).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ nhà sản xuất không được để trống'
      });
    }

    if (!SoDienThoai || !String(SoDienThoai).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại nhà sản xuất không được để trống'
      });
    }

    const phoneStr = String(SoDienThoai).trim();
    if (!PHONE_REGEX.test(phoneStr)) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại nhà sản xuất không hợp lệ (phải đủ 10 chữ số và bắt đầu bằng số 0)'
      });
    }

    if (!Email || !String(Email).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email nhà sản xuất không được để trống'
      });
    }

    const emailStr = String(Email).trim();
    if (!EMAIL_REGEX.test(emailStr)) {
      return res.status(400).json({
        success: false,
        message: 'Email nhà sản xuất không đúng định dạng'
      });
    }

    const nameStr = String(TenNhaSanXuat).trim();
    const addressStr = String(DiaChi).trim();

    // Kiểm tra tên NSX trùng lặp
    const [existing] = await pool.query(
      `SELECT MaNhaSanXuat FROM nhasanxuat WHERE LOWER(TenNhaSanXuat) = LOWER(?)`,
      [nameStr]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tên nhà sản xuất này đã tồn tại'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO nhasanxuat (TenNhaSanXuat, DiaChi, SoDienThoai, Email) VALUES (?, ?, ?, ?)`,
      [nameStr, addressStr, phoneStr, emailStr]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm nhà sản xuất thành công',
      data: {
        MaNhaSanXuat: result.insertId,
        TenNhaSanXuat: nameStr,
        DiaChi: addressStr,
        SoDienThoai: phoneStr,
        Email: emailStr
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. PUT /api/v1/admin/manufacturers/:id
 * Cập nhật thông tin nhà sản xuất
 */
const updateManufacturer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const manufacturerId = Number(id);

    if (isNaN(manufacturerId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã nhà sản xuất không hợp lệ'
      });
    }

    const [existing] = await pool.query(
      `SELECT * FROM nhasanxuat WHERE MaNhaSanXuat = ?`,
      [manufacturerId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nhà sản xuất không tồn tại'
      });
    }

    const currentData = existing[0];
    const { TenNhaSanXuat, DiaChi, SoDienThoai, Email } = req.body;

    const newTen = TenNhaSanXuat !== undefined ? String(TenNhaSanXuat).trim() : currentData.TenNhaSanXuat;
    const newDiaChi = DiaChi !== undefined ? String(DiaChi).trim() : currentData.DiaChi;
    const newPhone = SoDienThoai !== undefined ? String(SoDienThoai).trim() : currentData.SoDienThoai;
    const newEmail = Email !== undefined ? String(Email).trim() : currentData.Email;

    if (!newTen) {
      return res.status(400).json({
        success: false,
        message: 'Tên nhà sản xuất không được để trống'
      });
    }

    if (!newDiaChi) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ nhà sản xuất không được để trống'
      });
    }

    if (!newPhone || !PHONE_REGEX.test(newPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại nhà sản xuất không hợp lệ (phải đủ 10 chữ số và bắt đầu bằng số 0)'
      });
    }

    if (!newEmail || !EMAIL_REGEX.test(newEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Email nhà sản xuất không đúng định dạng'
      });
    }

    // Kiểm tra trùng lặp tên với NSX khác
    const [duplicates] = await pool.query(
      `SELECT MaNhaSanXuat FROM nhasanxuat WHERE LOWER(TenNhaSanXuat) = LOWER(?) AND MaNhaSanXuat != ?`,
      [newTen, manufacturerId]
    );

    if (duplicates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tên nhà sản xuất này trùng với một nhà sản xuất khác'
      });
    }

    await pool.query(
      `UPDATE nhasanxuat SET
         TenNhaSanXuat = ?,
         DiaChi = ?,
         SoDienThoai = ?,
         Email = ?
       WHERE MaNhaSanXuat = ?`,
      [newTen, newDiaChi, newPhone, newEmail, manufacturerId]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật nhà sản xuất thành công',
      data: {
        MaNhaSanXuat: manufacturerId,
        TenNhaSanXuat: newTen,
        DiaChi: newDiaChi,
        SoDienThoai: newPhone,
        Email: newEmail
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. DELETE /api/v1/admin/manufacturers/:id
 * Xóa nhà sản xuất. Bắt lỗi FK 1451 nếu có sản phẩm liên kết
 */
const deleteManufacturer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const manufacturerId = Number(id);

    if (isNaN(manufacturerId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã nhà sản xuất không hợp lệ'
      });
    }

    const [existing] = await pool.query(
      `SELECT MaNhaSanXuat FROM nhasanxuat WHERE MaNhaSanXuat = ?`,
      [manufacturerId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nhà sản xuất không tồn tại'
      });
    }

    await pool.query(`DELETE FROM nhasanxuat WHERE MaNhaSanXuat = ?`, [manufacturerId]);

    return res.status(200).json({
      success: true,
      message: 'Xóa nhà sản xuất thành công'
    });
  } catch (error) {
    // Bắt lỗi ràng buộc khóa ngoại MySQL 1451 (ER_ROW_IS_REFERENCED_2)
    if (
      error.code === 'ER_ROW_IS_REFERENCED_2' ||
      error.errno === 1451 ||
      (error.message && error.message.includes('foreign key constraint'))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa nhà sản xuất này do đã có sản phẩm liên kết'
      });
    }
    next(error);
  }
};

module.exports = {
  getAllManufacturers,
  getManufacturerById,
  createManufacturer,
  updateManufacturer,
  deleteManufacturer
};
