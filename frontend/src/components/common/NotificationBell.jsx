import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ShoppingBag,
  Boxes,
  RotateCcw,
  Star,
  CheckCheck,
  Trash2,
  X,
  BellOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ─── Cấu hình hiển thị Icon theo LoaiThongBao ─────────────────────────────────
const NOTIFICATION_TYPE_CONFIG = {
  DonHang: {
    icon: ShoppingBag,
    bgClass: 'bg-blue-50 text-blue-600 border-blue-100',
    label: 'Đơn hàng',
  },
  KhoVan: {
    icon: Boxes,
    bgClass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    label: 'Kho vận',
  },
  DoiTra: {
    icon: RotateCcw,
    bgClass: 'bg-rose-50 text-rose-600 border-rose-100',
    label: 'Đổi trả',
  },
  DanhGia: {
    icon: Star,
    bgClass: 'bg-amber-50 text-amber-600 border-amber-100',
    label: 'Đánh giá',
  },
};

const getNotificationTypeConfig = (type) => {
  return (
    NOTIFICATION_TYPE_CONFIG[type] || {
      icon: Bell,
      bgClass: 'bg-slate-100 text-slate-600 border-slate-200',
      label: 'Hệ thống',
    }
  );
};

// ─── Helper Format Thời gian Thông báo ────────────────────────────────────────
const formatNotificationTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec >= 0 && diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin >= 1 && diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour >= 1 && diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay >= 1 && diffDay < 7) return `${diffDay} ngày trước`;

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * NotificationBell — Component Chuông Thông báo dùng chung cho Admin và Nhân viên Kho.
 * - Tự động gọi GET /api/v1/notifications khi mount & polling mỗi 15 giây.
 * - Hiển thị huy hiệu đỏ số lượng chưa đọc (ẩn nếu unreadCount === 0).
 * - Popover danh sách thông báo hỗ trợ đọc từng cái, đọc tất cả, xóa từng cái và xóa tất cả.
 */
