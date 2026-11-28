const { pool } = require('../../../config/db');

/**
 * Helper parse JSON danh sách ảnh đánh giá
 */
const parseReviewImages = (rawAnh) => {
  if (!rawAnh) return [];
  try {
    const parsed = JSON.parse(rawAnh);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return String(rawAnh)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

/**
 * Helper parse JSON tiêu chí đánh giá chi tiết
 */
const parseReviewCriteria = (rawCriteria) => {
  if (!rawCriteria) return null;
  try {
    return JSON.parse(rawCriteria);
  } catch {
    return null;
  }
};

/**
 * 1. GET /api/v1/admin/reviews
 * Lấy danh sách đánh giá từ `danhgia` JOIN `sanpham`, `nguoidung`, LEFT JOIN `danhgia_traloi`
 * Hỗ trợ filter theo `soSao`, `replyStatus` ('replied' / 'unreplied') và từ khóa tìm kiếm (`keyword` / `search` / `q`)
 */
const getAdminReviews = async (req, res, next) => {
  try {
    const rawSoSao = req.query.soSao ?? req.query.SoSao ?? req.query.star;
    const rawReplyStatus = req.query.replyStatus ?? req.query.trangThaiPhanHoi;
    const rawKeyword = req.query.keyword ?? req.query.search ?? req.query.q;

    const whereConditions = [];
    const params = [];

    if (rawSoSao !== undefined && rawSoSao !== null && String(rawSoSao).trim() !== '' && String(rawSoSao).toLowerCase() !== 'all') {
      const soSao = Number(rawSoSao);
      if (!Number.isInteger(soSao) || soSao < 1 || soSao > 5) {
        return res.status(400).json({
          success: false,
          message: 'Giá trị lọc soSao không hợp lệ (chỉ nhận từ 1 đến 5)'
        });
      }
      whereConditions.push('dg.SoSao = ?');
      params.push(soSao);
    }

    if (rawReplyStatus !== undefined && rawReplyStatus !== null && String(rawReplyStatus).trim() !== '' && String(rawReplyStatus).toLowerCase() !== 'all') {
      const replyStatus = String(rawReplyStatus).trim().toLowerCase();
      if (replyStatus === 'replied') {
        whereConditions.push('EXISTS (SELECT 1 FROM danhgia_traloi t WHERE t.MaDanhGia = dg.MaDanhGia)');
      } else if (replyStatus === 'unreplied') {
        whereConditions.push('NOT EXISTS (SELECT 1 FROM danhgia_traloi t WHERE t.MaDanhGia = dg.MaDanhGia)');
      } else {
        return res.status(400).json({
          success: false,
          message: "Giá trị lọc replyStatus không hợp lệ (chỉ nhận 'replied' hoặc 'unreplied')"
        });
      }
    }

    if (rawKeyword !== undefined && rawKeyword !== null && String(rawKeyword).trim() !== '') {
      const keyword = String(rawKeyword).trim();
      const likePattern = `%${keyword}%`;
      const numericId = Number(keyword);

      if (Number.isInteger(numericId) && numericId > 0) {
        whereConditions.push(
          '(sp.TenSanPham LIKE ? OR nd.TaiKhoan LIKE ? OR nd.Email LIKE ? OR dg.NoiDung LIKE ? OR dg.MaDanhGia = ?)'
        );
        params.push(likePattern, likePattern, likePattern, likePattern, numericId);
      } else {
        whereConditions.push(
          '(sp.TenSanPham LIKE ? OR nd.TaiKhoan LIKE ? OR nd.Email LIKE ? OR dg.NoiDung LIKE ?)'
        );
        params.push(likePattern, likePattern, likePattern, likePattern);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Tùy chọn phân trang nếu client truyền page/limit; mặc định trả về toàn bộ danh sách khớp filter
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query(
      `SELECT COUNT(DISTINCT dg.MaDanhGia) AS total
       FROM danhgia dg
       INNER JOIN sanpham sp ON dg.MaSanPham = sp.MaSanPham
       INNER JOIN nguoidung nd ON dg.MaNguoiDung = nd.MaNguoiDung
       LEFT JOIN danhgia_traloi tr ON dg.MaDanhGia = tr.MaDanhGia
       ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    const limitSql = hasPagination ? 'LIMIT ? OFFSET ?' : '';
    const queryParams = hasPagination ? [...params, limit, offset] : params;

    const [reviewRows] = await pool.query(
      `SELECT
         dg.MaDanhGia,
         dg.MaSanPham,
         dg.MaNguoiDung,
         dg.SoSao,
         dg.NoiDung,
         dg.NgayDanhGia,
         dg.Anh,
         dg.ChiTietDanhGia,
         dg.SoLuotThich,
         sp.TenSanPham,
         sp.Anh AS AnhSanPham,
         nd.TaiKhoan AS TenNguoiDung,
         nd.Email AS EmailNguoiDung,
         nd.AnhDaiDien AS AnhDaiDienNguoiDung,
         COUNT(tr.MaTraLoi) AS ReplyCount
       FROM danhgia dg
       INNER JOIN sanpham sp ON dg.MaSanPham = sp.MaSanPham
       INNER JOIN nguoidung nd ON dg.MaNguoiDung = nd.MaNguoiDung
       LEFT JOIN danhgia_traloi tr ON dg.MaDanhGia = tr.MaDanhGia
       ${whereClause}
       GROUP BY
         dg.MaDanhGia,
         dg.MaSanPham,
         dg.MaNguoiDung,
         dg.SoSao,
         dg.NoiDung,
         dg.NgayDanhGia,
         dg.Anh,
         dg.ChiTietDanhGia,
         dg.SoLuotThich,
         sp.TenSanPham,
         sp.Anh,
         nd.TaiKhoan,
         nd.Email,
         nd.AnhDaiDien
       ORDER BY dg.NgayDanhGia DESC, dg.MaDanhGia DESC
       ${limitSql}`,
      queryParams
    );

    const reviewIds = reviewRows.map((row) => row.MaDanhGia);
    const repliesMap = {};

    if (reviewIds.length > 0) {
      const [replyRows] = await pool.query(
        `SELECT
           tr.MaTraLoi,
           tr.MaDanhGia,
           tr.MaNguoiDung,
           tr.NoiDung,
           tr.NgayTraLoi,
           tr.SoLuotThich,
           u.TaiKhoan AS TenNguoiTraLoi,
           u.AnhDaiDien AS AnhDaiDienNguoiTraLoi,
           u.MaVaiTro
         FROM danhgia_traloi tr
         LEFT JOIN nguoidung u ON tr.MaNguoiDung = u.MaNguoiDung
         WHERE tr.MaDanhGia IN (?)
         ORDER BY tr.NgayTraLoi ASC, tr.MaTraLoi ASC`,
        [reviewIds]
      );

      replyRows.forEach((rep) => {
        if (!repliesMap[rep.MaDanhGia]) {
          repliesMap[rep.MaDanhGia] = [];
        }
        repliesMap[rep.MaDanhGia].push({
          MaTraLoi: Number(rep.MaTraLoi),
          MaDanhGia: Number(rep.MaDanhGia),
          MaNguoiDung: Number(rep.MaNguoiDung),
          TenNguoiTraLoi: rep.TenNguoiTraLoi || 'Quản trị viên',
          AnhDaiDien: rep.AnhDaiDienNguoiTraLoi || null,
          MaVaiTro: rep.MaVaiTro !== null && rep.MaVaiTro !== undefined ? Number(rep.MaVaiTro) : null,
          isAdmin: Number(rep.MaVaiTro) === 1,
          NoiDung: rep.NoiDung,
          NgayTraLoi: rep.NgayTraLoi,
          SoLuotThich: Number(rep.SoLuotThich || 0)
        });
      });
    }

    const reviews = reviewRows.map((row, index) => {
      const replies = repliesMap[row.MaDanhGia] || [];
      const replyCount = Number(row.ReplyCount || replies.length);

      return {
        STT: (hasPagination ? offset : 0) + index + 1,
        MaDanhGia: Number(row.MaDanhGia),
        MaSanPham: Number(row.MaSanPham),
        TenSanPham: row.TenSanPham,
        AnhSanPham: row.AnhSanPham || null,
        MaNguoiDung: Number(row.MaNguoiDung),
        TenNguoiDung: row.TenNguoiDung,
        EmailNguoiDung: row.EmailNguoiDung,
        AnhDaiDienNguoiDung: row.AnhDaiDienNguoiDung || null,
        SoSao: Number(row.SoSao),
        NoiDung: row.NoiDung,
        NgayDanhGia: row.NgayDanhGia,
        Anh: parseReviewImages(row.Anh),
        ChiTietDanhGia: parseReviewCriteria(row.ChiTietDanhGia),
        SoLuotThich: Number(row.SoLuotThich || 0),
        replyCount,
        isReplied: replyCount > 0,
        replyStatus: replyCount > 0 ? 'replied' : 'unreplied',
        replies
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách đánh giá thành công',
      data: reviews,
      pagination: {
        page: hasPagination ? page : 1,
        limit: hasPagination ? limit : total,
        total,
        totalPages: hasPagination ? Math.ceil(total / limit) || 1 : 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/v1/admin/reviews/:id/reply
 * Admin gửi câu trả lời vào bảng `danhgia_traloi` (MaDanhGia, MaNguoiDung = req.user.MaNguoiDung, NoiDung)
 */
const replyToReview = async (req, res, next) => {
  try {
    const adminUserId = Number(req.user?.MaNguoiDung);
    if (!Number.isInteger(adminUserId) || adminUserId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được thông tin quản trị viên đang đăng nhập'
      });
    }

    const reviewId = Number(req.params.id);
    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã đánh giá không hợp lệ'
      });
    }

    const { NoiDung } = req.body;
    const content = NoiDung !== undefined && NoiDung !== null ? String(NoiDung).trim() : '';
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung phản hồi không được để trống'
      });
    }

    const [reviewRows] = await pool.query(
      `SELECT MaDanhGia FROM danhgia WHERE MaDanhGia = ?`,
      [reviewId]
    );

    if (reviewRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    const [insertResult] = await pool.query(
      `INSERT INTO danhgia_traloi (MaDanhGia, MaNguoiDung, NoiDung, NgayTraLoi)
       VALUES (?, ?, ?, NOW())`,
      [reviewId, adminUserId, content]
    );

    const [createdRows] = await pool.query(
      `SELECT
         tr.MaTraLoi,
         tr.MaDanhGia,
         tr.MaNguoiDung,
         tr.NoiDung,
         tr.NgayTraLoi,
         tr.SoLuotThich,
         u.TaiKhoan AS TenNguoiTraLoi,
         u.AnhDaiDien AS AnhDaiDienNguoiTraLoi,
         u.MaVaiTro
       FROM danhgia_traloi tr
       LEFT JOIN nguoidung u ON tr.MaNguoiDung = u.MaNguoiDung
       WHERE tr.MaTraLoi = ?`,
      [insertResult.insertId]
    );

    const reply = createdRows[0];

    return res.status(201).json({
      success: true,
      message: 'Gửi phản hồi đánh giá thành công',
      data: {
        MaTraLoi: Number(reply.MaTraLoi),
        MaDanhGia: Number(reply.MaDanhGia),
        MaNguoiDung: Number(reply.MaNguoiDung),
        TenNguoiTraLoi: reply.TenNguoiTraLoi || 'Quản trị viên',
        AnhDaiDien: reply.AnhDaiDienNguoiTraLoi || null,
        MaVaiTro: reply.MaVaiTro !== null && reply.MaVaiTro !== undefined ? Number(reply.MaVaiTro) : 1,
        isAdmin: true,
        NoiDung: reply.NoiDung,
        NgayTraLoi: reply.NgayTraLoi,
        SoLuotThich: Number(reply.SoLuotThich || 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. DELETE /api/v1/admin/reviews/:id
 * Xóa đánh giá vi phạm (các bản ghi trả lời trong danhgia_traloi tự động xóa theo CASCADE)
 */
const deleteReview = async (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);
    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã đánh giá không hợp lệ'
      });
    }

    const [existingRows] = await pool.query(
      `SELECT MaDanhGia FROM danhgia WHERE MaDanhGia = ?`,
      [reviewId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    await pool.query(`DELETE FROM danhgia WHERE MaDanhGia = ?`, [reviewId]);

    return res.status(200).json({
      success: true,
      message: 'Xóa đánh giá vi phạm thành công',
      data: {
        MaDanhGia: reviewId
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminReviews,
  replyToReview,
  deleteReview
};
