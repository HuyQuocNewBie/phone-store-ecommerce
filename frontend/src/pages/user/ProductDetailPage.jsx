import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChevronRight,
  ChevronLeft,
  ShoppingCart,
  Zap,
  PackageCheck,
  Star,
  Shield,
  Truck,
  RotateCcw,
  CreditCard,
  Check,
  HardDrive,
  Palette,
  AlertCircle,
  Minus,
  Plus,
  ArrowRight,
  Info,
  Layers,
  Cpu,
  Loader2,
  ZoomIn,
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Hằng số ─────────────────────────────────────────────────────────────────
const SESSION_INTENT_KEY = 'cart_action_intent';

// ─── Helper: Format tiền VNĐ ─────────────────────────────────────────────────
const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
const SkeletonLoader = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
    <Navbar />
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse space-y-8">
        <div className="h-4 bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-4">
            <div className="w-full aspect-square bg-slate-800 rounded-3xl" />
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square bg-slate-800 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-7 space-y-5">
            <div className="h-8 bg-slate-800 rounded w-3/4" />
            <div className="h-10 bg-slate-800 rounded w-1/2" />
            <div className="h-24 bg-slate-800 rounded-2xl" />
            <div className="h-32 bg-slate-800 rounded-2xl" />
            <div className="h-14 bg-slate-800 rounded-2xl" />
            <div className="h-14 bg-slate-800 rounded-2xl" />
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