const NotificationBell = () => {
  const navigate = useNavigate();
  const popoverRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 1. Fetch danh sách thông báo & unreadCount
  const fetchNotifications = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await api.get('/notifications');
      const payload = res.data || {};
      const list = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.notifications)
        ? payload.notifications
        : [];
      const count =
        typeof payload.unreadCount === 'number'
          ? payload.unreadCount
          : list.filter((item) => Number(item.DaDoc) === 0).length;

      setNotifications(list);
      setUnreadCount(count);
    } catch {
      // Giữ im lặng khi polling nền gặp lỗi
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // 2. Mount & Polling tự động mỗi 15 giây
  useEffect(() => {
    fetchNotifications(true);

    const intervalId = setInterval(() => {
      fetchNotifications(false);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  // 3. Đóng Popover khi click ra ngoài hoặc nhấn phím Escape
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // 4. Mở/đóng Popover (cập nhật dữ liệu mới nhất khi mở)
  const handleToggleOpen = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      fetchNotifications(false);
    }
  };

  // 5. Đánh dấu đã đọc tất cả (PATCH /api/v1/notifications/read-all)
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || actionLoading) return;
    try {
      setActionLoading(true);
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((item) => ({ ...item, DaDoc: 1 })));
      setUnreadCount(0);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Không thể đánh dấu đã đọc tất cả'
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Xóa tất cả thông báo (DELETE /api/v1/notifications)
  const handleDeleteAll = async () => {
    if (notifications.length === 0 || actionLoading) return;
    try {
      setActionLoading(true);
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Không thể xóa tất cả thông báo'
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Xóa riêng 1 thông báo (DELETE /api/v1/notifications/:id)
  const handleDeleteOne = async (event, item) => {
    event.stopPropagation();
    const id = item.MaThongBao;
    if (!id) return;

    try {
      const res = await api.delete(`/notifications/${id}`);
      setNotifications((prev) =>
        prev.filter((n) => n.MaThongBao !== id)
      );
      if (typeof res.data?.unreadCount === 'number') {
        setUnreadCount(res.data.unreadCount);
      } else if (Number(item.DaDoc) === 0) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Không thể xóa thông báo'
      );
    }
  };

  // 8. Click vào 1 thông báo: Gọi PATCH /:id/read, đóng popover và điều hướng tới item.LienKet
  const handleNotificationClick = async (item) => {
    const id = item.MaThongBao;
    const isUnread = Number(item.DaDoc) === 0;

    if (id && isUnread) {
      // Cập nhật lạc quan (optimistic update) trên UI trước
      setNotifications((prev) =>
        prev.map((n) => (n.MaThongBao === id ? { ...n, DaDoc: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        const res = await api.patch(`/notifications/${id}/read`);
        if (typeof res.data?.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
      } catch {
        // Bỏ qua lỗi để không cản trở điều hướng
      }
    }

    setOpen(false);
    if (item.LienKet) {
      navigate(item.LienKet);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* ── Nút Chuông Thông báo ── */}
      <button
        id="btn-notifications"
        type="button"
        onClick={handleToggleOpen}
        aria-label="Thông báo"
        aria-expanded={open}
        className={`
          relative p-2.5
          rounded-xl border transition-all duration-200 cursor-pointer
          ${
            open
              ? 'bg-blue-50 text-blue-600 border-blue-300 shadow-2xs'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50'
          }
        `}
      >
        <Bell className="w-4 h-4" />

        {/* Huy hiệu đỏ số lượng chưa đọc (Ẩn nếu unreadCount === 0) */}
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="
              absolute -top-1.5 -right-1.5
              min-w-[18px] h-[18px] px-1
              bg-rose-500 text-white
              text-[10px] font-bold leading-none
              rounded-full flex items-center justify-center
              ring-2 ring-white shadow-xs
            "
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Popover Danh sách Thông báo ── */}
      {open && (
        <div
          role="dialog"
          aria-label="Danh sách thông báo"
          className="
            absolute right-0 mt-2.5
            w-[340px] sm:w-[400px]
            bg-white border border-slate-200
            rounded-2xl shadow-xl shadow-slate-900/10
            z-50 overflow-hidden
          "
        >
          {/* Header Popover */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200/80 rounded-full">
                    {unreadCount} chưa đọc
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0 || actionLoading}
                  title="Đánh dấu đã đọc tất cả"
                  className="
                    inline-flex items-center gap-1 px-2 py-1 rounded-lg
                    text-[11px] font-semibold
                    text-blue-600 hover:bg-blue-50
                    disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed
                    transition-colors cursor-pointer
                  "
                >
                  <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Đánh dấu đã đọc tất cả</span>
                </button>

                <span className="text-slate-200 select-none">|</span>

                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={notifications.length === 0 || actionLoading}
                  title="Xóa tất cả thông báo"
                  className="
                    inline-flex items-center gap-1 px-2 py-1 rounded-lg
                    text-[11px] font-semibold
                    text-rose-600 hover:bg-rose-50
                    disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed
                    transition-colors cursor-pointer
                  "
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Xóa tất cả</span>
                </button>
              </div>
            </div>
          </div>

          {/* Body: Danh sách thông báo */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-slate-400">
                Đang tải thông báo...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
                  <BellOff className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Không có thông báo nào
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Các cập nhật mới về đơn hàng và kho vận sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = Number(item.DaDoc) === 0;
                const typeCfg = getNotificationTypeConfig(item.LoaiThongBao);
                const TypeIcon = typeCfg.icon;

                return (
                  <div
                    key={item.MaThongBao}
                    onClick={() => handleNotificationClick(item)}
                    className={`
                      group relative flex items-start gap-3 px-4 py-3
                      transition-colors duration-150 cursor-pointer
                      ${
                        isUnread
                          ? 'bg-blue-50/40 hover:bg-blue-50/80'
                          : 'bg-white hover:bg-slate-50'
                      }
                    `}
                  >
                    {/* Icon phân loại */}
                    <div
                      className={`
                        w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5
                        ${typeCfg.bgClass}
                      `}
                    >
                      <TypeIcon className="w-4 h-4" />
                    </div>

                    {/* Nội dung chính: TieuDe, NoiDung, Thời gian */}
                    <div className="flex-1 min-w-0 pr-1">
                      <p
                        className={`text-xs leading-snug break-words ${
                          isUnread
                            ? 'font-bold text-slate-900'
                            : 'font-semibold text-slate-700'
                        }`}
                      >
                        {item.TieuDe}
                      </p>

                      {item.NoiDung && (
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2 break-words">
                          {item.NoiDung}
                        </p>
                      )}

                      <p className="text-[11px] text-slate-400 mt-1 font-medium">
                        {formatNotificationTime(item.NgayTao)}
                      </p>
                    </div>

                    {/* Bên phải: Chấm tròn xanh (nếu DaDoc === 0) + Nút × xóa riêng */}
                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      {isUnread && (
                        <span
                          title="Chưa đọc"
                          className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"
                        />
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeleteOne(e, item)}
                        title="Xóa thông báo này"
                        aria-label="Xóa thông báo"
                        className="
                          w-6 h-6 rounded-lg
                          flex items-center justify-center
                          text-slate-400 hover:text-rose-600 hover:bg-rose-50
                          transition-colors cursor-pointer text-sm font-bold leading-none
                        "
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
