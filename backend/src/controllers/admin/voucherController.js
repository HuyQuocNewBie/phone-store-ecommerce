const { pool } = require('../../../config/db');

const ALLOWED_VOUCHER_GROUPS = ['GiamGiaDon', 'FreeShip'];
const ALLOWED_DISCOUNT_TYPES = ['tien', 'phantram', 'freeship'];

/**
 * Helper function format date sang định dạng YYYY-MM-DD HH:mm:ss cho MySQL hoặc trả về ISO String / Object
 */
const formatDate = (dateObj) => {
  return new Date(dateObj).toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Helper chuẩn hóa giá trị GiamToiDa (cho phép null / chuỗi rỗng nếu không giới hạn)
 */
const parseOptionalMaxDiscount = (raw) => {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { valid: true, value: null };
  }
  const num = Number(raw);
  if (isNaN(num) || num <= 0) {
    return { valid: false, message: 'Giảm tối đa (GiamToiDa) phải là số lớn hơn 0 hoặc để trống' };
  }
  return { valid: true, value: num };
};

/**
 * Helper xác thực cặp NhomVoucher và LoaiGiam
 */
const resolveGroupAndType = (rawGroup, rawType, fallbackGroup = 'GiamGiaDon', fallbackType = 'tien') => {
  let nhomVoucher = rawGroup !== undefined && rawGroup !== null && String(rawGroup).trim() !== ''
    ? String(rawGroup).trim()
    : null;
  let loaiGiam = rawType !== undefined && rawType !== null && String(rawType).trim() !== ''
    ? String(rawType).trim().toLowerCase()
    : null;

  if (nhomVoucher && !ALLOWED_VOUCHER_GROUPS.includes(nhomVoucher)) {
    return {
      valid: false,
      message: `Nhóm voucher (NhomVoucher) chỉ chấp nhận: ${ALLOWED_VOUCHER_GROUPS.join(', ')}`
    };
  }

  if (loaiGiam && !ALLOWED_DISCOUNT_TYPES.includes(loaiGiam)) {
    return {
      valid: false,
      message: `Loại giảm (LoaiGiam) chỉ chấp nhận: ${ALLOWED_DISCOUNT_TYPES.join(', ')}`
    };
  }

  // Tự suy luận nếu chỉ truyền 1 trong 2 trường
  if (!nhomVoucher) {
    nhomVoucher = loaiGiam === 'freeship' ? 'FreeShip' : fallbackGroup;
  }
  if (!loaiGiam) {
    loaiGiam = nhomVoucher === 'FreeShip' ? 'freeship' : fallbackType;
  }

  // Kiểm tra tính nhất quán: GiamGiaDon không thể có LoaiGiam = 'freeship'
  if (nhomVoucher === 'GiamGiaDon' && loaiGiam === 'freeship') {
    return {
      valid: false,
      message: 'Voucher nhóm GiamGiaDon chỉ hỗ trợ LoaiGiam là "tien" hoặc "phantram"'
    };
  }

  return { valid: true, nhomVoucher, loaiGiam };
};

/**
 * Format 1 bản ghi voucher trả ra client
 */
