/**
 * Chuẩn hóa mã trạng thái đơn hàng & kiểm tra luồng chuyển trạng thái 5 bước:
 *   1. 'ChoXacNhan'  (Khách vừa đặt đơn - Bước 1)
 *   2. 'DaXacNhan'   (Admin/Kho xác nhận -> Tab "Chờ đóng gói" của Kho - Bước 2)
 *   3. 'DangDongGoi' (Kho xác nhận đóng gói -> Tab "Sẵn sàng giao" của Kho - Bước 3)
 *   4. 'DangGiao'    (Kho bàn giao Shipper - Bước 4)
 *   5. 'DaGiao'      (Hoàn tất giao hàng - Bước 5)
 */

const ORDER_STATUS = {
  CHO_XAC_NHAN: 'ChoXacNhan',
  DA_XAC_NHAN: 'DaXacNhan',
  DANG_DONG_GOI: 'DangDongGoi',
  DANG_GIAO: 'DangGiao',
  DA_GIAO: 'DaGiao',
  DA_HUY: 'DaHuy',
  YEU_CAU_DOI_TRA: 'YeuCauDoiTra',
  DA_HOAN_TIEN: 'DaHoanTien',
};

const STANDARD_ORDER_FLOW = [
  ORDER_STATUS.CHO_XAC_NHAN,
  ORDER_STATUS.DA_XAC_NHAN,
  ORDER_STATUS.DANG_DONG_GOI,
  ORDER_STATUS.DANG_GIAO,
  ORDER_STATUS.DA_GIAO,
];

const CANCELLABLE_RAW_STATUSES = [
  ORDER_STATUS.CHO_XAC_NHAN,
  'Chờ xác nhận',
  'Chờ thanh toán',
  'ChoThanhToan',
  'ChoDuyet',
];

const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.CHO_XAC_NHAN]: 'Chờ xác nhận',
  [ORDER_STATUS.DA_XAC_NHAN]: 'Đã xác nhận',
  [ORDER_STATUS.DANG_DONG_GOI]: 'Đang đóng gói',
  [ORDER_STATUS.DANG_GIAO]: 'Đang giao hàng',
  [ORDER_STATUS.DA_GIAO]: 'Đã giao',
  [ORDER_STATUS.DA_HUY]: 'Đã hủy',
  [ORDER_STATUS.YEU_CAU_DOI_TRA]: 'Yêu cầu đổi trả',
  [ORDER_STATUS.DA_HOAN_TIEN]: 'Đã hoàn tiền',
};

const ALIAS_MAP = {
  choxacnhan: ORDER_STATUS.CHO_XAC_NHAN,
  'chờ xác nhận': ORDER_STATUS.CHO_XAC_NHAN,
  'cho xac nhan': ORDER_STATUS.CHO_XAC_NHAN,
  chothanhtoan: ORDER_STATUS.CHO_XAC_NHAN,
  'chờ thanh toán': ORDER_STATUS.CHO_XAC_NHAN,
  'cho thanh toan': ORDER_STATUS.CHO_XAC_NHAN,
  choduyet: ORDER_STATUS.CHO_XAC_NHAN,

  daxacnhan: ORDER_STATUS.DA_XAC_NHAN,
  'đã xác nhận': ORDER_STATUS.DA_XAC_NHAN,
  'da xac nhan': ORDER_STATUS.DA_XAC_NHAN,
  'đang xử lý': ORDER_STATUS.DA_XAC_NHAN,
  dangxuly: ORDER_STATUS.DA_XAC_NHAN,

  dangdonggoi: ORDER_STATUS.DANG_DONG_GOI,
  'đang đóng gói': ORDER_STATUS.DANG_DONG_GOI,
  'dang dong goi': ORDER_STATUS.DANG_DONG_GOI,

  danggiao: ORDER_STATUS.DANG_GIAO,
  'đang giao': ORDER_STATUS.DANG_GIAO,
  'đang giao hàng': ORDER_STATUS.DANG_GIAO,
  'dang giao': ORDER_STATUS.DANG_GIAO,

  dagiao: ORDER_STATUS.DA_GIAO,
  'đã giao': ORDER_STATUS.DA_GIAO,
  'da giao': ORDER_STATUS.DA_GIAO,
  'đã hoàn thành': ORDER_STATUS.DA_GIAO,
  hoantat: ORDER_STATUS.DA_GIAO,

  dahuy: ORDER_STATUS.DA_HUY,
  'đã hủy': ORDER_STATUS.DA_HUY,
  'da huy': ORDER_STATUS.DA_HUY,

  yeucaudoitra: ORDER_STATUS.YEU_CAU_DOI_TRA,
  'yêu cầu đổi trả': ORDER_STATUS.YEU_CAU_DOI_TRA,

  dahoantien: ORDER_STATUS.DA_HOAN_TIEN,
  'đã hoàn tiền': ORDER_STATUS.DA_HOAN_TIEN,
};

