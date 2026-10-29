import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useCompare } from '../../context/CompareContext';
import { useAuth } from '../../context/AuthContext';

const HIGHLIGHTS_CONFIG = [
  { label: 'Kích thước màn hình', searchKeys: ['kích thước màn hình', 'màn hình', 'kích thước'] },
  { label: 'Camera', searchKeys: ['resolution', 'camera sau', 'camera trước', 'độ phân giải camera', 'camera'] },
  { label: 'RAM', searchKeys: ['ram', 'dung lượng ram'] },
  { label: 'Kết nối NFC', searchKeys: ['kết nối khác', 'kết nối nfc', 'nfc'] }
];

const ComparePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { compareItems, syncCompare } = useCompare();

  const [products, setProducts] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState('highlight');
  const [diffOnly, setDiffOnly] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 380);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [selectedModalProducts, setSelectedModalProducts] = useState([]);
  const [loadingAllProducts, setLoadingAllProducts] = useState(false);

  const highlightSectionRef = useRef(null);
  const detailSectionRef = useRef(null);

  const idsStr = searchParams.get('ids') || '';

  // Initial Sync: If URL has no ids, but localStorage has items, redirect to ?ids=...
  useEffect(() => {
    if (!idsStr) {
      if (compareItems.length > 0) {
        const ids = compareItems.map((i) => i.id).join(',');
        setSearchParams({ ids }, { replace: true });
        return;
      }
    }
  }, [idsStr, compareItems, setSearchParams]);

  // Fetch comparison data when URL ids change
  useEffect(() => {
    let isMounted = true;
    const fetchCompareData = async () => {
      const cleanIds = idsStr
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0)
        .slice(0, 3);

      if (cleanIds.length === 0) {
        if (isMounted) {
          setProducts([]);
          setSpecs([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const res = await api.get(`/products/compare?ids=${cleanIds.join(',')}`);
        if (isMounted && res.data?.success) {
          const fetchedProducts = res.data.data.products || [];
          const fetchedSpecs = res.data.data.specs || [];
          setProducts(fetchedProducts);
          setSpecs(fetchedSpecs);

          // Sync localStorage and context with fetched products
          const syncedLocal = fetchedProducts.map((p) => ({
            id: p.MaSanPham,
            name: p.TenSanPham,
            img: p.Anh,
            price: p.Gia,
          }));
          syncCompare(syncedLocal);
        }
      } catch (err) {
        console.error('Error fetching compare products:', err);
        toast.error('Không thể tải thông tin so sánh sản phẩm');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCompareData();
    return () => {
      isMounted = false;
    };
  }, [idsStr, syncCompare]);

  // Load all products for the Compare Select Modal
  const loadAllProducts = async () => {
    if (allProducts.length > 0) return;
    setLoadingAllProducts(true);
    try {
      const res = await api.get('/products?limit=100');
      if (res.data?.success) {
        setAllProducts(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching all products for compare:', err);
    } finally {
      setLoadingAllProducts(false);
    }
  };

  const openCompareSelectModal = () => {
    setSelectedModalProducts([...products]);
    setIsModalOpen(true);
    loadAllProducts();
    document.body.style.overflow = 'hidden';
  };

  const closeCompareSelectModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = '';
  };

  const removeCompareItem = (id) => {
    const numericId = Number(id);
    const updated = products.filter((p) => Number(p.MaSanPham) !== numericId);
    setProducts(updated);

    const syncedLocal = updated.map((p) => ({
      id: p.MaSanPham,
      name: p.TenSanPham,
      img: p.Anh,
      price: p.Gia,
    }));
    syncCompare(syncedLocal);

    if (updated.length > 0) {
      setSearchParams({ ids: updated.map((p) => p.MaSanPham).join(',') });
    } else {
      setSearchParams({});
    }
    toast.success('Đã bỏ sản phẩm khỏi danh sách so sánh');
  };

  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      const intent = {
        product_id: product.MaSanPham,
        quantity: 1,
        action_type: 'add_to_cart',
        product_name: product.TenSanPham,
        redirect_back: window.location.pathname + window.location.search,
      };
      sessionStorage.setItem('cart_action_intent', JSON.stringify(intent));
      toast('Vui lòng đăng nhập để tiếp tục', { icon: '🔐', id: 'login-required', duration: 2500 });
      navigate('/login');
      return;
    }

    try {
      const result = await addToCart(product.MaSanPham, 1);
      if (result.success) {
        toast.success(`Đã thêm "${product.TenSanPham}" vào giỏ hàng!`);
      } else {
        toast.error(result.message || 'Không thể thêm vào giỏ hàng.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể thêm vào giỏ hàng.');
    }
  };

  // Structured Specs Data: specsData[pid][nhom][key] = val
  const { specsData, allGroups } = useMemo(() => {
    const data = {};
    const groups = {};

    specs.forEach((row) => {
      const pid = row.MaSanPham;
      const nhom = row.NhomThongSo || 'Chung';
      const key = row.TenThongSo;
      const val = row.GiaTri;

      if (!data[pid]) data[pid] = {};
      if (!data[pid][nhom]) data[pid][nhom] = {};
      data[pid][nhom][key] = val;

      if (!groups[nhom]) groups[nhom] = [];
      if (!groups[nhom].includes(key)) {
        groups[nhom].push(key);
      }
    });

    return { specsData: data, allGroups: groups };
  }, [specs]);

  // Helper to extract spec value for a product
  const getHighlightVal = (product, searchKeys) => {
    const pid = product.MaSanPham;
    const pSpecs = specsData[pid];
    if (!pSpecs) return '-';

    for (const sKey of searchKeys) {
      const sKeyLower = sKey.toLowerCase();
      for (const nhom of Object.keys(pSpecs)) {
        for (const [k, v] of Object.entries(pSpecs[nhom])) {
          if (k.toLowerCase() === sKeyLower) {
            return v;
          }
        }
      }
    }
    return '-';
  };

  const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  // Accordion toggle
  const toggleGroup = (nhom) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [nhom]: !prev[nhom],
    }));
  };

  const scrollToSection = (sectionRef, tabName) => {
    setActiveTab(tabName);
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Modal Helpers
  const toggleSelectModalProduct = (prod) => {
    const existsIndex = selectedModalProducts.findIndex((p) => p.MaSanPham === prod.MaSanPham);
    if (existsIndex > -1) {
      setSelectedModalProducts((prev) => prev.filter((p) => p.MaSanPham !== prod.MaSanPham));
    } else {
      if (selectedModalProducts.length >= 3) {
        toast.error('Chỉ có thể so sánh tối đa 3 sản phẩm!');
        return;
      }
      setSelectedModalProducts((prev) => [...prev, prod]);
    }
  };

  const clearModalSelection = () => {
    setSelectedModalProducts([]);
  };

  const submitModalCompare = () => {
    if (selectedModalProducts.length < 2) {
      toast.error('Vui lòng chọn ít nhất 2 sản phẩm!');
      return;
    }
    const ids = selectedModalProducts.map((p) => p.MaSanPham).join(',');
    setSearchParams({ ids });

    const synced = selectedModalProducts.map((p) => ({
      id: p.MaSanPham,
      name: p.TenSanPham,
      img: p.Anh,
      price: p.Gia,
    }));
    syncCompare(synced);
    closeCompareSelectModal();
  };

  const filteredModalProducts = useMemo(() => {
    const query = modalSearch.trim().toLowerCase();
    if (!query) {
      return allProducts;
    }
    return allProducts.filter((p) => p.TenSanPham.toLowerCase().includes(query));
  }, [allProducts, modalSearch]);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="w-full pt-4 sm:pt-6 bg-surface min-h-screen flex-1">
        <div className="flex flex-col w-full">
          {/* ── Breadcrumb: Trang chủ > So sánh sản phẩm ── */}
          <div className="max-w-container-max mx-auto w-full px-gutter-desktop pb-unit-sm">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm"
            >
              <Link
                to="/"
                className="hover:text-primary transition-colors flex items-center gap-unit-2xs"
              >
                <span className="material-symbols-outlined text-base leading-none">home</span>
                Trang chủ
              </Link>
              <span className="material-symbols-outlined text-xs text-outline leading-none">
                chevron_right
              </span>
              <span className="text-on-surface font-semibold">So sánh sản phẩm</span>
            </nav>
          </div>

          <div className="max-w-container-max mx-auto w-full px-gutter-desktop pb-8 text-sm">
            {/* Title */}
            <div className="text-center font-semibold text-2xl sm:text-[28px] text-on-surface py-4">
              So sánh sản phẩm
            </div>

            {/* 3 Product Slots Container */}
            <div className="grid grid-cols-1 md:grid-cols-3 w-full pb-6">
          {[0, 1, 2].map((i) => {
            const p = products[i];
            const isFirst = i === 0;
            const isLast = i === 2;

            const radiusStyle = isFirst
              ? 'rounded-t-xl md:rounded-tr-none md:rounded-l-xl'
              : isLast
              ? 'rounded-b-xl md:rounded-bl-none md:rounded-r-xl'
              : 'rounded-none';

            if (p) {
              return (
                <div
                  key={p.MaSanPham}
                  className={`bg-white border border-gray-200 ${radiusStyle} flex flex-row items-center justify-start p-4 relative gap-3 min-h-[162px] shadow-sm`}
                >
                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => removeCompareItem(p.MaSanPham)}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Xóa khỏi so sánh"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z" />
                    </svg>
                  </button>

                  {/* Thumbnail */}
                  <div className="w-36 h-36 shrink-0 flex items-center justify-center p-2 bg-slate-50/50 rounded-lg">
                    <img
                      src={p.Anh || '/assets/images/placeholder.jpg'}
                      alt={p.TenSanPham}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex flex-col flex-1 gap-2.5 min-w-0 pr-4">
                    <Link
                      to={`/products/${p.MaSanPham}`}
                      className="line-clamp-2 text-[#090d14] font-medium text-sm hover:text-blue-600 transition-colors"
                      title={p.TenSanPham}
                    >
                      {p.TenSanPham}
                    </Link>
                    <div className="text-[#dc2626] font-semibold text-sm">
                      {formatVND(p.Gia)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(p)}
                      className="bg-[#dc2626] hover:bg-red-700 active:scale-95 text-white font-medium text-xs px-3 h-8 rounded-lg flex items-center justify-center transition-all w-max shadow-sm"
                    >
                      Mua ngay
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`empty-slot-${i}`}
                onClick={openCompareSelectModal}
                className={`bg-white border border-gray-200 ${radiusStyle} flex flex-col items-center justify-center p-4 cursor-pointer min-h-[162px] hover:bg-gray-50 transition-colors shadow-sm`}
              >
                <div className="border border-dashed border-gray-300 rounded-xl w-24 h-24 flex items-center justify-center text-gray-400 group-hover:border-blue-400">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <p className="text-[#1250dc] font-medium mt-3">Chọn sản phẩm so sánh</p>
              </div>
            );
          })}
        </div>

        {/* Empty state or Spec Comparisons */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-9 h-9 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 text-sm font-medium">Đang tải dữ liệu so sánh...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <img
              src="/assets/images/empty_compare.png"
              alt="Empty Compare"
              className="w-48 h-auto object-contain"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/assets/empty-cart.png';
              }}
            />
            <p className="text-[#090d14] font-medium text-base mt-5 text-center">
              Chưa có sản phẩm nào để so sánh
            </p>
          </div>
        ) : Object.keys(allGroups).length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-white border border-gray-100 rounded-xl mt-4">
            Chưa có thông số kỹ thuật chi tiết cho các sản phẩm này.
          </div>
        ) : (
          <>
            {/* Tab Menu & Sticky Product Header */}
            <div
              className={`sticky top-20 z-30 bg-white/95 backdrop-blur-md rounded-xl flex flex-col p-2 sm:px-4 mb-6 border border-gray-200 shadow-md transition-all duration-300`}
            >
              <div className="flex flex-wrap items-center justify-between w-full">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => scrollToSection(highlightSectionRef, 'highlight')}
                    className={`flex justify-center px-4 py-2.5 font-semibold cursor-pointer border-b-2 transition-all ${
                      activeTab === 'highlight'
                        ? 'text-[#dc2626] border-[#dc2626]'
                        : 'text-gray-500 border-transparent hover:text-slate-800'
                    }`}
                  >
                    Thông số nổi bật
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection(detailSectionRef, 'detail')}
                    className={`flex justify-center px-4 py-2.5 font-medium cursor-pointer border-b-2 transition-all ${
                      activeTab === 'detail'
                        ? 'text-[#dc2626] border-[#dc2626]'
                        : 'text-gray-500 border-transparent hover:text-slate-800'
                    }`}
                  >
                    Thông tin chi tiết
                  </button>
                </div>

                <label className="flex items-center gap-2 text-[#090d14] font-medium cursor-pointer select-none py-1.5 px-2 text-sm">
                  <input
                    type="checkbox"
                    checked={diffOnly}
                    onChange={(e) => setDiffOnly(e.target.checked)}
                    className="w-4 h-4 accent-[#dc2626] cursor-pointer rounded"
                  />
                  Chỉ xem điểm khác biệt
                </label>
              </div>

              {/* Sticky Mini Products Bar when scrolling down */}
              {isSticky && products.length > 0 && (
                <div className="hidden sm:flex flex-row w-full pt-2 mt-2 border-t border-gray-100 items-center animate-fade-in">
                  <div className="w-1/4 pr-4 font-semibold text-xs text-gray-400 uppercase tracking-wider flex items-center shrink-0">
                    Sản phẩm
                  </div>
                  <div className="w-3/4 flex flex-row gap-3">
                    {products.map((p) => (
                      <div key={p.MaSanPham} className="flex-1 flex items-center gap-2 min-w-0">
                        <img
                          src={p.Anh || '/assets/images/placeholder.jpg'}
                          alt={p.TenSanPham}
                          className="w-7 h-7 object-contain rounded bg-slate-50 shrink-0 border border-gray-100"
                        />
                        <span className="text-xs font-semibold text-[#090d14] truncate">
                          {p.TenSanPham}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 1. Highlight Section */}
            <div
              ref={highlightSectionRef}
              id="highlight-section"
              className="bg-white border-[1.5px] border-[#ef4444] rounded-xl flex flex-col text-sm mb-6 pb-4 shadow-[0_4px_12px_-2px_rgba(239,68,68,0.15)] scroll-mt-20 overflow-hidden"
            >
              {/* Header Banner */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#dc2626] text-white border-b-[1.5px] border-[#ef4444]">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-semibold text-xl sm:text-2xl text-white">
                  Thông số nổi bật
                </span>
              </div>

              {/* Rows */}
              <div className="overflow-x-auto p-4 scrollbar-thin">
                <div
                  className={`flex flex-col gap-2 ${
                    products.length > 2 ? 'min-w-[580px] md:min-w-0' : 'min-w-[440px] md:min-w-0'
                  }`}
                >
                  {/* Mobile Product Header for Matrix */}
                  <div className="flex md:hidden flex-row w-full pb-2 mb-2 border-b border-gray-200">
                    <div className="w-1/4 shrink-0 pr-4 font-semibold text-xs text-gray-400 uppercase tracking-wider">
                      Sản phẩm
                    </div>
                    <div className="w-3/4 flex flex-row gap-3">
                      {products.map((p) => (
                        <div key={p.MaSanPham} className="flex-1 flex items-center gap-1.5 min-w-0">
                          <img
                            src={p.Anh || '/assets/images/placeholder.jpg'}
                            alt={p.TenSanPham}
                            className="w-6 h-6 object-contain rounded shrink-0 bg-gray-50 border border-gray-200"
                          />
                          <span
                            className="text-xs font-semibold text-gray-800 truncate"
                            title={p.TenSanPham}
                          >
                            {p.TenSanPham}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {HIGHLIGHTS_CONFIG.map(({ label, searchKeys }) => {
                    const values = products.map((p) => getHighlightVal(p, searchKeys));
                    const isAllSame =
                      values.length > 1 &&
                      values.every(
                        (v) => (v || '').trim().toLowerCase() === (values[0] || '').trim().toLowerCase()
                      );

                    if (diffOnly && isAllSame) {
                      return null;
                    }

                    return (
                      <div
                        key={label}
                        className="spec-row flex flex-row w-full border-b border-dashed border-gray-200 pb-2.5 mb-2 transition-all duration-300"
                      >
                        <div className="w-1/4 text-[#090d14] font-semibold pr-4 shrink-0">
                          {label}
                        </div>
                        <div className="w-3/4 flex flex-row gap-3">
                          {values.map((val, idx) => (
                            <div
                              key={idx}
                              className="spec-val flex-1 text-[#090d14] whitespace-pre-line"
                            >
                              {val || '-'}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Anchor for detail section */}
            <div ref={detailSectionRef} id="detail-section" className="scroll-mt-20" />

            {/* 2. Detail Spec Groups */}
            {Object.entries(allGroups).map(([nhom, keys]) => {
              const isCollapsed = Boolean(collapsedGroups[nhom]);

              // Filter out keys if diffOnly is active and all products have the same value
              const visibleKeys = keys.filter((key) => {
                if (!diffOnly) return true;
                const vals = products.map((p) => specsData[p.MaSanPham]?.[nhom]?.[key] ?? '-');
                const isAllSame =
                  vals.length > 1 &&
                  vals.every(
                    (v) => (v || '').trim().toLowerCase() === (vals[0] || '').trim().toLowerCase()
                  );
                return !isAllSame;
              });

              if (diffOnly && visibleKeys.length === 0) {
                return null;
              }

              return (
                <div
                  key={nhom}
                  className="mb-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white"
                >
                  {/* Group Header */}
                  <div
                    onClick={() => toggleGroup(nhom)}
                    className="flex items-center justify-between px-4 py-3 bg-white cursor-pointer border-b border-gray-100 hover:bg-gray-50/70 transition-colors"
                  >
                    <h4 className="text-lg sm:text-xl font-semibold text-[#090d14] m-0">
                      {nhom}
                    </h4>
                    <svg
                      className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${
                        isCollapsed ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </div>

                  {/* Group Content */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto p-4 bg-white scrollbar-thin">
                      <div
                        className={`flex flex-col gap-2 ${
                          products.length > 2
                            ? 'min-w-[580px] md:min-w-0'
                            : 'min-w-[440px] md:min-w-0'
                        }`}
                      >
                        {/* Mobile Product Header for Matrix */}
                        <div className="flex md:hidden flex-row w-full pb-2 mb-2 border-b border-gray-200">
                          <div className="w-1/4 shrink-0 pr-4 font-semibold text-xs text-gray-400 uppercase tracking-wider">
                            Sản phẩm
                          </div>
                          <div className="w-3/4 flex flex-row gap-3">
                            {products.map((p) => (
                              <div
                                key={p.MaSanPham}
                                className="flex-1 flex items-center gap-1.5 min-w-0"
                              >
                                <img
                                  src={p.Anh || '/assets/images/placeholder.jpg'}
                                  alt={p.TenSanPham}
                                  className="w-6 h-6 object-contain rounded shrink-0 bg-gray-50 border border-gray-200"
                                />
                                <span
                                  className="text-xs font-semibold text-gray-800 truncate"
                                  title={p.TenSanPham}
                                >
                                  {p.TenSanPham}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {visibleKeys.map((key) => (
                          <div
                            key={key}
                            className="spec-row flex flex-row w-full border-b border-dashed border-gray-200 pb-2.5 mb-2 transition-all duration-300"
                          >
                            <div className="w-1/4 text-[#090d14] font-semibold pr-4 shrink-0">
                              {key}
                            </div>
                            <div className="w-3/4 flex flex-row gap-3">
                              {products.map((p) => {
                                const val = specsData[p.MaSanPham]?.[nhom]?.[key] ?? '-';
                                return (
                                  <div
                                    key={p.MaSanPham}
                                    className="spec-val flex-1 text-[#090d14] whitespace-pre-line"
                                  >
                                    {val || '-'}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
          </div>
        </div>
      </main>

      {/* ── Compare Select Modal / Drawer ── */}
      {/* Overlay */}
      <div
        id="compareSelectOverlay"
        onClick={closeCompareSelectModal}
        className={`fixed inset-0 bg-black/40 z-[1000] transition-opacity duration-300 ${
          isModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar Drawer */}
      <div
        id="compareSelectSidebar"
        className="fixed top-0 bottom-0 h-full w-full max-w-[600px] bg-white shadow-2xl z-[1001] transition-all duration-500 ease-in-out flex flex-col overflow-hidden"
        style={{
          right: isModalOpen ? '0px' : '-600px',
        }}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-5 py-3 flex justify-between items-center bg-white">
          <p className="text-[#090d14] text-lg font-semibold m-0">Chọn sản phẩm so sánh</p>
          <button
            type="button"
            onClick={closeCompareSelectModal}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-3 border-b border-gray-100">
          <div className="relative w-full">
            <input
              type="text"
              id="compareSearchInput"
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full h-10 pl-4 pr-20 rounded-full border border-gray-200 focus:border-blue-500 focus:outline-none text-sm"
            />
            {modalSearch && (
              <button
                type="button"
                onClick={() => setModalSearch('')}
                className="absolute right-10 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            <svg
              className="absolute right-3.5 top-2.5 w-5 h-5 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Scrollable Product List */}
        <div
          id="compareProductList"
          className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 bg-[#F2F5F6]"
          style={{ paddingBottom: '220px' }}
        >
          {loadingAllProducts ? (
            <div className="p-8 text-center text-gray-500">Đang tải sản phẩm...</div>
          ) : filteredModalProducts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Không tìm thấy sản phẩm nào</div>
          ) : (
            filteredModalProducts.map((p) => {
              const isSelected = selectedModalProducts.some(
                (sp) => sp.MaSanPham === p.MaSanPham
              );

              return (
                <div
                  key={p.MaSanPham}
                  className="bg-white rounded-xl flex gap-2 p-3 shadow-sm border border-gray-100"
                >
                  <div className="w-24 h-24 shrink-0 p-1 flex items-center justify-center">
                    <img
                      src={p.Anh || '/assets/images/placeholder.jpg'}
                      alt={p.TenSanPham}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  <div className="flex flex-col flex-1 gap-1.5 py-1 justify-between min-w-0">
                    <div>
                      <div className="text-[#090d14] font-medium text-sm line-clamp-2">
                        {p.TenSanPham}
                      </div>
                      <div className="text-[#dc2626] font-semibold text-sm mt-0.5">
                        {formatVND(p.Gia)}
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      {isSelected ? (
                        <button
                          type="button"
                          onClick={() => toggleSelectModalProduct(p)}
                          className="flex items-center text-emerald-600 font-medium text-xs bg-emerald-50 px-2.5 py-1.5 rounded-lg gap-1 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Đã thêm vào so sánh
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleSelectModalProduct(p)}
                          className="flex items-center font-medium text-xs text-[#1250dc] bg-blue-50 px-2.5 py-1.5 rounded-lg gap-1 border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Thêm vào so sánh
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div
          id="compareSelectBottomBar"
          className="absolute bottom-0 left-0 w-full z-[1002] transition-transform duration-300"
          style={{
            transform: isModalOpen ? 'translateY(0)' : 'translateY(100%)',
          }}
        >
          <div className="bg-[#090d14]/90 rounded-t-2xl flex flex-col gap-3 p-4 pb-6 backdrop-blur-md">
            {/* 3 Selected Slots */}
            <div className="grid grid-cols-3 gap-2 h-20">
              {[0, 1, 2].map((i) => {
                const sp = selectedModalProducts[i];
                if (sp) {
                  return (
                    <div
                      key={sp.MaSanPham}
                      className="bg-white rounded-lg p-2 relative h-full flex items-center gap-1.5 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelectModalProduct(sp)}
                        className="absolute -top-1.5 -right-1.5 bg-[#ef4444] text-white w-5 h-5 rounded-full flex items-center justify-center border border-white z-10 shadow-sm hover:scale-110 transition-transform"
                        title="Xóa"
                      >
                        <svg
                          width="10"
                          height="10"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                      <img
                        src={sp.Anh || '/assets/images/placeholder.jpg'}
                        alt={sp.TenSanPham}
                        className="w-10 h-10 object-contain shrink-0"
                      />
                      <span className="text-[#090d14] text-xs font-medium line-clamp-2 leading-tight">
                        {sp.TenSanPham}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={`modal-slot-${i}`}
                    className="bg-white/10 border border-gray-400/40 rounded-lg text-white/80 flex flex-col text-xs items-center justify-center p-2 text-center"
                  >
                    Sản phẩm {i + 1}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={clearModalSelection}
                disabled={selectedModalProducts.length === 0}
                className={`rounded-lg font-medium px-3 h-11 text-center text-sm transition-colors ${
                  selectedModalProducts.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-slate-800 hover:bg-gray-100 cursor-pointer'
                }`}
                style={{ width: '100px' }}
              >
                Xóa tất cả
              </button>

              <button
                type="button"
                onClick={submitModalCompare}
                disabled={selectedModalProducts.length < 2}
                className={`flex-1 rounded-lg font-medium px-4 h-11 text-center text-sm transition-all ${
                  selectedModalProducts.length < 2
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-[#dc2626] hover:bg-red-700 text-white cursor-pointer shadow-md'
                }`}
              >
                So sánh ngay
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ComparePage;

