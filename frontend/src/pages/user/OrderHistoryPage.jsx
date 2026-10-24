import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { formatOrderCode, formatVND, formatDateTime } from '../../utils/formatters';

/* ─── 6 Tabs Trạng Thái Đơn Hàng ─────────────────────────────────────────── */
const ORDER_TABS = [
  { id: 'ALL',        label: 'Tất cả',        icon: 'receipt_long' },
  { id: 'PENDING',    label: 'Chờ xác nhận',  icon: 'schedule' },
  { id: 'PROCESSING', label: 'Đang xử lý',    icon: 'inventory_2' },
  { id: 'SHIPPING',   label: 'Đang giao hàng',icon: 'local_shipping' },
  { id: 'DELIVERED',  label: 'Đã hoàn thành', icon: 'task_alt' },
  { id: 'CANCELLED',  label: 'Đã hủy',        icon: 'cancel' },
];

/* ─── Status Info Helper ─────────────────────────────────────────────────── */
const getStatusInfo = (status) => {
  switch (status) {
    case 'Chờ xác nhận':
      return {
        label: 'Chờ xác nhận',
        icon: 'schedule',
        badgeClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
        dotClass: 'bg-amber-500 animate-pulse',
      };
    case 'Đang xử lý':
      return {
        label: 'Đang xử lý',
        icon: 'inventory_2',
        badgeClass: 'bg-sky-500/10 text-sky-600 border border-sky-500/20',
        dotClass: 'bg-sky-500 animate-pulse',
      };
    case 'Đang giao':
      return {
        label: 'Đang giao hàng',
        icon: 'local_shipping',
        badgeClass: 'bg-primary-container/10 text-primary border border-primary/20',
        dotClass: 'bg-primary animate-pulse',
      };
    case 'Đã giao':
      return {
        label: 'Đã hoàn thành',
        icon: 'task_alt',
        badgeClass: 'bg-secondary-fixed text-on-secondary-fixed-variant border border-secondary/20',
        dotClass: 'bg-secondary',
      };
    case 'Đã hủy':
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
  const { user, logout } = useAuth();
  const { fetchCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTabParam = (searchParams.get('tab') || 'ALL').toUpperCase();
  const validTab = ORDER_TABS.some((t) => t.id === currentTabParam) ? currentTabParam : 'ALL';

  const [activeTab, setActiveTab] = useState(validTab);
  const [orders, setOrders] = useState([]);
  const [allOrdersForCounts, setAllOrdersForCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [reorderingOrderId, setReorderingOrderId] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [cancelTargetOrder, setCancelTargetOrder] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const spotlightRef = useRef(null);
  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

  useEffect(() => {
    if (validTab !== activeTab) setActiveTab(validTab);
  }, [validTab]);

  /* ── 1. Fetch Danh Sách Đơn Hàng theo Tab ── */
  const fetchOrders = useCallback(async (tabKey) => {
    setLoading(true);
    try {
      const res = await api.get('/orders', { params: { tab: tabKey } });
      if (res.data?.success) {
        setOrders(res.data.data || []);
      } else {
        setOrders([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tải danh sách đơn hàng. Vui lòng thử lại!');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── 2. Fetch Đếm Số Lượng Toàn Bộ Tabs ── */
  const fetchAllOrdersCount = useCallback(async () => {
    try {
      const res = await api.get('/orders', { params: { tab: 'ALL' } });
      if (res.data?.success) {
        setAllOrdersForCounts(res.data.data || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab, fetchOrders]);

  useEffect(() => {
    fetchAllOrdersCount();
  }, [fetchAllOrdersCount]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(tabId === 'ALL' ? {} : { tab: tabId.toLowerCase() });
    setSelectedOrderId(null); // Reset Spotlight để tự động hiển thị đơn hàng đầu tiên của tab mới
  };

  /* ── 3. Tab Counts Calculation ── */
  const tabCounts = useMemo(() => {
    const counts = { ALL: allOrdersForCounts.length, PENDING: 0, PROCESSING: 0, SHIPPING: 0, DELIVERED: 0, CANCELLED: 0 };
    allOrdersForCounts.forEach((o) => {
      const st = o.TrangThaiDonHang;
      if (st === 'Chờ xác nhận') counts.PENDING++;
      else if (st === 'Đang xử lý') counts.PROCESSING++;
      else if (st === 'Đang giao') counts.SHIPPING++;
      else if (st === 'Đã giao') counts.DELIVERED++;
      else if (st === 'Đã hủy') counts.CANCELLED++;
    });
    return counts;
  }, [allOrdersForCounts]);

  /* ── 4. Lọc đơn hàng theo Tab và ô tìm kiếm (Lịch sử đơn hàng trước đây lọc chuẩn theo Tab) ── */
  const tabOrders = useMemo(() => {
    if (activeTab === 'ALL') return orders;
    const statusMap = {
      PENDING: 'Chờ xác nhận',
      PROCESSING: 'Đang xử lý',
      SHIPPING: 'Đang giao',
      DELIVERED: 'Đã giao',
      CANCELLED: 'Đã hủy',
    };
    const targetStatus = statusMap[activeTab];
    return orders.filter((o) => !targetStatus || o.TrangThaiDonHang === targetStatus);
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

  /* ── 5. Đơn hàng đang được chọn hiển thị trong Spotlight Card ── */
  const currentFeaturedOrder = useMemo(() => {
    if (filteredOrders.length === 0) return null;
    if (selectedOrderId) {
      const found = filteredOrders.find((o) => o.MaDonHang === selectedOrderId);
      if (found) return found;
    }
    // Mặc định hiển thị đơn đầu tiên của danh sách đã lọc theo tab
    return filteredOrders[0];
  }, [filteredOrders, selectedOrderId]);

  /* ── 6. Sao chép mã đơn ── */
  const handleCopyOrderCode = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    toast.success(`Đã sao chép mã đơn: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  /* ── 7. Xem chi tiết đơn hàng: Đưa thẳng lên khối Sản Phẩm Trong Kiện Hàng & Cuộn mượt ── */
  const handleViewDetail = (order) => {
    setSelectedOrderId(order.MaDonHang);
    spotlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── 8. Mua lại đơn hàng ── */
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
        fetchOrders('CANCELLED');
        fetchAllOrdersCount();
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

  const featuredItems = currentFeaturedOrder?.ChiTietDonHang || currentFeaturedOrder?.chitietdonhang || [];
  const featuredSubtotal = featuredItems.reduce(
    (acc, it) => acc + Number(it.DonGia || 0) * Number(it.SoLuong || 0),
    0
  );
  const featuredStatusInfo = currentFeaturedOrder ? getStatusInfo(currentFeaturedOrder.TrangThaiDonHang) : null;

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased flex flex-col">
      <Navbar />

      <main className="w-full pt-4 sm:pt-6 bg-surface min-h-screen">
        <div className="flex flex-col w-full">
          
          {/* ── Breadcrumb: Trang chủ > Lịch sử đơn hàng ── */}
          <div className="max-w-container-max mx-auto w-full px-gutter-desktop pb-unit-sm">
            <nav aria-label="Breadcrumb" className="flex items-center gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm">
              <Link to="/" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
                <span className="material-symbols-outlined text-base leading-none">home</span>
                Trang chủ
              </Link>
              <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
              <span className="text-on-surface font-semibold">Lịch sử đơn hàng</span>
            </nav>
          </div>

          {/* Main Body Content: Asymmetric 12-Column Responsive Dashboard Layout */}
          <div className="max-w-container-max mx-auto w-full px-gutter-desktop pb-unit-4xl">
            <div className="grid grid-cols-12 gap-gutter-desktop items-start">
              
              {/* ── LEFT COLUMN: Account Sidebar (Span 3.5 on desktop) ── */}
              <aside className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-unit-lg lg:sticky lg:top-24">
                
                {/* Member Profile Master Card */}
                <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-unit-lg flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-fixed/40 via-transparent to-transparent rounded-bl-full pointer-events-none" />
                  
                  {/* Avatar & Identity */}
                  <div className="flex items-center gap-unit-md relative">
                    <div className="relative shrink-0">
                      <img
                        alt={user?.HoTen || user?.TaiKhoan || 'Khách hàng'}
                        className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-surface-container-high"
                        src={user?.AnhDaiDien || defaultAvatar}
                        onError={(e) => {
                          e.target.src = defaultAvatar;
                        }}
                      />
                      <span
                        className="absolute -bottom-1 -right-1 bg-primary text-on-primary rounded-full p-0.5 flex items-center justify-center shadow-sm"
                        title="Tài khoản khách hàng chính thức"
                      >
                        <span className="material-symbols-outlined text-xs leading-none">verified</span>
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-title-card text-title-card text-on-surface truncate font-bold">
                        {user?.HoTen || user?.TaiKhoan || 'Khách hàng'}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        {user?.Email || 'customer@smartzone.vn'}
                      </span>
                      {user?.SoDienThoai && (
                        <span className="font-label-spec text-label-spec text-outline mt-unit-2xs">
                          {user.SoDienThoai}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Navigation Submenu */}
                  <nav className="flex flex-col gap-unit-2xs mt-unit-lg">
                    {/* 1. Hồ sơ cá nhân */}
                    <Link
                      to="/profile"
                      className="flex items-center justify-between px-unit-sm py-unit-xs rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors font-body-md text-body-md"
                    >
                      <span className="flex items-center gap-unit-sm">
                        <span className="material-symbols-outlined text-outline leading-none">person</span>
                        Hồ sơ cá nhân
                      </span>
                      <span className="material-symbols-outlined text-sm text-outline leading-none">chevron_right</span>
                    </Link>

                    {/* 2. Lịch sử đơn hàng (Active) */}
                    <button
                      type="button"
                      onClick={() => handleSelectTab('ALL')}
                      className="w-full flex items-center justify-between px-unit-sm py-unit-xs rounded-xl bg-primary text-on-primary font-body-md text-body-md font-semibold shadow-sm text-left"
                    >
                      <span className="flex items-center gap-unit-sm">
                        <span className="material-symbols-outlined leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                          package_2
                        </span>
                        Lịch sử đơn hàng
                      </span>
                    </button>

                    {/* 3. Sổ địa chỉ */}
                    <Link
                      to="/profile"
                      className="flex items-center justify-between px-unit-sm py-unit-xs rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors font-body-md text-body-md"
                    >
                      <span className="flex items-center gap-unit-sm">
                        <span className="material-symbols-outlined text-outline leading-none">location_on</span>
                        Sổ địa chỉ
                      </span>
                      <span className="material-symbols-outlined text-sm text-outline leading-none">chevron_right</span>
                    </Link>

                    {/* 4. Sản phẩm yêu thích */}
                    <Link
                      to="/profile"
                      className="flex items-center justify-between px-unit-sm py-unit-xs rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors font-body-md text-body-md"
                    >
                      <span className="flex items-center gap-unit-sm">
                        <span className="material-symbols-outlined text-outline leading-none">favorite</span>
                        Sản phẩm yêu thích
                      </span>
                      <span className="material-symbols-outlined text-sm text-outline leading-none">chevron_right</span>
                    </Link>

                    {/* 5. Đăng xuất */}
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full flex items-center justify-between px-unit-sm py-unit-xs rounded-xl text-error hover:bg-error-container/20 transition-colors font-body-md text-body-md mt-unit-sm text-left"
                    >
                      <span className="flex items-center gap-unit-sm">
                        <span className="material-symbols-outlined leading-none">logout</span>
                        Đăng xuất
                      </span>
                    </button>
                  </nav>
                </div>
              </aside>

              {/* ── RIGHT COLUMN: Order History & Interactive Detail Visualizer (Span 8.5 on desktop) ── */}
              <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col gap-unit-xl">
                
                {/* Status Filter Tabs */}
                <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-unit-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-unit-xs">
                  <div className="flex items-center gap-unit-xs overflow-x-auto min-w-max pb-1 sm:pb-0">
                    {ORDER_TABS.map((tab) => {
                      const isActive = activeTab === tab.id;
                      const count = tabCounts[tab.id] || 0;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleSelectTab(tab.id)}
                          className={`px-unit-md py-unit-xs rounded-xl font-body-md text-body-md transition-colors flex items-center gap-unit-2xs whitespace-nowrap ${
                            isActive
                              ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                          }`}
                          type="button"
                        >
                          {isActive && (
                            <span className="material-symbols-outlined text-base leading-none">
                              {tab.icon}
                            </span>
                          )}
                          <span>{tab.label}</span>
                          {isActive ? (
                            <span className="px-1.5 py-0.5 bg-on-primary-container text-primary-container font-label-spec text-label-spec rounded-full ml-unit-2xs">
                              {count}
                            </span>
                          ) : (
                            <span className="font-semibold text-outline">({count})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Thanh tìm kiếm đơn hàng nhanh */}
                  <div className="relative flex items-center min-w-[200px]">
                    <span className="material-symbols-outlined absolute left-unit-xs text-outline pointer-events-none text-base">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm mã đơn hoặc sản phẩm..."
                      className="w-full pl-8 pr-7 py-1.5 bg-surface-container-low rounded-xl text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary border-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-unit-xs text-outline hover:text-on-surface flex items-center"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
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

                          {/* Tracking Status Badge */}
                          <div className={`flex items-center gap-unit-sm px-unit-md py-unit-xs rounded-2xl shadow-sm self-start md:self-auto ${featuredStatusInfo?.badgeClass || 'bg-primary text-on-primary'}`}>
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

                          {/* Utility Action Bar Under Current Order (ĐÃ XÓA nút 'Xem hóa đơn chi tiết') */}
                          <div className="flex flex-wrap items-center justify-between gap-unit-md pt-unit-xs">
                            <div className="flex items-center gap-unit-sm">
                              {/* Hủy đơn khi Chờ xác nhận */}
                              {currentFeaturedOrder.TrangThaiDonHang === 'Chờ xác nhận' && (
                                <button
                                  type="button"
                                  onClick={() => setCancelTargetOrder(currentFeaturedOrder)}
                                  className="px-unit-md py-unit-xs bg-error-container/20 text-error hover:bg-error-container/40 rounded-xl font-body-md text-body-md font-semibold flex items-center gap-unit-xs transition-colors shadow-sm"
                                >
                                  <span className="material-symbols-outlined leading-none">cancel</span>
                                  Hủy đơn hàng
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-unit-sm">
                              {/* Đánh giá & Mua lại khi Đã giao */}
                              {currentFeaturedOrder.TrangThaiDonHang === 'Đã giao' && (
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
                    <section className="flex flex-col gap-unit-md mt-unit-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-unit-xs">
                          <span className="material-symbols-outlined text-on-surface leading-none">history</span>
                          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
                            Lịch sử đơn hàng trước đây
                          </h2>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          Tổng số {filteredOrders.length} đơn hàng
                        </span>
                      </div>

                      <div className="flex flex-col gap-unit-md">
                        {filteredOrders.map((order) => {
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
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary font-label-spec text-label-spec rounded font-bold uppercase">
                                      Đang hiển thị kiện hàng
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
                                  {/* Xem chi tiết: Hiển thị sản phẩm trong kiện hàng ở trên & cuộn mượt */}
                                  <button
                                    type="button"
                                    onClick={() => handleViewDetail(order)}
                                    className="px-unit-md py-unit-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body-md text-body-md font-semibold rounded-xl transition-colors flex items-center gap-unit-2xs shadow-sm"
                                  >
                                    <span className="material-symbols-outlined text-base leading-none text-primary">receipt_long</span>
                                    Xem chi tiết
                                  </button>

                                  {/* Hủy đơn khi Chờ xác nhận */}
                                  {order.TrangThaiDonHang === 'Chờ xác nhận' && (
                                    <button
                                      type="button"
                                      onClick={() => setCancelTargetOrder(order)}
                                      className="px-unit-md py-unit-xs bg-error-container/20 text-error hover:bg-error-container/40 rounded-xl font-body-md text-body-md font-semibold flex items-center gap-unit-2xs transition-colors shadow-sm"
                                    >
                                      <span className="material-symbols-outlined text-base leading-none">cancel</span>
                                      Hủy đơn
                                    </button>
                                  )}

                                  {/* Đánh giá khi Đã giao */}
                                  {order.TrangThaiDonHang === 'Đã giao' && (
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
                                  {order.TrangThaiDonHang === 'Đã giao' && (
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
                    </section>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Modals ── */}
      <ReviewModal
        isOpen={!!reviewOrder}
        onClose={() => setReviewOrder(null)}
        order={reviewOrder}
        onSubmitSuccess={() => fetchOrders(activeTab)}
      />

      <CancelOrderConfirmModal
        isOpen={!!cancelTargetOrder}
        onClose={() => setCancelTargetOrder(null)}
        order={cancelTargetOrder}
        onConfirm={handleCancelOrder}
        isCancelling={isCancelling}
      />

      <Footer />
    </div>
  );
};

export default OrderHistoryPage;
