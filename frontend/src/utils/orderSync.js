const ORDER_SYNC_CHANNEL = 'smartzone_order_sync';
const ORDER_SYNC_STORAGE_KEY = 'smartzone_order_sync_event';

export const ORDER_STATUS = {
  CHO_XAC_NHAN: 'ChoXacNhan',
  DA_XAC_NHAN: 'DaXacNhan',
  DANG_DONG_GOI: 'DangDongGoi',
  DANG_GIAO: 'DangGiao',
  DA_GIAO: 'DaGiao',
  DA_HUY: 'DaHuy',
  YEU_CAU_DOI_TRA: 'YeuCauDoiTra',
  DA_HOAN_TIEN: 'DaHoanTien',
};

const ALIAS_MAP = {
  choxacnhan: ORDER_STATUS.CHO_XAC_NHAN,
  'chờ xác nhận': ORDER_STATUS.CHO_XAC_NHAN,
  'chờ thanh toán': ORDER_STATUS.CHO_XAC_NHAN,
  chothanhtoan: ORDER_STATUS.CHO_XAC_NHAN,
  choduyet: ORDER_STATUS.CHO_XAC_NHAN,

  daxacnhan: ORDER_STATUS.DA_XAC_NHAN,
  'đã xác nhận': ORDER_STATUS.DA_XAC_NHAN,
  'đang xử lý': ORDER_STATUS.DA_XAC_NHAN,
  dangxuly: ORDER_STATUS.DA_XAC_NHAN,

  dangdonggoi: ORDER_STATUS.DANG_DONG_GOI,
  'đang đóng gói': ORDER_STATUS.DANG_DONG_GOI,

  danggiao: ORDER_STATUS.DANG_GIAO,
  'đang giao': ORDER_STATUS.DANG_GIAO,
  'đang giao hàng': ORDER_STATUS.DANG_GIAO,

  dagiao: ORDER_STATUS.DA_GIAO,
  'đã giao': ORDER_STATUS.DA_GIAO,
  'đã hoàn thành': ORDER_STATUS.DA_GIAO,
  hoantat: ORDER_STATUS.DA_GIAO,

  dahuy: ORDER_STATUS.DA_HUY,
  'đã hủy': ORDER_STATUS.DA_HUY,

  yeucaudoitra: ORDER_STATUS.YEU_CAU_DOI_TRA,
  'yêu cầu đổi trả': ORDER_STATUS.YEU_CAU_DOI_TRA,

  dahoantien: ORDER_STATUS.DA_HOAN_TIEN,
  'đã hoàn tiền': ORDER_STATUS.DA_HOAN_TIEN,
};

export const normalizeOrderStatus = (rawStatus) => {
  if (rawStatus === undefined || rawStatus === null) return '';
  const trimmed = String(rawStatus).trim();
  if (!trimmed) return '';
  if (Object.values(ORDER_STATUS).includes(trimmed)) return trimmed;
  return ALIAS_MAP[trimmed.toLowerCase()] || trimmed;
};

export const getOrderStatusDisplayLabel = (rawStatus) => {
  const code = normalizeOrderStatus(rawStatus);
  switch (code) {
    case ORDER_STATUS.CHO_XAC_NHAN:
      return 'Chờ xác nhận';
    case ORDER_STATUS.DA_XAC_NHAN:
      return 'Đã xác nhận';
    case ORDER_STATUS.DANG_DONG_GOI:
      return 'Đang đóng gói';
    case ORDER_STATUS.DANG_GIAO:
      return 'Đang giao hàng';
    case ORDER_STATUS.DA_GIAO:
      return 'Đã giao';
    case ORDER_STATUS.DA_HUY:
      return 'Đã hủy';
    case ORDER_STATUS.YEU_CAU_DOI_TRA:
      return 'Yêu cầu đổi trả';
    case ORDER_STATUS.DA_HOAN_TIEN:
      return 'Đã hoàn tiền';
    default:
      return rawStatus || 'Chờ xác nhận';
  }
};

/**
 * Phát tín hiệu đồng bộ trạng thái đơn hàng giữa các tab/cổng (User <-> Kho <-> Admin)
 */
export const notifyOrderStatusChanged = (payload = {}) => {
  const eventData = {
    type: 'ORDER_STATUS_CHANGED',
    ...payload,
    timestamp: Date.now(),
  };

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(ORDER_SYNC_CHANNEL);
      channel.postMessage(eventData);
      channel.close();
    }
  } catch {
    // Ignore BroadcastChannel errors in restricted browsers
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ORDER_SYNC_STORAGE_KEY, JSON.stringify(eventData));
    }
  } catch {
    // Ignore storage errors (private mode / quota)
  }
};

/**
 * Lắng nghe tín hiệu thay đổi trạng thái đơn hàng từ các tab/cổng khác
 * @returns {Function} cleanup unsubscribe
 */
export const subscribeOrderStatusChanges = (callback) => {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {};
  }

  let channel = null;
  const handleMessage = (event) => {
    const data = event?.data;
    if (data && data.type === 'ORDER_STATUS_CHANGED') {
      callback(data);
    }
  };

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(ORDER_SYNC_CHANNEL);
      channel.addEventListener('message', handleMessage);
    }
  } catch {
    channel = null;
  }

  const handleStorage = (event) => {
    if (event.key !== ORDER_SYNC_STORAGE_KEY || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue);
      if (parsed && parsed.type === 'ORDER_STATUS_CHANGED') {
        callback(parsed);
      }
    } catch {
      // Ignore malformed payload
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (channel) {
      try {
        channel.removeEventListener('message', handleMessage);
        channel.close();
      } catch {
        // Ignore cleanup errors
      }
    }
  };
};

