import React, { useEffect } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

/**
 * DeleteConfirmModal — Modal xác nhận xóa sản phẩm khỏi giỏ hàng.
 * Evondev UI/UX Premium (Light Theme)
 *
 * Props:
 *  - isOpen      {boolean}   : Hiển thị / ẩn modal
 *  - onClose     {function}  : Callback đóng modal (hủy)
 *  - onConfirm   {function}  : Callback xác nhận xóa
 *  - title       {string}    : Tiêu đề modal (mặc định "Xác nhận xóa")
 *  - message     {string}    : Nội dung hỏi xác nhận
 *  - itemCount   {number}    : Số lượng mục sẽ bị xóa (tùy chọn)
 */
const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận xóa',
  message,
  itemCount = 0,
}) => {
  // Khóa scroll nền khi modal mở
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultMessage = itemCount > 1
    ? `Bạn có chắc chắn muốn xóa ${itemCount} sản phẩm đã chọn khỏi giỏ hàng không? Hành động này không thể hoàn tác.`
    : 'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không? Hành động này không thể hoàn tác.';

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* Overlay mờ */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-200">

        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          aria-label="Đóng modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Body */}
        <div className="p-7 flex flex-col items-center text-center gap-5">

          {/* Icon cảnh báo */}
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm">
            <Trash2 className="w-8 h-8" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2
              id="delete-modal-title"
              className="text-lg font-bold text-slate-900 tracking-tight"
            >
              {title}
            </h2>

            {/* Warning badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Không thể hoàn tác sau khi xóa</span>
            </div>
          </div>

          {/* Content */}
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
            {message || defaultMessage}
          </p>

          {/* Action Buttons */}
          <div className="w-full flex items-center gap-3 pt-2">
            {/* Hủy */}
            <button
              type="button"
              id="delete-modal-cancel-btn"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
            >
              Hủy bỏ
            </button>

            {/* Xác nhận xóa */}
            <button
              type="button"
              id="delete-modal-confirm-btn"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xác nhận xóa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
