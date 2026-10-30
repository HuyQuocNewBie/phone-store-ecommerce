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

    const sql = `
      SELECT
        nd.MaNguoiDung,
        nd.TaiKhoan,
        nd.Email,
        nd.HoTen,
        nd.GioiTinh,
        nd.NgaySinh,
        nd.SoDienThoai,
        nd.AnhDaiDien,
        nd.MaVaiTro,
        nd.NgayTao,
        sd.MaDiaChi,
        sd.TenGoiNho,
        sd.TinhThanh,
        sd.QuanHuyen,
        sd.PhuongXa,
        sd.DiaChiNha
      FROM nguoidung nd
      LEFT JOIN sodiachi sd
        ON sd.MaNguoiDung = nd.MaNguoiDung
        AND sd.LaMacDinh = 1
      WHERE nd.MaNguoiDung = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [MaNguoiDung]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    const row = rows[0];

    // Tách thông tin user và địa chỉ mặc định
    const user = {
      MaNguoiDung: row.MaNguoiDung,
      TaiKhoan: row.TaiKhoan,
      Email: row.Email,
      HoTen: row.HoTen,
      GioiTinh: row.GioiTinh,
      NgaySinh: row.NgaySinh,
      SoDienThoai: row.SoDienThoai,
      AnhDaiDien: row.AnhDaiDien,
      MaVaiTro: row.MaVaiTro,
      NgayTao: row.NgayTao
    };

    const diaChiMacDinh = row.MaDiaChi
      ? {
          MaDiaChi: row.MaDiaChi,
          TenGoiNho: row.TenGoiNho,
          TinhThanh: row.TinhThanh,
          QuanHuyen: row.QuanHuyen,
          PhuongXa: row.PhuongXa,
          DiaChiNha: row.DiaChiNha
        }
      : null;

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin hồ sơ thành công',
      data: {
        ...user,
        diaChiMacDinh
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. PUT /api/v1/profile
//    Cập nhật GioiTinh, NgaySinh, SoDienThoai, AnhDaiDien, HoTen
//    KHÔNG cho phép sửa TaiKhoan và Email
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;

    // Chỉ lấy các trường được phép cập nhật, bỏ qua TaiKhoan và Email
    const {
      HoTen,
      GioiTinh,
      NgaySinh,
      SoDienThoai,
      AnhDaiDien
    } = req.body;

    // Xây dựng object cập nhật động (chỉ cập nhật field có giá trị)
    const updates = {};

    if (HoTen !== undefined) updates.HoTen = String(HoTen).trim() || null;
    if (GioiTinh !== undefined) {
      const validGenders = ['Nam', 'Nữ', 'Khác', null, ''];
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

    // Trả về bản ghi mới nhất
    const [rows] = await pool.query(
      `SELECT MaNguoiDung, TaiKhoan, Email, HoTen, GioiTinh, NgaySinh, SoDienThoai, AnhDaiDien, MaVaiTro, NgayTao
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

