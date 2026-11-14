import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Boxes,
  RefreshCw,
  Search,
  AlertCircle,
  ClipboardCheck,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  AlertTriangle,
  Package,
  X,
} from 'lucide-react';
import api from '../../../services/api';
import { formatVND, formatDateTime } from '../../../utils/formatters';

const STOCK_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'in_stock', label: 'Còn hàng (≥ 5)' },
  { id: 'low_stock', label: 'Sắp hết (1–4)' },
  { id: 'out_of_stock', label: 'Hết hàng (0)' },
];

const HISTORY_TYPES = [
  { id: 'ALL', label: 'Tất cả biến động' },
  { id: 'NhapKho', label: 'Nhập kho' },
  { id: 'XuatBan', label: 'Xuất bán' },
  { id: 'HuyDon', label: 'Hoàn tồn hủy đơn' },
  { id: 'CapNhatThuCong', label: 'Điều chỉnh kiểm kê' },
];

const formatImageUrl = (url) => {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const base =
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '')
      : 'http://localhost:5000');
  return `${base}${cleanPath}`;
};

const ProductThumb = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
        <Smartphone className="w-4 h-4 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={formatImageUrl(src)}
      alt={alt}
      onError={() => setFailed(true)}
      className="w-10 h-10 rounded-xl object-contain bg-slate-50 border border-slate-200 p-0.5 shrink-0"
    />
  );
};

// ── Badges trạng thái tồn kho ──
const getStatusBadge = (trangThai, tonKho) => {
  const qty = Number(tonKho) || 0;
  if (qty >= 5 || trangThai === 'Còn hàng') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Còn hàng
      </span>
    );
  }
  if (qty > 0 || trangThai === 'Sắp hết') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Sắp hết
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      Hết hàng
    </span>
  );
};

const getMovementBadge = (type) => {
  switch (type) {
    case 'NhapKho':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
          Nhập kho
        </span>
      );
    case 'XuatBan':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <ArrowUpRight className="w-3.5 h-3.5 text-sky-600" />
          Xuất bán
        </span>
      );
    case 'HuyDon':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
          <RotateCcw className="w-3.5 h-3.5 text-violet-600" />
          Hoàn tồn hủy đơn
        </span>
      );
    case 'CapNhatThuCong':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
          Điều chỉnh kiểm kê
        </span>
      );
  }
};