// Nhóm giá trị lưu trong DB (mã chuẩn + chuỗi cũ) để truy vấn WHERE ... IN (?) tương thích ngược
const STATUS_DB_GROUPS = {
  [ORDER_STATUS.CHO_XAC_NHAN]: [ORDER_STATUS.CHO_XAC_NHAN, 'Chờ xác nhận', 'Chờ thanh toán', 'ChoThanhToan', 'ChoDuyet'],
  [ORDER_STATUS.DA_XAC_NHAN]: [ORDER_STATUS.DA_XAC_NHAN, 'Đã xác nhận', 'Đang xử lý', 'DangXuLy'],
  [ORDER_STATUS.DANG_DONG_GOI]: [ORDER_STATUS.DANG_DONG_GOI, 'Đang đóng gói'],
  [ORDER_STATUS.DANG_GIAO]: [ORDER_STATUS.DANG_GIAO, 'Đang giao', 'Đang giao hàng'],
  [ORDER_STATUS.DA_GIAO]: [ORDER_STATUS.DA_GIAO, 'Đã giao', 'Đã hoàn thành', 'HoanTat'],
  [ORDER_STATUS.DA_HUY]: [ORDER_STATUS.DA_HUY, 'Đã hủy'],
  [ORDER_STATUS.YEU_CAU_DOI_TRA]: [ORDER_STATUS.YEU_CAU_DOI_TRA, 'Yêu cầu đổi trả'],
  [ORDER_STATUS.DA_HOAN_TIEN]: [ORDER_STATUS.DA_HOAN_TIEN, 'Đã hoàn tiền'],
};

const USER_TAB_STATUS_GROUPS = {
  PENDING: STATUS_DB_GROUPS[ORDER_STATUS.CHO_XAC_NHAN],
  PROCESSING: [
    ...STATUS_DB_GROUPS[ORDER_STATUS.DA_XAC_NHAN],
    ...STATUS_DB_GROUPS[ORDER_STATUS.DANG_DONG_GOI],
  ],
  SHIPPING: STATUS_DB_GROUPS[ORDER_STATUS.DANG_GIAO],
  DELIVERED: STATUS_DB_GROUPS[ORDER_STATUS.DA_GIAO],
  RETURN: [
    ...STATUS_DB_GROUPS[ORDER_STATUS.YEU_CAU_DOI_TRA],
    ...STATUS_DB_GROUPS[ORDER_STATUS.DA_HOAN_TIEN],
  ],
  CANCELLED: STATUS_DB_GROUPS[ORDER_STATUS.DA_HUY],
  CANCELED: STATUS_DB_GROUPS[ORDER_STATUS.DA_HUY],
};

// Luật chuyển trạng thái hợp lệ (từng nấc chuẩn, không nhảy cóc)
const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.CHO_XAC_NHAN]: [ORDER_STATUS.DA_XAC_NHAN, ORDER_STATUS.DA_HUY],
  [ORDER_STATUS.DA_XAC_NHAN]: [ORDER_STATUS.DANG_DONG_GOI, ORDER_STATUS.DA_HUY],
  [ORDER_STATUS.DANG_DONG_GOI]: [ORDER_STATUS.DANG_GIAO],
  [ORDER_STATUS.DANG_GIAO]: [ORDER_STATUS.DA_GIAO],
  [ORDER_STATUS.DA_GIAO]: [ORDER_STATUS.YEU_CAU_DOI_TRA],
  [ORDER_STATUS.YEU_CAU_DOI_TRA]: [ORDER_STATUS.DA_HOAN_TIEN, ORDER_STATUS.DA_GIAO],
  [ORDER_STATUS.DA_HOAN_TIEN]: [],
  [ORDER_STATUS.DA_HUY]: [],
};

