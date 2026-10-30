const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { pool } = require('../../../config/db');

// ─────────────────────────────────────────────
// Multer – memory storage, chỉ nhận image/*, tối đa 2 MB
// ─────────────────────────────────────────────
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(
        Object.assign(new Error('Chỉ chấp nhận file ảnh (image/*).'), {
          code: 'INVALID_MIME_TYPE'
        }),
        false
      );
    }
    cb(null, true);
  }
});

/**
 * Helper: upload buffer lên Cloudinary (folder avatars)
 */
const uploadBufferToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'avatars',
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/v1/profile
//    Lấy thông tin user từ bảng nguoidung JOIN sodiachi (địa chỉ mặc định)
// ─────────────────────────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;

    // Truy vấn thông tin người dùng
    const userSql = `
      SELECT
        MaNguoiDung,
        TaiKhoan,
        Email,
        AnhDaiDien,
        GioiTinh,
        NgaySinh,
        SoDienThoai,
        DiaChi,
        MaVaiTro,
        NgayCapNhatMatKhau
      FROM nguoidung
      WHERE MaNguoiDung = ?
      LIMIT 1
    `;

    // Subquery: lấy địa chỉ mặc định (LaMacDinh = 1)
    const addressSql = `
      SELECT *
      FROM sodiachi s
      WHERE s.MaNguoiDung = ? AND s.LaMacDinh = 1
      LIMIT 1
    `;

    const [[userRows], [addressRows]] = await Promise.all([
      pool.query(userSql, [MaNguoiDung]),
      pool.query(addressSql, [MaNguoiDung])
    ]);

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    const user = userRows[0];
    const addr = addressRows.length > 0 ? addressRows[0] : null;

    // Ghép chuỗi địa chỉ đầy đủ: [DiaChiNha], [PhuongXa], [QuanHuyen], [TinhThanh]
    let DiaChiMacDinh = null;
    let diaChiMacDinh = null;

    if (addr) {
      const parts = [addr.DiaChiNha, addr.PhuongXa, addr.QuanHuyen, addr.TinhThanh]
        .filter((p) => p && String(p).trim() !== '');

      DiaChiMacDinh = parts.length > 0
        ? parts.join(', ')
        : 'Chưa thiết lập địa chỉ';

      diaChiMacDinh = {
        MaDiaChi: addr.MaDiaChi,
        TenGoiNho: addr.TenGoiNho,
        TinhThanh: addr.TinhThanh,
        QuanHuyen: addr.QuanHuyen,
        PhuongXa: addr.PhuongXa,
        DiaChiNha: addr.DiaChiNha,
        DiaChiMacDinh
      };
    }

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin hồ sơ thành công',
      data: {
        MaNguoiDung: user.MaNguoiDung,
        TaiKhoan: user.TaiKhoan,
        Email: user.Email,
        AnhDaiDien: user.AnhDaiDien,
        GioiTinh: user.GioiTinh,
        NgaySinh: user.NgaySinh,
        SoDienThoai: user.SoDienThoai,
        DiaChi: user.DiaChi,
        MaVaiTro: user.MaVaiTro,
        NgayCapNhatMatKhau: user.NgayCapNhatMatKhau,
        DiaChiMacDinh: diaChiMacDinh ? DiaChiMacDinh : null,
        diaChiMacDinh
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. PUT /api/v1/profile
//    Cập nhật GioiTinh, NgaySinh, SoDienThoai, AnhDaiDien, DiaChi
//    KHÔNG cho phép sửa TaiKhoan, Email, MatKhau, MaVaiTro
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;

    // Các cột được phép cập nhật theo đúng schema bảng nguoidung
    const {
      GioiTinh,
      NgaySinh,
      SoDienThoai,
      AnhDaiDien,
      DiaChi
    } = req.body;

    // Xây dựng object cập nhật động (chỉ cập nhật field được gửi lên)
    const updates = {};

    if (GioiTinh !== undefined) {
      if (GioiTinh !== null && GioiTinh !== '' && !['Nam', 'Nữ', 'Khác'].includes(GioiTinh)) {
        return res.status(400).json({
          success: false,
          message: 'Giới tính không hợp lệ. Chấp nhận: Nam, Nữ, Khác'
        });
      }
      updates.GioiTinh = GioiTinh || null;
    }
    if (NgaySinh !== undefined) {
      if (NgaySinh !== null && NgaySinh !== '') {
        const dateObj = new Date(NgaySinh);
        if (isNaN(dateObj.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Ngày sinh không hợp lệ. Định dạng: YYYY-MM-DD'
          });
        }
        if (dateObj > new Date()) {
          return res.status(400).json({
            success: false,
            message: 'Ngày sinh không được lớn hơn ngày hiện tại'
          });
        }
        updates.NgaySinh = NgaySinh;
      } else {
        updates.NgaySinh = null;
      }
    }
    if (SoDienThoai !== undefined) {
      if (SoDienThoai !== null && SoDienThoai !== '') {
        const phoneRegex = /^(0|\+84)[0-9]{8,10}$/;
        if (!phoneRegex.test(String(SoDienThoai).trim())) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại không hợp lệ'
          });
        }
        updates.SoDienThoai = String(SoDienThoai).trim();
      } else {
        updates.SoDienThoai = null;
      }
    }
    if (AnhDaiDien !== undefined) {
      updates.AnhDaiDien = AnhDaiDien || null;
    }
    if (DiaChi !== undefined) {
      updates.DiaChi = DiaChi ? String(DiaChi).trim() || null : null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có trường nào được cung cấp để cập nhật'
      });
    }

    // Tạo câu lệnh SET động
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(updates);

    await pool.query(
      `UPDATE nguoidung SET ${fields} WHERE MaNguoiDung = ?`,
      [...values, MaNguoiDung]
    );

    // Trả về bản ghi mới nhất với đúng các cột theo schema
    const [rows] = await pool.query(
      `SELECT MaNguoiDung, TaiKhoan, Email, AnhDaiDien, GioiTinh, NgaySinh, SoDienThoai, DiaChi, MaVaiTro, NgayCapNhatMatKhau
       FROM nguoidung WHERE MaNguoiDung = ?`,
      [MaNguoiDung]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/v1/upload/avatar
//    Upload ảnh đại diện lên Cloudinary
//    BACKEND VALIDATION: Mime-type image/*, size <= 2MB
// ─────────────────────────────────────────────────────────────────────────────
const uploadAvatar = [
  // Multer middleware (single field 'avatar')
  (req, res, next) => {
    const multerSingle = avatarUpload.single('avatar');
    multerSingle(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Kích thước ảnh vượt quá giới hạn cho phép (tối đa 2MB)'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: `Tên trường không hợp lệ (nhận '${err.field}', cần key 'avatar')`
          });
        }
        if (err.code === 'INVALID_MIME_TYPE') {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }
        return res.status(400).json({
          success: false,
          message: `Lỗi upload: ${err.message}`
        });
      }
      next();
    });
  },

  // Controller handler
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn file ảnh để upload (key: avatar)'
        });
      }

      // Double-check mime type (đề phòng bypass)
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ chấp nhận file ảnh (image/*)'
        });
      }

      // Upload lên Cloudinary folder 'avatars'
      const result = await uploadBufferToCloudinary(req.file.buffer);

      return res.status(200).json({
        success: true,
        message: 'Upload ảnh đại diện thành công',
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes
        }
      });
    } catch (error) {
      next(error);
    }
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. PUT /api/v1/profile/change-password
//    Đổi mật khẩu: verify matKhauCu → hash matKhauMoi → UPDATE + NgayCapNhatMatKhau
// ─────────────────────────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;
    const { matKhauCu, matKhauMoi, xacNhanMatKhauMoi } = req.body;

    // Validate đầu vào
    if (!matKhauCu || !matKhauMoi) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu cũ và mật khẩu mới'
      });
    }

    if (matKhauMoi.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    if (xacNhanMatKhauMoi !== undefined && matKhauMoi !== xacNhanMatKhauMoi) {
      return res.status(400).json({
        success: false,
        message: 'Xác nhận mật khẩu mới không khớp'
      });
    }

    if (matKhauCu === matKhauMoi) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới không được trùng với mật khẩu cũ'
      });
    }

    // Lấy mật khẩu hiện tại từ DB
    const [rows] = await pool.query(
      'SELECT MatKhau FROM nguoidung WHERE MaNguoiDung = ?',
      [MaNguoiDung]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const { MatKhau: currentHashedPassword } = rows[0];

    // Verify mật khẩu cũ bằng bcrypt.compare
    const isMatch = await bcrypt.compare(matKhauCu, currentHashedPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu cũ không chính xác'
      });
    }

    // Hash mật khẩu mới bằng bcrypt.hash
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(matKhauMoi, salt);

    // Cập nhật mật khẩu mới + NgayCapNhatMatKhau = NOW()
    await pool.query(
      `UPDATE nguoidung
       SET MatKhau = ?, NgayCapNhatMatKhau = NOW()
       WHERE MaNguoiDung = ?`,
      [newHashedPassword, MaNguoiDung]
    );

    return res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword
};

