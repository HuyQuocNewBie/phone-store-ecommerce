import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  DollarSign,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Package,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Smartphone,
  ArrowRight,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../../../services/api';
import { getOrderStatusDisplayLabel } from '../../../utils/orderSync';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatVND = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatShort = (value) => {
  if (!value && value !== 0) return '0';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
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
      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
        <Smartphone className="w-5 h-5 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={formatImageUrl(src)}
      alt={alt}
      onError={() => setFailed(true)}
      className="w-12 h-12 rounded-xl object-contain bg-slate-50 border border-slate-200 p-1 shrink-0 group-hover:border-blue-300 transition-colors"
    />
  );
};

// ─── Status Colors ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  'Đã hoàn thành': { color: '#059669' },
  DaGiao:          { color: '#059669' },
  'Đã giao':       { color: '#059669' },
  HoanTat:         { color: '#059669' },
  'Đang xử lý':    { color: '#0284c7' },
  DaXacNhan:       { color: '#0284c7' },
  'Đã xác nhận':   { color: '#0284c7' },
  DangDongGoi:     { color: '#4f46e5' },
  'Đang đóng gói': { color: '#4f46e5' },
  'Đang giao':     { color: '#d97706' },
  DangGiao:        { color: '#d97706' },
  'Đã hủy':        { color: '#dc2626' },
  DaHuy:           { color: '#dc2626' },
  'Chờ xác nhận':  { color: '#7c3aed' },
  ChoXacNhan:      { color: '#7c3aed' },
  YeuCauDoiTra:    { color: '#ea580c' },
  'Yêu cầu đổi trả': { color: '#ea580c' },
  DaHoanTien:      { color: '#0d9488' },
  'Đã hoàn tiền':  { color: '#0d9488' },
};
const FALLBACK_COLORS = ['#0284c7', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0d9488'];

const TIME_FRAMES = [
  { id: 'day', label: 'Ngày' },
  { id: 'month', label: 'Tháng' },
  { id: 'year', label: 'Năm' },
];

// ─── Skeleton & Error Components ──────────────────────────────────────────────
const SkeletonBox = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
);

const StatCardSkeleton = () => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
    <div className="flex items-start justify-between">
      <SkeletonBox className="w-11 h-11 rounded-xl" />
      <SkeletonBox className="w-20 h-5 rounded-full" />
    </div>
    <SkeletonBox className="h-7 w-2/3 rounded-lg" />
    <SkeletonBox className="h-3.5 w-3/4 rounded-lg" />
  </div>
);

const ErrorAlert = ({ message, onRetry }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
    <AlertCircle className="w-4 h-4 shrink-0" />
    <span className="flex-1">{message}</span>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors px-2.5 py-1 rounded-lg hover:bg-rose-100 cursor-pointer"
      >
        <RefreshCw className="w-3 h-3" /> Thử lại
      </button>
    )}
  </div>
);

