const { pool } = require('../../../config/db');

/**
 * Helper format VND tiền tệ
 */
const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

/**
 * Xác định chuẩn nhóm voucher ('GiamGiaDon' | 'FreeShip')
 */
const resolveVoucherGroup = (voucher) => {
  if (!voucher) return 'GiamGiaDon';
  if (voucher.NhomVoucher === 'FreeShip' || voucher.LoaiGiam === 'freeship') {
    return 'FreeShip';
  }
  return 'GiamGiaDon';
};

/**
 * Chuẩn hóa đối tượng voucher trả về client
 */
const formatVoucherItem = (item, stt = undefined) => {
  const formatted = {
    MaVoucher: item.MaVoucher,
    Code: item.Code,
    NhomVoucher: resolveVoucherGroup(item),
    GiaTriGiam: Number(item.GiaTriGiam),
    LoaiGiam: item.LoaiGiam,
    GiamToiDa: item.GiamToiDa !== null && item.GiamToiDa !== undefined ? Number(item.GiamToiDa) : null,
    GiaTriToiThieu: Number(item.GiaTriToiThieu),
    SoLuong: Number(item.SoLuong),
    NgayHetHan: item.NgayHetHan,
    TrangThai: Number(item.TrangThai)
  };
  return stt !== undefined ? { STT: stt, ...formatted } : formatted;
};

/**
 * Tính số tiền giảm cho 1 voucher cụ thể dựa trên nhóm & loại giảm
 * - Nhóm GiamGiaDon:
 *     + phantram: round(tongTienHang * GiaTriGiam / 100), giới hạn bởi GiamToiDa (nếu có) và tongTienHang
 *     + tien: GiaTriGiam, giới hạn bởi GiamToiDa (nếu có) và tongTienHang
 * - Nhóm FreeShip:
 *     + phantram: round(phiShip * GiaTriGiam / 100)
 *     + tien: GiaTriGiam
 *     + freeship: nếu GiaTriGiam > 0 lấy GiaTriGiam, ngược lại giảm toàn bộ phiShip
 *     => luôn giới hạn bởi GiamToiDa (nếu có) và không vượt quá phiShip
 */
const computeSingleVoucherDiscount = (voucher, tongTienHang, phiShip = 0) => {
  const group = resolveVoucherGroup(voucher);
  const giaTriGiam = Number(voucher.GiaTriGiam) || 0;
  const giamToiDa =
    voucher.GiamToiDa !== null && voucher.GiamToiDa !== undefined && Number(voucher.GiamToiDa) > 0
      ? Number(voucher.GiamToiDa)
      : null;

  if (group === 'FreeShip') {
    const safeShip = Math.max(0, Number(phiShip) || 0);
    let rawShipDiscount = 0;

    if (voucher.LoaiGiam === 'phantram') {
      rawShipDiscount = Math.round((safeShip * giaTriGiam) / 100);
    } else if (voucher.LoaiGiam === 'tien') {
      rawShipDiscount = giaTriGiam;
    } else {
      // LoaiGiam === 'freeship': GiaTriGiam > 0 xem như mức giảm cố định; nếu 0 xem như freeship 100% (chịu trần GiamToiDa nếu có)
      rawShipDiscount = giaTriGiam > 0 ? giaTriGiam : safeShip;
    }

    if (giamToiDa !== null) {
      rawShipDiscount = Math.min(rawShipDiscount, giamToiDa);
    }

    return Math.min(Math.max(0, rawShipDiscount), safeShip);
  }

  // Nhóm GiamGiaDon
  const safeSubtotal = Math.max(0, Number(tongTienHang) || 0);
  let rawOrderDiscount = 0;

  if (voucher.LoaiGiam === 'phantram') {
    rawOrderDiscount = Math.round((safeSubtotal * giaTriGiam) / 100);
  } else {
    rawOrderDiscount = giaTriGiam;
  }

  if (giamToiDa !== null) {
    rawOrderDiscount = Math.min(rawOrderDiscount, giamToiDa);
  }

  return Math.min(Math.max(0, rawOrderDiscount), safeSubtotal);
};

/**
 * Đánh giá và tính toán giảm giá cho danh sách mã/ID voucher (dùng chung cho API apply-multi & createOrder)
 * @param {Object} dbConn - pool hoặc transaction connection
 * @param {Array<string|number>} rawIdentifiers - Danh sách Code hoặc MaVoucher
 * @param {number} tongTienHang - Tổng tiền hàng (chưa phí ship)
 * @param {number} phiShip - Phí vận chuyển
 * @param {Object} [options]
 * @param {boolean} [options.forUpdate=false] - Khóa FOR UPDATE khi gọi trong transaction tạo đơn
 * @returns {Promise<Object>}
 */
