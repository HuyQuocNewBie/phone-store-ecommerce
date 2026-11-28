const { pool } = require('../../../config/db');
const {
  resolveVariant,
  variantErrorMessage
} = require('../../utils/variantStockHelper');

/**
 * Helper: tổng số lượng của cùng 1 biến thể SKU đang nằm trong giỏ của user (trừ dòng đang xét)
 */
const sumVariantQtyInCart = async (maNguoiDung, maBienThe, excludeMaGioHang = null) => {
  if (!maBienThe) return 0;
  let sql = 'SELECT COALESCE(SUM(SoLuong), 0) AS total FROM giohang WHERE MaNguoiDung = ? AND MaBienThe = ?';
  const params = [maNguoiDung, maBienThe];
  if (excludeMaGioHang) {
    sql += ' AND MaGioHang != ?';
    params.push(excludeMaGioHang);
  }
  const [[row]] = await pool.query(sql, params);
  return Number(row?.total) || 0;
};

/**
 * 1. GET /api/v1/cart
 * Lấy danh sách sản phẩm trong giỏ của người dùng từ bảng giohang
 * (Kèm TenSanPham, Gia, Anh, DungLuong, MauSac từ giohang, MaBienThe + TonKho theo biến thể SKU).
 */
const getCart = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;

    const sql = `
      SELECT 
        g.MaGioHang,
        g.MaNguoiDung,
        g.MaSanPham,
        g.MaBienThe,
        g.SoLuong,
        g.DungLuong,
        g.MauSac,
        s.TenSanPham,
        s.Gia,
        s.Anh,
        s.TonKho AS TonKhoSanPham,
        s.TrangThai AS TrangThaiSanPham,
        bt.MaSKU,
        bt.GiaBan,
        bt.TonKho AS TonKhoBienThe,
        bt.TrangThai AS TrangThaiBienThe,
        bt.DungLuong AS DungLuongBienThe,
        bt.MauSac AS MauSacBienThe
      FROM giohang g
      JOIN sanpham s ON g.MaSanPham = s.MaSanPham
      LEFT JOIN sanpham_bienthe bt ON g.MaBienThe = bt.MaBienThe
      WHERE g.MaNguoiDung = ?
      ORDER BY g.MaGioHang DESC
    `;

    const [rows] = await pool.query(sql, [MaNguoiDung]);

    const formattedData = rows.map((item) => {
      const hasVariant = item.MaBienThe !== null && item.MaBienThe !== undefined && item.MaSKU;
      let trangThai = item.TrangThaiSanPham;
      if (trangThai !== 'NgungBan' && hasVariant) {
        trangThai = item.TrangThaiBienThe;
      }

      return {
        MaGioHang: item.MaGioHang,
        MaNguoiDung: item.MaNguoiDung,
        MaSanPham: item.MaSanPham,
        MaBienThe: hasVariant ? item.MaBienThe : null,
        MaSKU: hasVariant ? item.MaSKU : null,
        SoLuong: Number(item.SoLuong),
        TenSanPham: item.TenSanPham,
        Gia: Number(item.Gia),
        GiaBan: hasVariant ? Number(item.GiaBan) : Number(item.Gia),
        Anh: item.Anh,
        DungLuong: item.DungLuong || (hasVariant ? item.DungLuongBienThe : null) || null,
        MauSac: item.MauSac || (hasVariant ? item.MauSacBienThe : null) || null,
        TonKho: Number(hasVariant ? item.TonKhoBienThe : item.TonKhoSanPham) || 0,
        TrangThai: trangThai
      };
    });

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
 * Thêm sản phẩm vào giỏ hàng theo đúng biến thể SKU (MaBienThe).
 * - MaBienThe được lấy trực tiếp từ body, hoặc tự xác định từ (MaSanPham + DungLuong + MauSac) trong `sanpham_bienthe`.
 * - Nếu đã tồn tại (cùng MaBienThe + DungLuong + MauSac) thì cộng dồn SoLuong.
 * - Kiểm tra TonKho theo biến thể (tính cả số lượng biến thể đó đã có trong giỏ).
 * Body parameters: { MaSanPham, MaBienThe?, SoLuong, DungLuong, MauSac } (hoặc { product_id, variant_id, quantity })
 */
