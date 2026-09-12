const { pool } = require('../../../config/db');

/**
 * 1. GET /api/v1/cart
 * Lấy danh sách sản phẩm trong giỏ của người dùng từ bảng giohang
 * (Kèm TenSanPham, Gia, Anh, DungLuong, MauSac, TonKho).
 */
const getCart = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;

    const sql = `
      SELECT 
        g.MaGioHang,
        g.MaNguoiDung,
        g.MaSanPham,
        g.SoLuong,
        s.TenSanPham,
        s.Gia,
        s.Anh,
        s.DungLuong,
        s.MauSac,
        s.TonKho,
        s.TrangThai
      FROM giohang g
      JOIN sanpham s ON g.MaSanPham = s.MaSanPham
      WHERE g.MaNguoiDung = ?
      ORDER BY g.MaGioHang DESC
    `;

    const [rows] = await pool.query(sql, [MaNguoiDung]);

    const formattedData = rows.map((item) => ({
      MaGioHang: item.MaGioHang,
      MaNguoiDung: item.MaNguoiDung,
      MaSanPham: item.MaSanPham,
      SoLuong: Number(item.SoLuong),
      TenSanPham: item.TenSanPham,
      Gia: Number(item.Gia),
      Anh: item.Anh,
      DungLuong: item.DungLuong,
      MauSac: item.MauSac,
      TonKho: Number(item.TonKho),
      TrangThai: item.TrangThai
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách giỏ hàng thành công',
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/v1/cart/items
 * Thêm sản phẩm vào giỏ hàng. Nếu đã tồn tại thì cộng dồn SoLuong (không vượt TonKho).
 * Body parameters: { MaSanPham, SoLuong } (hoặc { product_id, quantity })
 */
const addToCart = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;
    const rawMaSanPham = req.body.MaSanPham || req.body.product_id;
    const rawSoLuong = req.body.SoLuong ?? req.body.quantity ?? 1;

    const MaSanPham = parseInt(rawMaSanPham, 10);
    const addSoLuong = parseInt(rawSoLuong, 10);

    if (isNaN(MaSanPham) || MaSanPham <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã sản phẩm không hợp lệ'
      });
    }

    if (isNaN(addSoLuong) || addSoLuong <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng thêm vào phải lớn hơn 0'
      });
    }

    // 1. Kiểm tra sản phẩm có tồn tại và còn kinh doanh không
    const [productRows] = await pool.query(
      'SELECT MaSanPham, TenSanPham, Gia, TonKho, TrangThai FROM sanpham WHERE MaSanPham = ?',
      [MaSanPham]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại'
      });
    }

    const product = productRows[0];
    const tonKho = Number(product.TonKho);

    if (product.TrangThai === 'NgungBan') {
      return res.status(400).json({
        success: false,
        message: 'Sản phẩm này đã ngừng kinh doanh'
      });
    }

    if (tonKho <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Sản phẩm đã hết hàng'
      });
    }

    // 2. Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
    const [cartRows] = await pool.query(
      'SELECT MaGioHang, SoLuong FROM giohang WHERE MaNguoiDung = ? AND MaSanPham = ?',
      [MaNguoiDung, MaSanPham]
    );

    if (cartRows.length > 0) {
      // Đã có trong giỏ -> Cộng dồn số lượng
      const currentQty = Number(cartRows[0].SoLuong);
      const newQty = currentQty + addSoLuong;

      if (newQty > tonKho) {
        return res.status(400).json({
          success: false,
          message: `Số lượng trong giỏ vượt quá số lượng tồn kho (Tồn kho: ${tonKho}, đã có trong giỏ: ${currentQty})`
        });
      }

      await pool.query(
        'UPDATE giohang SET SoLuong = ? WHERE MaGioHang = ?',
        [newQty, cartRows[0].MaGioHang]
      );

      return res.status(200).json({
        success: true,
        message: 'Cập nhật số lượng giỏ hàng thành công',
        data: {
          MaGioHang: cartRows[0].MaGioHang,
          MaSanPham,
          SoLuong: newQty,
          TonKho: tonKho
        }
      });
    } else {
      // Chưa có trong giỏ -> Thêm mới dòng sản phẩm
      if (addSoLuong > tonKho) {
        return res.status(400).json({
          success: false,
          message: `Số lượng thêm vào vượt quá số lượng tồn kho khả dụng (Tồn kho: ${tonKho})`
        });
      }

      const [insertResult] = await pool.query(
        'INSERT INTO giohang (MaNguoiDung, MaSanPham, SoLuong) VALUES (?, ?, ?)',
        [MaNguoiDung, MaSanPham, addSoLuong]
      );

      return res.status(201).json({
        success: true,
        message: 'Thêm sản phẩm vào giỏ hàng thành công',
        data: {
          MaGioHang: insertResult.insertId,
          MaSanPham,
          SoLuong: addSoLuong,
          TonKho: tonKho
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 3. PUT /api/v1/cart/items
 * Cập nhật SoLuong (+/-) của 1 mục trong giỏ.
 * Body parameters: 
 * - MaGioHang (hoặc cart_item_id hoặc MaSanPham)
 * - SoLuong (hoặc quantity hoặc delta hoặc action)
 */
const updateCartItem = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;
    const rawMaGioHang = req.body.MaGioHang || req.body.cart_item_id;
    const rawMaSanPham = req.body.MaSanPham || req.body.product_id;
    const { delta, action } = req.body;

    const maGioHang = parseInt(rawMaGioHang, 10);
    const maSanPham = parseInt(rawMaSanPham, 10);

    if (isNaN(maGioHang) && isNaN(maSanPham)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp MaGioHang hoặc MaSanPham'
      });
    }

    // Tìm dòng giỏ hàng tương ứng thuộc về người dùng hiện tại
    let querySql = `
      SELECT g.MaGioHang, g.SoLuong, g.MaSanPham, s.TonKho, s.TenSanPham, s.TrangThai
      FROM giohang g
      JOIN sanpham s ON g.MaSanPham = s.MaSanPham
      WHERE g.MaNguoiDung = ?
    `;
    const queryParams = [MaNguoiDung];

    if (!isNaN(maGioHang)) {
      querySql += ' AND g.MaGioHang = ?';
      queryParams.push(maGioHang);
    } else {
      querySql += ' AND g.MaSanPham = ?';
      queryParams.push(maSanPham);
    }

    const [cartRows] = await pool.query(querySql, queryParams);

    if (cartRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm trong giỏ hàng'
      });
    }

    const cartItem = cartRows[0];
    const currentQty = Number(cartItem.SoLuong);
    const tonKho = Number(cartItem.TonKho);

    let targetQty = currentQty;

    if (typeof delta === 'number') {
      targetQty = currentQty + delta;
    } else if (action === 'increase') {
      targetQty = currentQty + 1;
    } else if (action === 'decrease') {
      targetQty = currentQty - 1;
    } else {
      const rawSoLuong = req.body.SoLuong ?? req.body.quantity;
      if (rawSoLuong === undefined || rawSoLuong === null) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp số lượng mới hoặc thao tác cập nhật'
        });
      }
      targetQty = parseInt(rawSoLuong, 10);
      if (isNaN(targetQty)) {
        return res.status(400).json({
          success: false,
          message: 'Số lượng không hợp lệ'
        });
      }
    }

    // Nếu số lượng <= 0 thì tự động xóa mục khỏi giỏ hàng
    if (targetQty <= 0) {
      await pool.query('DELETE FROM giohang WHERE MaGioHang = ?', [cartItem.MaGioHang]);
      return res.status(200).json({
        success: true,
        message: 'Đã xóa sản phẩm khỏi giỏ hàng',
        data: {
          MaGioHang: cartItem.MaGioHang,
          MaSanPham: cartItem.MaSanPham,
          SoLuong: 0
        }
      });
    }

    // Kiểm tra không vượt quá tồn kho
    if (targetQty > tonKho) {
      return res.status(400).json({
        success: false,
        message: `Số lượng cập nhật vượt quá số lượng tồn kho (Tồn kho: ${tonKho})`
      });
    }

    // Cập nhật số lượng mới
    await pool.query(
      'UPDATE giohang SET SoLuong = ? WHERE MaGioHang = ?',
      [targetQty, cartItem.MaGioHang]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật số lượng giỏ hàng thành công',
      data: {
        MaGioHang: cartItem.MaGioHang,
        MaSanPham: cartItem.MaSanPham,
        SoLuong: targetQty,
        TonKho: tonKho
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. POST /api/v1/cart/items/batch-delete
 * Nhận mảng cart_item_ids: []. Thực hiện xóa 1 hoặc nhiều dòng sản phẩm khỏi bảng giohang.
 * Body parameters: { cart_item_ids: [...] }
 */
const batchDeleteCartItems = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;
    const rawIds = req.body.cart_item_ids || req.body.MaGioHangList || req.body.ids;

    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách ID sản phẩm giỏ hàng (cart_item_ids) phải là một mảng không rỗng'
      });
    }

    const validIds = rawIds
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id) && id > 0);

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy ID giỏ hàng hợp lệ trong mảng cart_item_ids'
      });
    }

    const [result] = await pool.query(
      'DELETE FROM giohang WHERE MaGioHang IN (?) AND MaNguoiDung = ?',
      [validIds, MaNguoiDung]
    );

    return res.status(200).json({
      success: true,
      message: 'Xóa các sản phẩm khỏi giỏ hàng thành công',
      data: {
        deletedCount: result.affectedRows,
        cart_item_ids: validIds
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  batchDeleteCartItems
};