// ─── ProductDetailPage ────────────────────────────────────────────────────────
const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // ── State: Dữ liệu sản phẩm ──
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── State: Gallery ──
  const [activeImg, setActiveImg] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);

  // ── State: Biến thể đã chọn ──
  const [selectedRom, setSelectedRom] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  // ── State: Số lượng ──
  const [quantity, setQuantity] = useState(1);

  // ── State: Loading nút hành động ──
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  // ── Fetch Chi Tiết Sản Phẩm ──
  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/products/${id}`);
      if (res.data?.success) {
        const data = res.data.data;
        setProduct(data);

        // Khởi tạo biến thể mặc định
        if (data.danhSachDungLuong?.length > 0) setSelectedRom(data.DungLuong || data.danhSachDungLuong[0]);
        if (data.danhSachMauSac?.length > 0) setSelectedColor(data.MauSac || data.danhSachMauSac[0]);
      } else {
        setError('Không tìm thấy sản phẩm');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Sản phẩm không tồn tại hoặc đã ngừng kinh doanh');
      } else {
        setError('Không thể tải thông tin sản phẩm. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // ── Danh sách ảnh (hiện tại backend chỉ trả 1 ảnh, ta tạo gallery giả) ──
  const images = product?.Anh
    ? [product.Anh, product.Anh, product.Anh, product.Anh]
    : [];

  // ── Nhóm thông số kỹ thuật theo NhomThongSo ──
  const specGroups = React.useMemo(() => {
    if (!product?.thongsokythuat?.length) return [];
    const groups = {};
    product.thongsokythuat.forEach((spec) => {
      const group = spec.NhomThongSo || 'Thông số khác';
      if (!groups[group]) groups[group] = [];
      groups[group].push(spec);
    });
    return Object.entries(groups);
  }, [product]);

  // ── Lưu Intent vào sessionStorage và chuyển tới /login ──
  const saveIntentAndRedirectToLogin = (actionType) => {
    const intent = {
      product_id: product.MaSanPham,
      variant: {
        DungLuong: selectedRom,
        MauSac: selectedColor,
      },
      quantity,
      action_type: actionType, // 'add_to_cart' | 'buy_now'
      product_name: product.TenSanPham,
      redirect_back: `/products/${id}`,
    };
    sessionStorage.setItem(SESSION_INTENT_KEY, JSON.stringify(intent));
    toast(`Vui lòng đăng nhập để tiếp tục`, {
      icon: '🔐',
      id: 'login-required',
      duration: 2500,
    });
    navigate('/login');
  };

  // ── Thêm vào giỏ hàng (đã đăng nhập) ──
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      saveIntentAndRedirectToLogin('add_to_cart');
      return;
    }

    try {
      setAddingToCart(true);
      await api.post('/cart/items', {
        MaSanPham: product.MaSanPham,
        SoLuong: quantity,
      });
      toast.success(`Đã thêm "${product.TenSanPham}" vào giỏ hàng!`, {
        id: `cart-add-${product.MaSanPham}`,
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể thêm vào giỏ hàng. Vui lòng thử lại.';
      toast.error(msg, { id: 'cart-error' });
    } finally {
      setAddingToCart(false);
    }
  };

  // ── Mua ngay (đã đăng nhập) ──
  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      saveIntentAndRedirectToLogin('buy_now');
      return;
    }

    try {
      setBuyingNow(true);
      // Thêm vào giỏ trước rồi chuyển sang checkout
      await api.post('/cart/items', {
        MaSanPham: product.MaSanPham,
        SoLuong: quantity,
      });
      navigate('/checkout');
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể xử lý. Vui lòng thử lại.';
      toast.error(msg, { id: 'buynow-error' });
      setBuyingNow(false);
    }
  };

  // ── Điều chỉnh số lượng ──
  const handleQtyChange = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      const maxQty = product?.TonKho || 99;
      if (next < 1) return 1;
      if (next > maxQty) return maxQty;
      return next;
    });
  };

  // ── Trạng thái tồn kho ──
  const isOutOfStock = product?.TonKho <= 0;

  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) return <SkeletonLoader />;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6 p-10 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">Không tìm thấy sản phẩm</h2>
              <p className="text-sm text-slate-400">{error}</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-all"
              >
                Quay lại
              </button>
              <Link
                to="/products"
                className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-sky-500/20"
              >
                Xem danh mục
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          <Link to="/" className="hover:text-sky-400 transition-colors">Trang chủ</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <Link to="/products" className="hover:text-sky-400 transition-colors">Danh mục sản phẩm</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className="text-slate-200 font-semibold truncate max-w-xs">{product.TenSanPham}</span>
        </nav>

        {/* ── Main Grid: Gallery + Info ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* ════════════════════════════════════════════
              LEFT: Bộ Sưu Tập Ảnh Gallery
          ════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">

            {/* Main Image */}
            <div
              className="relative w-full aspect-square rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 overflow-hidden shadow-2xl shadow-black/40 flex items-center justify-center group cursor-zoom-in"
              onClick={() => setZoomActive(!zoomActive)}
            >
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-violet-500/5 pointer-events-none" />

              {images.length > 0 ? (
                <img
                  src={images[activeImg]}
                  alt={product.TenSanPham}
                  className={`w-full h-full object-contain p-8 transition-transform duration-500 ${
                    zoomActive ? 'scale-125' : 'scale-100 group-hover:scale-105'
                  }`}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <PackageCheck className="w-24 h-24 text-slate-700" />
              )}

              {/* Zoom Hint */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/70 backdrop-blur-md border border-slate-800 text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Nhấn để zoom</span>
              </div>

              {/* Nav Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveImg((p) => (p === 0 ? images.length - 1 : p - 1)); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/60 border border-slate-800 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveImg((p) => (p + 1) % images.length); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/60 border border-slate-800 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Badges lớp trên */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {isOutOfStock ? (
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-500/90 text-white shadow-lg">
                    Hết hàng
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Còn hàng
                  </span>
                )}
                {selectedRom && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    {selectedRom}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImg(idx)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      activeImg === idx
                        ? 'border-sky-500 shadow-lg shadow-sky-500/25'
                        : 'border-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.TenSanPham} - ảnh ${idx + 1}`}
                      className="w-full h-full object-contain bg-slate-900 p-1"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Cam kết nhỏ dưới gallery */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Shield, label: '100% Chính hãng', color: 'text-sky-400', bg: 'bg-sky-500/5 border-sky-500/15' },
                { icon: Truck, label: 'Giao hàng 2H', color: 'text-indigo-400', bg: 'bg-indigo-500/5 border-indigo-500/15' },
                { icon: RotateCcw, label: '30 ngày đổi trả', color: 'text-violet-400', bg: 'bg-violet-500/5 border-violet-500/15' },
                { icon: CreditCard, label: 'Trả góp 0%', color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/15' },
              ].map(({ icon: Icon, label, color, bg }) => (
                <div key={label} className={`flex items-center gap-2 p-3 rounded-xl border ${bg} text-xs font-medium`}>
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                  <span className="text-slate-300">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════════
              RIGHT: Thông Tin & Lựa Chọn
          ════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-6">

            {/* Tên & Rating */}
            <div className="space-y-3">
              {/* Category / Brand tags */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Smartphone
                </span>
                {product.MaNhaSanXuat && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    NSX: #{product.MaNhaSanXuat}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                {product.TenSanPham}
              </h1>

              {/* Rating mock */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < 5 ? 'fill-amber-400' : 'fill-slate-700 text-slate-700'}`} />
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-200">4.9</span>
                <span className="text-xs text-slate-500">(256 đánh giá)</span>
                <span className="text-xs text-emerald-400 font-semibold">✓ Đã bán 1.2K+</span>
              </div>
            </div>

            {/* ── Giá bán ── */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-500/5 via-indigo-500/5 to-violet-500/5 border border-sky-500/20 space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
                {formatVND(product.Gia)}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 line-through">{formatVND(product.Gia * 1.08)}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/25">
                  -8% Tiết kiệm
                </span>
              </div>
              <p className="text-xs text-slate-400 pt-1">
                Giá đã bao gồm VAT · Trả góp từ <span className="text-sky-400 font-semibold">{formatVND(Math.round(product.Gia / 12))}/tháng</span>
              </p>
            </div>

            {/* ── Bộ chọn Biến Thể: ROM ── */}
            {product.danhSachDungLuong?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-violet-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-200">
                    Bộ Nhớ Trong (ROM)
                  </h3>
                  {selectedRom && (
                    <span className="ml-auto text-xs font-semibold text-violet-300 bg-violet-500/10 px-2.5 py-0.5 rounded-full border border-violet-500/20">
                      {selectedRom}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {product.danhSachDungLuong.map((rom) => {
                    const isSelected = selectedRom === rom;
                    return (
                      <button
                        key={rom}
                        type="button"
                        onClick={() => setSelectedRom(rom)}
                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                          isSelected
                            ? 'bg-violet-500/15 border-violet-500/60 text-violet-200 shadow-lg shadow-violet-500/10'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600 hover:text-slate-100 hover:bg-slate-800'
                        }`}
                      >
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        )}
                        <span>{rom}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Bộ chọn Biến Thể: Màu Sắc ── */}
            {product.danhSachMauSac?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-sky-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-200">
                    Màu Sắc
                  </h3>
                  {selectedColor && (
                    <span className="ml-auto text-xs font-semibold text-sky-300 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                      {selectedColor}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {product.danhSachMauSac.map((color) => {
                    const isSelected = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500/60 text-sky-200 shadow-lg shadow-sky-500/10'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600 hover:text-slate-100 hover:bg-slate-800'
                        }`}
                      >
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        )}
                        <span>{color}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Số lượng ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                <h3 className="text-sm font-bold text-slate-200">Số Lượng</h3>
                {!isOutOfStock && (
                  <span className="ml-auto text-xs text-slate-400">
                    Còn <span className="font-semibold text-emerald-400">{product.TonKho}</span> sản phẩm
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    id="btn-qty-decrease"
                    onClick={() => handleQtyChange(-1)}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="w-11 h-11 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-black text-slate-100 select-none tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    id="btn-qty-increase"
                    onClick={() => handleQtyChange(1)}
                    disabled={quantity >= product.TonKho || isOutOfStock}
                    className="w-11 h-11 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {!isOutOfStock && (
                  <p className="text-xs text-slate-400">
                    Tổng: <span className="text-sky-400 font-bold text-sm">{formatVND(product.Gia * quantity)}</span>
                  </p>
                )}
              </div>
            </div>

            {/* ── Nút hành động CTA ── */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {/* THÊM VÀO GIỎ HÀNG */}
              <button
                id="btn-add-to-cart"
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart || buyingNow}
                className={`flex-1 flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl text-sm font-black uppercase tracking-wide transition-all duration-200 border
                  ${isOutOfStock
                    ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-sky-500/10 hover:bg-sky-500 border-sky-500/40 hover:border-sky-500 text-sky-300 hover:text-white shadow-lg hover:shadow-sky-500/20 active:scale-[0.98]'
                  }
                  disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {addingToCart ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShoppingCart className="w-5 h-5" />
                )}
                <span>{isOutOfStock ? 'Hết Hàng' : addingToCart ? 'Đang Thêm...' : 'Thêm Vào Giỏ Hàng'}</span>
              </button>

              {/* MUA NGAY */}
              <button
                id="btn-buy-now"
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock || addingToCart || buyingNow}
                className={`flex-1 flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl text-sm font-black uppercase tracking-wide transition-all duration-200
                  ${isOutOfStock
                    ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-2xl shadow-sky-500/25 hover:shadow-sky-500/40 active:scale-[0.98]'
                  }
                  disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {buyingNow ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                <span>{buyingNow ? 'Đang Xử Lý...' : 'Mua Ngay'}</span>
                {!isOutOfStock && !buyingNow && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>

            {/* Thông báo Login nếu chưa đăng nhập */}
            {!isAuthenticated && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Bạn cần{' '}
                  <Link to="/login" className="font-bold underline hover:text-amber-200 transition-colors">
                    đăng nhập
                  </Link>{' '}
                  để thêm sản phẩm vào giỏ hàng hoặc mua ngay. Thao tác của bạn sẽ được ghi nhớ tự động.
                </span>
              </div>
            )}

            {/* ── Mô tả sản phẩm ── */}
            {product.MoTa && (
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-200">Mô Tả Sản Phẩm</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
                  {product.MoTa}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════
            Bảng Thông Số Kỹ Thuật
        ════════════════════════════════════════════ */}
        {specGroups.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800/80">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-100 tracking-tight">Thông Số Kỹ Thuật</h2>
                <p className="text-xs text-slate-400">Chi tiết cấu hình phần cứng và phần mềm</p>
              </div>
            </div>

            <div className="space-y-6">
              {specGroups.map(([groupName, specs]) => (
                <div key={groupName} className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
                  {/* Group Header */}
                  <div className="px-5 py-3.5 bg-gradient-to-r from-slate-800/60 to-slate-900/60 border-b border-slate-800/80">
                    <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                      {groupName}
                    </h3>
                  </div>

                  {/* Spec Rows */}
                  <div className="divide-y divide-slate-800/60">
                    {specs.map((spec, idx) => (
                      <div
                        key={spec.MaThongSo || idx}
                        className="grid grid-cols-5 gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="col-span-2 text-xs font-semibold text-slate-400">
                          {spec.TenThongSo}
                        </div>
                        <div className="col-span-3 text-sm font-medium text-slate-200 leading-relaxed">
                          {spec.GiaTri}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fallback khi không có thông số */}
        {specGroups.length === 0 && (
          <section className="p-10 text-center rounded-3xl bg-slate-900/40 border border-slate-800/60 space-y-3">
            <Cpu className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-sm text-slate-500">Thông số kỹ thuật đang được cập nhật...</p>
          </section>
        )}

      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
