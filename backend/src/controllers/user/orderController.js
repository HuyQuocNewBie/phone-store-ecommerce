const { pool } = require('../../../config/db');
const { sendOrderInvoiceEmail } = require('../../utils/mailer');

/**
 * Helper kiểm tra xem tỉnh thành có thuộc TP.HCM hay không
 */
const isHCMProvince = (prov) => {
  if (!prov) return false;
  const pStr = String(prov).toLowerCase().trim();
  // Mã tỉnh GHN = 202, mã GSO = 79, hoặc tên chuỗi
  if (['202', '79', 'hcm', 'hồ chí minh', 'ho chi minh', 'tp hcm', 'tp.hcm', 'thành phố hồ chí minh', 'thành phố hcm'].includes(pStr)) {
    return true;
  }
  return pStr.includes('hồ chí minh') || pStr.includes('hcm');
};

/**
 * Helper kiểm tra xem quận huyện thuộc TP.HCM Ngoại thành hay không
 */
const isHCMOuterDistrict = (dist) => {
  if (!dist) return false;
  const dStr = String(dist).toLowerCase().trim();
  // Mã GHN Ngoại thành HCM: 1460 (Bình Chánh), 1462 (Cần Giờ), 1463 (Củ Chi), 1464 (Hóc Môn), 1465 (Nhà Bè)
  const outerKeys = [
    '1460', '1462', '1463', '1464', '1465',
    'binh chanh', 'bình chánh',
    'can gio', 'cần giờ',
    'cu chi', 'củ chi',
    'hoc mon', 'hóc môn',
    'nha be', 'nhà bè',
    'ngoai thanh', 'ngoại thành'
  ];
  return outerKeys.some((key) => dStr === key || dStr.includes(key));
};

/**
 * Hàm tính phí giao hàng theo quy tắc
 */
const computeShippingFee = (province, district, subtotal) => {
  const numSubtotal = Number(subtotal) || 0;

  // Đơn >= 10.000.000đ -> Phí ship = 0đ (Freeship)
  if (numSubtotal >= 10000000) {
    return {
      shipping_fee: 0,
      is_freeship: true,
      rule_applied: 'Freeship đơn hàng >= 10.000.000đ'
    };
  }

  // Tỉnh khác (Không thuộc TP.HCM) = 35.000đ
  if (!isHCMProvince(province)) {
    return {
      shipping_fee: 35000,
      is_freeship: false,
      rule_applied: 'Phí giao hàng Tỉnh/Thành khác (35.000đ)'
    };
  }

  // TP.HCM Ngoại thành = 20.000đ
  if (isHCMOuterDistrict(district)) {
    return {
      shipping_fee: 20000,
      is_freeship: false,
      rule_applied: 'Phí giao hàng TP.HCM Ngoại thành (20.000đ)'
    };
  }

  // TP.HCM Nội thành = 0đ
  return {
    shipping_fee: 0,
    is_freeship: true,
    rule_applied: 'Phí giao hàng TP.HCM Nội thành (0đ)'
  };
};

/**
 * 1. POST /api/v1/shipping/calculate (và /api/v1/orders/shipping/calculate)
 * Nhận province_id, district_id, order_subtotal.
 */
