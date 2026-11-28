import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
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
  HardDrive,
  Palette,
  Barcode,
  AlertTriangle,
  Package,
  PackagePlus,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';
import api from '../../services/api';
import Pagination from '../../components/common/Pagination';
import { formatVND, formatDateTime } from '../../utils/formatters';

const STOCK_FILTERS = [
  { id: 'all', label: 'Tất cả biến thể' },
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

const getColorDotClass = (colorName) => {
  if (!colorName) return 'bg-slate-400';
  const c = String(colorName).toLowerCase();
  if (c.includes('đen') || c.includes('black') || c.includes('midnight') || c.includes('obsidian')) {
    return 'bg-slate-900';
  }
  if (c.includes('trắng') || c.includes('white') || c.includes('starlight') || c.includes('bạc') || c.includes('silver')) {
    return 'bg-slate-100 ring-1 ring-slate-300';
  }
  if (c.includes('titan tự nhiên') || c.includes('natural') || c.includes('xám') || c.includes('gray') || c.includes('grey')) {
    return 'bg-stone-400';
  }
  if (c.includes('xanh dương') || c.includes('xanh biển') || c.includes('blue') || c.includes('navy')) {
    return 'bg-blue-600';
  }
  if (c.includes('xanh lá') || c.includes('green') || c.includes('mint') || c.includes('emerald')) {
    return 'bg-emerald-500';
  }
  if (c.includes('tím') || c.includes('purple') || c.includes('violet')) {
    return 'bg-purple-500';
  }
  if (c.includes('hồng') || c.includes('pink') || c.includes('rose')) {
    return 'bg-pink-400';
  }
  if (c.includes('đỏ') || c.includes('red')) {
    return 'bg-rose-600';
  }
  if (c.includes('vàng') || c.includes('gold') || c.includes('yellow') || c.includes('sa mạc') || c.includes('desert')) {
    return 'bg-amber-400';
  }
  if (c.includes('cam') || c.includes('orange')) {
    return 'bg-orange-500';
  }
  return 'bg-purple-500';
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

const getApprovalBadge = (status) => {
  if (status === 'DaDuyet') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Đã phê duyệt
      </span>
    );
  }
  if (status === 'TuChoi') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        Đã từ chối
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
      Chờ duyệt
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

/**
 * AdminInventoryPage
 * Trang Theo dõi Tồn kho theo Biến thể SKU, Đối chiếu Giá nhập/Giá bán & Lịch sử Xuất Nhập dành cho Admin.
 */
const AdminInventoryPage = () => {
  const location = useLocation();
  const initialStockFilter = location.state?.stockFilter || 'all';

  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'imports' | 'adjustments' | 'history'
  const [stockList, setStockList] = useState([]);
  const [importsList, setImportsList] = useState([]);
  const [adjustmentsList, setAdjustmentsList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [processingMap, setProcessingMap] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState(initialStockFilter);
  const [historyType, setHistoryType] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    if (location.state?.stockFilter) {
      setActiveTab('stock');
      setStockFilter(location.state.stockFilter);
    }
  }, [location.state?.stockFilter]);

  // Lấy danh sách tồn kho theo Biến thể SKU, phiếu nhập kho, phiếu lệch kho & lịch sử biến động
  const fetchInventoryOverview = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const fetchVariantsPromise = api
        .get('/warehouse/inventory/stock-list')
        .catch(() => api.get('/admin/inventory/stock-list'));

      const fetchHistoryPromise = api
        .get('/admin/inventory/history', { params: { limit: 250 } })
        .catch(() => ({ data: { data: [] } }));

      const fetchImportsPromise = api
        .get('/admin/inventory/imports')
        .catch(() => api.get('/warehouse/inventory/import-receipts'))
        .catch(() => ({ data: { data: [] } }));

      const fetchAdjustmentsPromise = api
        .get('/warehouse/inventory/adjust-requests')
        .catch(() => ({ data: { data: [] } }));

      const [stockRes, historyRes, importsRes, adjRes] = await Promise.all([
        fetchVariantsPromise,
        fetchHistoryPromise,
        fetchImportsPromise,
        fetchAdjustmentsPromise,
      ]);

      const rawStock = Array.isArray(stockRes.data?.data) ? stockRes.data.data : [];
      const normalizedStock = rawStock.map((item, idx) => {
        const maBienThe = Number(item.MaBienThe || item.MaSanPham || idx + 1);
        const maSanPham = Number(item.MaSanPham || maBienThe);
        const giaBan = Number(item.GiaBan ?? item.Gia) || 0;
        const giaNhapGanNhat = Number(item.GiaNhapGanNhat) || 0;
        const tonKho = Number(item.TonKho) || 0;

        return {
          ...item,
          MaBienThe: maBienThe,
          MaSanPham: maSanPham,
          MaSKU:
            item.MaSKU ||
            `SP${String(maSanPham).padStart(4, '0')}-${String(maBienThe).padStart(2, '0')}`,
          MauSac:
            item.MauSac && String(item.MauSac).trim()
              ? String(item.MauSac).trim()
              : 'Mặc định',
          DungLuong:
            item.DungLuong && String(item.DungLuong).trim()
              ? String(item.DungLuong).trim()
              : 'Tiêu chuẩn',
          GiaBan: giaBan,
          Gia: giaBan,
          GiaNhapGanNhat: giaNhapGanNhat,
          TonKho: tonKho,
        };
      });

      setStockList(normalizedStock);
      setHistoryList(Array.isArray(historyRes.data?.data) ? historyRes.data.data : []);
      setImportsList(Array.isArray(importsRes.data?.data) ? importsRes.data.data : []);
      setAdjustmentsList(Array.isArray(adjRes.data?.data) ? adjRes.data.data : []);
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

  // Phê duyệt / Từ chối nhanh Phiếu nhập kho ngay trên trang Theo dõi Tồn kho Admin
  const handleQuickImportDecision = async (receipt, hanhDong) => {
    const importId = receipt.MaPhieuNhap;
    const key = `import_${importId}`;
    if (processingMap[key]) return;

    setProcessingMap((prev) => ({ ...prev, [key]: hanhDong }));
    try {
      const res = await api.put(`/admin/inventory/imports/${importId}/approve`, { hanhDong });
      toast.success(
        res.data?.message ||
          (hanhDong === 'Approve'
            ? `Đã phê duyệt phiếu nhập #PN${String(importId).padStart(4, '0')}`
            : `Đã từ chối phiếu nhập #PN${String(importId).padStart(4, '0')}`)
      );
      fetchInventoryOverview({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xử lý phiếu nhập kho');
    } finally {
      setProcessingMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Summary metrics
  const summary = useMemo(() => {
    const totalVariants = stockList.length;
    const totalUnits = stockList.reduce((sum, item) => sum + (Number(item.TonKho) || 0), 0);
    const lowStockCount = stockList.filter((item) => {
      const qty = Number(item.TonKho) || 0;
      return qty > 0 && qty < 5;
    }).length;
    const outOfStockCount = stockList.filter((item) => (Number(item.TonKho) || 0) <= 0).length;
    const pendingImports = importsList.filter((r) => r.TrangThai === 'ChoDuyet').length;
    const pendingAdjustments = adjustmentsList.filter((r) => r.TrangThai === 'ChoDuyet').length;
    const importCount = historyList.filter((h) => h.LoaiBienDong === 'NhapKho').length;
    const exportCount = historyList.filter((h) => h.LoaiBienDong === 'XuatBan').length;

    return {
      totalVariants,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      attentionCount: lowStockCount + outOfStockCount,
      pendingImports,
      pendingAdjustments,
      totalHistory: historyList.length,
      importCount,
      exportCount,
    };
  }, [stockList, importsList, adjustmentsList, historyList]);

  // Filtered Stock List (by SKU Variant)
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
        String(item.MauSac || '').toLowerCase().includes(keyword) ||
        String(item.DungLuong || '').toLowerCase().includes(keyword) ||
        String(item.MaSKU || '').toLowerCase().includes(keyword) ||
        String(item.MaBienThe || '').includes(keyword) ||
        String(item.MaSanPham).includes(keyword) ||
        `#${item.MaSanPham}`.includes(keyword) ||
        (item.TenNhaSanXuat || '').toLowerCase().includes(keyword) ||
        (item.TenLoaiSanPham || '').toLowerCase().includes(keyword)
      );
    });
  }, [stockList, searchTerm, stockFilter]);

  // Filtered Imports List
  const filteredImports = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return importsList;
    return importsList.filter((item) => {
      const codeStr = `#pn${String(item.MaPhieuNhap || '').padStart(4, '0')}`.toLowerCase();
      const manu = String(item.TenNhaSanXuat || '').toLowerCase();
      const matchDetail = (item.ChiTiet || []).some(
        (ct) =>
          String(ct.TenSanPham || '').toLowerCase().includes(keyword) ||
          String(ct.MauSac || '').toLowerCase().includes(keyword) ||
          String(ct.DungLuong || '').toLowerCase().includes(keyword) ||
          String(ct.MaSKU || '').toLowerCase().includes(keyword)
      );
      return codeStr.includes(keyword) || manu.includes(keyword) || matchDetail;
    });
  }, [importsList, searchTerm]);

  // Filtered Adjustments List
  const filteredAdjustments = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return adjustmentsList;
    return adjustmentsList.filter((item) => {
      const codeStr = `#adj${String(item.MaPhieuAdjust || '').padStart(4, '0')}`.toLowerCase();
      return (
        codeStr.includes(keyword) ||
        String(item.TenSanPham || '').toLowerCase().includes(keyword) ||
        String(item.MauSac || '').toLowerCase().includes(keyword) ||
        String(item.DungLuong || '').toLowerCase().includes(keyword) ||
        String(item.MaSKU || '').toLowerCase().includes(keyword) ||
        String(item.LyDoGiaiTrinh || '').toLowerCase().includes(keyword)
      );
    });
  }, [adjustmentsList, searchTerm]);

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

  // Reset về trang 1 khi đổi tab, bộ lọc hoặc từ khóa tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, stockFilter, historyType]);

  const totalStockPages = Math.ceil(filteredStock.length / ITEMS_PER_PAGE) || 1;
  const paginatedStock = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStock.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredStock, currentPage]);

  const totalImportPages = Math.ceil(filteredImports.length / ITEMS_PER_PAGE) || 1;
  const paginatedImports = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredImports.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredImports, currentPage]);

  const totalAdjustPages = Math.ceil(filteredAdjustments.length / ITEMS_PER_PAGE) || 1;
  const paginatedAdjustments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAdjustments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAdjustments, currentPage]);

  const totalHistoryPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE) || 1;
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredHistory, currentPage]);

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Read-only & Approval Oversight Banner ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            Theo dõi Tồn kho theo Biến thể SKU &amp; Đối chiếu Phiếu Kho
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý tồn kho chi tiết trên từng <strong>Màu sắc</strong>, <strong>Dung lượng</strong>{' '}
            và đối chiếu <strong>Giá nhập lô mới</strong> với <strong>Giá bán hiện tại</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/admin/inventory/adjustments"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-semibold transition-all shadow-2xs"
          >
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
            <span>Cổng Phê duyệt Nhập &amp; Lệch kho</span>
            {(summary.pendingImports + summary.pendingAdjustments) > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white">
                {summary.pendingImports + summary.pendingAdjustments}
              </span>
            )}
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

      {/* ── 4 Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              Tổng Biến thể SKU
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {summary.totalVariants}
              </span>
              <span className="text-xs text-slate-500 font-medium">biến thể</span>
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
              Biến thể sắp hết / Hết
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-600">
                {summary.attentionCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">biến thể</span>
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
          onClick={() => setActiveTab('imports')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'imports' || activeTab === 'adjustments'
              ? 'border-emerald-400 ring-2 ring-emerald-500/15 shadow-md'
              : 'border-slate-200 hover:border-emerald-200 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Phiếu Nhập &amp; Lệch kho
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-emerald-600">
                {summary.pendingImports + summary.pendingAdjustments}
              </span>
              <span className="text-xs text-slate-500 font-medium">chờ duyệt</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Phiếu nhập: <strong className="text-blue-600">{importsList.length}</strong> · Phiếu lệch:{' '}
              <strong className="text-amber-600">{adjustmentsList.length}</strong>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <PackagePlus className="w-6 h-6" />
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
        <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-200">
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
            <span>Danh sách tồn kho SKU</span>
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
            onClick={() => setActiveTab('imports')}
            className={`flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'imports'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <PackagePlus className="w-4 h-4" />
            <span>Phê duyệt Nhập kho</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'imports'
                  ? 'bg-emerald-600 text-white'
                  : summary.pendingImports > 0
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {importsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('adjustments')}
            className={`flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'adjustments'
                ? 'border-amber-600 text-amber-700 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Phê duyệt Lệch kho</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'adjustments'
                  ? 'bg-amber-600 text-white'
                  : summary.pendingAdjustments > 0
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {adjustmentsList.length}
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
          ) : activeTab === 'history' ? (
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
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Đối chiếu <strong>Màu sắc</strong>, <strong>Dung lượng</strong> và so sánh{' '}
                <strong>Giá nhập lô mới</strong> với <strong>Giá bán hiện tại</strong> của biến thể.
              </span>
            </div>
          )}

          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={
                activeTab === 'stock'
                  ? 'Tìm tên SP, màu sắc, dung lượng, mã SKU...'
                  : 'Tìm sản phẩm, màu sắc, dung lượng, mã phiếu...'
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
          /* ── Tab 1: Danh sách tồn kho theo từng Biến thể SKU ── */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-700 min-w-[820px]">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 w-14 text-center">STT</th>
                  <th className="px-5 py-3.5">Biến thể SKU (Tên SP, Màu sắc, Dung lượng)</th>
                  <th className="px-5 py-3.5 text-right w-44">Giá nhập gần nhất</th>
                  <th className="px-5 py-3.5 text-right w-44">Giá bán hiện tại</th>
                  <th className="px-5 py-3.5 text-center w-32">Tồn biến thể</th>
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
                      <td className="px-5 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-24 ml-auto" /></td>
                      <td className="px-5 py-4 text-center"><div className="h-4 bg-slate-200 rounded w-12 mx-auto" /></td>
                      <td className="px-5 py-4 text-center"><div className="h-6 bg-slate-200 rounded-full w-24 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <Boxes className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium text-slate-500">
                        {searchTerm || stockFilter !== 'all'
                          ? 'Không tìm thấy biến thể SKU khớp bộ lọc'
                          : 'Chưa có biến thể SKU nào trong hệ thống'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedStock.map((item, index) => (
                    <tr key={item.MaBienThe || `${item.MaSanPham}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 text-center font-medium text-slate-400 text-xs">
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <ProductThumb src={item.Anh} alt={item.TenSanPham} />
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-slate-800 truncate">
                                {item.TenSanPham}
                              </p>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold text-slate-600">
                                <Barcode className="w-3 h-3 text-slate-400" />
                                {item.MaSKU}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${getColorDotClass(
                                    item.MauSac
                                  )}`}
                                />
                                <Palette className="w-3 h-3" />
                                <span>Màu: {item.MauSac}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                                <HardDrive className="w-3 h-3" />
                                <span>Dung lượng: {item.DungLuong}</span>
                              </span>
                              {item.TenNhaSanXuat && (
                                <span className="text-[11px] text-slate-400">
                                  • {item.TenNhaSanXuat}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">
                        {item.GiaNhapGanNhat > 0 ? (
                          formatVND(item.GiaNhapGanNhat)
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">Chưa có lô nhập</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-blue-700">
                        {formatVND(item.GiaBan)}
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
            {filteredStock.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalStockPages}
                totalItems={filteredStock.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
                className="border-t border-slate-200"
              />
            )}
          </div>
        ) : activeTab === 'imports' ? (
          /* ── Tab 2: Phê duyệt Nhập kho (So sánh Giá nhập lô mới với Giá bán hiện tại của biến thể) ── */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-700 min-w-[960px]">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 w-32">Mã phiếu</th>
                  <th className="px-4 py-3.5 w-44">Nhà sản xuất</th>
                  <th className="px-4 py-3.5">Biến thể SKU &amp; Đối chiếu Giá nhập lô mới vs Giá bán hiện tại</th>
                  <th className="px-4 py-3.5 w-36 text-right">Tổng tiền nhập</th>
                  <th className="px-4 py-3.5 w-32 text-center">Trạng thái</th>
                  <th className="px-5 py-3.5 w-48 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredImports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <PackagePlus className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium text-slate-500">
                        Chưa có phiếu nhập kho nào
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedImports.map((receipt) => {
                    const isPending = receipt.TrangThai === 'ChoDuyet';
                    const activeAction = processingMap[`import_${receipt.MaPhieuNhap}`];
                    const items = receipt.ChiTiet || [];

                    return (
                      <tr key={receipt.MaPhieuNhap} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4 align-top">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 font-mono text-xs font-bold text-indigo-700">
                            #PN{String(receipt.MaPhieuNhap).padStart(4, '0')}
                          </span>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {formatDateTime(receipt.NgayNhap)}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top font-semibold text-slate-800">
                          {receipt.TenNhaSanXuat || 'Nhà sản xuất đối tác'}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-2.5">
                            {items.map((ct, idx) => {
                              const newImportPrice = Number(ct.DonGiaNhap) || 0;
                              const currentSellPrice = Number(ct.GiaBan ?? ct.Gia) || 0;
                              const diffPrice = currentSellPrice - newImportPrice;

                              return (
                                <div
                                  key={ct.MaChiTietNhap || `${ct.MaBienThe || ct.MaSanPham}-${idx}`}
                                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-slate-900">
                                      {ct.TenSanPham}
                                    </span>
                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                      +{ct.SoLuongNhap} máy
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                                      <Palette className="w-3 h-3" />
                                      Màu: {ct.MauSac || 'Mặc định'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                                      <HardDrive className="w-3 h-3" />
                                      Dung lượng: {ct.DungLuong || 'Tiêu chuẩn'}
                                    </span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <span>
                                      Giá nhập lô mới:{' '}
                                      <strong className="text-emerald-700 font-extrabold">
                                        {formatVND(newImportPrice)}
                                      </strong>
                                    </span>
                                    <span>
                                      Giá bán hiện tại:{' '}
                                      <strong className="text-blue-700 font-extrabold">
                                        {formatVND(currentSellPrice)}
                                      </strong>
                                    </span>
                                    {currentSellPrice > 0 && (
                                      <span
                                        className={`font-semibold text-[11px] ${
                                          diffPrice > 0 ? 'text-emerald-600' : 'text-rose-600'
                                        }`}
                                      >
                                        {diffPrice > 0
                                          ? `Thấp hơn giá bán ${formatVND(diffPrice)}`
                                          : 'Cảnh báo: Giá nhập ≥ Giá bán'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-right font-bold text-emerald-600">
                          {formatVND(receipt.TongTienNhap)}
                        </td>
                        <td className="px-4 py-4 align-top text-center">
                          {getApprovalBadge(receipt.TrangThai)}
                        </td>
                        <td className="px-5 py-4 align-top text-center">
                          {isPending ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={Boolean(activeAction)}
                                onClick={() => handleQuickImportDecision(receipt, 'Approve')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                              >
                                {activeAction === 'Approve' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Phê duyệt</span>
                              </button>
                              <button
                                type="button"
                                disabled={Boolean(activeAction)}
                                onClick={() => handleQuickImportDecision(receipt, 'Reject')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Từ chối</span>
                              </button>
                            </div>
                          ) : (
                            <Link
                              to="/admin/inventory/adjustments"
                              className="text-xs font-semibold text-blue-600 hover:underline"
                            >
                              Xem chi tiết
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {filteredImports.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalImportPages}
                totalItems={filteredImports.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
                className="border-t border-slate-200"
              />
            )}
          </div>
        ) : activeTab === 'adjustments' ? (
          /* ── Tab 3: Phê duyệt Lệch kho (Hiển thị rõ Màu sắc & Dung lượng biến thể) ── */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-700 min-w-[880px]">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 w-28">Mã phiếu</th>
                  <th className="px-4 py-3.5">Biến thể SKU (Tên SP, Màu sắc, Dung lượng)</th>
                  <th className="px-4 py-3.5 w-40 text-center">Đối chiếu tồn</th>
                  <th className="px-4 py-3.5 w-28 text-center">Chênh lệch</th>
                  <th className="px-4 py-3.5">Lý do giải trình</th>
                  <th className="px-5 py-3.5 w-36 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium text-slate-500">
                        Chưa có phiếu báo lệch kho nào
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedAdjustments.map((item) => {
                    const diff = Number(item.SoLuongChechLech) || 0;
                    const actualStock = Number(item.SoLuongThucTe) || 0;
                    const sysStock = item.TonKhoHeThong ?? (actualStock - diff);

                    return (
                      <tr key={item.MaPhieuAdjust} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs font-bold text-slate-700">
                          #ADJ{String(item.MaPhieuAdjust).padStart(4, '0')}
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900">{item.TenSanPham}</p>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                                <Palette className="w-3 h-3" />
                                Màu: {item.MauSac || 'Mặc định'}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                                <HardDrive className="w-3 h-3" />
                                Dung lượng: {item.DungLuong || 'Tiêu chuẩn'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold">
                            <span>{sysStock}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <strong className="text-blue-700">{actualStock}</strong>
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-xs font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-md border ${
                              diff < 0
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">{item.LyDoGiaiTrinh}</td>
                        <td className="px-5 py-4 text-center">
                          {getApprovalBadge(item.TrangThai)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {filteredAdjustments.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalAdjustPages}
                totalItems={filteredAdjustments.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
                className="border-t border-slate-200"
              />
            )}
          </div>
        ) : (
          /* ── Tab 4: Lịch sử nhập / xuất kho (Chỉ xem) ── */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-700 min-w-[820px]">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 w-44">Thời gian</th>
                  <th className="px-5 py-3.5">Sản phẩm</th>
                  <th className="px-5 py-3.5 w-44 text-center">Loại biến động</th>
                  <th className="px-5 py-3.5 w-28 text-center">Thay đổi</th>
                  <th className="px-5 py-3.5 w-28 text-center">Tồn sau đổi</th>
                  <th className="px-5 py-3.5">Ghi chú &amp; Biến thể SKU</th>
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
                  paginatedHistory.map((log) => {
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
            {filteredHistory.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalHistoryPages}
                totalItems={filteredHistory.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
                className="border-t border-slate-200"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInventoryPage;
