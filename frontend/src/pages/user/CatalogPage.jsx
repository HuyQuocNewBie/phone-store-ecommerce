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
  Eye,
  Star,
  PackageCheck,
  ChevronLeft,
  Smartphone,
  Check,
  Sparkles,
  ArrowUpDown,
  Tag,
  Cpu,
  Zap,
  Grid,
  List
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';

/**
 * Các lựa chọn ROM cố định
 */
const ROM_OPTIONS = ['128GB', '256GB', '512GB', '1TB'];

/**
 * Giá trị giới hạn của Dual Range Slider
 */
const MIN_PRICE_LIMIT = 0;
const MAX_PRICE_LIMIT = 50000000; // 50.000.000 VNĐ
const PRICE_STEP = 500000; // Step 500k

/**
 * Danh mục mặc định dự phòng nếu API gặp sự cố
 */
const FALLBACK_CATEGORIES = [
  { MaLoaiSanPham: 1, TenLoaiSanPham: 'Điện thoại' },
  { MaLoaiSanPham: 2, TenLoaiSanPham: 'Laptop' },
  { MaLoaiSanPham: 3, TenLoaiSanPham: 'Máy tính bảng' },
  { MaLoaiSanPham: 4, TenLoaiSanPham: 'Phụ kiện' }
];

const CatalogPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── 1. Đọc Trạng Thái Lọc Từ URL Query Params ──
  const categoryParam = searchParams.get('category') || searchParams.get('category_id') || '';
  const romParam = searchParams.get('rom') || '';
  const priceMinParam = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : MIN_PRICE_LIMIT;
  const priceMaxParam = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : MAX_PRICE_LIMIT;
  const sortParam = searchParams.get('sort') || searchParams.get('sort_by') || '';
  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const searchKeyword = searchParams.get('search') || searchParams.get('q') || '';

  // Parse mảng ROM từ chuỗi "128GB,256GB"
  const selectedRoms = romParam
    ? romParam.split(',').map((r) => r.trim()).filter(Boolean)
    : [];

  // Local state cho Dual Range Slider tương tác mượt mà
  const [sliderMin, setSliderMin] = useState(priceMinParam);
  const [sliderMax, setSliderMax] = useState(priceMaxParam);

  // Cập nhật slider state khi URL query param thay đổi
  useEffect(() => {
    setSliderMin(priceMinParam);
    setSliderMax(priceMaxParam);
  }, [priceMinParam, priceMaxParam]);

  // Data States
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: pageParam,
    limit: 12,
    totalPages: 1
  });
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // ── 2. Fetch Danh Mục Sản Phẩm ──
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/products/categories');
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setCategories(res.data.data);
        } else {
          setCategories(FALLBACK_CATEGORIES);
        }
      } catch (err) {
        console.error('Lỗi khi lấy danh mục loại sản phẩm:', err);
        setCategories(FALLBACK_CATEGORIES);
      }
    };

    fetchCategories();
  }, []);

  // ── 3. Fetch Danh Sách Sản Phẩm Theo Query Params ──
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pageParam,
        limit: 12
      };

      if (categoryParam) params.category_id = categoryParam;
      if (romParam) params.rom = romParam;
      if (priceMinParam > MIN_PRICE_LIMIT) params.price_min = priceMinParam;
      if (priceMaxParam < MAX_PRICE_LIMIT) params.price_max = priceMaxParam;
      if (sortParam) params.sort_by = sortParam;
      if (searchKeyword) params.search = searchKeyword;

      const res = await api.get('/products', { params });
      if (res.data?.success) {
        setProducts(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Lỗi khi lấy danh sách sản phẩm:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryParam, romParam, priceMinParam, priceMaxParam, sortParam, pageParam, searchKeyword]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── 4. Hàm Cập Nhật URL Query Params ──
  const updateQueryParams = (newParams) => {
    const params = new URLSearchParams(searchParams);

    Object.keys(newParams).forEach((key) => {
      const val = newParams[key];
      if (val === null || val === undefined || val === '' || val === 0) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    // Reset về trang 1 nếu thay đổi bất kỳ bộ lọc nào ngoại trừ đổi trang
    if (!('page' in newParams)) {
      params.set('page', '1');
    }

    setSearchParams(params);
  };

  // Thay đổi Category
  const handleSelectCategory = (catId) => {
    updateQueryParams({
      category: categoryParam === String(catId) ? '' : String(catId)
    });
  };

  // Toggle Checkbox ROM
  const handleToggleRom = (romValue) => {
    let updatedRoms;
    if (selectedRoms.includes(romValue)) {
      updatedRoms = selectedRoms.filter((r) => r !== romValue);
    } else {
      updatedRoms = [...selectedRoms, romValue];
    }

    updateQueryParams({
      rom: updatedRoms.length > 0 ? updatedRoms.join(',') : ''
    });
  };

  // Áp dụng khoảng giá từ Dual Range Slider
  const handleApplyPriceFilter = (minVal, maxVal) => {
    updateQueryParams({
      price_min: minVal > MIN_PRICE_LIMIT ? minVal : '',
      price_max: maxVal < MAX_PRICE_LIMIT ? maxVal : ''
    });
  };

  // Thay đổi Sắp xếp
  const handleSelectSort = (sortValue) => {
    updateQueryParams({
      sort: sortValue
    });
  };

  // Xóa tất cả bộ lọc (Reset Filter State)
  const handleResetFilters = () => {
    setSearchParams({});
    setSliderMin(MIN_PRICE_LIMIT);
    setSliderMax(MAX_PRICE_LIMIT);
    toast.success('Đã làm mới tất cả bộ lọc!', { id: 'reset-filter-toast' });
  };

  // Thay đổi trang Phân trang
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      updateQueryParams({ page: newPage });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Thêm vào giỏ hàng
  const handleAddToCart = (product) => {
    toast.success(`Đã thêm "${product.TenSanPham}" vào giỏ hàng!`, {
      id: `cart-add-${product.MaSanPham}`
    });
  };

  // Định dạng VNĐ
  const formatVND = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price || 0);
  };

  // Tính số lượng bộ lọc đang active
  const activeFiltersCount = [
    categoryParam ? 1 : 0,
    selectedRoms.length,
    priceMinParam > MIN_PRICE_LIMIT || priceMaxParam < MAX_PRICE_LIMIT ? 1 : 0,
    searchKeyword ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  // ── Tính toán phầm trăm dải màu Dual Range Slider ──
  const minPercent = Math.round(((sliderMin - MIN_PRICE_LIMIT) / (MAX_PRICE_LIMIT - MIN_PRICE_LIMIT)) * 100);
  const maxPercent = Math.round(((sliderMax - MIN_PRICE_LIMIT) / (MAX_PRICE_LIMIT - MIN_PRICE_LIMIT)) * 100);

  // JSX Bộ Lọc (Sidebar Content dùng chung cho Desktop & Mobile Drawer)
  const renderSidebarFilters = () => (
    <div className="space-y-8">
      {/* Nút Xóa Bộ Lọc nếu có active filter */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-semibold text-sky-400">
            Đang áp dụng <strong>{activeFiltersCount}</strong> bộ lọc
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa tất cả</span>
          </button>
        </div>
      )}

      {/* ── 1. Danh Mục Loại Sản Phẩm (`loaisanpham`) ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-sky-400" />
          <span>Danh Mục Sản Phẩm</span>
        </h3>

        <div className="space-y-1">
          {/* Option Tất Cả */}
          <button
            type="button"
            onClick={() => handleSelectCategory('')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              !categoryParam
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <span>Tất cả sản phẩm</span>
            {!categoryParam && <Check className="w-4 h-4 text-sky-400" />}
          </button>

          {/* List loại sản phẩm từ API */}
          {categories.map((cat) => {
            const isSelected = categoryParam === String(cat.MaLoaiSanPham);
            return (
              <button
                key={cat.MaLoaiSanPham}
                type="button"
                onClick={() => handleSelectCategory(cat.MaLoaiSanPham)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <span>{cat.TenLoaiSanPham}</span>
                {isSelected && <Check className="w-4 h-4 text-sky-400" />}
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-slate-800/80" />

      {/* ── 2. Khoảng Giá (Dual Input Range Slider) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Khoảng Giá (VNĐ)</span>
          </h3>
        </div>

        {/* Hiển thị khoảng giá đã chọn */}
        <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
          <span className="font-bold text-sky-400">{formatVND(sliderMin)}</span>
          <span className="text-slate-600">-</span>
          <span className="font-bold text-indigo-400">{formatVND(sliderMax)}</span>
        </div>

        {/* Dual Range Slider Container */}
        <div className="relative pt-4 pb-2 px-1">
          {/* Base Background Track */}
          <div className="relative w-full h-2 bg-slate-800 rounded-full">
            {/* Highlighted Active Range Track */}
            <div
              className="absolute h-2 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
              style={{
                left: `${minPercent}%`,
                width: `${maxPercent - minPercent}%`
              }}
            />
          </div>

          {/* Min Input Slider Range */}
          <input
            type="range"
            min={MIN_PRICE_LIMIT}
            max={MAX_PRICE_LIMIT}
            step={PRICE_STEP}
            value={sliderMin}
            onChange={(e) => {
              const val = Math.min(Number(e.target.value), sliderMax - PRICE_STEP);
              setSliderMin(val);
            }}
            onMouseUp={() => handleApplyPriceFilter(sliderMin, sliderMax)}
            onTouchEnd={() => handleApplyPriceFilter(sliderMin, sliderMax)}
            className="absolute top-4 left-0 w-full appearance-none bg-transparent pointer-events-none cursor-pointer range-slider-thumb"
          />

          {/* Max Input Slider Range */}
          <input
            type="range"
            min={MIN_PRICE_LIMIT}
            max={MAX_PRICE_LIMIT}
            step={PRICE_STEP}
            value={sliderMax}
            onChange={(e) => {
              const val = Math.max(Number(e.target.value), sliderMin + PRICE_STEP);
              setSliderMax(val);
            }}
            onMouseUp={() => handleApplyPriceFilter(sliderMin, sliderMax)}
            onTouchEnd={() => handleApplyPriceFilter(sliderMin, sliderMax)}
            className="absolute top-4 left-0 w-full appearance-none bg-transparent pointer-events-none cursor-pointer range-slider-thumb"
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-500">
          <span>0đ</span>
          <span>50 Triệu+</span>
        </div>
      </div>

      <hr className="border-slate-800/80" />

      {/* ── 3. Bộ Nhớ Trong ROM (Checkboxes 128GB, 256GB, 512GB, 1TB) ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-violet-400" />
          <span>Bộ Nhớ Trong (ROM)</span>
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {ROM_OPTIONS.map((rom) => {
            const isChecked = selectedRoms.includes(rom);
            return (
              <label
                key={rom}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                  isChecked
                    ? 'bg-violet-500/10 border-violet-500/40 text-violet-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleRom(rom)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-violet-600 focus:ring-violet-500 focus:ring-offset-slate-950"
                />
                <span className="text-xs">{rom}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Navbar Component */}
      <Navbar />

      {/* Custom CSS Cho Dual Range Slider Thumbs */}
      <style>{`
        .range-slider-thumb::-webkit-slider-thumb {
          pointer-events: auto;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #0284c7;
          border: 2px solid #ffffff;
          box-shadow: 0 0 10px rgba(2, 132, 199, 0.5);
          cursor: grab;
          transition: transform 0.15s ease;
        }
        .range-slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .range-slider-thumb::-moz-range-thumb {
          pointer-events: auto;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #0284c7;
          border: 2px solid #ffffff;
          box-shadow: 0 0 10px rgba(2, 132, 199, 0.5);
          cursor: grab;
        }
      `}</style>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-400">
          <Link to="/" className="hover:text-sky-400 transition-colors">Trang chủ</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-200 font-semibold">Danh mục sản phẩm</span>
          {searchKeyword && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-sky-400 italic">"{searchKeyword}"</span>
            </>
          )}
        </nav>

        {/* Page Banner Title Header */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SmartZone Catalog</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {searchKeyword ? `Kết quả tìm kiếm: "${searchKeyword}"` : 'Tất Cả Sản Phẩm Smartphone & Thiết Bị'}
            </h1>
            <p className="text-xs text-slate-400">
              Khám phá hệ sinh thái smartphone chính hãng với mức giá hấp dẫn nhất
            </p>
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        {/* Catalog Main Layout Grid: Sidebar (Col 3) & Product Grid (Col 9) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ── Left Sidebar Filter (Desktop) ── */}
          <aside className="hidden lg:block lg:col-span-3 bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sticky top-20 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Bộ Lọc Tìm Kiếm
                </h2>
              </div>
            </div>

            {renderSidebarFilters()}
          </aside>

          {/* ── Main Content Area (Top Toolbar + Grid) ── */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Top Toolbar (Sort Dropdown & Mobile Drawer Toggle) */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
              
              {/* Left: Found Count & Mobile Filter Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  <span>Bộ lọc {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
                </button>

                <p className="text-xs text-slate-400">
                  Hiển thị <strong className="text-slate-100">{products.length}</strong> / <strong className="text-slate-100">{pagination.total}</strong> sản phẩm
                </p>
              </div>

              {/* Right: Sắp xếp (Top Toolbar Dropdown) */}
              <div className="flex items-center gap-2 ml-auto">
                <label htmlFor="sort-select" className="hidden sm:flex items-center gap-1 text-xs text-slate-400 font-medium">
                  <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
                  <span>Sắp xếp:</span>
                </label>

                <select
                  id="sort-select"
                  value={sortParam}
                  onChange={(e) => handleSelectSort(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-sky-500 transition-colors shadow-inner cursor-pointer"
                >
                  <option value="">Mặc định (Mới nhất)</option>
                  <option value="price_asc">Giá từ thấp đến cao (price_asc)</option>
                  <option value="price_desc">Giá từ cao đến thấp (price_desc)</option>
                </select>
              </div>

            </div>

            {/* Active Filter Tags */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500 font-semibold">Đang lọc theo:</span>

                {categoryParam && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <span>Loại: {categories.find((c) => String(c.MaLoaiSanPham) === categoryParam)?.TenLoaiSanPham || categoryParam}</span>
                    <button type="button" onClick={() => handleSelectCategory(categoryParam)} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedRoms.map((rom) => (
                  <span key={rom} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    <span>ROM: {rom}</span>
                    <button type="button" onClick={() => handleToggleRom(rom)} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {(priceMinParam > MIN_PRICE_LIMIT || priceMaxParam < MAX_PRICE_LIMIT) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    <span>Giá: {formatVND(priceMinParam)} - {formatVND(priceMaxParam)}</span>
                    <button type="button" onClick={() => handleApplyPriceFilter(MIN_PRICE_LIMIT, MAX_PRICE_LIMIT)} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {searchKeyword && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    <span>Từ khóa: "{searchKeyword}"</span>
                    <button type="button" onClick={() => updateQueryParams({ search: '' })} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* ── Product Grid Responsive ── */}
            {loading ? (
              /* Skeleton Loader Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 animate-pulse">
                    <div className="w-full h-48 bg-slate-800 rounded-xl" />
                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                    <div className="h-4 bg-slate-800 rounded w-1/2" />
                    <div className="h-8 bg-slate-800 rounded-xl w-full" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              /* Empty State view */
              <div className="p-12 text-center bg-slate-900/60 border border-slate-800/80 rounded-3xl space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-200">Không tìm thấy sản phẩm phù hợp</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Thử điều chỉnh hoặc xóa các tiêu chí bộ lọc (ROM, Giá, Loại sản phẩm) để tìm kiếm thêm sản phẩm.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-sky-500/20"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            ) : (
              /* Actual Product Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((item) => (
                  <div
                    key={item.MaSanPham}
                    className="bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/10 group relative"
                  >
                    {/* Badges */}
                    <div className="absolute top-6 left-6 z-10 flex flex-col gap-1">
                      {item.DungLuong && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          {item.DungLuong}
                        </span>
                      )}
                      {item.MauSac && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.MauSac}
                        </span>
                      )}
                    </div>

                    {/* Thumbnail Image */}
                    <div className="relative w-full h-48 rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden flex items-center justify-center p-3 mb-4 group-hover:border-slate-700 transition-colors">
                      {item.Anh ? (
                        <img
                          src={item.Anh}
                          alt={item.TenSanPham}
                          className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <PackageCheck className="w-12 h-12 text-slate-700" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1 text-amber-400 text-xs mb-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span className="font-bold text-slate-300">4.9</span>
                          <span className="text-slate-500 text-[10px]">(Standard)</span>
                        </div>

                        <h3
                          onClick={() => navigate(`/products/${item.MaSanPham}`)}
                          className="text-sm font-bold text-slate-100 hover:text-sky-400 transition-colors cursor-pointer line-clamp-2"
                        >
                          {item.TenSanPham}
                        </h3>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-baseline justify-between">
                        <div>
                          <p className="text-base font-black text-sky-400">
                            {formatVND(item.Gia)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        className="flex-1 py-2 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/20 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Thêm giỏ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/products/${item.MaSanPham}`)}
                        className="p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Pagination Component ── */}
            {pagination.totalPages > 1 && (
              <div className="pt-6 flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Trước</span>
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
                          ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
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
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Sau</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ── Mobile Slide-over Drawer Filter Modal ── */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setMobileFilterOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xs bg-slate-950 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Bộ Lọc Sản Phẩm
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderSidebarFilters()}

            <div className="pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all"
              >
                Xem {pagination.total} sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Component */}
      <Footer />
    </div>
  );
};

export default CatalogPage;
