const multer = require('multer');
const { pool } = require('../../../config/db');
const { cloudinary } = require('../../../utils/cloudinary');
const { formatOrderCode } = require('../../utils/formatters');

const VALID_DELIVERED_STATUSES = ['DaGiao', 'Đã giao'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Cấu hình Multer nhận 2 trường file ảnh:
 * - hinhAnhProof: Ảnh minh chứng lỗi sản phẩm (maxCount: 1)
 * - anhQRHoanTien: Ảnh mã QR ngân hàng nhận hoàn tiền cho đơn COD (maxCount: 1)
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(
        Object.assign(new Error('Chỉ chấp nhận file ảnh (image/*) làm minh chứng đổi trả / mã QR hoàn tiền'), {
          code: 'INVALID_MIME_TYPE'
        }),
        false
      );
    }
    cb(null, true);
  }
});

const uploadFields = upload.fields([
  { name: 'hinhAnhProof', maxCount: 1 },
  { name: 'anhQRHoanTien', maxCount: 1 }
]);

/**
 * Middleware Multer xử lý upload 2 file ảnh: hinhAnhProof và anhQRHoanTien
 */
const handleReturnProofUpload = (req, res, next) => {
  uploadFields(req, res, (err) => {
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
          message: 'Chỉ chấp nhận tối đa 1 ảnh minh họa lỗi (hinhAnhProof) và 1 ảnh mã QR hoàn tiền (anhQRHoanTien)'
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
 * Helper: upload buffer ảnh lên Cloudinary (folder tùy chỉnh)
 */
const uploadBufferToCloudinary = (buffer, folderName = 'returns') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
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
 * - Bắt buộc có lý do (lyDo tối thiểu 10 ký tự).
 * - Bắt buộc có file ảnh minh họa lỗi (hinhAnhProof).
 * - Nếu đơn hàng gốc thanh toán tiền mặt (COD), bắt buộc phải có file ảnh mã QR nhận hoàn tiền (anhQRHoanTien)
 *   và lưu đường dẫn vào cột AnhQRHoanTien.
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
    const rawLyDo = body.lyDo ?? body.LyDo ?? body.ly_do ?? body.reason ?? body.moTa ?? body.description;
    const rawHinhAnhProofUrl = body.hinhAnhProof ?? body.HinhAnhProof ?? body.hinh_anh_proof;
    const rawAnhQRUrl = body.anhQRHoanTien ?? body.AnhQRHoanTien ?? body.anh_qr_hoan_tien;

    // Trích xuất file từ Multer fields
    const proofFile = req.files?.hinhAnhProof?.[0] || 
      (Array.isArray(req.files) ? req.files.find((f) => f.fieldname === 'hinhAnhProof') : (req.file?.fieldname === 'hinhAnhProof' ? req.file : null));
    const qrFile = req.files?.anhQRHoanTien?.[0] || 
      (Array.isArray(req.files) ? req.files.find((f) => f.fieldname === 'anhQRHoanTien') : (req.file?.fieldname === 'anhQRHoanTien' ? req.file : null));

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

    // Validation: Bắt buộc có lyDo (tối thiểu 10 ký tự)
    const lyDo = rawLyDo !== undefined && rawLyDo !== null ? String(rawLyDo).trim() : '';
    if (!lyDo || lyDo.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mô tả chi tiết lý do đổi trả (tối thiểu 10 ký tự)'
      });
    }

    // Validation: Bắt buộc có file hinhAnhProof
    if (!proofFile && !rawHinhAnhProofUrl) {
      return res.status(400).json({
        success: false,
        message: 'Bắt buộc phải tải lên ảnh minh họa tình trạng lỗi sản phẩm (hinhAnhProof)'
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
      `SELECT d.MaDonHang, d.MaNguoiDung, d.NgayMuaHang, d.TrangThaiDonHang,
         COALESCE(
           (SELECT pt.TenPhuongThucThanhToan FROM thanhtoan tt JOIN phuongthucthanhtoan pt ON tt.MaPhuongThucThanhToan = pt.MaPhuongThucThanhToan WHERE tt.MaDonHang = d.MaDonHang ORDER BY tt.MaThanhToan DESC LIMIT 1),
           (SELECT pt.TenPhuongThucThanhToan FROM lichsumuahang lsm JOIN phuongthucthanhtoan pt ON lsm.MaPhuongThucThanhToan = pt.MaPhuongThucThanhToan WHERE lsm.MaDonHang = d.MaDonHang ORDER BY lsm.MaLichSuMuaHang DESC LIMIT 1),
           'COD'
         ) AS PhuongThucThanhToan
       FROM donhang d
       WHERE d.MaDonHang = ?
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

    // Validation: Nếu đơn hàng gốc thanh toán tiền mặt (COD), bắt buộc phải có file anhQRHoanTien
    const ptttUpper = String(order.PhuongThucThanhToan || 'COD').toUpperCase().trim();
    const isCOD = !ptttUpper.includes('VNPAY') && !ptttUpper.includes('VN PAY') && !ptttUpper.includes('ZALO');

    if (isCOD && !qrFile && !rawAnhQRUrl) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng thanh toán tiền mặt (COD) bắt buộc phải tải lên ảnh mã QR ngân hàng nhận hoàn tiền (anhQRHoanTien)'
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

    // 3. Upload ảnh minh chứng và ảnh QR hoàn tiền lên Cloudinary sau khi toàn bộ kiểm tra hợp lệ
    let hinhAnhProof = rawHinhAnhProofUrl ? String(rawHinhAnhProofUrl).trim() : null;
    let anhQRHoanTien = rawAnhQRUrl ? String(rawAnhQRUrl).trim() : null;

    const uploadTasks = [];
    if (proofFile) {
      uploadTasks.push(
        uploadBufferToCloudinary(proofFile.buffer, 'returns').then((result) => {
          hinhAnhProof = result?.secure_url || null;
        })
      );
    }
    if (qrFile) {
      uploadTasks.push(
        uploadBufferToCloudinary(qrFile.buffer, 'returns_qr').then((result) => {
          anhQRHoanTien = result?.secure_url || null;
        })
      );
    }

    if (uploadTasks.length > 0) {
      await Promise.all(uploadTasks);
    }

    // 4. Chèn phiếu đổi trả vào bảng `phieudoitra` bao gồm cột AnhQRHoanTien
    const [insertResult] = await connection.query(
      `INSERT INTO phieudoitra
         (MaDonHang, MaSanPham, MaNguoiDung_User, LyDo, HinhAnhProof, AnhQRHoanTien, KetQuaKiemDinh, TrangThaiHoanTien)
       VALUES (?, ?, ?, ?, ?, ?, 'ChoKiemDinh', 'ChoDuyet')`,
      [maDonHang, maSanPham, userId, lyDo, hinhAnhProof, anhQRHoanTien]
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
         p.AnhQRHoanTien,
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
        HinhAnhProofList: parseProofImages(created.HinhAnhProof),
        AnhQRHoanTien: created.AnhQRHoanTien || null
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
  upload,
  uploadFields,
  handleReturnProofUpload,
  createReturnRequest
};

