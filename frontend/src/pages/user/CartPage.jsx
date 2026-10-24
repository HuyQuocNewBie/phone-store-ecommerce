import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import DeleteConfirmModal from '../../components/user/DeleteConfirmModal';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';

const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

const CartPage = () => {
  const navigate = useNavigate();
  const { cartItems, setCartItems, cartLoading, fetchCart, updateQuantity, removeFromCart } = useCart();

  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [isLoading, setIsLoading]             = useState(true);
  const [selectedIds, setSelectedIds]         = useState([]);
  const [voucherCode, setVoucherCode]         = useState('');
  const [appliedVoucher, setAppliedVoucher]   = useState(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [modalOpen, setModalOpen]             = useState(false);
  const [modalTarget, setModalTarget]         = useState(null);
  const hasInitializedSelection               = useRef(false);

  useEffect(() => {
    // fetchCart() được CartContext tự gọi, chỉ cần fetch vouchers ở đây
    fetchVouchers();
    // Khi cartLoading hoàn tất (dữ liệu đã sẵn sàng), ẩn spinner
    if (!cartLoading) setIsLoading(false);
  }, [cartLoading]);

  // Đồng bộ selectedIds khi cartItems thay đổi
  useEffect(() => {
    if (cartItems.length > 0) {
      if (!hasInitializedSelection.current) {
        setSelectedIds(cartItems.map((item) => item.id));
        hasInitializedSelection.current = true;
      } else {
        setSelectedIds((prev) => prev.filter((id) => cartItems.some((item) => item.id === id)));
      }
    } else {
      setSelectedIds([]);
      hasInitializedSelection.current = false;
    }
  }, [cartItems]);

  const fetchVouchers = async () => {
    try {
      const res = await api.get('/vouchers/active');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAvailableVouchers(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách voucher:', err);
    }
  };

  const isEmpty = cartItems.length === 0;
  const isAllSelected = cartItems.length > 0 && cartItems.every((item) => selectedIds.includes(item.id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map((item) => item.id));
    }
  };
  const handleToggleItem = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleQtyChange = async (id, delta) => {
    const item = cartItems.find((x) => x.id === id);
    if (!item) return;
    const newQty = Math.max(1, Math.min(item.TonKho, item.SoLuong + delta));
    if (newQty === item.SoLuong) return;
    const result = await updateQuantity(item.MaGioHang, newQty);
    if (!result.success) {
      toast.error(result.message || 'Không thể cập nhật số lượng');
    }
  };

  const openDeleteModal = (itemId = null) => { setModalTarget(itemId); setModalOpen(true); };

  const handleConfirmDelete = async () => {
    try {
      if (modalTarget) {
        const result = await removeFromCart(modalTarget);
        if (result.success) {
          setSelectedIds((prev) => prev.filter((x) => x !== modalTarget));
          toast.success('Đã xóa sản phẩm khỏi giỏ hàng.');
        } else {
          toast.error(result.message || 'Xóa sản phẩm thất bại.');
        }
      } else {
        const result = await removeFromCart(selectedIds);
        if (result.success) {
          const count = selectedIds.length;
          setSelectedIds([]);
          toast.success(`Đã xóa ${count} sản phẩm khỏi giỏ hàng.`);
        } else {
          toast.error(result.message || 'Xóa sản phẩm thất bại.');
        }
      }
    } catch { toast.error('Xóa sản phẩm thất bại.'); }
    finally { setModalTarget(null); setModalOpen(false); }
  };

  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.id));
  const subtotal = selectedItems.reduce((sum, item) => sum + Number(item.Gia) * Number(item.SoLuong), 0);
  const onlineDiscount = 0; // Trợ giá thanh toán Online (nếu có)

  // Tính tiền giảm dựa trên appliedVoucher và subtotal
  const discount = appliedVoucher
    ? (appliedVoucher.LoaiGiam === 'phantram' || appliedVoucher.LoaiGiamGia === 'PhanTram'
        ? Math.round(subtotal * (Number(appliedVoucher.GiaTriGiam) / 100))
        : Number(appliedVoucher.GiaTriGiam))
    : 0;
  const actualDiscount = Math.min(discount, subtotal);
  const total = Math.max(0, subtotal - actualDiscount - onlineDiscount);

  // Tự động kiểm tra giá trị tối thiểu của voucher khi subtotal thay đổi
  useEffect(() => {
    if (appliedVoucher) {
      const minRequired = Number(appliedVoucher.GiaTriToiThieu || appliedVoucher.DonToiThieu || 0);
      if (subtotal > 0 && subtotal < minRequired) {
        setAppliedVoucher(null);
        toast(`Mã ${appliedVoucher.Code || appliedVoucher.MaCode} đã được gỡ vì đơn hàng chưa đạt giá trị tối thiểu ${formatVND(minRequired)}`, {
          icon: '⚠️'
        });
      }
    }
  }, [subtotal, appliedVoucher]);

  const handleApplyVoucher = async (codeToApply = null) => {
    const rawCode = (typeof codeToApply === 'string' ? codeToApply : voucherCode);
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      toast.error('Vui lòng nhập mã giảm giá');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Vui lòng chọn sản phẩm trong giỏ hàng trước khi áp dụng mã');
      return;
    }

    setApplyingVoucher(true);
    try {
      const res = await api.post('/vouchers/apply', {
        code,
        orderSubtotal: subtotal
      });

      if (res.data?.success) {
        const { voucher, discountAmount } = res.data.data;
        const voucherData = {
          ...voucher,
          discountAmount,
          MaCode: voucher.Code,
          code: voucher.Code,
          Code: voucher.Code,
          GiaTriGiam: Number(voucher.GiaTriGiam),
          LoaiGiam: voucher.LoaiGiam,
          LoaiGiamGia: voucher.LoaiGiam === 'phantram' ? 'PhanTram' : 'Tien',
          DonToiThieu: Number(voucher.GiaTriToiThieu),
          GiaTriToiThieu: Number(voucher.GiaTriToiThieu)
        };
        setAppliedVoucher(voucherData);
        setVoucherCode(voucher.Code);
        toast.success(res.data.message || 'Áp dụng mã giảm giá thành công!');
      } else {
        toast.error(res.data?.message || 'Không thể áp dụng mã giảm giá');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện';
      toast.error(msg);
    } finally {
      setApplyingVoucher(false);
    }
  };

  const handleSelectAndApplyVoucher = (voucher) => {
    setVoucherCode(voucher.Code);
    handleApplyVoucher(voucher.Code);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    toast.success('Đã gỡ mã giảm giá.');
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    navigate('/checkout', { state: { items: selectedItems, voucher: appliedVoucher } });
  };

  const bulkDeleteEnabled = selectedIds.length >= 2;
  const isItemTrashEnabled = (id) => selectedIds.includes(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 w-full bg-surface py-unit-xl md:py-unit-2xl">
          <div className="max-w-container-max mx-auto px-gutter-desktop w-full flex flex-col gap-unit-2xl">

            {/* ── Breadcrumb: Trang chủ > Giỏ hàng ── */}
            <div className="pb-unit-sm">
              <nav aria-label="Breadcrumb" className="flex items-center gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm">
                <Link to="/" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
                  <span className="material-symbols-outlined text-base leading-none">home</span>
                  Trang chủ
                </Link>
                <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
                <span className="text-on-surface font-semibold">Giỏ hàng</span>
              </nav>
            </div>

            {/* 1. Thanh Tiến Trình / Stepper */}
            <div className="w-full max-w-3xl mx-auto">
              <div className="relative flex items-center justify-between">
                {/* Connecting Progress Bar */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-surface-container-high rounded-full -z-0">
                  <div className="h-full w-0 bg-primary rounded-full transition-all duration-500" />
                </div>
                {/* Step 1: Active */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md ring-4 ring-primary-fixed/40">
                    <span className="material-symbols-outlined text-xl">shopping_cart</span>
                  </div>
                  <div className="text-center mt-unit-2xs">
                    <span className="font-body-md text-body-md font-bold text-primary block leading-tight">1. Giỏ hàng</span>
                    <span className="font-label-spec text-label-spec uppercase tracking-wider text-outline block">(0 sản phẩm)</span>
                  </div>
                </div>
                {/* Step 2: Pending */}
                <div className="relative z-10 flex flex-col items-center opacity-65">
                  <div className="w-12 h-12 rounded-full bg-surface-container-lowest text-outline flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-xl">payment</span>
                  </div>
                  <div className="text-center mt-unit-2xs">
                    <span className="font-body-md text-body-md font-medium text-on-surface-variant block leading-tight">2. Thanh toán</span>
                    <span className="font-label-spec text-label-spec uppercase tracking-wider text-outline block">Địa chỉ &amp; Phương thức</span>
                  </div>
                </div>
                {/* Step 3: Pending */}
                <div className="relative z-10 flex flex-col items-center opacity-65">
                  <div className="w-12 h-12 rounded-full bg-surface-container-lowest text-outline flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-xl">verified</span>
                  </div>
                  <div className="text-center mt-unit-2xs">
                    <span className="font-body-md text-body-md font-medium text-on-surface-variant block leading-tight">3. Hoàn tất</span>
                    <span className="font-label-spec text-label-spec uppercase tracking-wider text-outline block">Xác nhận đơn</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Empty State Hero Card */}
            <div className="relative w-full rounded-2xl bg-surface-container-lowest p-unit-xl md:p-unit-3xl shadow-sm flex flex-col items-center text-center overflow-hidden">
              {/* Decorative Ambient Gradient Glow behind graphic */}
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none -z-0" />
              <div className="absolute -bottom-24 right-1/4 w-72 h-72 bg-secondary-fixed/30 rounded-full blur-2xl pointer-events-none -z-0" />

              {/* Sophisticated Vector Empty Cart Illustration */}
              <div className="relative z-10 w-44 h-44 mb-unit-lg flex items-center justify-center">
                <svg className="w-full h-full" fill="none" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
                  {/* Subtle Glow Floor */}
                  <ellipse className="text-surface-container-high" cx="80" cy="140" fill="currentColor" rx="55" ry="10" />
                  {/* Outer Floating Particle Rings */}
                  <circle className="text-secondary" cx="34" cy="45" fill="currentColor" opacity="0.6" r="4" />
                  <circle className="text-primary-container" cx="128" cy="48" fill="currentColor" opacity="0.5" r="3" />
                  <circle className="text-tertiary-container" cx="138" cy="100" fill="currentColor" opacity="0.4" r="5" />
                  <path className="text-primary-fixed-dim" d="M42 98L44 94L48 96L46 100Z" fill="currentColor" />
                  {/* Tech Floating Sparkle Icon */}
                  <path className="text-secondary-container animate-pulse" d="M118 30L121 38L129 41L121 44L118 52L115 44L107 41L115 38L118 30Z" fill="currentColor" />
                  {/* Main Shopping Bag/Basket Body */}
                  <rect className="text-surface-container-low" fill="currentColor" height="66" rx="16" width="88" x="36" y="58" />
                  <path className="text-surface-container" d="M46 64C46 59.5817 49.5817 56 54 56H106C110.418 56 114 59.5817 114 64V76H46V64Z" fill="currentColor" />
                  {/* Inner Precision Grid Lines */}
                  <line className="text-outline-variant" stroke="currentColor" strokeDasharray="4 4" strokeLinecap="round" strokeWidth="2" x1="56" x2="104" y1="84" y2="84" />
                  <line className="text-outline-variant" stroke="currentColor" strokeDasharray="4 4" strokeLinecap="round" strokeWidth="2" x1="56" x2="88" y1="98" y2="98" />
                  {/* Bag Handles with Modern Arch */}
                  <path className="text-primary" d="M58 60V42C58 29.8497 67.8497 20 80 20C92.1503 20 102 29.8497 102 42V60" stroke="currentColor" strokeLinecap="round" strokeWidth="6" />
                  <circle className="text-on-primary-container" cx="58" cy="60" fill="currentColor" r="4" />
                  <circle className="text-on-primary-container" cx="102" cy="60" fill="currentColor" r="4" />
                  {/* Modern Sleek Badge: Question Mark / Empty Notification */}
                  <circle className="text-primary" cx="98" cy="106" fill="currentColor" r="18" />
                  <circle className="text-surface-container-lowest" cx="98" cy="106" fill="currentColor" r="14" />
                  <text className="text-primary" fill="currentColor" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="16" fontWeight="800" textAnchor="middle" x="98" y="112">?</text>
                </svg>
              </div>

              {/* 3. Core Informational Text */}
              <h1 className="relative z-10 font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg text-on-surface font-extrabold tracking-tight mb-unit-xs">
                Giỏ hàng của bạn đang trống
              </h1>
              <p className="relative z-10 font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto mb-unit-xl">
                Chưa có thiết bị nào được lưu vào danh sách. Hàng ngàn mẫu smartphone chính hãng, flagship đỉnh cao và phụ kiện cao cấp đang sẵn sàng trao tay bạn!
              </p>

              {/* 4. Action CTA */}
              <div className="relative z-10 flex items-center justify-center w-full max-w-md">
                <button
                  id="empty-cart-cta-btn"
                  type="button"
                  onClick={() => navigate('/products')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-unit-xs px-unit-xl py-unit-sm bg-primary hover:bg-primary-container text-on-primary rounded-xl font-body-md text-body-md font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-xl">bolt</span>
                  <span>Khám Phá Smartphone Mới</span>
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans">
      <Navbar />

      <DeleteConfirmModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setModalTarget(null); }}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa"
        itemCount={modalTarget ? 1 : selectedIds.length}
        message={
          modalTarget
            ? 'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không?'
            : `Bạn có chắc chắn muốn xóa ${selectedIds.length} sản phẩm đã chọn không?`
        }
      />

      <main className="flex-1 w-full bg-surface py-unit-lg md:py-unit-xl pb-unit-4xl">
        <div className="max-w-container-max mx-auto px-gutter-desktop w-full flex flex-col">

          {/* ── Breadcrumb: Trang chủ > Giỏ hàng ── */}
          <div className="pb-unit-sm">
            <nav aria-label="Breadcrumb" className="flex items-center gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm">
              <Link to="/" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
                <span className="material-symbols-outlined text-base leading-none">home</span>
                Trang chủ
              </Link>
              <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
              <span className="text-on-surface font-semibold">Giỏ hàng</span>
            </nav>
          </div>

          {/* 1. Thanh Tiến Trình / Stepper Tiến trình mua sắm */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-unit-md mb-unit-lg">
            <div className="max-w-3xl mx-auto flex items-center justify-between relative">
              {/* Connecting Lines */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-surface-container-high z-0" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 h-[2px] bg-primary z-0 transition-all duration-500" />

              {/* Step 1: Active */}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md shadow-primary/25">
                  <span className="material-symbols-outlined text-base sm:text-lg">shopping_cart</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-xs sm:text-sm font-bold text-primary">1. Giỏ hàng</span>
                  <span className="text-[11px] text-on-surface-variant">({cartItems.length} sản phẩm)</span>
                </div>
              </div>

              {/* Step 2: Next */}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface-container-lowest text-outline border border-outline-variant flex items-center justify-center text-xs sm:text-sm font-semibold">
                  2
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-xs sm:text-sm font-semibold text-outline">2. Thanh toán</span>
                  <span className="text-[11px] text-outline">Địa chỉ &amp; Phương thức</span>
                </div>
              </div>

              {/* Step 3: Complete */}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface-container-lowest text-outline border border-outline-variant flex items-center justify-center text-xs sm:text-sm font-semibold">
                  3
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-xs sm:text-sm font-semibold text-outline">3. Hoàn tất</span>
                  <span className="text-[11px] text-outline">Xác nhận đơn hàng</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Main Grid: 65% Left (Products + Coupons) / 35% Right (Order Summary) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-unit-lg items-start">
            {/* ── Left Column (65% ~ span-8) ── */}
            <div className="lg:col-span-8 flex flex-col gap-unit-lg">
              {/* Table Toolbar */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm p-3 sm:p-4 flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="check-all"
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                    onChange={handleToggleAll}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-on-surface">
                    Chọn tất cả ({selectedIds.length} sản phẩm)
                  </span>
                </label>
                <button
                  id="bulk-delete-btn"
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={() => openDeleteModal(null)}
                  className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors px-2.5 py-1.5 rounded-lg ${
                    selectedIds.length > 0
                      ? 'text-error hover:text-on-error-container hover:bg-error-container/20 cursor-pointer'
                      : 'text-outline cursor-not-allowed opacity-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">delete_sweep</span>
                  <span>Xóa mục đã chọn</span>
                </button>
              </div>

              {/* Product Cart List Card */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col divide-y divide-surface-container">
                {cartItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const discountPercent = item.GiaGoc && Number(item.GiaGoc) > Number(item.Gia)
                    ? Math.round((1 - Number(item.Gia) / Number(item.GiaGoc)) * 100)
                    : null;

                  return (
                    <div
                      key={item.id}
                      className={`p-unit-sm sm:p-unit-md flex flex-col md:flex-row items-start md:items-center justify-between gap-unit-md transition-colors ${
                        isSelected ? 'bg-primary-fixed/10' : 'hover:bg-surface-container-low/50'
                      }`}
                    >
                      {/* Selector & Visual & Details */}
                      <div className="flex items-center gap-unit-md w-full md:w-auto flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleItem(item.id)}
                          className="item-checkbox w-5 h-5 rounded text-primary focus:ring-primary accent-primary cursor-pointer shrink-0"
                        />
                        <div
                          className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-surface-container-low p-unit-xs flex items-center justify-center shrink-0 overflow-hidden cursor-pointer"
                          onClick={() => navigate(`/products/${item.MaSanPham}`)}
                        >
                          {item.Anh ? (
                            <img
                              src={item.Anh}
                              alt={item.TenSanPham}
                              className="w-full h-full object-contain"
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <span className="material-symbols-outlined text-3xl text-outline">devices</span>
                          )}
                          {discountPercent && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-tertiary text-on-tertiary text-[10px] font-bold uppercase">
                              -{discountPercent}%
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <h3
                            onClick={() => navigate(`/products/${item.MaSanPham}`)}
                            className="text-sm sm:text-base font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug"
                          >
                            {item.TenSanPham}
                          </h3>

                          <p className="text-xs text-on-surface-variant">
                            <span className="text-outline">Màu:</span> <span className="font-medium text-on-surface">{item.MauSac || 'N/A'}</span>
                            <span className="mx-1 text-outline">·</span>
                            <span className="text-outline">Dung lượng:</span> <span className="font-medium text-on-surface">{item.DungLuong || 'N/A'}</span>
                          </p>

                          {item.TonKho <= 3 && (
                            <p className="text-xs text-error font-medium flex items-center gap-1 pt-0.5">
                              <span className="material-symbols-outlined text-sm">inventory</span>
                              Chỉ còn {item.TonKho} sản phẩm trong kho
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Price & Quantity Controls */}
                      <div className="flex items-center justify-between md:justify-end gap-unit-md sm:gap-unit-lg w-full md:w-auto pt-unit-xs md:pt-0 border-t md:border-t-0 border-surface-container">
                        {/* Price per item */}
                        <div className="flex flex-col md:text-right">
                          <span className="text-sm sm:text-base text-primary font-bold">
                            {formatVND(item.Gia)}
                          </span>
                          {item.GiaGoc && Number(item.GiaGoc) > Number(item.Gia) && (
                            <span className="text-xs text-outline line-through">
                              {formatVND(item.GiaGoc)}
                            </span>
                          )}
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex items-center bg-surface-container-low rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.id, -1)}
                            disabled={item.SoLuong <= 1}
                            className="w-7 h-7 rounded bg-surface-container-lowest hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-base">remove</span>
                          </button>
                          <span className="w-8 sm:w-9 text-center text-xs sm:text-sm font-semibold text-on-surface">
                            {item.SoLuong}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.id, 1)}
                            disabled={item.SoLuong >= item.TonKho}
                            className="w-7 h-7 rounded bg-surface-container-lowest hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-base">add</span>
                          </button>
                        </div>

                        {/* Subtotal Desktop & Delete Action */}
                        <div className="flex items-center gap-unit-sm">
                          <span className="hidden xl:block text-sm sm:text-base text-on-surface font-bold w-24 sm:w-28 text-right">
                            {formatVND(Number(item.Gia) * Number(item.SoLuong))}
                          </span>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(item.id)}
                            className="w-8 h-8 rounded-lg hover:bg-error-container/30 text-outline hover:text-error flex items-center justify-center transition-colors"
                            title="Xóa sản phẩm"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ưu Đãi & Voucher Code Block */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-lg sm:text-xl">confirmation_number</span>
                    <h3 className="text-sm sm:text-base text-on-surface font-bold">Ưu đãi &amp; Mã giảm giá</h3>
                  </div>
                  <span className="text-xs text-on-surface-variant">Chọn hoặc nhập mã khuyến mãi</span>
                </div>

                {/* Input Voucher Field */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-lg">sell</span>
                    <input
                      id="voucher-input"
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                      placeholder="Nhập mã voucher (VD: SZ500K)..."
                      className="w-full pl-9 pr-3 py-2 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface placeholder:text-outline uppercase font-semibold tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {appliedVoucher && voucherCode === (appliedVoucher.Code || appliedVoucher.MaCode) ? (
                    <button
                      id="remove-voucher-btn"
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="px-4 py-2 bg-surface-container-high text-error text-xs sm:text-sm font-bold rounded-xl hover:bg-error hover:text-on-error transition-colors shrink-0 shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  ) : (
                    <button
                      id="apply-voucher-btn"
                      type="button"
                      onClick={() => handleApplyVoucher()}
                      disabled={!voucherCode.trim() || applyingVoucher}
                      className="px-4 py-2 bg-primary text-on-primary text-xs sm:text-sm font-bold rounded-xl hover:bg-primary-container transition-colors shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                    >
                      {applyingVoucher ? (
                        <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Áp dụng'
                      )}
                    </button>
                  )}
                </div>

                {/* Applied Voucher Card (if custom voucher not in list) */}
                {appliedVoucher && !availableVouchers.some((v) => v.Code === (appliedVoucher.Code || appliedVoucher.MaCode)) && (
                  <div className="p-3 rounded-xl bg-primary-fixed/40 border border-primary/30 flex items-center justify-between gap-2 relative overflow-hidden">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg">local_offer</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm text-primary font-bold">
                            {appliedVoucher.Code || appliedVoucher.MaCode}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-primary text-on-primary text-[10px] uppercase font-bold">
                            Áp dụng thành công
                          </span>
                        </div>
                        <span className="text-xs text-on-surface-variant truncate">
                          Giảm {appliedVoucher.LoaiGiam === 'phantram' || appliedVoucher.LoaiGiamGia === 'PhanTram' ? `${appliedVoucher.GiaTriGiam}%` : formatVND(appliedVoucher.GiaTriGiam)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-primary hover:bg-error hover:text-on-error text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">check</span>
                      Bỏ chọn
                    </button>
                  </div>
                )}

                {/* Suggested Vouchers Quick Picks */}
                {availableVouchers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {availableVouchers.map((v) => {
                      const isCurrentlyApplied = appliedVoucher && (appliedVoucher.Code === v.Code || appliedVoucher.MaCode === v.Code);
                      const minReq = Number(v.GiaTriToiThieu || 0);
                      const isEligible = subtotal >= minReq;

                      if (isCurrentlyApplied) {
                        return (
                          <div
                            key={v.MaVoucher || v.Code}
                            className="p-3 rounded-xl bg-primary-fixed/40 border border-primary/30 flex items-center justify-between gap-2 relative overflow-hidden"
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-lg">local_offer</span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs sm:text-sm text-primary font-bold">{v.Code}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-primary text-on-primary text-[10px] uppercase font-bold">
                                    Áp dụng thành công
                                  </span>
                                </div>
                                <span className="text-xs text-on-surface-variant truncate">
                                  Giảm {v.LoaiGiam === 'phantram' ? `${v.GiaTriGiam}%` : formatVND(v.GiaTriGiam)} cho đơn từ {formatVND(minReq)}
                                </span>
                                {v.NgayHetHan && (
                                  <span className="text-[10px] text-outline">
                                    HSD: {new Date(v.NgayHetHan).toLocaleDateString('vi-VN')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveVoucher}
                              className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-primary hover:bg-error hover:text-on-error text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                              Bỏ chọn
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={v.MaVoucher || v.Code}
                          onClick={() => handleSelectAndApplyVoucher(v)}
                          className={`p-3 rounded-xl transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                            isEligible
                              ? 'bg-surface-container-low hover:bg-surface-container'
                              : 'bg-surface-container-low/60 opacity-70'
                          }`}
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-secondary text-on-secondary flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-lg">local_offer</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs sm:text-sm text-secondary font-bold">{v.Code}</span>
                                <span className="px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed text-[10px] uppercase font-bold">
                                  Giảm {v.LoaiGiam === 'phantram' ? `${v.GiaTriGiam}%` : formatVND(v.GiaTriGiam)}
                                </span>
                              </div>
                              <span className="text-xs text-on-surface-variant truncate">
                                Đơn tối thiểu {formatVND(minReq)}
                              </span>
                              {!isEligible && (
                                <span className="text-[11px] text-tertiary">
                                  Mua thêm {formatVND(minReq - subtotal)}
                                </span>
                              )}
                              {v.NgayHetHan && (
                                <span className="text-[10px] text-outline">
                                  HSD: {new Date(v.NgayHetHan).toLocaleDateString('vi-VN')}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAndApplyVoucher(v);
                            }}
                            disabled={applyingVoucher}
                            className="px-2.5 py-1 rounded-lg bg-surface-container-lowest hover:bg-secondary hover:text-on-secondary text-secondary text-xs font-bold shadow-sm transition-colors shrink-0 cursor-pointer"
                          >
                            Áp dụng
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !appliedVoucher && (
                    <p className="text-xs text-outline italic text-center py-2">
                      Hiện chưa có voucher nào khả dụng
                    </p>
                  )
                )}
              </div>

              {/* Back to Catalog Link & Protection Banner */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-1.5 text-primary text-xs sm:text-sm font-semibold hover:underline"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Tiếp tục mua sắm các sản phẩm khác
                </Link>
                <div className="flex items-center gap-3 text-on-surface-variant text-xs">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-primary text-base">verified</span>
                    Cam kết chính hãng 100%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-secondary text-base">published_with_changes</span>
                    Đổi trả 30 ngày
                  </span>
                </div>
              </div>
            </div>

            {/* ── Right Column: Order Summary (35% Sticky Box) ── */}
            <div className="lg:col-span-4 flex flex-col gap-3 sticky top-28">
              <div className="bg-surface-container-lowest rounded-xl shadow-md p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                  <h2 className="text-sm sm:text-base text-on-surface font-bold">Tóm tắt đơn hàng</h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">
                    {selectedItems.length} món
                  </span>
                </div>

                {/* Summary Math Calculations */}
                <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-on-surface-variant">
                  <div className="flex items-center justify-between">
                    <span>Tạm tính ({selectedItems.length} sản phẩm):</span>
                    <span className="font-semibold text-on-surface">
                      {formatVND(subtotal)}
                    </span>
                  </div>

                  {appliedVoucher && (
                    <div className="flex items-center justify-between text-tertiary">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">sell</span>
                        Mã voucher ({appliedVoucher.Code || appliedVoucher.MaCode}):
                      </span>
                      <span className="font-bold">
                        -{formatVND(actualDiscount)}
                      </span>
                    </div>
                  )}

                  {onlineDiscount > 0 && (
                    <div className="flex items-center justify-between text-secondary">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                        Trợ giá thanh toán Online:
                      </span>
                      <span className="font-bold">
                        -{formatVND(onlineDiscount)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-surface-container flex flex-col gap-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs sm:text-sm font-bold text-on-surface">Tổng thanh toán:</span>
                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-extrabold text-tertiary tracking-tight">
                          {formatVND(total)}
                        </div>
                        <span className="text-[11px] text-outline block">
                          (Đã bao gồm VAT &amp; hóa đơn điện tử)
                        </span>
                      </div>
                    </div>

                    {(actualDiscount + onlineDiscount) > 0 && (
                      <div className="p-2 rounded-lg bg-surface-container-low text-on-surface-variant text-xs flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-secondary text-base">savings</span>
                        <span>
                          Tiết kiệm được <strong className="text-secondary font-bold">{formatVND(actualDiscount + onlineDiscount)}</strong> trong đơn hàng này
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Checkout Big CTA Button */}
                <button
                  id="checkout-btn"
                  type="button"
                  disabled={selectedItems.length === 0}
                  onClick={handleCheckout}
                  className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-center flex items-center justify-center gap-1.5 transition-all ${
                    selectedItems.length > 0
                      ? 'bg-tertiary hover:bg-tertiary-container text-on-tertiary shadow-md shadow-tertiary/25 hover:shadow-tertiary/40 active:scale-[0.99] cursor-pointer'
                      : 'bg-surface-container text-outline cursor-not-allowed opacity-60'
                  }`}
                >
                  <span>
                    {selectedItems.length > 0
                      ? `TIẾN HÀNH THANH TOÁN (${formatVND(total)})`
                      : 'VUI LÒNG CHỌN SẢN PHẨM'}
                  </span>
                  <span className="material-symbols-outlined text-base sm:text-lg">arrow_forward</span>
                </button>

                {/* Trust Badges & Safety */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-container text-xs text-on-surface-variant">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">sync_saved_locally</span>
                    <span>Bảo hành chính hãng 1 đổi 1 trong 30 ngày</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-base">lock</span>
                    <span>Bảo mật thanh toán SSL 256-bit chuẩn Quốc tế</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-outline text-base">inventory_2</span>
                    <span>Kiểm tra hàng trước khi nhận và thanh toán COD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CartPage;
