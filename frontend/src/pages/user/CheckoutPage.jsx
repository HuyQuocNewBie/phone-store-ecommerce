import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Truck,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  MapPin,
  Phone,
  User,
  FileText,
  Loader2,
  AlertCircle,
  Tag,
  ShoppingBag,
  Sparkles,
  HelpCircle,
  Check,
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/* ─────────────────────────────────────────────
   Danh sách Tỉnh / Thành & Quận / Huyện (VN)
   Đặc biệt hỗ trợ phân loại Nội / Ngoại thành TP.HCM
───────────────────────────────────────────── */
const VIETNAM_PROVINCES = [
  {
    id: 'TP. Hồ Chí Minh',
    name: 'TP. Hồ Chí Minh',
    districts: [
      // Nội thành (Freeship theo chính sách nội thành)
      'Quận 1',
      'Quận 3',
      'Quận 4',
      'Quận 5',
      'Quận 6',
      'Quận 7',
      'Quận 8',
      'Quận 10',
      'Quận 11',
      'Quận 12',
      'TP. Thủ Đức',
      'Quận Bình Thạnh',
      'Quận Tân Bình',
      'Quận Tân Phú',
      'Quận Phú Nhuận',
      'Quận Gò Vấp',
      // Ngoại thành (Phí 20.000đ theo chính sách)
      'Huyện Bình Chánh',
      'Huyện Cần Giờ',
      'Huyện Củ Chi',
      'Huyện Hóc Môn',
      'Huyện Nhà Bè',
    ],
  },
  {
    id: 'Hà Nội',
    name: 'Hà Nội',
    districts: [
      'Quận Ba Đình',
      'Quận Hoàn Kiếm',
      'Quận Tây Hồ',
      'Quận Long Biên',
      'Quận Cầu Giấy',
      'Quận Đống Đa',
      'Quận Hai Bà Trưng',
      'Quận Hoàng Mai',
      'Quận Thanh Xuân',
      'Quận Nam Từ Liêm',
      'Quận Bắc Từ Liêm',
      'Quận Hà Đông',
      'Thị xã Sơn Tây',
      'Huyện Gia Lâm',
      'Huyện Đông Anh',
      'Huyện Sóc Sơn',
      'Huyện Thanh Trì',
    ],
  },
  {
    id: 'Đà Nẵng',
    name: 'Đà Nẵng',
    districts: [
      'Quận Hải Châu',
      'Quận Thanh Khê',
      'Quận Sơn Trà',
      'Quận Ngũ Hành Sơn',
      'Quận Liên Chiểu',
      'Quận Cẩm Lệ',
      'Huyện Hòa Vang',
    ],
  },
  {
    id: 'Bình Dương',
    name: 'Bình Dương',
    districts: [
      'TP. Thủ Dầu Một',
      'TP. Thuận An',
      'TP. Dĩ An',
      'TP. Tân Uyên',
      'TP. Bến Cát',
      'Huyện Bàu Bàng',
      'Huyện Bắc Tân Uyên',
      'Huyện Dầu Tiếng',
      'Huyện Phú Giáo',
    ],
  },
  {
    id: 'Đồng Nai',
    name: 'Đồng Nai',
    districts: [
      'TP. Biên Hòa',
      'TP. Long Khánh',
      'Huyện Long Thành',
      'Huyện Nhơn Trạch',
      'Huyện Trảng Bom',
      'Huyện Vĩnh Cửu',
      'Huyện Thống Nhất',
    ],
  },
  {
    id: 'Cần Thơ',
    name: 'Cần Thơ',
    districts: [
      'Quận Ninh Kiều',
      'Quận Bình Thủy',
      'Quận Cái Răng',
      'Quận Ô Môn',
      'Quận Thốt Nốt',
    ],
  },
  {
    id: 'Hải Phòng',
    name: 'Hải Phòng',
    districts: [
      'Quận Hồng Bàng',
      'Quận Ngô Quyền',
      'Quận Lê Chân',
      'Quận Hải An',
      'Quận Kiến An',
      'Quận Đồ Sơn',
    ],
  },
  {
    id: 'Bà Rịa - Vũng Tàu',
    name: 'Bà Rịa - Vũng Tàu',
    districts: ['TP. Vũng Tàu', 'TP. Bà Rịa', 'Thị xã Phú Mỹ', 'Huyện Long Điền'],
  },
  {
    id: 'Khánh Hòa',
    name: 'Khánh Hòa',
    districts: ['TP. Nha Trang', 'TP. Cam Ranh', 'Thị xã Ninh Hòa'],
  },
  {
    id: 'Lâm Đồng',
    name: 'Lâm Đồng',
    districts: ['TP. Đà Lạt', 'TP. Bảo Lộc', 'Huyện Đức Trọng'],
  },
  {
    id: 'Quảng Ninh',
    name: 'Quảng Ninh',
    districts: ['TP. Hạ Long', 'TP. Cẩm Phả', 'TP. Uông Bí', 'TP. Móng Cái'],
  },
  {
    id: 'Thừa Thiên Huế',
    name: 'Thừa Thiên Huế',
    districts: ['TP. Huế', 'Thị xã Hương Thủy', 'Thị xã Hương Trà'],
  },
  {
    id: 'Tỉnh khác',
    name: 'Tỉnh / Thành khác',
    districts: ['Quận / Huyện trung tâm', 'Khu vực ngoại thành / Huyện khác'],
  },
];

