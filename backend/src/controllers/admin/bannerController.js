const multer = require('multer');
const { pool } = require('../../../config/db');
const { cloudinary } = require('../../../utils/cloudinary');

/**
 * Multer memory storage cho ảnh banner (chỉ nhận image/*, tối đa 10MB)
 */
const bannerMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
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
 * Helper upload buffer ảnh banner lên Cloudinary (folder: banners)
 */
const uploadBannerBufferToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'banners',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Middleware upload 1 ảnh banner qua Multer -> Cloudinary
 * Hỗ trợ tên field phổ biến: HinhAnh, image, Anh, file
 * Gán req.file.path = secure_url nếu upload thành công
 */
const uploadBannerImage = (req, res, next) => {
  const uploadFields = bannerMulter.fields([
    { name: 'HinhAnh', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'Anh', maxCount: 1 },
    { name: 'file', maxCount: 1 }
  ]);

  uploadFields(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: `Lỗi upload: Tên trường file không hợp lệ ('${err.field || 'không xác định'}'). Vui lòng sử dụng key 'HinhAnh'.`
          });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Lỗi upload: Kích thước ảnh banner vượt quá giới hạn cho phép (10MB).'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Lỗi upload file (Multer): ${err.message}`
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Lỗi tải file ảnh banner'
      });
    }

    const uploadedFile =
      req.files?.HinhAnh?.[0] ||
      req.files?.image?.[0] ||
      req.files?.Anh?.[0] ||
      req.files?.file?.[0] ||
      null;

    if (!uploadedFile) {
      return next();
    }

    try {
      const result = await uploadBannerBufferToCloudinary(uploadedFile.buffer);
      uploadedFile.path = result.secure_url;
      uploadedFile.cloudinaryId = result.public_id;
      req.file = uploadedFile;
      return next();
    } catch (uploadError) {
      return res.status(500).json({
        success: false,
        message: `Lỗi upload ảnh banner lên Cloudinary: ${uploadError.message}`
      });
    }
  });
};

/**
 * Helper chuẩn hóa dữ liệu banner trả về
 */
const formatBanner = (row) => ({
  MaBanner: Number(row.MaBanner),
  TieuDe: row.TieuDe,
  MoTaNgan: row.MoTaNgan || null,
  HinhAnh: row.HinhAnh,
  LienKetDich: row.LienKetDich || null,
  ThuTuHienThi: Number(row.ThuTuHienThi),
  TrangThai: Number(row.TrangThai) === 1 ? 1 : 0,
  NgayTao: row.NgayTao
});

/**
 * Helper chuẩn hóa giá trị TrangThai (1 hoặc 0)
 */
const parseStatusFlag = (value, defaultValue = 1) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'active', 'hienthi'].includes(normalized)) return 1;
  if (['0', 'false', 'inactive', 'an'].includes(normalized)) return 0;
  return null;
};

/**
 * Public API: GET /api/v1/banners/active
 * Lấy danh sách banner đang kích hoạt (TrangThai = 1), sắp xếp tăng dần theo ThuTuHienThi
 */
