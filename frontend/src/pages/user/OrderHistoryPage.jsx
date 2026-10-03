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
  X,
  Eye,
  Loader2,
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

/* ─── 5 Tabs ─────────────────────────────────────────────────────────────── */
const ORDER_TABS = [
  { id: 'ALL',       label: 'Tất cả' },
  { id: 'PENDING',   label: 'Chờ xác nhận' },
  { id: 'SHIPPING',  label: 'Đang giao' },
  { id: 'DELIVERED', label: 'Đã giao' },
  { id: 'CANCELLED', label: 'Đã hủy' },
];

/* ─── Status Info ────────────────────────────────────────────────────────── */
const getStatusInfo = (status) => {
  switch (status) {
    case 'Chờ xác nhận':
      return {
        label: 'Chờ xác nhận', icon: Clock,
        badgeClass: 'bg-amber-50 text-amber-600 border-amber-200',
        dotClass: 'bg-amber-400 animate-pulse',
        description: 'Đơn hàng đang chờ nhân viên xác nhận',
      };
    case 'Đang giao':
      return {
        label: 'Đang giao', icon: Truck,
        badgeClass: 'bg-blue-50 text-blue-600 border-blue-200',
        dotClass: 'bg-blue-400 animate-pulse',
        description: 'Đơn hàng đang trên đường giao đến bạn',
      };
    case 'Đã giao':
    case 'Đã hoàn thành':
      return {
        label: 'Đã giao', icon: CheckCircle2,
        badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        dotClass: 'bg-emerald-400',
        description: 'Giao hàng thành công',
      };
    case 'Đã hủy':
      return {
        label: 'Đã hủy', icon: XCircle,
        badgeClass: 'bg-rose-50 text-rose-600 border-rose-200',
        dotClass: 'bg-rose-400',
        description: 'Đơn hàng đã được hủy',
      };
    default:
      return {
        label: status || 'Không xác định', icon: Package,
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
        dotClass: 'bg-slate-400',
        description: '',
      };
  }
};

