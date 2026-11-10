import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { formatOrderCode, formatVND, formatDateTime } from '../../utils/formatters';

/* ─── Tabs Trạng Thái Đơn Hàng ────────────────────────────────────────────── */
const ORDER_TABS = [
  { id: 'ALL',        label: 'Tất cả',       icon: 'receipt_long' },
  { id: 'PENDING',    label: 'Chờ xác nhận', icon: 'schedule' },
  { id: 'PROCESSING', label: 'Đang xử lý',   icon: 'inventory_2' },
  { id: 'SHIPPING',   label: 'Đang giao',    icon: 'local_shipping' },
  { id: 'DELIVERED',  label: 'Hoàn thành',   icon: 'task_alt' },
  { id: 'RETURN',     label: 'Đổi trả',      icon: 'assignment_return' },
  { id: 'CANCELLED',  label: 'Đã hủy',       icon: 'cancel' },
];

/* ─── 5 Bước Stepper Timeline Theo TrangThaiDonHang ──────────────────────── */
const TIMELINE_STEPS = [
  { step: 1, label: 'Đặt hàng',       subLabel: 'Đã tạo đơn',      icon: 'receipt_long' },
  { step: 2, label: 'Đã xác nhận',    subLabel: 'Đã duyệt đơn',    icon: 'verified' },
  { step: 3, label: 'Đang đóng gói',  subLabel: 'Kho xử lý',       icon: 'inventory_2' },
  { step: 4, label: 'Đang giao hàng', subLabel: 'Đang vận chuyển', icon: 'local_shipping' },
  { step: 5, label: 'Hoàn tất',       subLabel: 'Giao thành công', icon: 'task_alt' },
];

/* ─── Lý Do Đổi Trả / Bảo Hành ───────────────────────────────────────────── */
const RETURN_REASONS = [
  'Sản phẩm bị lỗi kỹ thuật / Không hoạt động',
  'Sản phẩm bị trầy xước, móp méo khi nhận hàng',
  'Giao sai mẫu mã / Màu sắc / Dung lượng',
  'Thiếu phụ kiện hoặc quà tặng kèm theo',
  'Lỗi màn hình / Pin / Phần mềm cần bảo hành',
  'Lý do khác',
];

const MAX_RETURN_PROOF_FILES = 5;
const MAX_RETURN_PROOF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ORDERS_PER_PAGE = 5;

const getVisiblePageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-end', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, 'ellipsis-start', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, 'ellipsis-start', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages];
};

/* ─── Status Helpers ─────────────────────────────────────────────────────── */
const isOrderCancellable = (status) =>
  ['Chờ xác nhận', 'ChoXacNhan', 'Chờ thanh toán', 'ChoThanhToan'].includes(status);

const isOrderDelivered = (status) =>
  ['DaGiao', 'Đã giao', 'Đã hoàn thành', 'HoanTat'].includes(status);

const canRequestReturn = (status) =>
  status === 'DaGiao' || status === 'Đã giao';

const isOrderCancelled = (status) =>
  status === 'Đã hủy' || status === 'DaHuy';

const getTabKeyForStatus = (status) => {
  if (['Chờ xác nhận', 'ChoXacNhan', 'Chờ thanh toán', 'ChoThanhToan'].includes(status)) {
    return 'PENDING';
  }
  if (['Đang xử lý', 'DangXuLy', 'DaXacNhan', 'Đã xác nhận', 'DangDongGoi', 'Đang đóng gói'].includes(status)) {
    return 'PROCESSING';
  }
  if (['Đang giao', 'DangGiao', 'Đang giao hàng'].includes(status)) {
    return 'SHIPPING';
  }
  if (['Đã giao', 'DaGiao', 'Đã hoàn thành', 'HoanTat'].includes(status)) {
    return 'DELIVERED';
  }
  if (['YeuCauDoiTra', 'Yêu cầu đổi trả', 'DaHoanTien', 'Đã hoàn tiền'].includes(status)) {
    return 'RETURN';
  }
  if (['Đã hủy', 'DaHuy'].includes(status)) {
    return 'CANCELLED';
  }
  return 'ALL';
};

const getTimelineProgress = (status) => {
  if (isOrderCancelled(status)) {
    return {
      step: 1,
      isCancelled: true,
      isCompleted: false,
      hint: 'Đơn hàng đã bị hủy',
    };
  }
  if (['Chờ thanh toán', 'ChoThanhToan'].includes(status)) {
    return {
      step: 1,
      isCancelled: false,
      isCompleted: false,
      hint: 'Đơn hàng đã được tạo, đang chờ thanh toán',
    };
  }
  if (['Chờ xác nhận', 'ChoXacNhan', 'ChoDuyet'].includes(status)) {
    return {
      step: 1,
      isCancelled: false,
      isCompleted: false,
      hint: 'Đơn hàng đã đặt thành công, đang chờ cửa hàng xác nhận',
    };
  }
  if (['DaXacNhan', 'Đã xác nhận', 'Đang xử lý', 'DangXuLy'].includes(status)) {
    return {
      step: 2,
      isCancelled: false,
      isCompleted: false,
      hint: 'Đơn hàng đã được xác nhận và chuyển sang bộ phận kho',
    };
  }
  if (['DangDongGoi', 'Đang đóng gói'].includes(status)) {
    return {
      step: 3,
      isCancelled: false,
      isCompleted: false,
      hint: 'Nhân viên kho đang kiểm tra và đóng gói kiện hàng',
    };
  }
  if (['DangGiao', 'Đang giao', 'Đang giao hàng'].includes(status)) {
    return {
      step: 4,
      isCancelled: false,
      isCompleted: false,
      hint: 'Kiện hàng đã bàn giao cho đơn vị vận chuyển và đang trên đường đến bạn',
    };
  }
  if (['DaGiao', 'Đã giao', 'Đã hoàn thành', 'HoanTat'].includes(status)) {
    return {
      step: 5,
      isCancelled: false,
      isCompleted: true,
      hint: 'Đơn hàng đã được giao thành công và hoàn tất',
    };
  }
  if (['YeuCauDoiTra', 'Yêu cầu đổi trả'].includes(status)) {
    return {
      step: 5,
      isCancelled: false,
      isCompleted: true,
      returnStatus: 'YeuCauDoiTra',
      hint: 'Đơn hàng đã giao — đang xử lý yêu cầu Đổi trả / Bảo hành',
    };
  }
  if (['DaHoanTien', 'Đã hoàn tiền'].includes(status)) {
    return {
      step: 5,
      isCancelled: false,
      isCompleted: true,
      returnStatus: 'DaHoanTien',
      hint: 'Đơn hàng đã được phê duyệt đổi trả và hoàn tiền thành công',
    };
  }
  return {
    step: 1,
    isCancelled: false,
    isCompleted: false,
    hint: 'Đang cập nhật tiến độ đơn hàng',
  };
};