const evaluateMultiVouchers = async (
  dbConn,
  rawIdentifiers,
  tongTienHang,
  phiShip = 0,
  { forUpdate = false } = {}
) => {
  const safeSubtotal = Number(tongTienHang);
  const safeShip = Number(phiShip);

  if (isNaN(safeSubtotal) || safeSubtotal < 0) {
    return { valid: false, status: 400, message: 'Tổng tiền hàng (tongTienHang) không hợp lệ' };
  }
  if (isNaN(safeShip) || safeShip < 0) {
    return { valid: false, status: 400, message: 'Phí vận chuyển (phiShip) không hợp lệ' };
  }

  if (!Array.isArray(rawIdentifiers)) {
    return { valid: false, status: 400, message: 'Danh sách mã voucher (codes) phải là một mảng' };
  }

  // Chuẩn hóa danh sách đầu vào
  const cleanedTokens = rawIdentifiers
    .map((item) => {
      if (item === null || item === undefined) return '';
      if (typeof item === 'object') {
        const val = item.Code ?? item.code ?? item.MaVoucher ?? item.maVoucher ?? '';
        return String(val).trim();
      }
      return String(item).trim();
    })
    .filter(Boolean);

  if (cleanedTokens.length === 0) {
    return {
      valid: true,
      soTienGiamDon: 0,
      soTienGiamShip: 0,
      tongTienGiam: 0,
      tongThanhToan: Math.max(0, safeSubtotal + safeShip),
      giamGiaDonVoucher: null,
      freeShipVoucher: null,
      appliedVouchers: []
    };
  }

  // Kiểm tra trùng lặp đầu vào (không phân biệt hoa thường)
  const upperTokens = cleanedTokens.map((t) => t.toUpperCase());
  const uniqueUpperSet = new Set(upperTokens);
  if (uniqueUpperSet.size !== upperTokens.length) {
    return {
      valid: false,
      status: 400,
      message: 'Không thể áp dụng trùng lặp cùng một mã voucher trên cùng một đơn hàng'
    };
  }

  if (upperTokens.length > 2) {
    return {
      valid: false,
      status: 400,
      message: 'Chỉ được áp dụng tối đa 02 mã voucher (01 mã Giảm giá đơn hàng và 01 mã Freeship)'
    };
  }

  // Phân loại token dạng số (có thể là MaVoucher hoặc Code toàn số) và chuỗi Code
  const numericIds = upperTokens
    .filter((t) => /^\d+$/.test(t))
    .map((t) => parseInt(t, 10));

  let querySql = `
    SELECT
      MaVoucher,
      Code,
      NhomVoucher,
      GiaTriGiam,
      LoaiGiam,
      GiamToiDa,
      GiaTriToiThieu,
      SoLuong,
      NgayHetHan,
      TrangThai
    FROM voucher
    WHERE UPPER(Code) IN (?)
  `;
  const queryParams = [upperTokens];

  if (numericIds.length > 0) {
    querySql += ` OR MaVoucher IN (?)`;
    queryParams.push(numericIds);
  }

  // Sắp xếp theo MaVoucher ASC trước khi khóa FOR UPDATE để tránh deadlock
  querySql += ` ORDER BY MaVoucher ASC`;
  if (forUpdate) {
    querySql += ` FOR UPDATE`;
  }

  const [rows] = await dbConn.query(querySql, queryParams);

  // Ánh xạ từng token vào đúng bản ghi DB
  const matchedVouchers = [];
  const matchedVoucherIds = new Set();

  for (const token of upperTokens) {
    const found = rows.find(
      (r) =>
        String(r.Code).toUpperCase() === token ||
        (/^\d+$/.test(token) && Number(r.MaVoucher) === parseInt(token, 10))
    );

    if (!found) {
      return {
        valid: false,
        status: 404,
        message: `Mã voucher "${token}" không tồn tại trên hệ thống`
      };
    }

    if (matchedVoucherIds.has(found.MaVoucher)) {
      return {
        valid: false,
        status: 400,
        message: `Mã voucher "${found.Code}" bị trùng lặp trong danh sách áp dụng`
      };
    }

    matchedVoucherIds.add(found.MaVoucher);
    matchedVouchers.push(found);
  }

  // Kiểm tra điều kiện hợp lệ của từng voucher & phân nhóm
  const now = new Date();
  const giamGiaDonList = [];
  const freeShipList = [];

  for (const v of matchedVouchers) {
    if (Number(v.TrangThai) !== 1) {
      return {
        valid: false,
        status: 400,
        message: `Mã voucher "${v.Code}" hiện đã bị tạm dừng hoặc không còn hoạt động`
      };
    }

    const expireDate = new Date(v.NgayHetHan);
    if (isNaN(expireDate.getTime()) || expireDate < now) {
      return {
        valid: false,
        status: 400,
        message: `Mã voucher "${v.Code}" đã hết hạn sử dụng`
      };
    }

    if (Number(v.SoLuong) <= 0) {
      return {
        valid: false,
        status: 400,
        message: `Mã voucher "${v.Code}" đã hết lượt sử dụng`
      };
    }

    const minOrder = Number(v.GiaTriToiThieu) || 0;
    if (safeSubtotal < minOrder) {
      return {
        valid: false,
        status: 400,
        message: `Đơn hàng chưa đạt giá trị tối thiểu ${formatVND(minOrder)} để áp dụng mã "${v.Code}"`
      };
    }

    const group = resolveVoucherGroup(v);
    if (group === 'FreeShip') {
      freeShipList.push(v);
    } else {
      giamGiaDonList.push(v);
    }
  }

  // Quy tắc cốt lõi: Tối đa 01 mã GiamGiaDon và 01 mã FreeShip
  if (giamGiaDonList.length > 1) {
    return {
      valid: false,
      status: 400,
      message: `Chỉ được áp dụng tối đa 01 mã thuộc nhóm Giảm giá đơn hàng (GiamGiaDon). Không thể áp dụng cùng lúc: ${giamGiaDonList
        .map((v) => v.Code)
        .join(', ')}`
    };
  }

  if (freeShipList.length > 1) {
    return {
      valid: false,
      status: 400,
      message: `Chỉ được áp dụng tối đa 01 mã thuộc nhóm Miễn phí vận chuyển (FreeShip). Không thể áp dụng cùng lúc: ${freeShipList
        .map((v) => v.Code)
        .join(', ')}`
    };
  }

  const giamGiaDonRaw = giamGiaDonList[0] || null;
  const freeShipRaw = freeShipList[0] || null;

  const soTienGiamDon = giamGiaDonRaw
    ? computeSingleVoucherDiscount(giamGiaDonRaw, safeSubtotal, safeShip)
    : 0;

  const soTienGiamShip = freeShipRaw
    ? computeSingleVoucherDiscount(freeShipRaw, safeSubtotal, safeShip)
    : 0;

  const appliedVouchers = [];
  let giamGiaDonVoucher = null;
  let freeShipVoucher = null;

  if (giamGiaDonRaw) {
    giamGiaDonVoucher = {
      ...formatVoucherItem(giamGiaDonRaw),
      SoTienGiam: soTienGiamDon
    };
    appliedVouchers.push(giamGiaDonVoucher);
  }

  if (freeShipRaw) {
    freeShipVoucher = {
      ...formatVoucherItem(freeShipRaw),
      SoTienGiam: soTienGiamShip
    };
    appliedVouchers.push(freeShipVoucher);
  }

  const tongTienGiam = soTienGiamDon + soTienGiamShip;
  const tongThanhToan = Math.max(0, safeSubtotal + safeShip - tongTienGiam);

  return {
    valid: true,
    soTienGiamDon,
    soTienGiamShip,
    tongTienGiam,
    tongThanhToan,
    giamGiaDonVoucher,
    freeShipVoucher,
    appliedVouchers
  };
};