const addToCart = async (req, res, next) => {
  try {
    const { MaNguoiDung } = req.user;
    const rawMaSanPham = req.body.MaSanPham || req.body.product_id;
    const rawMaBienThe = req.body.MaBienThe ?? req.body.maBienThe ?? req.body.variant_id ?? null;
    const rawSoLuong = req.body.SoLuong ?? req.body.quantity ?? 1;
    const inputDungLuong = req.body.DungLuong ? String(req.body.DungLuong).trim() : null;
    const inputMauSac = req.body.MauSac ? String(req.body.MauSac).trim() : null;

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

    if (product.TrangThai === 'NgungBan') {
      return res.status(400).json({
        success: false,
        message: 'Sản phẩm này đã ngừng kinh doanh'
      });
    }

    // 2. Xác định đúng biến thể SKU (MaBienThe)
    const { variant, reason } = await resolveVariant(pool, {
      maSanPham: MaSanPham,
      maBienThe: rawMaBienThe,
      dungLuong: inputDungLuong,
      mauSac: inputMauSac
    });

    if (!variant) {
      return res.status(400).json({
        success: false,
        message: variantErrorMessage(reason, product.TenSanPham)
      });
    }

    if (variant.TrangThai === 'NgungBan') {
      return res.status(400).json({
        success: false,
        message: 'Phiên bản sản phẩm này đã ngừng kinh doanh'
      });
    }

    const MaBienThe = Number(variant.MaBienThe);
    const tonKho = Number(variant.TonKho) || 0;
    const DungLuong = inputDungLuong || variant.DungLuong || null;
    const MauSac = inputMauSac || variant.MauSac || null;

    if (tonKho <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Phiên bản sản phẩm này đã hết hàng'
      });
    }

    // 3. Kiểm tra dòng giỏ hàng đã tồn tại (khớp MaBienThe + DungLuong + MauSac)
    let cartCheckSql = 'SELECT MaGioHang, SoLuong FROM giohang WHERE MaNguoiDung = ? AND MaSanPham = ? AND MaBienThe = ?';
    const cartCheckParams = [MaNguoiDung, MaSanPham, MaBienThe];

    if (DungLuong !== null) {
      cartCheckSql += ' AND DungLuong = ?';
      cartCheckParams.push(DungLuong);
    } else {
      cartCheckSql += ' AND (DungLuong IS NULL OR DungLuong = "")';
    }

    if (MauSac !== null) {
      cartCheckSql += ' AND MauSac = ?';
      cartCheckParams.push(MauSac);
    } else {
      cartCheckSql += ' AND (MauSac IS NULL OR MauSac = "")';
    }

    const [cartRows] = await pool.query(cartCheckSql, cartCheckParams);
    const existingRow = cartRows[0] || null;

    // Tổng số lượng cùng biến thể ở các dòng giỏ hàng khác
    const otherQty = await sumVariantQtyInCart(MaNguoiDung, MaBienThe, existingRow ? existingRow.MaGioHang : null);

    if (existingRow) {
      // Đã có trong giỏ (cùng biến thể) -> Cộng dồn số lượng
      const currentQty = Number(existingRow.SoLuong);
      const newQty = currentQty + addSoLuong;

      if (newQty + otherQty > tonKho) {
        return res.status(400).json({
          success: false,
          message: `Số lượng trong giỏ vượt quá số lượng tồn kho của phiên bản này (Tồn kho: ${tonKho}, đã có trong giỏ: ${currentQty + otherQty})`
        });
      }

      await pool.query(
        'UPDATE giohang SET SoLuong = ?, MaBienThe = ? WHERE MaGioHang = ?',
        [newQty, MaBienThe, existingRow.MaGioHang]
      );

      return res.status(200).json({
        success: true,
        message: 'Cập nhật số lượng giỏ hàng thành công',
        data: {
          MaGioHang: existingRow.MaGioHang,
          MaSanPham,
          MaBienThe,
          MaSKU: variant.MaSKU,
          SoLuong: newQty,
          DungLuong,
          MauSac,
          TonKho: tonKho
        }
      });
    }

    // Chưa có trong giỏ -> Thêm mới dòng sản phẩm kèm MaBienThe
    if (addSoLuong + otherQty > tonKho) {
      return res.status(400).json({
        success: false,
        message: `Số lượng thêm vào vượt quá số lượng tồn kho khả dụng của phiên bản này (Tồn kho: ${tonKho}${otherQty > 0 ? `, đã có trong giỏ: ${otherQty}` : ''})`
      });
    }

    const [insertResult] = await pool.query(
      'INSERT INTO giohang (MaNguoiDung, MaSanPham, MaBienThe, SoLuong, DungLuong, MauSac) VALUES (?, ?, ?, ?, ?, ?)',
      [MaNguoiDung, MaSanPham, MaBienThe, addSoLuong, DungLuong, MauSac]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm vào giỏ hàng thành công',
      data: {
        MaGioHang: insertResult.insertId,
        MaSanPham,
        MaBienThe,
        MaSKU: variant.MaSKU,
        SoLuong: addSoLuong,
        DungLuong,
        MauSac,
        TonKho: tonKho
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. PUT /api/v1/cart/items
 * Cập nhật SoLuong (+/-) của 1 mục trong giỏ (kiểm tra tồn kho theo MaBienThe).
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
      SELECT g.MaGioHang, g.SoLuong, g.MaSanPham, g.MaBienThe, g.DungLuong, g.MauSac,
             s.TonKho, s.TenSanPham, s.TrangThai
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
          MaBienThe: cartItem.MaBienThe || null,
          SoLuong: 0
        }
      });
    }

    // Xác định biến thể của dòng giỏ hàng (dòng cũ thiếu MaBienThe sẽ được bổ sung tự động)
    const { variant, reason } = await resolveVariant(pool, {
      maSanPham: cartItem.MaSanPham,
      maBienThe: cartItem.MaBienThe,
      dungLuong: cartItem.DungLuong,
      mauSac: cartItem.MauSac
    });

    if (!variant) {
      return res.status(400).json({
        success: false,
        message: variantErrorMessage(reason, cartItem.TenSanPham)
      });
    }

    const maBienThe = Number(variant.MaBienThe);
    const tonKho = Number(variant.TonKho) || 0;

    if (cartItem.TrangThai === 'NgungBan' || variant.TrangThai === 'NgungBan') {
      return res.status(400).json({
        success: false,
        message: 'Phiên bản sản phẩm này đã ngừng kinh doanh'
      });
    }

    // Kiểm tra không vượt quá tồn kho của biến thể (tính cả các dòng giỏ khác cùng biến thể)
    const otherQty = await sumVariantQtyInCart(MaNguoiDung, maBienThe, cartItem.MaGioHang);
    if (targetQty + otherQty > tonKho) {
      return res.status(400).json({
        success: false,
        message: `Số lượng cập nhật vượt quá số lượng tồn kho của phiên bản này (Tồn kho: ${tonKho}${otherQty > 0 ? `, dòng khác trong giỏ: ${otherQty}` : ''})`
      });
    }

    // Cập nhật số lượng mới (đồng thời chuẩn hóa MaBienThe)
    await pool.query(
      'UPDATE giohang SET SoLuong = ?, MaBienThe = ? WHERE MaGioHang = ?',
      [targetQty, maBienThe, cartItem.MaGioHang]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật số lượng giỏ hàng thành công',
      data: {
        MaGioHang: cartItem.MaGioHang,
        MaSanPham: cartItem.MaSanPham,
        MaBienThe: maBienThe,
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