// ─── Custom Tooltips ──────────────────────────────────────────────────────────
const CustomRevenueTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[170px]">
      <p className="text-slate-500 font-semibold border-b border-slate-100 pb-1">
        {item?.fullLabel || item?.label}
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

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const color = STATUS_MAP[d.name]?.color || FALLBACK_COLORS[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1" style={{ color }}>
        {getOrderStatusDisplayLabel(d.name)}
      </p>
      <p className="text-slate-700 font-bold">{d.value?.toLocaleString('vi-VN')} đơn</p>
    </div>
  );
};

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
const DashboardPage = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const [cards, setCards] = useState(null);
  const [timeFrame, setTimeFrame] = useState('month'); // 'day' | 'month' | 'year'
  const [chartStyle, setChartStyle] = useState('area'); // 'area' | 'bar'
  const [dayRange, setDayRange] = useState(14); // 7 | 14 | 30
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [revenueSeries, setRevenueSeries] = useState({
    day: [],
    month: [],
    year: [],
  });
  const [orderStatus, setOrderStatus] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [switchingRevenue, setSwitchingRevenue] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingTopProducts, setLoadingTopProducts] = useState(true);

  const [errorCards, setErrorCards] = useState(null);
  const [errorRevenue, setErrorRevenue] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [errorTopProducts, setErrorTopProducts] = useState(null);

  // ── API Calls ───────────────────────────────────────────────────────────────
  const fetchCards = useCallback(async () => {
    setLoadingCards(true);
    setErrorCards(null);
    try {
      const res = await api.get('/admin/dashboard/cards');
      setCards(res.data.data);
    } catch (err) {
      setErrorCards(err.response?.data?.message || 'Không thể tải thẻ thống kê');
    } finally {
      setLoadingCards(false);
    }
  }, []);

  // Preload cả 3 bộ dữ liệu Ngày / Tháng / Năm để chuyển filter mượt mà tức thì
  const fetchAllRevenueCharts = useCallback(
    async ({ days = dayRange, year = selectedYear, silent = false } = {}) => {
      if (silent) {
        setSwitchingRevenue(true);
      } else {
        setLoadingRevenue(true);
      }
      setErrorRevenue(null);
      try {
        const [resDay, resMonth, resYear] = await Promise.all([
          api.get('/admin/dashboard/charts/revenue', { params: { period: 'day', days } }),
          api.get('/admin/dashboard/charts/revenue', { params: { period: 'month', year } }),
          api.get('/admin/dashboard/charts/revenue', { params: { period: 'year' } }),
        ]);

        setRevenueSeries({
          day: resDay.data?.data || [],
          month: resMonth.data?.data || [],
          year: resYear.data?.data || [],
        });
      } catch (err) {
        setErrorRevenue(err.response?.data?.message || 'Không thể tải biểu đồ doanh thu');
      } finally {
        setLoadingRevenue(false);
        setSwitchingRevenue(false);
      }
    },
    [dayRange, selectedYear]
  );

  const fetchOrderStatus = useCallback(async () => {
    setLoadingStatus(true);
    setErrorStatus(null);
    try {
      const res = await api.get('/admin/dashboard/charts/order-status');
      setOrderStatus(res.data.data || []);
    } catch (err) {
      setErrorStatus(err.response?.data?.message || 'Không thể tải biểu đồ trạng thái');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const fetchTopProducts = useCallback(async () => {
    setLoadingTopProducts(true);
    setErrorTopProducts(null);
    try {
      const res = await api.get('/admin/dashboard/top-products');
      setTopProducts(res.data.data || []);
    } catch (err) {
      setErrorTopProducts(err.response?.data?.message || 'Không thể tải sản phẩm bán chạy');
    } finally {
      setLoadingTopProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
    fetchAllRevenueCharts();
    fetchOrderStatus();
    fetchTopProducts();
  }, [fetchCards, fetchAllRevenueCharts, fetchOrderStatus, fetchTopProducts]);

  // Sub-filter handlers (lọc nhanh số ngày / chọn năm không gây giật UI)
  const handleDayRangeChange = (nextDays) => {
    setDayRange(nextDays);
    setSwitchingRevenue(true);
    api
      .get('/admin/dashboard/charts/revenue', { params: { period: 'day', days: nextDays } })
      .then((res) => {
        setRevenueSeries((prev) => ({ ...prev, day: res.data?.data || [] }));
      })
      .catch(() => {})
      .finally(() => setSwitchingRevenue(false));
  };

  const handleYearChange = (nextYear) => {
    setSelectedYear(nextYear);
    setSwitchingRevenue(true);
    api
      .get('/admin/dashboard/charts/revenue', { params: { period: 'month', year: nextYear } })
      .then((res) => {
        setRevenueSeries((prev) => ({ ...prev, month: res.data?.data || [] }));
      })
      .catch(() => {})
      .finally(() => setSwitchingRevenue(false));
  };

  // ── 4 Stat Cards Config ─────────────────────────────────────────────────────
  const statCards = useMemo(() => {
    if (!cards) return [];
    const totalOrdersCount = Number(cards.tongDonHang) || 0;
    const successOrdersCount = Number(cards.donHangThanhCong) || 0;
    const successRate =
      totalOrdersCount > 0 ? ((successOrdersCount / totalOrdersCount) * 100).toFixed(1) : '0.0';

    const lowStock = Number(cards.sanPhamSapHetHang) || 0;
    const outOfStock = Number(cards.sanPhamHetHang) || 0;
    const returnCount = Number(cards.tongDonDoiTra) || 0;
    const pendingRefundCount = Number(cards.choHoanTien) || 0;
    const refundedCount = Number(cards.daHoanTienCount) || 0;

    return [
      {
        id: 'doanh-thu-tong',
        label: 'Doanh thu tổng',
        value: formatVND(cards.doanhThuTong ?? cards.doanhThuNam ?? 0),
        subtext: `Tháng này: ${formatVND(cards.doanhThuThang || 0)}`,
        icon: DollarSign,
        cardBg: 'from-blue-50/90 via-white to-white',
        border: 'border-blue-200/80 hover:border-blue-300',
        iconBg: 'bg-blue-100 text-blue-600',
        badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
        badgeText: 'Tích lũy',
        onClick: () => navigate('/admin/analytics'),
      },
      {
        id: 'don-hang-thanh-cong',
        label: 'Đơn hàng thành công',
        value: `${successOrdersCount.toLocaleString('vi-VN')} đơn`,
        subtext: `Trên tổng ${totalOrdersCount.toLocaleString('vi-VN')} đơn hàng`,
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
        value: `${lowStock.toLocaleString('vi-VN')} SP`,
        subtext:
          outOfStock > 0
            ? `Cảnh báo thêm: ${outOfStock} SP đã hết hàng (0 máy)`
            : `Ngưỡng cảnh báo tồn kho < 5 máy`,
        icon: AlertTriangle,
        cardBg: 'from-amber-50/90 via-white to-white',
        border: 'border-amber-200/80 hover:border-amber-300',
        iconBg: 'bg-amber-100 text-amber-600',
        badgeClass:
          lowStock > 0 || outOfStock > 0
            ? 'bg-amber-100 text-amber-800 border border-amber-300'
            : 'bg-slate-100 text-slate-600 border border-slate-200',
        badgeText: lowStock > 0 ? 'Cần nhập thêm' : 'Ổn định',
        onClick: () => navigate('/admin/inventory', { state: { stockFilter: 'low_stock' } }),
      },
      {
        id: 'tong-don-doi-tra',
        label: 'Tổng đơn đổi trả',
        value: `${returnCount.toLocaleString('vi-VN')} đơn`,
        subtext: `Đã hoàn tiền: ${refundedCount} · Chờ hoàn: ${pendingRefundCount}`,
        icon: RotateCcw,
        cardBg: 'from-rose-50/90 via-white to-white',
        border: 'border-rose-200/80 hover:border-rose-300',
        iconBg: 'bg-rose-100 text-rose-600',
        badgeClass:
          pendingRefundCount > 0
            ? 'bg-rose-100 text-rose-700 border border-rose-300'
            : 'bg-rose-50 text-rose-600 border border-rose-200',
        badgeText: pendingRefundCount > 0 ? `${pendingRefundCount} chờ duyệt` : 'Đổi trả',
        onClick: () => navigate('/admin/returns'),
      },
    ];
  }, [cards, navigate]);

  // ── Revenue Chart Active Series & Totals ────────────────────────────────────
  const activeRevenueChart = revenueSeries[timeFrame] || [];
  const maxRevenue = activeRevenueChart.length
    ? Math.max(...activeRevenueChart.map((d) => Number(d.doanhThu) || 0), 1)
    : 1;
  const periodRevenueSum = activeRevenueChart.reduce((s, d) => s + (Number(d.doanhThu) || 0), 0);
  const periodOrderSum = activeRevenueChart.reduce((s, d) => s + (Number(d.soDon) || 0), 0);

  const chartSubtitle = useMemo(() => {
    if (timeFrame === 'day') return `Doanh thu theo ngày (${dayRange} ngày gần nhất)`;
    if (timeFrame === 'year') return 'So sánh doanh thu tăng trưởng theo các năm';
    return `Doanh thu 12 tháng trong năm ${selectedYear}`;
  }, [timeFrame, dayRange, selectedYear]);

  // ── PieChart totals ─────────────────────────────────────────────────────────
  const totalOrdersPie = orderStatus.reduce((sum, d) => sum + (Number(d.soLuong) || 0), 0);

  // ── Top 5 Revenue Totals & Rank Styles ──────────────────────────────────────
  const totalTop5Revenue = topProducts.reduce(
    (sum, p) => sum + (Number(p.TongDoanhThu) || 0),
    0
  );

  const rankStyle = (index) => {
    if (index === 0) return 'bg-amber-100 text-amber-700 ring-1 ring-amber-300';
    if (index === 1) return 'bg-slate-200 text-slate-700 ring-1 ring-slate-300';
    if (index === 2) return 'bg-orange-100 text-orange-700 ring-1 ring-orange-300';
    return 'bg-slate-100 text-slate-500';
  };

  const handleRefreshAll = () => {
    fetchCards();
    fetchAllRevenueCharts({ silent: true });
    fetchOrderStatus();
    fetchTopProducts();
  };

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Top Title & Quick Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Tổng quan Hoạt động Kinh doanh
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Theo dõi doanh thu, đơn hàng thành công, cảnh báo tồn kho và đổi trả toàn hệ thống
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => navigate('/admin/analytics')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Báo cáo chi tiết</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loadingCards || loadingRevenue || switchingRevenue ? 'animate-spin text-blue-600' : ''
              }`}
            />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── Error (Cards) ── */}
      {errorCards && <ErrorAlert message={errorCards} onRetry={fetchCards} />}

      {/* ── 4 Stat Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingCards
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={card.onClick}
                className={`text-left relative overflow-hidden bg-gradient-to-br ${card.cardBg}
                            border ${card.border} rounded-2xl p-5 shadow-sm
                            transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
                            group cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-3.5">
                  <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${card.badgeClass}`}
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
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </button>
            ))}
      </div>

      {/* ── Charts Row (8 cols Revenue + 4 cols Order Status) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Revenue Chart with smooth Day / Month / Year filter */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Biểu đồ Doanh thu
                </h3>
                {switchingRevenue && (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{chartSubtitle}</p>
            </div>

            {/* Smooth Segmented Controls: Ngày / Tháng / Năm */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="tablist"
                aria-label="Lọc biểu đồ doanh thu theo Ngày, Tháng, Năm"
                className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80"
              >
                {TIME_FRAMES.map((tf) => {
                  const active = timeFrame === tf.id;
                  return (
                    <button
                      key={tf.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTimeFrame(tf.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                        active
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tf.label}
                    </button>
                  );
                })}
              </div>

              {/* Contextual sub-filter */}
              {timeFrame === 'day' && (
                <select
                  aria-label="Khoảng ngày hiển thị"
                  value={dayRange}
                  onChange={(e) => handleDayRangeChange(Number(e.target.value))}
                  className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value={7}>7 ngày qua</option>
                  <option value={14}>14 ngày qua</option>
                  <option value={30}>30 ngày qua</option>
                </select>
              )}

              {timeFrame === 'month' && (
                <select
                  aria-label="Năm thống kê"
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              )}

              {/* Chart Visual Style Toggle (Area / Bar) */}
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setChartStyle('area')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    chartStyle === 'area'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Đường
                </button>
                <button
                  type="button"
                  onClick={() => setChartStyle('bar')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    chartStyle === 'bar'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Cột
                </button>
              </div>
            </div>
          </div>

          {/* Period Summary Strip */}
          <div className="flex flex-wrap items-center gap-4 px-3.5 py-2.5 mb-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Tổng doanh thu kỳ đang xem:</span>
              <strong className="text-slate-900">{formatVND(periodRevenueSum)}</strong>
            </div>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span>Đơn hoàn thành:</span>
              <strong className="text-emerald-600">
                {periodOrderSum.toLocaleString('vi-VN')} đơn
              </strong>
            </div>
          </div>

          {loadingRevenue ? (
            <SkeletonBox className="h-64" />
          ) : errorRevenue ? (
            <ErrorAlert message={errorRevenue} onRetry={() => fetchAllRevenueCharts()} />
          ) : activeRevenueChart.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <BarChart3 className="w-8 h-8 opacity-40" />
              <p className="text-sm">Chưa có dữ liệu doanh thu</p>
            </div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chartStyle === 'bar' ? (
                  <BarChart
                    data={activeRevenueChart}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="dashBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.75} />
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
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatShort(v)}
                      domain={[0, Math.ceil(maxRevenue * 1.15)]}
                      width={52}
                    />
                    <Tooltip
                      content={<CustomRevenueTooltip />}
                      cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
                    />
                    <Bar
                      dataKey="doanhThu"
                      fill="url(#dashBarGrad)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                      animationDuration={400}
                    />
                  </BarChart>
                ) : (
                  <AreaChart
                    data={activeRevenueChart}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="dashAreaStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                      <linearGradient id="dashAreaFill" x1="0" y1="0" x2="0" y2="1">
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
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatShort(v)}
                      domain={[0, Math.ceil(maxRevenue * 1.15)]}
                      width={52}
                    />
                    <Tooltip
                      content={<CustomRevenueTooltip />}
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="doanhThu"
                      stroke="url(#dashAreaStroke)"
                      strokeWidth={2.5}
                      fill="url(#dashAreaFill)"
                      dot={{ fill: '#2563eb', r: 3.5, strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 2.5, stroke: '#dbeafe' }}
                      animationDuration={400}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Order Status Donut Chart */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Phân bổ Trạng thái Đơn hàng</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng cộng {totalOrdersPie.toLocaleString('vi-VN')} đơn hàng
            </p>
          </div>

          {loadingStatus ? (
            <SkeletonBox className="h-64" />
          ) : errorStatus ? (
            <ErrorAlert message={errorStatus} onRetry={fetchOrderStatus} />
          ) : orderStatus.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <ShoppingCart className="w-8 h-8 opacity-40" />
              <p className="text-sm">Chưa có dữ liệu đơn hàng</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatus}
                      dataKey="soLuong"
                      nameKey="trangThai"
                      cx="50%"
                      cy="50%"
                      outerRadius={72}
                      innerRadius={44}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {orderStatus.map((entry, index) => (
                        <Cell
                          key={entry.trangThai}
                          fill={
                            STATUS_MAP[entry.trangThai]?.color ||
                            FALLBACK_COLORS[index % FALLBACK_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-extrabold text-slate-900">
                    {totalOrdersPie.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Đơn hàng
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {orderStatus.map((entry, index) => {
                  const color =
                    STATUS_MAP[entry.trangThai]?.color ||
                    FALLBACK_COLORS[index % FALLBACK_COLORS.length];
                  const pct =
                    totalOrdersPie > 0
                      ? ((entry.soLuong / totalOrdersPie) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <div
                      key={entry.trangThai}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex items-center gap-2 text-slate-600 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate font-medium">
                          {getOrderStatusDisplayLabel(entry.trangThai)}
                        </span>
                      </span>
                      <div className="flex items-center gap-2.5 shrink-0 ml-2">
                        <span className="font-bold text-slate-800">
                          {entry.soLuong.toLocaleString('vi-VN')}
                        </span>
                        <span className="text-slate-400 w-11 text-right font-mono text-[11px]">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Top 5 Sản phẩm bán chạy nhất ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-100 text-amber-600 text-xs">
                🏆
              </span>
              Top 5 Sản phẩm bán chạy nhất
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Xếp hạng theo số lượng đã bán thành công &amp; tổng doanh thu mang lại
            </p>
          </div>
          {topProducts.length > 0 && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
              Tổng DT Top 5: <strong className="text-slate-800">{formatVND(totalTop5Revenue)}</strong>
            </span>
          )}
        </div>

        {loadingTopProducts ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <SkeletonBox className="w-7 h-7 rounded-full shrink-0" />
                <SkeletonBox className="w-12 h-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonBox className="h-3.5 w-2/3 rounded" />
                  <SkeletonBox className="h-2.5 w-1/3 rounded" />
                </div>
                <SkeletonBox className="h-5 w-20 rounded shrink-0" />
                <SkeletonBox className="h-5 w-28 rounded shrink-0" />
              </div>
            ))}
          </div>
        ) : errorTopProducts ? (
          <div className="p-5">
            <ErrorAlert message={errorTopProducts} onRetry={fetchTopProducts} />
          </div>
        ) : topProducts.length === 0 ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-slate-400 gap-2 text-center">
            <Package className="w-9 h-9 opacity-35" />
            <p className="text-sm font-medium text-slate-500">
              Chưa có dữ liệu sản phẩm bán chạy
            </p>
            <p className="text-xs text-slate-400">
              Top 5 máy bán chạy sẽ tự động cập nhật khi có đơn hàng giao thành công
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
                      {/* Rank */}
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${rankStyle(
                            index
                          )}`}
                        >
                          {index + 1}
                        </span>
                      </td>

                      {/* Hình ảnh & Tên máy */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3.5 min-w-0">
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

                      {/* Tồn kho */}
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

                      {/* Số lượng đã bán */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold text-slate-800 text-sm">
                            {soldQty.toLocaleString('vi-VN')}
                          </span>
                          <span className="text-[11px] text-slate-400">máy đã bán</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
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

                      {/* Tổng doanh thu */}
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
    </div>
  );
};

export default DashboardPage;