/* ─── Status Info Helper ─────────────────────────────────────────────────── */
const getStatusInfo = (status) => {
  switch (status) {
    case 'Chờ xác nhận':
    case 'ChoXacNhan':
      return {
        label: 'Chờ xác nhận',
        icon: 'schedule',
        badgeClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
        dotClass: 'bg-amber-500 animate-pulse',
      };
    case 'Chờ thanh toán':
    case 'ChoThanhToan':
      return {
        label: 'Chờ thanh toán',
        icon: 'credit_card',
        badgeClass: 'bg-purple-500/10 text-purple-600 border border-purple-500/20',
        dotClass: 'bg-purple-500 animate-pulse',
      };
    case 'DaXacNhan':
    case 'Đã xác nhận':
      return {
        label: 'Đã xác nhận',
        icon: 'verified',
        badgeClass: 'bg-cyan-500/10 text-cyan-700 border border-cyan-500/20',
        dotClass: 'bg-cyan-500 animate-pulse',
      };
    case 'Đang xử lý':
    case 'DangXuLy':
      return {
        label: 'Đang xử lý',
        icon: 'inventory_2',
        badgeClass: 'bg-sky-500/10 text-sky-600 border border-sky-500/20',
        dotClass: 'bg-sky-500 animate-pulse',
      };
    case 'DangDongGoi':
    case 'Đang đóng gói':
      return {
        label: 'Đang đóng gói',
        icon: 'inventory_2',
        badgeClass: 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20',
        dotClass: 'bg-indigo-500 animate-pulse',
      };
    case 'Đang giao':
    case 'DangGiao':
    case 'Đang giao hàng':
      return {
        label: 'Đang giao hàng',
        icon: 'local_shipping',
        badgeClass: 'bg-primary-container/10 text-primary border border-primary/20',
        dotClass: 'bg-primary animate-pulse',
      };
    case 'Đã giao':
    case 'DaGiao':
    case 'Đã hoàn thành':
    case 'HoanTat':
      return {
        label: 'Hoàn tất',
        icon: 'task_alt',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20',
        dotClass: 'bg-emerald-500',
      };
    case 'YeuCauDoiTra':
    case 'Yêu cầu đổi trả':
      return {
        label: 'Yêu cầu đổi trả',
        icon: 'assignment_return',
        badgeClass: 'bg-orange-500/10 text-orange-700 border border-orange-500/25',
        dotClass: 'bg-orange-500 animate-pulse',
      };
    case 'DaHoanTien':
    case 'Đã hoàn tiền':
      return {
        label: 'Đã hoàn tiền',
        icon: 'currency_exchange',
        badgeClass: 'bg-teal-500/10 text-teal-700 border border-teal-500/25',
        dotClass: 'bg-teal-500',
      };
    case 'Đã hủy':
    case 'DaHuy':
      return {
        label: 'Đã hủy',
        icon: 'cancel',
        badgeClass: 'bg-error-container/20 text-error border border-error/20',
        dotClass: 'bg-error',
      };
    default:
      return {
        label: status || 'Chờ cập nhật',
        icon: 'receipt_long',
        badgeClass: 'bg-surface-container text-on-surface-variant border border-outline/20',
        dotClass: 'bg-outline',
      };
  }
};

