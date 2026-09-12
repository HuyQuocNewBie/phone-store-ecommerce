import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Toast Component — Hiển thị thông báo ở góc trên bên phải, tự động ẩn sau 3 giây (3000ms).
 *
 * @param {Object} props
 * @param {string} props.message - Nội dung thông báo
 * @param {'success' | 'error' | 'warning' | 'info'} props.type - Loại thông báo
 * @param {number} props.duration - Thời gian hiển thị (ms), mặc định 3000ms (3s)
 * @param {Function} props.onClose - Callback khi đóng Toast
 * @param {boolean} props.show - Trạng thái hiển thị
 */
const Toast = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  show = true,
}) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, onClose]);

  if (!visible || !message) return null;

  // Cấu hình style và icon theo từng loại
  const config = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-slate-900/90 border-emerald-500/40 text-emerald-300',
      iconColor: 'text-emerald-400',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-slate-900/90 border-rose-500/40 text-rose-300',
      iconColor: 'text-rose-400',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-slate-900/90 border-amber-500/40 text-amber-300',
      iconColor: 'text-amber-400',
    },
    info: {
      icon: Info,
      bg: 'bg-slate-900/90 border-sky-500/40 text-sky-300',
      iconColor: 'text-sky-400',
    },
  }[type] || {
    icon: Info,
    bg: 'bg-slate-900/90 border-slate-700 text-slate-200',
    iconColor: 'text-sky-400',
  };

  const IconComponent = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl shadow-black/60 transition-all duration-300 max-w-sm ${config.bg}`}
    >
      <IconComponent className={`w-5 h-5 shrink-0 ${config.iconColor}`} />
      <span className="text-sm font-medium leading-snug">{message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          if (onClose) onClose();
        }}
        className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
        aria-label="Đóng thông báo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
