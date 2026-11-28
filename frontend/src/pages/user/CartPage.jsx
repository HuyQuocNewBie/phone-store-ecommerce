import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import DeleteConfirmModal from '../../components/user/DeleteConfirmModal';
import MultiVoucherDrawer from '../../components/user/MultiVoucherDrawer';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';

const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, cartLoading, updateQuantity, removeFromCart } = useCart();

  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [isLoading, setIsLoading]                 = useState(true);
  const [selectedIds, setSelectedIds]             = useState([]);

  // ── Multi-voucher state (1 mã Giảm giá đơn + 1 mã Freeship) ──
  const [appliedGiamGiaDon, setAppliedGiamGiaDon] = useState(null);
  const [appliedFreeShip, setAppliedFreeShip]     = useState(null);
  const [soTienGiamDon, setSoTienGiamDon]         = useState(0);
  const [soTienGiamShip, setSoTienGiamShip]       = useState(0);
  const [voucherDrawerOpen, setVoucherDrawerOpen] = useState(false);

  const [modalOpen, setModalOpen]                 = useState(false);
  const [modalTarget, setModalTarget]             = useState(null);
  const hasInitializedSelection                   = useRef(false);
  const hasAppliedPrefill                         = useRef(false);

  useEffect(() => {
    fetchVouchers();
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
      const res = await api.get('/vouchers/available');
      if (res.data?.success && res.data?.data) {
        const list = Array.isArray(res.data.data.all)
          ? res.data.data.all
          : [
              ...(Array.isArray(res.data.data.giamGiaDon) ? res.data.data.giamGiaDon : []),
              ...(Array.isArray(res.data.data.freeShip) ? res.data.data.freeShip : []),
            ];
        setAvailableVouchers(list);
        return;
      }
    } catch {
      // Fallback sang /vouchers/active
    }

    try {
      const res = await api.get('/vouchers/active');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAvailableVouchers(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách voucher:', err);
    }
  };

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
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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

  const openDeleteModal = (itemId = null) => {
    setModalTarget(itemId);
    setModalOpen(true);
  };

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
    } catch {
      toast.error('Xóa sản phẩm thất bại.');
    } finally {
      setModalTarget(null);
      setModalOpen(false);
    }
  };

  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.id));
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + Number(item.Gia) * Number(item.SoLuong),
    0
  );
  // Phí vận chuyển tạm tính: Freeship đơn >= 10tr, ngược lại tạm tính 35.000đ
  const estimatedShippingFee =
    selectedItems.length === 0 ? 0 : subtotal >= 10000000 ? 0 : 35000;

  const totalDiscount = soTienGiamDon + soTienGiamShip;
  const total = Math.max(0, subtotal + estimatedShippingFee - totalDiscount);

  // Áp dụng kết quả từ POST /api/v1/vouchers/apply-multi
  const handleApplyMultiResult = useCallback((data) => {
    setSoTienGiamDon(Number(data?.soTienGiamDon) || 0);
    setSoTienGiamShip(Number(data?.soTienGiamShip) || 0);
    setAppliedGiamGiaDon(data?.vouchers?.giamGiaDon || null);
    setAppliedFreeShip(data?.vouchers?.freeShip || null);
  }, []);

  // Gọi POST /api/v1/vouchers/apply-multi với danh sách mã
  const evaluateCodesWithApi = useCallback(
    async (codes, currentSubtotal, currentShipFee, silent = true) => {
      if (!codes || codes.length === 0 || currentSubtotal <= 0) {
        setSoTienGiamDon(0);
        setSoTienGiamShip(0);
        if (!codes || codes.length === 0) {
          setAppliedGiamGiaDon(null);
          setAppliedFreeShip(null);
        }
        return;
      }

      try {
        const res = await api.post('/vouchers/apply-multi', {
          codes,
          tongTienHang: currentSubtotal,
          phiShip: currentShipFee,
        });
        if (res.data?.success && res.data.data) {
          handleApplyMultiResult(res.data.data);
          if (!silent) {
            toast.success(res.data.message || 'Áp dụng mã giảm giá thành công!');
          }
        }
      } catch (err) {
        if (!silent) {
          toast.error(err.response?.data?.message || 'Không thể áp dụng mã giảm giá');
        }
      }
    },
    [handleApplyMultiResult]
  );

  // Tự động áp dụng mã prefill từ trang Kho Voucher (nếu có)
  useEffect(() => {
    const prefill = location.state?.prefillVoucherCode;
    if (prefill && subtotal > 0 && !hasAppliedPrefill.current) {
      hasAppliedPrefill.current = true;
      evaluateCodesWithApi([prefill], subtotal, estimatedShippingFee, false);
    }
  }, [location.state, subtotal, estimatedShippingFee, evaluateCodesWithApi]);

  // Tự động kiểm tra lại điều kiện & tính lại mức giảm khi subtotal hoặc phí ship thay đổi
  const orderCodeKey = appliedGiamGiaDon?.Code || '';
  const shipCodeKey = appliedFreeShip?.Code || '';

  useEffect(() => {
    if (!orderCodeKey && !shipCodeKey) return;

    if (subtotal <= 0) {
      setSoTienGiamDon(0);
      setSoTienGiamShip(0);
      return;
    }

    const validCodes = [];
    const removedMessages = [];

    if (appliedGiamGiaDon) {
      const minReq = Number(appliedGiamGiaDon.GiaTriToiThieu || 0);
      if (subtotal < minReq) {
        setAppliedGiamGiaDon(null);
        setSoTienGiamDon(0);
        removedMessages.push(
          `Mã ${appliedGiamGiaDon.Code} đã gỡ vì đơn chưa đạt tối thiểu ${formatVND(minReq)}`
        );
      } else {
        validCodes.push(appliedGiamGiaDon.Code);
      }
    }

    if (appliedFreeShip) {
      const minReq = Number(appliedFreeShip.GiaTriToiThieu || 0);
      if (subtotal < minReq) {
        setAppliedFreeShip(null);
        setSoTienGiamShip(0);
        removedMessages.push(
          `Mã ${appliedFreeShip.Code} đã gỡ vì đơn chưa đạt tối thiểu ${formatVND(minReq)}`
        );
      } else {
        validCodes.push(appliedFreeShip.Code);
      }
    }

    if (removedMessages.length > 0) {
      removedMessages.forEach((m) => toast(m, { icon: '⚠️' }));
    }

    if (validCodes.length > 0) {
      evaluateCodesWithApi(validCodes, subtotal, estimatedShippingFee, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, estimatedShippingFee, orderCodeKey, shipCodeKey]);

  // Gỡ riêng từng mã voucher
  const handleRemoveSingleVoucher = async (group) => {
    if (group === 'GiamGiaDon') {
      const remaining = appliedFreeShip?.Code ? [appliedFreeShip.Code] : [];
      setAppliedGiamGiaDon(null);
      setSoTienGiamDon(0);
      toast.success('Đã gỡ mã giảm giá đơn hàng.');
      if (remaining.length > 0) {
        await evaluateCodesWithApi(remaining, subtotal, estimatedShippingFee, true);
      }
    } else {
      const remaining = appliedGiamGiaDon?.Code ? [appliedGiamGiaDon.Code] : [];
      setAppliedFreeShip(null);
      setSoTienGiamShip(0);
      toast.success('Đã gỡ mã miễn phí vận chuyển.');
      if (remaining.length > 0) {
        await evaluateCodesWithApi(remaining, subtotal, estimatedShippingFee, true);
      }
    }
  };

  const handleOpenVoucherDrawer = () => {
    if (selectedItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm trước khi chọn mã giảm giá');
      return;
    }
    setVoucherDrawerOpen(true);
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    navigate('/checkout', {
      state: {
        items: selectedItems,
        voucher: appliedGiamGiaDon || appliedFreeShip || null,
        vouchers: {
          giamGiaDon: appliedGiamGiaDon,
          freeShip: appliedFreeShip,
        },
        voucherResult: {
          soTienGiamDon,
          soTienGiamShip,
        },
      },
    });
  };

  const appliedCount = (appliedGiamGiaDon ? 1 : 0) + (appliedFreeShip ? 1 : 0);

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
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-surface-container-high rounded-full -z-0">
                  <div className="h-full w-0 bg-primary rounded-full transition-all duration-500" />
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md ring-4 ring-primary-fixed/40">
                    <span className="material-symbols-outlined text-xl">shopping_cart</span>
                  </div>
                  <div className="text-center mt-unit-2xs">
                    <span className="font-body-md text-body-md font-bold text-primary block leading-tight">1. Giỏ hàng</span>
                    <span className="font-label-spec text-label-spec uppercase tracking-wider text-outline block">(0 sản phẩm)</span>
                  </div>
                </div>
                <div className="relative z-10 flex flex-col items-center opacity-65">
                  <div className="w-12 h-12 rounded-full bg-surface-container-lowest text-outline flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-xl">payment</span>
                  </div>
                  <div className="text-center mt-unit-2xs">
                    <span className="font-body-md text-body-md font-medium text-on-surface-variant block leading-tight">2. Thanh toán</span>
                    <span className="font-label-spec text-label-spec uppercase tracking-wider text-outline block">Địa chỉ &amp; Phương thức</span>
                  </div>
                </div>
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
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none -z-0" />
              <div className="absolute -bottom-24 right-1/4 w-72 h-72 bg-secondary-fixed/30 rounded-full blur-2xl pointer-events-none -z-0" />

              <div className="relative z-10 w-44 h-44 mb-unit-lg flex items-center justify-center">
                <svg className="w-full h-full" fill="none" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
                  <ellipse className="text-surface-container-high" cx="80" cy="140" fill="currentColor" rx="55" ry="10" />
                  <circle className="text-secondary" cx="34" cy="45" fill="currentColor" opacity="0.6" r="4" />
                  <circle className="text-primary-container" cx="128" cy="48" fill="currentColor" opacity="0.5" r="3" />
                  <circle className="text-tertiary-container" cx="138" cy="100" fill="currentColor" opacity="0.4" r="5" />
                  <path className="text-primary-fixed-dim" d="M42 98L44 94L48 96L46 100Z" fill="currentColor" />
                  <path className="text-secondary-container animate-pulse" d="M118 30L121 38L129 41L121 44L118 52L115 44L107 41L115 38L118 30Z" fill="currentColor" />
                  <rect className="text-surface-container-low" fill="currentColor" height="66" rx="16" width="88" x="36" y="58" />
                  <path className="text-surface-container" d="M46 64C46 59.5817 49.5817 56 54 56H106C110.418 56 114 59.5817 114 64V76H46V64Z" fill="currentColor" />
                  <line className="text-outline-variant" stroke="currentColor" strokeDasharray="4 4" strokeLinecap="round" strokeWidth="2" x1="56" x2="104" y1="84" y2="84" />
                  <line className="text-outline-variant" stroke="currentColor" strokeDasharray="4 4" strokeLinecap="round" strokeWidth="2" x1="56" x2="88" y1="98" y2="98" />
                  <path className="text-primary" d="M58 60V42C58 29.8497 67.8497 20 80 20C92.1503 20 102 29.8497 102 42V60" stroke="currentColor" strokeLinecap="round" strokeWidth="6" />
                  <circle className="text-on-primary-container" cx="58" cy="60" fill="currentColor" r="4" />
                  <circle className="text-on-primary-container" cx="102" cy="60" fill="currentColor" r="4" />
                  <circle className="text-primary" cx="98" cy="106" fill="currentColor" r="18" />
                  <circle className="text-surface-container-lowest" cx="98" cy="106" fill="currentColor" r="14" />
                  <text className="text-primary" fill="currentColor" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="16" fontWeight="800" textAnchor="middle" x="98" y="112">?</text>
                </svg>
              </div>

              <h1 className="relative z-10 font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg text-on-surface font-extrabold tracking-tight mb-unit-xs">
                Giỏ hàng của bạn đang trống
              </h1>
              <p className="relative z-10 font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto mb-unit-xl">
                Chưa có thiết bị nào được lưu vào danh sách. Hàng ngàn mẫu smartphone chính hãng, flagship đỉnh cao và phụ kiện cao cấp đang sẵn sàng trao tay bạn!
              </p>

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
        onClose={() => {
          setModalOpen(false);
          setModalTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa"
        itemCount={modalTarget ? 1 : selectedIds.length}
        message={
          modalTarget
            ? 'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không?'
            : `Bạn có chắc chắn muốn xóa ${selectedIds.length} sản phẩm đã chọn không?`
        }
      />

      {/* ── Ngăn kéo chọn Đa Voucher phủ kín màn hình ── */}
      <MultiVoucherDrawer
        isOpen={voucherDrawerOpen}
        onClose={() => setVoucherDrawerOpen(false)}
        availableVouchers={availableVouchers}
        orderSubtotal={subtotal}
        shippingFee={estimatedShippingFee}
        initialGiamGiaDon={appliedGiamGiaDon}
        initialFreeShip={appliedFreeShip}
        onApplySuccess={handleApplyMultiResult}
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
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-surface-container-high z-0" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 h-[2px] bg-primary z-0 transition-all duration-500" />

              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md shadow-primary/25">
                  <span className="material-symbols-outlined text-base sm:text-lg">shopping_cart</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-xs sm:text-sm font-bold text-primary">1. Giỏ hàng</span>
                  <span className="text-[11px] text-on-surface-variant">({cartItems.length} sản phẩm)</span>
                </div>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface-container-lowest text-outline border border-outline-variant flex items-center justify-center text-xs sm:text-sm font-semibold">
                  2
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-xs sm:text-sm font-semibold text-outline">2. Thanh toán</span>
                  <span className="text-[11px] text-outline">Địa chỉ &amp; Phương thức</span>
                </div>
              </div>

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

          {/* 2. Main Grid: 65% Left (Products + Multi-Voucher Trigger) / 35% Right (Order Summary) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-unit-lg items-start">
            {/* ── Left Column (span-8) ── */}
            <div className="lg:col-span-8 flex flex-col gap-unit-lg">
              {/* Table Toolbar */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm p-3 sm:p-4 flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="check-all"
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
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
                  const discountPercent =
                    item.GiaGoc && Number(item.GiaGoc) > Number(item.Gia)
                      ? Math.round((1 - Number(item.Gia) / Number(item.GiaGoc)) * 100)
                      : null;

                  return (
                    <div
                      key={item.id}
                      className={`p-unit-sm sm:p-unit-md flex flex-col md:flex-row items-start md:items-center justify-between gap-unit-md transition-colors ${
                        isSelected ? 'bg-primary-fixed/10' : 'hover:bg-surface-container-low/50'
                      }`}
                    >
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
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = 'none';
                              }}
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

                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <h3
                            onClick={() => navigate(`/products/${item.MaSanPham}`)}
                            className="text-sm sm:text-base font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug"
                          >
                            {item.TenSanPham}
                          </h3>

                          <p className="text-xs text-on-surface-variant">
                            <span className="text-outline">Màu:</span>{' '}
                            <span className="font-medium text-on-surface">{item.MauSac || 'N/A'}</span>
                            <span className="mx-1 text-outline">·</span>
                            <span className="text-outline">Dung lượng:</span>{' '}
                            <span className="font-medium text-on-surface">{item.DungLuong || 'N/A'}</span>
                          </p>

                          {item.TonKho <= 3 && (
                            <p className="text-xs text-error font-medium flex items-center gap-1 pt-0.5">
                              <span className="material-symbols-outlined text-sm">inventory</span>
                              Chỉ còn {item.TonKho} sản phẩm trong kho
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-unit-md sm:gap-unit-lg w-full md:w-auto pt-unit-xs md:pt-0 border-t md:border-t-0 border-surface-container">
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

              {/* ── Khối SmartZone Đa Voucher (Trigger mở Ngăn kéo phủ kín màn hình) ── */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">confirmation_number</span>
                    <h3 className="text-sm sm:text-base text-on-surface font-bold">
                      SmartZone Voucher
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-fixed text-primary">
                      Áp dụng đồng thời 2 mã
                    </span>
                  </div>
                  <span className="text-xs text-on-surface-variant">
                    1 mã Giảm giá đơn + 1 mã Freeship
                  </span>
                </div>

                {/* Nút bấm mở Modal/Drawer Đa Voucher */}
                <button
                  id="open-voucher-drawer-btn"
                  type="button"
                  onClick={handleOpenVoucherDrawer}
                  className="w-full p-3.5 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary-fixed/15 hover:bg-primary-fixed/25 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-lg">local_offer</span>
                    </div>
                    <div className="text-left min-w-0">
                      <span className="block text-sm font-bold text-primary group-hover:underline">
                        Chọn hoặc nhập mã giảm giá
                      </span>
                      <span className="block text-xs text-on-surface-variant truncate">
                        {appliedCount > 0
                          ? `Đang áp dụng ${appliedCount} mã ưu đãi (${[appliedGiamGiaDon?.Code, appliedFreeShip?.Code].filter(Boolean).join(' + ')})`
                          : `Có ${availableVouchers.length} mã giảm giá & Freeship đang sẵn sàng`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-primary font-bold text-xs shrink-0">
                    <span>{appliedCount > 0 ? 'Thay đổi' : 'Chọn mã'}</span>
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </div>
                </button>

                {/* Hiển thị tách bạch các mã đã áp dụng */}
                {appliedCount > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {appliedGiamGiaDon && (
                      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-base">sell</span>
                          </span>
                          <div className="min-w-0">
                            <span className="block text-xs font-extrabold text-blue-700 font-mono truncate">
                              {appliedGiamGiaDon.Code}
                            </span>
                            <span className="block text-[11px] text-slate-600 font-semibold">
                              Giảm sản phẩm: -{formatVND(soTienGiamDon)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleVoucher('GiamGiaDon')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Gỡ mã giảm giá đơn hàng"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    )}

                    {appliedFreeShip && (
                      <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-base">local_shipping</span>
                          </span>
                          <div className="min-w-0">
                            <span className="block text-xs font-extrabold text-emerald-700 font-mono truncate">
                              {appliedFreeShip.Code}
                            </span>
                            <span className="block text-[11px] text-slate-600 font-semibold">
                              {estimatedShippingFee === 0
                                ? 'Đơn từ 10tr đã freeship'
                                : `Giảm phí ship: -${formatVND(soTienGiamShip)}`}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleVoucher('FreeShip')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Gỡ mã miễn phí vận chuyển"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    )}
                  </div>
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

            {/* ── Right Column: Order Summary (Sticky Box) ── */}
            <div className="lg:col-span-4 flex flex-col gap-3 sticky top-28">
              <div className="bg-surface-container-lowest rounded-xl shadow-md p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                  <h2 className="text-sm sm:text-base text-on-surface font-bold">Tóm tắt đơn hàng</h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">
                    {selectedItems.length} món
                  </span>
                </div>

                {/* Summary Math Calculations — Tách bạch 2 dòng giảm giá */}
                <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-on-surface-variant">
                  <div className="flex items-center justify-between">
                    <span>Tạm tính ({selectedItems.length} sản phẩm):</span>
                    <span className="font-semibold text-on-surface">
                      {formatVND(subtotal)}
                    </span>
                  </div>

                  {selectedItems.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Phí vận chuyển (tạm tính):</span>
                      <span
                        className={`font-semibold ${
                          estimatedShippingFee === 0 ? 'text-secondary' : 'text-on-surface'
                        }`}
                      >
                        {estimatedShippingFee === 0 ? 'Miễn phí' : formatVND(estimatedShippingFee)}
                      </span>
                    </div>
                  )}

                  {/* Dòng 1: Giảm giá sản phẩm */}
                  {(appliedGiamGiaDon || soTienGiamDon > 0) && (
                    <div className="flex items-center justify-between text-tertiary">
                      <span className="flex items-center gap-1 min-w-0">
                        <span className="material-symbols-outlined text-base shrink-0">sell</span>
                        <span className="truncate">
                          Giảm giá sản phẩm
                          {appliedGiamGiaDon?.Code ? ` (${appliedGiamGiaDon.Code})` : ''}:
                        </span>
                      </span>
                      <span className="font-bold shrink-0 ml-2">
                        -{formatVND(soTienGiamDon)}
                      </span>
                    </div>
                  )}

                  {/* Dòng 2: Giảm phí vận chuyển */}
                  {(appliedFreeShip || soTienGiamShip > 0) && (
                    <div className="flex items-center justify-between text-secondary">
                      <span className="flex items-center gap-1 min-w-0">
                        <span className="material-symbols-outlined text-base shrink-0">local_shipping</span>
                        <span className="truncate">
                          Giảm phí vận chuyển
                          {appliedFreeShip?.Code ? ` (${appliedFreeShip.Code})` : ''}:
                        </span>
                      </span>
                      <span className="font-bold shrink-0 ml-2">
                        -{formatVND(soTienGiamShip)}
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

                    {totalDiscount > 0 && (
                      <div className="p-2 rounded-lg bg-surface-container-low text-on-surface-variant text-xs flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-secondary text-base">savings</span>
                        <span>
                          Tiết kiệm được{' '}
                          <strong className="text-secondary font-bold">
                            {formatVND(totalDiscount)}
                          </strong>{' '}
                          trong đơn hàng này
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
