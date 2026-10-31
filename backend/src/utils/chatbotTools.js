/**
 * ============================================================================
 * Registry Chứa Các Hàm SQL & Function Declarations Dành Cho AI Chatbot Gemini
 * Project: Phone Store E-commerce
 * File: backend/src/utils/chatbotTools.js
 * ============================================================================
 */

const { pool } = require('../../config/db');
const { formatOrderCode } = require('./formatters');

// Nạp Type từ Google Gen AI SDK nếu có, hoặc dùng fallback chuỗi chuẩn OpenAPI/Gemini
let Type;
try {
  Type = require('@google/genai').Type;
} catch {
  Type = {
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
    OBJECT: 'OBJECT'
  };
}

/**
 * Định dạng tiền tệ VND
 * @param {number|string} price
 * @returns {string} ví dụ: "27.444.000 ₫"
 */
const formatVND = (price) => {
  const num = Number(price);
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

/**
 * Bóc tách ID số nguyên từ orderCode đầu vào
 * Hỗ trợ các định dạng: "SZ202609170002", "#2", "2", 2
 * @param {string|number} orderCode
 * @returns {number|null}
 */
const parseOrderId = (orderCode) => {
  if (orderCode === null || orderCode === undefined) return null;
  const str = String(orderCode).trim();
  if (!str) return null;

  // Trường hợp chuẩn: SZ + YYYYMMDD + 4 chữ số ID (ví dụ: SZ202609170002 -> ID: 2)
  const szMatch = str.match(/^SZ\d{8}(\d+)$/i);
  if (szMatch) {
    const parsed = parseInt(szMatch[1], 10);
    return isNaN(parsed) ? null : parsed;
  }

  // Trường hợp truyền ID thuần hoặc kèm dấu '#' (ví dụ: "#2", "2")
  const numMatch = str.replace(/^#/, '').match(/^\d+$/);
  if (numMatch) {
    const parsed = parseInt(numMatch[0], 10);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
};

// ============================================================================
// 1. CÁC HÀM TRUY VẤN DATABASE DÀNH CHO GEMINI FUNCTION CALLING
// ============================================================================

/**
 * 1. searchProducts({ keyword, minPrice, maxPrice, category })
 * Tìm kiếm danh sách sản phẩm trực tiếp từ bảng `sanpham`, kết hợp `loaisanpham` và `nhasanxuat`.
 *
 * @param {Object} params
 * @param {string} [params.keyword] - Từ khóa tìm kiếm (tên điện thoại, mô tả, hãng...)
 * @param {number} [params.minPrice] - Mức giá thấp nhất (VNĐ)
 * @param {number} [params.maxPrice] - Mức giá cao nhất (VNĐ)
 * @param {string|number} [params.category] - Tên danh mục hoặc hãng sản xuất
 * @returns {Promise<Object>} Dữ liệu trả về cho Gemini đọc hiểu
 */
const searchProducts = async ({ keyword, minPrice, maxPrice, category } = {}) => {
  try {
    const whereClauses = ["sp.TrangThai = 'DangBan'"];
    const queryParams = [];

    // Lọc theo từ khóa (tên sản phẩm, mô tả, danh mục, hãng sản xuất)
    const cleanKeyword = typeof keyword === 'string' ? keyword.trim() : '';
    if (cleanKeyword) {
      whereClauses.push(
        '(sp.TenSanPham LIKE ? OR sp.MoTa LIKE ? OR l.TenLoaiSanPham LIKE ? OR nsx.TenNhaSanXuat LIKE ?)'
      );
      queryParams.push(
        `%${cleanKeyword}%`,
        `%${cleanKeyword}%`,
        `%${cleanKeyword}%`,
        `%${cleanKeyword}%`
      );
    }

    // Lọc theo giá tối thiểu (minPrice)
    const parsedMinPrice = Number(minPrice);
    if (!isNaN(parsedMinPrice) && parsedMinPrice >= 0 && minPrice !== '' && minPrice !== null && minPrice !== undefined) {
      whereClauses.push('sp.Gia >= ?');
      queryParams.push(parsedMinPrice);
    }

    // Lọc theo giá tối đa (maxPrice)
    const parsedMaxPrice = Number(maxPrice);
    if (!isNaN(parsedMaxPrice) && parsedMaxPrice > 0 && maxPrice !== '' && maxPrice !== null && maxPrice !== undefined) {
      whereClauses.push('sp.Gia <= ?');
      queryParams.push(parsedMaxPrice);
    }

    // Lọc theo danh mục hoặc thương hiệu
    if (category !== undefined && category !== null && String(category).trim() !== '') {
      const catStr = String(category).trim();
      const catNum = Number(catStr);
      if (!isNaN(catNum) && Number.isInteger(catNum)) {
        whereClauses.push('(sp.MaLoaiSanPham = ? OR sp.MaNhaSanXuat = ?)');
        queryParams.push(catNum, catNum);
      } else {
        whereClauses.push('(l.TenLoaiSanPham LIKE ? OR nsx.TenNhaSanXuat LIKE ?)');
        queryParams.push(`%${catStr}%`, `%${catStr}%`);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const sql = `
      SELECT 
        sp.MaSanPham,
        sp.TenSanPham,
        sp.Anh,
        sp.Gia,
        sp.TonKho,
        sp.DungLuong,
        sp.MauSac,
        sp.TrangThai,
        sp.MoTa,
        l.TenLoaiSanPham AS DanhMuc,
        nsx.TenNhaSanXuat AS ThuongHieu
      FROM sanpham sp
      LEFT JOIN loaisanpham l ON sp.MaLoaiSanPham = l.MaLoaiSanPham
      LEFT JOIN nhasanxuat nsx ON sp.MaNhaSanXuat = nsx.MaNhaSanXuat
      ${whereSql}
      ORDER BY sp.MaSanPham DESC
      LIMIT 10
    `;

    const [rows] = await pool.query(sql, queryParams);

    const formattedProducts = rows.map((item) => ({
      productId: item.MaSanPham,
      name: item.TenSanPham,
      price: Number(item.Gia),
      priceFormatted: formatVND(item.Gia),
      stock: Number(item.TonKho),
      storage: item.DungLuong || 'Tiêu chuẩn',
      color: item.MauSac || 'Tiêu chuẩn',
      category: item.DanhMuc || 'Điện thoại',
      brand: item.ThuongHieu || 'Chưa cập nhật',
      status: item.TrangThai,
      description: item.MoTa ? item.MoTa.slice(0, 150) + (item.MoTa.length > 150 ? '...' : '') : '',
      imageUrl: item.Anh || null
    }));

    return {
      success: true,
      totalFound: formattedProducts.length,
      products: formattedProducts,
      message:
        formattedProducts.length > 0
          ? `Tìm thấy ${formattedProducts.length} sản phẩm phù hợp.`
          : 'Không tìm thấy sản phẩm nào phù hợp với yêu cầu tìm kiếm.'
    };
  } catch (error) {
    console.error('[chatbotTools.searchProducts] Lỗi truy vấn:', error.message);
    return {
      success: false,
      error: error.message,
      products: [],
      message: 'Đã xảy ra lỗi trong quá trình tra cứu sản phẩm.'
    };
  }
};

/**
 * 2. compareProducts({ productIds })
 * So sánh cấu hình, thông số kỹ thuật của 2-3 sản phẩm bằng cách JOIN bảng `sanpham` và `thongsokythuat`.
 *
 * @param {Object} params
 * @param {number[]|string} params.productIds - Mảng hoặc chuỗi các ID sản phẩm (ví dụ: [3, 5] hoặc "3,5")
 * @returns {Promise<Object>} Dữ liệu so sánh chuẩn hóa cho Gemini
 */
const compareProducts = async ({ productIds } = {}) => {
  try {
    let ids = [];

    if (Array.isArray(productIds)) {
      ids = productIds.map((id) => Number(id));
    } else if (typeof productIds === 'string') {
      ids = productIds.split(',').map((id) => Number(id.trim()));
    } else if (typeof productIds === 'number') {
      ids = [productIds];
    }

    ids = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);

    if (ids.length < 2) {
      return {
        success: false,
        message: 'Vui lòng cung cấp danh sách ít nhất 2 mã sản phẩm (productIds) để so sánh (tối đa 4 sản phẩm).'
      };
    }

    // Giới hạn so sánh tối đa 4 sản phẩm cùng lúc để tránh quá tải token AI
    const limitedIds = ids.slice(0, 4);

    // 1. Lấy thông tin cơ bản sản phẩm từ bảng `sanpham`
    const [productRows] = await pool.query(
      `SELECT 
         sp.MaSanPham,
         sp.TenSanPham,
         sp.Anh,
         sp.Gia,
         sp.TonKho,
         sp.DungLuong,
         sp.MauSac,
         sp.TrangThai,
         sp.MoTa,
         l.TenLoaiSanPham AS DanhMuc,
         nsx.TenNhaSanXuat AS ThuongHieu
       FROM sanpham sp
       LEFT JOIN loaisanpham l ON sp.MaLoaiSanPham = l.MaLoaiSanPham
       LEFT JOIN nhasanxuat nsx ON sp.MaNhaSanXuat = nsx.MaNhaSanXuat
       WHERE sp.MaSanPham IN (?)`,
      [limitedIds]
    );

    if (productRows.length === 0) {
      return {
        success: false,
        message: `Không tìm thấy sản phẩm nào trong hệ thống với các mã ID: ${limitedIds.join(', ')}.`
      };
    }

    const foundIds = productRows.map((p) => p.MaSanPham);

    // 2. Lấy toàn bộ thông số kỹ thuật từ bảng `thongsokythuat`
    const [specRows] = await pool.query(
      `SELECT 
         MaThongSo,
         MaSanPham,
         NhomThongSo,
         TenThongSo,
         GiaTri
       FROM thongsokythuat
       WHERE MaSanPham IN (?)
       ORDER BY FIELD(MaSanPham, ?), MaThongSo ASC`,
      [foundIds, foundIds]
    );

    // Gom nhóm thông số theo từng sản phẩm
    const specsMap = new Map();
    const specsByGroupMap = new Map();

    for (const id of foundIds) {
      specsMap.set(id, []);
      specsByGroupMap.set(id, {});
    }

    for (const row of specRows) {
      const pid = row.MaSanPham;
      const groupName = row.NhomThongSo || 'Thông số chung';
      const specItem = {
        group: groupName,
        specName: row.TenThongSo,
        value: row.GiaTri
      };

      if (specsMap.has(pid)) {
        specsMap.get(pid).push(specItem);
      }

      if (specsByGroupMap.has(pid)) {
        const groupObj = specsByGroupMap.get(pid);
        if (!groupObj[groupName]) {
          groupObj[groupName] = {};
        }
        groupObj[groupName][row.TenThongSo] = row.GiaTri;
      }
    }

    // Định dạng danh sách sản phẩm kèm cấu hình chi tiết
    const comparisonList = productRows.map((prod) => ({
      productId: prod.MaSanPham,
      name: prod.TenSanPham,
      price: Number(prod.Gia),
      priceFormatted: formatVND(prod.Gia),
      brand: prod.ThuongHieu || 'Chưa cập nhật',
      category: prod.DanhMuc || 'Điện thoại',
      storage: prod.DungLuong || 'Tiêu chuẩn',
      color: prod.MauSac || 'Tiêu chuẩn',
      stock: Number(prod.TonKho),
      status: prod.TrangThai,
      imageUrl: prod.Anh,
      specifications: specsMap.get(prod.MaSanPham) || [],
      specificationsByGroup: specsByGroupMap.get(prod.MaSanPham) || {}
    }));

    return {
      success: true,
      comparisonCount: comparisonList.length,
      requestedIds: limitedIds,
      products: comparisonList,
      message: `Đã truy xuất dữ liệu so sánh chi tiết cho ${comparisonList.length} sản phẩm.`
    };
  } catch (error) {
    console.error('[chatbotTools.compareProducts] Lỗi so sánh sản phẩm:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'Đã xảy ra lỗi khi truy vấn thông số so sánh sản phẩm.'
    };
  }
};

/**
 * 3. getOrderStatus({ orderCode, phoneNumber })
 * Tra cứu tiến độ đơn hàng bằng cách JOIN bảng `donhang` và `chitietdonhang`.
 * Hỗ trợ tra cứu theo mã đơn hàng (orderCode) hoặc số điện thoại (phoneNumber).
 *
 * @param {Object} params
 * @param {string|number} [params.orderCode] - Mã đơn hàng (ví dụ: "SZ202609170002" hoặc số ID "2")
 * @param {string} [params.phoneNumber] - Số điện thoại đặt hàng (ví dụ: "0901234567")
 * @returns {Promise<Object>} Trạng thái đơn hàng và các mặt hàng bên trong
 */
const getOrderStatus = async ({ orderCode, phoneNumber } = {}) => {
  try {
    const rawOrderCode = orderCode !== undefined && orderCode !== null ? String(orderCode).trim() : '';
    const rawPhone = phoneNumber !== undefined && phoneNumber !== null ? String(phoneNumber).trim() : '';

    if (!rawOrderCode && !rawPhone) {
      return {
        success: false,
        message:
          'Vui lòng cung cấp mã đơn hàng (ví dụ: "SZ202609170002") hoặc số điện thoại đặt hàng (ví dụ: "0901234567") để tra cứu.'
      };
    }

    const parsedId = parseOrderId(rawOrderCode);
    const sanitizedPhone = rawPhone.replace(/[^\d+]/g, '');

    const whereClauses = [];
    const queryParams = [];

    // Điều kiện lọc theo mã đơn hàng
    if (parsedId !== null) {
      whereClauses.push('d.MaDonHang = ?');
      queryParams.push(parsedId);
    } else if (rawOrderCode) {
      whereClauses.push('CAST(d.MaDonHang AS CHAR) = ?');
      queryParams.push(rawOrderCode);
    }

    // Điều kiện lọc theo số điện thoại
    if (sanitizedPhone) {
      const localPhone = sanitizedPhone.replace(/^\+84/, '0');
      whereClauses.push('(d.SoDienThoai = ? OR d.SoDienThoai LIKE ?)');
      queryParams.push(localPhone, `%${localPhone}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 1. Truy vấn thông tin đơn hàng cùng phương thức thanh toán
    const orderSql = `
      SELECT 
        d.MaDonHang,
        d.NgayMuaHang,
        d.TrangThaiDonHang,
        d.DiaChiGiaoHang,
        d.GhiChu,
        d.SoDienThoai,
        d.TenNguoiNhan,
        d.TongTien,
        d.PhiShip,
        d.SoTienGiam,
        COALESCE(pttt.TenPhuongThucThanhToan, pttt_ls.TenPhuongThucThanhToan, 'COD') AS PhuongThucThanhToan,
        COALESCE(tttt.TenTrangThai, CASE WHEN d.TrangThaiDonHang = 'Đã giao' THEN 'Thành công' ELSE 'Chưa thanh toán' END) AS TrangThaiThanhToan
      FROM donhang d
      LEFT JOIN thanhtoan tt ON d.MaDonHang = tt.MaDonHang
      LEFT JOIN phuongthucthanhtoan pttt ON tt.MaPhuongThucThanhToan = pttt.MaPhuongThucThanhToan
      LEFT JOIN trangthaithanhtoan tttt ON tt.MaTrangThaiThanhToan = tttt.MaTrangThaiThanhToan
      LEFT JOIN lichsumuahang lsmh ON d.MaDonHang = lsmh.MaDonHang
      LEFT JOIN phuongthucthanhtoan pttt_ls ON lsmh.MaPhuongThucThanhToan = pttt_ls.MaPhuongThucThanhToan
      ${whereSql}
      ORDER BY d.NgayMuaHang DESC
      LIMIT 5
    `;

    const [orders] = await pool.query(orderSql, queryParams);

    if (orders.length === 0) {
      return {
        success: true,
        totalOrders: 0,
        orders: [],
        message: 'Không tìm thấy đơn hàng nào khớp với mã đơn hoặc số điện thoại đã cung cấp.'
      };
    }

    const orderIds = orders.map((o) => o.MaDonHang);

    // 2. JOIN bảng `chitietdonhang` và `sanpham` để lấy danh sách sản phẩm trong đơn
    const [detailRows] = await pool.query(
      `SELECT 
         ct.MaChiTietDonHang,
         ct.MaDonHang,
         ct.MaSanPham,
         ct.SoLuong,
         ct.DonGia,
         (ct.SoLuong * ct.DonGia) AS TongGia,
         ct.DungLuong,
         ct.MauSac,
         sp.TenSanPham,
         sp.Anh
       FROM chitietdonhang ct
       LEFT JOIN sanpham sp ON ct.MaSanPham = sp.MaSanPham
       WHERE ct.MaDonHang IN (?)
       ORDER BY ct.MaChiTietDonHang ASC`,
      [orderIds]
    );

    // Gom chi tiết đơn hàng theo MaDonHang
    const itemsMap = new Map();
    for (const oid of orderIds) {
      itemsMap.set(oid, []);
    }

    for (const item of detailRows) {
      if (itemsMap.has(item.MaDonHang)) {
        itemsMap.get(item.MaDonHang).push({
          productId: item.MaSanPham,
          productName: item.TenSanPham || 'Sản phẩm',
          quantity: Number(item.SoLuong),
          unitPrice: Number(item.DonGia),
          unitPriceFormatted: formatVND(item.DonGia),
          totalPrice: Number(item.TongGia),
          totalPriceFormatted: formatVND(item.TongGia),
          storage: item.DungLuong || null,
          color: item.MauSac || null,
          imageUrl: item.Anh || null
        });
      }
    }

    // Chuẩn hóa danh sách đơn hàng cho Gemini phản hồi khách hàng
    const formattedOrders = orders.map((o) => ({
      orderId: o.MaDonHang,
      orderCode: formatOrderCode(o.MaDonHang, o.NgayMuaHang),
      orderDate: o.NgayMuaHang,
      orderStatus: o.TrangThaiDonHang,
      recipient: {
        name: o.TenNguoiNhan || 'Khách hàng',
        phone: o.SoDienThoai,
        address: o.DiaChiGiaoHang,
        note: o.GhiChu || ''
      },
      payment: {
        method: o.PhuongThucThanhToan || 'COD',
        status: o.TrangThaiThanhToan || 'Chưa thanh toán'
      },
      pricing: {
        subtotal: Number(o.TongTien) - Number(o.PhiShip || 0) + Number(o.SoTienGiam || 0),
        shippingFee: Number(o.PhiShip || 0),
        discountAmount: Number(o.SoTienGiam || 0),
        totalAmount: Number(o.TongTien),
        totalAmountFormatted: formatVND(o.TongTien)
      },
      items: itemsMap.get(o.MaDonHang) || []
    }));

    return {
      success: true,
      totalOrders: formattedOrders.length,
      orders: formattedOrders,
      message: `Tìm thấy ${formattedOrders.length} đơn hàng tương ứng.`
    };
  } catch (error) {
    console.error('[chatbotTools.getOrderStatus] Lỗi tra cứu đơn hàng:', error.message);
    return {
      success: false,
      error: error.message,
      orders: [],
      message: 'Đã xảy ra lỗi khi tra cứu trạng thái đơn hàng.'
    };
  }
};

/**
 * 4. getVouchers()
 * Truy vấn danh sách các mã giảm giá (voucher) đang hoạt động, còn lượt sử dụng và còn hạn sử dụng.
 *
 * @returns {Promise<Object>} Danh sách các mã voucher sẵn sàng áp dụng
 */
const getVouchers = async () => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         MaVoucher,
         Code,
         GiaTriGiam,
         LoaiGiam,
         GiaTriToiThieu,
         SoLuong,
         NgayHetHan,
         TrangThai
       FROM voucher
       WHERE TrangThai = 1
         AND SoLuong > 0
         AND NgayHetHan >= NOW()
       ORDER BY GiaTriGiam DESC, MaVoucher DESC`
    );

    const formattedVouchers = rows.map((v) => {
      const isPercent = v.LoaiGiam === 'phantram';
      const discountText = isPercent
        ? `Giảm ${Number(v.GiaTriGiam)}%`
        : `Giảm ${formatVND(v.GiaTriGiam)}`;
      const minOrderText =
        Number(v.GiaTriToiThieu) > 0
          ? `cho đơn từ ${formatVND(v.GiaTriToiThieu)}`
          : 'cho mọi đơn hàng';

      const expiryDate = new Date(v.NgayHetHan);
      const formattedExpiry = isNaN(expiryDate.getTime())
        ? String(v.NgayHetHan)
        : expiryDate.toLocaleDateString('vi-VN');

      return {
        voucherId: v.MaVoucher,
        code: v.Code,
        discountType: v.LoaiGiam, // 'tien' hoặc 'phantram'
        discountValue: Number(v.GiaTriGiam),
        discountDisplay: discountText,
        minOrderValue: Number(v.GiaTriToiThieu),
        minOrderValueFormatted: formatVND(v.GiaTriToiThieu),
        remainingQuantity: Number(v.SoLuong),
        expiryDate: v.NgayHetHan,
        expiryDateFormatted: formattedExpiry,
        description: `Mã ${v.Code}: ${discountText} ${minOrderText}. Còn lại ${v.SoLuong} lượt dùng (HSD: ${formattedExpiry}).`
      };
    });

    return {
      success: true,
      totalVouchers: formattedVouchers.length,
      vouchers: formattedVouchers,
      message:
        formattedVouchers.length > 0
          ? `Hiện có ${formattedVouchers.length} mã giảm giá đang hoạt động.`
          : 'Hiện tại chưa có mã giảm giá nào đang áp dụng.'
    };
  } catch (error) {
    console.error('[chatbotTools.getVouchers] Lỗi truy vấn voucher:', error.message);
    return {
      success: false,
      error: error.message,
      vouchers: [],
      message: 'Đã xảy ra lỗi khi lấy danh sách mã giảm giá.'
    };
  }
};

/**
 * 5. getPaymentGuide()
 * Trả về quy trình và hướng dẫn chi tiết các phương thức thanh toán: COD, VNPay, ZaloPay.
 *
 * @returns {Promise<Object>} Hướng dẫn quy trình thanh toán đầy đủ
 */
const getPaymentGuide = async () => {
  return {
    success: true,
    supportedMethods: [
      {
        code: 'COD',
        name: 'Thanh toán khi nhận hàng (Cash on Delivery)',
        badge: 'Tiền mặt khi giao hàng',
        description:
          'Khách hàng kiểm tra hàng hóa ngoại quan và thanh toán tiền mặt trực tiếp cho bưu tá giao hàng.',
        steps: [
          'Bước 1: Chọn sản phẩm ưng ý và nhấn "Mua ngay" hoặc "Tiến hành đặt hàng" từ Giỏ hàng.',
          'Bước 2: Điền chính xác thông tin người nhận, số điện thoại và địa chỉ giao hàng.',
          'Bước 3: Tại mục Phương thức thanh toán, tích chọn "Thanh toán khi nhận hàng (COD)".',
          'Bước 4: Bấm "Đặt hàng", hệ thống sẽ lưu đơn ở trạng thái "Chờ xử lý" và gửi email hóa đơn tự động.',
          'Bước 5: Khi nhân viên giao hàng liên hệ giao bưu kiện, quý khách kiểm tra ngoại quan gói hàng và thanh toán tiền mặt cho shipper.'
        ],
        policy: 'Được hỗ trợ đồng kiểm tra ngoại quan gói hàng trước khi thanh toán. An toàn và tiện lợi.'
      },
      {
        code: 'VNPAY',
        name: 'Cổng thanh toán trực tuyến VNPay',
        badge: 'Quét VNPAY-QR / Thẻ ATM nội địa / Thẻ quốc tế',
        description:
          'Thanh toán điện tử bảo mật chuẩn quốc tế qua cổng VNPay với hơn 40 ngân hàng liên kết tại Việt Nam.',
        steps: [
          'Bước 1: Tại bước thanh toán, chọn phương thức "VNPay" và nhấn nút "Đặt hàng".',
          'Bước 2: Trình duyệt chuyển hướng an toàn sang giao diện thanh toán VNPay Gateway.',
          'Bước 3: Chọn phương thức mong muốn: Mở App Mobile Banking quét mã VNPAY-QR, hoặc nhập số thẻ ATM nội địa / Thẻ quốc tế (Visa, MasterCard, JCB).',
          'Bước 4: Nhập mã xác thực OTP gửi về số điện thoại ngân hàng để hoàn tất giao dịch.',
          'Bước 5: Cổng VNPay xác nhận thanh toán thành công và tự động chuyển về trang cửa hàng, đơn hàng được kích hoạt xử lý ngay lập tức.'
        ],
        policy: 'Bảo mật đạt chuẩn quốc tế PCI-DSS. Không mất phí xử lý giao dịch đối với khách hàng.'
      },
      {
        code: 'ZALOPAY',
        name: 'Ví điện tử ZaloPay',
        badge: 'App ZaloPay / Quét mã trên Zalo',
        description:
          'Thanh toán nhanh chóng, hiện đại qua ví ZaloPay hoặc ứng dụng Zalo cài đặt trên điện thoại.',
        steps: [
          'Bước 1: Chọn phương thức "ZaloPay" tại trang thanh toán và nhấn "Đặt hàng".',
          'Bước 2: Hệ thống tạo phiên thanh toán và hiển thị mã QR kèm số tiền cần thanh toán (nếu mua trên điện thoại, app ZaloPay sẽ tự động bật lên).',
          'Bước 3: Mở ứng dụng ZaloPay hoặc app Zalo trên điện thoại, chọn mục "Quét mã QR" và quét mã hiển thị trên màn hình.',
          'Bước 4: Kiểm tra lại số tiền thanh toán, áp dụng thêm voucher ZaloPay (nếu có) và bấm "Xác nhận thanh toán".',
          'Bước 5: Sau khi thanh toán thành công, hệ thống nhận thông báo tức thời và gửi email xác nhận hoàn tất đơn hàng.'
        ],
        policy: 'Giao dịch hoàn tất tức thì 24/7. Được tích lũy điểm và áp dụng các khuyến mãi độc quyền từ ví ZaloPay.'
      }
    ],
    generalNotes: [
      'Mọi giao dịch đều được ghi nhận bằng biên nhận điện tử và gửi xác nhận qua email của quý khách.',
      'Nếu quý khách gặp khó khăn khi thanh toán trực tuyến, có thể liên hệ bộ phận hỗ trợ khách hàng để đổi sang hình thức COD.'
    ]
  };
};

// ============================================================================
// 2. KHAI BÁO MẢNG toolsDeclaration CHUẨN JSON SCHEMA CỦA GEMINI API SDK
// ============================================================================

/**
 * Mảng Function Declarations tương thích 100% chuẩn Google Gemini API SDK (@google/genai, @google/generative-ai)
 */
const toolsDeclaration = [
  {
    name: 'searchProducts',
    description:
      'Tìm kiếm sản phẩm điện thoại và thiết bị trong cơ sở dữ liệu dựa trên từ khóa tên hoặc mô tả, khoảng giá (minPrice, maxPrice) và danh mục hoặc thương hiệu.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        keyword: {
          type: Type.STRING,
          description:
            'Từ khóa tìm kiếm theo tên hoặc đặc điểm sản phẩm (ví dụ: "iPhone 15", "Galaxy S25 Ultra", "Titanium", "256GB").'
        },
        minPrice: {
          type: Type.NUMBER,
          description: 'Mức giá tối thiểu bằng Việt Nam Đồng (VNĐ), ví dụ: 10000000 cho 10 triệu.'
        },
        maxPrice: {
          type: Type.NUMBER,
          description: 'Mức giá tối đa bằng Việt Nam Đồng (VNĐ), ví dụ: 30000000 cho 30 triệu.'
        },
        category: {
          type: Type.STRING,
          description: 'Tên danh mục hoặc hãng sản xuất cần lọc (ví dụ: "Apple", "Samsung", "Điện thoại").'
        }
      }
    }
  },
  {
    name: 'compareProducts',
    description:
      'So sánh chi tiết cấu hình, thông số kỹ thuật, màn hình, camera, dung lượng pin, màu sắc và giá bán của 2 đến 3 sản phẩm theo danh sách mã sản phẩm (productIds).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        productIds: {
          type: Type.ARRAY,
          description:
            'Mảng chứa từ 2 đến 3 mã sản phẩm ID dạng số nguyên cần so sánh (ví dụ: [3, 5]).',
          items: {
            type: Type.INTEGER
          }
        }
      },
      required: ['productIds']
    }
  },
  {
    name: 'getOrderStatus',
    description:
      'Tra cứu trạng thái xử lý, tiến độ vận chuyển đơn hàng, thông tin người nhận và chi tiết các sản phẩm đã mua dựa vào mã đơn hàng (orderCode) hoặc số điện thoại (phoneNumber).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderCode: {
          type: Type.STRING,
          description:
            'Mã đơn hàng cần kiểm tra (ví dụ: "SZ202609170002" hoặc số ID đơn hàng như "2").'
        },
        phoneNumber: {
          type: Type.STRING,
          description:
            'Số điện thoại người nhận đã dùng khi đặt hàng để tìm kiếm đơn hàng (ví dụ: "0901234567").'
        }
      }
    }
  },
  {
    name: 'getVouchers',
    description:
      'Lấy danh sách các mã giảm giá (voucher) đang hoạt động, còn lượt sử dụng và còn hạn sử dụng tại cửa hàng.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'getPaymentGuide',
    description:
      'Lấy quy trình và hướng dẫn chi tiết các bước thanh toán cho các phương thức: Tiền mặt khi nhận hàng (COD), Cổng thanh toán trực tuyến VNPay và Ví điện tử ZaloPay.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  }
];

