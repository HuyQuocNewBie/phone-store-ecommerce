import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Filter,
  SlidersHorizontal,
  X,
  ChevronRight,
  RotateCcw,
  Search,
  ShoppingCart,
  PackageCheck,
  ChevronLeft,
  Check,
  Sparkles,
  ArrowUpDown,
  Tag,
  Cpu,
  Eye,
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';

/* ─── Constants ───────────────────────────────────────────────────────────── */
const ROM_OPTIONS = ['128GB', '256GB', '512GB', '1TB'];
const MIN_PRICE_LIMIT = 0;
const MAX_PRICE_LIMIT = 50000000;
const PRICE_STEP = 500000;

const FALLBACK_CATEGORIES = [
  { MaLoaiSanPham: 1, TenLoaiSanPham: 'Điện thoại' },
  { MaLoaiSanPham: 2, TenLoaiSanPham: 'Laptop' },
  { MaLoaiSanPham: 3, TenLoaiSanPham: 'Máy tính bảng' },
  { MaLoaiSanPham: 4, TenLoaiSanPham: 'Phụ kiện' },
];

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
const ProductSkeleton = () => (
  <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 animate-pulse shadow-sm">
    <div className="aspect-square rounded-xl bg-slate-100" />
    <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
    <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
    <div className="h-10 bg-slate-100 rounded-xl" />
  </div>
);

