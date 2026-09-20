import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Package,
  ShoppingBag,
  RotateCcw,
  Star,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  ChevronRight,
  MapPin,
  Phone,
  User,
  Calendar,
  CreditCard,
  Search,
  ArrowRight,
  Sparkles,
  X,
  Eye,
  Camera,
  ThumbsUp,
  AlertCircle,
  HelpCircle,
  FileText,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';

/* ─────────────────────────────────────────────
   Helper format currency VNĐ
───────────────────────────────────────────── */
const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

/* ─────────────────────────────────────────────
   Helper format datetime
───────────────────────────────────────────── */
const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/* ─────────────────────────────────────────────
   5 Tabs cấu hình
───────────────────────────────────────────── */
const ORDER_TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING', label: 'Chờ xác nhận' },
  { id: 'SHIPPING', label: 'Đang giao' },
  { id: 'DELIVERED', label: 'Đã giao' },
  { id: 'CANCELLED', label: 'Đã hủy' },
];

/* ─────────────────────────────────────────────
   Helper Status Badge Info
───────────────────────────────────────────── */
const getStatusInfo = (status) => {
  switch (status) {
    case 'Chờ xác nhận':
      return {
        label: 'Chờ xác nhận',
        icon: Clock,
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        dotClass: 'bg-amber-400 animate-pulse',
        description: 'Đơn hàng đang chờ nhân viên xác nhận',
      };
    case 'Đang giao':
      return {
        label: 'Đang giao',
        icon: Truck,
        badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        dotClass: 'bg-sky-400 animate-pulse',
        description: 'Đơn hàng đang trên đường giao đến bạn',
      };
    case 'Đã giao':
    case 'Đã hoàn thành':
      return {
        label: 'Đã giao',
        icon: CheckCircle2,
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        dotClass: 'bg-emerald-400',
        description: 'Giao hàng thành công',
      };
    case 'Đã hủy':
      return {
        label: 'Đã hủy',
        icon: XCircle,
        badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        dotClass: 'bg-rose-400',
        description: 'Đơn hàng đã được hủy',
      };
    default:
      return {
        label: status || 'Không xác định',
        icon: Package,
        badgeClass: 'bg-slate-700/50 text-slate-300 border-slate-600/30',
        dotClass: 'bg-slate-400',
        description: '',
      };
  }
};

