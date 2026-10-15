import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import ProductCard from '../../components/user/ProductCard';
import api from '../../services/api';

/* ─── Constants ───────────────────────────────────────────────────────────── */
const ROM_OPTIONS = ['128GB', '256GB', '512GB', '1TB'];
const MIN_PRICE_LIMIT = 0;
const MAX_PRICE_LIMIT = 50000000;
const PRICE_STEP = 500000;

const PRICE_QUICK_RANGES = [
  { label: 'Dưới 5 triệu', min: 0, max: 5000000 },
  { label: '5 - 10 triệu', min: 5000000, max: 10000000 },
  { label: '10 - 15 triệu', min: 10000000, max: 15000000 },
  { label: '15 - 20 triệu', min: 15000000, max: 20000000 },
  { label: 'Trên 20 triệu', min: 20000000, max: MAX_PRICE_LIMIT, span2: true },
];

/* ─── Skeleton Loader ─────────────────────────────────────────────────────── */
const ProductSkeleton = () => (
  <div className="group flex flex-col justify-between p-unit-md rounded-xl bg-surface-container-lowest shadow-sm animate-pulse space-y-3 border border-surface-container/50">
    <div className="w-full aspect-square bg-surface-container-low rounded-lg" />
    <div className="space-y-2 mt-unit-xs">
      <div className="h-4 bg-surface-container-low rounded w-3/4" />
      <div className="h-3 bg-surface-container-low rounded w-1/2" />
    </div>
    <div className="h-5 bg-surface-container-low rounded w-2/5 mt-unit-xs" />
    <div className="flex gap-unit-xs pt-unit-xs">
      <div className="h-9 bg-surface-container-low rounded-lg flex-1" />
      <div className="h-9 bg-surface-container-low rounded-lg flex-1" />
    </div>
  </div>
);

/* ─── Formatters ──────────────────────────────────────────────────────────── */
const formatVNDNumber = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);
const formatShortPrice = (val) => {
  if (!val || val === 0) return '0đ';
  if (val >= 1000000) {
    const tr = val / 1000000;
    return Number.isInteger(tr) ? `${tr}Tr` : `${tr.toFixed(1)}Tr`;
  }
  return `${Math.round(val / 1000)}K`;
};