/* ─── CatalogPage ────────────────────────────────────────────────────────── */
const CatalogPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── URL Params ── */
  const categoryParam   = searchParams.get('category') || searchParams.get('category_id') || '';
  const romParam        = searchParams.get('rom') || '';
  const priceMinParam   = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : MIN_PRICE_LIMIT;
  const priceMaxParam   = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : MAX_PRICE_LIMIT;
  const sortParam       = searchParams.get('sort') || searchParams.get('sort_by') || '';
  const pageParam       = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const searchKeyword   = searchParams.get('search') || searchParams.get('q') || '';
  const selectedRoms    = romParam ? romParam.split(',').map((r) => r.trim()).filter(Boolean) : [];

  /* ── Slider Local State ── */
  const [sliderMin, setSliderMin] = useState(priceMinParam);
  const [sliderMax, setSliderMax] = useState(priceMaxParam);
  useEffect(() => { setSliderMin(priceMinParam); setSliderMax(priceMaxParam); }, [priceMinParam, priceMaxParam]);

  /* ── Data State ── */
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: pageParam, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  /* ── Fetch Categories ── */
  useEffect(() => {
    api.get('/products/categories')
      .then((res) => {
        if (res.data?.success && res.data.data?.length > 0) setCategories(res.data.data);
        else setCategories(FALLBACK_CATEGORIES);
      })
      .catch(() => setCategories(FALLBACK_CATEGORIES));
  }, []);

  /* ── Fetch Products ── */
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: pageParam, limit: 12 };
      if (categoryParam) params.category_id = categoryParam;
      if (romParam) params.rom = romParam;
      if (priceMinParam > MIN_PRICE_LIMIT) params.price_min = priceMinParam;
      if (priceMaxParam < MAX_PRICE_LIMIT) params.price_max = priceMaxParam;
      if (sortParam) params.sort_by = sortParam;
      if (searchKeyword) params.search = searchKeyword;
      const res = await api.get('/products', { params });
      if (res.data?.success) {
        setProducts(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      } else setProducts([]);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }, [categoryParam, romParam, priceMinParam, priceMaxParam, sortParam, pageParam, searchKeyword]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /* ── Update URL Params ── */
  const updateQueryParams = (newParams) => {
    const params = new URLSearchParams(searchParams);
    Object.keys(newParams).forEach((key) => {
      const val = newParams[key];
      if (val === null || val === undefined || val === '' || val === 0) params.delete(key);
      else params.set(key, val);
    });
    if (!('page' in newParams)) params.set('page', '1');
    setSearchParams(params);
  };

  const handleSelectCategory = (catId) => updateQueryParams({ category: categoryParam === String(catId) ? '' : String(catId) });
  const handleToggleRom = (romValue) => {
    const updatedRoms = selectedRoms.includes(romValue)
      ? selectedRoms.filter((r) => r !== romValue)
      : [...selectedRoms, romValue];
    updateQueryParams({ rom: updatedRoms.length > 0 ? updatedRoms.join(',') : '' });
  };
  const handleApplyPriceFilter = (minVal, maxVal) => updateQueryParams({
    price_min: minVal > MIN_PRICE_LIMIT ? minVal : '',
    price_max: maxVal < MAX_PRICE_LIMIT ? maxVal : ''
  });
  const handleSelectSort = (sortValue) => updateQueryParams({ sort: sortValue });
  const handleResetFilters = () => {
    setSearchParams({});
    setSliderMin(MIN_PRICE_LIMIT);
    setSliderMax(MAX_PRICE_LIMIT);
    toast.success('Đã làm mới tất cả bộ lọc!', { id: 'reset-filter' });
  };
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      updateQueryParams({ page: newPage });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const handleAddToCart = (product) => {
    toast.success(`Đã thêm "${product.TenSanPham}" vào giỏ hàng!`, { id: `cart-add-${product.MaSanPham}` });
  };

  const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  const activeFiltersCount = [
    categoryParam ? 1 : 0,
    selectedRoms.length,
    priceMinParam > MIN_PRICE_LIMIT || priceMaxParam < MAX_PRICE_LIMIT ? 1 : 0,
    searchKeyword ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  const minPercent = Math.round(((sliderMin - MIN_PRICE_LIMIT) / (MAX_PRICE_LIMIT - MIN_PRICE_LIMIT)) * 100);
  const maxPercent = Math.round(((sliderMax - MIN_PRICE_LIMIT) / (MAX_PRICE_LIMIT - MIN_PRICE_LIMIT)) * 100);

  /* ── Sidebar Filter Content (shared desktop + mobile) ── */
  const renderSidebarFilters = () => (
    <div className="space-y-7">
      {/* Active filter count */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
          <span className="text-xs font-medium text-blue-600">
            Đang áp dụng <strong>{activeFiltersCount}</strong> bộ lọc
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa tất cả</span>
          </button>
        </div>
      )}

      {/* ── 1. Danh Mục ── */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-blue-500" />
          Danh Mục Sản Phẩm
        </h3>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => handleSelectCategory('')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              !categoryParam
                ? 'bg-blue-50 text-blue-600 border border-blue-100 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <span>Tất cả sản phẩm</span>
            {!categoryParam && <Check className="w-4 h-4 text-blue-500" />}
          </button>
          {categories.map((cat) => {
            const isSelected = categoryParam === String(cat.MaLoaiSanPham);
            return (
              <button
                key={cat.MaLoaiSanPham}
                type="button"
                onClick={() => handleSelectCategory(cat.MaLoaiSanPham)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-50 text-blue-600 border border-blue-100 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span>{cat.TenLoaiSanPham}</span>
                {isSelected && <Check className="w-4 h-4 text-blue-500" />}
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* ── 2. Khoảng Giá ── */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
          Khoảng Giá (VNĐ)
        </h3>

        <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <span className="font-bold text-blue-600">{formatVND(sliderMin)}</span>
          <span className="text-slate-300">—</span>
          <span className="font-bold text-blue-700">{formatVND(sliderMax)}</span>
        </div>

        {/* Dual Range Slider */}
        <div className="relative pt-4 pb-2 px-1">
          <div className="relative w-full h-1.5 bg-slate-200 rounded-full">
            <div
              className="absolute h-1.5 bg-blue-500 rounded-full"
              style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
            />
          </div>
          <input
            type="range" min={MIN_PRICE_LIMIT} max={MAX_PRICE_LIMIT} step={PRICE_STEP} value={sliderMin}
            onChange={(e) => setSliderMin(Math.min(Number(e.target.value), sliderMax - PRICE_STEP))}
            onMouseUp={() => handleApplyPriceFilter(sliderMin, sliderMax)}
            onTouchEnd={() => handleApplyPriceFilter(sliderMin, sliderMax)}
            className="absolute top-4 left-0 w-full appearance-none bg-transparent pointer-events-none cursor-pointer range-slider-thumb"
          />
          <input
            type="range" min={MIN_PRICE_LIMIT} max={MAX_PRICE_LIMIT} step={PRICE_STEP} value={sliderMax}
            onChange={(e) => setSliderMax(Math.max(Number(e.target.value), sliderMin + PRICE_STEP))}
            onMouseUp={() => handleApplyPriceFilter(sliderMin, sliderMax)}
            onTouchEnd={() => handleApplyPriceFilter(sliderMin, sliderMax)}
            className="absolute top-4 left-0 w-full appearance-none bg-transparent pointer-events-none cursor-pointer range-slider-thumb"
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-400">
          <span>0đ</span>
          <span>50 Triệu+</span>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* ── 3. ROM ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-blue-500" />
          Bộ Nhớ Trong (ROM)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {ROM_OPTIONS.map((rom) => {
            const isChecked = selectedRoms.includes(rom);
            return (
              <label
                key={rom}
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all text-xs ${
                  isChecked
                    ? 'bg-blue-50 border-blue-200 text-blue-600 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:text-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleRom(rom)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-white"
                />
                <span>{rom}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400">
          <Link to="/" className="hover:text-blue-600 transition-colors font-medium">Trang chủ</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-700 font-semibold">Danh mục sản phẩm</span>
          {searchKeyword && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-blue-600 italic">"{searchKeyword}"</span>
            </>
          )}
        </nav>

        {/* Page Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-500/20 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-white/20 text-white border border-white/25">
              <Sparkles className="w-3.5 h-3.5" />
              SmartZone Catalog
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {searchKeyword ? `Kết quả: "${searchKeyword}"` : 'Tất Cả Sản Phẩm'}
            </h1>
            <p className="text-xs text-blue-100">Khám phá hệ sinh thái smartphone chính hãng với mức giá hấp dẫn nhất</p>
          </div>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 backdrop-blur-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Main Layout: Sidebar + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Sidebar Desktop ── */}
          <aside className="hidden lg:block lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-6 sticky top-20 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-bold text-slate-800">Bộ Lọc</h2>
              </div>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            {renderSidebarFilters()}
          </aside>

          {/* ── Content Area ── */}
          <div className="lg:col-span-9 space-y-5">

            {/* Top Toolbar */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Mobile filter button */}
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Bộ lọc {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </button>

                <p className="text-xs text-slate-500">
                  Hiển thị <strong className="text-slate-800">{products.length}</strong> / <strong className="text-slate-800">{pagination.total}</strong> sản phẩm
                </p>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <label htmlFor="sort-select" className="hidden sm:flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />
                  Sắp xếp:
                </label>
                <select
                  id="sort-select"
                  value={sortParam}
                  onChange={(e) => handleSelectSort(e.target.value)}
                  className="border border-slate-200 bg-slate-50/50 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">Mặc định (Mới nhất)</option>
                  <option value="price_asc">Giá từ thấp đến cao</option>
                  <option value="price_desc">Giá từ cao đến thấp</option>
                </select>
              </div>
            </div>

            {/* Active Filter Tags */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium">Đang lọc:</span>

                {categoryParam && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                    <span>Loại: {categories.find((c) => String(c.MaLoaiSanPham) === categoryParam)?.TenLoaiSanPham || categoryParam}</span>
                    <button type="button" onClick={() => handleSelectCategory(categoryParam)} className="hover:text-blue-800">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedRoms.map((rom) => (
                  <span key={rom} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-600 border border-violet-100">
                    <span>ROM: {rom}</span>
                    <button type="button" onClick={() => handleToggleRom(rom)} className="hover:text-violet-800">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {(priceMinParam > MIN_PRICE_LIMIT || priceMaxParam < MAX_PRICE_LIMIT) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <span>Giá: {formatVND(priceMinParam)} — {formatVND(priceMaxParam)}</span>
                    <button type="button" onClick={() => handleApplyPriceFilter(MIN_PRICE_LIMIT, MAX_PRICE_LIMIT)} className="hover:text-indigo-800">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {searchKeyword && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
                    <span>Từ khóa: "{searchKeyword}"</span>
                    <button type="button" onClick={() => updateQueryParams({ search: '' })} className="hover:text-amber-800">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Product Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-700">Không tìm thấy sản phẩm phù hợp</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Thử điều chỉnh hoặc xóa các tiêu chí bộ lọc để tìm kiếm thêm sản phẩm.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-[0.97]"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
                {products.map((item) => (
                  <div
                    key={item.MaSanPham}
                    className="group bg-white border border-slate-100 rounded-2xl p-4 flex flex-col shadow-sm
                               transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_-8px_rgba(37,99,235,0.12)] hover:border-blue-100"
                  >
                    {/* Badges */}
                    {item.DungLuong && (
                      <div className="mb-2 self-start">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                          {item.DungLuong}
                        </span>
                      </div>
                    )}

                    {/* Thumbnail */}
                    <div
                      className="aspect-square rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center p-3 mb-3 cursor-pointer"
                      onClick={() => navigate(`/products/${item.MaSanPham}`)}
                    >
                      {item.Anh ? (
                        <img
                          src={item.Anh}
                          alt={item.TenSanPham}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <PackageCheck className="w-10 h-10 text-slate-300" />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex flex-col gap-2 flex-1">
                      <h3
                        onClick={() => navigate(`/products/${item.MaSanPham}`)}
                        className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-2 leading-snug"
                      >
                        {item.TenSanPham}
                      </h3>

                      <p className="font-bold text-blue-600 text-sm sm:text-base">{formatVND(item.Gia)}</p>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline sm:inline">Thêm giỏ</span>
                        <span className="inline xs:hidden sm:hidden">+</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/products/${item.MaSanPham}`)}
                        className="p-2 border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-all"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-all flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>

                {[...Array(pagination.totalPages)].map((_, idx) => {
                  const pNum = idx + 1;
                  const isCurrent = pNum === pagination.page;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => handlePageChange(pNum)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-all flex items-center gap-1"
                >
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div
            onClick={() => setMobileFilterOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-xs bg-white h-full overflow-y-auto p-6 space-y-6 z-10 shadow-2xl border-l border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-bold text-slate-800">Bộ Lọc Sản Phẩm</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderSidebarFilters()}

            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all active:scale-[0.97]"
              >
                Xem {pagination.total} sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CatalogPage;
