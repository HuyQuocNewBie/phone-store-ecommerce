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

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
const SkeletonLoader = () => (
  <div className="min-h-screen bg-[#0a0a0f] text-slate-100 flex flex-col">
    <Navbar />
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse space-y-8">
        <div className="h-4 bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="w-full aspect-square bg-slate-800 rounded-3xl" />
          <div className="space-y-5">
            <div className="h-8 bg-slate-800 rounded w-3/4" />
            <div className="h-6 bg-slate-800 rounded w-1/4" />
            <div className="h-12 bg-slate-800 rounded-2xl w-1/2" />
            <div className="h-24 bg-slate-800 rounded-2xl" />
            <div className="flex gap-3">
              <div className="h-14 bg-slate-800 rounded-2xl flex-1" />
              <div className="h-14 bg-slate-800 rounded-2xl flex-1" />
            </div>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

// ─── Modal Thong So Ky Thuat ──────────────────────────────────────────────────
const SpecsModal = ({ specGroups, productName, onClose }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#111118] border border-slate-700/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-100">Thong So Ky Thuat</h2>
              <p className="text-xs text-slate-500 truncate max-w-xs">{productName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {specGroups.length > 0 ? (
            specGroups.map(([groupName, specs]) => (
              <div
                key={groupName}
                className="rounded-2xl bg-slate-900/70 border border-slate-800/60 overflow-hidden"
              >
                <div className="px-4 py-3 bg-gradient-to-r from-slate-800/70 to-slate-900/70 border-b border-slate-800/60">
                  <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                    {groupName}
                  </h3>
                </div>
                <div className="divide-y divide-slate-800/40">
                  {specs.map((spec, idx) => (
                    <div
                      key={spec.MaThongSo || idx}
                      className="grid grid-cols-5 gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="col-span-2 text-xs font-semibold text-slate-500">
                        {spec.TenThongSo}
                      </div>
                      <div className="col-span-3 text-sm font-medium text-slate-200 leading-relaxed">
                        {spec.GiaTri}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-500 text-sm">
              Thong so dang duoc cap nhat...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── SuggestedProductCard ─────────────────────────────────────────────────────
const SuggestedProductCard = ({ item }) => {
  const navigate = useNavigate();
  const isOutOfStock = item.TonKho <= 0;

  return (
    <div
      className="group bg-slate-900/70 border border-slate-800/60 hover:border-sky-500/40 rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 hover:shadow-xl hover:shadow-sky-900/20 cursor-pointer"
      onClick={() => navigate(`/products/${item.MaSanPham}`)}
    >
      <div className="relative w-full aspect-square rounded-xl bg-slate-950/80 border border-slate-800/50 group-hover:border-slate-700/60 overflow-hidden flex items-center justify-center p-4 transition-colors">
        {item.Anh ? (
          <img
            src={item.Anh}
            alt={item.TenSanPham}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <PackageCheck className="w-12 h-12 text-slate-700" />
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Het hang</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug">
          {item.TenSanPham}
        </h3>
        <div className="flex items-center justify-between mt-auto pt-1">
          <p className="text-base font-black text-sky-400">{formatVND(item.Gia)}</p>
          {item.DungLuong && (
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/40">
              {item.DungLuong}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="w-full py-2 bg-sky-500/10 hover:bg-sky-500 border border-sky-500/30 hover:border-sky-500 text-sky-400 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/products/${item.MaSanPham}`);
        }}
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        Xem chi tiet
      </button>
    </div>
  );
};

// ─── ProductDetailPage (main) ─────────────────────────────────────────────────
const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomActive, setZoomActive] = useState(false);
  const [selectedRom, setSelectedRom] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);

  // Fetch product detail
  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/products/${id}`);
      if (res.data?.success) {
        const data = res.data.data;
        setProduct(data);
        if (data.danhSachDungLuong?.length > 0)
          setSelectedRom(data.DungLuong || data.danhSachDungLuong[0]);
        if (data.danhSachMauSac?.length > 0)
          setSelectedColor(data.MauSac || data.danhSachMauSac[0]);
      } else {
        setError("Khong tim thay san pham");
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError("San pham khong ton tai hoac da ngung kinh doanh");
      } else {
        setError("Khong the tai thong tin san pham. Vui long thu lai.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [fetchProduct]);

  // Fetch suggested products (ngau nhien tu DB)
  const fetchSuggestedProducts = useCallback(async () => {
    try {
      setLoadingSuggested(true);
      const res = await api.get("/products", { params: { limit: 20, page: 1 } });
      if (res.data?.success) {
        const all = res.data.data.filter((p) => String(p.MaSanPham) !== String(id));
        const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 8);
        setSuggestedProducts(shuffled);
      }
    } catch {
      // silent
    } finally {
      setLoadingSuggested(false);
    }
  }, [id]);

  useEffect(() => {
    if (product) fetchSuggestedProducts();
  }, [product, fetchSuggestedProducts]);

  // Spec groups (for modal)
  const specGroups = React.useMemo(() => {
    if (!product?.thongsokythuat?.length) return [];
    const groups = {};
    product.thongsokythuat.forEach((spec) => {
      const group = spec.NhomThongSo || "Thong so khac";
      if (!groups[group]) groups[group] = [];
      groups[group].push(spec);
    });
    return Object.entries(groups);
  }, [product]);

  // Quick specs: Man hinh, Camera, RAM
  const quickSpecs = React.useMemo(() => {
    if (!product?.thongsokythuat?.length) return [];
    const specs = product.thongsokythuat;
    const manHinh = findSpec(specs, ["man hinh", "kich thuoc man", "screen", "hien thi", "display"]);
    const camera = findSpec(specs, ["camera", "chup anh", "rear camera"]);
    const ram = findSpec(specs, ["ram", "bo nho ram"]);
    const result = [];
    if (manHinh) result.push({ icon: Monitor, label: "Man hinh", value: manHinh });
    if (camera) result.push({ icon: Camera, label: "Camera", value: camera });
    if (ram) result.push({ icon: MemoryStick, label: "RAM", value: ram });
    return result;
  }, [product]);

  const isOutOfStock = product?.TonKho <= 0;

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
    toast("Vui long dang nhap de tiep tuc", {
      icon: "🔐",
      id: "login-required",
      duration: 2500,
    });
    navigate("/login");
  };

  // THEM VAO GIO HANG: Goi API POST /api/v1/cart/items thuc su luu san pham + so luong vao DB
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      saveIntentAndRedirectToLogin("add_to_cart");
      return;
    }
    if (isOutOfStock) {
      toast.error("San pham da het hang", { id: "out-of-stock" });
      return;
    }
    try {
      setAddingToCart(true);
      await api.post("/cart/items", {
        MaSanPham: product.MaSanPham,
        SoLuong: quantity,
      });
      const variantLabel = [selectedRom, selectedColor].filter(Boolean).join(" · ");
      toast.success(
        `Da them vao gio hang${variantLabel ? " · " + variantLabel : ""}`,
        { id: `cart-add-${product.MaSanPham}`, duration: 3000 }
      );
    } catch (err) {
      const msg =
        err.response?.data?.message || "Khong the them vao gio hang. Vui long thu lai.";
      toast.error(msg, { id: "cart-error" });
    } finally {
      setAddingToCart(false);
    }
  };

  // MUA NGAY: them vao gio roi chuyen checkout
  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      saveIntentAndRedirectToLogin("buy_now");
      return;
    }
    if (isOutOfStock) {
      toast.error("San pham da het hang", { id: "out-of-stock" });
      return;
    }
    try {
      setBuyingNow(true);
      await api.post("/cart/items", {
        MaSanPham: product.MaSanPham,
        SoLuong: quantity,
      });
      navigate("/checkout");
    } catch (err) {
      const msg = err.response?.data?.message || "Khong the xu ly. Vui long thu lai.";
      toast.error(msg, { id: "buynow-error" });
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
      <div className="min-h-screen bg-[#0a0a0f] text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6 p-10 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">Khong tim thay san pham</h2>
              <p className="text-sm text-slate-400">{error}</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-all"
              >
                Quay lai
              </button>
              <Link
                to="/products"
                className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-sky-500/20"
              >
                Xem danh muc
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      <Navbar />

      {showSpecsModal && (
        <SpecsModal
          specGroups={specGroups}
          productName={product.TenSanPham}
          onClose={() => setShowSpecsModal(false)}
        />
      )}

      <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-16">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <Link to="/" className="hover:text-sky-400 transition-colors">Trang chu</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />
          <Link to="/products" className="hover:text-sky-400 transition-colors">San pham</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />
          <span className="text-slate-300 font-semibold truncate max-w-[200px] sm:max-w-xs">
            {product.TenSanPham}
          </span>
        </nav>

        {/* ============================================================
            DIV 1 - THONG TIN CHINH (TOP GRID)
        ============================================================ */}
        <section
          id="section-main-info"
          className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start"
        >
          {/* COT TRAI: Anh san pham chinh (khong thumbnail nho ben duoi) */}
          <div className="lg:sticky lg:top-20">
            <div
              className="relative w-full aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-[#111118] to-slate-900 border border-slate-800/80 shadow-2xl shadow-black/50 flex items-center justify-center group cursor-zoom-in"
              onClick={() => setZoomActive((z) => !z)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-sky-600/5 via-transparent to-violet-600/5 pointer-events-none" />
              <div className="absolute -inset-px bg-gradient-to-br from-sky-500/10 via-transparent to-violet-500/10 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {product.Anh ? (
                <img
                  src={product.Anh}
                  alt={product.TenSanPham}
                  className={`w-full h-full object-contain p-10 transition-all duration-500 ${
                    zoomActive ? "scale-125" : "scale-100 group-hover:scale-105"
                  }`}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <PackageCheck className="w-24 h-24 text-slate-700" />
              )}

              {/* Zoom hint */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-slate-800 text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {zoomActive ? (
                  <Maximize2 className="w-3 h-3" />
                ) : (
                  <ZoomIn className="w-3 h-3" />
                )}
                <span>{zoomActive ? "Thu nho" : "Phong to"}</span>
              </div>

              {/* Badge ton kho tren anh */}
              <div className="absolute top-4 left-4">
                {isOutOfStock ? (
                  <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-500/90 text-white shadow-lg shadow-red-500/30">
                    Het hang
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm">
                    Con hang
                  </span>
                )}
              </div>

              {selectedRom && (
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 backdrop-blur-sm">
                    {selectedRom}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* COT PHAI: Ten, Gia, Bien the, CTA, Cam ket, Thong so ngan */}
          <div className="space-y-6">

            {/* Ten san pham + Badge [Con hang / Het hang] (xoa "Smartphone", xoa Rating, xoa "Con 1000 sp") */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/12 text-red-400 border border-red-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                    Het hang
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/12 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    Con hang
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                {product.TenSanPham}
              </h1>
            </div>

            {/* Gia ban chinh thuc (xoa gia cu, VAT, % giam gia rac) */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-500/8 via-indigo-500/5 to-violet-500/8 border border-sky-500/20">
              <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-sky-400 to-indigo-400 leading-tight">
                {formatVND(product.Gia)}
              </p>
              {!isOutOfStock && quantity > 1 && (
                <p className="text-sm text-slate-400 mt-2">
                  Tong ({quantity} sp):{" "}
                  <span className="text-sky-400 font-bold">{formatVND(product.Gia * quantity)}</span>
                </p>
              )}
            </div>

            {/* Khoi chon "Phien ban" (Dung Luong) */}
            {product.danhSachDungLuong?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-violet-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-200">Phien ban</h3>
                  {selectedRom && (
                    <span className="ml-auto text-xs font-semibold text-violet-300 bg-violet-500/10 px-2.5 py-0.5 rounded-full border border-violet-500/20">
                      {selectedRom}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.danhSachDungLuong.map((rom) => {
                    const isSelected = selectedRom === rom;
                    return (
                      <button
                        key={rom}
                        type="button"
                        onClick={() => setSelectedRom(rom)}
                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                          isSelected
                            ? "bg-violet-500/15 border-violet-500/60 text-violet-200 shadow-lg shadow-violet-500/15"
                            : "bg-slate-900/80 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:text-slate-100 hover:bg-slate-800/80"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                        <span>{rom}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Khoi chon Mau sac */}
            {product.danhSachMauSac?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-sky-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-200">Mau sac</h3>
                  {selectedColor && (
                    <span className="ml-auto text-xs font-semibold text-sky-300 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                      {selectedColor}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.danhSachMauSac.map((color) => {
                    const isSelected = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                          isSelected
                            ? "bg-sky-500/15 border-sky-500/60 text-sky-200 shadow-lg shadow-sky-500/15"
                            : "bg-slate-900/80 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:text-slate-100 hover:bg-slate-800/80"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                        <span>{color}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* So luong */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-slate-300 shrink-0">So luong:</span>
              <div className="flex items-center bg-slate-900/80 border border-slate-700/60 rounded-xl overflow-hidden">
                <button
                  type="button"
                  id="btn-qty-decrease"
                  onClick={() => handleQtyChange(-1)}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center text-sm font-black text-slate-100 select-none tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  id="btn-qty-increase"
                  onClick={() => handleQtyChange(1)}
                  disabled={quantity >= (product.TonKho || 0) || isOutOfStock}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Nut THEM VAO GIO HANG & MUA NGAY */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                id="btn-add-to-cart"
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart || buyingNow}
                className={`flex-1 flex items-center justify-center gap-2.5 py-4 px-5 rounded-2xl text-sm font-black uppercase tracking-wide transition-all duration-200 border ${
                  isOutOfStock
                    ? "bg-slate-800/60 border-slate-700/40 text-slate-500 cursor-not-allowed"
                    : "bg-sky-500/10 hover:bg-sky-500 border-sky-500/40 hover:border-sky-500 text-sky-300 hover:text-white shadow-lg hover:shadow-sky-500/25 active:scale-[0.98]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {addingToCart ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShoppingCart className="w-5 h-5" />
                )}
                <span>
                  {isOutOfStock ? "Het Hang" : addingToCart ? "Dang Them..." : "Them Vao Gio Hang"}
                </span>
              </button>

              <button
                id="btn-buy-now"
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock || addingToCart || buyingNow}
                className={`flex-1 flex items-center justify-center gap-2.5 py-4 px-5 rounded-2xl text-sm font-black uppercase tracking-wide transition-all duration-200 ${
                  isOutOfStock
                    ? "bg-slate-800/60 border border-slate-700/40 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-2xl shadow-sky-500/20 hover:shadow-sky-500/35 active:scale-[0.98]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {buyingNow ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                <span>{buyingNow ? "Dang Xu Ly..." : "Mua Ngay"}</span>
                {!isOutOfStock && !buyingNow && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>

            {/* Login hint */}
            {!isAuthenticated && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/6 border border-amber-500/20 text-xs text-amber-300/90">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Ban can{" "}
                  <Link to="/login" className="font-bold underline hover:text-amber-200 transition-colors">
                    dang nhap
                  </Link>{" "}
                  de them vao gio hoac mua ngay. Thao tac se duoc ghi nho tu dong.
                </span>
              </div>
            )}

            {/* Khoi cam ket dich vu: 100% Chinh hang, 30 ngay 1 doi 1... */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  icon: Shield,
                  label: "100% Chinh hang",
                  sub: "Bao hanh Apple/NSX",
                  colorClass: "border-sky-500/20 hover:border-sky-500/40",
                  bgClass: "bg-sky-500/10",
                  iconClass: "text-sky-400",
                },
                {
                  icon: RotateCcw,
                  label: "30 ngay 1 doi 1",
                  sub: "Loi phan cung",
                  colorClass: "border-violet-500/20 hover:border-violet-500/40",
                  bgClass: "bg-violet-500/10",
                  iconClass: "text-violet-400",
                },
                {
                  icon: Truck,
                  label: "Giao hang 2 gio",
                  sub: "Noi thanh mien phi",
                  colorClass: "border-indigo-500/20 hover:border-indigo-500/40",
                  bgClass: "bg-indigo-500/10",
                  iconClass: "text-indigo-400",
                },
                {
                  icon: CreditCard,
                  label: "Tra gop 0%",
                  sub: "6-24 thang",
                  colorClass: "border-emerald-500/20 hover:border-emerald-500/40",
                  bgClass: "bg-emerald-500/10",
                  iconClass: "text-emerald-400",
                },
              ].map(({ icon: Icon, label, sub, colorClass, bgClass, iconClass }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border bg-slate-900/60 ${colorClass} transition-colors cursor-default`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bgClass}`}>
                    <Icon className={`w-4 h-4 ${iconClass}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200 leading-tight">{label}</p>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Khoi "Thong So Ky Thuat" ngan gon (Man hinh, Camera, RAM) + nut "Xem tat ca thong so" mo Modal */}
            {(quickSpecs.length > 0 || specGroups.length > 0) && (
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-200">Thong So Ky Thuat</h3>
                  </div>
                  {specGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSpecsModal(true)}
                      className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                    >
                      Xem tat ca
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {quickSpecs.length > 0 ? (
                  <div className="divide-y divide-slate-800/40">
                    {quickSpecs.map(({ icon: Icon, label, value }) => (
                      <div
                        key={label}
                        className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-800/20 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">{label}</p>
                          <p className="text-sm font-medium text-slate-200 leading-relaxed">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-4 text-sm text-slate-500">Thong so dang duoc cap nhat.</div>
                )}

                {specGroups.length > 0 && (
                  <div className="px-5 py-3 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => setShowSpecsModal(true)}
                      className="w-full text-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center justify-center gap-1.5 py-1"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Xem tat ca thong so ky thuat
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ============================================================
            DIV 2 - MO TA SAN PHAM - hien thi noi dung MoTa tu DB
        ============================================================ */}
        {product.MoTa && (
          <section
            id="section-description"
            className="rounded-3xl bg-slate-900/50 border border-slate-800/60 overflow-hidden"
          >
            <div className="px-8 py-5 border-b border-slate-800/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <Info className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-100">Mo Ta San Pham</h2>
                <p className="text-xs text-slate-500">Thong tin chi tiet tu nha san xuat</p>
              </div>
            </div>
            <div className="px-8 py-7">
              <p className="text-slate-300 leading-[1.9] whitespace-pre-line text-[15px]">
                {product.MoTa}
              </p>
            </div>
          </section>
        )}

        {/* ============================================================
            DIV 3 - GOI Y SAN PHAM - render danh sach ngau nhien cac san pham khac tu DB
        ============================================================ */}
        <section id="section-suggestions" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-100">Co The Ban Se Thich</h2>
                <p className="text-xs text-slate-500">San pham tuong tu danh cho ban</p>
              </div>
            </div>
            <Link
              to="/products"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              Xem tat ca
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingSuggested ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse space-y-3 bg-slate-900/50 rounded-2xl p-4 border border-slate-800/40"
                >
                  <div className="w-full aspect-square bg-slate-800 rounded-xl" />
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-5 bg-slate-800 rounded w-1/2" />
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
            <div className="text-center py-12 text-slate-500 text-sm">
              Khong co san pham goi y.
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