/* ─── OrderTimelineStepper (5 Bước Trực Quan) ────────────────────────────── */
const OrderTimelineStepper = ({ status }) => {
  const { step: currentStep, isCancelled, isCompleted, returnStatus, hint } = getTimelineProgress(status);
  const progressPercent = isCancelled ? 0 : Math.min(100, Math.max(0, ((currentStep - 1) / 4) * 100));

  return (
    <div className="rounded-2xl border border-surface-container bg-surface-container-low/70 p-4 sm:p-5">
      {/* Top Status Hint */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isCancelled
                ? 'bg-error'
                : isCompleted
                ? 'bg-emerald-500'
                : 'bg-primary animate-pulse'
            }`}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
            Tiến trình đơn hàng
          </span>
        </div>
        <p
          className={`text-xs font-medium ${
            isCancelled
              ? 'text-error'
              : returnStatus === 'YeuCauDoiTra'
              ? 'text-orange-700'
              : returnStatus === 'DaHoanTien'
              ? 'text-teal-700'
              : isCompleted
              ? 'text-emerald-700'
              : 'text-primary'
          }`}
        >
          {hint}
        </p>
      </div>

      {isCancelled ? (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-error-container/20 border border-error/20 text-error">
          <div className="w-9 h-9 rounded-full bg-error text-on-error flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg leading-none">cancel</span>
          </div>
          <div>
            <p className="text-sm font-bold">Đơn hàng đã hủy</p>
            <p className="text-xs opacity-90">Đơn hàng đã dừng xử lý tại bước đặt hàng.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop / Tablet Horizontal 5-Step Stepper */}
          <div className="hidden sm:block relative pt-1 pb-1">
            {/* Connector Track */}
            <div
              className="absolute top-6 left-[10%] right-[10%] h-1 bg-surface-container-highest rounded-full overflow-hidden"
              aria-hidden="true"
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-primary-container'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-5 gap-2 relative z-10">
              {TIMELINE_STEPS.map((item) => {
                const isDone = item.step < currentStep || (currentStep === 5 && item.step === 5);
                const isCurrent = item.step === currentStep && currentStep < 5;

                return (
                  <div key={item.step} className="flex flex-col items-center text-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isDone
                          ? isCompleted
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                            : 'bg-primary text-on-primary shadow-sm shadow-primary/25'
                          : isCurrent
                          ? 'bg-primary text-on-primary ring-4 ring-primary/20 shadow-md scale-110'
                          : 'bg-surface-container-lowest text-outline border-2 border-outline-variant/60'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-lg leading-none"
                        style={{ fontVariationSettings: isDone || isCurrent ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {isDone && item.step < 5 ? 'check' : item.icon}
                      </span>
                    </div>

                    <span
                      className={`mt-2.5 text-xs font-bold leading-tight ${
                        isDone
                          ? isCompleted
                            ? 'text-emerald-700'
                            : 'text-on-surface'
                          : isCurrent
                          ? 'text-primary'
                          : 'text-outline'
                      }`}
                    >
                      {item.step}. {item.label}
                    </span>

                    <span
                      className={`mt-0.5 text-[11px] leading-tight ${
                        isCurrent ? 'text-primary font-semibold' : 'text-on-surface-variant/80'
                      }`}
                    >
                      {item.subLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Vertical 5-Step Stepper */}
          <div className="sm:hidden space-y-3">
            {TIMELINE_STEPS.map((item, idx) => {
              const isDone = item.step < currentStep || (currentStep === 5 && item.step === 5);
              const isCurrent = item.step === currentStep && currentStep < 5;
              const isLast = idx === TIMELINE_STEPS.length - 1;

              return (
                <div key={item.step} className="flex items-start gap-3 relative">
                  {!isLast && (
                    <div
                      className={`absolute left-4 top-9 bottom-[-12px] w-0.5 ${
                        item.step < currentStep
                          ? isCompleted
                            ? 'bg-emerald-500'
                            : 'bg-primary'
                          : 'bg-surface-container-highest'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 relative z-10 ${
                      isDone
                        ? isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-primary text-on-primary'
                        : isCurrent
                        ? 'bg-primary text-on-primary ring-4 ring-primary/20'
                        : 'bg-surface-container-lowest text-outline border border-outline-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base leading-none">
                      {isDone && item.step < 5 ? 'check' : item.icon}
                    </span>
                  </div>
                  <div className="pt-0.5">
                    <p
                      className={`text-xs font-bold ${
                        isCurrent ? 'text-primary' : isDone ? 'text-on-surface' : 'text-outline'
                      }`}
                    >
                      {item.step}. {item.label}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">{item.subLabel}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Return / Refund Status Callout */}
      {returnStatus === 'YeuCauDoiTra' && (
        <div className="mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-800 text-xs flex items-center gap-2.5">
          <span className="material-symbols-outlined text-lg leading-none text-orange-600 shrink-0">
            assignment_return
          </span>
          <span>
            <strong>Yêu cầu Đổi trả / Bảo hành đã được tiếp nhận.</strong> Nhân viên kho đang tiến hành kiểm định sản phẩm và ảnh minh họa của bạn.
          </span>
        </div>
      )}

      {returnStatus === 'DaHoanTien' && (
        <div className="mt-4 p-3 rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-800 text-xs flex items-center gap-2.5">
          <span className="material-symbols-outlined text-lg leading-none text-teal-600 shrink-0">
            currency_exchange
          </span>
          <span>
            <strong>Đã phê duyệt hoàn tiền.</strong> Yêu cầu đổi trả / bảo hành của bạn đã được Admin xác nhận hoàn tất.
          </span>
        </div>
      )}
    </div>
  );
};

/* ─── ReviewModal ────────────────────────────────────────────────────────── */
const ReviewModal = ({ isOpen, onClose, order, onSubmitSuccess }) => {
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickTags = [
    'Chất lượng tuyệt vời',
    'Đúng như mô tả',
    'Đóng gói cẩn thận',
    'Giao hàng nhanh',
    'Nhân viên thân thiện',
    'Giá cả hợp lý',
  ];

  const ratingDescriptions = {
    1: 'Rất tệ - Không hài lòng',
    2: 'Tệ - Cần cải thiện nhiều',
    3: 'Bình thường - Tạm ổn',
    4: 'Hài lòng - Sản phẩm tốt',
    5: 'Tuyệt vời - Rất hài lòng',
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedRating(5);
      setHoverRating(0);
      setComment('');
      setSelectedTags([]);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;
  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const currentDisplayRating = hoverRating || selectedRating;
  const items = order.ChiTietDonHang || order.chitietdonhang || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success('Cảm ơn bạn đã gửi đánh giá sản phẩm!');
      if (onSubmitSuccess) onSubmitSuccess(order.MaDonHang);
      onClose();
    } catch {
      toast.error('Có lỗi xảy ra. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-container">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-tertiary-container bg-tertiary-fixed/40 px-2.5 py-0.5 rounded-full mb-1">
              <span className="material-symbols-outlined text-xs leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              Đánh giá đơn hàng #{formatOrderCode(order.MaDonHang, order.NgayMuaHang)}
            </span>
            <h3 className="font-title-card text-title-card font-bold text-on-surface">Chia sẻ trải nghiệm của bạn</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Products */}
          <div className="bg-surface-container-low rounded-2xl p-3 space-y-2">
            <p className="font-label-spec text-label-spec text-on-surface-variant font-semibold uppercase">
              Sản phẩm trong đơn:
            </p>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-surface-container-lowest border border-surface-container overflow-hidden shrink-0 flex items-center justify-center p-1">
                  {item.Anh ? (
                    <img
                      src={item.Anh}
                      alt={item.TenSanPham || 'Sản phẩm'}
                      className="w-full h-full object-contain"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-outline text-lg">phone_iphone</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-body-md text-body-md font-semibold text-on-surface truncate">
                    {item.TenSanPham}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    <span className="text-outline">Màu:</span> <span className="font-medium text-on-surface">{item.MauSac || 'N/A'}</span>
                    <span className="mx-1 text-outline">·</span>
                    <span className="text-outline">Dung lượng:</span> <span className="font-medium text-on-surface">{item.DungLuong || 'N/A'}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Star Rating */}
          <div className="text-center py-2 space-y-2">
            <p className="font-label-spec text-label-spec uppercase tracking-wider text-outline font-semibold">
              Mức độ hài lòng
            </p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 focus:outline-none transition-transform hover:scale-125 active:scale-95 text-3xl"
                >
                  <span
                    className={`material-symbols-outlined leading-none ${
                      star <= currentDisplayRating
                        ? 'text-tertiary-container'
                        : 'text-outline/40 hover:text-outline'
                    }`}
                    style={{ fontVariationSettings: star <= currentDisplayRating ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
            <p className="font-body-sm text-body-sm font-semibold text-tertiary-container h-5">
              {ratingDescriptions[currentDisplayRating]}
            </p>
          </div>

          {/* Quick Tags */}
          <div className="space-y-2">
            <p className="font-body-sm text-body-sm text-on-surface-variant font-medium">
              Chọn nhanh điểm nổi bật:
            </p>
            <div className="flex flex-wrap gap-2">
              {quickTags.map((tag) => {
                const isSel = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSel
                        ? 'bg-primary-container text-on-primary-container shadow-sm'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {isSel ? '✓ ' : '+ '}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="font-body-sm text-body-sm text-on-surface-variant font-medium flex justify-between">
              <span>Đánh giá chi tiết:</span>
              <span className="font-label-spec text-label-spec text-outline">{comment.length}/500</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Chia sẻ trải nghiệm sử dụng thực tế, tốc độ giao hàng, thái độ phục vụ..."
              className="w-full border border-surface-container bg-surface-container-low rounded-xl p-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-surface-container flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl font-body-md text-body-md font-semibold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-body-md text-body-md font-bold text-on-primary bg-primary hover:bg-primary-container transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Đang gửi...</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-base leading-none">send</span>
                <span>Gửi đánh giá</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── CancelOrderConfirmModal ────────────────────────────────────────────── */
const CancelOrderConfirmModal = ({ isOpen, onClose, order, onConfirm, isCancelling }) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-md bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-error-container/30 border border-error/20 flex items-center justify-center shrink-0 text-error">
            <span className="material-symbols-outlined text-2xl leading-none">warning</span>
          </div>
          <div className="flex-1">
            <h3 className="font-title-card text-title-card font-bold text-on-surface">Xác nhận hủy đơn hàng</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Bạn có chắc chắn muốn hủy đơn hàng <strong className="text-on-surface font-mono">#{formatOrderCode(order.MaDonHang, order.NgayMuaHang)}</strong> không?
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isCancelling}
            className="p-1.5 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>

        {/* Order Brief Info */}
        <div className="mt-5 p-4 rounded-2xl bg-surface-container-low text-body-sm space-y-2">
          <div className="flex justify-between text-on-surface-variant">
            <span>Mã đơn hàng:</span>
            <span className="font-bold text-on-surface font-mono">#{formatOrderCode(order.MaDonHang, order.NgayMuaHang)}</span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span>Ngày đặt:</span>
            <span className="text-on-surface">{formatDateTime(order.NgayMuaHang)}</span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span>Tổng thanh toán:</span>
            <span className="font-bold text-primary">{formatVND(order.TongTien)}</span>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-base leading-none text-amber-600 shrink-0">schedule</span>
          <span>Số lượng tồn kho và voucher (nếu có) sẽ được tự động hoàn lại ngay lập tức.</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="px-5 py-2.5 rounded-xl font-body-md text-body-md font-semibold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            Giữ lại đơn
          </button>
          <button
            type="button"
            onClick={() => onConfirm(order.MaDonHang)}
            disabled={isCancelling}
            className="px-5 py-2.5 rounded-xl font-body-md text-body-md font-bold text-on-error bg-error hover:opacity-90 shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isCancelling ? (
              <span>Đang xử lý...</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-base leading-none">cancel</span>
                <span>Xác nhận hủy đơn</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── ReturnRequestModal (Modal Yêu Cầu Đổi Trả / Bảo Hành) ───────────────── */
const ReturnRequestModal = ({ isOpen, onClose, order, onSubmitSuccess }) => {
  const items = useMemo(
    () => (order ? order.ChiTietDonHang || order.chitietdonhang || [] : []),
    [order]
  );

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedReason, setSelectedReason] = useState(RETURN_REASONS[0]);
  const [description, setDescription] = useState('');
  const [proofImages, setProofImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef(null);
  const imagesRef = useRef([]);

  const revokeAllPreviews = useCallback((list) => {
    list.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }, []);

  useEffect(() => {
    imagesRef.current = proofImages;
  }, [proofImages]);

  useEffect(() => {
    return () => {
      revokeAllPreviews(imagesRef.current);
    };
  }, [revokeAllPreviews]);

  useEffect(() => {
    if (isOpen && order) {
      const firstItem = items[0];
      setSelectedProductId(firstItem?.MaSanPham ? String(firstItem.MaSanPham) : '');
      setSelectedReason(RETURN_REASONS[0]);
      setDescription('');
      setFormError('');
      setIsSubmitting(false);
      setProofImages((prev) => {
        revokeAllPreviews(prev);
        return [];
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, order, items, revokeAllPreviews]);

  if (!isOpen || !order) return null;

  const handleFilesSelected = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    setFormError('');
    const currentCount = proofImages.length;
    const remainingSlots = MAX_RETURN_PROOF_FILES - currentCount;

    if (remainingSlots <= 0) {
      toast.error(`Bạn chỉ có thể chọn tối đa ${MAX_RETURN_PROOF_FILES} ảnh minh họa.`);
      return;
    }

    const validToAdd = [];
    for (const file of incoming) {
      if (validToAdd.length >= remainingSlots) {
        toast.error(`Chỉ chọn tối đa ${MAX_RETURN_PROOF_FILES} ảnh minh họa lỗi.`);
        break;
      }
      if (!file.type || !file.type.startsWith('image/')) {
        toast.error(`File "${file.name}" không phải định dạng ảnh hợp lệ.`);
        continue;
      }
      if (file.size > MAX_RETURN_PROOF_SIZE_BYTES) {
        toast.error(`Ảnh "${file.name}" vượt quá giới hạn 10MB.`);
        continue;
      }
      validToAdd.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (validToAdd.length > 0) {
      setProofImages((prev) => [...prev, ...validToAdd]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imageId) => {
    setProofImages((prev) => {
      const target = prev.find((img) => img.id === imageId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((img) => img.id !== imageId);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedReason) {
      const msg = 'Vui lòng chọn lý do đổi trả / bảo hành.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    const trimmedDesc = description.trim();
    if (selectedReason === 'Lý do khác' && !trimmedDesc) {
      const msg = 'Vui lòng nhập mô tả chi tiết cho lý do đổi trả.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (proofImages.length === 0) {
      const msg = 'Vui lòng chọn ít nhất 1 ảnh minh họa tình trạng lỗi.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    const finalLyDo =
      selectedReason === 'Lý do khác'
        ? trimmedDesc
        : trimmedDesc
        ? `${selectedReason} — ${trimmedDesc}`
        : selectedReason;

    const formData = new FormData();
    formData.append('maDonHang', String(order.MaDonHang));
    if (selectedProductId) {
      formData.append('maSanPham', String(selectedProductId));
    }
    formData.append('lyDo', finalLyDo);
    proofImages.forEach((img) => {
      formData.append('hinhAnhProof', img.file);
    });

    setIsSubmitting(true);
    try {
      const res = await api.post('/user/returns', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      if (res.data?.success) {
        toast.success(res.data?.message || 'Gửi yêu cầu đổi trả thành công!');
        revokeAllPreviews(proofImages);
        setProofImages([]);
        if (onSubmitSuccess) {
          onSubmitSuccess(order.MaDonHang, res.data.data);
        }
        onClose();
      } else {
        const msg = res.data?.message || 'Không thể gửi yêu cầu đổi trả.';
        setFormError(msg);
        toast.error(msg);
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        'Gửi yêu cầu đổi trả thất bại. Vui lòng thử lại!';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-request-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="relative w-full max-w-xl bg-surface-container-lowest border border-surface-container rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-container flex items-center justify-between bg-gradient-to-r from-orange-50 via-surface-container-lowest to-surface-container-low shrink-0">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-500/15 border border-orange-500/20 px-2.5 py-0.5 rounded-full mb-1.5">
              <span className="material-symbols-outlined text-sm leading-none">assignment_return</span>
              Đơn hàng #{formatOrderCode(order.MaDonHang, order.NgayMuaHang)}
            </span>
            <h3
              id="return-request-modal-title"
              className="font-title-card text-title-card font-bold text-on-surface"
            >
              Yêu cầu Đổi trả / Bảo hành
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng modal yêu cầu đổi trả"
            className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-xl leading-none">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            {/* 1. Chọn sản phẩm trong đơn */}
            {items.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Sản phẩm cần đổi trả / bảo hành
                </label>
                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const itemProdId = String(item.MaSanPham || '');
                    const isChecked = selectedProductId === itemProdId;
                    return (
                      <label
                        key={item.MaChiTietDonHang || idx}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'border-primary bg-primary-fixed/25 shadow-xs'
                            : 'border-surface-container bg-surface-container-low/60 hover:bg-surface-container-low'
                        }`}
                      >
                        <input
                          type="radio"
                          name="returnProductId"
                          value={itemProdId}
                          checked={isChecked}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                          disabled={isSubmitting}
                          className="accent-primary w-4 h-4 shrink-0"
                        />
                        <div className="w-12 h-12 rounded-xl bg-surface-container-lowest border border-surface-container p-1 shrink-0 flex items-center justify-center">
                          {item.Anh ? (
                            <img
                              src={item.Anh}
                              alt={item.TenSanPham || 'Sản phẩm'}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="material-symbols-outlined text-outline text-lg">
                              phone_iphone
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-on-surface truncate">
                            {item.TenSanPham || 'Sản phẩm SmartZone'}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {item.MauSac || 'Tiêu chuẩn'} · {item.DungLuong || 'Tiêu chuẩn'} · SL: x{item.SoLuong}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-primary shrink-0">
                          {formatVND(item.TongGia || item.DonGia * item.SoLuong)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Chọn lý do đổi trả */}
            <div className="space-y-2">
              <label
                htmlFor="return-reason-select"
                className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Lý do đổi trả / bảo hành <span className="text-error">*</span>
              </label>
              <select
                id="return-reason-select"
                value={selectedReason}
                onChange={(e) => {
                  setSelectedReason(e.target.value);
                  setFormError('');
                }}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              >
                {RETURN_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Mô tả chi tiết */}
            <div className="space-y-2">
              <label
                htmlFor="return-description-input"
                className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-on-surface-variant"
              >
                <span>
                  Mô tả chi tiết tình trạng lỗi{' '}
                  {selectedReason === 'Lý do khác' && <span className="text-error">*</span>}
                </span>
                <span className="text-[11px] font-normal text-outline">
                  {description.length}/500
                </span>
              </label>
              <textarea
                id="return-description-input"
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value.slice(0, 500));
                  setFormError('');
                }}
                disabled={isSubmitting}
                placeholder="Mô tả rõ tình trạng sản phẩm (ví dụ: không lên nguồn, nứt góc màn hình, giao nhầm màu...) để bộ phận kho kiểm định nhanh hơn."
                className="w-full border border-outline-variant/60 bg-surface-container-low/50 rounded-xl p-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest focus:border-primary transition-all resize-none"
              />
            </div>

            {/* 4. Chọn ảnh minh họa lỗi */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Ảnh minh họa lỗi <span className="text-error">*</span>
                </label>
                <span className="text-xs font-semibold text-outline">
                  {proofImages.length}/{MAX_RETURN_PROOF_FILES} ảnh (tối đa 10MB/ảnh)
                </span>
              </div>

              {/* Drop / Select Zone */}
              {proofImages.length < MAX_RETURN_PROOF_FILES && (
                <div
                  onClick={() => !isSubmitting && fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isSubmitting) {
                      handleFilesSelected(e.dataTransfer.files);
                    }
                  }}
                  className="border-2 border-dashed border-primary/35 hover:border-primary bg-primary-fixed/15 hover:bg-primary-fixed/25 rounded-2xl p-5 text-center cursor-pointer transition-all group"
                >
                  <div className="w-11 h-11 mx-auto mb-2 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl leading-none">
                      add_photo_alternate
                    </span>
                  </div>
                  <p className="text-sm font-bold text-on-surface">
                    Bấm để chọn ảnh hoặc kéo thả vào đây
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Hỗ trợ JPG, PNG, WEBP — Chụp rõ tem/vết lỗi hoặc phụ kiện kèm theo
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFilesSelected(e.target.files)}
                disabled={isSubmitting}
                className="hidden"
              />

              {/* Image Previews */}
              {proofImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-1">
                  {proofImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className="relative aspect-square rounded-xl border border-surface-container bg-surface-container-low overflow-hidden group shadow-xs"
                    >
                      <img
                        src={img.previewUrl}
                        alt={`Ảnh minh họa ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        disabled={isSubmitting}
                        title="Xóa ảnh này"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/75 hover:bg-error text-white flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-sm leading-none">
                          close
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-error-container/25 border border-error/25 text-error text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-base leading-none shrink-0">
                  error
                </span>
                <span>{formError}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-surface-container bg-surface-container-low/60 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl font-body-md text-body-md font-semibold text-on-surface-variant hover:text-on-surface bg-surface-container-lowest border border-surface-container hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl font-body-md text-body-md font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Đang gửi yêu cầu...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base leading-none">send</span>
                  <span>Gửi yêu cầu đổi trả</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* ─── EmptyOrderState ────────────────────────────────────────────────────── */
const EmptyOrderState = ({ activeTab }) => {
  const currentTab = ORDER_TABS.find((t) => t.id === activeTab);
  const tabLabel = currentTab ? currentTab.label : 'mục này';

  return (
    <div className="bg-surface-container-lowest rounded-3xl shadow-sm p-unit-xl flex flex-col items-center justify-center text-center py-unit-3xl border border-surface-container/50">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary mb-unit-sm shadow-sm">
        <span className="material-symbols-outlined text-3xl">inbox</span>
      </div>
      <h3 className="font-title-card text-title-card text-on-surface font-bold mb-unit-2xs">
        Không có đơn hàng nào
      </h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mb-unit-md">
        {activeTab === 'ALL'
          ? 'Bạn chưa có đơn hàng nào trong tài khoản. Hãy khám phá ngay các sản phẩm công nghệ chính hãng mới nhất tại SmartZone!'
          : `Hiện tại bạn không có đơn hàng nào ở trạng thái "${tabLabel}".`}
      </p>
      {activeTab === 'ALL' && (
        <Link
          to="/products"
          className="inline-flex items-center gap-unit-xs px-unit-lg py-unit-xs bg-primary text-on-primary font-body-md text-body-md font-bold rounded-xl hover:bg-primary-container transition-all shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined leading-none">storefront</span>
          <span>Mua sắm ngay</span>
          <span className="material-symbols-outlined leading-none">arrow_forward</span>
        </Link>
      )}
    </div>
  );
};

/* ─── Main Component: OrderHistoryPage ───────────────────────────────────── */
const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTabParam = (searchParams.get('tab') || 'ALL').toUpperCase();
  const validTab = ORDER_TABS.some((t) => t.id === currentTabParam) ? currentTabParam : 'ALL';

  const [activeTab, setActiveTab] = useState(validTab);
  const [orders, setOrders] = useState([]);
  const [allOrdersForCounts, setAllOrdersForCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [returnTargetOrder, setReturnTargetOrder] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [reorderingOrderId, setReorderingOrderId] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [cancelTargetOrder, setCancelTargetOrder] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const spotlightRef = useRef(null);
  const historySectionRef = useRef(null);
  const shouldScrollToSpotlightRef = useRef(false);

  useEffect(() => {
    setActiveTab(validTab);
    setCurrentPage(1);
  }, [validTab]);

  /* ── 1. Fetch Toàn Bộ Danh Sách Đơn Hàng (Đồng bộ mọi trạng thái Kho & Đổi trả) ── */
  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await api.get('/orders', { params: { tab: 'ALL' } });
      if (res.data?.success) {
        const fetchedList = res.data.data || [];
        setOrders(fetchedList);
        setAllOrdersForCounts(fetchedList);
      } else if (!silent) {
        setOrders([]);
        setAllOrdersForCounts([]);
      }
    } catch (error) {
      if (!silent) {
        toast.error(error.response?.data?.message || 'Không thể tải danh sách đơn hàng. Vui lòng thử lại!');
        setOrders([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Tự động đồng bộ lại trạng thái khi User quay lại tab trình duyệt (nhảy nấc theo thao tác Kho)
  useEffect(() => {
    const handleWindowFocus = () => {
      fetchOrders({ silent: true });
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [fetchOrders]);

  // Khóa cuộn body khi có bất kỳ modal nào đang mở
  useEffect(() => {
    const hasOpenModal = !!(returnTargetOrder || reviewOrder || cancelTargetOrder);
    document.body.style.overflow = hasOpenModal ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [returnTargetOrder, reviewOrder, cancelTargetOrder]);

  // Đóng modal trên cùng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (returnTargetOrder) {
        setReturnTargetOrder(null);
      } else if (cancelTargetOrder && !isCancelling) {
        setCancelTargetOrder(null);
      } else if (reviewOrder) {
        setReviewOrder(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [returnTargetOrder, cancelTargetOrder, isCancelling, reviewOrder]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(tabId === 'ALL' ? {} : { tab: tabId.toLowerCase() });
    setSelectedOrderId(null); // Reset Spotlight để tự động hiển thị đơn hàng đầu tiên của tab mới
    setCurrentPage(1);
  };

  /* ── 2. Tab Counts Calculation ── */
  const tabCounts = useMemo(() => {
    const counts = {
      ALL: allOrdersForCounts.length,
      PENDING: 0,
      PROCESSING: 0,
      SHIPPING: 0,
      DELIVERED: 0,
      RETURN: 0,
      CANCELLED: 0,
    };
    allOrdersForCounts.forEach((o) => {
      const key = getTabKeyForStatus(o.TrangThaiDonHang);
      if (key && counts[key] !== undefined && key !== 'ALL') {
        counts[key]++;
      }
    });
    return counts;
  }, [allOrdersForCounts]);

  /* ── 3. Lọc đơn hàng theo Tab ── */
  const tabOrders = useMemo(() => {
    if (activeTab === 'ALL') return orders;
    return orders.filter((o) => getTabKeyForStatus(o.TrangThaiDonHang) === activeTab);
  }, [orders, activeTab]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return tabOrders;
    const q = searchQuery.toLowerCase().trim();
    return tabOrders.filter((order) => {
      const orderCode = formatOrderCode(order.MaDonHang, order.NgayMuaHang).toLowerCase();
      if (String(order.MaDonHang).includes(q) || orderCode.includes(q)) return true;
      const items = order.ChiTietDonHang || order.chitietdonhang || [];
      return items.some((it) => it.TenSanPham?.toLowerCase().includes(q));
    });
  }, [tabOrders, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedOrders = useMemo(() => {
    const startIdx = (currentPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(startIdx, startIdx + ORDERS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) return;
    setCurrentPage(nextPage);
    historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── 4. Đơn hàng đang được chọn hiển thị trong Spotlight Card ── */
  const currentFeaturedOrder = useMemo(() => {
    if (!isSpotlightOpen || filteredOrders.length === 0) return null;
    if (selectedOrderId) {
      const found = filteredOrders.find((o) => o.MaDonHang === selectedOrderId);
      if (found) return found;
    }
    return filteredOrders[0];
  }, [isSpotlightOpen, filteredOrders, selectedOrderId]);

  useEffect(() => {
    if (isSpotlightOpen && currentFeaturedOrder && shouldScrollToSpotlightRef.current) {
      shouldScrollToSpotlightRef.current = false;
      spotlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isSpotlightOpen, currentFeaturedOrder]);

  /* ── 5. Sao chép mã đơn ── */
  const handleCopyOrderCode = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    toast.success(`Đã sao chép mã đơn: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  /* ── 6. Xem chi tiết & Đóng Spotlight Card ── */
  const handleViewDetail = (order) => {
    shouldScrollToSpotlightRef.current = true;
    setSelectedOrderId(order.MaDonHang);
    setIsSpotlightOpen(true);
    if (spotlightRef.current) {
      shouldScrollToSpotlightRef.current = false;
      spotlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCloseSpotlight = () => {
    shouldScrollToSpotlightRef.current = false;
    setIsSpotlightOpen(false);
    setSelectedOrderId(null);
  };

  /* ── 7. Mua lại đơn hàng ── */
  const handleReorder = async (orderId) => {
    setReorderingOrderId(orderId);
    try {
      const res = await api.post(`/orders/${orderId}/reorder`);
      if (res.data?.success) {
        await fetchCart();
        toast.success('Đã thêm toàn bộ sản phẩm vào giỏ hàng thành công!');
        setTimeout(() => navigate('/cart'), 500);
      } else {
        toast.error(res.data?.message || 'Không thể mua lại đơn hàng này.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sản phẩm hiện không khả dụng để mua lại.');
    } finally {
      setReorderingOrderId(null);
    }
  };

  /* ── 9. Hủy đơn hàng ── */
  const handleCancelOrder = async (orderId) => {
    setIsCancelling(true);
    try {
      const res = await api.post(`/orders/${orderId}/cancel`);
      if (res.data?.success) {
        toast.success('Hủy đơn hàng thành công!');
        setCancelTargetOrder(null);
        handleSelectTab('CANCELLED');
        await fetchOrders({ silent: true });
      } else {
        toast.error(res.data?.message || 'Không thể hủy đơn hàng này.');
      }
    } catch (error) {
      console.error('Lỗi khi hủy đơn hàng:', error);
      toast.error(error.response?.data?.message || 'Hủy đơn hàng thất bại. Vui lòng thử lại!');
    } finally {
      setIsCancelling(false);
    }
  };

  /* ── 9. Callback sau khi gửi Yêu cầu Đổi trả thành công ── */
  const handleReturnSuccess = async (orderId) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.MaDonHang === orderId ? { ...o, TrangThaiDonHang: 'YeuCauDoiTra' } : o
      )
    );
    setAllOrdersForCounts((prev) =>
      prev.map((o) =>
        o.MaDonHang === orderId ? { ...o, TrangThaiDonHang: 'YeuCauDoiTra' } : o
      )
    );

    if (activeTab === 'DELIVERED') {
      setActiveTab('RETURN');
      setSearchParams({ tab: 'return' });
    }
    setSelectedOrderId(orderId);

    await fetchOrders({ silent: true });
  };

  const featuredItems = currentFeaturedOrder?.ChiTietDonHang || currentFeaturedOrder?.chitietdonhang || [];
  const featuredSubtotal = featuredItems.reduce(
    (acc, it) => acc + Number(it.DonGia || 0) * Number(it.SoLuong || 0),
    0
  );
  const featuredStatusInfo = currentFeaturedOrder ? getStatusInfo(currentFeaturedOrder.TrangThaiDonHang) : null;

  return (
    <>
      {/* ── Order History Content (content-only, layout managed by AccountLayout) ── */}
      <div className="flex flex-col gap-unit-xl">

        {/* Status Filter Tabs */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-1.5 border border-surface-container/60">
          <div className="flex flex-wrap items-center gap-1.5">
            {ORDER_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tabCounts[tab.id] || 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`flex-auto justify-center px-3 py-2 rounded-xl text-[13px] leading-5 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                      : 'text-on-surface-variant font-medium hover:text-on-surface hover:bg-surface-container'
                  }`}
                  type="button"
                >
                  {isActive && (
                    <span className="material-symbols-outlined text-[16px] leading-none">
                      {tab.icon}
                    </span>
                  )}
                  <span>{tab.label}</span>
                  {isActive ? (
                    <span className="px-1.5 py-0.5 bg-on-primary-container text-primary-container text-[11px] leading-none font-bold rounded-full">
                      {count}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-outline/90">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="bg-surface-container-lowest rounded-3xl p-unit-lg shadow-sm animate-pulse space-y-4"
              >
                <div className="flex justify-between items-center pb-4 border-b border-surface-container">
                  <div className="h-6 bg-surface-container rounded-lg w-48" />
                  <div className="h-6 bg-surface-container rounded-full w-28" />
                </div>
                <div className="flex gap-4 items-center py-3">
                  <div className="w-16 h-16 bg-surface-container rounded-2xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-surface-container rounded-md w-3/4" />
                    <div className="h-3 bg-surface-container rounded-md w-1/3" />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-surface-container">
                  <div className="h-4 bg-surface-container rounded-md w-40" />
                  <div className="h-8 bg-surface-container rounded-xl w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyOrderState activeTab={activeTab} />
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════════
                ACTIVE TRACKING ORDER CARD (FEATURED SPOTLIGHT)
            ══════════════════════════════════════════════════════════════ */}
            {currentFeaturedOrder && (
              <article
                ref={spotlightRef}
                className="bg-surface-container-lowest rounded-3xl shadow-sm overflow-hidden flex flex-col border border-surface-container/50 scroll-mt-24"
              >
                {/* Order Spotlight Header */}
                <div className="bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-high p-unit-lg flex flex-col md:flex-row md:items-center justify-between gap-unit-md">
                  <div className="flex flex-col gap-unit-2xs">
                    <div className="flex flex-wrap items-center gap-unit-sm">
                      <h1 className="font-headline-sm text-headline-sm text-on-surface font-extrabold tracking-tight">
                        #{formatOrderCode(currentFeaturedOrder.MaDonHang, currentFeaturedOrder.NgayMuaHang)}
                      </h1>
                      <button
                        className="text-outline hover:text-primary transition-colors flex items-center p-1 rounded-lg"
                        title="Sao chép mã đơn"
                        type="button"
                        onClick={() => handleCopyOrderCode(formatOrderCode(currentFeaturedOrder.MaDonHang, currentFeaturedOrder.NgayMuaHang))}
                      >
                        <span className="material-symbols-outlined text-base leading-none">
                          {copiedCode === formatOrderCode(currentFeaturedOrder.MaDonHang, currentFeaturedOrder.NgayMuaHang)
                            ? 'check'
                            : 'content_copy'}
                        </span>
                      </button>
                    </div>
                    <div className="flex items-center gap-unit-md font-body-sm text-body-sm text-on-surface-variant">
                      <span className="flex items-center gap-unit-2xs">
                        <span className="material-symbols-outlined text-sm leading-none">calendar_month</span>
                        Ngày đặt: <strong>{formatDateTime(currentFeaturedOrder.NgayMuaHang)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                    {/* Tracking Status Badge */}
                    <div className={`flex items-center gap-unit-sm px-unit-md py-unit-xs rounded-2xl shadow-sm ${featuredStatusInfo?.badgeClass || 'bg-primary text-on-primary'}`}>
                      <span className="material-symbols-outlined text-2xl leading-none">
                        {featuredStatusInfo?.icon || 'local_shipping'}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-label-spec text-label-spec opacity-90 uppercase tracking-wide">
                          Trạng thái đơn hàng
                        </span>
                        <span className="font-title-card text-title-card font-bold leading-none uppercase">
                          {featuredStatusInfo?.label || currentFeaturedOrder.TrangThaiDonHang}
                        </span>
                      </div>
                    </div>

                    {/* Nút đóng thẻ Spotlight */}
                    <button
                      type="button"
                      onClick={handleCloseSpotlight}
                      title="Đóng chi tiết đơn hàng"
                      aria-label="Đóng chi tiết đơn hàng"
                      className="w-8 h-8 rounded-full text-on-surface-variant/65 hover:text-on-surface hover:bg-surface-container-highest/60 transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-lg leading-none">close</span>
                    </button>
                  </div>
                </div>

                {/* Stepper Timeline 5 bước trực quan ngay trên Spotlight */}
                <div className="px-unit-lg pt-unit-lg bg-surface-container-lowest">
                  <OrderTimelineStepper status={currentFeaturedOrder.TrangThaiDonHang} />
                </div>

                {/* Danh Sách Sản Phẩm Trong Kiện Hàng */}
                <div className="p-unit-lg bg-surface-container-lowest flex flex-col gap-unit-md">
                  <h3 className="font-title-card text-title-card text-on-surface font-bold">
                    Sản phẩm trong kiện hàng ({featuredItems.length} món)
                  </h3>
                  <div className="flex flex-col gap-unit-sm">
                    {featuredItems.map((item, idx) => (
                      <div
                        key={item.MaChiTietDonHang || idx}
                        className="p-unit-md bg-surface-container-low rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-unit-md transition-all hover:bg-surface-container"
                      >
                        <div className="flex items-center gap-unit-md min-w-0">
                          <div className="w-20 h-20 bg-surface-container-lowest rounded-xl p-2 shrink-0 flex items-center justify-center shadow-sm">
                            {item.Anh ? (
                              <img
                                className="h-full w-auto object-contain"
                                src={item.Anh}
                                alt={item.TenSanPham || 'Sản phẩm'}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <span className="material-symbols-outlined text-outline text-3xl">phone_iphone</span>
                            )}
                          </div>
                          <div className="flex flex-col gap-unit-2xs min-w-0">
                            <Link
                              to={item.MaSanPham ? `/products/${item.MaSanPham}` : '#'}
                              className="font-title-card text-title-card font-bold text-on-surface hover:text-primary transition-colors line-clamp-1"
                            >
                              {item.TenSanPham || 'Sản phẩm SmartZone'}
                            </Link>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              <span className="text-outline">Màu:</span> <span className="font-medium text-on-surface">{item.MauSac || 'N/A'}</span>
                              <span className="mx-1 text-outline">·</span>
                              <span className="text-outline">Dung lượng:</span> <span className="font-medium text-on-surface">{item.DungLuong || 'N/A'}</span>
                              <span className="mx-1 text-outline">·</span>
                              <span className="text-outline">Số lượng:</span> <strong className="font-medium text-on-surface">x{item.SoLuong}</strong>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col md:items-end justify-between self-end md:self-center shrink-0">
                          <div className="text-right">
                            <span className="font-price-hero text-price-hero text-primary font-extrabold tracking-tight">
                              {formatVND(item.TongGia || item.DonGia * item.SoLuong)}
                            </span>
                            {item.SoLuong > 1 && (
                              <span className="block font-body-sm text-body-sm text-outline">
                                Đơn giá: {formatVND(item.DonGia)}/sp
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dual Panel: Địa Chỉ Giao Hàng & Chi Tiết Thanh Toán */}
                <div className="p-unit-lg bg-surface-container flex flex-col gap-unit-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter-desktop">

                    {/* Khối Địa Chỉ Giao Hàng */}
                    <div className="bg-surface-container-lowest p-unit-lg rounded-2xl shadow-sm flex flex-col gap-unit-sm">
                      <div className="flex items-center gap-unit-xs text-primary">
                        <span className="material-symbols-outlined leading-none">home_pin</span>
                        <h4 className="font-title-card text-title-card font-bold text-on-surface">
                          Địa chỉ giao hàng
                        </h4>
                      </div>
                      <div className="flex flex-col gap-unit-2xs font-body-md text-body-md">
                        <div className="flex items-center gap-unit-sm">
                          <strong className="text-on-surface font-bold text-body-lg">
                            {currentFeaturedOrder.TenNguoiNhan || user?.HoTen || 'Khách hàng'}
                          </strong>
                          <span className="text-outline">|</span>
                          <span className="text-on-surface-variant font-semibold">
                            {currentFeaturedOrder.SoDienThoai || user?.SoDienThoai || 'Chưa có SĐT'}
                          </span>
                        </div>
                        <p className="text-on-surface leading-relaxed mt-unit-2xs">
                          {currentFeaturedOrder.DiaChiGiaoHang || 'Địa chỉ giao hàng'}
                        </p>
                        {currentFeaturedOrder.GhiChu && (
                          <div className="mt-unit-xs p-unit-xs bg-surface-container-low rounded-lg text-on-surface-variant font-body-sm text-body-sm flex items-start gap-unit-2xs">
                            <span className="material-symbols-outlined text-sm leading-tight text-outline">info</span>
                            <span>Ghi chú: {currentFeaturedOrder.GhiChu}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Khối Chi Tiết Thanh Toán */}
                    <div className="bg-surface-container-lowest p-unit-lg rounded-2xl shadow-sm flex flex-col justify-between gap-unit-md">
                      <div className="flex flex-col gap-unit-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-unit-xs text-primary">
                            <span className="material-symbols-outlined leading-none">account_balance_wallet</span>
                            <h4 className="font-title-card text-title-card font-bold text-on-surface">
                              Chi tiết thanh toán
                            </h4>
                          </div>
                          <span className="px-unit-xs py-0.5 bg-secondary-fixed text-on-secondary-fixed-variant font-label-spec text-label-spec rounded-full font-bold flex items-center gap-unit-2xs">
                            <span className="material-symbols-outlined text-xs leading-none">check_circle</span>
                            {currentFeaturedOrder.PhuongThucThanhToan || 'Đã xác nhận'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-unit-2xs font-body-md text-body-md">
                          <div className="flex justify-between text-on-surface-variant">
                            <span>Tổng tiền hàng ({featuredItems.length} sản phẩm):</span>
                            <span className="font-semibold text-on-surface">{formatVND(featuredSubtotal)}</span>
                          </div>
                          <div className="flex justify-between text-on-surface-variant">
                            <span>Phí giao hàng:</span>
                            <span className={`font-semibold ${Number(currentFeaturedOrder.PhiShip) === 0 ? 'text-secondary' : 'text-on-surface'}`}>
                              {Number(currentFeaturedOrder.PhiShip) === 0 ? 'Miễn phí' : formatVND(currentFeaturedOrder.PhiShip)}
                            </span>
                          </div>
                          <div className="flex justify-between text-tertiary-container font-semibold">
                            <span>Voucher:</span>
                            <span>{Number(currentFeaturedOrder.SoTienGiam) > 0 ? `-${formatVND(currentFeaturedOrder.SoTienGiam)}` : '0đ'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-unit-sm border-t-0 flex items-baseline justify-between bg-surface-container-low p-unit-sm rounded-xl">
                        <span className="font-title-card text-title-card font-bold text-on-surface">Tổng số tiền thực trả:</span>
                        <div className="text-right">
                          <span className="font-price-hero text-price-hero text-primary font-extrabold">
                            {formatVND(currentFeaturedOrder.TongTien)}
                          </span>
                          <span className="block font-body-sm text-body-sm text-outline">Đã bao gồm thuế GTGT (VAT)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Utility Action Bar Under Current Order */}
                  <div className="flex flex-wrap items-center justify-between gap-unit-md pt-unit-xs">
                    <div className="flex flex-wrap items-center gap-unit-sm">
                      {/* Hủy đơn khi Chờ xác nhận hoặc Chờ thanh toán */}
                      {isOrderCancellable(currentFeaturedOrder.TrangThaiDonHang) && (
                        <button
                          type="button"
                          onClick={() => setCancelTargetOrder(currentFeaturedOrder)}
                          className="px-unit-md py-unit-xs bg-error-container/20 text-error hover:bg-error-container/40 rounded-xl font-body-md text-body-md font-semibold flex items-center gap-unit-xs transition-colors shadow-sm"
                        >
                          <span className="material-symbols-outlined leading-none">cancel</span>
                          Hủy đơn hàng
                        </button>
                      )}

                      {/* Nút Yêu cầu Đổi trả / Bảo hành khi đơn đã giao (DaGiao / Đã giao) */}
                      {canRequestReturn(currentFeaturedOrder.TrangThaiDonHang) && (
                        <button
                          type="button"
                          onClick={() => setReturnTargetOrder(currentFeaturedOrder)}
                          className="px-unit-md py-unit-xs bg-orange-500/15 hover:bg-orange-500/25 text-orange-700 border border-orange-500/30 rounded-xl font-body-md text-body-md font-bold flex items-center gap-unit-xs transition-colors shadow-sm"
                        >
                          <span className="material-symbols-outlined leading-none">assignment_return</span>
                          Yêu cầu Đổi trả / Bảo hành
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-unit-sm ml-auto">
                      {/* Đánh giá & Mua lại khi Đã giao */}
                      {isOrderDelivered(currentFeaturedOrder.TrangThaiDonHang) && (
                        <>
                          <button
                            type="button"
                            onClick={() => setReviewOrder(currentFeaturedOrder)}
                            className="px-unit-md py-unit-xs bg-surface-container-lowest hover:bg-surface-container-high text-on-surface rounded-xl font-body-md text-body-md font-semibold flex items-center gap-unit-xs transition-colors shadow-sm"
                          >
                            <span className="material-symbols-outlined text-tertiary-container leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                              star
                            </span>
                            Đánh giá
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(currentFeaturedOrder.MaDonHang)}
                            disabled={reorderingOrderId === currentFeaturedOrder.MaDonHang}
                            className="px-unit-lg py-unit-xs bg-primary text-on-primary font-body-md text-body-md font-bold rounded-xl hover:bg-primary-container transition-all shadow-sm flex items-center gap-unit-xs"
                          >
                            <span className="material-symbols-outlined leading-none">replay</span>
                            {reorderingOrderId === currentFeaturedOrder.MaDonHang ? 'Đang thêm...' : 'Mua lại'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* ══════════════════════════════════════════════════════════════
                PREVIOUS COMPLETED ORDERS SECTION (Lọc theo các Tab trạng thái phía trên)
            ══════════════════════════════════════════════════════════════ */}
            <section
              ref={historySectionRef}
              className={`flex flex-col gap-unit-md scroll-mt-24 ${currentFeaturedOrder ? 'mt-unit-lg' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-unit-xs">
                  <span className="material-symbols-outlined text-on-surface leading-none">history</span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
                    Lịch sử đơn hàng trước đây
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {totalPages > 1
                      ? `Trang ${currentPage}/${totalPages} · Tổng số ${filteredOrders.length} đơn hàng`
                      : `Tổng số ${filteredOrders.length} đơn hàng`}
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchOrders({ silent: true })}
                    disabled={refreshing || loading}
                    title="Cập nhật trạng thái đơn hàng mới nhất"
                    className="px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container hover:border-primary/40 hover:text-primary text-xs font-semibold text-on-surface-variant transition-colors flex items-center gap-1 shadow-2xs disabled:opacity-50"
                  >
                    <span
                      className={`material-symbols-outlined text-sm leading-none ${
                        refreshing ? 'animate-spin text-primary' : ''
                      }`}
                    >
                      refresh
                    </span>
                    <span>Cập nhật</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-unit-md">
                {paginatedOrders.map((order) => {
                  const orderItems = order.ChiTietDonHang || order.chitietdonhang || [];
                  const status = getStatusInfo(order.TrangThaiDonHang);
                  const isSelected = currentFeaturedOrder?.MaDonHang === order.MaDonHang;

                  return (
                    <article
                      key={order.MaDonHang}
                      className={`bg-surface-container-lowest rounded-2xl shadow-sm p-unit-lg flex flex-col gap-unit-md transition-all hover:shadow-md border ${
                        isSelected ? 'border-primary shadow-md' : 'border-surface-container/50'
                      }`}
                    >
                      {/* Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-unit-xs pb-unit-sm bg-surface-container-low/50 p-unit-sm rounded-xl">
                        <div className="flex flex-wrap items-center gap-unit-sm">
                          <span className="font-title-card text-title-card font-bold text-on-surface font-mono">
                            #{formatOrderCode(order.MaDonHang, order.NgayMuaHang)}
                          </span>
                          <span className="text-outline hidden sm:inline">•</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Ngày đặt: {formatDateTime(order.NgayMuaHang)}
                          </span>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary font-label-spec text-label-spec rounded font-bold uppercase">
                              <span>Đang hiển thị kiện hàng</span>
                              <button
                                type="button"
                                onClick={handleCloseSpotlight}
                                title="Đóng thẻ chi tiết ở trên"
                                aria-label="Đóng thẻ chi tiết ở trên"
                                className="rounded-full hover:bg-primary/20 p-0.5 transition-colors flex items-center"
                              >
                                <span className="material-symbols-outlined text-xs leading-none">close</span>
                              </button>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-unit-xs">
                          <span className={`px-unit-sm py-1 rounded-full font-label-spec text-label-spec font-bold flex items-center gap-unit-2xs uppercase ${status.badgeClass}`}>
                            <span className="material-symbols-outlined text-xs leading-none">
                              {status.icon}
                            </span>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {/* Danh Sách Sản Phẩm Tóm Tắt */}
                      <div className="flex flex-col gap-unit-sm py-unit-xs divide-y divide-surface-container-low">
                        {orderItems.map((it, idx) => (
                          <div
                            key={it.MaChiTietDonHang || idx}
                            className="flex flex-col md:flex-row md:items-center justify-between gap-unit-md pt-unit-xs first:pt-0"
                          >
                            <div className="flex items-center gap-unit-md min-w-0">
                              <div className="w-16 h-16 bg-surface-container-low rounded-xl p-2 shrink-0 flex items-center justify-center">
                                {it.Anh ? (
                                  <img
                                    className="h-full w-auto object-contain"
                                    src={it.Anh}
                                    alt={it.TenSanPham || 'Sản phẩm'}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  <span className="material-symbols-outlined text-outline text-2xl">phone_iphone</span>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <h3 className="font-title-card text-title-card font-bold text-on-surface line-clamp-1">
                                  {it.TenSanPham || 'Sản phẩm SmartZone'}
                                </h3>
                                <p className="text-xs text-on-surface-variant mt-0.5">
                                  <span className="text-outline">Màu:</span> <span className="font-medium text-on-surface">{it.MauSac || 'N/A'}</span>
                                  <span className="mx-1 text-outline">·</span>
                                  <span className="text-outline">Dung lượng:</span> <span className="font-medium text-on-surface">{it.DungLuong || 'N/A'}</span>
                                  <span className="mx-1 text-outline">·</span>
                                  <span className="text-outline">Số lượng:</span> <strong className="font-medium text-on-surface">x{it.SoLuong}</strong>
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col md:items-end justify-between self-end md:self-center shrink-0">
                              <div className="text-right">
                                <span className="font-price-regular text-price-regular text-on-surface font-bold">
                                  {formatVND(it.TongGia || it.DonGia * it.SoLuong)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-unit-sm pt-unit-sm border-t border-surface-container-low">
                        <div className="flex items-center gap-unit-xs text-on-surface-variant font-body-sm text-body-sm">
                          <span>Tổng thanh toán:</span>
                          <span className="font-title-card text-title-card font-bold text-primary">
                            {formatVND(order.TongTien)}
                          </span>
                        </div>

                        <div className="flex items-center gap-unit-sm flex-wrap">
                          {/* Xem chi tiết (Đưa đơn lên Spotlight & cuộn lên xem Timeline + chi tiết) */}
                          <button
                            type="button"
                            onClick={() => handleViewDetail(order)}
                            className="px-unit-md py-unit-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body-md text-body-md font-semibold rounded-xl transition-colors flex items-center gap-unit-2xs shadow-sm"
                          >
                            <span className="material-symbols-outlined text-base leading-none text-primary">receipt_long</span>
                            Xem chi tiết
                          </button>

                          {/* Hủy đơn khi Chờ xác nhận hoặc Chờ thanh toán */}
                          {isOrderCancellable(order.TrangThaiDonHang) && (
                            <button
                              type="button"
                              onClick={() => setCancelTargetOrder(order)}
                              className="px-unit-md py-unit-xs bg-error-container/20 text-error hover:bg-error-container/40 rounded-xl font-body-md text-body-md font-semibold flex items-center gap-unit-2xs transition-colors shadow-sm"
                            >
                              <span className="material-symbols-outlined text-base leading-none">cancel</span>
                              Hủy đơn
                            </button>
                          )}

                          {/* Yêu cầu Đổi trả / Bảo hành khi đơn đã giao */}
                          {canRequestReturn(order.TrangThaiDonHang) && (
                            <button
                              type="button"
                              onClick={() => setReturnTargetOrder(order)}
                              className="px-unit-md py-unit-xs bg-orange-500/15 hover:bg-orange-500/25 text-orange-700 border border-orange-500/30 font-body-md text-body-md font-bold rounded-xl transition-colors flex items-center gap-unit-2xs shadow-xs"
                            >
                              <span className="material-symbols-outlined text-base leading-none">assignment_return</span>
                              Yêu cầu Đổi trả / Bảo hành
                            </button>
                          )}

                          {/* Đánh giá khi Đã giao */}
                          {isOrderDelivered(order.TrangThaiDonHang) && (
                            <button
                              type="button"
                              onClick={() => setReviewOrder(order)}
                              className="px-unit-md py-unit-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body-md text-body-md font-semibold rounded-xl transition-colors flex items-center gap-unit-2xs"
                            >
                              <span className="material-symbols-outlined text-base leading-none text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                                star
                              </span>
                              Đánh giá
                            </button>
                          )}

                          {/* Mua lại khi Đã giao */}
                          {isOrderDelivered(order.TrangThaiDonHang) && (
                            <button
                              type="button"
                              onClick={() => handleReorder(order.MaDonHang)}
                              disabled={reorderingOrderId === order.MaDonHang}
                              className="px-unit-md py-unit-xs bg-primary text-on-primary font-body-md text-body-md font-bold rounded-xl hover:bg-primary-container transition-all flex items-center gap-unit-2xs shadow-sm"
                            >
                              <span className="material-symbols-outlined text-base leading-none">replay</span>
                              {reorderingOrderId === order.MaDonHang ? 'Đang thêm...' : 'Mua lại'}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Phân Trang (Pagination) */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-unit-sm pt-unit-sm">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Hiển thị {(currentPage - 1) * ORDERS_PER_PAGE + 1}–{Math.min(currentPage * ORDERS_PER_PAGE, filteredOrders.length)} trong tổng {filteredOrders.length} đơn hàng
                  </span>

                  <nav
                    aria-label="Phân trang lịch sử đơn hàng"
                    className="flex items-center gap-unit-2xs font-body-md text-body-md text-on-surface flex-wrap justify-center"
                  >
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="w-10 h-10 rounded-xl bg-surface-container-lowest hover:bg-surface-container flex items-center justify-center text-outline disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-surface-container"
                      aria-label="Trang trước"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>

                    {getVisiblePageNumbers(currentPage, totalPages).map((item, idx) =>
                      typeof item === 'string' ? (
                        <span
                          key={`${item}-${idx}`}
                          className="w-8 h-10 flex items-center justify-center text-outline select-none"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handlePageChange(item)}
                          aria-current={item === currentPage ? 'page' : undefined}
                          className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${
                            item === currentPage
                              ? 'bg-primary text-on-primary shadow-sm'
                              : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-surface-container'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="w-10 h-10 rounded-xl bg-surface-container-lowest hover:bg-surface-container flex items-center justify-center text-primary font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-surface-container"
                      aria-label="Trang tiếp"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </nav>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      <ReturnRequestModal
        isOpen={!!returnTargetOrder}
        onClose={() => setReturnTargetOrder(null)}
        order={returnTargetOrder}
        onSubmitSuccess={handleReturnSuccess}
      />

      <ReviewModal
        isOpen={!!reviewOrder}
        onClose={() => setReviewOrder(null)}
        order={reviewOrder}
        onSubmitSuccess={() => fetchOrders({ silent: true })}
      />

      <CancelOrderConfirmModal
        isOpen={!!cancelTargetOrder}
        onClose={() => setCancelTargetOrder(null)}
        order={cancelTargetOrder}
        onConfirm={handleCancelOrder}
        isCancelling={isCancelling}
      />
    </>
  );
};

export default OrderHistoryPage;