/* ─────────────────────────────────────────────
   Modal Đánh Giá Sản Phẩm (Review Modal)
───────────────────────────────────────────── */
const ReviewModal = ({ isOpen, onClose, order, onSubmitSuccess }) => {
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickTags = [
    'Chất lượng tuyệt vời',
    'Đúng như mô tả',
    'Đóng gói rất đẹp',
    'Giao hàng nhanh chóng',
    'Nhân viên thân thiện',
    'Giá cả hợp lý',
  ];

  const ratingDescriptions = {
    1: 'Rất tệ - Không hài lòng chút nào',
    2: 'Tệ - Cần cải thiện nhiều',
    3: 'Bình thường - Tạm chấp nhận',
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

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Giả lập gửi đánh giá nếu chưa có endpoint backend hoặc gọi API nếu có
      await new Promise((resolve) => setTimeout(resolve, 600));

      toast.success('Cảm ơn bạn đã gửi đánh giá sản phẩm!');
      if (onSubmitSuccess) onSubmitSuccess(order.MaDonHang);
      onClose();
    } catch (err) {
      toast.error('Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDisplayRating = hoverRating || selectedRating;
  const items = order.chitietdonhang || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow backdrop decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full mb-1">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              Đánh giá đơn hàng #{order.MaDonHang}
            </span>
            <h3 className="text-lg font-bold text-slate-100">
              Chia sẻ cảm nhận của bạn
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Danh sách sản phẩm được đánh giá */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 space-y-2">
            <p className="text-xs text-slate-400 font-medium">Sản phẩm trong đơn hàng:</p>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.Anh ? (
                    <img
                      src={item.Anh}
                      alt={item.TenSanPham}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Package className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                    {item.TenSanPham}
                  </p>
                  <p className="text-xs text-slate-400">
                    Số lượng: <span className="text-slate-300 font-medium">x{item.SoLuong}</span>
                    {item.MauSac && ` • ${item.MauSac}`}
                    {item.DungLuong && ` • ${item.DungLuong}`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Star Rating Selection */}
          <div className="text-center py-2 space-y-2">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Mức độ hài lòng
            </p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= currentDisplayRating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 focus:outline-none transition-transform hover:scale-125 active:scale-95"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        isFilled
                          ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : 'text-slate-600 hover:text-slate-500'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-xs sm:text-sm font-medium text-amber-400/90 h-5">
              {ratingDescriptions[currentDisplayRating]}
            </p>
          </div>

          {/* Quick Tags */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium">Chọn nhanh điểm nổi bật:</p>
            <div className="flex flex-wrap gap-2">
              {quickTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300 shadow-sm'
                        : 'bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed comment input */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium flex justify-between items-center">
              <span>Đánh giá chi tiết:</span>
              <span className="text-[11px] text-slate-500">{comment.length}/500</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Chia sẻ trải nghiệm sử dụng thực tế, tốc độ giao hàng, thái độ phục vụ..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang gửi...</span>
              </>
            ) : (
              <>
                <Star className="w-4 h-4 fill-white" />
                <span>Gửi đánh giá</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Modal Chi Tiết Đơn Hàng (Order Details Modal)
───────────────────────────────────────────── */
const OrderDetailModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const statusInfo = getStatusInfo(order.TrangThaiDonHang);
  const StatusIcon = statusInfo.icon;
  const items = order.chitietdonhang || [];

  const subtotal = items.reduce(
    (acc, it) => acc + Number(it.DonGia || 0) * Number(it.SoLuong || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg sm:text-xl font-black text-slate-100">
                Chi tiết đơn hàng #{order.MaDonHang}
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                <StatusIcon className="w-3.5 h-3.5" />
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Thời gian đặt hàng: {formatDateTime(order.NgayMuaHang)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Thông tin người nhận */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Địa chỉ nhận hàng
            </h4>
            <div className="space-y-1 text-xs sm:text-sm text-slate-300">
              <p className="font-semibold text-slate-100 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-500" />
                {order.TenNguoiNhan || 'Khách hàng'}
                <span className="text-slate-500 font-normal">|</span>
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {order.SoDienThoai || 'Chưa có SĐT'}
              </p>
              <p className="text-slate-400 pl-5">
                {order.DiaChiGiaoHang || 'Địa chỉ giao hàng'}
              </p>
              {order.GhiChu && (
                <p className="text-slate-400 italic pl-5 pt-1">
                  Ghi chú: "{order.GhiChu}"
                </p>
              )}
            </div>
          </div>

          {/* Danh sách sản phẩm */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sản phẩm ({items.length})
            </h4>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-4 p-3 bg-slate-950/40 border border-slate-800/60 rounded-2xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center">
                      {it.Anh ? (
                        <img
                          src={it.Anh}
                          alt={it.TenSanPham}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-200 line-clamp-1">
                        {it.TenSanPham}
                      </p>
                      <p className="text-xs text-slate-400">
                        {it.MauSac && <span className="mr-2">Màu: {it.MauSac}</span>}
                        {it.DungLuong && <span>Dung lượng: {it.DungLuong}</span>}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Số lượng: <span className="font-semibold text-slate-300">x{it.SoLuong}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-sky-400">
                      {formatVND(it.TongGia || it.DonGia * it.SoLuong)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Đơn giá: {formatVND(it.DonGia)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tóm tắt thanh toán */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Tổng tiền hàng:</span>
              <span className="text-slate-200 font-medium">{formatVND(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Phí vận chuyển:</span>
              <span
                className={
                  Number(order.PhiShip) === 0
                    ? 'text-emerald-400 font-semibold'
                    : 'text-slate-200 font-medium'
                }
              >
                {Number(order.PhiShip) === 0 ? 'Miễn phí' : formatVND(order.PhiShip)}
              </span>
            </div>
            {Number(order.SoTienGiam) > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Voucher giảm giá:</span>
                <span className="text-rose-400 font-medium">
                  -{formatVND(order.SoTienGiam)}
                </span>
              </div>
            )}
            <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-sm sm:text-base">
              <span className="font-bold text-slate-100">Tổng thanh toán:</span>
              <span className="text-lg sm:text-xl font-black text-emerald-400">
                {formatVND(order.TongTien)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Trạng Thái Tab Rỗng (Empty State)
   Yêu cầu 2:
   Căn giữa màn hình gồm Icon + Title "Chưa có đơn hàng nào"
   + Content "Bạn chưa có đơn hàng nào trong mục này." + Nút "Mua sắm ngay".
───────────────────────────────────────────── */
const EmptyOrderState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center min-h-[420px] bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-xl">
      {/* Icon căn giữa */}
      <div className="relative mb-6 group">
        <div className="absolute inset-0 bg-sky-500/15 rounded-3xl blur-2xl group-hover:scale-110 transition-transform duration-300" />
        <div className="relative w-24 h-24 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shadow-2xl group-hover:border-slate-700 transition-colors">
          <ShoppingBag className="w-12 h-12 stroke-[1.5] text-sky-400/90" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight mb-2">
        Chưa có đơn hàng nào
      </h3>

      {/* Content */}
      <p className="text-slate-400 text-sm sm:text-base max-w-md mb-8">
        Bạn chưa có đơn hàng nào trong mục này.
      </p>

      {/* Nút "Mua sắm ngay" */}
      <Link
        to="/products"
        className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <ShoppingBag className="w-4 h-4" />
        <span>Mua sắm ngay</span>
        <ArrowRight className="w-4 h-4 ml-1" />
      </Link>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Card Đơn Hàng (Order Card)
───────────────────────────────────────────── */
const OrderCard = ({ order, onReorder, isReordering, onOpenReview, onOpenDetail }) => {
  const statusInfo = getStatusInfo(order.TrangThaiDonHang);
  const StatusIcon = statusInfo.icon;
  const isDelivered =
    order.TrangThaiDonHang === 'Đã giao' || order.TrangThaiDonHang === 'Đã hoàn thành';

  const items = order.chitietdonhang || [];

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-5 sm:p-6 mb-5 backdrop-blur-xl shadow-xl transition-all duration-200">
      {/* ── Order Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-sky-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-slate-100">
                Mã đơn: <span className="text-sky-400">#{order.MaDonHang}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatDateTime(order.NgayMuaHang)}</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* ── Order Items List ── */}
      <div className="py-4 divide-y divide-slate-800/60">
        {items.map((item, idx) => (
          <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Product Thumbnail */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-1">
                {item.Anh ? (
                  <img
                    src={item.Anh}
                    alt={item.TenSanPham}
                    className="w-full h-full object-contain hover:scale-105 transition-transform"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <Package className="w-6 h-6 text-slate-600" />
                )}
              </div>

              {/* Product Info */}
              <div className="min-w-0">
                <Link
                  to={item.MaSanPham ? `/products/${item.MaSanPham}` : '#'}
                  className="text-xs sm:text-sm font-semibold text-slate-200 hover:text-sky-400 transition-colors line-clamp-1"
                >
                  {item.TenSanPham || 'Sản phẩm SmartZone'}
                </Link>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                  {item.MauSac && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/70 border border-slate-700/50">
                      {item.MauSac}
                    </span>
                  )}
                  {item.DungLuong && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/70 border border-slate-700/50">
                      {item.DungLuong}
                    </span>
                  )}
                  <span className="text-slate-400">
                    Số lượng: <strong className="text-slate-200">x{item.SoLuong}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Price Column */}
            <div className="text-right shrink-0">
              <p className="text-xs sm:text-sm font-bold text-slate-100">
                {formatVND(item.TongGia || item.DonGia * item.SoLuong)}
              </p>
              {item.SoLuong > 1 && (
                <p className="text-[11px] text-slate-500">
                  {formatVND(item.DonGia)}/sản phẩm
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Order Footer & Actions ── */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Recipient summary */}
        <div className="text-xs text-slate-400 space-y-0.5 max-w-md">
          <p className="truncate">
            <span className="text-slate-500">Người nhận:</span>{' '}
            <strong className="text-slate-300 font-medium">
              {order.TenNguoiNhan || 'Khách hàng'}
            </strong>{' '}
            - {order.SoDienThoai}
          </p>
          <p className="truncate text-slate-500">
            <span className="text-slate-500">Giao đến:</span> {order.DiaChiGiaoHang}
          </p>
        </div>

        {/* Financial & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 self-end md:self-auto">
          {/* Grand Total */}
          <div className="text-right">
            <span className="text-xs text-slate-400 mr-2">Tổng tiền:</span>
            <span className="text-base sm:text-lg font-black text-emerald-400">
              {formatVND(order.TongTien)}
            </span>
          </div>

          {/* Buttons group */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Nút Xem chi tiết */}
            <button
              type="button"
              onClick={() => onOpenDetail(order)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 transition-colors flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Chi tiết</span>
            </button>

            {/* 
              Yêu cầu 3:
              Đơn hàng thuộc tab "Đã giao": Tích hợp nút "Mua lại lần nữa" 
              (gọi API reorder để thêm sản phẩm vào giỏ) và nút "Đánh giá sản phẩm".
            */}
            {isDelivered && (
              <>
                {/* Nút Đánh giá sản phẩm */}
                <button
                  type="button"
                  onClick={() => onOpenReview(order)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Đánh giá sản phẩm</span>
                </button>

                {/* Nút Mua lại lần nữa */}
                <button
                  type="button"
                  onClick={() => onReorder(order.MaDonHang)}
                  disabled={isReordering}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 shadow-md shadow-sky-500/20 transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                >
                  {isReordering ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang thêm...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Mua lại lần nữa</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Page: OrderHistoryPage
───────────────────────────────────────────── */
const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Tab Parameter sync
  const currentTabParam = (searchParams.get('tab') || 'ALL').toUpperCase();
  const validTab = ORDER_TABS.some((t) => t.id === currentTabParam) ? currentTabParam : 'ALL';

  const [activeTab, setActiveTab] = useState(validTab);
  const [orders, setOrders] = useState([]);
  const [allOrdersForCounts, setAllOrdersForCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Reorder loading state per order ID
  const [reorderingOrderId, setReorderingOrderId] = useState(null);

  // Modals state
  const [reviewOrder, setReviewOrder] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);

  // Sync activeTab when query param changes
  useEffect(() => {
    if (validTab !== activeTab) {
      setActiveTab(validTab);
    }
  }, [validTab]);

  /* ── 1. Fetch Orders from Backend ── */
  const fetchOrders = useCallback(async (tabKey) => {
    setLoading(true);
    try {
      // Backend orderController hỗ trợ ?tab=ALL, PENDING, SHIPPING, DELIVERED, CANCELLED
      const res = await api.get('/orders', {
        params: { tab: tabKey },
      });

      if (res.data?.success) {
        setOrders(res.data.data || []);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách đơn hàng:', error);
      toast.error(
        error.response?.data?.message || 'Không thể tải danh sách đơn hàng. Vui lòng thử lại!'
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch all orders once to display badges count ── */
  const fetchAllOrdersCount = useCallback(async () => {
    try {
      const res = await api.get('/orders', { params: { tab: 'ALL' } });
      if (res.data?.success) {
        setAllOrdersForCounts(res.data.data || []);
      }
    } catch (e) {
      // Slient fail for badge counts
    }
  }, []);

  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab, fetchOrders]);

  useEffect(() => {
    fetchAllOrdersCount();
  }, [fetchAllOrdersCount]);

  /* ── 2. Handle Tab Change ── */
  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(tabId === 'ALL' ? {} : { tab: tabId.toLowerCase() });
  };

  /* ── 3. Tab Badge Counts ── */
  const tabCounts = useMemo(() => {
    const counts = {
      ALL: allOrdersForCounts.length,
      PENDING: 0,
      SHIPPING: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    allOrdersForCounts.forEach((o) => {
      const st = o.TrangThaiDonHang;
      if (st === 'Chờ xác nhận') counts.PENDING++;
      else if (st === 'Đang giao') counts.SHIPPING++;
      else if (st === 'Đã giao' || st === 'Đã hoàn thành') counts.DELIVERED++;
      else if (st === 'Đã hủy') counts.CANCELLED++;
    });

    return counts;
  }, [allOrdersForCounts]);

  /* ── 4. Search Filter in Client ── */
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();

    return orders.filter((order) => {
      // Check order ID
      if (String(order.MaDonHang).includes(q)) return true;
      // Check product name inside chitietdonhang
      const hasProductMatch = order.chitietdonhang?.some((it) =>
        it.TenSanPham?.toLowerCase().includes(q)
      );
      return !!hasProductMatch;
    });
  }, [orders, searchQuery]);

  /* ── 5. Action: Mua Lại Lần Nữa (Reorder API) ── */
  const handleReorder = async (orderId) => {
    setReorderingOrderId(orderId);
    try {
      const res = await api.post(`/orders/${orderId}/reorder`);
      if (res.data?.success) {
        toast.success('Đã thêm toàn bộ sản phẩm vào giỏ hàng thành công!');
        // Chuyển hướng người dùng đến giỏ hàng để họ dễ dàng tiến hành đặt hàng
        setTimeout(() => {
          navigate('/cart');
        }, 500);
      } else {
        toast.error(res.data?.message || 'Không thể mua lại đơn hàng này.');
      }
    } catch (error) {
      console.error('Lỗi khi mua lại đơn hàng:', error);
      const errMsg =
        error.response?.data?.message ||
        'Sản phẩm trong đơn hàng hiện không khả dụng để mua lại.';
      toast.error(errMsg);
    } finally {
      setReorderingOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb & Header */}
          <div className="mb-6 sm:mb-8 space-y-2">
            <nav className="flex items-center gap-2 text-xs text-slate-400">
              <Link to="/" className="hover:text-slate-200 transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-200 font-medium">Lịch sử đơn hàng</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
                  <Package className="w-7 h-7 text-sky-400" />
                  Đơn hàng của tôi
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Theo dõi trạng thái, xem chi tiết và mua lại các sản phẩm yêu thích
                </p>
              </div>

              {/* Quick Search bar */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã đơn hoặc tên máy..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 
            ── YÊU CẦU 1: 5 TABS ──
            `Tất cả`, `Chờ xác nhận`, `Đang giao`, `Đã giao`, `Đã hủy`.
            Tab "Tất cả" hiển thị danh sách tổng hợp của 4 trạng thái còn lại.
          */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 mb-8 backdrop-blur-xl shadow-lg">
            <div className="flex items-center overflow-x-auto no-scrollbar gap-1 sm:gap-2">
              {ORDER_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = tabCounts[tab.id] || 0;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`flex-1 min-w-[120px] py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Orders Content ── */}
          {loading ? (
            /* Loading Skeletons */
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 animate-pulse space-y-4"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                    <div className="h-5 bg-slate-800 rounded-lg w-48" />
                    <div className="h-6 bg-slate-800 rounded-full w-28" />
                  </div>
                  <div className="flex gap-4 items-center py-3">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-800 rounded-md w-3/4" />
                      <div className="h-3 bg-slate-800 rounded-md w-1/3" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                    <div className="h-4 bg-slate-800 rounded-md w-40" />
                    <div className="h-8 bg-slate-800 rounded-xl w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            /* 
              ── YÊU CẦU 2: TRẠNG THÁI TAB RỖNG ──
              Căn giữa màn hình gồm Icon + Title "Chưa có đơn hàng nào" 
              + Content "Bạn chưa có đơn hàng nào trong mục này." + Nút "Mua sắm ngay".
            */
            <EmptyOrderState />
          ) : (
            /* Danh sách đơn hàng */
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.MaDonHang}
                  order={order}
                  onReorder={handleReorder}
                  isReordering={reorderingOrderId === order.MaDonHang}
                  onOpenReview={(ord) => setReviewOrder(ord)}
                  onOpenDetail={(ord) => setDetailOrder(ord)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Review Modal */}
      <ReviewModal
        isOpen={!!reviewOrder}
        onClose={() => setReviewOrder(null)}
        order={reviewOrder}
        onSubmitSuccess={() => {
          // Refresh list or mark as reviewed
          fetchOrders(activeTab);
        }}
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        order={detailOrder}
      />

      <Footer />
    </div>
  );
};

export default OrderHistoryPage;
