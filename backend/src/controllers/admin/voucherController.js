const { pool } = require('../../../config/db');

/**
 * Helper function format date sang định dạng YYYY-MM-DD HH:mm:ss cho MySQL hoặc trả về ISO String / Object
 */
const formatDate = (dateObj) => {
  return new Date(dateObj).toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * 1. GET /api/v1/admin/vouchers
 * Lấy danh sách mã giảm giá (sắp xếp theo ngày tạo mới nhất - MaVoucher DESC)
 */
const getAllVouchers = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         MaVoucher,
         Code,
         GiaTriGiam,
         LoaiGiam,
         GiaTriToiThieu,
         SoLuong,
         NgayHetHan,
         TrangThai
       FROM voucher
       ORDER BY MaVoucher DESC`
    );

    const vouchers = rows.map((item, index) => ({
      STT: index + 1,
      MaVoucher: item.MaVoucher,
      Code: item.Code,
      GiaTriGiam: Number(item.GiaTriGiam),
      LoaiGiam: item.LoaiGiam,
      GiaTriToiThieu: Number(item.GiaTriToiThieu),
      SoLuong: item.SoLuong,
      NgayHetHan: item.NgayHetHan,
      TrangThai: item.TrangThai
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách mã giảm giá thành công',
      data: vouchers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/vouchers/:id
 * Lấy chi tiết mã giảm giá theo ID
 */
const getVoucherById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const voucherId = Number(id);

    if (isNaN(voucherId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher không hợp lệ'
      });
    }

    const [rows] = await pool.query(
      `SELECT 
         MaVoucher,
         Code,
         GiaTriGiam,
         LoaiGiam,
         GiaTriToiThieu,
         SoLuong,
         NgayHetHan,
         TrangThai
       FROM voucher
       WHERE MaVoucher = ?`,
      [voucherId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã giảm giá'
      });
    }

    const item = rows[0];
    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết mã giảm giá thành công',
      data: {
        ...item,
        GiaTriGiam: Number(item.GiaTriGiam),
        GiaTriToiThieu: Number(item.GiaTriToiThieu)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/v1/admin/vouchers
 * Thêm mã voucher mới
 * Validate:
 * - Code: Tự động uppercase, không khoảng trắng, không trùng lặp.
 * - GiaTriGiam: Số > 0 (tính bằng VND).
 * - GiaTriToiThieu: Bắt buộc số > 0 và GiaTriGiam <= GiaTriToiThieu.
 * - SoLuong: Số nguyên > 0.
 * - NgayHetHan: Phải > thời điểm hiện tại.
 */
const createVoucher = async (req, res, next) => {
  try {
    const { Code, GiaTriGiam, LoaiGiam, GiaTriToiThieu, SoLuong, NgayHetHan, TrangThai } = req.body;

    // 1. Validate Code
    if (!Code || !String(Code).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher (Code) không được để trống'
      });
    }

    const rawCode = String(Code).trim();
    if (/\s/.test(rawCode)) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher không được chứa khoảng trắng'
      });
    }

    const formattedCode = rawCode.toUpperCase();

    // 2. Validate GiaTriGiam
    const giaTriGiamNum = Number(GiaTriGiam);
    if (GiaTriGiam === undefined || GiaTriGiam === null || isNaN(giaTriGiamNum) || giaTriGiamNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị giảm (GiaTriGiam) phải là số lớn hơn 0'
      });
    }

    // 3. Validate GiaTriToiThieu
    const giaTriToiThieuNum = Number(GiaTriToiThieu);
    if (
      GiaTriToiThieu === undefined ||
      GiaTriToiThieu === null ||
      isNaN(giaTriToiThieuNum) ||
      giaTriToiThieuNum <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị tối thiểu (GiaTriToiThieu) phải là số lớn hơn 0'
      });
    }

    if (giaTriGiamNum > giaTriToiThieuNum) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị giảm không được lớn hơn giá trị đơn hàng tối thiểu'
      });
    }

    // 4. Validate SoLuong
    const soLuongNum = Number(SoLuong);
    if (
      SoLuong === undefined ||
      SoLuong === null ||
      isNaN(soLuongNum) ||
      !Number.isInteger(soLuongNum) ||
      soLuongNum <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng (SoLuong) phải là số nguyên lớn hơn 0'
      });
    }

    // 5. Validate NgayHetHan
    if (!NgayHetHan) {
      return res.status(400).json({
        success: false,
        message: 'Ngày hết hạn (NgayHetHan) không được để trống'
      });
    }

    const expireDate = new Date(NgayHetHan);
    if (isNaN(expireDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Ngày hết hạn không đúng định dạng ngày tháng'
      });
    }

    if (expireDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Ngày hết hạn phải lớn hơn thời điểm hiện tại'
      });
    }

    // Kiểm tra trùng lặp Code
    const [existing] = await pool.query(
      `SELECT MaVoucher FROM voucher WHERE UPPER(Code) = ?`,
      [formattedCode]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher này đã tồn tại trên hệ thống'
      });
    }

    const voucherType = LoaiGiam === 'phantram' ? 'phantram' : 'tien';
    const status = TrangThai !== undefined ? (Number(TrangThai) === 0 ? 0 : 1) : 1;
    const formattedExpiryDate = formatDate(expireDate);

    const [result] = await pool.query(
      `INSERT INTO voucher (Code, GiaTriGiam, LoaiGiam, GiaTriToiThieu, SoLuong, NgayHetHan, TrangThai)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [formattedCode, giaTriGiamNum, voucherType, giaTriToiThieuNum, soLuongNum, formattedExpiryDate, status]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm mã giảm giá thành công',
      data: {
        MaVoucher: result.insertId,
        Code: formattedCode,
        GiaTriGiam: giaTriGiamNum,
        LoaiGiam: voucherType,
        GiaTriToiThieu: giaTriToiThieuNum,
        SoLuong: soLuongNum,
        NgayHetHan: expireDate,
        TrangThai: status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. PUT /api/v1/admin/vouchers/:id
 * Sửa thông tin Voucher
 */
const updateVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const voucherId = Number(id);

    if (isNaN(voucherId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher không hợp lệ'
      });
    }

    const [existing] = await pool.query(
      `SELECT * FROM voucher WHERE MaVoucher = ?`,
      [voucherId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã giảm giá'
      });
    }

    const currentVoucher = existing[0];
    const { Code, GiaTriGiam, LoaiGiam, GiaTriToiThieu, SoLuong, NgayHetHan, TrangThai } = req.body;

    // Validate Code nếu có truyền lên
    let newCode = currentVoucher.Code;
    if (Code !== undefined) {
      if (!String(Code).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Mã voucher không được để trống'
        });
      }
      const rawCode = String(Code).trim();
      if (/\s/.test(rawCode)) {
        return res.status(400).json({
          success: false,
          message: 'Mã voucher không được chứa khoảng trắng'
        });
      }
      newCode = rawCode.toUpperCase();

      // Kiểm tra trùng code với voucher khác
      const [duplicates] = await pool.query(
        `SELECT MaVoucher FROM voucher WHERE UPPER(Code) = ? AND MaVoucher != ?`,
        [newCode, voucherId]
      );
      if (duplicates.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Mã voucher này đã bị trùng lặp với một voucher khác'
        });
      }
    }

    // Validate GiaTriGiam & GiaTriToiThieu
    const newGiaTriGiam = GiaTriGiam !== undefined ? Number(GiaTriGiam) : Number(currentVoucher.GiaTriGiam);
    if (isNaN(newGiaTriGiam) || newGiaTriGiam <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị giảm phải là số lớn hơn 0'
      });
    }

    const newGiaTriToiThieu = GiaTriToiThieu !== undefined ? Number(GiaTriToiThieu) : Number(currentVoucher.GiaTriToiThieu);
    if (isNaN(newGiaTriToiThieu) || newGiaTriToiThieu <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị tối thiểu phải là số lớn hơn 0'
      });
    }

    if (newGiaTriGiam > newGiaTriToiThieu) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị giảm không được lớn hơn giá trị đơn hàng tối thiểu'
      });
    }

    // Validate SoLuong
    const newSoLuong = SoLuong !== undefined ? Number(SoLuong) : currentVoucher.SoLuong;
    if (isNaN(newSoLuong) || !Number.isInteger(newSoLuong) || newSoLuong <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng phải là số nguyên lớn hơn 0'
      });
    }

    // Validate NgayHetHan
    let newExpireDate = new Date(currentVoucher.NgayHetHan);
    if (NgayHetHan !== undefined) {
      newExpireDate = new Date(NgayHetHan);
      if (isNaN(newExpireDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Ngày hết hạn không đúng định dạng ngày tháng'
        });
      }
      if (newExpireDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Ngày hết hạn phải lớn hơn thời điểm hiện tại'
        });
      }
    }

    const newLoaiGiam = LoaiGiam !== undefined ? (LoaiGiam === 'phantram' ? 'phantram' : 'tien') : currentVoucher.LoaiGiam;
    const newTrangThai = TrangThai !== undefined ? (Number(TrangThai) === 0 ? 0 : 1) : currentVoucher.TrangThai;

    const formattedExpiryDate = formatDate(newExpireDate);

    await pool.query(
      `UPDATE voucher SET
         Code = ?,
         GiaTriGiam = ?,
         LoaiGiam = ?,
         GiaTriToiThieu = ?,
         SoLuong = ?,
         NgayHetHan = ?,
         TrangThai = ?
       WHERE MaVoucher = ?`,
      [newCode, newGiaTriGiam, newLoaiGiam, newGiaTriToiThieu, newSoLuong, formattedExpiryDate, newTrangThai, voucherId]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin mã giảm giá thành công',
      data: {
        MaVoucher: voucherId,
        Code: newCode,
        GiaTriGiam: newGiaTriGiam,
        LoaiGiam: newLoaiGiam,
        GiaTriToiThieu: newGiaTriToiThieu,
        SoLuong: newSoLuong,
        NgayHetHan: newExpireDate,
        TrangThai: newTrangThai
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. PATCH /api/v1/admin/vouchers/:id/toggle-status
 * Đổi trạng thái TrangThai thủ công (1 -> 0 hoặc 0 -> 1)
 */
const toggleVoucherStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const voucherId = Number(id);

    if (isNaN(voucherId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher không hợp lệ'
      });
    }

    const [existing] = await pool.query(
      `SELECT MaVoucher, TrangThai FROM voucher WHERE MaVoucher = ?`,
      [voucherId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã giảm giá'
      });
    }

    const currentStatus = existing[0].TrangThai;
    const newStatus = currentStatus === 1 ? 0 : 1;

    await pool.query(
      `UPDATE voucher SET TrangThai = ? WHERE MaVoucher = ?`,
      [newStatus, voucherId]
    );

    return res.status(200).json({
      success: true,
      message: `Đã ${newStatus === 1 ? 'kích hoạt' : 'vô hiệu hóa'} mã giảm giá thành công`,
      data: {
        MaVoucher: voucherId,
        TrangThai: newStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. DELETE /api/v1/admin/vouchers/:id
 * Xóa mã voucher
 */
const deleteVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const voucherId = Number(id);

    if (isNaN(voucherId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher không hợp lệ'
      });
    }

    const [existing] = await pool.query(
      `SELECT MaVoucher FROM voucher WHERE MaVoucher = ?`,
      [voucherId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã giảm giá'
      });
    }

    await pool.query(`DELETE FROM voucher WHERE MaVoucher = ?`, [voucherId]);

    return res.status(200).json({
      success: true,
      message: 'Xóa mã giảm giá thành công'
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
        message: 'Không thể xóa mã giảm giá này do đã được sử dụng trong đơn hàng'
      });
    }
    next(error);
  }
};

module.exports = {
  getAllVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  toggleVoucherStatus,
  deleteVoucher
};
