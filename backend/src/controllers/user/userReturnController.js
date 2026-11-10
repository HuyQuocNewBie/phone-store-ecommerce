const multer = require('multer');
const { pool } = require('../../../config/db');
const { cloudinary } = require('../../../utils/cloudinary');
const { formatOrderCode } = require('../../utils/formatters');

const VALID_DELIVERED_STATUSES = ['DaGiao', 'Đã giao'];
const MAX_PROOF_FILES = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_PROOF_FILES
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(
        Object.assign(new Error('Chỉ chấp nhận file ảnh (image/*) làm minh chứng đổi trả'), {
          code: 'INVALID_MIME_TYPE'
        }),
        false
      );
    }
    cb(null, true);
  }
});

/**
 * Middleware Multer xử lý upload ảnh minh chứng đổi trả (chấp nhận cả 1 hoặc nhiều ảnh, linh hoạt tên field)
 */
const handleReturnProofUpload = (req, res, next) => {
  const uploadAny = proofUpload.any();
  uploadAny(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Kích thước ảnh vượt quá giới hạn cho phép (tối đa 10MB mỗi ảnh)'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: `Số lượng ảnh đính kèm vượt quá giới hạn cho phép (tối đa ${MAX_PROOF_FILES} ảnh)`
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
        message: `Lỗi upload ảnh: ${err.message}`
      });
    }
    next();
  });
};

/**
 * Helper: upload buffer ảnh lên Cloudinary (folder returns)
 */
const uploadBufferToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'returns',
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
    // Không phải JSON array -> xử lý như URL đơn hoặc danh sách phân tách dấu phẩy
  }
  return String(rawProof)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

/**
 * POST /api/v1/user/returns
 * User gửi yêu cầu đổi trả cho đơn hàng đã giao:
 * - Chỉ cho phép khi đơn thuộc về user đang đăng nhập và có TrangThaiDonHang = 'DaGiao' (hoặc 'Đã giao').
 * - Hỗ trợ upload ảnh minh chứng bằng Multer (lưu lên Cloudinary, ghi URL vào HinhAnhProof).
 * - Chèn record vào bảng `phieudoitra`.
 * - Cập nhật `donhang` SET TrangThaiDonHang = 'YeuCauDoiTra' (và đồng bộ `lichsumuahang`).
 */