const calculateShipping = async (req, res, next) => {
  try {
    const province = req.body.province_id || req.body.province || req.body.tinh_thanh;
    const district = req.body.district_id || req.body.district || req.body.quan_huyen;
    const rawSubtotal = req.body.order_subtotal ?? req.body.subtotal ?? req.body.tong_tien_hang ?? 0;

    const subtotal = Number(rawSubtotal);

    if (isNaN(subtotal) || subtotal < 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị order_subtotal không hợp lệ'
      });
    }

    const feeResult = computeShippingFee(province, district, subtotal);

    return res.status(200).json({
      success: true,
      message: 'Tính phí vận chuyển thành công',
      data: {
        province_id: province || null,
        district_id: district || null,
        order_subtotal: subtotal,
        ...feeResult
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/v1/orders
 * Tạo đơn hàng mới trong cơ sở dữ liệu với Transaction
 */
const createOrder = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { MaNguoiDung } = req.user;

    const {
      TenNguoiNhan,
      receiver_name,
      SoDienThoai,
      phone,
      DiaChiGiaoHang,
      shipping_address,
      GhiChu,
      note,
      province_id,
      province,
      district_id,
      district,
      MaVoucher,
      voucher_code,
      cart_item_ids,
      items: rawItems
    } = req.body;

    const finalTenNguoiNhan = String(TenNguoiNhan || receiver_name || '').trim();
    const finalSoDienThoai = String(SoDienThoai || phone || '').trim();
    const finalDiaChiGiaoHang = String(DiaChiGiaoHang || shipping_address || '').trim();
    const finalGhiChu = GhiChu || note || null;
    const finalProvince = province_id || province;
    const finalDistrict = district_id || district;

    if (!finalTenNguoiNhan || !finalSoDienThoai || !finalDiaChiGiaoHang) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ Tên người nhận, Số điện thoại và Địa chỉ giao hàng'
      });
    }

    // Xác định danh sách sản phẩm mua
    let itemsToProcess = [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      // Hỗ trợ Mua ngay hoặc truyền trực tiếp danh sách items
      itemsToProcess = rawItems.map((item) => ({
        MaSanPham: parseInt(item.MaSanPham || item.product_id, 10),
        SoLuong: parseInt(item.SoLuong || item.quantity, 10)
      }));
    } else if (Array.isArray(cart_item_ids) && cart_item_ids.length > 0) {
      // Lấy danh sách sản phẩm từ bảng giohang theo cart_item_ids
      const validCartIds = cart_item_ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
      if (validCartIds.length > 0) {
        const [cartRows] = await connection.query(
          `SELECT MaGioHang, MaSanPham, SoLuong FROM giohang WHERE MaGioHang IN (?) AND MaNguoiDung = ?`,
          [validCartIds, MaNguoiDung]
        );
        itemsToProcess = cartRows.map((r) => ({
          MaSanPham: r.MaSanPham,
          SoLuong: r.SoLuong,
          MaGioHang: r.MaGioHang
        }));
      }
    } else {
      // Nếu không truyền items lẫn cart_item_ids, tự động lấy toàn bộ sản phẩm trong giỏ hàng của user
      const [cartRows] = await connection.query(
        `SELECT MaGioHang, MaSanPham, SoLuong FROM giohang WHERE MaNguoiDung = ?`,
        [MaNguoiDung]
      );
      itemsToProcess = cartRows.map((r) => ({
        MaSanPham: r.MaSanPham,
        SoLuong: r.SoLuong,
        MaGioHang: r.MaGioHang
      }));
    }

    if (itemsToProcess.length === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Không có sản phẩm nào trong đơn hàng'
      });
    }

    // Kiểm tra tính hợp lệ của items
    for (const item of itemsToProcess) {
      if (isNaN(item.MaSanPham) || item.MaSanPham <= 0 || isNaN(item.SoLuong) || item.SoLuong <= 0) {
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Danh sách sản phẩm mua chứa dữ liệu không hợp lệ (MaSanPham hoặc SoLuong)'
        });
      }
    }

    // Bắt đầu Transaction
    await connection.beginTransaction();

    // 1. Truy vấn giá thực tế (DonGia), Tên sản phẩm và Tồn kho từ DB (Đảm bảo BẢO MẬT GIÁ CẢ)
    const productIds = Array.from(new Set(itemsToProcess.map((i) => i.MaSanPham)));
    const [dbProducts] = await connection.query(
      `SELECT MaSanPham, TenSanPham, Gia, TonKho, TrangThai, DungLuong, MauSac 
       FROM sanpham 
       WHERE MaSanPham IN (?) FOR UPDATE`,
      [productIds]
    );

    const productMap = new Map();
    dbProducts.forEach((p) => productMap.set(p.MaSanPham, p));

    let subtotal = 0;
    const orderItemsDetails = [];

    for (const item of itemsToProcess) {
      const product = productMap.get(item.MaSanPham);
      if (!product) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: `Sản phẩm mã #${item.MaSanPham} không tồn tại`
        });
      }

      if (product.TrangThai === 'NgungBan') {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.TenSanPham}" đã ngừng kinh doanh`
        });
      }

      const currentTonKho = Number(product.TonKho);
      if (item.SoLuong > currentTonKho) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.TenSanPham}" không đủ tồn kho (Tồn kho: ${currentTonKho}, Yêu cầu: ${item.SoLuong})`
        });
      }

      const dbGia = Number(product.Gia);
      const itemSubtotal = item.SoLuong * dbGia;
      subtotal += itemSubtotal;

      orderItemsDetails.push({
        MaSanPham: item.MaSanPham,
        TenSanPham: product.TenSanPham,
        DungLuong: product.DungLuong,
        MauSac: product.MauSac,
        SoLuong: item.SoLuong,
        DonGia: dbGia,
        TongGia: itemSubtotal,
        MaGioHang: item.MaGioHang || null
      });
    }

    // 2. Tính phí giao hàng (PhiShip)
    const shippingCalc = computeShippingFee(finalProvince, finalDistrict, subtotal);
    const phiShip = shippingCalc.shipping_fee;

    // 3. Kiểm tra và áp dụng Voucher (nếu có)
    let soTienGiam = 0;
    let appliedVoucherId = null;

    const voucherQueryCode = MaVoucher || voucher_code;
    if (voucherQueryCode) {
      const isNum = !isNaN(parseInt(voucherQueryCode, 10));
      const [vouchers] = await connection.query(
        `SELECT * FROM voucher 
         WHERE (${isNum ? 'MaVoucher = ? OR ' : ''} Code = ?) 
           AND TrangThai = 1 
           AND NgayHetHan >= NOW() FOR UPDATE`,
        isNum ? [parseInt(voucherQueryCode, 10), String(voucherQueryCode)] : [String(voucherQueryCode)]
      );

      if (vouchers.length > 0) {
        const v = vouchers[0];
        if (v.SoLuong > 0 && subtotal >= Number(v.GiaTriToiThieu)) {
          appliedVoucherId = v.MaVoucher;
          if (v.LoaiGiam === 'tien') {
            soTienGiam = Number(v.GiaTriGiam);
          } else if (v.LoaiGiam === 'phantram') {
            soTienGiam = (subtotal * Number(v.GiaTriGiam)) / 100;
          }
          if (soTienGiam > subtotal) soTienGiam = subtotal;

          // Giảm số lượng Voucher
          await connection.query(
            `UPDATE voucher SET SoLuong = SoLuong - 1 WHERE MaVoucher = ?`,
            [appliedVoucherId]
          );
        }
      }
    }

    // 4. Tính Tổng Tiền đơn hàng
    const tongTien = Math.max(0, subtotal + phiShip - soTienGiam);

    // 5. Tạo đơn hàng trong bảng `donhang` với TrangThaiDonHang = "Chờ xác nhận"
    const [donHangResult] = await connection.query(
      `INSERT INTO donhang 
        (MaNguoiDung, NgayMuaHang, TrangThaiDonHang, MaVoucher, DiaChiGiaoHang, GhiChu, SoDienThoai, TenNguoiNhan, TongTien, PhiShip, SoTienGiam)
       VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        MaNguoiDung,
        'Chờ xác nhận',
        appliedVoucherId,
        finalDiaChiGiaoHang,
        finalGhiChu,
        finalSoDienThoai,
        finalTenNguoiNhan,
        tongTien,
        phiShip,
        soTienGiam
      ]
    );

    const maDonHang = donHangResult.insertId;

    // 6. Thêm bản ghi vào `chitietdonhang`
    for (const item of orderItemsDetails) {
      await connection.query(
        `INSERT INTO chitietdonhang (MaDonHang, MaSanPham, SoLuong, DonGia) VALUES (?, ?, ?, ?)`,
        [maDonHang, item.MaSanPham, item.SoLuong, item.DonGia]
      );
    }

    // 7. Thêm bản ghi giao dịch trong bảng `thanhtoan` (MaPhuongThucThanhToan = 1, MaTrangThaiThanhToan = 1)
    const [thanhToanResult] = await connection.query(
      `INSERT INTO thanhtoan 
        (MaDonHang, MaNguoiDung, SoLuongMua, NgayThanhToan, MaTrangThaiThanhToan, MaPhuongThucThanhToan)
       VALUES (?, ?, ?, CURDATE(), 1, 1)`,
      [maDonHang, MaNguoiDung, tongTien]
    );

    const maThanhToan = thanhToanResult.insertId;

    // 8. Tạo bản ghi trong `lichsumuahang` (MaPhuongThucThanhToan = 1, MaTrangThaiThanhToan = 1)
    await connection.query(
      `INSERT INTO lichsumuahang 
        (MaNguoiDung, MaDonHang, NgayMua, TongTien, TrangThai, MaPhuongThucThanhToan, MaThanhToan)
       VALUES (?, ?, CURDATE(), ?, ?, 1, ?)`,
      [MaNguoiDung, maDonHang, tongTien, 'Chờ xác nhận', maThanhToan]
    );

    // 9. Ghi lịch sử sử dụng voucher nếu có
    if (appliedVoucherId) {
      await connection.query(
        `INSERT INTO lichsu_dung_voucher (MaNguoiDung, MaVoucher, MaDonHang, NgaySuDung) VALUES (?, ?, ?, NOW())`,
        [MaNguoiDung, appliedVoucherId, maDonHang]
      );
    }

    // 10. Trừ số lượng TonKho trong bảng `sanpham` và Thêm log vào `lichsutonkho` (LoaiBienDong = 'XuatBan')
    for (const item of orderItemsDetails) {
      // Trừ TonKho
      await connection.query(
        `UPDATE sanpham SET TonKho = TonKho - ? WHERE MaSanPham = ?`,
        [item.SoLuong, item.MaSanPham]
      );

      // Lấy tồn kho thực tế sau khi trừ
      const [updatedProdRows] = await connection.query(
        `SELECT TonKho FROM sanpham WHERE MaSanPham = ?`,
        [item.MaSanPham]
      );

      const newTonKho = Number(updatedProdRows[0].TonKho);

      // Nếu hết hàng thì cập nhật trạng thái
      if (newTonKho <= 0) {
        await connection.query(
          `UPDATE sanpham SET TrangThai = 'HetHang' WHERE MaSanPham = ?`,
          [item.MaSanPham]
        );
      }

      // Ghi log vào `lichsutonkho`
      await connection.query(
        `INSERT INTO lichsutonkho 
          (MaSanPham, LoaiBienDong, SoLuongThayDoi, TonThucTeSauDoi, MaThamChieu, NgayThucHien, GhiChu)
         VALUES (?, 'XuatBan', ?, ?, ?, NOW(), ?)`,
        [
          item.MaSanPham,
          -item.SoLuong,
          newTonKho,
          maDonHang,
          `Xuất bán cho đơn hàng #${maDonHang}`
        ]
      );
    }

    // 11. Xóa các sản phẩm đã thanh toán khỏi bảng `giohang`
    const specificCartIds = orderItemsDetails
      .map((i) => i.MaGioHang)
      .filter((id) => id !== null && id !== undefined);

    if (specificCartIds.length > 0) {
      await connection.query(
        `DELETE FROM giohang WHERE MaGioHang IN (?) AND MaNguoiDung = ?`,
        [specificCartIds, MaNguoiDung]
      );
    } else {
      // Xóa các sản phẩm đã mua khỏi giỏ hàng của user
      await connection.query(
        `DELETE FROM giohang WHERE MaNguoiDung = ? AND MaSanPham IN (?)`,
        [MaNguoiDung, productIds]
      );
    }

    // Commit Transaction
    await connection.commit();
    connection.release();

    // 12. Gửi Email hóa đơn HTML tự động qua Nodemailer
    let targetEmail = req.user.Email;
    if (!targetEmail) {
      // Tìm email người dùng trong bảng nguoidung
      const [userRows] = await pool.query(
        `SELECT Email FROM nguoidung WHERE MaNguoiDung = ?`,
        [MaNguoiDung]
      );
      if (userRows.length > 0) {
        targetEmail = userRows[0].Email;
      }
    }

    if (targetEmail) {
      sendOrderInvoiceEmail(targetEmail, {
        MaDonHang: maDonHang,
        NgayMuaHang: new Date(),
        TenNguoiNhan: finalTenNguoiNhan,
        SoDienThoai: finalSoDienThoai,
        DiaChiGiaoHang: finalDiaChiGiaoHang,
        GhiChu: finalGhiChu,
        items: orderItemsDetails,
        subtotal,
        PhiShip: phiShip,
        SoTienGiam: soTienGiam,
        TongTien: tongTien
      }).catch((err) => console.error('Error sending order invoice email async:', err));
    }

    return res.status(201).json({
      success: true,
      message: 'Tạo đơn hàng thành công',
      data: {
        MaDonHang: maDonHang,
        TrangThaiDonHang: 'Chờ xác nhận',
        TongTien: tongTien,
        PhiShip: phiShip,
        SoTienGiam: soTienGiam,
        subtotal,
        TenNguoiNhan: finalTenNguoiNhan,
        SoDienThoai: finalSoDienThoai,
        DiaChiGiaoHang: finalDiaChiGiaoHang,
        items: orderItemsDetails.map((i) => ({
          MaSanPham: i.MaSanPham,
          TenSanPham: i.TenSanPham,
          SoLuong: i.SoLuong,
          DonGia: i.DonGia,
          TongGia: i.TongGia
        }))
      }
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    next(error);
  }
};

module.exports = {
  calculateShipping,
  createOrder
};