/**
 * 1. GET /api/v1/vouchers/active (và GET /api/v1/vouchers)
 * Query danh sách voucher đang kích hoạt (TrangThai = 1, SoLuong > 0, NgayHetHan >= NOW()).
 */
const getActiveVouchers = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         MaVoucher,
         Code,
         NhomVoucher,
         GiaTriGiam,
         LoaiGiam,
         GiamToiDa,
         GiaTriToiThieu,
         SoLuong,
         NgayHetHan,
         TrangThai
       FROM voucher
       WHERE TrangThai = 1
         AND SoLuong > 0
         AND NgayHetHan >= NOW()
       ORDER BY NhomVoucher ASC, GiaTriGiam DESC, MaVoucher DESC`
    );

    const vouchers = rows.map((item, index) => formatVoucherItem(item, index + 1));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách mã giảm giá hoạt động thành công',
      data: vouchers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/v1/vouchers/available
 * Public API trả về danh sách voucher đang kích hoạt (TrangThai = 1, SoLuong > 0, chưa hết hạn)
 * phân nhóm rõ `giamGiaDon` và `freeShip`.
 */
const getAvailableVouchers = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         MaVoucher,
         Code,
         NhomVoucher,
         GiaTriGiam,
         LoaiGiam,
         GiamToiDa,
         GiaTriToiThieu,
         SoLuong,
         NgayHetHan,
         TrangThai
       FROM voucher
       WHERE TrangThai = 1
         AND SoLuong > 0
         AND NgayHetHan >= NOW()
       ORDER BY NhomVoucher ASC, GiaTriGiam DESC, MaVoucher DESC`
    );

    const allVouchers = rows.map((item) => formatVoucherItem(item));
    const giamGiaDon = allVouchers.filter((v) => v.NhomVoucher !== 'FreeShip');
    const freeShip = allVouchers.filter((v) => v.NhomVoucher === 'FreeShip');

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách voucher khả dụng thành công',
      data: {
        giamGiaDon,
        freeShip,
        all: allVouchers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. POST /api/v1/vouchers/apply
 * Áp dụng 01 mã voucher (hỗ trợ cả GiamGiaDon có GiamToiDa và FreeShip)
 */
const applyVoucher = async (req, res, next) => {
  try {
    const { code, orderSubtotal, tongTienHang, phiShip, shippingFee } = req.body;

    if (!code || !String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã giảm giá'
      });
    }

    const rawSubtotal = orderSubtotal !== undefined ? orderSubtotal : tongTienHang;
    const subtotal = Number(rawSubtotal);
    if (rawSubtotal === undefined || rawSubtotal === null || isNaN(subtotal) || subtotal < 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị đơn hàng không hợp lệ'
      });
    }

    const rawShip = phiShip !== undefined ? phiShip : (shippingFee !== undefined ? shippingFee : 0);
    const shipFee = Number(rawShip);
    if (isNaN(shipFee) || shipFee < 0) {
      return res.status(400).json({
        success: false,
        message: 'Phí vận chuyển không hợp lệ'
      });
    }

    const result = await evaluateMultiVouchers(pool, [code], subtotal, shipFee);
    if (!result.valid) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message
      });
    }

    const applied = result.appliedVouchers[0];
    const discountAmount = result.tongTienGiam;
    const finalTotal = Math.max(0, subtotal + shipFee - discountAmount);

    return res.status(200).json({
      success: true,
      message: 'Áp dụng mã giảm giá thành công',
      data: {
        voucher: {
          MaVoucher: applied.MaVoucher,
          Code: applied.Code,
          NhomVoucher: applied.NhomVoucher,
          GiaTriGiam: applied.GiaTriGiam,
          LoaiGiam: applied.LoaiGiam,
          GiamToiDa: applied.GiamToiDa,
          GiaTriToiThieu: applied.GiaTriToiThieu,
          NgayHetHan: applied.NgayHetHan
        },
        discountAmount,
        soTienGiamDon: result.soTienGiamDon,
        soTienGiamShip: result.soTienGiamShip,
        subtotal,
        phiShip: shipFee,
        finalTotal
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. POST /api/v1/vouchers/apply-multi
 * Nhận { codes: ['CODE1', 'CODE2'], tongTienHang, phiShip }.
 * Cho phép áp dụng tối đa 01 mã nhóm GiamGiaDon và 01 mã nhóm FreeShip.
 * Tính soTienGiamDon (giới hạn GiamToiDa) và soTienGiamShip (không vượt quá phiShip và GiamToiDa).
 */
const applyMultiVouchers = async (req, res, next) => {
  try {
    const rawCodes = req.body.codes ?? req.body.voucherCodes ?? req.body.voucher_codes;
    const rawTongTienHang =
      req.body.tongTienHang ?? req.body.orderSubtotal ?? req.body.subtotal;
    const rawPhiShip =
      req.body.phiShip ?? req.body.shippingFee ?? req.body.shipping_fee ?? 0;

    if (!Array.isArray(rawCodes)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp danh sách mã voucher dạng mảng (codes)'
      });
    }

    if (rawTongTienHang === undefined || rawTongTienHang === null || rawTongTienHang === '') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tổng tiền hàng (tongTienHang)'
      });
    }

    const tongTienHang = Number(rawTongTienHang);
    const phiShip = Number(rawPhiShip);

    const evaluation = await evaluateMultiVouchers(pool, rawCodes, tongTienHang, phiShip);
    if (!evaluation.valid) {
      return res.status(evaluation.status || 400).json({
        success: false,
        message: evaluation.message
      });
    }

    return res.status(200).json({
      success: true,
      message:
        evaluation.appliedVouchers.length > 0
          ? 'Áp dụng mã giảm giá thành công'
          : 'Không có mã voucher nào được áp dụng',
      data: {
        tongTienHang,
        phiShip,
        soTienGiamDon: evaluation.soTienGiamDon,
        soTienGiamShip: evaluation.soTienGiamShip,
        tongTienGiam: evaluation.tongTienGiam,
        tongThanhToan: evaluation.tongThanhToan,
        vouchers: {
          giamGiaDon: evaluation.giamGiaDonVoucher,
          freeShip: evaluation.freeShipVoucher
        },
        appliedVouchers: evaluation.appliedVouchers
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveVouchers,
  getAvailableVouchers,
  applyVoucher,
  applyMultiVouchers,
  // Export helpers để orderController tái sử dụng đồng bộ 100% logic tính toán
  resolveVoucherGroup,
  computeSingleVoucherDiscount,
  evaluateMultiVouchers
};
