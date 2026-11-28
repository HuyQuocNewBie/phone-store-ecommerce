import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Ticket,
  Truck,
  Tag,
  Copy,
  Check,
  Clock,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Search,
  Percent,
  Gift,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);

const formatCompactVND = (amount) => {
  const num = Number(amount) || 0;
  if (num >= 1000000) {
    const millions = num / 1000000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}TR`;
  }
  if (num >= 1000) {
    const thousands = num / 1000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(0)}K`;
  }
  return `${num}đ`;
};

const formatDateVN = (dateString) => {
  if (!dateString) return 'Không giới hạn';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return 'Không giới hạn';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getDaysRemaining = (dateString) => {
  if (!dateString) return null;
  const expiry = new Date(dateString);
  if (Number.isNaN(expiry.getTime())) return null;
  const diffMs = expiry.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

const copyTextToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};

/* ─── Voucher Card (2-Part Ticket Design) ──────────────────────────────────── */
const VoucherCard = ({ voucher, isCopied, onCopy, onUseNow }) => {
  const isFreeShip = voucher.NhomVoucher === 'FreeShip' || voucher.LoaiGiam === 'freeship';
  const daysLeft = getDaysRemaining(voucher.NgayHetHan);
  const isExpiringSoon = daysLeft !== null && daysLeft <= 3;
  const isLowStock = Number(voucher.SoLuong) <= 10;

  // Nhãn giá trị chính bên trái
  const primaryValue = (() => {
    if (isFreeShip) {
      if (voucher.LoaiGiam === 'phantram') return `-${voucher.GiaTriGiam}%`;
      if (voucher.LoaiGiam === 'tien' || Number(voucher.GiaTriGiam) > 0) {
        return formatCompactVND(voucher.GiaTriGiam);
      }
      return 'FREE';
    }
    if (voucher.LoaiGiam === 'phantram') return `-${voucher.GiaTriGiam}%`;
    return formatCompactVND(voucher.GiaTriGiam);
  })();

  // Tiêu đề chi tiết bên phải
  const titleText = (() => {
    if (isFreeShip) {
      if (voucher.LoaiGiam === 'phantram') {
        return `Giảm ${voucher.GiaTriGiam}% phí vận chuyển${
          voucher.GiamToiDa ? ` (tối đa ${formatVND(voucher.GiamToiDa)})` : ''
        }`;
      }
      if (Number(voucher.GiaTriGiam) > 0) {
        return `Giảm ${formatVND(voucher.GiaTriGiam)} phí vận chuyển`;
      }
      return `Miễn phí vận chuyển${
        voucher.GiamToiDa ? ` (tối đa ${formatVND(voucher.GiamToiDa)})` : ' toàn quốc'
      }`;
    }
    if (voucher.LoaiGiam === 'phantram') {
      return `Giảm ${voucher.GiaTriGiam}% giá trị đơn${
        voucher.GiamToiDa ? ` (tối đa ${formatVND(voucher.GiamToiDa)})` : ''
      }`;
    }
    return `Giảm trực tiếp ${formatVND(voucher.GiaTriGiam)}`;
  })();

  return (
    <article className="group relative flex flex-col sm:flex-row bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-200 overflow-hidden">
      {/* ── PHẦN TRÁI: Nhãn loại mã & mức giảm ── */}
      <div
        className={`relative sm:w-44 shrink-0 px-5 py-5 flex sm:flex-col items-center justify-between sm:justify-center text-white select-none ${
          isFreeShip
            ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600'
            : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700'
        }`}
      >
        {/* Họa tiết ánh sáng nền */}
        <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-8 -right-6 w-20 h-20 rounded-full bg-black/10 pointer-events-none" />

        <div className="relative z-10 flex sm:flex-col items-center gap-3 sm:gap-2 text-left sm:text-center">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-inner shrink-0">
            {isFreeShip ? (
              <Truck className="w-6 h-6 text-white" />
            ) : voucher.LoaiGiam === 'phantram' ? (
              <Percent className="w-6 h-6 text-white" />
            ) : (
              <Tag className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/20 text-white mb-1">
              {isFreeShip ? 'Freeship' : 'Giảm giá ĐT'}
            </span>
            <p className="text-2xl sm:text-[26px] font-black tracking-tight leading-none">
              {primaryValue}
            </p>
            {voucher.GiamToiDa > 0 && (
              <p className="text-[11px] text-white/85 font-medium mt-1">
                Tối đa {formatCompactVND(voucher.GiamToiDa)}
              </p>
            )}
          </div>
        </div>

        {/* Rãnh đục lỗ kiểu vé (desktop) */}
        <span className="hidden sm:block absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#F8FAFC] border border-slate-200/90 z-20" />
        <span className="hidden sm:block absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-[#F8FAFC] border border-slate-200/90 z-20" />
      </div>

      {/* Đường cắt nét đứt giữa 2 phần */}
      <div className="hidden sm:block w-0 border-l-2 border-dashed border-slate-200 my-3 shrink-0" />
      <div className="block sm:hidden h-0 border-t-2 border-dashed border-slate-200 mx-4" />

      {/* ── PHẦN PHẢI: Điều kiện + Hạn dùng + Nút hành động ── */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-3.5 min-w-0">
        <div className="space-y-2">
          {/* Dòng trên: Mã Code + Số lượt còn lại */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
              <Ticket className={`w-3.5 h-3.5 ${isFreeShip ? 'text-emerald-600' : 'text-blue-600'}`} />
              <span className="font-mono text-xs font-extrabold tracking-wider text-slate-900">
                {voucher.Code}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isExpiringSoon && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                  Sắp hết hạn
                </span>
              )}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isLowStock
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Còn {voucher.SoLuong} lượt
              </span>
            </div>
          </div>

          {/* Tiêu đề mức giảm */}
          <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
            {titleText}
          </h3>

          {/* Điều kiện đơn tối thiểu & Hạn sử dụng */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {Number(voucher.GiaTriToiThieu) > 0 ? (
                <span>
                  Đơn tối thiểu{' '}
                  <strong className="text-slate-700 font-semibold">
                    {formatVND(voucher.GiaTriToiThieu)}
                  </strong>
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">Áp dụng cho mọi đơn hàng</span>
              )}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                HSD:{' '}
                <strong className={isExpiringSoon ? 'text-rose-600 font-semibold' : 'text-slate-700 font-semibold'}>
                  {formatDateVN(voucher.NgayHetHan)}
                </strong>
              </span>
            </span>
          </div>
        </div>

        {/* Nút Sao chép mã & Dùng ngay */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onCopy(voucher.Code)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-[0.98] ${
              isCopied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã sao chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép mã</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onUseNow(voucher)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] ${
              isFreeShip
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            <span>Dùng ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};

/* ─── Skeleton Loading ─────────────────────────────────────────────────────── */
const VoucherSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="flex flex-col sm:flex-row bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse"
      >
        <div className="sm:w-44 h-28 sm:h-40 bg-slate-200 shrink-0" />
        <div className="flex-1 p-5 space-y-3">
          <div className="flex justify-between">
            <div className="h-6 w-28 bg-slate-200 rounded-lg" />
            <div className="h-5 w-20 bg-slate-200 rounded-full" />
          </div>
          <div className="h-5 w-3/4 bg-slate-200 rounded" />
          <div className="h-4 w-2/3 bg-slate-100 rounded" />
          <div className="flex gap-2.5 pt-2">
            <div className="h-9 flex-1 bg-slate-200 rounded-xl" />
            <div className="h-9 flex-1 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ─── VouchersPage ─────────────────────────────────────────────────────────── */
const VouchersPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { totalCartCount } = useCart();

  const [giamGiaDon, setGiamGiaDon] = useState([]);
  const [freeShip, setFreeShip] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'discount' | 'freeship'
  const [searchCode, setSearchCode] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  const fetchAvailableVouchers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/vouchers/available');
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        setGiamGiaDon(Array.isArray(data.giamGiaDon) ? data.giamGiaDon : []);
        setFreeShip(Array.isArray(data.freeShip) ? data.freeShip : []);
      } else {
        setGiamGiaDon([]);
        setFreeShip([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải kho voucher:', err);
      setError('Không thể tải danh sách ưu đãi lúc này. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableVouchers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const normalizedSearch = searchCode.trim().toLowerCase();

  const filteredDiscount = useMemo(() => {
    if (!normalizedSearch) return giamGiaDon;
    return giamGiaDon.filter(
      (v) =>
        String(v.Code || '').toLowerCase().includes(normalizedSearch) ||
        String(v.GiaTriGiam || '').includes(normalizedSearch)
    );
  }, [giamGiaDon, normalizedSearch]);

  const filteredFreeShip = useMemo(() => {
    if (!normalizedSearch) return freeShip;
    return freeShip.filter(
      (v) =>
        String(v.Code || '').toLowerCase().includes(normalizedSearch) ||
        String(v.GiaTriGiam || '').includes(normalizedSearch)
    );
  }, [freeShip, normalizedSearch]);

  const totalCount = giamGiaDon.length + freeShip.length;

  const handleCopyCode = async (code) => {
    const ok = await copyTextToClipboard(code);
    setCopiedCode(code);
    if (ok) {
      toast.success(`Đã sao chép mã ${code}!`, { id: `copy-${code}`, duration: 2500 });
    } else {
      toast.success(`Mã ưu đãi của bạn: ${code}`, { id: `copy-${code}`, duration: 3000 });
    }
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? '' : prev));
    }, 2200);
  };

  const handleUseNow = async (voucher) => {
    await copyTextToClipboard(voucher.Code);
    try {
      sessionStorage.setItem('preferred_voucher_code', voucher.Code);
    } catch {
      // ignore storage errors
    }

    if (isAuthenticated && totalCartCount > 0) {
      toast.success(`Đã sao chép mã ${voucher.Code}. Chuyển sang giỏ hàng để áp dụng!`, {
        id: 'use-voucher',
        duration: 3000,
      });
      navigate('/cart', { state: { prefillVoucherCode: voucher.Code } });
    } else {
      toast.success(`Đã sao chép mã ${voucher.Code}. Hãy chọn điện thoại yêu thích để áp dụng!`, {
        id: 'use-voucher',
        duration: 3000,
      });
      navigate('/products');
    }
  };

  const showDiscountSection = activeTab === 'all' || activeTab === 'discount';
  const showFreeShipSection = activeTab === 'all' || activeTab === 'freeship';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* ── Breadcrumb ── */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-slate-500"
        >
          <Link to="/" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-base leading-none">home</span>
            Trang chủ
          </Link>
          <span className="material-symbols-outlined text-xs text-slate-400 leading-none">
            chevron_right
          </span>
          <span className="text-slate-800 font-semibold">Ưu đãi &amp; Kho Voucher</span>
        </nav>

        {/* ── Hero Banner Kho Voucher ── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 text-white p-6 sm:p-10 shadow-xl shadow-blue-900/10">
          <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 left-1/4 w-64 h-64 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider text-amber-200">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Kho Ưu Đãi Chính Hãng SmartZone</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Săn Mã Giảm Giá Điện Thoại &amp; Freeship
              </h1>
              <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
                Lưu nhanh mã giảm giá trực tiếp và mã miễn phí vận chuyển. Bạn có thể{' '}
                <strong className="text-white">kết hợp đồng thời 01 mã Giảm giá + 01 mã Freeship</strong>{' '}
                trên cùng một đơn hàng khi thanh toán!
              </p>
            </div>

            {/* Thống kê nhanh */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 shrink-0">
              <div className="px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
                <p className="text-xs text-blue-100">Mã giảm giá ĐT</p>
                <p className="text-2xl font-black mt-0.5">{giamGiaDon.length}</p>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
                <p className="text-xs text-blue-100">Mã Freeship</p>
                <p className="text-2xl font-black mt-0.5">{freeShip.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Thanh Bộ Lọc & Tìm Kiếm Mã ── */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'all', label: `Tất cả (${totalCount})`, icon: Gift },
              { id: 'discount', label: `Giảm giá điện thoại (${giamGiaDon.length})`, icon: Tag },
              { id: 'freeship', label: `Freeship (${freeShip.length})`, icon: Truck },
            ].map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Tìm theo mã voucher (VD: SALE10)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </section>

        {/* ── Nội Dung Danh Sách Voucher ── */}
        {loading ? (
          <VoucherSkeleton />
        ) : error ? (
          <div className="bg-white rounded-3xl border border-rose-100 p-10 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Đã có lỗi xảy ra</h2>
              <p className="text-sm text-slate-500">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchAvailableVouchers}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Thử lại</span>
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* ── KHU VỰC 1: MÃ GIẢM GIÁ ĐIỆN THOẠI ── */}
            {showDiscountSection && (
              <section className="space-y-4" aria-labelledby="section-discount-vouchers">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <h2
                        id="section-discount-vouchers"
                        className="text-lg sm:text-xl font-extrabold text-slate-900"
                      >
                        Mã Giảm Giá Điện Thoại
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500">
                        Giảm trực tiếp trên giá trị đơn hàng điện thoại &amp; phụ kiện
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                    {filteredDiscount.length} mã khả dụng
                  </span>
                </div>

                {filteredDiscount.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {filteredDiscount.map((voucher) => (
                      <VoucherCard
                        key={voucher.MaVoucher}
                        voucher={voucher}
                        isCopied={copiedCode === voucher.Code}
                        onCopy={handleCopyCode}
                        onUseNow={handleUseNow}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500 text-sm">
                    {normalizedSearch
                      ? `Không tìm thấy mã giảm giá điện thoại nào khớp với "${searchCode}".`
                      : 'Hiện chưa có mã giảm giá điện thoại nào đang hoạt động.'}
                  </div>
                )}
              </section>
            )}

            {/* ── KHU VỰC 2: MÃ MIỄN PHÍ VẬN CHUYỂN (FREESHIP) ── */}
            {showFreeShipSection && (
              <section className="space-y-4" aria-labelledby="section-freeship-vouchers">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2
                        id="section-freeship-vouchers"
                        className="text-lg sm:text-xl font-extrabold text-slate-900"
                      >
                        Mã Miễn Phí Vận Chuyển (Freeship)
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500">
                        Hỗ trợ phí giao hàng toàn quốc, có thể dùng kèm mã giảm giá điện thoại
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                    {filteredFreeShip.length} mã khả dụng
                  </span>
                </div>

                {filteredFreeShip.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {filteredFreeShip.map((voucher) => (
                      <VoucherCard
                        key={voucher.MaVoucher}
                        voucher={voucher}
                        isCopied={copiedCode === voucher.Code}
                        onCopy={handleCopyCode}
                        onUseNow={handleUseNow}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500 text-sm">
                    {normalizedSearch
                      ? `Không tìm thấy mã Freeship nào khớp với "${searchCode}".`
                      : 'Hiện chưa có mã miễn phí vận chuyển nào đang hoạt động.'}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* ── CTA Cuối Trang ── */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Đã săn được mã ưng ý?</h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Khám phá các mẫu điện thoại flagship mới nhất và áp dụng mã ngay tại bước thanh toán.
              </p>
            </div>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-colors shrink-0"
          >
            <span>Mua sắm ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default VouchersPage;