/* ─── ReviewModal ────────────────────────────────────────────────────────── */
const ReviewModal = ({ isOpen, onClose, order, onSubmitSuccess }) => {
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickTags = ['Chất lượng tuyệt vời', 'Đúng như mô tả', 'Đóng gói rất đẹp', 'Giao hàng nhanh chóng', 'Nhân viên thân thiện', 'Giá cả hợp lý'];
  const ratingDescriptions = { 1: 'Rất tệ - Không hài lòng chút nào', 2: 'Tệ - Cần cải thiện nhiều', 3: 'Bình thường - Tạm chấp nhận', 4: 'Hài lòng - Sản phẩm tốt', 5: 'Tuyệt vời - Rất hài lòng' };

  useEffect(() => {
    if (isOpen) { setSelectedRating(5); setHoverRating(0); setComment(''); setSelectedTags([]); setIsSubmitting(false); }
  }, [isOpen]);

  if (!isOpen || !order) return null;
  const toggleTag = (tag) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  const currentDisplayRating = hoverRating || selectedRating;
  const items = order.chitietdonhang || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success('Cảm ơn bạn đã gửi đánh giá sản phẩm!');
      if (onSubmitSuccess) onSubmitSuccess(order.MaDonHang);
      onClose();
    } catch { toast.error('Có lỗi xảy ra. Vui lòng thử lại!'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100 mb-1">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              Đánh giá đơn hàng #{order.MaDonHang}
            </span>
            <h3 className="text-lg font-bold text-slate-800">Chia sẻ cảm nhận của bạn</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Products */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2">
            <p className="text-xs text-slate-500 font-medium">Sản phẩm trong đơn hàng:</p>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.Anh ? (
                    <img src={item.Anh} alt={item.TenSanPham} className="w-full h-full object-contain p-1" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : <Package className="w-5 h-5 text-slate-300" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{item.TenSanPham}</p>
                  <p className="text-xs text-slate-500">x{item.SoLuong}{item.MauSac && ` · ${item.MauSac}`}{item.DungLuong && ` · ${item.DungLuong}`}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Star Rating */}
          <div className="text-center py-2 space-y-2">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Mức độ hài lòng</p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setSelectedRating(star)}
                  onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                  className="p-1.5 focus:outline-none transition-transform hover:scale-125 active:scale-95"
                >
                  <Star className={`w-8 h-8 transition-colors ${star <= currentDisplayRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 hover:text-slate-400'}`} />
                </button>
              ))}
            </div>
            <p className="text-xs sm:text-sm font-medium text-amber-500 h-5">{ratingDescriptions[currentDisplayRating]}</p>
          </div>

          {/* Quick Tags */}
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium">Chọn nhanh điểm nổi bật:</p>
            <div className="flex flex-wrap gap-2">
              {quickTags.map((tag) => {
                const isSel = selectedTags.includes(tag);
                return (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isSel ? 'bg-blue-50 border border-blue-200 text-blue-600' : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {isSel ? '✓ ' : '+ '}{tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-medium flex justify-between">
              <span>Đánh giá chi tiết:</span>
              <span className="text-[11px]">{comment.length}/500</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Chia sẻ trải nghiệm sử dụng thực tế, tốc độ giao hàng, thái độ phục vụ..."
              className="w-full border border-slate-200 bg-slate-50/50 rounded-xl p-3.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Đóng
          </button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-500/20 transition-all flex items-center gap-2 active:scale-[0.97] disabled:opacity-50"
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Đang gửi...</span></> : <><Star className="w-4 h-4 fill-white" /><span>Gửi đánh giá</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── OrderDetailModal ───────────────────────────────────────────────────── */
const OrderDetailModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;
  const statusInfo = getStatusInfo(order.TrangThaiDonHang);
  const StatusIcon = statusInfo.icon;
  const items = order.chitietdonhang || [];
  const subtotal = items.reduce((acc, it) => acc + Number(it.DonGia || 0) * Number(it.SoLuong || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">Chi tiết đơn #{order.MaDonHang}</h3>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.badgeClass}`}>
                <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                <StatusIcon className="w-3.5 h-3.5" />
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Thời gian đặt hàng: {formatDateTime(order.NgayMuaHang)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
          {/* Địa chỉ nhận hàng */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Địa chỉ nhận hàng
            </h4>
            <div className="space-y-1 text-xs sm:text-sm text-slate-700">
              <p className="font-semibold text-slate-800 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {order.TenNguoiNhan || 'Khách hàng'}
                <span className="text-slate-300">|</span>
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {order.SoDienThoai || 'Chưa có SĐT'}
              </p>
              <p className="text-slate-500 pl-5">{order.DiaChiGiaoHang || 'Địa chỉ giao hàng'}</p>
              {order.GhiChu && <p className="text-slate-400 italic pl-5 pt-1">Ghi chú: "{order.GhiChu}"</p>}
            </div>
          </div>

          {/* Sản phẩm */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Sản phẩm ({items.length})</h4>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {it.Anh ? <img src={it.Anh} alt={it.TenSanPham} className="w-full h-full object-contain p-1" onError={(e) => { e.target.style.display = 'none'; }} /> : <Package className="w-6 h-6 text-slate-300" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-1">{it.TenSanPham}</p>
                      <p className="text-xs text-slate-500">
                        {it.MauSac && <span className="mr-2">Màu: {it.MauSac}</span>}
                        {it.DungLuong && <span>Dung lượng: {it.DungLuong}</span>}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">SL: <strong className="text-slate-700">x{it.SoLuong}</strong></p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-blue-600">{formatVND(it.TongGia || it.DonGia * it.SoLuong)}</p>
                    <p className="text-[11px] text-slate-400">Đơn giá: {formatVND(it.DonGia)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tóm tắt thanh toán */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Tổng tiền hàng:</span>
              <span className="font-medium text-slate-700">{formatVND(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Phí vận chuyển:</span>
              <span className={Number(order.PhiShip) === 0 ? 'text-emerald-600 font-semibold' : 'font-medium text-slate-700'}>
                {Number(order.PhiShip) === 0 ? 'Miễn phí' : formatVND(order.PhiShip)}
              </span>
            </div>
            {Number(order.SoTienGiam) > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Voucher giảm giá:</span>
                <span className="text-rose-500 font-medium">-{formatVND(order.SoTienGiam)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm sm:text-base">
              <span className="font-bold text-slate-800">Tổng thanh toán:</span>
              <span className="text-lg sm:text-xl font-black text-blue-600">{formatVND(order.TongTien)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── EmptyOrderState ────────────────────────────────────────────────────── */
const EmptyOrderState = () => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center min-h-[400px] bg-white border border-slate-100 rounded-2xl shadow-sm">
    <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5">
      <ShoppingBag className="w-10 h-10 text-blue-400" />
    </div>
    <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mb-2">Chưa có đơn hàng nào</h3>
    <p className="text-slate-400 text-sm sm:text-base max-w-md mb-8">Bạn chưa có đơn hàng nào trong mục này.</p>
    <Link
      to="/products"
      className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-[0.97]"
    >
      <ShoppingBag className="w-4 h-4" />
      <span>Mua sắm ngay</span>
      <ArrowRight className="w-4 h-4" />
    </Link>
  </div>
);

/* ─── OrderCard ──────────────────────────────────────────────────────────── */
const OrderCard = ({ order, onReorder, isReordering, onOpenReview, onOpenDetail }) => {
  const statusInfo = getStatusInfo(order.TrangThaiDonHang);
  const StatusIcon = statusInfo.icon;
  const isDelivered = order.TrangThaiDonHang === 'Đã giao' || order.TrangThaiDonHang === 'Đã hoàn thành';
  const items = order.chitietdonhang || [];

  return (
    <div className="bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200">

      {/* Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-500">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-slate-800">
                Mã đơn: <span className="text-blue-600">#{order.MaDonHang}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-300" />
              <span>{formatDateTime(order.NgayMuaHang)}</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusInfo.badgeClass} self-start sm:self-auto`}>
          <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
          <StatusIcon className="w-3.5 h-3.5" />
          {statusInfo.label}
        </span>
      </div>

      {/* Order Items */}
      <div className="py-4 divide-y divide-slate-100">
        {items.map((item, idx) => (
          <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center p-1">
                {item.Anh ? (
                  <img src={item.Anh} alt={item.TenSanPham} className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : <Package className="w-6 h-6 text-slate-300" />}
              </div>
              <div className="min-w-0">
                <Link to={item.MaSanPham ? `/products/${item.MaSanPham}` : '#'}
                  className="text-xs sm:text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors line-clamp-1">
                  {item.TenSanPham || 'Sản phẩm SmartZone'}
                </Link>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1">
                  {item.MauSac && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.MauSac}</span>}
                  {item.DungLuong && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.DungLuong}</span>}
                  <span>SL: <strong className="text-slate-700">x{item.SoLuong}</strong></span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs sm:text-sm font-bold text-slate-800">{formatVND(item.TongGia || item.DonGia * item.SoLuong)}</p>
              {item.SoLuong > 1 && <p className="text-[11px] text-slate-400">{formatVND(item.DonGia)}/sp</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Order Footer */}
      <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Recipient info */}
        <div className="text-xs text-slate-400 space-y-0.5 max-w-md">
          <p className="truncate">
            <span className="text-slate-400">Người nhận:</span>{' '}
            <strong className="text-slate-600 font-medium">{order.TenNguoiNhan || 'Khách hàng'}</strong>{' '}
            - {order.SoDienThoai}
          </p>
          <p className="truncate text-slate-400">
            <span>Giao đến:</span> {order.DiaChiGiaoHang}
          </p>
        </div>

        {/* Total + Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 self-end md:self-auto">
          <div className="text-right">
            <span className="text-xs text-slate-400 mr-2">Tổng tiền:</span>
            <span className="text-base sm:text-lg font-black text-blue-600">{formatVND(order.TongTien)}</span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Xem chi tiết */}
            <button type="button" onClick={() => onOpenDetail(order)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              Chi tiết
            </button>

            {/* Buttons for delivered orders */}
            {isDelivered && (
              <>
                <button type="button" onClick={() => onOpenReview(order)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1.5"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  Đánh giá
                </button>

                <button type="button" onClick={() => onReorder(order.MaDonHang)} disabled={isReordering}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-[0.97] disabled:opacity-60"
                >
                  {isReordering ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Đang thêm...</span></> : <><RotateCcw className="w-3.5 h-3.5" /><span>Mua lại</span></>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── OrderHistoryPage (Main) ────────────────────────────────────────────── */
const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTabParam = (searchParams.get('tab') || 'ALL').toUpperCase();
  const validTab = ORDER_TABS.some((t) => t.id === currentTabParam) ? currentTabParam : 'ALL';

  const [activeTab, setActiveTab] = useState(validTab);
  const [orders, setOrders] = useState([]);
  const [allOrdersForCounts, setAllOrdersForCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [reorderingOrderId, setReorderingOrderId] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);

  useEffect(() => { if (validTab !== activeTab) setActiveTab(validTab); }, [validTab]);

  const fetchOrders = useCallback(async (tabKey) => {
    setLoading(true);
    try {
      const res = await api.get('/orders', { params: { tab: tabKey } });
      if (res.data?.success) setOrders(res.data.data || []);
      else setOrders([]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tải danh sách đơn hàng. Vui lòng thử lại!');
      setOrders([]);
    } finally { setLoading(false); }
  }, []);

  const fetchAllOrdersCount = useCallback(async () => {
    try {
      const res = await api.get('/orders', { params: { tab: 'ALL' } });
      if (res.data?.success) setAllOrdersForCounts(res.data.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchOrders(activeTab); }, [activeTab, fetchOrders]);
  useEffect(() => { fetchAllOrdersCount(); }, [fetchAllOrdersCount]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(tabId === 'ALL' ? {} : { tab: tabId.toLowerCase() });
  };

  const tabCounts = useMemo(() => {
    const counts = { ALL: allOrdersForCounts.length, PENDING: 0, SHIPPING: 0, DELIVERED: 0, CANCELLED: 0 };
    allOrdersForCounts.forEach((o) => {
      const st = o.TrangThaiDonHang;
      if (st === 'Chờ xác nhận') counts.PENDING++;
      else if (st === 'Đang giao') counts.SHIPPING++;
      else if (st === 'Đã giao' || st === 'Đã hoàn thành') counts.DELIVERED++;
      else if (st === 'Đã hủy') counts.CANCELLED++;
    });
    return counts;
  }, [allOrdersForCounts]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter((order) => {
      if (String(order.MaDonHang).includes(q)) return true;
      return !!order.chitietdonhang?.some((it) => it.TenSanPham?.toLowerCase().includes(q));
    });
  }, [orders, searchQuery]);

  const handleReorder = async (orderId) => {
    setReorderingOrderId(orderId);
    try {
      const res = await api.post(`/orders/${orderId}/reorder`);
      if (res.data?.success) {
        toast.success('Đã thêm toàn bộ sản phẩm vào giỏ hàng thành công!');
        setTimeout(() => navigate('/cart'), 500);
      } else toast.error(res.data?.message || 'Không thể mua lại đơn hàng này.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sản phẩm hiện không khả dụng để mua lại.');
    } finally { setReorderingOrderId(null); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumb & Header */}
          <div className="mb-6 sm:mb-8 space-y-2">
            <nav className="flex items-center gap-2 text-xs text-slate-400">
              <Link to="/" className="hover:text-blue-600 transition-colors font-medium">Trang chủ</Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-700 font-semibold">Lịch sử đơn hàng</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <Package className="w-7 h-7 text-blue-500" />
                  Đơn hàng của tôi
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Theo dõi trạng thái, xem chi tiết và mua lại các sản phẩm yêu thích
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã đơn hoặc tên máy..."
                  className="w-full pl-9 pr-8 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── 5 TABS - Pill/Underline Design ── */}
          <div className="bg-white border border-slate-100 rounded-2xl p-1.5 mb-6 shadow-sm">
            <div className="flex items-center overflow-x-auto gap-1">
              {ORDER_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = tabCounts[tab.id] || 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`flex-1 min-w-[100px] py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Orders Content */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white border border-slate-100 rounded-2xl p-6 animate-pulse space-y-4 shadow-sm">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div className="h-5 bg-slate-100 rounded-lg w-48" />
                    <div className="h-6 bg-slate-100 rounded-full w-28" />
                  </div>
                  <div className="flex gap-4 items-center py-3">
                    <div className="w-16 h-16 bg-slate-100 rounded-xl shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-md w-1/3" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <div className="h-4 bg-slate-100 rounded-md w-40" />
                    <div className="h-8 bg-slate-100 rounded-xl w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyOrderState />
          ) : (
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

      <ReviewModal
        isOpen={!!reviewOrder}
        onClose={() => setReviewOrder(null)}
        order={reviewOrder}
        onSubmitSuccess={() => fetchOrders(activeTab)}
      />

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