const formatAdminVoucher = (item, stt = undefined) => {
  const result = {
    MaVoucher: item.MaVoucher,
    Code: item.Code,
    NhomVoucher: item.NhomVoucher || (item.LoaiGiam === 'freeship' ? 'FreeShip' : 'GiamGiaDon'),
    GiaTriGiam: Number(item.GiaTriGiam),
    LoaiGiam: item.LoaiGiam,
    GiamToiDa: item.GiamToiDa !== null && item.GiamToiDa !== undefined ? Number(item.GiamToiDa) : null,
    GiaTriToiThieu: Number(item.GiaTriToiThieu),
    SoLuong: Number(item.SoLuong),
    NgayHetHan: item.NgayHetHan,
    TrangThai: Number(item.TrangThai)
  };
  if (stt !== undefined) {
    return { STT: stt, ...result };
  }
  return result;
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
         NhomVoucher,
         GiaTriGiam,
         LoaiGiam,
         GiamToiDa,
         GiaTriToiThieu,
         SoLuong,
         NgayHetHan,
         TrangThai
       FROM voucher
       ORDER BY MaVoucher DESC`
    );

    const vouchers = rows.map((item, index) => formatAdminVoucher(item, index + 1));

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
         NhomVoucher,
         GiaTriGiam,
         LoaiGiam,
         GiamToiDa,
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

    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết mã giảm giá thành công',
      data: formatAdminVoucher(rows[0])
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/v1/admin/vouchers
 * Thêm mã voucher mới
 * Hỗ trợ NhomVoucher ('GiamGiaDon' | 'FreeShip'), LoaiGiam ('tien' | 'phantram' | 'freeship'), GiamToiDa.
 */
const createVoucher = async (req, res, next) => {
  try {
    const {
      Code,
      NhomVoucher,
      GiaTriGiam,
      LoaiGiam,
      GiamToiDa,
      GiaTriToiThieu,
      SoLuong,
      NgayHetHan,
      TrangThai
    } = req.body;

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

    // 2. Validate NhomVoucher & LoaiGiam
    const groupTypeResult = resolveGroupAndType(NhomVoucher, LoaiGiam, 'GiamGiaDon', 'tien');
    if (!groupTypeResult.valid) {
      return res.status(400).json({
        success: false,
        message: groupTypeResult.message
      });
    }
    const { nhomVoucher, loaiGiam } = groupTypeResult;

    // 3. Validate GiamToiDa (không bắt buộc; nếu nhập phải > 0)
    const maxDiscountResult = parseOptionalMaxDiscount(GiamToiDa);
    if (!maxDiscountResult.valid) {
      return res.status(400).json({
        success: false,
        message: maxDiscountResult.message
      });
    }
    const giamToiDaNum = maxDiscountResult.value;

    // 4. Validate GiaTriGiam theo từng LoaiGiam
    let giaTriGiamNum;
    if (loaiGiam === 'freeship') {
      if (GiaTriGiam === undefined || GiaTriGiam === null || String(GiaTriGiam).trim() === '') {
        giaTriGiamNum = giamToiDaNum !== null ? giamToiDaNum : 0;
      } else {
        giaTriGiamNum = Number(GiaTriGiam);
        if (isNaN(giaTriGiamNum) || giaTriGiamNum < 0) {
          return res.status(400).json({
            success: false,
            message: 'Giá trị giảm phí ship (GiaTriGiam) phải là số lớn hơn hoặc bằng 0'
          });
        }
      }
    } else {
      giaTriGiamNum = Number(GiaTriGiam);
      if (GiaTriGiam === undefined || GiaTriGiam === null || isNaN(giaTriGiamNum) || giaTriGiamNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Giá trị giảm (GiaTriGiam) phải là số lớn hơn 0'
        });
      }
      if (loaiGiam === 'phantram' && giaTriGiamNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Giá trị giảm theo phần trăm (GiaTriGiam) không được vượt quá 100%'
        });
      }
    }

    // 5. Validate GiaTriToiThieu (cho phép >= 0 để hỗ trợ voucher Freeship / đơn mọi giá trị)
    const giaTriToiThieuNum =
      GiaTriToiThieu === undefined || GiaTriToiThieu === null || String(GiaTriToiThieu).trim() === ''
        ? 0
        : Number(GiaTriToiThieu);

    if (isNaN(giaTriToiThieuNum) || giaTriToiThieuNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị đơn hàng tối thiểu (GiaTriToiThieu) phải là số lớn hơn hoặc bằng 0'
      });
    }

    if (
      nhomVoucher === 'GiamGiaDon' &&
      loaiGiam === 'tien' &&
      giaTriToiThieuNum > 0 &&
      giaTriGiamNum > giaTriToiThieuNum
    ) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị giảm không được lớn hơn giá trị đơn hàng tối thiểu'
      });
    }

    // 6. Validate SoLuong
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

    // 7. Validate NgayHetHan
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

    const status = TrangThai !== undefined ? (Number(TrangThai) === 0 ? 0 : 1) : 1;
    const formattedExpiryDate = formatDate(expireDate);

    const [result] = await pool.query(
      `INSERT INTO voucher
         (Code, NhomVoucher, GiaTriGiam, LoaiGiam, GiamToiDa, GiaTriToiThieu, SoLuong, NgayHetHan, TrangThai)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        formattedCode,
        nhomVoucher,
        giaTriGiamNum,
        loaiGiam,
        giamToiDaNum,
        giaTriToiThieuNum,
        soLuongNum,
        formattedExpiryDate,
        status
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm mã giảm giá thành công',
      data: {
        MaVoucher: result.insertId,
        Code: formattedCode,
        NhomVoucher: nhomVoucher,
        GiaTriGiam: giaTriGiamNum,
        LoaiGiam: loaiGiam,
        GiamToiDa: giamToiDaNum,
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
    const {
      Code,
      NhomVoucher,
      GiaTriGiam,
      LoaiGiam,
      GiamToiDa,
      GiaTriToiThieu,
      SoLuong,
      NgayHetHan,
      TrangThai
    } = req.body;

    // 1. Validate Code nếu có truyền lên
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

    // 2. Validate NhomVoucher & LoaiGiam
    const groupTypeResult = resolveGroupAndType(
      NhomVoucher !== undefined ? NhomVoucher : currentVoucher.NhomVoucher,
      LoaiGiam !== undefined ? LoaiGiam : currentVoucher.LoaiGiam,
      currentVoucher.NhomVoucher || 'GiamGiaDon',
      currentVoucher.LoaiGiam || 'tien'
    );
    if (!groupTypeResult.valid) {
      return res.status(400).json({
        success: false,
        message: groupTypeResult.message
      });
    }
    const newNhomVoucher = groupTypeResult.nhomVoucher;
    const newLoaiGiam = groupTypeResult.loaiGiam;

    // 3. Validate GiamToiDa
    let newGiamToiDa =
      currentVoucher.GiamToiDa !== null && currentVoucher.GiamToiDa !== undefined
        ? Number(currentVoucher.GiamToiDa)
        : null;
    if (GiamToiDa !== undefined) {
      const maxDiscountResult = parseOptionalMaxDiscount(GiamToiDa);
      if (!maxDiscountResult.valid) {
        return res.status(400).json({
          success: false,
          message: maxDiscountResult.message
        });
      }
      newGiamToiDa = maxDiscountResult.value;
    }

    // 4. Validate GiaTriGiam
    const newGiaTriGiam = GiaTriGiam !== undefined ? Number(GiaTriGiam) : Number(currentVoucher.GiaTriGiam);
    if (newLoaiGiam === 'freeship') {
      if (isNaN(newGiaTriGiam) || newGiaTriGiam < 0) {
        return res.status(400).json({
          success: false,
          message: 'Giá trị giảm phí ship phải là số lớn hơn hoặc bằng 0'
        });
      }
    } else {
      if (isNaN(newGiaTriGiam) || newGiaTriGiam <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Giá trị giảm phải là số lớn hơn 0'
        });
      }
      if (newLoaiGiam === 'phantram' && newGiaTriGiam > 100) {
        return res.status(400).json({
          success: false,
          message: 'Giá trị giảm theo phần trăm không được vượt quá 100%'
        });
      }
    }

    // 5. Validate GiaTriToiThieu
    const newGiaTriToiThieu =
      GiaTriToiThieu !== undefined ? Number(GiaTriToiThieu) : Number(currentVoucher.GiaTriToiThieu);
    if (isNaN(newGiaTriToiThieu) || newGiaTriToiThieu < 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị tối thiểu phải là số lớn hơn hoặc bằng 0'
      });
    }

    if (
      newNhomVoucher === 'GiamGiaDon' &&
      newLoaiGiam === 'tien' &&
      newGiaTriToiThieu > 0 &&
      newGiaTriGiam > newGiaTriToiThieu
    ) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị giảm không được lớn hơn giá trị đơn hàng tối thiểu'
      });
    }

    // 6. Validate SoLuong
    const newSoLuong = SoLuong !== undefined ? Number(SoLuong) : Number(currentVoucher.SoLuong);
    if (isNaN(newSoLuong) || !Number.isInteger(newSoLuong) || newSoLuong < 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng phải là số nguyên lớn hơn hoặc bằng 0'
      });
    }

    // 7. Validate NgayHetHan
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

    const newTrangThai = TrangThai !== undefined ? (Number(TrangThai) === 0 ? 0 : 1) : Number(currentVoucher.TrangThai);
    const formattedExpiryDate = formatDate(newExpireDate);

    await pool.query(
      `UPDATE voucher SET
         Code = ?,
         NhomVoucher = ?,
         GiaTriGiam = ?,
         LoaiGiam = ?,
         GiamToiDa = ?,
         GiaTriToiThieu = ?,
         SoLuong = ?,
         NgayHetHan = ?,
         TrangThai = ?
       WHERE MaVoucher = ?`,
      [
        newCode,
        newNhomVoucher,
        newGiaTriGiam,
        newLoaiGiam,
        newGiamToiDa,
        newGiaTriToiThieu,
        newSoLuong,
        formattedExpiryDate,
        newTrangThai,
        voucherId
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin mã giảm giá thành công',
      data: {
        MaVoucher: voucherId,
        Code: newCode,
        NhomVoucher: newNhomVoucher,
        GiaTriGiam: newGiaTriGiam,
        LoaiGiam: newLoaiGiam,
        GiamToiDa: newGiamToiDa,
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