/* ─── CatalogPage Component ───────────────────────────────────────────────── */
const CatalogPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── 1. Query Params từ URL ── */
  const categoryParam = searchParams.get('category') || searchParams.get('category_id') || '';
  const brandParam    = searchParams.get('brand') || searchParams.get('manufacturer') || searchParams.get('manufacturer_id') || '';
  const priceMinParam = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : MIN_PRICE_LIMIT;
  const priceMaxParam = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : MAX_PRICE_LIMIT;
  const romParam      = searchParams.get('rom') || '';
  const sortParam     = searchParams.get('sort_by') || searchParams.get('sort') || '';
  const pageParam     = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const searchKeyword = searchParams.get('search') || searchParams.get('q') || '';

  const selectedBrands = useMemo(
    () => (brandParam ? brandParam.split(',').map((b) => b.trim()).filter(Boolean) : []),
    [brandParam]
  );

  const selectedRoms = useMemo(
    () => (romParam ? romParam.split(',').map((r) => r.trim()).filter(Boolean) : []),
    [romParam]
  );

  /* ── 2. Local State ── */
  const [manufacturers, setManufacturers] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: pageParam, limit: 9, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Price slider state
  const [sliderMin, setSliderMin] = useState(priceMinParam);
  const [sliderMax, setSliderMax] = useState(priceMaxParam);

  useEffect(() => {
    setSliderMin(priceMinParam);
    setSliderMax(priceMaxParam);
  }, [priceMinParam, priceMaxParam]);

  /* ── 3. Fetch Hãng Sản Xuất từ API ── */
  useEffect(() => {
    api.get('/manufacturers')
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setManufacturers(res.data.data);
        }
      })
      .catch((err) => {
        console.error('Lỗi lấy danh sách nhà sản xuất:', err);
      });
  }, []);

  /* ── 4. Fetch Sản Phẩm Đồng Bộ URL Params ── */
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pageParam,
        limit: 9,
      };
      if (categoryParam) params.category = categoryParam;
      if (brandParam) params.brand = brandParam;
      if (priceMinParam > MIN_PRICE_LIMIT) params.price_min = priceMinParam;
      if (priceMaxParam < MAX_PRICE_LIMIT) params.price_max = priceMaxParam;
      if (romParam) params.rom = romParam;
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
      console.error('Lỗi tải sản phẩm:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pageParam, categoryParam, brandParam, priceMinParam, priceMaxParam, romParam, sortParam, searchKeyword]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* ── 5. Cập Nhật URL Search Params ── */
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

    // Reset về trang 1 nếu không truyền page mới
    if (!('page' in newParams)) {
      params.set('page', '1');
    }
    setSearchParams(params);
  };

  /* ── 6. Filter Handlers ── */
  // Toggle Brand
  const handleToggleBrand = (brandName) => {
    const updated = selectedBrands.includes(brandName)
      ? selectedBrands.filter((b) => b !== brandName)
      : [...selectedBrands, brandName];
    updateQueryParams({ brand: updated.length > 0 ? updated.join(',') : '' });
  };

  // Toggle ROM
  const handleToggleRom = (romValue) => {
    const updated = selectedRoms.includes(romValue)
      ? selectedRoms.filter((r) => r !== romValue)
      : [...selectedRoms, romValue];
    updateQueryParams({ rom: updated.length > 0 ? updated.join(',') : '' });
  };

  // Quick Price Range
  const handleSelectPriceRange = (range) => {
    const isCurrentlyActive = priceMinParam === range.min && priceMaxParam === range.max;
    if (isCurrentlyActive) {
      updateQueryParams({ price_min: '', price_max: '' });
      setSliderMin(MIN_PRICE_LIMIT);
      setSliderMax(MAX_PRICE_LIMIT);
    } else {
      updateQueryParams({
        price_min: range.min > MIN_PRICE_LIMIT ? range.min : '',
        price_max: range.max < MAX_PRICE_LIMIT ? range.max : '',
      });
      setSliderMin(range.min);
      setSliderMax(range.max);
    }
  };

  // Dual Slider Range Apply
  const handleApplyPriceFilter = (minVal, maxVal) => {
    updateQueryParams({
      price_min: minVal > MIN_PRICE_LIMIT ? minVal : '',
      price_max: maxVal < MAX_PRICE_LIMIT ? maxVal : '',
    });
  };

  // Toggle Sorting (price_asc / price_desc)
  const handleToggleSort = (targetSort) => {
    if (sortParam === targetSort) {
      updateQueryParams({ sort_by: '' });
    } else {
      updateQueryParams({ sort_by: targetSort });
    }
  };

  // Reset Tất Cả Bộ Lọc
  const handleResetFilters = () => {
    setSearchParams({});
    setSliderMin(MIN_PRICE_LIMIT);
    setSliderMax(MAX_PRICE_LIMIT);
    toast.success('Đã làm mới tất cả bộ lọc!', { id: 'reset-catalog-filters' });
  };

  // Pagination Change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      updateQueryParams({ page: newPage });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /* ── 7. Active Filters Count ── */
  const activeFiltersCount = [
    selectedBrands.length,
    selectedRoms.length,
    priceMinParam > MIN_PRICE_LIMIT || priceMaxParam < MAX_PRICE_LIMIT ? 1 : 0,
    categoryParam ? 1 : 0,
    searchKeyword ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const minPercent = Math.round(((sliderMin - MIN_PRICE_LIMIT) / (MAX_PRICE_LIMIT - MIN_PRICE_LIMIT)) * 100);
  const maxPercent = Math.round(((sliderMax - MIN_PRICE_LIMIT) / (MAX_PRICE_LIMIT - MIN_PRICE_LIMIT)) * 100);

  /* ── 8. Render Khung Sidebar Bộ Lọc (Chỉ giữ đúng 4 khối) ── */
  const renderSidebarFilters = () => (
    <div className="flex flex-col gap-unit-md">
      {/* ── KHỐI 1: Bộ Lọc Đã Chọn ── */}
      <div className="p-unit-md rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container/60">
        <div className="flex items-center justify-between mb-unit-xs">
          <span className="font-title-card text-title-card text-on-surface flex items-center gap-unit-2xs font-semibold">
            <span className="material-symbols-outlined text-primary text-lg">filter_alt</span>
            Bộ lọc đã chọn
          </span>
          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="font-body-sm text-body-sm text-error hover:underline font-semibold cursor-pointer"
              type="button"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {activeFiltersCount > 0 ? (
          <div className="flex flex-wrap gap-unit-xs pt-unit-2xs">
            {/* Tag Hãng */}
            {selectedBrands.map((brandName) => (
              <span
                key={brandName}
                className="inline-flex items-center gap-1 px-unit-xs py-1 rounded-full bg-surface-container-high text-primary font-body-sm text-body-sm font-semibold"
              >
                {brandName}
                <button
                  type="button"
                  onClick={() => handleToggleBrand(brandName)}
                  className="material-symbols-outlined text-sm hover:text-error cursor-pointer leading-none"
                >
                  close
                </button>
              </span>
            ))}

            {/* Tag Mức Giá */}
            {(priceMinParam > MIN_PRICE_LIMIT || priceMaxParam < MAX_PRICE_LIMIT) && (
              <span className="inline-flex items-center gap-1 px-unit-xs py-1 rounded-full bg-surface-container-high text-primary font-body-sm text-body-sm font-semibold">
                {priceMinParam > MIN_PRICE_LIMIT && priceMaxParam < MAX_PRICE_LIMIT
                  ? `${formatShortPrice(priceMinParam)} - ${formatShortPrice(priceMaxParam)}`
                  : priceMinParam > MIN_PRICE_LIMIT
                  ? `Từ ${formatShortPrice(priceMinParam)}`
                  : `Dưới ${formatShortPrice(priceMaxParam)}`}
                <button
                  type="button"
                  onClick={() => {
                    updateQueryParams({ price_min: '', price_max: '' });
                    setSliderMin(MIN_PRICE_LIMIT);
                    setSliderMax(MAX_PRICE_LIMIT);
                  }}
                  className="material-symbols-outlined text-sm hover:text-error cursor-pointer leading-none"
                >
                  close
                </button>
              </span>
            )}

            {/* Tag ROM */}
            {selectedRoms.map((rom) => (
              <span
                key={rom}
                className="inline-flex items-center gap-1 px-unit-xs py-1 rounded-full bg-surface-container-high text-primary font-body-sm text-body-sm font-semibold"
              >
                {rom}
                <button
                  type="button"
                  onClick={() => handleToggleRom(rom)}
                  className="material-symbols-outlined text-sm hover:text-error cursor-pointer leading-none"
                >
                  close
                </button>
              </span>
            ))}

            {/* Tag Từ khóa tìm kiếm nếu có */}
            {searchKeyword && (
              <span className="inline-flex items-center gap-1 px-unit-xs py-1 rounded-full bg-surface-container-high text-primary font-body-sm text-body-sm font-semibold">
                "{searchKeyword}"
                <button
                  type="button"
                  onClick={() => updateQueryParams({ search: '' })}
                  className="material-symbols-outlined text-sm hover:text-error cursor-pointer leading-none"
                >
                  close
                </button>
              </span>
            )}
          </div>
        ) : (
          <p className="font-body-sm text-body-sm text-on-surface-variant italic pt-unit-2xs">
            Chưa có bộ lọc nào được áp dụng
          </p>
        )}
      </div>

      {/* ── KHỐI 2: Hãng Sản Xuất (Fetch Động API manufacturers) ── */}
      <div className="p-unit-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-unit-sm border border-surface-container/60">
        <span className="font-title-card text-title-card text-on-surface font-semibold">
          Hãng sản xuất
        </span>
        <div className="flex flex-col gap-unit-xs font-body-md text-body-md text-on-surface max-h-72 overflow-y-auto pr-1">
          {manufacturers.length === 0 ? (
            <div className="py-2 text-center text-on-surface-variant font-body-sm text-body-sm">
              Đang tải danh sách hãng...
            </div>
          ) : (
            manufacturers.map((m) => {
              const isChecked = selectedBrands.includes(m.TenNhaSanXuat);
              return (
                <label
                  key={m.MaNhaSanXuat}
                  className={`flex items-center justify-between p-unit-2xs rounded-lg hover:bg-surface-container cursor-pointer transition-colors ${
                    isChecked ? 'bg-surface-container-low font-semibold text-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-unit-xs">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleBrand(m.TenNhaSanXuat)}
                      className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                    />
                    <span>{m.TenNhaSanXuat}</span>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* ── KHỐI 3: Mức Giá (VNĐ) (Quick Buttons + Range Slider) ── */}
      <div className="p-unit-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-unit-sm border border-surface-container/60">
        <span className="font-title-card text-title-card text-on-surface font-semibold">
          Mức giá (VNĐ)
        </span>
        <div className="grid grid-cols-2 gap-unit-xs font-body-sm text-body-sm">
          {PRICE_QUICK_RANGES.map((pr) => {
            const isSelected = priceMinParam === pr.min && priceMaxParam === pr.max;
            return (
              <button
                key={pr.label}
                type="button"
                onClick={() => handleSelectPriceRange(pr)}
                className={`p-unit-2xs rounded-lg transition-colors font-medium text-left ${
                  pr.span2 ? 'col-span-2 text-center' : ''
                } ${
                  isSelected
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {pr.label}
              </button>
            );
          })}
        </div>

        {/* Dual Range Slider & Input Display */}
        <div className="pt-unit-xs flex flex-col gap-unit-2xs">
          <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
            <span>Khoảng giá tùy chỉnh</span>
            <span className="font-semibold text-primary">
              {formatShortPrice(sliderMin)} - {formatShortPrice(sliderMax)}
            </span>
          </div>

          <div className="relative pt-3 pb-3">
            <div className="relative w-full h-1.5 bg-surface-container-high rounded-lg">
              <div
                className="absolute h-1.5 bg-primary rounded-lg"
                style={{ left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%` }}
              />
            </div>
            <input
              type="range"
              min={MIN_PRICE_LIMIT}
              max={MAX_PRICE_LIMIT}
              step={PRICE_STEP}
              value={sliderMin}
              onChange={(e) => setSliderMin(Math.min(Number(e.target.value), sliderMax - PRICE_STEP))}
              onMouseUp={() => handleApplyPriceFilter(sliderMin, sliderMax)}
              onTouchEnd={() => handleApplyPriceFilter(sliderMin, sliderMax)}
              className="absolute top-3 left-0 w-full appearance-none bg-transparent pointer-events-none cursor-pointer range-slider-thumb accent-primary"
            />
            <input
              type="range"
              min={MIN_PRICE_LIMIT}
              max={MAX_PRICE_LIMIT}
              step={PRICE_STEP}
              value={sliderMax}
              onChange={(e) => setSliderMax(Math.max(Number(e.target.value), sliderMin + PRICE_STEP))}
              onMouseUp={() => handleApplyPriceFilter(sliderMin, sliderMax)}
              onTouchEnd={() => handleApplyPriceFilter(sliderMin, sliderMax)}
              className="absolute top-3 left-0 w-full appearance-none bg-transparent pointer-events-none cursor-pointer range-slider-thumb accent-primary"
            />
          </div>

          <div className="flex items-center gap-unit-xs pt-unit-2xs">
            <input
              type="text"
              readOnly
              value={formatVNDNumber(sliderMin)}
              className="w-full px-unit-xs py-1 rounded-lg bg-surface-container text-body-sm font-body-sm text-on-surface text-center font-mono focus:outline-none"
            />
            <span className="text-outline">-</span>
            <input
              type="text"
              readOnly
              value={formatVNDNumber(sliderMax)}
              className="w-full px-unit-xs py-1 rounded-lg bg-surface-container text-body-sm font-body-sm text-on-surface text-center font-mono focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── KHỐI 4: Bộ Nhớ Trong (ROM) ── */}
      <div className="p-unit-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-unit-sm border border-surface-container/60">
        <span className="font-title-card text-title-card text-on-surface font-semibold">
          Bộ nhớ trong (ROM)
        </span>
        <div className="grid grid-cols-2 gap-unit-xs font-body-sm text-body-sm">
          {ROM_OPTIONS.map((rom) => {
            const isChecked = selectedRoms.includes(rom);
            return (
              <label
                key={rom}
                className={`flex items-center gap-unit-xs p-unit-2xs rounded-lg cursor-pointer transition-colors ${
                  isChecked
                    ? 'bg-surface-container font-semibold text-primary'
                    : 'hover:bg-surface-container'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleRom(rom)}
                  className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
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
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased flex flex-col">
      <Navbar />

      <main className="w-full pt-4 md:pt-6 bg-surface min-h-screen flex-1">
        <div className="flex flex-col w-full">
          {/* Breadcrumb Navigation */}
          <section className="max-w-container-max mx-auto px-gutter-desktop w-full pt-unit-md pb-unit-sm">
            <nav className="flex items-center gap-unit-xs text-on-surface-variant font-body-sm text-body-sm flex-wrap">
              <Link to="/" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
                <span className="material-symbols-outlined text-base">home</span>Trang chủ
              </Link>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="hover:text-primary transition-colors cursor-pointer">Điện thoại thông minh</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="text-on-surface font-semibold">Tất cả sản phẩm</span>
              <span className="ml-unit-2xs px-unit-xs py-0.5 rounded-full bg-surface-container-high text-primary font-bold text-body-sm">
                {pagination.total} sản phẩm
              </span>
            </nav>
          </section>

          {/* Banner Quảng Cáo Đầu Trang */}
          <section className="max-w-container-max mx-auto px-gutter-desktop w-full pb-unit-lg">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary via-primary-container to-secondary text-on-primary p-unit-lg shadow-md flex flex-col md:flex-row items-center justify-between gap-unit-md">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-unit-2xs px-unit-xs py-0.5 rounded-full bg-on-primary/15 text-on-primary font-label-spec text-label-spec uppercase tracking-wider mb-unit-xs backdrop-blur-sm">
                  <span className="material-symbols-outlined text-sm leading-none">verified_user</span>
                  100% Phân Phối Chính Thức
                </div>
                <h1 className="font-headline-md text-headline-md tracking-tight font-extrabold mb-unit-2xs text-white">
                  Thế Giới Smartphone Chính Hãng - Giá Tốt Nhất - Trả Góp 0%
                </h1>
                <p className="font-body-md text-body-md text-on-primary-container opacity-90">
                  Đặc quyền bảo hành 1 đổi 1 trong 30 ngày, miễn phí vận chuyển hỏa tốc 1h và thu cũ đổi mới trợ giá tới 2.000.000đ.
                </p>
              </div>

              <div className="relative z-10 flex items-center gap-unit-sm shrink-0 flex-wrap sm:flex-nowrap">
                <div className="flex flex-col items-center justify-center px-unit-md py-unit-xs rounded-xl bg-on-primary/10 backdrop-blur-md">
                  <span className="material-symbols-outlined text-2xl text-secondary-container">bolt</span>
                  <span className="font-label-spec text-label-spec font-bold mt-1 text-white">Giao hỏa tốc 1H</span>
                </div>
                <div className="flex flex-col items-center justify-center px-unit-md py-unit-xs rounded-xl bg-on-primary/10 backdrop-blur-md">
                  <span className="material-symbols-outlined text-2xl text-tertiary-fixed-dim">percent</span>
                  <span className="font-label-spec text-label-spec font-bold mt-1 text-white">Lãi suất 0%</span>
                </div>
                <div className="flex flex-col items-center justify-center px-unit-md py-unit-xs rounded-xl bg-on-primary/10 backdrop-blur-md">
                  <span className="material-symbols-outlined text-2xl text-secondary-fixed">sync_alt</span>
                  <span className="font-label-spec text-label-spec font-bold mt-1 text-white">Thu cũ trợ giá</span>
                </div>
              </div>

              <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute left-1/3 -top-12 w-48 h-48 bg-secondary-container/20 rounded-full blur-xl pointer-events-none" />
            </div>
          </section>

          {/* Catalog Content Area */}
          <div className="max-w-container-max mx-auto px-gutter-desktop w-full pb-unit-3xl">
            <div className="flex flex-col lg:flex-row gap-gutter-desktop items-start">
              {/* Left Filter Sidebar (Desktop) */}
              <aside className="hidden lg:flex w-[280px] shrink-0 flex-col gap-unit-md sticky top-24">
                {renderSidebarFilters()}
              </aside>

              {/* Main Product Area */}
              <div className="flex-1 w-full flex flex-col gap-unit-lg">
                {/* Sorting Toolbar (Chỉ giữ 2 tùy chọn sắp xếp: Giá tăng dần & Giá giảm dần) */}
                <div className="p-unit-sm rounded-xl bg-surface-container-lowest shadow-sm flex flex-wrap items-center justify-between gap-unit-sm border border-surface-container/60">
                  <div className="flex items-center gap-unit-xs flex-wrap">
                    {/* Nút mở bộ lọc mobile */}
                    <button
                      type="button"
                      onClick={() => setMobileFilterOpen(true)}
                      className="lg:hidden flex items-center gap-1 px-unit-sm py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-body-sm text-body-sm font-semibold transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">filter_list</span>
                      <span>Bộ lọc {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
                    </button>

                    <span className="font-body-md text-body-md font-semibold text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">sort</span>Sắp xếp theo:
                    </span>

                    {/* Nút Giá tăng dần */}
                    <button
                      type="button"
                      onClick={() => handleToggleSort('price_asc')}
                      className={`px-unit-sm py-1.5 rounded-lg font-body-md text-body-md transition-colors flex items-center gap-1 cursor-pointer ${
                        sortParam === 'price_asc'
                          ? 'bg-primary text-on-primary font-bold shadow-sm'
                          : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                      }`}
                    >
                      <span>Giá tăng dần</span>
                      <span className="material-symbols-outlined text-sm leading-none">arrow_upward</span>
                    </button>

                    {/* Nút Giá giảm dần */}
                    <button
                      type="button"
                      onClick={() => handleToggleSort('price_desc')}
                      className={`px-unit-sm py-1.5 rounded-lg font-body-md text-body-md transition-colors flex items-center gap-1 cursor-pointer ${
                        sortParam === 'price_desc'
                          ? 'bg-primary text-on-primary font-bold shadow-sm'
                          : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                      }`}
                    >
                      <span>Giá giảm dần</span>
                      <span className="material-symbols-outlined text-sm leading-none">arrow_downward</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-unit-xs text-on-surface-variant font-body-sm text-body-sm">
                    <span>
                      Hiển thị <strong>{products.length}</strong> / {pagination.total} sản phẩm
                    </span>
                  </div>
                </div>

                {/* Danh Sách Sản Phẩm */}
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-unit-md w-full">
                    {[...Array(9)].map((_, i) => (
                      <ProductSkeleton key={i} />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="py-20 text-center bg-surface-container-lowest rounded-xl shadow-sm space-y-4 p-unit-xl border border-surface-container/60">
                    <span className="material-symbols-outlined text-5xl text-outline">search_off</span>
                    <h3 className="font-title-card text-title-card text-on-surface font-semibold">
                      Không tìm thấy sản phẩm phù hợp
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto">
                      Thử điều chỉnh hoặc xóa các tiêu chí bộ lọc để tìm kiếm thêm sản phẩm.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-unit-lg py-unit-xs bg-primary text-on-primary rounded-xl font-body-md text-body-md font-semibold hover:bg-primary-container transition-all shadow-sm active:scale-95"
                    >
                      Xóa tất cả bộ lọc
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-unit-md w-full">
                    {products.map((product) => (
                      <ProductCard key={product.MaSanPham} product={product} />
                    ))}
                  </div>
                )}

                {/* Phân Trang (Pagination) */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col items-center gap-unit-md pt-unit-md">
                    <nav className="flex items-center gap-unit-2xs font-body-md text-body-md text-on-surface flex-wrap justify-center">
                      <button
                        type="button"
                        disabled={pagination.page <= 1}
                        onClick={() => handlePageChange(pagination.page - 1)}
                        className="w-10 h-10 rounded-xl bg-surface-container-lowest hover:bg-surface-container flex items-center justify-center text-outline disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-surface-container"
                        aria-label="Trang trước"
                      >
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>

                      {[...Array(pagination.totalPages)].map((_, idx) => {
                        const pageNum = idx + 1;
                        const isCurrent = pageNum === pagination.page;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${
                              isCurrent
                                ? 'bg-primary text-on-primary shadow-sm'
                                : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-surface-container'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => handlePageChange(pagination.page + 1)}
                        className="w-10 h-10 rounded-xl bg-surface-container-lowest hover:bg-surface-container flex items-center justify-center text-primary font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-surface-container"
                        aria-label="Trang tiếp"
                      >
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div
            onClick={() => setMobileFilterOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm bg-surface h-full overflow-y-auto p-unit-md space-y-unit-md z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-unit-xs border-b border-surface-container">
              <span className="font-title-card text-title-card font-bold text-on-surface flex items-center gap-unit-2xs">
                <span className="material-symbols-outlined text-primary">filter_alt</span>
                Bộ Lọc Sản Phẩm
              </span>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {renderSidebarFilters()}

            <div className="pt-unit-xs">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-unit-xs bg-primary text-on-primary rounded-xl font-bold shadow-sm hover:bg-primary-container transition-all"
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
