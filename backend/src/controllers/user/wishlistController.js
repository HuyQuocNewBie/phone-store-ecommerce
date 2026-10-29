const { pool } = require('../../../config/db');

/**
 * 1. GET /api/v1/wishlist
 * Lấy danh sách sản phẩm yêu thích của người dùng hiện tại
 */
const getWishlist = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;

    const sql = `
      SELECT 
        w.MaYeuThich,
        w.MaNguoiDung,
        w.MaSanPham,
        w.NgayThem,
        s.TenSanPham,
        s.Gia,
        s.Anh,
        s.TonKho,
        s.TrangThai,
        s.DungLuong,
        s.MauSac,
        s.MaLoaiSanPham,
        s.MaNhaSanXuat
      FROM sanphamyeuthich w
      JOIN sanpham s ON w.MaSanPham = s.MaSanPham
      WHERE w.MaNguoiDung = ?
      ORDER BY w.MaYeuThich DESC
    `;

    const [rows] = await pool.query(sql, [MaNguoiDung]);

    const formattedData = rows.map((item) => ({
      MaYeuThich: item.MaYeuThich,
      MaSanPham: Number(item.MaSanPham),
      TenSanPham: item.TenSanPham,
      Gia: Number(item.Gia),
      Anh: item.Anh,
      TonKho: Number(item.TonKho),
      TrangThai: item.TrangThai,
      DungLuong: item.DungLuong,
      MauSac: item.MauSac,
      NgayThem: item.NgayThem,
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách yêu thích thành công',
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/v1/wishlist/toggle
 * Bật/tắt trạng thái yêu thích của sản phẩm
 * Body: { MaSanPham } hoặc { product_id }
 */
const toggleWishlist = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;
    const rawProductId = req.body.MaSanPham ?? req.body.product_id;
    const MaSanPham = Number(rawProductId);

    if (!MaSanPham || isNaN(MaSanPham)) {
      return res.status(400).json({
        success: false,
        message: 'Mã sản phẩm không hợp lệ',
      });
    }

    // Kiểm tra sản phẩm có tồn tại trong hệ thống không
    const [productCheck] = await pool.query(
      'SELECT MaSanPham, TenSanPham FROM sanpham WHERE MaSanPham = ?',
      [MaSanPham]
    );

    if (productCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    // Kiểm tra xem sản phẩm đã có trong danh sách yêu thích chưa
    const [existing] = await pool.query(
      'SELECT MaYeuThich FROM sanphamyeuthich WHERE MaNguoiDung = ? AND MaSanPham = ?',
      [MaNguoiDung, MaSanPham]
    );

    if (existing.length > 0) {
      // Đã có -> Xóa khỏi yêu thích
      await pool.query(
        'DELETE FROM sanphamyeuthich WHERE MaNguoiDung = ? AND MaSanPham = ?',
        [MaNguoiDung, MaSanPham]
      );

      return res.status(200).json({
        success: true,
        isWished: false,
        message: 'Đã xóa khỏi danh sách yêu thích!',
        data: {
          MaSanPham,
          isWished: false,
        },
      });
    } else {
      // Chưa có -> Thêm vào yêu thích
      await pool.query(
        'INSERT INTO sanphamyeuthich (MaNguoiDung, MaSanPham) VALUES (?, ?)',
        [MaNguoiDung, MaSanPham]
      );

      return res.status(200).json({
        success: true,
        isWished: true,
        message: 'Đã lưu sản phẩm vào danh sách yêu thích!',
        data: {
          MaSanPham,
          isWished: true,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  toggleWishlist,
};