// Registry map ánh xạ tên hàm sang implementation tương ứng
const chatbotTools = {
  searchProducts,
  compareProducts,
  getOrderStatus,
  getVouchers,
  getPaymentGuide
};

/**
 * Helper thực thi tool dựa trên tên hàm và tham số trả về từ Gemini API
 * @param {string} functionName
 * @param {Object} args
 * @returns {Promise<Object>}
 */
const executeChatbotTool = async (functionName, args = {}) => {
  const handler = chatbotTools[functionName];
  if (typeof handler !== 'function') {
    return {
      success: false,
      error: `Hàm "${functionName}" không tồn tại trong Registry chatbotTools.`
    };
  }

  try {
    return await handler(args);
  } catch (err) {
    console.error(`[executeChatbotTool] Lỗi khi thực thi ${functionName}:`, err.message);
    return {
      success: false,
      error: err.message
    };
  }
};

/**
 * Cấu trúc công cụ sẵn sàng truyền vào config của Gemini SDK:
 * config: { tools: geminiTools }
 */
const geminiTools = [
  {
    functionDeclarations: toolsDeclaration
  }
];

module.exports = {
  // 5 hàm truy vấn DB trực tiếp
  searchProducts,
  compareProducts,
  getOrderStatus,
  getVouchers,
  getPaymentGuide,

  // Registry & Helpers
  chatbotTools,
  executeChatbotTool,

  // Cấu hình Schema cho Gemini API SDK
  toolsDeclaration,
  geminiTools
};