const createReturnRequest = async (req, res, next) => {
  let connection;
  try {
    const userId = req.user?.MaNguoiDung || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng xác thực'
      });
    }

    const body = req.body || {};
    const rawMaDonHang = body.maDonHang ?? body.MaDonHang ?? body.ma_don_hang ?? body.orderId ?? body.order_id;
    const rawMaSanPham = body.maSanPham ?? body.MaSanPham ?? body.ma_san_pham ?? body.productId ?? body.product_id;
    const rawLyDo = body.lyDo ?? body.LyDo ?? body.ly_do ?? body.reason;
    const rawHinhAnhProofUrl = body.hinhAnhProof ?? body.HinhAnhProof ?? body.hinh_anh_proof;

    if (
      rawMaDonHang === undefined ||
      rawMaDonHang === null ||
      String(rawMaDonHang).trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã đơn hàng (maDonHang)'
      });
    }

    const maDonHang = Number(rawMaDonHang);
    if (!Number.isInteger(maDonHang) || maDonHang <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã đơn hàng không hợp lệ'
      });
    }

    const lyDo = rawLyDo !== undefined && rawLyDo !== null ? String(rawLyDo).trim() : '';
    if (!lyDo) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do đổi trả (lyDo)'
      });
    }

    let requestedMaSanPham = null;
    if (
      rawMaSanPham !== undefined &&
      rawMaSanPham !== null &&
      String(rawMaSanPham).trim() !== ''
    ) {
      requestedMaSanPham = Number(rawMaSanPham);
      if (!Number.isInteger(requestedMaSanPham) || requestedMaSanPham <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Mã sản phẩm không hợp lệ'
        });
      }
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Khóa & kiểm tra đơn hàng tồn tại, thuộc về user và đang ở trạng thái 'DaGiao'
    const [orderRows] = await connection.query(
      `SELECT MaDonHang, MaNguoiDung, NgayMuaHang, TrangThaiDonHang
       FROM donhang
       WHERE MaDonHang = ?
       FOR UPDATE`,
      [maDonHang]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tồn tại'
      });
    }

    const order = orderRows[0];

    if (Number(order.MaNguoiDung) !== Number(userId)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền gửi yêu cầu đổi trả cho đơn hàng này'
      });
    }

    if (!VALID_DELIVERED_STATUSES.includes(order.TrangThaiDonHang)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Chỉ cho phép yêu cầu đổi trả khi đơn hàng có trạng thái 'DaGiao'. Trạng thái hiện tại: '${order.TrangThaiDonHang}'`
      });
    }

    // 2. Xác định và xác thực MaSanPham thuộc đơn hàng (nếu đơn hàng có chitietdonhang)
    const [orderItemRows] = await connection.query(
      `SELECT MaSanPham FROM chitietdonhang WHERE MaDonHang = ? ORDER BY MaChiTietDonHang ASC`,
      [maDonHang]
    );

    let maSanPham = requestedMaSanPham;
    if (!maSanPham) {
      if (orderItemRows.length > 0) {
        maSanPham = Number(orderItemRows[0].MaSanPham);
      } else {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mã sản phẩm cần đổi trả (maSanPham)'
        });
      }
    } else if (orderItemRows.length > 0) {
      const hasProductInOrder = orderItemRows.some(
        (item) => Number(item.MaSanPham) === Number(maSanPham)
      );
      if (!hasProductInOrder) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Sản phẩm mã #${maSanPham} không nằm trong đơn hàng #${maDonHang}`
        });
      }
    }

    // Kiểm tra sản phẩm tồn tại trong bảng sanpham
    const [productRows] = await connection.query(
      `SELECT MaSanPham, TenSanPham FROM sanpham WHERE MaSanPham = ?`,
      [maSanPham]
    );

    if (productRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: `Sản phẩm mã #${maSanPham} không tồn tại`
      });
    }

    // 3. Upload ảnh minh chứng (nếu có file từ Multer) sau khi toàn bộ kiểm tra hợp lệ đều đạt
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    let hinhAnhProof = null;

    if (files.length > 0) {
      const uploadedResults = await Promise.all(
        files.map((file) => uploadBufferToCloudinary(file.buffer))
      );
      const uploadedUrls = uploadedResults
        .map((result) => result?.secure_url)
        .filter(Boolean);

      if (uploadedUrls.length === 1) {
        hinhAnhProof = uploadedUrls[0];
      } else if (uploadedUrls.length > 1) {
        hinhAnhProof = JSON.stringify(uploadedUrls);
      }
    } else if (
      rawHinhAnhProofUrl !== undefined &&
      rawHinhAnhProofUrl !== null &&
      String(rawHinhAnhProofUrl).trim() !== ''
    ) {
      hinhAnhProof = String(rawHinhAnhProofUrl).trim();
    }

    // 4. Chèn phiếu đổi trả vào bảng `phieudoitra`
    const [insertResult] = await connection.query(
      `INSERT INTO phieudoitra
         (MaDonHang, MaSanPham, MaNguoiDung_User, LyDo, HinhAnhProof, KetQuaKiemDinh, TrangThaiHoanTien)
       VALUES (?, ?, ?, ?, ?, 'ChoKiemDinh', 'ChoDuyet')`,
      [maDonHang, maSanPham, userId, lyDo, hinhAnhProof]
    );

    // 5. Cập nhật trạng thái đơn hàng sang 'YeuCauDoiTra' (và đồng bộ lichsumuahang nếu có)
    await connection.query(
      `UPDATE donhang SET TrangThaiDonHang = 'YeuCauDoiTra' WHERE MaDonHang = ?`,
      [maDonHang]
    );

    await connection.query(
      `UPDATE lichsumuahang SET TrangThai = 'YeuCauDoiTra' WHERE MaDonHang = ?`,
      [maDonHang]
    );

    await connection.commit();

    const [createdRows] = await pool.query(
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
         p.NgayTao,
         p.NgayCapNhat,
         d.TrangThaiDonHang,
         sp.TenSanPham
       FROM phieudoitra p
       JOIN donhang d ON p.MaDonHang = d.MaDonHang
       JOIN sanpham sp ON p.MaSanPham = sp.MaSanPham
       WHERE p.MaPhieuDoiTra = ?`,
      [insertResult.insertId]
    );

    const created = createdRows[0];

    return res.status(201).json({
      success: true,
      message: 'Gửi yêu cầu đổi trả thành công',
      data: {
        ...created,
        CodeDonHang: formatOrderCode(created.MaDonHang, order.NgayMuaHang),
        HinhAnhProofList: parseProofImages(created.HinhAnhProof)
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

module.exports = {
  handleReturnProofUpload,
  createReturnRequest
};