/**
 * Chuẩn hóa chuỗi trạng thái bất kỳ (code chuẩn hoặc chuỗi tiếng Việt cũ) về mã chuẩn.
 * @param {string} rawStatus
 * @returns {string|null}
 */
const normalizeOrderStatus = (rawStatus) => {
  if (rawStatus === undefined || rawStatus === null) return null;
  const trimmed = String(rawStatus).trim();
  if (!trimmed) return null;
  if (ORDER_STATUS_LABELS[trimmed]) return trimmed;
  return ALIAS_MAP[trimmed.toLowerCase()] || null;
};

/**
 * Kiểm tra việc chuyển từ fromRawStatus sang toRawStatus có hợp lệ theo luồng chuẩn hay không.
 * @param {string} fromRawStatus
 * @param {string} toRawStatus
 */
const canTransitionOrderStatus = (fromRawStatus, toRawStatus) => {
  const fromStatus = normalizeOrderStatus(fromRawStatus);
  const toStatus = normalizeOrderStatus(toRawStatus);

  if (!toStatus) {
    return {
      valid: false,
      fromStatus,
      toStatus: null,
      allowedNextStatuses: fromStatus ? ALLOWED_TRANSITIONS[fromStatus] || [] : [],
      message: `Trạng thái đích '${toRawStatus}' không hợp lệ.`,
    };
  }

  if (!fromStatus) {
    return {
      valid: false,
      fromStatus: null,
      toStatus,
      allowedNextStatuses: [],
      message: `Trạng thái hiện tại '${fromRawStatus}' không hợp lệ.`,
    };
  }

  if (fromStatus === toStatus) {
    return {
      valid: true,
      fromStatus,
      toStatus,
      allowedNextStatuses: ALLOWED_TRANSITIONS[fromStatus] || [],
      message: 'Giữ nguyên trạng thái hiện tại',
    };
  }

  const allowedNextStatuses = ALLOWED_TRANSITIONS[fromStatus] || [];
  const valid = allowedNextStatuses.includes(toStatus);

  if (!valid) {
    const allowedText =
      allowedNextStatuses.length > 0
        ? allowedNextStatuses.join(', ')
        : 'Không thể chuyển tiếp';
    return {
      valid: false,
      fromStatus,
      toStatus,
      allowedNextStatuses,
      message: `Không thể chuyển từ '${fromStatus}' sang '${toStatus}'. Thứ tự chuẩn tiếp theo cho phép: ${allowedText}.`,
    };
  }

  return {
    valid: true,
    fromStatus,
    toStatus,
    allowedNextStatuses,
    message: 'Hợp lệ',
  };
};

/**
 * Lấy nhãn tiếng Việt hiển thị thân thiện cho mã trạng thái.
 * @param {string} rawStatus
 * @returns {string}
 */
const getOrderStatusLabel = (rawStatus) => {
  const normalized = normalizeOrderStatus(rawStatus);
  if (normalized && ORDER_STATUS_LABELS[normalized]) {
    return ORDER_STATUS_LABELS[normalized];
  }
  return rawStatus ? String(rawStatus) : 'Chờ xác nhận';
};

module.exports = {
  ORDER_STATUS,
  STANDARD_ORDER_FLOW,
  CANCELLABLE_RAW_STATUSES,
  ORDER_STATUS_LABELS,
  STATUS_DB_GROUPS,
  USER_TAB_STATUS_GROUPS,
  ALLOWED_TRANSITIONS,
  normalizeOrderStatus,
  canTransitionOrderStatus,
  getOrderStatusLabel,
};