/* ─────────────────────────────────────────────
   Helper: Format tiền VND
───────────────────────────────────────────── */
const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

/* ─────────────────────────────────────────────
   CheckoutPage Component
───────────────────────────────────────────── */
const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. Items & Voucher từ location state (hoặc fetch từ API)
  const initialItems = location.state?.items || null;
  const initialVoucher = location.state?.voucher || null;

  const [items, setItems] = useState(initialItems || []);
  const [loadingCart, setLoadingCart] = useState(!initialItems);
  const [appliedVoucher, setAppliedVoucher] = useState(initialVoucher);

  // 2. Form Thông tin người nhận
  const [formData, setFormData] = useState({
    fullName: user?.HoTen || user?.TenNguoiDung || '',
    phone: user?.SoDienThoai || '',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    address: user?.DiaChi || '',
    note: '',
  });

  const [formErrors, setFormErrors] = useState({});

  // 3. Phương thức thanh toán (Mặc định COD)
  const [paymentMethod, setPaymentMethod] = useState('COD');

  // 4. Phí vận chuyển & trạng thái tính toán
  const [shippingFee, setShippingFee] = useState(0);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingRule, setShippingRule] = useState('');
  const [isFreeship, setIsFreeship] = useState(false);

  // 5. Anti-spam / Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lấy danh sách quận/huyện dựa theo tỉnh được chọn
  const availableDistricts = useMemo(() => {
    const selectedProv = VIETNAM_PROVINCES.find((p) => p.name === formData.province);
    return selectedProv ? selectedProv.districts : ['Quận / Huyện trung tâm'];
  }, [formData.province]);

  // Nếu chuyển tỉnh và quận hiện tại không thuộc tỉnh mới -> chọn quận đầu tiên
  useEffect(() => {
    if (!availableDistricts.includes(formData.district)) {
      setFormData((prev) => ({
        ...prev,
        district: availableDistricts[0] || '',
      }));
    }
  }, [formData.province, availableDistricts, formData.district]);

  // Fetch cart nếu chưa có trong state
  useEffect(() => {
    if (!initialItems) {
      let isMounted = true;
      const fetchCart = async () => {
        setLoadingCart(true);
        try {
          const res = await api.get('/cart');
          if (isMounted) {
            const fetchedCart = res.data?.data || [];
            setItems(fetchedCart);
          }
        } catch (err) {
          console.error('Lỗi khi tải giỏ hàng:', err);
          toast.error('Không thể tải giỏ hàng. Vui lòng thử lại.');
        } finally {
          if (isMounted) setLoadingCart(false);
        }
      };
      fetchCart();
      return () => {
        isMounted = false;
      };
    }
  }, [initialItems]);

  // Tính tổng tiền sản phẩm (Subtotal)
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.Gia) || 0) * (Number(item.SoLuong) || 1), 0);
  }, [items]);

  // Tính giảm giá voucher
  const discountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    const val = Number(appliedVoucher.value || appliedVoucher.GiaTriGiam || 0);
    return Math.min(val, subtotal);
  }, [appliedVoucher, subtotal]);

  // Tính tổng thanh toán cuối cùng
  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal + shippingFee - discountAmount);
  }, [subtotal, shippingFee, discountAmount]);

  /* ─────────────────────────────────────────────
     2. Tự động gọi API /api/v1/shipping/calculate
  ───────────────────────────────────────────── */
  const calculateShippingFee = useCallback(
    async (province, district, currentSubtotal) => {
      if (!province) return;

      setCalculatingShipping(true);
      try {
        // Gọi API backend: /api/v1/shipping/calculate (hoặc /api/v1/orders/shipping/calculate)
        const payload = {
          province_id: province,
          district_id: district,
          order_subtotal: currentSubtotal,
        };

        let response;
        try {
          response = await api.post('/shipping/calculate', payload);
        } catch (postErr) {
          // Fallback tới /orders/shipping/calculate nếu route được mount dưới /orders
          response = await api.post('/orders/shipping/calculate', payload);
        }

        if (response.data && response.data.success) {
          const { shipping_fee, is_freeship: freeship, rule_applied } = response.data.data;
          setShippingFee(Number(shipping_fee) || 0);
          setIsFreeship(Boolean(freeship));
          setShippingRule(rule_applied || '');
        }
      } catch (err) {
        console.warn('Lỗi khi gọi API tính phí vận chuyển:', err);
        // Fallback nội bộ nếu API có vấn đề kết nối tạm thời
        const isHCM = province.toLowerCase().includes('hồ chí minh') || province.toLowerCase().includes('hcm');
        if (currentSubtotal >= 10000000) {
          setShippingFee(0);
          setIsFreeship(true);
          setShippingRule('Freeship đơn hàng >= 10.000.000đ');
        } else if (!isHCM) {
          setShippingFee(35000);
          setIsFreeship(false);
          setShippingRule('Phí giao hàng Tỉnh/Thành khác (35.000đ)');
        } else {
          const outerKeywords = ['bình chánh', 'cần giờ', 'củ chi', 'hóc môn', 'nhà bè'];
          const isOuter = outerKeywords.some((k) => (district || '').toLowerCase().includes(k));
          if (isOuter) {
            setShippingFee(20000);
            setIsFreeship(false);
            setShippingRule('Phí giao hàng TP.HCM Ngoại thành (20.000đ)');
          } else {
            setShippingFee(0);
            setIsFreeship(true);
            setShippingRule('Phí giao hàng TP.HCM Nội thành (0đ)');
          }
        }
      } finally {
        setCalculatingShipping(false);
      }
    },
    []
  );

  // Tự động gọi tính phí khi Tỉnh/Thành, Quận/Huyện hoặc subtotal thay đổi
  useEffect(() => {
    if (formData.province) {
      calculateShippingFee(formData.province, formData.district, subtotal);
    }
  }, [formData.province, formData.district, subtotal, calculateShippingFee]);

  /* ─────────────────────────────────────────────
     Validation Form Người Nhận
  ───────────────────────────────────────────── */
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
      errors.phone = 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)';
    }

    if (!formData.province) {
      errors.province = 'Vui lòng chọn Tỉnh / Thành phố';
    }

    if (!formData.district) {
      errors.district = 'Vui lòng chọn Quận / Huyện';
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
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  /* ─────────────────────────────────────────────
     4. Nút "Xác Nhận Đặt Hàng" (Chống Spam + API)
  ───────────────────────────────────────────── */
  const handleSubmitOrder = async (e) => {
    e?.preventDefault();

    // Chống double-click / spam ngay lập tức
    if (isSubmitting) return;

    if (items.length === 0) {
      toast.error('Không có sản phẩm nào để đặt hàng!');
      return;
    }

    // Kiểm tra tính hợp lệ của form
    const isValid = validateForm();
    if (!isValid) {
      toast.error('Vui lòng kiểm tra lại thông tin nhận hàng.');
      return;
    }

    // Disable nút ngay lập tức
    setIsSubmitting(true);

    try {
      const fullAddressString = `${formData.address.trim()}, ${formData.district}, ${formData.province}`;

      const orderPayload = {
        TenNguoiNhan: formData.fullName.trim(),
        receiver_name: formData.fullName.trim(),
        SoDienThoai: formData.phone.trim(),
        phone: formData.phone.trim(),
        DiaChiGiaoHang: fullAddressString,
        shipping_address: fullAddressString,
        province_id: formData.province,
        district_id: formData.district,
        GhiChu: formData.note.trim() || null,
        MaVoucher: appliedVoucher?.code || appliedVoucher?.MaVoucher || null,
        // Gửi danh sách sản phẩm
        items: items.map((it) => ({
          MaSanPham: it.MaSanPham,
          SoLuong: it.SoLuong,
        })),
        cart_item_ids: items
          .filter((it) => it.MaGioHang)
          .map((it) => it.MaGioHang),
      };

      const response = await api.post('/orders', orderPayload);

      if (response.data && response.data.success) {
        toast.success('Đặt hàng thành công!');

        // Chuyển hướng sang trang Thanh Toán Thành Công (/checkout/success)
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
              formData: {
                ...formData,
                fullAddress: fullAddressString,
              },
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
      // Mở lại nút để người dùng chỉnh sửa nếu thất bại
      setIsSubmitting(false);
    }
  };

  /* ─────────────────────────────────────────────
     Render: Khi giỏ hàng trống hoặc đang tải
  ───────────────────────────────────────────── */
  if (loadingCart) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
     Render: Giao diện Checkout
  ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <Navbar />

      <main className="flex-1 py-8 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* ── Breadcrumb & Stepper Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Link to="/" className="hover:text-sky-400 transition-colors">Trang chủ</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <Link to="/cart" className="hover:text-sky-400 transition-colors">Giỏ hàng</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-200 font-medium">Thanh toán</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight flex items-center gap-3">
                <span>Thanh toán & Đặt hàng</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  {items.length} sản phẩm
                </span>
              </h1>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-[11px]">
                  ✓
                </span>
                <span className="font-semibold">Giỏ hàng</span>
              </div>
              <div className="w-6 h-0.5 bg-slate-700" />
              <div className="flex items-center gap-1.5 text-sky-400">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center font-bold text-[11px]">
                  2
                </span>
                <span className="font-bold">Thanh toán</span>
              </div>
              <div className="w-6 h-0.5 bg-slate-800" />
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-[11px]">
                  3
                </span>
                <span>Hoàn tất</span>
              </div>
            </div>
          </div>

          {/* ── Main Form Grid ── */}
          <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* ── CỘT TRÁI (7 cols): Thông tin người nhận & Vận chuyển & Thanh toán ── */}
            <div className="lg:col-span-7 space-y-6">

              {/* SECTION 1: Form thông tin người nhận */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
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
                </div>

                <div className="space-y-4">
                  {/* Họ tên & SĐT */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Họ và tên */}
                    <div>
                      <label htmlFor="fullName" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Họ và tên người nhận <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
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
                      </div>
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
                      <div className="relative">
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
                      </div>
                      {formErrors.phone && (
                        <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {formErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tỉnh/Thành & Quận/Huyện */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tỉnh/Thành phố */}
                    <div>
                      <label htmlFor="province" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Tỉnh / Thành phố <span className="text-rose-400">*</span>
                      </label>
                      <select
                        id="province"
                        value={formData.province}
                        onChange={(e) => handleInputChange('province', e.target.value)}
                        className={`w-full px-4 py-3 bg-slate-950/70 border rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                          formErrors.province
                            ? 'border-rose-500/80 focus:ring-rose-500/30'
                            : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                        }`}
                      >
                        {VIETNAM_PROVINCES.map((prov) => (
                          <option key={prov.id} value={prov.name} className="bg-slate-900 text-slate-100">
                            {prov.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.province && (
                        <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {formErrors.province}
                        </p>
                      )}
                    </div>

                    {/* Quận/Huyện */}
                    <div>
                      <label htmlFor="district" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Quận / Huyện <span className="text-rose-400">*</span>
                      </label>
                      <select
                        id="district"
                        value={formData.district}
                        onChange={(e) => handleInputChange('district', e.target.value)}
                        className={`w-full px-4 py-3 bg-slate-950/70 border rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                          formErrors.district
                            ? 'border-rose-500/80 focus:ring-rose-500/30'
                            : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                        }`}
                      >
                        {availableDistricts.map((dist) => (
                          <option key={dist} value={dist} className="bg-slate-900 text-slate-100">
                            {dist}
                          </option>
                        ))}
                      </select>
                      {formErrors.district && (
                        <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {formErrors.district}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Địa chỉ chi tiết */}
                  <div>
                    <label htmlFor="address" className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Địa chỉ cụ thể (Số nhà, tên đường, phường/xã) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="address"
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Ví dụ: 123 Lê Lợi, Phường Bến Nghé"
                        className={`w-full px-4 py-3 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                          formErrors.address
                            ? 'border-rose-500/80 focus:ring-rose-500/30'
                            : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                        }`}
                      />
                    </div>
                    {formErrors.address && (
                      <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {formErrors.address}
                      </p>
                    )}
                  </div>

                  {/* Ghi chú đơn hàng */}
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

              {/* SECTION 2: Phí vận chuyển & Phương thức giao hàng */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-100">
                        2. Phương thức vận chuyển
                      </h2>
                      <p className="text-xs text-slate-400">Tự động tính phí theo địa chỉ nhận hàng & giá trị đơn</p>
                    </div>
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
                        ) : isFreeship || shippingFee === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Freeship
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {calculatingShipping
                          ? 'Đang tính phí vận chuyển...'
                          : shippingRule || 'Thời gian giao dự kiến: 1 - 3 ngày làm việc'}
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

              {/* SECTION 3: Phương thức thanh toán (Mặc định COD) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
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
                </div>

                <div className="space-y-3">
                  {/* Option 1: COD (Active & Selected by default) */}
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

                  {/* Option 2: Chuyển khoản ngân hàng / VNPay (Coming soon) */}
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

            {/* ── CỘT PHẢI (5 cols): Tóm tắt đơn hàng & Nút Xác Nhận ── */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-sky-400" />
                    <span>Đơn hàng của bạn</span>
                  </h3>
                  <Link
                    to="/cart"
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Sửa giỏ hàng
                  </Link>
                </div>

                {/* Danh sách sản phẩm mua */}
                <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-1 text-xs">
                      {/* Thumbnail */}
                      <div className="w-13 h-13 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-1">
                        {it.Anh ? (
                          <img
                            src={it.Anh}
                            alt={it.TenSanPham}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-slate-600 text-[10px] text-center">Ảnh</div>
                        )}
                      </div>

                      {/* Detail */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-slate-200 font-semibold line-clamp-1 text-xs">
                          {it.TenSanPham}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {it.MauSac && <span>{it.MauSac}</span>}
                          {it.MauSac && it.DungLuong && <span>•</span>}
                          {it.DungLuong && <span>{it.DungLuong}</span>}
                          <span>•</span>
                          <span className="font-bold text-sky-400">x{it.SoLuong}</span>
                        </div>
                      </div>

                      {/* Giá */}
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-100 text-xs">
                          {formatVND(Number(it.Gia) * Number(it.SoLuong))}
                        </p>
                        {Number(it.SoLuong) > 1 && (
                          <p className="text-[10px] text-slate-500">
                            {formatVND(Number(it.Gia))}/cái
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Voucher đã áp dụng nếu có */}
                {appliedVoucher && (
                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-sky-300 font-semibold">
                      <Tag className="w-3.5 h-3.5 text-sky-400" />
                      <span>Mã giảm giá: {appliedVoucher.code}</span>
                    </div>
                    <span className="font-bold text-emerald-400">-{formatVND(discountAmount)}</span>
                  </div>
                )}

                {/* Chi tiết tính tiền */}
                <div className="space-y-3 pt-3 border-t border-slate-800 text-sm">
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

                {/* ── Nút "Xác Nhận Đặt Hàng" ── */}
                <div className="space-y-3 pt-2">
                  <button
                    id="submit-order-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition-all shadow-xl ${
                      isSubmitting
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-75'
                        : 'bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                        <span>Đang xử lý đặt hàng...</span>
                      </>
                    ) : (
                      <>
                        <span>Xác Nhận Đặt Hàng</span>
                        <ChevronRight className="w-5 h-5" />
                      </>
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
