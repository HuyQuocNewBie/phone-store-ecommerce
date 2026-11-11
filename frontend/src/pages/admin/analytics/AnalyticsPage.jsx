import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  ShoppingCart,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  Smartphone,
  Package,
  ArrowRight,
  Search,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { formatOrderCode } from '../../../utils/formatters';
import {
  ORDER_STATUS,
  normalizeOrderStatus,
  getOrderStatusDisplayLabel,
} from '../../../utils/orderSync';

// ── Formatters & Helpers ──────────────────────────────────────────────────────
const formatVND = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatShortVND = (value) => {
  if (!value && value !== 0) return '0';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
};

const formatDateToYYYYMMDD = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const clean = String(dateStr).slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }
  return dateStr;
};

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
      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
        <Smartphone className="w-4 h-4 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={formatImageUrl(src)}
      alt={alt}
      onError={() => setFailed(true)}
      className="w-11 h-11 rounded-xl object-contain bg-slate-50 border border-slate-200 p-1 shrink-0 group-hover:border-blue-300 transition-colors"
    />
  );
};

const GROUP_MODES = [
  { id: 'day', label: 'Ngày' },
  { id: 'month', label: 'Tháng' },
  { id: 'year', label: 'Năm' },
];

const getDefaultRangeForMode = (mode) => {
  const now = new Date();
  const endStr = formatDateToYYYYMMDD(now);

  if (mode === 'year') {
    return {
      from: formatDateToYYYYMMDD(new Date(now.getFullYear() - 4, 0, 1)),
      to: endStr,
    };
  }
  if (mode === 'month') {
    return {
      from: formatDateToYYYYMMDD(new Date(now.getFullYear(), 0, 1)),
      to: endStr,
    };
  }
  // mode === 'day': Từ đầu tháng (tối thiểu 14 ngày nếu đang ở những ngày đầu tháng)
  if (now.getDate() < 7) {
    const start = new Date(now);
    start.setDate(now.getDate() - 13);
    return { from: formatDateToYYYYMMDD(start), to: endStr };
  }
  return {
    from: formatDateToYYYYMMDD(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: endStr,
  };
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomRevenueTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[175px]">
      <p className="text-slate-500 font-semibold border-b border-slate-100 pb-1">
        {item?.fullLabel || `Ngày ${formatDateDisplay(item?.ngay)}`}
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          Doanh thu
        </span>
        <span className="text-slate-900 font-bold">{formatVND(item?.doanhThu || 0)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Đơn thành công
        </span>
        <span className="text-emerald-700 font-semibold">
          {(item?.soDon || 0).toLocaleString('vi-VN')} đơn
        </span>
      </div>
    </div>
  );
};

// ── Main Analytics Page ───────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const navigate = useNavigate();
  const initialRange = useMemo(() => getDefaultRangeForMode('day'), []);

  const [groupBy, setGroupBy] = useState('day'); // 'day' | 'month' | 'year'
  const [chartStyle, setChartStyle] = useState('bar'); // 'bar' | 'area'
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);

  const [analyticsData, setAnalyticsData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  const requestCounterRef = useRef(0);

  // ── Fetch Analytics API ──
  const fetchRevenueData = useCallback(async (start, end, mode) => {
    setErrorBanner(null);

    const parsedStart = parseLocalDate(start);
    const parsedEnd = parseLocalDate(end);

    if (!parsedStart || !parsedEnd) {
      setErrorBanner('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc hợp lệ');
      setInitialLoading(false);
      return;
    }

    if (parsedStart > parsedEnd) {
      setErrorBanner('Ngày bắt đầu ("Từ ngày") không được lớn hơn Ngày kết thúc ("Đến ngày")');
      setInitialLoading(false);
      return;
    }

    const currentRequestId = ++requestCounterRef.current;
    setFetching(true);

    try {
      const res = await api.get('/admin/analytics/revenue', {
        params: { fromDate: start, toDate: end, groupBy: mode },
      });
      if (currentRequestId !== requestCounterRef.current) return;
      setAnalyticsData(res.data?.data || null);
    } catch (err) {
      if (currentRequestId !== requestCounterRef.current) return;
      setErrorBanner(err.response?.data?.message || 'Không thể lấy dữ liệu thống kê doanh thu');
    } finally {
      if (currentRequestId === requestCounterRef.current) {
        setInitialLoading(false);
        setFetching(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchRevenueData(initialRange.from, initialRange.to, 'day');
  }, [fetchRevenueData, initialRange.from, initialRange.to]);

  // ── Chuyển nhanh Ngày / Tháng / Năm ──
  const handleGroupModeChange = (nextMode) => {
    if (nextMode === groupBy) return;
    const range = getDefaultRangeForMode(nextMode);
    setGroupBy(nextMode);
    setFromDate(range.from);
    setToDate(range.to);
    fetchRevenueData(range.from, range.to, nextMode);
  };

  // ── Quick Presets ──
  const applyPreset = (presetKey) => {
    const now = new Date();
    const endStr = formatDateToYYYYMMDD(now);
    let nextFrom = fromDate;
    let nextTo = endStr;
    let nextMode = groupBy;

    if (presetKey === '7d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      nextFrom = formatDateToYYYYMMDD(start);
      nextMode = 'day';
    } else if (presetKey === '30d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      nextFrom = formatDateToYYYYMMDD(start);
      nextMode = 'day';
    } else if (presetKey === 'this_month') {
      nextFrom = formatDateToYYYYMMDD(new Date(now.getFullYear(), now.getMonth(), 1));
      nextMode = 'day';
    } else if (presetKey === 'this_year') {
      nextFrom = formatDateToYYYYMMDD(new Date(now.getFullYear(), 0, 1));
      nextMode = 'month';
    } else if (presetKey === '5y') {
      nextFrom = formatDateToYYYYMMDD(new Date(now.getFullYear() - 4, 0, 1));
      nextMode = 'year';
    }

    setGroupBy(nextMode);
    setFromDate(nextFrom);
    setToDate(nextTo);
    fetchRevenueData(nextFrom, nextTo, nextMode);
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchRevenueData(fromDate, toDate, groupBy);
  };

  // ── Export Excel ──
  const handleExportExcel = async () => {
    if (!analyticsData || (analyticsData.summary?.tongDoanhThu || 0) <= 0) return;

    setExportLoading(true);
    try {
      const response = await api.get('/admin/analytics/export-excel', {
        params: { fromDate, toDate },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bao-cao-doanh-thu-${fromDate}-den-${toDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Đã xuất file báo cáo Excel thành công');
    } catch (err) {
      toast.error('Xuất file Excel thất bại: ' + (err.response?.data?.message || err.message || 'Lỗi server'));
    } finally {
      setExportLoading(false);
    }
  };

  const summary = analyticsData?.summary || {};
  const chartList = analyticsData?.chart || [];
  const ordersList = analyticsData?.orders || [];
  const topProducts = analyticsData?.topProducts || [];

  const isExcelEnabled = Boolean(
    analyticsData && !initialLoading && !fetching && !errorBanner && (summary.tongDoanhThu || 0) > 0
  );

  // ── 4 KPI Stat Cards Config ──
  const statCards = useMemo(() => {
    const tongDoanhThu = Number(summary.tongDoanhThu) || 0;
    const donHangThanhCong = Number(summary.donHangThanhCong) || 0;
    const tongDonHang = Number(summary.tongDonHang) || 0;
    const sapHetHang = Number(summary.sanPhamSapHetHang) || 0;
    const hetHang = Number(summary.sanPhamHetHang) || 0;
    const donDoiTra = Number(summary.tongDonDoiTra) || 0;
    const donDoiTraHeThong = Number(summary.tongDonDoiTraHeThong) || 0;

    const successRate =
      tongDonHang > 0 ? ((donHangThanhCong / tongDonHang) * 100).toFixed(1) : '0.0';
    const avgOrder = donHangThanhCong > 0 ? Math.round(tongDoanhThu / donHangThanhCong) : 0;

    return [
      {
        id: 'doanh-thu-tong',
        label: 'Doanh thu tổng',
        value: formatVND(tongDoanhThu),
        subtext:
          donHangThanhCong > 0
            ? `TB ${formatVND(avgOrder)} / đơn hoàn thành`
            : 'Tính từ các đơn hoàn thành trong kỳ',
        icon: DollarSign,
        cardBg: 'from-blue-50/90 via-white to-white',
        border: 'border-blue-200/80 hover:border-blue-300',
        iconBg: 'bg-blue-100 text-blue-600',
        badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
        badgeText: groupBy === 'day' ? 'Theo ngày' : groupBy === 'month' ? 'Theo tháng' : 'Theo năm',
      },
      {
        id: 'don-hang-thanh-cong',
        label: 'Đơn hàng thành công',
        value: `${donHangThanhCong.toLocaleString('vi-VN')} đơn`,
        subtext: `Trên tổng ${tongDonHang.toLocaleString('vi-VN')} đơn phát sinh`,
        icon: CheckCircle2,
        cardBg: 'from-emerald-50/90 via-white to-white',
        border: 'border-emerald-200/80 hover:border-emerald-300',
        iconBg: 'bg-emerald-100 text-emerald-600',
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        badgeText: `${successRate}% tỷ lệ`,
        onClick: () => navigate('/admin/orders'),
      },
      {
        id: 'san-pham-sap-het-hang',
        label: 'Sản phẩm sắp hết hàng',
        value: `${sapHetHang.toLocaleString('vi-VN')} SP`,
        subtext:
          hetHang > 0
            ? `Thêm ${hetHang} SP đã hết hàng (0 máy)`
            : 'Ngưỡng cảnh báo tồn kho < 5 máy',
        icon: AlertTriangle,
        cardBg: 'from-amber-50/90 via-white to-white',
        border: 'border-amber-200/80 hover:border-amber-300',
        iconBg: 'bg-amber-100 text-amber-600',
        badgeClass:
          sapHetHang > 0 || hetHang > 0
            ? 'bg-amber-100 text-amber-800 border border-amber-300'
            : 'bg-slate-100 text-slate-600 border border-slate-200',
        badgeText: sapHetHang > 0 ? 'Cần nhập thêm' : 'Ổn định',
        onClick: () => navigate('/admin/inventory', { state: { stockFilter: 'low_stock' } }),
      },
      {
        id: 'tong-don-doi-tra',
        label: 'Tổng đơn đổi trả',
        value: `${donDoiTra.toLocaleString('vi-VN')} đơn`,
        subtext: `Toàn hệ thống: ${donDoiTraHeThong.toLocaleString('vi-VN')} đơn đổi trả`,
        icon: RotateCcw,
        cardBg: 'from-rose-50/90 via-white to-white',
        border: 'border-rose-200/80 hover:border-rose-300',
        iconBg: 'bg-rose-100 text-rose-600',
        badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
        badgeText: 'Trong kỳ lọc',
        onClick: () => navigate('/admin/returns'),
      },
    ];
  }, [summary, groupBy, navigate]);

  const maxChartRevenue = chartList.length
    ? Math.max(...chartList.map((d) => Number(d.doanhThu) || 0), 1)
    : 1;

  const peakPoint = useMemo(() => {
    if (!chartList.length) return null;
    return chartList.reduce(
      (best, curr) => ((Number(curr.doanhThu) || 0) > (Number(best?.doanhThu) || 0) ? curr : best),
      chartList[0]
    );
  }, [chartList]);

  const totalTop5Revenue = topProducts.reduce((sum, p) => sum + (Number(p.TongDoanhThu) || 0), 0);

  const rankStyle = (index) => {
    if (index === 0) return 'bg-amber-100 text-amber-700 ring-1 ring-amber-300';
    if (index === 1) return 'bg-slate-200 text-slate-700 ring-1 ring-slate-300';
    if (index === 2) return 'bg-orange-100 text-orange-700 ring-1 ring-orange-300';
    return 'bg-slate-100 text-slate-500';
  };

  // Filtered Orders for table
  const filteredOrders = useMemo(() => {
    const keyword = orderSearch.trim().toLowerCase();
    return ordersList.filter((order) => {
      const canonical = normalizeOrderStatus(order.TrangThaiDonHang);
      if (orderStatusFilter === 'COMPLETED' && canonical !== ORDER_STATUS.DA_GIAO) return false;
      if (
        orderStatusFilter === 'PROCESSING' &&
        ![
          ORDER_STATUS.CHO_XAC_NHAN,
          ORDER_STATUS.DA_XAC_NHAN,
          ORDER_STATUS.DANG_DONG_GOI,
          ORDER_STATUS.DANG_GIAO,
        ].includes(canonical)
      ) {
        return false;
      }
      if (
        orderStatusFilter === 'RETURN' &&
        ![ORDER_STATUS.YEU_CAU_DOI_TRA, ORDER_STATUS.DA_HOAN_TIEN].includes(canonical)
      ) {
        return false;
      }
      if (orderStatusFilter === 'CANCELLED' && canonical !== ORDER_STATUS.DA_HUY) return false;

      if (!keyword) return true;
      const code = formatOrderCode(order.MaDonHang, order.NgayMuaHang).toLowerCase();
      return (
        code.includes(keyword) ||
        String(order.MaDonHang).includes(keyword) ||
        (order.KhachHang || '').toLowerCase().includes(keyword)
      );
    });
  }, [ordersList, orderSearch, orderStatusFilter]);

  const chartTitle =
    groupBy === 'month'
      ? 'Biểu đồ Doanh thu theo Tháng'
      : groupBy === 'year'
      ? 'Biểu đồ Doanh thu theo Năm'
      : 'Biểu đồ Doanh thu theo Ngày';

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Thống kê &amp; Báo cáo Doanh thu
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Phân tích hiệu suất kinh doanh theo Ngày / Tháng / Năm, Top 5 sản phẩm bán chạy &amp; xuất Excel
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchRevenueData(fromDate, toDate, groupBy)}
            disabled={fetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold transition-all shadow-2xs disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            disabled={!isExcelEnabled || exportLoading}
            onClick={handleExportExcel}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all ${
              isExcelEnabled
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
            title={
              !isExcelEnabled
                ? 'Cần có doanh thu > 0 trong kỳ lọc để xuất báo cáo Excel'
                : 'Xuất báo cáo doanh thu (.xlsx)'
            }
          >
            {exportLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* ── Unified Filter Bar: Mode (Ngày/Tháng/Năm) + Presets + Custom Date Range ── */}
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
      >
        {/* Top Row: Segmented Mode Switcher + Quick Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chu kỳ gộp:
            </span>
            <div
              role="tablist"
              aria-label="Lọc thống kê theo Ngày, Tháng, Năm"
              className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80"
            >
              {GROUP_MODES.map((m) => {
                const active = groupBy === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleGroupModeChange(m.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      active
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Range Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 mr-1">Nhanh:</span>
            {[
              { key: '7d', label: '7 ngày qua' },
              { key: '30d', label: '30 ngày qua' },
              { key: 'this_month', label: 'Tháng này' },
              { key: 'this_year', label: 'Năm nay' },
              { key: '5y', label: '5 năm qua' },
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyPreset(preset.key)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200/80 hover:border-blue-200 text-xs font-medium transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Row: From / To Date Pickers & Apply */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
          <div className="sm:col-span-5">
            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Từ ngày
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {formatDateDisplay(fromDate)}
              </span>
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full h-[42px] bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-700 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Đến ngày
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {formatDateDisplay(toDate)}
              </span>
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full h-[42px] bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-700 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={fetching}
              className="w-full h-[42px] flex items-center justify-center gap-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
            >
              {fetching ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BarChart3 className="w-3.5 h-3.5" />
              )}
              <span>Áp dụng</span>
            </button>
          </div>
        </div>
      </form>

      {/* ── Error Banner ── */}
      {errorBanner && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-sm font-medium flex items-center gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* ── 4 KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {initialLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm animate-pulse"
              >
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-slate-200" />
                  <div className="w-20 h-5 rounded-full bg-slate-200" />
                </div>
                <div className="h-7 w-2/3 rounded-lg bg-slate-200" />
                <div className="h-3.5 w-3/4 rounded-lg bg-slate-200" />
              </div>
            ))
          : statCards.map((card) => {
              const Wrapper = card.onClick ? 'button' : 'div';
              return (
                <Wrapper
                  key={card.id}
                  type={card.onClick ? 'button' : undefined}
                  onClick={card.onClick}
                  className={`text-left relative overflow-hidden bg-gradient-to-br ${card.cardBg}
                              border ${card.border} rounded-2xl p-5 shadow-sm
                              transition-all duration-200 ${
                                card.onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer group' : ''
                              }`}
                >
                  <div className="flex items-start justify-between mb-3.5">
                    <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${card.badgeClass}`}
                    >
                      {card.badgeText}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight mt-1 truncate">
                    {card.value}
                  </p>

                  <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-slate-100">
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      {card.subtext}
                    </p>
                    {card.onClick && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    )}
                  </div>
                </Wrapper>
              );
            })}
      </div>

      {/* ── Revenue Chart Section ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                {chartTitle}
              </h3>
              {fetching && <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Từ {formatDateDisplay(fromDate)} đến {formatDateDisplay(toDate)} ({chartList.length}{' '}
              {groupBy === 'day' ? 'ngày' : groupBy === 'month' ? 'tháng' : 'năm'})
            </p>
          </div>

          {/* Chart Style Switcher (Cột / Đường) */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setChartStyle('bar')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  chartStyle === 'bar'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Cột
              </button>
              <button
                type="button"
                onClick={() => setChartStyle('area')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  chartStyle === 'area'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Đường
              </button>
            </div>
          </div>
        </div>

        {/* Chart Summary Strip */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <div className="text-slate-600">
            Doanh thu trong kỳ:{' '}
            <strong className="text-slate-900">{formatVND(summary.tongDoanhThu || 0)}</strong>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div className="text-slate-600">
            Đơn thành công:{' '}
            <strong className="text-emerald-600">
              {(summary.donHangThanhCong || 0).toLocaleString('vi-VN')} đơn
            </strong>
          </div>
          {peakPoint && (Number(peakPoint.doanhThu) || 0) > 0 && (
            <>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <div className="text-slate-600">
                Cao điểm:{' '}
                <strong className="text-blue-600">
                  {peakPoint.fullLabel || peakPoint.label} ({formatVND(peakPoint.doanhThu)})
                </strong>
              </div>
            </>
          )}
        </div>

        {initialLoading ? (
          <div className="h-72 rounded-xl bg-slate-100 animate-pulse" />
        ) : chartList.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-2">
            <BarChart3 className="w-10 h-10 opacity-30" />
            <p className="text-sm">Chưa có dữ liệu thống kê doanh thu trong khoảng đã chọn</p>
          </div>
        ) : (
          <div className="w-full h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartStyle === 'area' ? (
                <AreaChart data={chartList} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="anaAreaStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>
                    <linearGradient id="anaAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tickFormatter={(val) => formatShortVND(val)}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, Math.ceil(maxChartRevenue * 1.15)]}
                    width={54}
                  />
                  <Tooltip
                    content={<CustomRevenueTooltip />}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="doanhThu"
                    stroke="url(#anaAreaStroke)"
                    strokeWidth={2.5}
                    fill="url(#anaAreaFill)"
                    dot={{ fill: '#2563eb', r: 3.5, strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 2.5, stroke: '#dbeafe' }}
                    animationDuration={350}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartList} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="anaBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tickFormatter={(val) => formatShortVND(val)}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, Math.ceil(maxChartRevenue * 1.15)]}
                    width={54}
                  />
                  <Tooltip
                    content={<CustomRevenueTooltip />}
                    cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
                  />
                  <Bar
                    dataKey="doanhThu"
                    fill="url(#anaBarGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                    animationDuration={350}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Top 5 Sản phẩm bán chạy nhất trong kỳ ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-100 text-amber-600 text-xs">
                🏆
              </span>
              Top 5 Sản phẩm bán chạy nhất
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tính trên các đơn hoàn thành từ {formatDateDisplay(fromDate)} đến{' '}
              {formatDateDisplay(toDate)}
            </p>
          </div>
          {topProducts.length > 0 && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
              Tổng DT Top 5: <strong className="text-slate-800">{formatVND(totalTop5Revenue)}</strong>
            </span>
          )}
        </div>

        {initialLoading ? (
          <div className="p-5 space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0" />
                <div className="w-11 h-11 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 h-4 bg-slate-200 rounded" />
                <div className="w-24 h-4 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : topProducts.length === 0 ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-slate-400 gap-2 text-center">
            <Package className="w-9 h-9 opacity-35" />
            <p className="text-sm font-medium text-slate-500">
              Chưa có sản phẩm bán thành công trong khoảng thời gian này
            </p>
            <p className="text-xs text-slate-400">
              Thử mở rộng bộ lọc sang Năm nay hoặc 5 năm qua để xem thêm dữ liệu lịch sử
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-700 min-w-[680px]">
              <thead className="bg-slate-50/90 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 w-14 text-center">#</th>
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3 text-center w-28">Tồn kho</th>
                  <th className="px-4 py-3 w-48">Số lượng đã bán</th>
                  <th className="px-5 py-3 text-right w-48">Tổng doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {topProducts.map((product, index) => {
                  const maxSold = Math.max(Number(topProducts[0]?.SoLuongDaBan) || 1, 1);
                  const soldQty = Number(product.SoLuongDaBan) || 0;
                  const totalRev =
                    Number(product.TongDoanhThu) || soldQty * (Number(product.Gia) || 0);
                  const barPct = Math.round((soldQty / maxSold) * 100);
                  const revShare =
                    totalTop5Revenue > 0 ? ((totalRev / totalTop5Revenue) * 100).toFixed(1) : '0.0';

                  return (
                    <tr
                      key={product.MaSanPham}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${rankStyle(
                            index
                          )}`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <ProductThumb src={product.Anh} alt={product.TenSanPham} />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                              {product.TenSanPham}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              {product.TenNhaSanXuat && (
                                <span className="font-medium text-slate-500">
                                  {product.TenNhaSanXuat}
                                </span>
                              )}
                              {product.TenNhaSanXuat && <span>•</span>}
                              <span>Đơn giá: {formatVND(product.Gia)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            (product.TonKho || 0) <= 0
                              ? 'bg-rose-50 text-rose-600'
                              : (product.TonKho || 0) < 5
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {(product.TonKho ?? 0).toLocaleString('vi-VN')} máy
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold text-slate-800 text-sm">
                            {soldQty.toLocaleString('vi-VN')}
                          </span>
                          <span className="text-[11px] text-slate-400">máy đã bán</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${barPct}%`,
                              background:
                                index === 0
                                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                  : index === 1
                                  ? 'linear-gradient(90deg, #64748b, #94a3b8)'
                                  : index === 2
                                  ? 'linear-gradient(90deg, #ea580c, #f97316)'
                                  : 'linear-gradient(90deg, #2563eb, #60a5fa)',
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className="font-extrabold text-emerald-600 text-sm sm:text-base">
                          {formatVND(totalRev)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Chiếm {revShare}% Top 5
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Orders List Table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Danh sách đơn hàng phát sinh ({filteredOrders.length}
              {filteredOrders.length !== ordersList.length ? ` / ${ordersList.length}` : ''} đơn)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'COMPLETED', label: 'Thành công' },
                { id: 'PROCESSING', label: 'Đang xử lý / Giao' },
                { id: 'RETURN', label: 'Đổi trả' },
                { id: 'CANCELLED', label: 'Đã hủy' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setOrderStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    orderStatusFilter === st.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Tìm mã đơn, khách..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {orderSearch && (
                <button
                  type="button"
                  onClick={() => setOrderSearch('')}
                  aria-label="Xóa tìm kiếm đơn"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-slate-700 min-w-[660px]">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 w-36">Mã đơn</th>
                <th className="px-6 py-3.5 w-40">Ngày mua</th>
                <th className="px-6 py-3.5">Khách hàng</th>
                <th className="px-6 py-3.5 text-center w-44">Trạng thái</th>
                <th className="px-6 py-3.5 text-right w-44">Tổng tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {initialLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-36" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-6 bg-slate-200 rounded-full w-24 mx-auto" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    {ordersList.length === 0
                      ? 'Chưa có đơn hàng nào trong khoảng thời gian này'
                      : 'Không có đơn hàng nào khớp bộ lọc trạng thái / từ khóa'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const canonical = normalizeOrderStatus(order.TrangThaiDonHang);
                  return (
                    <tr key={order.MaDonHang} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-blue-600 font-mono tracking-wider text-xs sm:text-sm">
                        {order.CodeDonHang || formatOrderCode(order.MaDonHang, order.NgayMuaHang)}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-500 font-medium">
                        {formatDateDisplay(order.NgayMuaHang)}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-800">
                        {order.KhachHang || 'Khách hàng'}
                      </td>
                      <td className="px-6 py-3.5 text-center text-xs font-semibold">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full border ${
                            canonical === ORDER_STATUS.DA_GIAO
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : canonical === ORDER_STATUS.DA_HUY
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : canonical === ORDER_STATUS.YEU_CAU_DOI_TRA ||
                                canonical === ORDER_STATUS.DA_HOAN_TIEN
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {getOrderStatusDisplayLabel(order.TrangThaiDonHang)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                        {formatVND(order.TongTien)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