const getActiveBanners = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT MaBanner, TieuDe, MoTaNgan, HinhAnh, LienKetDich, ThuTuHienThi, TrangThai, NgayTao
       FROM banner
       WHERE TrangThai = 1
       ORDER BY ThuTuHienThi ASC, MaBanner ASC`
    );

    const banners = rows.map(formatBanner);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách banner hiển thị thành công',
      data: banners
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin API: GET /api/v1/admin/banners
 * Lấy toàn bộ danh sách banner
 */
const getAllBanners = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT MaBanner, TieuDe, MoTaNgan, HinhAnh, LienKetDich, ThuTuHienThi, TrangThai, NgayTao
       FROM banner
       ORDER BY ThuTuHienThi ASC, MaBanner DESC`
    );

    const banners = rows.map((row, index) => ({
      STT: index + 1,
      ...formatBanner(row)
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách banner thành công',
      data: banners
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin API: POST /api/v1/admin/banners
 * Thêm banner mới (upload ảnh lên Cloudinary qua Multer)
 */
const createBanner = async (req, res, next) => {
  try {
    const { TieuDe, MoTaNgan, LienKetDich, ThuTuHienThi, TrangThai } = req.body;

    if (!TieuDe || !String(TieuDe).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề banner không được để trống'
      });
    }

    const hinhAnhUrl = req.file?.path
      ? req.file.path
      : req.body.HinhAnh && String(req.body.HinhAnh).trim()
        ? String(req.body.HinhAnh).trim()
        : null;

    if (!hinhAnhUrl) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng tải lên hình ảnh banner'
      });
    }

    let orderIndex = 1;
    if (ThuTuHienThi !== undefined && ThuTuHienThi !== null && String(ThuTuHienThi).trim() !== '') {
      orderIndex = Number(ThuTuHienThi);
      if (!Number.isInteger(orderIndex) || orderIndex < 0) {
        return res.status(400).json({
          success: false,
          message: 'Thứ tự hiển thị phải là số nguyên không âm'
        });
      }
    }

    const statusFlag = parseStatusFlag(TrangThai, 1);
    if (statusFlag === null) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái banner không hợp lệ (chỉ nhận 0 hoặc 1)'
      });
    }

    const title = String(TieuDe).trim();
    const shortDesc =
      MoTaNgan !== undefined && MoTaNgan !== null && String(MoTaNgan).trim() !== ''
        ? String(MoTaNgan).trim()
        : null;
    const targetLink =
      LienKetDich !== undefined && LienKetDich !== null && String(LienKetDich).trim() !== ''
        ? String(LienKetDich).trim()
        : null;

    const [result] = await pool.query(
      `INSERT INTO banner (TieuDe, MoTaNgan, HinhAnh, LienKetDich, ThuTuHienThi, TrangThai, NgayTao)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [title, shortDesc, hinhAnhUrl, targetLink, orderIndex, statusFlag]
    );

    const [createdRows] = await pool.query(
      `SELECT MaBanner, TieuDe, MoTaNgan, HinhAnh, LienKetDich, ThuTuHienThi, TrangThai, NgayTao
       FROM banner
       WHERE MaBanner = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm banner mới thành công',
      data: formatBanner(createdRows[0])
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin API: PUT /api/v1/admin/banners/:id
 * Cập nhật tiêu đề, mô tả, liên kết đích, thứ tự và ảnh (nếu có file mới)
 */
const updateBanner = async (req, res, next) => {
  try {
    const bannerId = Number(req.params.id);
    if (!Number.isInteger(bannerId) || bannerId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã banner không hợp lệ'
      });
    }

    const [existingRows] = await pool.query(
      `SELECT MaBanner, TieuDe, MoTaNgan, HinhAnh, LienKetDich, ThuTuHienThi, TrangThai, NgayTao
       FROM banner
       WHERE MaBanner = ?`,
      [bannerId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy banner'
      });
    }

    const current = existingRows[0];
    const { TieuDe, MoTaNgan, LienKetDich, ThuTuHienThi, TrangThai } = req.body;

    const updatedTitle = TieuDe !== undefined ? String(TieuDe).trim() : current.TieuDe;
    if (!updatedTitle) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề banner không được để trống'
      });
    }

    const updatedDesc =
      MoTaNgan !== undefined
        ? MoTaNgan !== null && String(MoTaNgan).trim() !== ''
          ? String(MoTaNgan).trim()
          : null
        : current.MoTaNgan;

    const updatedLink =
      LienKetDich !== undefined
        ? LienKetDich !== null && String(LienKetDich).trim() !== ''
          ? String(LienKetDich).trim()
          : null
        : current.LienKetDich;

    let updatedOrder = Number(current.ThuTuHienThi);
    if (ThuTuHienThi !== undefined && ThuTuHienThi !== null && String(ThuTuHienThi).trim() !== '') {
      updatedOrder = Number(ThuTuHienThi);
      if (!Number.isInteger(updatedOrder) || updatedOrder < 0) {
        return res.status(400).json({
          success: false,
          message: 'Thứ tự hiển thị phải là số nguyên không âm'
        });
      }
    }

    let updatedStatus = Number(current.TrangThai) === 1 ? 1 : 0;
    if (TrangThai !== undefined && TrangThai !== null && String(TrangThai).trim() !== '') {
      const parsedStatus = parseStatusFlag(TrangThai, updatedStatus);
      if (parsedStatus === null) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái banner không hợp lệ (chỉ nhận 0 hoặc 1)'
        });
      }
      updatedStatus = parsedStatus;
    }

    let updatedImage = current.HinhAnh;
    if (req.file?.path) {
      updatedImage = req.file.path;
    } else if (req.body.HinhAnh !== undefined && String(req.body.HinhAnh).trim() !== '') {
      updatedImage = String(req.body.HinhAnh).trim();
    }

    await pool.query(
      `UPDATE banner
       SET TieuDe = ?, MoTaNgan = ?, HinhAnh = ?, LienKetDich = ?, ThuTuHienThi = ?, TrangThai = ?
       WHERE MaBanner = ?`,
      [updatedTitle, updatedDesc, updatedImage, updatedLink, updatedOrder, updatedStatus, bannerId]
    );

    const [updatedRows] = await pool.query(
      `SELECT MaBanner, TieuDe, MoTaNgan, HinhAnh, LienKetDich, ThuTuHienThi, TrangThai, NgayTao
       FROM banner
       WHERE MaBanner = ?`,
      [bannerId]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật banner thành công',
      data: formatBanner(updatedRows[0])
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin API: PATCH /api/v1/admin/banners/:id/toggle
 * Đảo trạng thái TrangThai (1 <-> 0)
 */
const toggleBannerStatus = async (req, res, next) => {
  try {
    const bannerId = Number(req.params.id);
    if (!Number.isInteger(bannerId) || bannerId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã banner không hợp lệ'
      });
    }

    const [existingRows] = await pool.query(
      `SELECT MaBanner, TieuDe, MoTaNgan, HinhAnh, LienKetDich, ThuTuHienThi, TrangThai, NgayTao
       FROM banner
       WHERE MaBanner = ?`,
      [bannerId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy banner'
      });
    }

    const currentStatus = Number(existingRows[0].TrangThai) === 1 ? 1 : 0;
    const newStatus = currentStatus === 1 ? 0 : 1;

    await pool.query(
      `UPDATE banner SET TrangThai = ? WHERE MaBanner = ?`,
      [newStatus, bannerId]
    );

    return res.status(200).json({
      success: true,
      message: newStatus === 1 ? 'Đã bật hiển thị banner' : 'Đã ẩn banner',
      data: formatBanner({
        ...existingRows[0],
        TrangThai: newStatus
      })
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin API: DELETE /api/v1/admin/banners/:id
 * Xóa banner
 */
const deleteBanner = async (req, res, next) => {
  try {
    const bannerId = Number(req.params.id);
    if (!Number.isInteger(bannerId) || bannerId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã banner không hợp lệ'
      });
    }

    const [existingRows] = await pool.query(
      `SELECT MaBanner FROM banner WHERE MaBanner = ?`,
      [bannerId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy banner'
      });
    }

    await pool.query(`DELETE FROM banner WHERE MaBanner = ?`, [bannerId]);

    return res.status(200).json({
      success: true,
      message: 'Xóa banner thành công',
      data: {
        MaBanner: bannerId
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadBannerImage,
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  toggleBannerStatus,
  deleteBanner
};