const InventoryListPage = () => {
  const location = useLocation();
  const initialStockFilter = location.state?.stockFilter || 'all';

  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'history'
  const [stockList, setStockList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState(initialStockFilter);
  const [historyType, setHistoryType] = useState('ALL');

  useEffect(() => {
    if (location.state?.stockFilter) {
      setActiveTab('stock');
      setStockFilter(location.state.stockFilter);
    }
  }, [location.state?.stockFilter]);

  // Lấy danh sách tồn kho & lịch sử nhập/xuất (Chỉ xem)
  const fetchInventoryOverview = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [stockRes, historyRes] = await Promise.all([
        api.get('/admin/inventory/stock-list'),
        api.get('/admin/inventory/history', { params: { limit: 250 } }),
      ]);
      setStockList(Array.isArray(stockRes.data?.data) ? stockRes.data.data : []);
      setHistoryList(Array.isArray(historyRes.data?.data) ? historyRes.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu theo dõi tồn kho');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryOverview();
  }, [fetchInventoryOverview]);

  // Summary metrics
  const summary = useMemo(() => {
    const totalProducts = stockList.length;
    const totalUnits = stockList.reduce((sum, item) => sum + (Number(item.TonKho) || 0), 0);
    const lowStockCount = stockList.filter((item) => {
      const qty = Number(item.TonKho) || 0;
      return qty > 0 && qty < 5;
    }).length;
    const outOfStockCount = stockList.filter((item) => (Number(item.TonKho) || 0) <= 0).length;
    const importCount = historyList.filter((h) => h.LoaiBienDong === 'NhapKho').length;
    const exportCount = historyList.filter((h) => h.LoaiBienDong === 'XuatBan').length;

    return {
      totalProducts,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      attentionCount: lowStockCount + outOfStockCount,
      totalHistory: historyList.length,
      importCount,
      exportCount,
    };
  }, [stockList, historyList]);

  // Filtered Stock List
  const filteredStock = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return stockList.filter((item) => {
      const qty = Number(item.TonKho) || 0;
      if (stockFilter === 'in_stock' && qty < 5) return false;
      if (stockFilter === 'low_stock' && (qty <= 0 || qty >= 5)) return false;
      if (stockFilter === 'out_of_stock' && qty > 0) return false;

      if (!keyword) return true;
      return (
        item.TenSanPham?.toLowerCase().includes(keyword) ||
        String(item.MaSanPham).includes(keyword) ||
        `#${item.MaSanPham}`.includes(keyword) ||
        (item.TenNhaSanXuat || '').toLowerCase().includes(keyword) ||
        (item.TenLoaiSanPham || '').toLowerCase().includes(keyword)
      );
    });
  }, [stockList, searchTerm, stockFilter]);

  // Filtered History List
  const filteredHistory = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return historyList.filter((item) => {
      if (historyType !== 'ALL' && item.LoaiBienDong !== historyType) return false;
      if (!keyword) return true;
      return (
        (item.TenSanPham || '').toLowerCase().includes(keyword) ||
        String(item.MaSanPham).includes(keyword) ||
        (item.GhiChu || '').toLowerCase().includes(keyword) ||
        String(item.MaThamChieu || '').includes(keyword)
      );
    });
  }, [historyList, searchTerm, historyType]);

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Read-only Oversight Banner ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            Theo dõi Tồn kho
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/admin/inventory/adjustments"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-semibold transition-all shadow-2xs"
          >
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
            <span>Duyệt phiếu lệch kho</span>
          </Link>

          <button
            type="button"
            onClick={() => fetchInventoryOverview({ silent: true })}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold transition-all shadow-2xs disabled:opacity-60 cursor-pointer"
            title="Tải lại dữ liệu tồn kho"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 3 Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab('stock');
            setStockFilter('all');
          }}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'stock' && stockFilter === 'all'
              ? 'border-blue-400 ring-2 ring-blue-500/15 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng sản phẩm theo dõi
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {summary.totalProducts}
              </span>
              <span className="text-xs text-slate-500 font-medium">dòng SP</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Tổng tồn hệ thống:{' '}
              <strong className="text-blue-600">{summary.totalUnits.toLocaleString('vi-VN')}</strong> máy
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('stock');
            setStockFilter(summary.lowStockCount > 0 ? 'low_stock' : 'out_of_stock');
          }}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'stock' && (stockFilter === 'low_stock' || stockFilter === 'out_of_stock')
              ? 'border-amber-400 ring-2 ring-amber-500/15 shadow-md'
              : 'border-slate-200 hover:border-amber-200 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cảnh báo sắp hết / Hết hàng
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-600">
                {summary.attentionCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">sản phẩm</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Sắp hết (&lt; 5): <strong className="text-amber-600">{summary.lowStockCount}</strong> · Hết hàng:{' '}
              <strong className="text-rose-600">{summary.outOfStockCount}</strong>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'history'
              ? 'border-indigo-400 ring-2 ring-indigo-500/15 shadow-md'
              : 'border-slate-200 hover:border-indigo-200 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lịch sử nhập / xuất kho
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-indigo-600">
                {summary.totalHistory}
              </span>
              <span className="text-xs text-slate-500 font-medium">lượt ghi nhận</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Nhập kho: <strong className="text-emerald-600">{summary.importCount}</strong> · Xuất bán:{' '}
              <strong className="text-sky-600">{summary.exportCount}</strong>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <History className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* ── Main Card: Tabs + Filters + Table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Tabs Header */}
        <div className="grid grid-cols-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'stock'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Danh sách số lượng tồn</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'stock' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {stockList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Lịch sử nhập / xuất kho</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {historyList.length}
            </span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {activeTab === 'stock' ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {STOCK_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStockFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    stockFilter === f.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {HISTORY_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setHistoryType(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    historyType === t.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={
                activeTab === 'stock'
                  ? 'Tìm tên sản phẩm, #Mã SP, hãng...'
                  : 'Tìm sản phẩm, ghi chú, mã tham chiếu...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {error ? (
          <div className="p-10 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <p className="text-slate-600 font-medium">{error}</p>
            <button
              type="button"
              onClick={() => fetchInventoryOverview()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : activeTab === 'stock' ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-700 min-w-[680px]">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 w-16 text-center">STT</th>
                  <th className="px-5 py-3.5">Sản phẩm</th>
                  <th className="px-5 py-3.5 text-right w-40">Đơn giá</th>
                  <th className="px-5 py-3.5 text-center w-32">Số lượng tồn</th>
                  <th className="px-5 py-3.5 text-center w-36">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4 text-center"><div className="h-4 bg-slate-200 rounded w-6 mx-auto" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-200 rounded w-56" /></td>
                      <td className="px-5 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-24 ml-auto" /></td>
                      <td className="px-5 py-4 text-center"><div className="h-4 bg-slate-200 rounded w-12 mx-auto" /></td>
                      <td className="px-5 py-4 text-center"><div className="h-6 bg-slate-200 rounded-full w-24 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <Boxes className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium text-slate-500">
                        {searchTerm || stockFilter !== 'all'
                          ? 'Không tìm thấy sản phẩm khớp bộ lọc'
                          : 'Chưa có sản phẩm nào trong hệ thống'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((item, index) => (
                    <tr key={item.MaSanPham} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 text-center font-medium text-slate-400 text-xs">
                        {index + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <ProductThumb src={item.Anh} alt={item.TenSanPham} />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">
                              {item.TenSanPham}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="font-mono font-semibold text-slate-500">
                                #{item.MaSanPham}
                              </span>
                              {item.TenNhaSanXuat && (
                                <>
                                  <span>•</span>
                                  <span>{item.TenNhaSanXuat}</span>
                                </>
                              )}
                              {item.TenLoaiSanPham && (
                                <>
                                  <span>•</span>
                                  <span>{item.TenLoaiSanPham}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-700">
                        {formatVND(item.Gia)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[44px] px-2.5 py-1 rounded-lg font-bold text-sm ${
                            item.TonKho <= 0
                              ? 'bg-rose-50 text-rose-700'
                              : item.TonKho < 5
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {item.TonKho.toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {getStatusBadge(item.TrangThaiTonKho, item.TonKho)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tab 2: Lịch sử nhập / xuất kho (Chỉ xem) */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-700 min-w-[820px]">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 w-44">Thời gian</th>
                  <th className="px-5 py-3.5">Sản phẩm</th>
                  <th className="px-5 py-3.5 w-44 text-center">Loại biến động</th>
                  <th className="px-5 py-3.5 w-28 text-center">Thay đổi</th>
                  <th className="px-5 py-3.5 w-28 text-center">Tồn sau đổi</th>
                  <th className="px-5 py-3.5">Ghi chú &amp; Tham chiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4"><div className="h-4 bg-slate-200 rounded w-32" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-200 rounded w-44" /></td>
                      <td className="px-5 py-4 text-center"><div className="h-6 bg-slate-200 rounded-full w-28 mx-auto" /></td>
                      <td className="px-5 py-4 text-center"><div className="h-4 bg-slate-200 rounded w-10 mx-auto" /></td>
                      <td className="px-5 py-4 text-center"><div className="h-4 bg-slate-200 rounded w-10 mx-auto" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-200 rounded w-56" /></td>
                    </tr>
                  ))
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium text-slate-500">
                        Chưa có dữ liệu lịch sử nhập/xuất phù hợp
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((log) => {
                    const delta = Number(log.SoLuongThayDoi) || 0;
                    const isPositive = delta > 0;
                    return (
                      <tr key={log.MaLichSuTon} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                          {formatDateTime(log.NgayThucHien)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <ProductThumb src={log.Anh} alt={log.TenSanPham} />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate max-w-[240px]">
                                {log.TenSanPham}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          {getMovementBadge(log.LoaiBienDong)}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700'
                                : delta < 0
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isPositive ? `+${delta}` : delta}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-800 whitespace-nowrap">
                          {Number(log.TonThucTeSauDoi).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600">
                          <p className="leading-relaxed">
                            {log.GhiChu || 'Biến động tồn kho hệ thống'}
                          </p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryListPage;
