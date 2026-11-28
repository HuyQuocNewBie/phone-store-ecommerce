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
  MemoryStick,
  Camera,
  Maximize2,
  Sparkles,
  BatteryFull,
  Heart,
  Ticket,
  Tag,
  Copy,
  Clock,
} from "lucide-react";
import Navbar from "../../components/user/Navbar";
import Footer from "../../components/user/Footer";
import ProductCard from "../../components/user/ProductCard";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useCompare } from "../../context/CompareContext";
import { useWishlist } from "../../context/WishlistContext";
import SpecDrawer from "../../components/user/SpecDrawer";
import ReviewSection from "../../components/user/ReviewSection";

const SESSION_INTENT_KEY = "cart_action_intent";

const formatVND = (price) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price || 0);

const formatCompactVND = (amount) => {
  const num = Number(amount) || 0;
  if (num >= 1000000) {
    const m = num / 1000000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}Tr`;
  }
  if (num >= 1000) {
    const k = num / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(0)}K`;
  }
  return `${num}đ`;
};

const formatDateVN = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const normalizeAttr = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).toLowerCase().replace(/\s+/g, "").trim();
};

const copyTextToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};

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

/* ─── ProductDetailPage ──────────────────────────────────────────────────── */
const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { toggleCompare, isInCompare } = useCompare();
  const { isWished, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomActive, setZoomActive] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [showSpecDrawer, setShowSpecDrawer] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState("");

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/products/${id}`);
      if (res.data?.success) {
        const data = res.data.data;
        setProduct(data);
        const variantList = Array.isArray(data?.variants)
          ? data.variants
          : Array.isArray(data?.bienThe)
            ? data.bienThe
            : [];
        if (variantList.length > 0) {
          // Ưu tiên chọn sẵn biến thể đầu tiên đang còn hàng để hiển thị đúng GiaBan & TonKho
          const defaultVariant =
            variantList.find((v) => Number(v.TonKho) > 0 && v.TrangThai !== "HetHang" && v.TrangThai !== "NgungBan") ||
            variantList[0];
          setSelectedStorage(defaultVariant?.DungLuong || "");
          setSelectedColor(defaultVariant?.MauSac || "");
        } else {
          // Fallback dữ liệu cũ chưa có biến thể
          setSelectedStorage("");
          setSelectedColor("");
        }
        setQuantity(1);
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

  // Lấy danh sách voucher công khai khả dụng cho khối "Ưu đãi & Mã giảm giá khả dụng"
  useEffect(() => {
    let mounted = true;
    const fetchAvailableVouchers = async () => {
      try {
        setLoadingVouchers(true);
        const res = await api.get("/vouchers/available");
        if (mounted && res.data?.success && res.data?.data) {
          const { all, giamGiaDon = [], freeShip = [] } = res.data.data;
          const combined = Array.isArray(all) ? all : [...giamGiaDon, ...freeShip];
          setAvailableVouchers(combined);
        }
      } catch {
        if (mounted) setAvailableVouchers([]);
      } finally {
        if (mounted) setLoadingVouchers(false);
      }
    };
    fetchAvailableVouchers();
    return () => { mounted = false; };
  }, []);

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

  // 3 thông số nhanh: Màn hình | Camera | RAM – khớp layout PHP
  const quickSpecs = React.useMemo(() => {
    if (!product?.thongsokythuat?.length) return [];
    const specs = product.thongsokythuat;
    const screen = findSpec(specs, ["kích thước màn hình", "man hinh", "kich thuoc man", "màn hình", "screen", "display"]);
    const camera = findSpec(specs, ["độ phân giải camera", "camera", "resolution", "do phan giai camera"]);
    const ram    = findSpec(specs, ["ram", "dung lượng ram", "dung luong ram"]);
    return [
      { key: "screen", label: "Kích thước màn hình", value: screen },
      { key: "camera", label: "Camera",              value: camera },
      { key: "ram",    label: "RAM",                 value: ram },
    ].filter((s) => s.value);
  }, [product]);

  const isFavorite = product && isWished(product.MaSanPham) === true;

  /* ── Danh sách biến thể SKU (MaBienThe, MauSac, DungLuong, GiaBan, TonKho) ── */
  const variants = React.useMemo(() => {
    if (Array.isArray(product?.variants)) return product.variants;
    if (Array.isArray(product?.bienThe)) return product.bienThe;
    return [];
  }, [product]);

  const storageList = React.useMemo(() => {
    if (variants.length > 0) {
      return [...new Set(variants.map((v) => v.DungLuong).filter(Boolean))];
    }
    return product?.DungLuong
      ? product.DungLuong.split(",").map((item) => item.trim()).filter(Boolean)
      : [];
  }, [variants, product]);

  const colorList = React.useMemo(() => {
    if (variants.length > 0) {
      return [...new Set(variants.map((v) => v.MauSac).filter(Boolean))];
    }
    return product?.MauSac
      ? product.MauSac.split(",").map((item) => item.trim()).filter(Boolean)
      : [];
  }, [variants, product]);

  const activeStorage = selectedStorage;
  const activeColor   = selectedColor;

  // Tìm chính xác MaBienThe khớp Dung lượng + Màu sắc đang chọn
  const selectedVariant = React.useMemo(() => {
    if (variants.length === 0) return null;
    const hasStorageOptions = storageList.length > 0;
    const hasColorOptions = colorList.length > 0;

    if ((hasStorageOptions && !activeStorage) || (hasColorOptions && !activeColor)) {
      return variants.length === 1 ? variants[0] : null;
    }

    const wantStorage = normalizeAttr(activeStorage);
    const wantColor = normalizeAttr(activeColor);

    const exact = variants.find(
      (v) =>
        (!hasStorageOptions || normalizeAttr(v.DungLuong) === wantStorage) &&
        (!hasColorOptions || normalizeAttr(v.MauSac) === wantColor)
    );
    return exact || null;
  }, [variants, storageList, colorList, activeStorage, activeColor]);

  const hasVariantMatrix = variants.length > 0;
  const allOptionsSelected =
    (storageList.length === 0 || Boolean(activeStorage)) &&
    (colorList.length === 0 || Boolean(activeColor));

  // Giá bán & Tồn kho thực tế của biến thể đang chọn (fallback về sản phẩm cha nếu không có biến thể)
  const displayPrice = selectedVariant && Number(selectedVariant.GiaBan) > 0
    ? Number(selectedVariant.GiaBan)
    : Number(product?.Gia) || 0;

  const displayStock = hasVariantMatrix
    ? selectedVariant
      ? Number(selectedVariant.TonKho) || 0
      : allOptionsSelected
        ? 0
        : Number(product?.TonKho) || 0
    : Number(product?.TonKho) || 0;

  const isOutOfStock = hasVariantMatrix
    ? selectedVariant
      ? Number(selectedVariant.TonKho) <= 0 ||
        selectedVariant.TrangThai === "HetHang" ||
        selectedVariant.TrangThai === "NgungBan"
      : allOptionsSelected
        ? true
        : (product?.TonKho ?? 0) <= 0
    : (product?.TonKho ?? 0) <= 0;

  // Tự động điều chỉnh số lượng khi đổi sang biến thể có tồn kho thấp hơn
  useEffect(() => {
    if (displayStock <= 0) {
      setQuantity(1);
    } else if (quantity > displayStock) {
      setQuantity(displayStock);
    }
  }, [displayStock, selectedVariant?.MaBienThe]);

  // Helper kiểm tra tồn kho / giá theo từng lựa chọn Dung lượng & Màu sắc
  const getStorageMeta = useCallback(
    (rom) => {
      if (!hasVariantMatrix) return { minPrice: null, totalStock: product?.TonKho ?? 0 };
      const matched = variants.filter((v) => normalizeAttr(v.DungLuong) === normalizeAttr(rom));
      if (matched.length === 0) return { minPrice: null, totalStock: 0 };
      const prices = matched.map((v) => Number(v.GiaBan) || 0).filter((p) => p > 0);
      const totalStock = matched.reduce((sum, v) => sum + (Number(v.TonKho) || 0), 0);
      return {
        minPrice: prices.length > 0 ? Math.min(...prices) : null,
        totalStock,
      };
    },
    [hasVariantMatrix, variants, product]
  );

  const getColorMeta = useCallback(
    (color) => {
      if (!hasVariantMatrix) return { stock: product?.TonKho ?? 0, exists: true };
      const matched = variants.filter(
        (v) =>
          normalizeAttr(v.MauSac) === normalizeAttr(color) &&
          (!activeStorage || normalizeAttr(v.DungLuong) === normalizeAttr(activeStorage))
      );
      if (matched.length === 0) return { stock: 0, exists: false };
      const totalStock = matched.reduce((sum, v) => sum + (Number(v.TonKho) || 0), 0);
      return { stock: totalStock, exists: true };
    },
    [hasVariantMatrix, variants, activeStorage, product]
  );

  // Lọc các mã voucher đang áp dụng được cho sản phẩm theo mức giá hiện tại
  const applicableVouchers = React.useMemo(() => {
    if (!availableVouchers.length) return [];
    const price = Number(displayPrice) || 0;
    const eligible = availableVouchers.filter(
      (v) => Number(v.GiaTriToiThieu || 0) <= price
    );
    return eligible.sort((a, b) => {
      const aShip = a.NhomVoucher === "FreeShip" || a.LoaiGiam === "freeship" ? 1 : 0;
      const bShip = b.NhomVoucher === "FreeShip" || b.LoaiGiam === "freeship" ? 1 : 0;
      if (aShip !== bShip) return aShip - bShip;
      return Number(b.GiaTriGiam || 0) - Number(a.GiaTriGiam || 0);
    });
  }, [availableVouchers, displayPrice]);

  const handleCopyVoucher = async (code) => {
    const ok = await copyTextToClipboard(code);
    setCopiedVoucherCode(code);
    if (ok) {
      toast.success(`Đã sao chép mã ${code}!`, { id: `copy-pd-${code}`, duration: 2200 });
    } else {
      toast.success(`Mã giảm giá: ${code}`, { id: `copy-pd-${code}`, duration: 2500 });
    }
    setTimeout(() => {
      setCopiedVoucherCode((prev) => (prev === code ? "" : prev));
    }, 2000);
  };

  const saveIntentAndRedirectToLogin = (actionType) => {
    const intent = {
      product_id: product.MaSanPham,
      MaSanPham: product.MaSanPham,
      MaBienThe: selectedVariant?.MaBienThe || null,
      variant: {
        MaBienThe: selectedVariant?.MaBienThe || null,
        DungLuong: selectedStorage,
        MauSac: selectedColor,
      },
      DungLuong: selectedStorage,
      MauSac: selectedColor,
      quantity,
      SoLuong: quantity,
      action_type: actionType,
      product_name: product.TenSanPham,
      redirect_back: `/products/${id}`,
    };
    sessionStorage.setItem(SESSION_INTENT_KEY, JSON.stringify(intent));
    toast("Vui lòng đăng nhập để tiếp tục", { icon: "🔐", id: "login-required", duration: 2500 });
    navigate("/login");
  };

  const handleAddToCart = async () => {
    if (isOutOfStock) {
      toast.error("Tạm hết hàng phiên bản này", { id: "out-of-stock" });
      return;
    }

    const hasStorage = storageList.length > 0;
    const hasColor = colorList.length > 0;
    if ((hasStorage && !selectedStorage) || (hasColor && !selectedColor)) {
      toast.error("Vui lòng chọn Dung lượng và Màu sắc sản phẩm", { id: "variant-required" });
      return;
    }

    if (!isAuthenticated) { saveIntentAndRedirectToLogin("add_to_cart"); return; }
    try {
      setAddingToCart(true);
      const payload = {
        MaSanPham: product.MaSanPham,
        MaBienThe: selectedVariant?.MaBienThe || null,
        SoLuong: quantity,
        DungLuong: selectedStorage,
        MauSac: selectedColor,
      };
      const result = await addToCart(payload);
      if (result.success) {
        toast.success(`Đã thêm ${product.TenSanPham} vào giỏ hàng!`, {
          id: `cart-add-${product.MaSanPham}`,
          duration: 3000,
        });
      } else {
        toast.error(result.message || "Không thể thêm vào giỏ hàng.", { id: "cart-error" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể thêm vào giỏ hàng.", { id: "cart-error" });
    } finally { setAddingToCart(false); }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) {
      toast.error("Tạm hết hàng phiên bản này", { id: "out-of-stock" });
      return;
    }

    const hasStorage = storageList.length > 0;
    const hasColor = colorList.length > 0;
    if ((hasStorage && !selectedStorage) || (hasColor && !selectedColor)) {
      toast.error("Vui lòng chọn Dung lượng và Màu sắc sản phẩm", { id: "variant-required" });
      return;
    }

    if (!isAuthenticated) { saveIntentAndRedirectToLogin("buy_now"); return; }
    try {
      setBuyingNow(true);
      const payload = {
        MaSanPham: product.MaSanPham,
        MaBienThe: selectedVariant?.MaBienThe || null,
        SoLuong: quantity,
        DungLuong: selectedStorage,
        MauSac: selectedColor,
      };
      const result = await addToCart(payload);
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
      const maxQty = displayStock || 1;
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

      {/* SpecsModal cũ (giữ lại để không phá vỡ) */}
      {showSpecsModal && (
        <SpecsModal specGroups={specGroups} productName={product.TenSanPham} onClose={() => setShowSpecsModal(false)} />
      )}

      {/* SpecDrawer mới – slide từ phải */}
      <SpecDrawer
        isOpen={showSpecDrawer}
        onClose={() => setShowSpecDrawer(false)}
        specGroups={specGroups}
        productName={product.TenSanPham}
        productImage={product.Anh}
      />

      <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-12">

        {/* ── Breadcrumb: Trang chủ > Sản phẩm > Tên SP ── */}
        <div className="max-w-container-max mx-auto w-full pb-unit-sm">
          <nav aria-label="Breadcrumb" className="flex items-center gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
              <span className="material-symbols-outlined text-base leading-none">home</span>
              Trang chủ
            </Link>
            <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
            <Link to="/products" className="hover:text-primary transition-colors">Sản phẩm</Link>
            <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
            <span className="text-on-surface font-semibold truncate max-w-[200px] sm:max-w-xs">{product.TenSanPham}</span>
          </nav>
        </div>

        {/* ═══════════════════════════════════════
            DIV 1 - THÔNG TIN CHÍNH
        ═══════════════════════════════════════ */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">

          {/* Cột Trái: Gallery + Quick Specs */}
          <div className="md:sticky md:top-24 self-start space-y-6">
            {/* Ảnh sản phẩm */}
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
            </div>

            {/* Thông số kỹ thuật – 3 cột (Màn hình | Camera | RAM) khớp PHP */}
            {(quickSpecs.length > 0 || specGroups.length > 0) && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header: tiêu đề + nút pill xem tất cả */}
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Thông số kỹ thuật</p>
                  {specGroups.length > 0 && (
                    <button
                      type="button"
                      id="btn-view-all-specs"
                      onClick={() => setShowSpecDrawer(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "#fff",
                        border: "0.8px solid #dc2626",
                        borderRadius: "24px",
                        color: "#dc2626",
                        fontWeight: 500,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: "13px",
                        gap: "4px",
                      }}
                    >
                      Xem tất cả thông số
                    </button>
                  )}
                </div>

                {/* 3 cột: Màn hình | Camera | RAM */}
                {quickSpecs.length > 0 && (
                  <div className="flex border-t border-slate-100">
                    {quickSpecs.map((spec, idx) => (
                      <div
                        key={spec.key}
                        className={`flex flex-col justify-center h-[72px] flex-1 px-3 ${
                          idx < quickSpecs.length - 1 ? "border-r border-slate-200" : ""
                        }`}
                      >
                        <p className="text-xs text-slate-500 mb-1">{spec.label}</p>
                        <div className="flex items-center gap-1.5">
                          {spec.key === "screen" && (
                            <Monitor className="w-4 h-4 shrink-0 text-slate-600" />
                          )}
                          {spec.key === "camera" && (
                            <Camera className="w-4 h-4 shrink-0 text-slate-600" />
                          )}
                          {spec.key === "ram" && (
                            <MemoryStick className="w-4 h-4 shrink-0 text-slate-600" />
                          )}
                          <p
                            className="text-xs font-semibold text-slate-900 truncate"
                            title={spec.value}
                          >
                            {spec.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cột Phải: Chi tiết + CTA */}
          <div className="space-y-6">

            {/* Tên + Trạng thái tồn kho theo biến thể */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                    Tạm hết hàng phiên bản này
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    Còn hàng ({displayStock} sản phẩm)
                  </span>
                )}
                {selectedVariant?.MaSKU && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    SKU: {selectedVariant.MaSKU}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight tracking-tight">
                {product.TenSanPham}
              </h1>
            </div>

            {/* Giá bán theo biến thể */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <p className="text-3xl sm:text-4xl font-black text-blue-600 leading-tight tabular-nums">
                  {formatVND(displayPrice)}
                </p>
                {selectedVariant && (activeStorage || activeColor) && (
                  <span className="text-xs font-medium text-slate-500">
                    Phiên bản:{" "}
                    <strong className="text-slate-700">
                      {[activeStorage, activeColor].filter(Boolean).join(" • ")}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            {/* Khối "Ưu đãi & Mã giảm giá khả dụng" ngay dưới giá bán */}
            <div
              id="product-vouchers-box"
              className="rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50 border border-orange-200/80 shadow-sm overflow-hidden"
            >
              <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50/80 border-b border-orange-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    Ưu đãi &amp; Mã giảm giá khả dụng
                  </h3>
                </div>
                <Link
                  to="/vouchers"
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 shrink-0 transition-colors"
                >
                  <span>Kho Voucher</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-3.5 space-y-2.5">
                {loadingVouchers ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-12 bg-orange-100/60 rounded-xl" />
                    <div className="h-12 bg-orange-100/60 rounded-xl" />
                  </div>
                ) : applicableVouchers.length > 0 ? (
                  <>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                      {applicableVouchers.slice(0, 4).map((voucher) => {
                        const isFreeShip =
                          voucher.NhomVoucher === "FreeShip" || voucher.LoaiGiam === "freeship";
                        const isCopied = copiedVoucherCode === voucher.Code;

                        const discountSummary = isFreeShip
                          ? voucher.LoaiGiam === "phantram"
                            ? `Giảm ${voucher.GiaTriGiam}% ship${voucher.GiamToiDa ? ` (tối đa ${formatCompactVND(voucher.GiamToiDa)})` : ""}`
                            : Number(voucher.GiaTriGiam) > 0
                              ? `Giảm ${formatVND(voucher.GiaTriGiam)} phí ship`
                              : `Miễn phí vận chuyển${voucher.GiamToiDa ? ` (tối đa ${formatCompactVND(voucher.GiamToiDa)})` : ""}`
                          : voucher.LoaiGiam === "phantram"
                            ? `Giảm ${voucher.GiaTriGiam}%${voucher.GiamToiDa ? ` tối đa ${formatCompactVND(voucher.GiamToiDa)}` : ""}`
                            : `Giảm ngay ${formatVND(voucher.GiaTriGiam)}`;

                        return (
                          <div
                            key={voucher.MaVoucher}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-orange-300 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  isFreeShip
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : "bg-blue-50 text-blue-600 border border-blue-100"
                                }`}
                              >
                                {isFreeShip ? (
                                  <Truck className="w-4 h-4" />
                                ) : (
                                  <Tag className="w-4 h-4" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {voucher.Code}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                      isFreeShip
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-blue-50 text-blue-700"
                                    }`}
                                  >
                                    {isFreeShip ? "Freeship" : "Giảm giá"}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                                  {discountSummary}
                                </p>
                                <p className="text-[11px] text-slate-400 flex items-center gap-2">
                                  <span>
                                    {Number(voucher.GiaTriToiThieu) > 0
                                      ? `Đơn từ ${formatCompactVND(voucher.GiaTriToiThieu)}`
                                      : "Mọi đơn hàng"}
                                  </span>
                                  {voucher.NgayHetHan && (
                                    <span className="inline-flex items-center gap-0.5">
                                      • <Clock className="w-3 h-3" /> {formatDateVN(voucher.NgayHetHan)}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyVoucher(voucher.Code)}
                              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                                isCopied
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                  : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-500 hover:text-white hover:border-orange-500"
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Sao chép</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {applicableVouchers.length > 4 && (
                      <Link
                        to="/vouchers"
                        className="block text-center text-xs font-bold text-orange-600 hover:text-orange-700 pt-1"
                      >
                        Xem thêm {applicableVouchers.length - 4} mã ưu đãi khác →
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2 py-1 text-xs text-slate-500">
                    <span>
                      Hiện chưa có mã giảm giá riêng cho mức giá này. Ghé Kho Voucher để săn thêm ưu đãi!
                    </span>
                    <Link
                      to="/vouchers"
                      className="text-orange-600 font-bold hover:underline shrink-0"
                    >
                      Xem ngay
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Chọn Phiên bản (Dung lượng) */}
            {storageList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-500 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-700">Dung lượng</h3>
                  {activeStorage && (
                    <span className="ml-auto px-3 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                      {activeStorage}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {storageList.map((rom) => {
                    const isSelected = activeStorage === rom;
                    const { minPrice, totalStock } = getStorageMeta(rom);
                    const romSoldOut = hasVariantMatrix && totalStock <= 0;
                    return (
                      <button
                        key={rom}
                        type="button"
                        onClick={() => setSelectedStorage(rom)}
                        className={`flex flex-col items-start px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20"
                            : romSoldOut
                              ? "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                              : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 font-bold">
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          <span>{rom}</span>
                          {romSoldOut && (
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                isSelected ? "bg-white/20 text-white" : "bg-rose-50 text-rose-500"
                              }`}
                            >
                              Hết hàng
                            </span>
                          )}
                        </span>
                        {minPrice !== null && (
                          <span
                            className={`text-[11px] mt-0.5 tabular-nums ${
                              isSelected ? "text-blue-100" : "text-slate-400"
                            }`}
                          >
                            {formatVND(minPrice)}
                          </span>
                        )}
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
                    const { stock: colorStock, exists: colorExists } = getColorMeta(color);
                    const colorSoldOut = hasVariantMatrix && (!colorExists || colorStock <= 0);
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? colorSoldOut
                              ? "bg-slate-800 border-slate-800 text-white shadow-sm"
                              : "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20"
                            : colorSoldOut
                              ? "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                              : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span className={colorSoldOut && !isSelected ? "line-through decoration-slate-300" : ""}>
                          {color}
                        </span>
                        {colorSoldOut && (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              isSelected ? "bg-rose-500/90 text-white" : "bg-rose-50 text-rose-500"
                            }`}
                          >
                            Hết
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Số lượng */}
            <div className="flex items-center gap-4 flex-wrap">
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
                  disabled={quantity >= displayStock || isOutOfStock}
                  className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs text-slate-500">
                {isOutOfStock ? (
                  <span className="text-rose-600 font-semibold">Phiên bản này hiện đã hết hàng</span>
                ) : (
                  <>
                    Còn <strong className="text-slate-700">{displayStock}</strong> sản phẩm có sẵn
                  </>
                )}
              </span>
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
                    ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-white hover:bg-blue-50 border-blue-200 hover:border-blue-400 text-blue-600 hover:text-blue-700 shadow-sm active:scale-[0.98]"
                } disabled:opacity-75 disabled:cursor-not-allowed`}
              >
                {addingToCart ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isOutOfStock ? (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                ) : (
                  <ShoppingCart className="w-5 h-5" />
                )}
                <span>
                  {isOutOfStock
                    ? "Tạm hết hàng phiên bản này"
                    : addingToCart
                      ? "Đang Thêm..."
                      : "Thêm Vào Giỏ"}
                </span>
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

              {/* Nhóm Nút Yêu thích & So sánh */}
              <div className="flex items-center gap-3">
                {/* Nút Yêu thích */}
                <button
                  type="button"
                  id="btn-wishlist-detail"
                  onClick={() => product && toggleWishlist(product)}
                  className={`flex-1 sm:flex-none w-full sm:w-14 h-14 rounded-xl border flex items-center justify-center transition-all duration-200 active:scale-95 ${
                    isFavorite
                      ? "bg-rose-50 border-rose-200 text-[#fe2c55] shadow-sm"
                      : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-[#fe2c55]"
                  }`}
                  title={isFavorite ? "Đã yêu thích (Click để bỏ)" : "Thêm vào yêu thích"}
                  aria-label="Yêu thích"
                >
                  <Heart
                    key={isFavorite ? "liked" : "unliked"}
                    className={`w-6 h-6 transition-transform duration-200 ${
                      isFavorite
                        ? "text-[#fe2c55] fill-[#fe2c55] animate-tiktok-heart"
                        : "text-slate-500 hover:text-[#fe2c55]"
                    }`}
                  />
                  <span className="sm:hidden ml-2 text-sm font-semibold">
                    {isFavorite ? "Đã yêu thích" : "Yêu thích"}
                  </span>
                </button>

                {/* Nút Thêm vào so sánh */}
                <button
                  type="button"
                  id="btn-compare-detail"
                  onClick={() => product && toggleCompare(product)}
                  className={`flex-1 sm:flex-none w-full sm:w-14 h-14 rounded-xl border flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                    product && isInCompare(product.MaSanPham)
                      ? "bg-blue-50 border-blue-400 text-blue-600 shadow-sm"
                      : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-blue-600"
                  }`}
                  title={product && isInCompare(product.MaSanPham) ? "Đã thêm vào so sánh (Click để bỏ)" : "Thêm vào so sánh"}
                  aria-label="So sánh"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span className="sm:hidden ml-2 text-sm font-semibold">So sánh</span>
                </button>
              </div>
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
            DIV 2.5 - HỆ THỐNG ĐÁNH GIÁ
        ═══════════════════════════════════════ */}
        <ReviewSection productId={id} productName={product?.TenSanPham} />

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
                <ProductCard key={item.MaSanPham} product={item} />
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
