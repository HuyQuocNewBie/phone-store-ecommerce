import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Truck,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  User,
  Loader2,
  AlertCircle,
  Tag,
  ShoppingBag,
  Sparkles,
  Check,
  Package,
  X,
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/* ─────────────────────────────────────────────
   Helper: Format tiền VND
───────────────────────────────────────────── */
const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

/* ─────────────────────────────────────────────
   Inline styles cho stepper animation
───────────────────────────────────────────── */
const stepperStyles = `
  @keyframes stepperFadeIn {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes connectorGrow {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  .stepper-wrapper {
    animation: stepperFadeIn 0.55s cubic-bezier(0.22,1,0.36,1) both;
  }
  .stepper-connector {
    transform-origin: left;
    animation: connectorGrow 0.4s 0.3s cubic-bezier(0.22,1,0.36,1) both;
  }
`;

/* ─────────────────────────────────────────────
   CheckoutPage Component
───────────────────────────────────────────── */
const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. Items & Voucher từ location state (truyền từ CartPage)
  const initialItems = location.state?.items || null;
  const initialVoucher = location.state?.voucher || null;

  const [items, setItems] = useState(initialItems || []);
  const [loadingCart, setLoadingCart] = useState(!initialItems);

  // ── Voucher state — sync từ CartPage ──────────────────────
  // Nếu CartPage đã áp dụng voucher -> hiển thị mã + disabled
  // Nếu chưa có -> cho phép nhập mới
  const [appliedVoucher, setAppliedVoucher] = useState(initialVoucher);
  const [voucherInput, setVoucherInput] = useState(
    initialVoucher?.MaCode || initialVoucher?.code || ''
  );
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  // Trạng thái: voucher đến từ cart (đã áp dụng sẵn) hay người dùng tự nhập
  const voucherFromCart = Boolean(initialVoucher);

  // 2. Form Thông tin người nhận (bỏ province/district)
  const [formData, setFormData] = useState({
    fullName: user?.HoTen || user?.TenNguoiDung || '',
    phone:    user?.SoDienThoai || '',
    address:  user?.DiaChi || '',
    note:     '',
  });

  const [formErrors, setFormErrors] = useState({});

  // 3. Phương thức thanh toán (Mặc định COD)
  const [paymentMethod, setPaymentMethod] = useState('COD');

  // 4. Phí vận chuyển
  const [shippingFee, setShippingFee] = useState(0);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingRule, setShippingRule] = useState('Thời gian giao dự kiến: 1 - 3 ngày làm việc');
  const [isFreeship, setIsFreeship] = useState(false);

  // 5. Anti-spam / Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch cart nếu chưa có trong state
  useEffect(() => {
    if (!initialItems) {
      let isMounted = true;
      const fetchCart = async () => {
        setLoadingCart(true);
        try {
          const res = await api.get('/cart');
          if (isMounted) {
            setItems(res.data?.data || []);
          }
        } catch (err) {
          console.error('Lỗi khi tải giỏ hàng:', err);
          toast.error('Không thể tải giỏ hàng. Vui lòng thử lại.');
        } finally {
          if (isMounted) setLoadingCart(false);
        }
      };
      fetchCart();
      return () => { isMounted = false; };
    }
  }, [initialItems]);

  // Fetch danh sách voucher (chỉ khi chưa có voucher từ cart)
  useEffect(() => {
    if (!voucherFromCart) {
      api.get('/admin/vouchers')
        .then(res => {
          if (res.data?.success) {
            setAvailableVouchers(
              (res.data.data || []).filter(v => v.TrangThai === 'HoatDong' || !v.TrangThai)
            );
          }
        })
        .catch(() => {/* im lặng nếu lỗi */});
    }
  }, [voucherFromCart]);

  // Tính tổng tiền sản phẩm (Subtotal)
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.Gia) || 0) * (Number(item.SoLuong) || 1), 0);
  }, [items]);

  // Tính giảm giá voucher
  const discountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    const val = Number(appliedVoucher.value || appliedVoucher.GiaTriGiam || 0);
    if (appliedVoucher.LoaiGiamGia === 'PhanTram') {
      return Math.min(subtotal * (val / 100), subtotal);
    }
    return Math.min(val, subtotal);
  }, [appliedVoucher, subtotal]);

  // Tính phí vận chuyển đơn giản (không cần province/district)
  useEffect(() => {
    setCalculatingShipping(true);
    const timer = setTimeout(() => {
      if (subtotal >= 10000000) {
        setShippingFee(0);
        setIsFreeship(true);
        setShippingRule('Freeship cho đơn hàng ≥ 10.000.000đ');
      } else {
        setShippingFee(30000);
        setIsFreeship(false);
        setShippingRule('Giao hàng tiêu chuẩn 1 - 3 ngày');
      }
      setCalculatingShipping(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [subtotal]);

  // Tổng thanh toán
  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal + shippingFee - discountAmount);
  }, [subtotal, shippingFee, discountAmount]);

  /* ── Voucher handlers ──────────────────────────────────── */
  const handleApplyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;
    setApplyingVoucher(true);
    setTimeout(() => {
      const voucher = availableVouchers.find(v => v.MaCode === code);
      if (voucher) {
        if (voucher.DonToiThieu && subtotal < voucher.DonToiThieu) {
          toast.error(`Đơn hàng chưa đạt mức tối thiểu ${formatVND(voucher.DonToiThieu)}`);
        } else {
          setAppliedVoucher(voucher);
          setVoucherInput(voucher.MaCode);
          toast.success('Áp dụng mã giảm giá thành công!');
        }
      } else {
        toast.error('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
      }
      setApplyingVoucher(false);
    }, 400);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput('');
    toast.success('Đã gỡ mã giảm giá.');
  };

  /* ── Validation ────────────────────────────────────────── */
  const validateForm = () => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Vui lòng nhập họ tên người nhận';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự';
    }

    const phoneRegex = /(0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!formData.phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      errors.phone = 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 03/05/07/08/09)';
    }

    if (!formData.address.trim()) {
      errors.address = 'Vui lòng nhập số nhà, tên đường, phường/xã';
    } else if (formData.address.trim().length < 5) {
      errors.address = 'Địa chỉ chi tiết cần cụ thể hơn (tối thiểu 5 ký tự)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  /* ── Submit Order ──────────────────────────────────────── */
  const handleSubmitOrder = async (e) => {
    e?.preventDefault();
    if (isSubmitting) return;

    if (items.length === 0) {
      toast.error('Không có sản phẩm nào để đặt hàng!');
      return;
    }

    const isValid = validateForm();
    if (!isValid) {
      toast.error('Vui lòng kiểm tra lại thông tin nhận hàng.');
      return;
    }

    setIsSubmitting(true);

    try {
      const fullAddressString = formData.address.trim();

      const orderPayload = {
        TenNguoiNhan:   formData.fullName.trim(),
        receiver_name:  formData.fullName.trim(),
        SoDienThoai:    formData.phone.trim(),
        phone:          formData.phone.trim(),
        DiaChiGiaoHang: fullAddressString,
        shipping_address: fullAddressString,
        GhiChu:         formData.note.trim() || null,
        MaVoucher:      appliedVoucher?.MaCode || appliedVoucher?.code || null,
        items: items.map(it => ({
          MaSanPham: it.MaSanPham,
          SoLuong:   it.SoLuong,
        })),
        cart_item_ids: items.filter(it => it.MaGioHang).map(it => it.MaGioHang),
      };

      const response = await api.post('/orders', orderPayload);

      if (response.data && response.data.success) {
        toast.success('Đặt hàng thành công!');
        navigate('/checkout/success', {
          replace: true,
          state: {
            orderData: response.data.data,
            orderSummary: {
              items,
              subtotal,
              shippingFee,
              discount: discountAmount,
              total: totalAmount,
              paymentMethod: 'COD (Thanh toán khi nhận hàng)',
              formData: { ...formData, fullAddress: fullAddressString },
            },
          },
        });
      } else {
        throw new Error(response.data?.message || 'Không thể tạo đơn hàng');
      }
    } catch (err) {
      console.error('Lỗi khi đặt hàng:', err);
      const errorMessage =
        err.response?.data?.message || err.message || 'Đặt hàng thất bại. Vui lòng kiểm tra lại!';
      toast.error(errorMessage, { duration: 4500 });
      setIsSubmitting(false);
    }
  };

  /* ─────────────────────────────────────────────
     Loading / Empty states
  ───────────────────────────────────────────── */
  if (loadingCart) {
    return (
      <div className="min-h-screen bg-gray-50 text-slate-900 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
          <p className="text-slate-400 text-sm">Đang tải thông tin đơn hàng...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 text-slate-900 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-6 shadow-xl">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Chưa có sản phẩm để thanh toán</h1>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            Giỏ hàng của bạn đang trống hoặc bạn chưa chọn sản phẩm nào để đặt hàng.
          </p>
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white shadow-xl shadow-sky-500/25 transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại giỏ hàng</span>
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     Main Render
  ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Inject stepper animation styles */}
      <style>{stepperStyles}</style>

      <Navbar />

      <main className="flex-1 py-8 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* ── Centered Stepper Header ── */}
          <div className="flex flex-col items-center gap-3 py-2">
            {/* Breadcrumb nhỏ */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link to="/" className="hover:text-sky-400 transition-colors">Trang chủ</Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <Link to="/cart" className="hover:text-sky-400 transition-colors">Giỏ hàng</Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-200 font-medium">Thanh toán</span>
            </div>

            {/* Stepper lớn, căn giữa, có animation */}
            <div className="stepper-wrapper flex items-center gap-0">
              {/* Step 1 — Giỏ hàng (hoàn thành) */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-11 h-11 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-all">
                  <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                </div>
                <span className="text-xs font-semibold text-emerald-400 whitespace-nowrap">Giỏ hàng</span>
              </div>

              {/* Connector 1→2 */}
              <div className="flex items-center pb-5 mx-3">
                <div className="w-16 sm:w-24 h-0.5 bg-sky-500/50 stepper-connector rounded-full" />
              </div>

              {/* Step 2 — Thanh toán (đang ở) */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative w-11 h-11 rounded-full bg-sky-500/20 border-2 border-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/25 transition-all">
                  <span className="text-sm font-black text-sky-400">2</span>
                  {/* Pulse ring */}
                  <span className="absolute inset-0 rounded-full border-2 border-sky-400 animate-ping opacity-30 pointer-events-none" />
                </div>
                <span className="text-xs font-black text-sky-400 whitespace-nowrap">Thanh toán</span>
              </div>

              {/* Connector 2→3 */}
              <div className="flex items-center pb-5 mx-3">
                <div className="w-16 sm:w-24 h-0.5 bg-slate-700 rounded-full" />
              </div>

              {/* Step 3 — Hoàn tất (chưa đến) */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center transition-all">
                  <span className="text-sm font-bold text-slate-500">3</span>
                </div>
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Hoàn tất</span>
              </div>
            </div>
          </div>

          {/* ── Main Form Grid ── */}
          <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* ── CỘT TRÁI (7 cols) ── */}
            <div className="lg:col-span-7 space-y-6">

              {/* SECTION 1: Form thông tin người nhận */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-100">
                      1. Thông tin người nhận hàng
                    </h2>
                    <p className="text-xs text-slate-400">Vui lòng nhập chính xác để đơn hàng được giao nhanh nhất</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Họ tên & SĐT */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Họ và tên */}
                    <div>
                      <label htmlFor="fullName" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Họ và tên người nhận <span className="text-rose-400">*</span>
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className={`w-full px-4 py-3 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                          formErrors.fullName
                            ? 'border-rose-500/80 focus:ring-rose-500/30'
                            : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                        }`}
                      />
                      {formErrors.fullName && (
                        <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {formErrors.fullName}
                        </p>
                      )}
                    </div>

                    {/* Số điện thoại */}
                    <div>
                      <label htmlFor="phone" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Số điện thoại nhận hàng <span className="text-rose-400">*</span>
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Ví dụ: 0912345678"
                        className={`w-full px-4 py-3 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                          formErrors.phone
                            ? 'border-rose-500/80 focus:ring-rose-500/30'
                            : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                        }`}
                      />
                      {formErrors.phone && (
                        <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {formErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Địa chỉ chi tiết */}
                  <div>
                    <label htmlFor="address" className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Địa chỉ cụ thể (Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Ví dụ: 123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. HCM"
                      className={`w-full px-4 py-3 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                        formErrors.address
                          ? 'border-rose-500/80 focus:ring-rose-500/30'
                          : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                      }`}
                    />
                    {formErrors.address && (
                      <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {formErrors.address}
                      </p>
                    )}
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <label htmlFor="note" className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Ghi chú đơn hàng (Tuỳ chọn)
                    </label>
                    <textarea
                      id="note"
                      rows={2}
                      value={formData.note}
                      onChange={(e) => handleInputChange('note', e.target.value)}
                      placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                      className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Phí vận chuyển */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-100">
                      2. Phương thức vận chuyển
                    </h2>
                    <p className="text-xs text-slate-400">Tự động tính phí theo giá trị đơn hàng</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-5 h-5 rounded-full border-2 border-sky-500 flex items-center justify-center bg-sky-500/20">
                      <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>Giao hàng tiêu chuẩn</span>
                        {calculatingShipping ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                        ) : (isFreeship || shippingFee === 0) ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Freeship
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {calculatingShipping ? 'Đang tính phí vận chuyển...' : shippingRule}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {calculatingShipping ? (
                      <span className="text-xs text-slate-500">Đang tính...</span>
                    ) : shippingFee === 0 ? (
                      <span className="text-sm font-bold text-emerald-400">Miễn phí</span>
                    ) : (
                      <span className="text-sm font-bold text-slate-100">{formatVND(shippingFee)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Phương thức thanh toán */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-100">
                      3. Phương thức thanh toán
                    </h2>
                    <p className="text-xs text-slate-400">Mặc định thanh toán tiền mặt khi nhận hàng (COD)</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Option COD */}
                  <label
                    htmlFor="payment-cod"
                    className="relative flex items-start gap-4 p-4 rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/5 cursor-pointer transition-all hover:bg-emerald-500/10"
                  >
                    <input
                      id="payment-cod"
                      name="paymentMethod"
                      type="radio"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="mt-1 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-100">
                          Thanh toán khi nhận hàng (COD)
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Khuyên dùng
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Bạn chỉ phải thanh toán bằng tiền mặt cho nhân viên giao hàng sau khi đã kiểm tra kiện hàng. An tâm tuyệt đối 100%!
                      </p>
                    </div>
                  </label>

                  {/* Option VNPay (coming soon) */}
                  <div className="relative flex items-start gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-950/40 opacity-65 cursor-not-allowed">
                    <input
                      id="payment-vnpay"
                      name="paymentMethod"
                      type="radio"
                      disabled
                      className="mt-1 text-slate-600 cursor-not-allowed"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-300">
                          Chuyển khoản Ngân hàng / VNPay QR
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Sắp mở
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Quét mã QR qua ứng dụng ngân hàng hoặc ví điện tử (sẽ sớm có mặt trong bản nâng cấp tới).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ── CỘT PHẢI (5 cols): Kiện hàng + Voucher + Tổng tiền ── */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl backdrop-blur-xl">

                {/* Header: Kiện hàng (?) */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Package className="w-5 h-5 text-sky-400" />
                    <span>Kiện hàng</span>
                    <span
                      title="Danh sách sản phẩm sẽ được đóng gói và giao đến bạn"
                      className="w-5 h-5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 cursor-help hover:text-slate-200 transition-colors text-[11px] font-bold"
                    >
                      ?
                    </span>
                  </h3>
                  <Link
                    to="/cart"
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Sửa giỏ hàng
                  </Link>
                </div>

                {/* Danh sách sản phẩm — bố cục 2 Div */}
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      {/* Div 1 — Ảnh sản phẩm */}
                      <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] shrink-0 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center p-1">
                        {it.Anh ? (
                          <img
                            src={it.Anh}
                            alt={it.TenSanPham}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Package className="w-7 h-7 text-slate-600" />
                        )}
                      </div>

                      {/* Div 2 — Thông tin sản phẩm */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
                        {/* Dòng 1: Tên sản phẩm */}
                        <p className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-2 leading-snug">
                          {it.TenSanPham}
                        </p>

                        {/* Dòng 2: Màu | Dung lượng | Số lượng */}
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {[
                            it.MauSac   && `Màu: ${it.MauSac}`,
                            it.DungLuong && `Dung lượng: ${it.DungLuong}`,
                            `Số lượng: ${it.SoLuong}`,
                          ]
                            .filter(Boolean)
                            .join(' | ')}
                        </p>

                        {/* Giá sản phẩm — bottom-right */}
                        <div className="flex justify-end">
                          <p className="text-xs sm:text-sm font-black text-sky-400">
                            {formatVND(Number(it.Gia) * Number(it.SoLuong))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Mã Giảm Giá ── */}
                <div className="space-y-3 pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    <Tag className="w-4 h-4 text-violet-400" />
                    <span>Mã giảm giá</span>
                  </div>

                  {/* Nếu đã có voucher từ cart (hoặc đã áp dụng mới) */}
                  {appliedVoucher ? (
                    <div className="flex items-center gap-2">
                      {/* Ô input hiện mã — disabled */}
                      <input
                        type="text"
                        value={voucherInput}
                        readOnly
                        disabled
                        className="flex-1 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold tracking-wider cursor-not-allowed outline-none"
                      />
                      {/* Nút Đã áp dụng (disabled) */}
                      <button
                        type="button"
                        disabled
                        className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl cursor-not-allowed"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Đã áp dụng
                      </button>
                      {/* Nút gỡ (chỉ hiện nếu voucher không phải từ cart) */}
                      {!voucherFromCart && (
                        <button
                          type="button"
                          onClick={handleRemoveVoucher}
                          className="shrink-0 p-2.5 text-slate-500 hover:text-rose-400 transition-colors rounded-xl bg-slate-800 border border-slate-700"
                          title="Gỡ mã giảm giá"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Chưa có voucher — cho phép nhập */
                    <div className="flex gap-2">
                      <input
                        id="voucher-input-checkout"
                        type="text"
                        value={voucherInput}
                        onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                        placeholder="Nhập mã voucher..."
                        className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all tracking-wider"
                      />
                      <button
                        id="apply-voucher-checkout-btn"
                        type="button"
                        onClick={handleApplyVoucher}
                        disabled={!voucherInput.trim() || applyingVoucher}
                        className="shrink-0 px-4 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-400 text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {applyingVoucher ? (
                          <span className="inline-block w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                        ) : (
                          'Áp dụng'
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Chi tiết tính tiền ── */}
                <div className="space-y-3 pt-1 border-t border-slate-800 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Tạm tính ({items.length} sản phẩm):</span>
                    <span className="font-semibold text-slate-200">{formatVND(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-slate-400 items-center">
                    <span className="flex items-center gap-1.5">
                      Phí vận chuyển:
                      {calculatingShipping && <Loader2 className="w-3 h-3 animate-spin text-sky-400" />}
                    </span>
                    <span className={shippingFee === 0 ? 'text-emerald-400 font-semibold' : 'text-slate-200 font-semibold'}>
                      {shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Giảm giá voucher:</span>
                      <span className="font-semibold">-{formatVND(discountAmount)}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-800 flex justify-between items-baseline">
                    <div>
                      <p className="text-base font-bold text-slate-100">Tổng thanh toán:</p>
                      <p className="text-[11px] text-slate-400">Đã bao gồm VAT và mọi chi phí</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-violet-300">
                        {formatVND(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Nút Xác Nhận Đặt Hàng (chỉ text, không icon) ── */}
                <div className="space-y-3 pt-1">
                  <button
                    id="submit-order-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center transition-all shadow-xl ${
                      isSubmitting
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-75'
                        : 'bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2 text-sky-400" />
                        Đang xử lý đặt hàng...
                      </>
                    ) : (
                      'Xác Nhận Đặt Hàng'
                    )}
                  </button>

                  <p className="text-center text-[11px] text-slate-400 leading-relaxed">
                    Bằng việc nhấn "Xác Nhận Đặt Hàng", bạn đồng ý với các{' '}
                    <span className="text-sky-400 underline cursor-pointer">Điều khoản dịch vụ</span> và{' '}
                    <span className="text-sky-400 underline cursor-pointer">Chính sách bảo mật</span> của SmartZone.
                  </p>
                </div>

                {/* Cam kết an tâm */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  {[
                    { icon: ShieldCheck, text: 'Kiểm tra hàng trước khi thanh toán' },
                    { icon: Truck,       text: 'Giao hàng siêu tốc 1 - 3 ngày' },
                    { icon: Sparkles,    text: 'Cam kết 100% sản phẩm chính hãng' },
                  ].map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-slate-400">
                      <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

          </form>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
