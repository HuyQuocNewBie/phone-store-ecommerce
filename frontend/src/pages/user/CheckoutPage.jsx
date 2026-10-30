import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

/* ─────────────────────────────────────────────
   Helper: Format tiền VND
───────────────────────────────────────────── */
const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

/* ─────────────────────────────────────────────
   CheckoutPage Component - Refactored
───────────────────────────────────────────── */
const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearCart, setCartItems } = useCart();

  // 1. Items & Voucher từ location state (truyền từ CartPage)
  const initialItems = location.state?.items || location.state?.selectedCartItems || null;
  const initialVoucher = location.state?.voucher || null;

  const [items, setItems] = useState(initialItems || []);
  const [loadingCart, setLoadingCart] = useState(!initialItems);

  // ── Voucher state — sync từ CartPage ──────────────────────
  const [appliedVoucher, setAppliedVoucher] = useState(initialVoucher);
  const [voucherInput, setVoucherInput] = useState(
    initialVoucher?.MaCode || initialVoucher?.code || ''
  );
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  const voucherFromCart = Boolean(initialVoucher);

  // 2. Form Thông tin người nhận hàng
  const [formData, setFormData] = useState({
    fullName: user?.TaiKhoan || user?.HoTen || user?.TenNguoiDung || '',
    phone:    user?.SoDienThoai || '',
    address:  user?.DiaChi || '',
    note:     '',
  });

  const [formErrors, setFormErrors] = useState({});

  // Cập nhật formData nếu user profile tải sau khi mount
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.TaiKhoan || user.HoTen || user.TenNguoiDung || '',
        phone:    prev.phone || user.SoDienThoai || '',
        address:  prev.address || user.DiaChi || '',
      }));
    }
  }, [user]);

  // Sổ địa chỉ người dùng
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');

  // Tự động gọi API GET /api/v1/addresses để nạp danh sách địa chỉ nhận hàng của user
  useEffect(() => {
    let isMounted = true;
    const fetchAddresses = async () => {
      try {
        setLoadingAddresses(true);
        const res = await api.get('/addresses');
        if (isMounted && res.data?.success) {
          setAddresses(res.data.data || []);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách sổ địa chỉ:', err);
      } finally {
        if (isMounted) setLoadingAddresses(false);
      }
    };

    if (user) {
      fetchAddresses();
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Xử lý khi người dùng chọn 1 địa chỉ từ Dropdown
  const handleAddressSelect = (e) => {
    const addressId = e.target.value;
    setSelectedAddressId(addressId);
    if (!addressId) return;

    const selectedAddr = addresses.find((addr) => String(addr.MaDiaChi) === String(addressId));
    if (selectedAddr) {
      // 1. Họ và tên: user.TaiKhoan (hoặc user.HoTen)
      const recipientName = user?.TaiKhoan || user?.HoTen || selectedAddr.TaiKhoan || '';

      // 2. Số điện thoại: SoDienThoai của địa chỉ đó
      const recipientPhone = selectedAddr.SoDienThoai || user?.SoDienThoai || '';

      // 3. Địa chỉ giao hàng: Chuỗi địa chỉ chi tiết đầy đủ (DiaChiNha, PhuongXa, QuanHuyen, TinhThanh)
      const addressParts = [
        selectedAddr.DiaChiNha,
        selectedAddr.PhuongXa,
        selectedAddr.QuanHuyen,
        selectedAddr.TinhThanh,
      ].filter((part) => part && String(part).trim() !== '');
      const fullAddress = addressParts.join(', ');

      setFormData((prev) => ({
        ...prev,
        fullName: recipientName || prev.fullName,
        phone: recipientPhone || prev.phone,
        address: fullAddress,
      }));

      // Xoá thông báo lỗi validation nếu có
      setFormErrors((prev) => ({
        ...prev,
        ...(recipientName ? { fullName: null } : {}),
        ...(recipientPhone ? { phone: null } : {}),
        ...(fullAddress ? { address: null } : {}),
      }));
    }
  };

  // 3. Phương thức thanh toán (DUY NHẤT COD)
  const [paymentMethod, setPaymentMethod] = useState('COD');

  // 4. Phí vận chuyển (null = chưa xác định khi chưa có địa chỉ, hiện "-- đ")
  const [shippingFee, setShippingFee] = useState(null);

  // 5. Loading / Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch cart nếu chưa có trong location.state
  useEffect(() => {
    if (!initialItems) {
      let isMounted = true;
      const fetchCart = async () => {
        setLoadingCart(true);
        try {
          const res = await api.get('/cart');
          if (isMounted) {
            const raw = res.data?.data;
            const fetched = Array.isArray(raw) ? raw : (raw?.items || []);
            setItems(fetched);
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

  // Fetch danh sách voucher còn hiệu lực
  useEffect(() => {
    if (!voucherFromCart) {
      api.get('/vouchers/active')
        .then((res) => {
          if (res.data?.success) {
            setAvailableVouchers(res.data.data || []);
          }
        })
        .catch(() => {});
    }
  }, [voucherFromCart]);

  // Tính tổng tiền sản phẩm (Subtotal)
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = Number(item.Gia || item.DonGia || 0);
      const qty = Number(item.SoLuong || 1);
      return sum + price * qty;
    }, 0);
  }, [items]);

  // Tính giảm giá voucher
  const discountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    const val = Number(appliedVoucher.value || appliedVoucher.GiaTriGiam || 0);
    if (appliedVoucher.LoaiGiamGia === 'PhanTram' || appliedVoucher.LoaiGiam === 'phantram') {
      return Math.min(subtotal * (val / 100), subtotal);
    }
    return Math.min(val, subtotal);
  }, [appliedVoucher, subtotal]);

  // Tính phí vận chuyển gốc tự động theo địa chỉ
  useEffect(() => {
    if (subtotal >= 10000000) {
      // Freeship cho đơn từ 10 triệu
      setShippingFee(0);
    } else {
      const addr = formData.address.trim().toLowerCase();
      if (addr === '') {
        // Chưa nhập địa chỉ → chưa xác định
        setShippingFee(null);
      } else if (
        addr.includes('hcm') ||
        addr.includes('hồ chí minh') ||
        addr.includes('tphcm') ||
        addr.includes('tp.hcm')
      ) {
        setShippingFee(20000);
      } else {
        setShippingFee(35000);
      }
    }
  }, [subtotal, formData.address]);

  // Tổng thanh toán (shippingFee null coi như 0 để hiển thị số dương chính xác)
  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal + (shippingFee ?? 0) - discountAmount);
  }, [subtotal, shippingFee, discountAmount]);

  /* ── Voucher handlers ──────────────────────────────────── */
  const handleApplyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;
    setApplyingVoucher(true);
    setTimeout(() => {
      const voucher = availableVouchers.find((v) => v.MaCode === code);
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
      errors.fullName = 'Vui lòng nhập họ và tên khách hàng';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự';
    }

    const phoneRegex = /(0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!formData.phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại liên hệ';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      errors.phone = 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)';
    }

    if (!formData.address.trim()) {
      errors.address = 'Vui lòng nhập số nhà, tên đường / địa chỉ giao hàng';
    } else if (formData.address.trim().length < 5) {
      errors.address = 'Địa chỉ cần cụ thể hơn (tối thiểu 5 ký tự)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'address') {
      setSelectedAddressId('');
    }
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  /* ── Submit / Create Order ──────────────────────────────────────── */
  const handleCreateOrder = async (e) => {
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
        shippingFee:    shippingFee ?? 0,
        shipping_method: 'Giao hàng tiêu chuẩn',
        items: items.map((it) => ({
          MaSanPham: it.MaSanPham,
          SoLuong:   it.SoLuong,
        })),
        cart_item_ids: items.filter((it) => it.MaGioHang).map((it) => it.MaGioHang),
      };

      const response = await api.post('/orders', orderPayload);

      if (response.data && response.data.success) {
        // 1. Xóa giỏ hàng
        if (typeof clearCart === 'function') {
          clearCart();
        }
        if (typeof setCartItems === 'function') {
          setCartItems([]);
        }

        // 2. Hiệu ứng loading spinner + delay 1s theo yêu cầu
        await new Promise((r) => setTimeout(r, 1000));

        // 3. Thông báo và chuyển hướng sang /checkout/success
        toast.success('Đặt hàng thành công!');
        navigate('/checkout/success', {
          replace: true,
          state: {
            orderData: response.data.data,
            orderSummary: {
              items,
              subtotal,
              shippingFee,
              shippingMethod: 'Giao hàng tiêu chuẩn',
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
      <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center py-24 gap-unit-md">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-on-surface-variant font-body-md text-body-md">Đang tải thông tin đơn hàng...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center py-20 px-gutter-desktop text-center">
          <div className="w-20 h-20 rounded-3xl bg-surface-container-high flex items-center justify-center text-primary mb-unit-lg shadow-sm">
            <span className="material-symbols-outlined text-4xl">shopping_bag</span>
          </div>
          <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-unit-2xs">
            Chưa có sản phẩm để thanh toán
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-unit-lg">
            Giỏ hàng của bạn đang trống hoặc bạn chưa chọn sản phẩm nào để đặt hàng.
          </p>
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="px-unit-lg py-unit-sm rounded-xl font-body-md font-bold bg-primary hover:bg-primary-container text-on-primary shadow-md transition-all flex items-center gap-unit-xs"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span>Quay lại giỏ hàng</span>
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  const isFormIncomplete =
    !formData.fullName.trim() ||
    !formData.phone.trim() ||
    !formData.address.trim();

  /* ─────────────────────────────────────────────
     Main Render
  ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased flex flex-col">
      <Navbar />

      <main className="w-full bg-surface min-h-screen py-unit-xl">
        <div className="flex flex-col w-full">
          <div className="w-full max-w-container-max mx-auto px-gutter-desktop">

            {/* ── Breadcrumb & Security Badge (cùng hàng) ── */}
            <div className="flex items-center justify-between mb-unit-xl">
              <nav aria-label="Breadcrumb" className="flex items-center gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm">
                <Link to="/" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
                  <span className="material-symbols-outlined text-base leading-none">home</span>
                  Trang chủ
                </Link>
                <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
                <Link to="/cart" className="hover:text-primary transition-colors">Giỏ hàng</Link>
                <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
                <span className="text-on-surface font-semibold">Thanh toán</span>
              </nav>

              <div className="inline-flex items-center gap-unit-xs px-unit-sm py-unit-2xs rounded-full bg-secondary-fixed text-secondary font-label-spec text-label-spec uppercase tracking-wider shadow-sm">
                <span className="material-symbols-outlined text-sm">lock</span>
                Bảo mật giao dịch đa tầng 256-bit
              </div>
            </div>

            {/* ── Stepper Navigation (3 bước) ── */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-unit-md mb-unit-xl">
              <div className="max-w-3xl mx-auto flex items-center justify-between relative">
                <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-surface-container -z-0" />
                <div className="absolute left-8 w-1/2 top-1/2 -translate-y-1/2 h-0.5 bg-primary -z-0" />

                {/* Step 1: Giỏ hàng */}
                <Link to="/cart" className="relative z-10 flex flex-col items-center gap-unit-2xs hover:opacity-85 transition-opacity">
                  <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm shadow-md ring-4 ring-surface-container-lowest">
                    <span className="material-symbols-outlined text-base">check</span>
                  </div>
                  <span className="font-body-sm text-body-sm font-semibold text-primary">1. Giỏ hàng</span>
                </Link>

                {/* Step 2 (Active): Thông tin thanh toán */}
                <div className="relative z-10 flex flex-col items-center gap-unit-2xs">
                  <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm shadow-lg ring-4 ring-primary-fixed">
                    <span>2</span>
                  </div>
                  <span className="font-body-sm text-body-sm font-bold text-on-surface">2. Thông tin thanh toán</span>
                </div>

                {/* Step 3: Hoàn tất */}
                <div className="relative z-10 flex flex-col items-center gap-unit-2xs opacity-60">
                  <div className="w-9 h-9 rounded-full bg-surface-container-high text-outline flex items-center justify-center font-bold text-sm ring-4 ring-surface-container-lowest">
                    <span>3</span>
                  </div>
                  <span className="font-body-sm text-body-sm font-medium text-outline">3. Hoàn tất</span>
                </div>
              </div>
            </div>

            {/* ── Main Two-Column Layout ── */}
            <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-unit-lg items-start">

              {/* ── CỘT TRÁI (7 cols desktop): Thông tin nhận hàng, Vận chuyển, Thanh toán ── */}
              <div className="lg:col-span-7 flex flex-col gap-unit-lg">

                {/* KHỐI 1: Thông tin người nhận hàng */}
                <div className="bg-surface-container-lowest rounded-xl shadow-sm p-unit-lg flex flex-col gap-unit-md">
                  <div className="flex items-center justify-between pb-unit-xs">
                    <div className="flex items-center gap-unit-xs">
                      <span className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">person_pin</span>
                      </span>
                      <h2 className="font-title-card text-title-card text-on-surface font-bold">
                        1. Thông tin người nhận hàng
                      </h2>
                    </div>
                    <span className="font-label-spec text-label-spec text-primary bg-primary-fixed px-unit-xs py-unit-2xs rounded">
                      Bước 1/3
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-unit-sm">
                    {/* Họ và tên khách hàng */}
                    <div className="flex flex-col gap-unit-2xs">
                      <label htmlFor="fullName" className="font-body-sm text-body-sm font-semibold text-on-surface">
                        Họ và tên khách hàng <span className="text-error">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-unit-sm text-outline pointer-events-none text-lg">
                          person
                        </span>
                        <input
                          id="fullName"
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          placeholder="Ví dụ: Nguyễn Tuấn Anh"
                          className="w-full pl-10 pr-unit-sm py-unit-xs bg-surface-container-low rounded-lg text-body-md font-body-md text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                        />
                      </div>
                      {formErrors.fullName && (
                        <span className="text-error text-xs mt-1 font-body-sm">{formErrors.fullName}</span>
                      )}
                    </div>

                    {/* Số điện thoại liên hệ */}
                    <div className="flex flex-col gap-unit-2xs">
                      <label htmlFor="phone" className="font-body-sm text-body-sm font-semibold text-on-surface">
                        Số điện thoại liên hệ <span className="text-error">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-unit-sm text-outline pointer-events-none text-lg">
                          call
                        </span>
                        <input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="Ví dụ: 0988 123 456"
                          className="w-full pl-10 pr-unit-sm py-unit-xs bg-surface-container-low rounded-lg text-body-md font-body-md text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                        />
                      </div>
                      {formErrors.phone && (
                        <span className="text-error text-xs mt-1 font-body-sm">{formErrors.phone}</span>
                      )}
                    </div>
                  </div>

                  {/* Địa chỉ giao hàng */}
                  <div className="flex flex-col gap-unit-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="address" className="font-body-sm text-body-sm font-semibold text-on-surface">
                        Số nhà, tên đường / Địa chỉ giao hàng <span className="text-error">*</span>
                      </label>

                      {/* Dropdown chọn từ sổ địa chỉ (gọn gàng, không lặp nhãn) */}
                      <div className="relative inline-flex items-center">
                        <select
                          id="addressBookSelect"
                          aria-label="Chọn từ sổ địa chỉ"
                          value={selectedAddressId}
                          onChange={handleAddressSelect}
                          disabled={loadingAddresses || addresses.length === 0}
                          className="text-xs py-1.5 pl-2.5 pr-7 bg-surface-container-low hover:bg-surface-container border border-outline/30 rounded-lg text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer transition-colors max-w-[180px] sm:max-w-[210px] truncate disabled:opacity-60 disabled:cursor-not-allowed shadow-inner"
                        >
                          <option value="">
                            {loadingAddresses
                              ? 'Đang tải...'
                              : addresses.length === 0
                              ? 'Sổ địa chỉ trống'
                              : 'Chọn từ sổ địa chỉ'}
                          </option>
                          {addresses.map((addr) => {
                            const displayName = addr.TenGoiNho || addr.DiaChiNha || 'Địa chỉ';
                            const defTag = addr.LaMacDinh ? ' (Mặc định)' : '';
                            return (
                              <option key={addr.MaDiaChi} value={addr.MaDiaChi}>
                                {displayName}{defTag}
                              </option>
                            );
                          })}
                        </select>
                        <span className="material-symbols-outlined absolute right-1.5 text-outline pointer-events-none text-base">
                          expand_more
                        </span>
                      </div>
                    </div>

                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-unit-sm text-outline pointer-events-none text-lg">
                        home
                      </span>
                      <input
                        id="address"
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Ví dụ: 123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. HCM"
                        className="w-full pl-10 pr-unit-sm py-unit-xs bg-surface-container-low rounded-lg text-body-md font-body-md text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                      />
                    </div>
                    {formErrors.address && (
                      <span className="text-error text-xs mt-1 font-body-sm">{formErrors.address}</span>
                    )}
                  </div>

                  {/* Ghi chú giao hàng */}
                  <div className="flex flex-col gap-unit-2xs">
                    <label htmlFor="note" className="font-body-sm text-body-sm font-semibold text-on-surface">
                      Ghi chú giao hàng
                    </label>
                    <textarea
                      id="note"
                      rows={2}
                      value={formData.note}
                      onChange={(e) => handleInputChange('note', e.target.value)}
                      placeholder="Giao trong giờ hành chính, gọi trước 15 phút..."
                      className="w-full p-unit-sm bg-surface-container-low rounded-lg text-body-md font-body-md text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-inner resize-none"
                    />
                  </div>
                </div>

                {/* KHỐI 2: Phương thức vận chuyển (Gốc ban đầu: tự động tính theo giá trị và địa chỉ) */}
                <div className="bg-surface-container-lowest rounded-xl shadow-sm p-unit-lg flex flex-col gap-unit-md">
                  <div className="flex items-center justify-between pb-unit-xs">
                    <div className="flex items-center gap-unit-xs">
                      <span className="w-8 h-8 rounded-lg bg-secondary-fixed text-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">local_shipping</span>
                      </span>
                      <div>
                        <h2 className="font-title-card text-title-card text-on-surface font-bold">
                          2. Phương thức vận chuyển
                        </h2>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Tự động tính phí theo giá trị đơn hàng
                        </p>
                      </div>
                    </div>
                    <span className="font-label-spec text-label-spec text-secondary bg-secondary-fixed px-unit-xs py-unit-2xs rounded">
                      Bước 2/3
                    </span>
                  </div>

                  <div className="p-unit-md rounded-xl bg-surface-container-low flex items-center justify-between gap-unit-md border border-surface-container">
                    <div className="flex items-center gap-unit-sm">
                      <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center bg-primary-fixed/30">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-unit-xs">
                          <span className="font-body-md text-body-md font-bold text-on-surface">
                            Giao hàng tiêu chuẩn
                          </span>
                          {shippingFee === 0 && (
                            <span className="font-label-spec text-label-spec uppercase bg-secondary-fixed text-secondary px-unit-xs py-unit-2xs rounded font-bold">
                              Freeship
                            </span>
                          )}
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant pt-unit-2xs">
                          {shippingFee === null
                            ? 'Nhập địa chỉ để tính phí vận chuyển'
                            : shippingFee === 0
                            ? 'Freeship cho đơn hàng ≥ 10.000.000đ'
                            : 'Giao hàng tiêu chuẩn 1 - 3 ngày làm việc'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {shippingFee === null ? (
                        <span className="font-title-card text-title-card text-outline font-bold">-- đ</span>
                      ) : shippingFee === 0 ? (
                        <span className="font-title-card text-title-card text-secondary font-bold">Miễn phí</span>
                      ) : (
                        <span className="font-title-card text-title-card text-on-surface font-bold">
                          {formatVND(shippingFee)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* KHỐI 3: Phương thức thanh toán (DUY NHẤT COD) */}
                <div className="bg-surface-container-lowest rounded-xl shadow-sm p-unit-lg flex flex-col gap-unit-md">
                  <div className="flex items-center justify-between pb-unit-xs">
                    <div className="flex items-center gap-unit-xs">
                      <span className="w-8 h-8 rounded-lg bg-tertiary-fixed text-tertiary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                      </span>
                      <h2 className="font-title-card text-title-card text-on-surface font-bold">
                        3. Phương thức thanh toán
                      </h2>
                    </div>
                    <span className="font-body-sm text-body-sm text-secondary flex items-center gap-unit-2xs font-semibold">
                      <span className="material-symbols-outlined text-base">verified_user</span>
                      100% Bảo mật
                    </span>
                  </div>

                  <div className="flex flex-col gap-unit-xs">
                    {/* Option DUY NHẤT: COD */}
                    <label className="flex items-start gap-unit-sm p-unit-md rounded-xl bg-primary-fixed/20 shadow-sm ring-2 ring-primary cursor-pointer transition-all">
                      <input
                        id="payment-cod"
                        type="radio"
                        checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')}
                        className="mt-1 accent-primary cursor-pointer"
                        name="payment_method"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-unit-xs">
                            <span className="material-symbols-outlined text-primary text-xl">payments</span>
                            <span className="font-body-md text-body-md font-bold text-on-surface">
                              Thanh toán khi nhận hàng (COD)
                            </span>
                            <span className="font-label-spec text-label-spec bg-primary text-on-primary px-unit-xs py-unit-2xs rounded font-bold uppercase">
                              Mặc định
                            </span>
                          </div>
                          <span className="font-body-sm text-body-sm text-outline">Tiền mặt</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant pt-unit-2xs leading-relaxed">
                          Kiểm tra tem niêm phong và ngoại quan máy cẩn thận trước khi thanh toán. An tâm tuyệt đối 100%!
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

              </div>

              {/* ── CỘT PHẢI (5 cols desktop): Kiện hàng & Tóm tắt đơn hàng ── */}
              <div className="lg:col-span-5 flex flex-col gap-unit-md sticky top-28">
                <div className="bg-surface-container-lowest rounded-xl shadow-md p-unit-lg flex flex-col gap-unit-md">
                  
                  {/* Tiêu đề kiện hàng */}
                  <div className="flex items-center justify-between pb-unit-xs">
                    <div className="flex items-center gap-unit-xs">
                      <span className="material-symbols-outlined text-primary">shopping_bag</span>
                      <h3 className="font-title-card text-title-card text-on-surface font-bold">
                        Kiện hàng ({items.length} sản phẩm)
                      </h3>
                    </div>
                    <Link className="font-body-sm text-body-sm text-primary hover:underline font-semibold" to="/cart">
                      Chỉnh sửa
                    </Link>
                  </div>

                  {/* Danh sách sản phẩm trong Kiện hàng */}
                  <div className="flex flex-col gap-unit-xs max-h-80 overflow-y-auto pr-1">
                    {items.map((it, idx) => {
                      const itemImg = it.Anh || it.HinhAnh || it.image;
                      const itemPrice = Number(it.Gia || it.DonGia || 0);
                      const itemQty = Number(it.SoLuong || 1);
                      const itemTotal = itemPrice * itemQty;
                      const variantDesc = [
                        `Phân loại: ${it.MauSac || 'N/A'} | ${it.DungLuong || 'N/A'}`,
                        `Số lượng: ${itemQty}`,
                      ].filter(Boolean).join(' · ');

                      return (
                        <div key={it.id || it.MaSanPham || idx} className="flex items-start gap-unit-sm p-unit-xs bg-surface-container-low rounded-xl">
                          {itemImg ? (
                            <img
                              className="w-20 h-20 object-cover rounded-lg bg-surface-container-lowest shadow-sm shrink-0"
                              alt={it.TenSanPham}
                              src={itemImg}
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-surface-container-lowest shadow-sm shrink-0 flex items-center justify-center text-outline">
                              <span className="material-symbols-outlined text-2xl">smartphone</span>
                            </div>
                          )}
                          <div className="flex-1 flex flex-col justify-between h-full min-w-0">
                            <div className="flex flex-col">
                              <span className="font-body-md text-body-md font-bold text-on-surface truncate" title={it.TenSanPham}>
                                {it.TenSanPham}
                              </span>
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                <span className="text-outline">Màu:</span> <span className="font-medium text-on-surface">{it.MauSac || 'N/A'}</span>
                                <span className="mx-1 text-outline">·</span>
                                <span className="text-outline">Dung lượng:</span> <span className="font-medium text-on-surface">{it.DungLuong || 'N/A'}</span>
                              </p>
                              <span className="font-body-sm text-body-sm text-on-surface-variant">
                                Số lượng: {itemQty}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-unit-2xs">
                              <span className="font-label-spec text-label-spec text-secondary font-semibold bg-secondary-fixed px-unit-2xs py-unit-2xs rounded">
                                Chính hãng VN/A
                              </span>
                              <span className="font-title-card text-title-card text-primary font-bold">
                                {formatVND(itemTotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Khối nhập Mã Giảm Giá / Voucher */}
                  {appliedVoucher ? (
                    <div className="flex items-center gap-unit-xs pt-unit-xs">
                      <div className="relative flex-1 flex items-center bg-secondary-fixed/30 border border-secondary/20 rounded-lg px-unit-sm py-unit-xs">
                        <span className="material-symbols-outlined text-secondary text-base mr-2">sell</span>
                        <span className="font-body-sm text-body-sm font-bold text-secondary uppercase tracking-wider flex-1">
                          {appliedVoucher.MaCode || appliedVoucher.code}
                        </span>
                        <span className="font-label-spec text-label-spec text-secondary bg-secondary-fixed px-unit-xs py-unit-2xs rounded font-bold">
                          Đã áp dụng
                        </span>
                      </div>
                      {!voucherFromCart && (
                        <button
                          type="button"
                          onClick={handleRemoveVoucher}
                          className="px-unit-sm py-unit-xs bg-error-container text-on-error-container font-body-sm text-body-sm font-bold rounded-lg hover:bg-error hover:text-on-error transition-colors flex items-center gap-1"
                          title="Gỡ mã giảm giá"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                          Gỡ
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-unit-xs pt-unit-xs">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-unit-sm text-outline pointer-events-none text-base">
                          sell
                        </span>
                        <input
                          id="voucher-input"
                          type="text"
                          value={voucherInput}
                          onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyVoucher();
                            }
                          }}
                          placeholder="Nhập mã voucher..."
                          className="w-full pl-9 pr-unit-sm py-unit-xs bg-surface-container-low rounded-lg text-body-sm font-body-sm text-on-surface font-bold uppercase focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                        />
                      </div>
                      <button
                        id="apply-voucher-btn"
                        type="button"
                        onClick={handleApplyVoucher}
                        disabled={!voucherInput.trim() || applyingVoucher}
                        className="px-unit-md py-unit-xs bg-surface-container text-primary font-body-sm text-body-sm font-bold rounded-lg hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {applyingVoucher ? (
                          <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Áp dụng'
                        )}
                      </button>
                    </div>
                  )}

                  {/* Bảng tính tiền tóm tắt */}
                  <div className="flex flex-col gap-unit-xs py-unit-xs font-body-md text-body-md border-t border-surface-container pt-unit-sm">
                    <div className="flex justify-between text-on-surface-variant">
                      <span>Tạm tính ({items.length} món):</span>
                      <span className="font-semibold text-on-surface">{formatVND(subtotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-tertiary-container font-semibold">
                        <span>Mã giảm giá ({appliedVoucher?.MaCode || appliedVoucher?.code}):</span>
                        <span>-{formatVND(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-on-surface-variant">
                      <span>Phí giao hàng:</span>
                      <span className={
                        shippingFee === null
                          ? 'font-semibold text-outline'
                          : shippingFee === 0
                          ? 'font-semibold text-secondary'
                          : 'font-semibold text-on-surface'
                      }>
                        {shippingFee === null
                          ? '-- đ'
                          : shippingFee === 0
                          ? 'Miễn phí'
                          : formatVND(shippingFee)}
                      </span>
                    </div>
                  </div>

                  {/* Tổng số tiền cần thanh toán */}
                  <div className="p-unit-md bg-surface-container-low rounded-xl flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                        Tổng số tiền cần thanh toán
                      </span>
                      <span className="font-label-spec text-label-spec text-outline">
                        Đã bao gồm VAT 10%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-price-hero text-price-hero text-tertiary-container font-extrabold block tracking-tight">
                        {formatVND(totalAmount)}
                      </span>
                      {discountAmount > 0 && (
                        <span className="font-label-spec text-label-spec text-secondary font-bold">
                          Tiết kiệm: {formatVND(discountAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Checkbox điều khoản */}
                  <label className="flex items-start gap-unit-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-1 accent-primary w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
                      Tôi đồng ý với{' '}
                      <span className="text-primary font-semibold hover:underline">Điều khoản dịch vụ</span> &amp;{' '}
                      <span className="text-primary font-semibold hover:underline">Chính sách bảo mật</span> của SmartZone Vietnam.
                    </span>
                  </label>

                  {/* Nút XÁC NHẬN ĐẶT HÀNG */}
                  <button
                    id="submit-order-btn"
                    type="submit"
                    disabled={isSubmitting || isFormIncomplete}
                    className={`w-full py-unit-md px-unit-lg rounded-xl font-title-card text-title-card font-extrabold shadow-lg transition-all duration-200 flex items-center justify-center gap-unit-xs tracking-wide ${
                      isSubmitting || isFormIncomplete
                        ? 'bg-outline/20 text-outline cursor-not-allowed shadow-none'
                        : 'bg-tertiary-container hover:bg-tertiary text-on-tertiary hover:shadow-xl transform active:scale-[0.99] cursor-pointer'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block w-5 h-5 border-2 border-on-tertiary border-t-transparent rounded-full animate-spin" />
                        <span>Đang xử lý đơn hàng...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xl">shield</span>
                        <span>XÁC NHẬN ĐẶT HÀNG ({formatVND(totalAmount)})</span>
                      </>
                    )}
                  </button>

                  {/* Trợ giúp CSKH */}
                  <div className="flex items-center justify-center gap-unit-2xs pt-unit-2xs text-outline font-body-sm text-body-sm">
                    <span className="material-symbols-outlined text-sm">support_agent</span>
                    <span>Cần trợ giúp đặt hàng? Gọi <strong className="text-primary">1900 6868</strong></span>
                  </div>

                </div>
              </div>

            </form>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
