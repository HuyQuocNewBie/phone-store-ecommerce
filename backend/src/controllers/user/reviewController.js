const { pool } = require('../../../config/db');

// Lấy thống kê đánh giá của sản phẩm (Summary)
const getReviewSummary = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Lấy tổng số và điểm trung bình
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as total, 
        ROUND(AVG(SoSao), 1) as avgRating 
       FROM danhgia 
       WHERE MaSanPham = ?`,
      [productId]
    );

    // Lấy phân bổ theo số sao
    const [distRows] = await pool.query(
      `SELECT SoSao, COUNT(*) as count 
       FROM danhgia 
       WHERE MaSanPham = ? 
       GROUP BY SoSao`,
      [productId]
    );

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    distRows.forEach((row) => {
      if (distribution[row.SoSao] !== undefined) {
        distribution[row.SoSao] = Number(row.count);
      }
    });

    // Lấy trung bình các tiêu chí từ ChiTietDanhGia
    const [criteriaRows] = await pool.query(
      `SELECT ChiTietDanhGia FROM danhgia WHERE MaSanPham = ? AND ChiTietDanhGia IS NOT NULL`,
      [productId]
    );

    const criteriaTotals = {
      hieu_nang: { sum: 0, count: 0 },
      pin: { sum: 0, count: 0 },
      camera: { sum: 0, count: 0 },
    };

    criteriaRows.forEach((row) => {
      try {
        const data = JSON.parse(row.ChiTietDanhGia);
        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (criteriaTotals[item.key] && item.rating) {
              criteriaTotals[item.key].sum += Number(item.rating);
              criteriaTotals[item.key].count += 1;
            }
          });
        } else if (data && typeof data === "object") {
          const keyMap = {
            "Hiệu năng": "hieu_nang",
            "Thời lượng pin": "pin",
            "Chất lượng camera": "camera",
            hieu_nang: "hieu_nang",
            pin: "pin",
            camera: "camera",
          };
          Object.keys(data).forEach((k) => {
            const mapped = keyMap[k];
            if (mapped && criteriaTotals[mapped] && data[k]) {
              criteriaTotals[mapped].sum += Number(data[k]);
              criteriaTotals[mapped].count += 1;
            }
          });
        }
      } catch (e) {}
    });

    const criteriaAvg = {};
    Object.keys(criteriaTotals).forEach((k) => {
      const c = criteriaTotals[k];
      criteriaAvg[k] = c.count > 0 ? Number((c.sum / c.count).toFixed(1)) : 0;
      criteriaAvg[`${k}_count`] = c.count;
    });

    return res.json({
      success: true,
      data: {
        avgRating: Number(stats[0]?.avgRating || 0),
        total: Number(stats[0]?.total || 0),
        distribution,
        criteriaAvg,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách đánh giá có lọc và phân trang
const getReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const offset = (page - 1) * limit;
    const star = parseInt(req.query.star) || 0;
    const hasImage = req.query.hasImage === "true";

    let whereClause = "WHERE d.MaSanPham = ?";
    const params = [productId];

    if (star > 0) {
      whereClause += " AND d.SoSao = ?";
      params.push(star);
    }

    if (hasImage) {
      whereClause += " AND d.Anh IS NOT NULL AND d.Anh != '' AND d.Anh != '[]'";
    }

    // Đếm tổng số bản ghi khớp
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM danhgia d ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // Lấy danh sách đánh giá kèm thông tin người dùng
    const [reviews] = await pool.query(
      `SELECT 
        d.MaDanhGia,
        d.MaSanPham,
        d.MaNguoiDung,
        d.SoSao,
        d.NoiDung,
        d.NgayDanhGia as NgayTao,
        d.Anh,
        d.ChiTietDanhGia,
        d.SoLuotThich,
        u.TaiKhoan as HoTen,
        u.TaiKhoan as TenDangNhap,
        u.AnhDaiDien
       FROM danhgia d
       LEFT JOIN nguoidung u ON d.MaNguoiDung = u.MaNguoiDung
       ${whereClause}
       ORDER BY d.NgayDanhGia DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Lấy replies cho các reviews tìm được
    const reviewIds = reviews.map((r) => r.MaDanhGia);
    let repliesMap = {};

    if (reviewIds.length > 0) {
      const [replyRows] = await pool.query(
        `SELECT 
          r.MaTraLoi,
          r.MaDanhGia,
          r.MaNguoiDung,
          r.NoiDung,
          r.NgayTraLoi as NgayTao,
          r.SoLuotThich,
          u.TaiKhoan as HoTen,
          u.MaVaiTro
         FROM danhgia_traloi r
         LEFT JOIN nguoidung u ON r.MaNguoiDung = u.MaNguoiDung
         WHERE r.MaDanhGia IN (?)
         ORDER BY r.NgayTraLoi ASC`,
        [reviewIds]
      );

      replyRows.forEach((rep) => {
        if (!repliesMap[rep.MaDanhGia]) repliesMap[rep.MaDanhGia] = [];
        repliesMap[rep.MaDanhGia].push({
          MaTraLoi: rep.MaTraLoi,
          HoTen: rep.HoTen || "Quản trị viên",
          isAdmin: rep.MaVaiTro === 1,
          NoiDung: rep.NoiDung,
          NgayTao: rep.NgayTao,
          soLuotThich: Number(rep.SoLuotThich || 0),
          isLiked: false,
        });
      });
    }

    // Định dạng dữ liệu trả về
    const formatted = reviews.map((r) => {
      let images = [];
      if (r.Anh) {
        try {
          images = JSON.parse(r.Anh);
        } catch {
          images = r.Anh.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }

      let criteria = [];
      if (r.ChiTietDanhGia) {
        try {
          criteria = JSON.parse(r.ChiTietDanhGia);
        } catch {}
      }

      return {
        MaDanhGia: r.MaDanhGia,
        HoTen: r.HoTen || r.TenDangNhap || "Khách hàng",
        SoSao: r.SoSao,
        NoiDung: r.NoiDung,
        NgayTao: r.NgayTao,
        images,
        criteria,
        soLuotThich: Number(r.SoLuotThich || 0),
        isLiked: false,
        replies: repliesMap[r.MaDanhGia] || [],
      };
    });

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Gửi đánh giá mới
const createReview = async (req, res, next) => {
  try {
    const MaNguoiDung = req.user?.MaNguoiDung;
    if (!MaNguoiDung) {
      return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
    }

    const { MaSanPham, SoSao, NoiDung, criteria } = req.body;
    if (!MaSanPham || !SoSao || !NoiDung) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin đánh giá bắt buộc" });
    }

    // Xử lý danh sách ảnh đính kèm
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((file) => file.path || file.secure_url).filter(Boolean);
    }

    const [result] = await pool.query(
      `INSERT INTO danhgia (MaSanPham, MaNguoiDung, SoSao, NoiDung, Anh, ChiTietDanhGia, NgayDanhGia)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        MaSanPham,
        MaNguoiDung,
        SoSao,
        NoiDung,
        imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
        criteria || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Đánh giá của bạn đã được ghi nhận thành công!",
      data: {
        MaDanhGia: result.insertId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Phản hồi đánh giá (Reply)
const createReply = async (req, res, next) => {
  try {
    const MaNguoiDung = req.user?.MaNguoiDung;
    if (!MaNguoiDung) {
      return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
    }

    const { reviewId } = req.params;
    const { NoiDung } = req.body;

    if (!NoiDung || !NoiDung.trim()) {
      return res.status(400).json({ success: false, message: "Nội dung phản hồi không được để trống" });
    }

    const [result] = await pool.query(
      `INSERT INTO danhgia_traloi (MaDanhGia, MaNguoiDung, NoiDung, NgayTraLoi)
       VALUES (?, ?, ?, NOW())`,
      [reviewId, MaNguoiDung, NoiDung.trim()]
    );

    return res.status(201).json({
      success: true,
      message: "Gửi phản hồi thành công!",
      data: {
        MaTraLoi: result.insertId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Toggle like đánh giá / phản hồi
const toggleLike = async (req, res, next) => {
  try {
    const { itemId, itemType, isLiked } = req.body;
    if (!itemId) {
      return res.status(400).json({ success: false, message: "Thiếu itemId" });
    }

    const delta = isLiked ? -1 : 1;
    if (itemType === "reply") {
      await pool.query(
        `UPDATE danhgia_traloi SET SoLuotThich = GREATEST(0, SoLuotThich + ?) WHERE MaTraLoi = ?`,
        [delta, itemId]
      );
    } else {
      await pool.query(
        `UPDATE danhgia SET SoLuotThich = GREATEST(0, SoLuotThich + ?) WHERE MaDanhGia = ?`,
        [delta, itemId]
      );
    }

    return res.json({
      success: true,
      message: "Thao tác thành công",
    });
  } catch (error) {
    next(error);
  }
};

// Kiểm tra quyền đánh giá (Eligibility)
const checkEligibility = async (req, res, next) => {
  try {
    const MaNguoiDung = req.user?.MaNguoiDung;
    const { productId } = req.params;

    if (!MaNguoiDung) {
      return res.json({
        success: true,
        data: {
          canReview: false,
          reason: "not_logged_in",
          message: "Vui lòng đăng nhập để đánh giá sản phẩm",
        },
      });
    }

    // Admin có quyền đánh giá trực tiếp để test hệ thống
    if (req.user?.MaVaiTro === 1) {
      return res.json({
        success: true,
        data: {
          canReview: true,
          reason: null,
          message: "Quản trị viên có quyền đánh giá sản phẩm",
        },
      });
    }

    // Kiểm tra xem người dùng đã từng mua sản phẩm này chưa
    const [orders] = await pool.query(
      `SELECT d.MaDonHang 
       FROM donhang d
       JOIN chitietdonhang c ON d.MaDonHang = c.MaDonHang
       WHERE d.MaNguoiDung = ? AND c.MaSanPham = ?
       LIMIT 1`,
      [MaNguoiDung, productId]
    );

    const hasPurchased = orders.length > 0;

    return res.json({
      success: true,
      data: {
        canReview: hasPurchased,
        reason: hasPurchased ? null : "not_purchased",
        message: hasPurchased
          ? "Bạn có thể đánh giá sản phẩm này"
          : "Bạn cần mua sản phẩm này để có thể đánh giá",
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReviewSummary,
  getReviews,
  createReview,
  createReply,
  toggleLike,
  checkEligibility,
};
