import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ChevronRight,
  ShoppingCart,
  Zap,
  PackageCheck,
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
  Cpu,
  Loader2,
  ZoomIn,
  X,
  Monitor,
  Camera,
  MemoryStick,
  Maximize2,
  Sparkles,
} from "lucide-react";
import Navbar from "../../components/user/Navbar";
import Footer from "../../components/user/Footer";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

const SESSION_INTENT_KEY = "cart_action_intent";

const formatVND = (price) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price || 0);

const findSpec = (specs, keywords) => {
  if (!specs?.length) return null;
  const kws = Array.isArray(keywords) ? keywords : [keywords];
  for (const kw of kws) {
    const found = specs.find(
      (s) =>
        s.TenThongSo?.toLowerCase().includes(kw.toLowerCase()) ||
        s.NhomThongSo?.toLowerCase().includes(kw.toLowerCase())
    );
    if (found) return found.GiaTri;
  }
  return null;
};

/* ─── Skeleton Loader ────────────────────────────────────────────────────── */
const SkeletonLoader = () => (
  <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
    <Navbar />
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse space-y-8">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="w-full aspect-square bg-slate-200 rounded-2xl" />
          <div className="space-y-5">
            <div className="h-8 bg-slate-200 rounded-xl w-3/4" />
            <div className="h-6 bg-slate-200 rounded-xl w-1/4" />
            <div className="h-12 bg-slate-200 rounded-2xl w-1/2" />
            <div className="h-24 bg-slate-200 rounded-2xl" />
            <div className="flex gap-3">
              <div className="h-14 bg-slate-200 rounded-2xl flex-1" />
              <div className="h-14 bg-slate-200 rounded-2xl flex-1" />
            </div>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

/* ─── SpecsModal ─────────────────────────────────────────────────────────── */
const SpecsModal = ({ specGroups, productName, onClose }) => {
  const overlayRef = useRef(null);
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white border border-slate-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Thông Số Kỹ Thuật</h2>
              <p className="text-xs text-slate-400 truncate max-w-xs">{productName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {specGroups.length > 0 ? (
            specGroups.map(([groupName, specs]) => (
              <div key={groupName} className="rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-white">
                  <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">{groupName}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {specs.map((spec, idx) => (
                    <div key={spec.MaThongSo || idx} className="grid grid-cols-5 gap-3 px-4 py-3 hover:bg-white transition-colors">
                      <div className="col-span-2 text-xs font-medium text-slate-500">{spec.TenThongSo}</div>
                      <div className="col-span-3 text-sm font-medium text-slate-800 leading-relaxed">{spec.GiaTri}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400 text-sm">Thông số đang được cập nhật...</div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── SuggestedProductCard ───────────────────────────────────────────────── */
const SuggestedProductCard = ({ item }) => {
  const navigate = useNavigate();
  const isOutOfStock = item.TonKho <= 0;

  return (
    <div
      className="group bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-3
                 shadow-sm transition-all duration-300 hover:-translate-y-1
                 hover:shadow-[0_12px_40px_-8px_rgba(37,99,235,0.12)] hover:border-blue-100 cursor-pointer"
      onClick={() => navigate(`/products/${item.MaSanPham}`)}
    >
      <div className="relative w-full aspect-square rounded-xl bg-slate-50 flex items-center justify-center p-4 overflow-hidden">
        {item.Anh ? (
          <img
            src={item.Anh}
            alt={item.TenSanPham}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <PackageCheck className="w-12 h-12 text-slate-300" />
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hết hàng</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
          {item.TenSanPham}
        </h3>
        <div className="flex items-center justify-between">
          <p className="font-bold text-blue-600 text-base">{formatVND(item.Gia)}</p>
          {item.DungLuong && (
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {item.DungLuong}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl
                   transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-1.5
                   opacity-0 group-hover:opacity-100 shadow-sm"
        onClick={(e) => { e.stopPropagation(); navigate(`/products/${item.MaSanPham}`); }}
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        Xem chi tiết
      </button>
    </div>
  );
};

/* ─── ProductDetailPage ──────────────────────────────────────────────────── */
const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomActive, setZoomActive] = useState(false);
  const [selectedRom, setSelectedRom] = useState("");
  const [selectedStorage, setSelectedStorage] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/products/${id}`);
      if (res.data?.success) {
        const data = res.data.data;
        setProduct(data);
        // Luôn parse từ chuỗi để tránh trường hợp danhSachDungLuong chứa chuỗi gốc
        if (data.DungLuong) {
          const parsed = data.DungLuong.split(',').map(item => item.trim()).filter(Boolean);
          if (parsed.length > 0) setSelectedStorage(parsed[0]);
        }
        if (data.MauSac) {
          const parsed = data.MauSac.split(',').map(item => item.trim()).filter(Boolean);
          if (parsed.length > 0) setSelectedColor(parsed[0]);
        }
      } else {
        setError("Không tìm thấy sản phẩm");
      }
    } catch (err) {
      if (err.response?.status === 404)
        setError("Sản phẩm không tồn tại hoặc đã ngừng kinh doanh");
      else
        setError("Không thể tải thông tin sản phẩm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProduct(); window.scrollTo({ top: 0, behavior: "smooth" }); }, [fetchProduct]);

  const fetchSuggestedProducts = useCallback(async () => {
    try {
      setLoadingSuggested(true);
      const res = await api.get("/products", { params: { limit: 20, page: 1 } });
      if (res.data?.success) {
        const all = res.data.data.filter((p) => String(p.MaSanPham) !== String(id));
        setSuggestedProducts(all.sort(() => Math.random() - 0.5).slice(0, 8));
      }
    } catch {} finally { setLoadingSuggested(false); }
  }, [id]);

  useEffect(() => { if (product) fetchSuggestedProducts(); }, [product, fetchSuggestedProducts]);

  const specGroups = React.useMemo(() => {
    if (!product?.thongsokythuat?.length) return [];
    const groups = {};
    product.thongsokythuat.forEach((spec) => {
      const group = spec.NhomThongSo || "Thông số khác";
      if (!groups[group]) groups[group] = [];
      groups[group].push(spec);
    });
    return Object.entries(groups);
  }, [product]);

  const quickSpecs = React.useMemo(() => {
    if (!product?.thongsokythuat?.length) return [];
    const specs = product.thongsokythuat;
    const manHinh = findSpec(specs, ["man hinh", "kich thuoc man", "screen", "hien thi", "display"]);
    const camera = findSpec(specs, ["camera", "chup anh", "rear camera"]);
    const ram = findSpec(specs, ["ram", "bo nho ram"]);
    const result = [];
    if (manHinh) result.push({ icon: Monitor, label: "Màn hình", value: manHinh });
    if (camera) result.push({ icon: Camera, label: "Camera", value: camera });
    if (ram) result.push({ icon: MemoryStick, label: "RAM", value: ram });
    return result;
  }, [product]);

  const isOutOfStock = product?.TonKho <= 0;

  /* ── Parse chuỗi biến thể từ DB (luôn dùng chuỗi, bỏ qua mảng raw) ── */
  const storageList = product?.DungLuong
    ? product.DungLuong.split(',').map(item => item.trim()).filter(Boolean)
    : [];
  const colorList = product?.MauSac
    ? product.MauSac.split(',').map(item => item.trim()).filter(Boolean)
    : [];

  const activeStorage = selectedStorage;
  const activeColor   = selectedColor;

  const saveIntentAndRedirectToLogin = (actionType) => {
    const intent = {
      product_id: product.MaSanPham,
      variant: { DungLuong: selectedRom, MauSac: selectedColor },
      quantity,
      action_type: actionType,
      product_name: product.TenSanPham,
      redirect_back: `/products/${id}`,
    };
    sessionStorage.setItem(SESSION_INTENT_KEY, JSON.stringify(intent));
    toast("Vui lòng đăng nhập để tiếp tục", { icon: "🔐", id: "login-required", duration: 2500 });
    navigate("/login");
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) { saveIntentAndRedirectToLogin("add_to_cart"); return; }
    if (isOutOfStock) { toast.error("Sản phẩm đã hết hàng", { id: "out-of-stock" }); return; }
    try {
      setAddingToCart(true);
      const result = await addToCart(product.MaSanPham, quantity);
      if (result.success) {
        const variantLabel = [selectedRom, selectedColor].filter(Boolean).join(" · ");
        toast.success(`Đã thêm vào giỏ hàng${variantLabel ? " · " + variantLabel : ""}`,
          { id: `cart-add-${product.MaSanPham}`, duration: 3000 });
      } else {
        toast.error(result.message || "Không thể thêm vào giỏ hàng.", { id: "cart-error" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể thêm vào giỏ hàng.", { id: "cart-error" });
    } finally { setAddingToCart(false); }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) { saveIntentAndRedirectToLogin("buy_now"); return; }
    if (isOutOfStock) { toast.error("Sản phẩm đã hết hàng", { id: "out-of-stock" }); return; }
    try {
      setBuyingNow(true);
      const result = await addToCart(product.MaSanPham, quantity);
      if (result.success) {
        navigate("/checkout");
      } else {
        toast.error(result.message || "Không thể xử lý. Vui lòng thử lại.", { id: "buynow-error" });
        setBuyingNow(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể xử lý. Vui lòng thử lại.", { id: "buynow-error" });
      setBuyingNow(false);
    }
  };

  const handleQtyChange = (delta) => {
    setQuantity((prev) => {
      const maxQty = product?.TonKho || 99;
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > maxQty) return maxQty;
      return next;
    });
  };

  if (loading) return <SkeletonLoader />;

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6 p-10 bg-white border border-slate-100 rounded-3xl shadow-[0_8px_40px_-8px_rgba(0,0,0,0.1)]">
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800">Không tìm thấy sản phẩm</h2>
              <p className="text-sm text-slate-500">{error}</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
              >
                Quay lại
              </button>
              <Link
                to="/products"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      {showSpecsModal && (
        <SpecsModal specGroups={specGroups} productName={product.TenSanPham} onClose={() => setShowSpecsModal(false)} />
      )}

      <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-12">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          <Link to="/" className="hover:text-blue-600 transition-colors font-medium">Trang chủ</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <Link to="/products" className="hover:text-blue-600 transition-colors font-medium">Sản phẩm</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="text-slate-700 font-semibold truncate max-w-[200px] sm:max-w-xs">{product.TenSanPham}</span>
        </nav>

        {/* ═══════════════════════════════════════
            DIV 1 - THÔNG TIN CHÍNH
        ═══════════════════════════════════════ */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">

          {/* Cột Trái: Gallery */}
          <div className="lg:sticky lg:top-20">
            <div
              className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white border border-slate-100
                         shadow-[0_8px_40px_-8px_rgba(0,0,0,0.08)] flex items-center justify-center group cursor-zoom-in"
              onClick={() => setZoomActive((z) => !z)}
            >
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/20 pointer-events-none" />

              {product.Anh ? (
                <img
                  src={product.Anh}
                  alt={product.TenSanPham}
                  className={`w-full h-full object-contain p-10 transition-all duration-500 ${
                    zoomActive ? "scale-125" : "scale-100 group-hover:scale-105"
                  }`}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <PackageCheck className="w-24 h-24 text-slate-200" />
              )}

              {/* Zoom hint */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {zoomActive ? <Maximize2 className="w-3 h-3" /> : <ZoomIn className="w-3 h-3" />}
                <span>{zoomActive ? "Thu nhỏ" : "Phóng to"}</span>
              </div>

              {/* Stock badge */}
              <div className="absolute top-4 left-4">
                {isOutOfStock ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
                    Hết hàng
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    Còn hàng
                  </span>
                )}
              </div>

              {activeStorage && (
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                    {activeStorage}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Cột Phải: Chi tiết + CTA */}
          <div className="space-y-6">

            {/* Tên + Trạng thái */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                    Hết hàng
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    Còn hàng
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight tracking-tight">
                {product.TenSanPham}
              </h1>
            </div>

            {/* Giá */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100">
              <p className="text-3xl sm:text-4xl font-black text-blue-600 leading-tight">
                {formatVND(product.Gia)}
              </p>
            </div>

            {/* Chọn Phiên bản (Dung lượng) */}
            {storageList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-500 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-700">Phiên bản</h3>
                  {activeStorage && (
                    <span className="ml-auto px-3 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                      {activeStorage}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {storageList.map((rom) => {
                    const isSelected = activeStorage === rom;
                    return (
                      <button
                        key={rom}
                        type="button"
                        onClick={() => setSelectedStorage(rom)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20"
                            : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>{rom}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chọn Màu sắc */}
            {colorList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-500 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-700">Màu sắc</h3>
                  {activeColor && (
                    <span className="ml-auto px-3 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                      {activeColor}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {colorList.map((color) => {
                    const isSelected = activeColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20"
                            : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>{color}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Số lượng */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-600 shrink-0">Số lượng:</span>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  id="btn-qty-decrease"
                  onClick={() => handleQtyChange(-1)}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center text-sm font-bold text-slate-800 select-none tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  id="btn-qty-increase"
                  onClick={() => handleQtyChange(1)}
                  disabled={quantity >= (product.TonKho || 0) || isOutOfStock}
                  className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                id="btn-add-to-cart"
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart || buyingNow}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl text-sm font-bold transition-all duration-200 border ${
                  isOutOfStock
                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-white hover:bg-blue-50 border-blue-200 hover:border-blue-400 text-blue-600 hover:text-blue-700 shadow-sm active:scale-[0.98]"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {addingToCart ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                <span>{isOutOfStock ? "Hết Hàng" : addingToCart ? "Đang Thêm..." : "Thêm Vào Giỏ"}</span>
              </button>

              <button
                id="btn-buy-now"
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock || addingToCart || buyingNow}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isOutOfStock
                    ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98]"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {buyingNow ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                <span>{buyingNow ? "Đang Xử Lý..." : "Mua Ngay"}</span>
                {!isOutOfStock && !buyingNow && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>

            {/* Login hint */}
            {!isAuthenticated && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <span>
                  Bạn cần{" "}
                  <Link to="/login" className="font-bold underline hover:text-amber-900 transition-colors">
                    đăng nhập
                  </Link>{" "}
                  để thêm vào giỏ hoặc mua ngay. Thao tác sẽ được ghi nhớ tự động.
                </span>
              </div>
            )}

            {/* Cam kết dịch vụ */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: Shield, label: "100% Chính hãng", sub: "Bảo hành Apple/NSX", bg: "bg-blue-50", color: "text-blue-600", border: "border-blue-100" },
                { icon: RotateCcw, label: "30 ngày 1 đổi 1", sub: "Lỗi phần cứng", bg: "bg-violet-50", color: "text-violet-600", border: "border-violet-100" },
                { icon: Truck, label: "Giao hàng 2 giờ", sub: "Nội thành miễn phí", bg: "bg-indigo-50", color: "text-indigo-600", border: "border-indigo-100" },
                { icon: CreditCard, label: "Trả góp 0%", sub: "6-24 tháng", bg: "bg-emerald-50", color: "text-emerald-600", border: "border-emerald-100" },
              ].map(({ icon: Icon, label, sub, bg, color, border }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border bg-white ${border} transition-colors`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{label}</p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Thông số kỹ thuật nhanh */}
            {(quickSpecs.length > 0 || specGroups.length > 0) && (
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-slate-800">Thông Số Kỹ Thuật</h3>
                  </div>
                  {specGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSpecsModal(true)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                    >
                      Xem tất cả
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {quickSpecs.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {quickSpecs.map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
                          <p className="text-sm font-medium text-slate-800 leading-relaxed">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-4 text-sm text-slate-400">Thông số đang được cập nhật.</div>
                )}
                {specGroups.length > 0 && (
                  <div className="px-5 py-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowSpecsModal(true)}
                      className="w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center justify-center gap-1.5 py-1"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Xem tất cả thông số kỹ thuật
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════
            DIV 2 - MÔ TẢ SẢN PHẨM
        ═══════════════════════════════════════ */}
        {product.MoTa && (
          <section className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Mô Tả Sản Phẩm</h2>
                <p className="text-xs text-slate-400">Thông tin chi tiết từ nhà sản xuất</p>
              </div>
            </div>
            <div className="px-8 py-7">
              <p className="text-slate-600 leading-[1.9] whitespace-pre-line text-[15px]">{product.MoTa}</p>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            DIV 3 - SẢN PHẨM TƯƠNG TỰ (Grid 4 cột)
        ═══════════════════════════════════════ */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Có Thể Bạn Sẽ Thích</h2>
                <p className="text-xs text-slate-400">Sản phẩm tương tự dành cho bạn</p>
              </div>
            </div>
            <Link
              to="/products"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              Xem tất cả
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingSuggested ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse space-y-3 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <div className="w-full aspect-square bg-slate-100 rounded-xl" />
                  <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                  <div className="h-5 bg-slate-100 rounded-lg w-1/2" />
                </div>
              ))}
            </div>
          ) : suggestedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {suggestedProducts.map((item) => (
                <SuggestedProductCard key={item.MaSanPham} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">Không có sản phẩm gợi ý.</div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
