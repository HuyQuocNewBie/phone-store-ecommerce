import { useState, useCallback, useEffect } from 'react';
import {
  ShoppingCart, TrendingUp, DollarSign, BarChart3,
  AlertCircle, RefreshCw, Package, ArrowUpRight,
  ArrowDownRight, Minus,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  Legend, ReferenceLine,
} from 'recharts';
import api from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatVND = (value) => {
  if (value === null || value === undefined) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
};

const formatShort = (value) => {
  if (!value && value !== 0) return '0';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
};

// ─── Status Colors ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  'Đã hoàn thành': { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  'Đang xử lý':    { color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)' },
  'Đang giao':     { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  'Đã hủy':        { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  'Chờ xác nhận':  { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
};
const FALLBACK_COLORS = ['#0ea5e9', '#a78bfa', '#10b981', '#f59e0b', '#ef4444'];

// ─── Skeleton Components ──────────────────────────────────────────────────────
const SkeletonBox = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-700/40 rounded-xl ${className}`} />
);

const StatCardSkeleton = () => (
  <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4">
    <div className="flex items-start justify-between">
      <SkeletonBox className="w-12 h-12 rounded-xl" />
      <SkeletonBox className="w-16 h-5 rounded-full" />
    </div>
    <SkeletonBox className="h-8 w-3/4 rounded-lg" />
    <SkeletonBox className="h-4 w-1/2 rounded-lg" />
  </div>
);

// ─── Error Alert ──────────────────────────────────────────────────────────────
const ErrorAlert = ({ message, onRetry }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-sm">
    <AlertCircle className="w-4 h-4 shrink-0" />
    <span className="flex-1">{message}</span>
    {onRetry && (
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-medium text-red-300 hover:text-red-100 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
      >
        <RefreshCw className="w-3 h-3" /> Thử lại
      </button>
    )}
  </div>
);

// ─── Custom Tooltip for LineChart ─────────────────────────────────────────────
const CustomLineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600/60 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-1.5 font-medium">Tháng {label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
        <span className="text-slate-200 font-semibold">{formatVND(payload[0]?.value)}</span>
      </div>
    </div>
  );
};

// ─── Custom Tooltip for PieChart ──────────────────────────────────────────────
const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const color = STATUS_MAP[d.name]?.color || FALLBACK_COLORS[0];
  return (
    <div className="bg-slate-800 border border-slate-600/60 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-medium mb-1" style={{ color }}>{d.name}</p>
      <p className="text-slate-200 font-semibold">{d.value?.toLocaleString('vi-VN')} đơn</p>
    </div>
  );
};

// ─── Custom Legend for PieChart ───────────────────────────────────────────────
const CustomPieLegend = ({ payload }) => (
  <ul className="flex flex-col gap-2 mt-2">
    {payload?.map((entry, i) => {
      const color = STATUS_MAP[entry.value]?.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
      return (
        <li key={entry.value} className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {entry.value}
          </span>
          <span className="font-semibold text-slate-200 ml-4">
            {entry.payload?.soLuong?.toLocaleString('vi-VN')}
          </span>
        </li>
      );
    })}
  </ul>
);

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
const DashboardPage = () => {
  const [cards, setCards]               = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [orderStatus, setOrderStatus]   = useState([]);
  const [topProducts, setTopProducts]   = useState([]);
  const [loadingCards, setLoadingCards]             = useState(true);
  const [loadingRevenue, setLoadingRevenue]         = useState(true);
  const [loadingStatus, setLoadingStatus]           = useState(true);
  const [loadingTopProducts, setLoadingTopProducts] = useState(true);
  const [errorCards, setErrorCards]               = useState(null);
  const [errorRevenue, setErrorRevenue]           = useState(null);
  const [errorStatus, setErrorStatus]             = useState(null);
  const [errorTopProducts, setErrorTopProducts]   = useState(null);

  // ── API Calls ───────────────────────────────────────────────────────────────
  const fetchCards = useCallback(async () => {
    setLoadingCards(true); setErrorCards(null);
    try {
      const res = await api.get('/admin/dashboard/cards');
      setCards(res.data.data);
    } catch (err) {
      setErrorCards(err.response?.data?.message || 'Không thể tải thẻ thống kê');
    } finally { setLoadingCards(false); }
  }, []);

  const fetchRevenueChart = useCallback(async () => {
    setLoadingRevenue(true); setErrorRevenue(null);
    try {
      const res = await api.get('/admin/dashboard/charts/revenue-monthly');
      setRevenueChart(res.data.data);
    } catch (err) {
      setErrorRevenue(err.response?.data?.message || 'Không thể tải biểu đồ doanh thu');
    } finally { setLoadingRevenue(false); }
  }, []);

  const fetchOrderStatus = useCallback(async () => {
    setLoadingStatus(true); setErrorStatus(null);
    try {
      const res = await api.get('/admin/dashboard/charts/order-status');
      setOrderStatus(res.data.data);
    } catch (err) {
      setErrorStatus(err.response?.data?.message || 'Không thể tải biểu đồ trạng thái');
    } finally { setLoadingStatus(false); }
  }, []);

  const fetchTopProducts = useCallback(async () => {
    setLoadingTopProducts(true); setErrorTopProducts(null);
    try {
      const res = await api.get('/admin/dashboard/top-products');
      setTopProducts(res.data.data);
    } catch (err) {
      setErrorTopProducts(err.response?.data?.message || 'Không thể tải sản phẩm bán chạy');
    } finally { setLoadingTopProducts(false); }
  }, []);

  useEffect(() => {
    fetchCards();
    fetchRevenueChart();
    fetchOrderStatus();
    fetchTopProducts();
  }, [fetchCards, fetchRevenueChart, fetchOrderStatus, fetchTopProducts]);

  // ── Stat Cards Config ────────────────────────────────────────────────────────
  const statCards = cards
    ? [
        {
          id: 'doanh-thu-thang',
          label: 'Doanh thu tháng này',
          value: formatVND(cards.doanhThuThang),
          raw: cards.doanhThuThang,
          icon: DollarSign,
          gradient: 'from-sky-600/30 via-sky-500/10 to-transparent',
          border: 'border-sky-500/30',
          iconBg: 'bg-sky-500/20',
          iconColor: 'text-sky-400',
          badge: 'text-sky-300 bg-sky-500/15',
          badgeText: 'Tháng ' + new Date().getMonth(),
        },
        {
          id: 'doanh-thu-nam',
          label: 'Doanh thu năm nay',
          value: formatVND(cards.doanhThuNam),
          raw: cards.doanhThuNam,
          icon: TrendingUp,
          gradient: 'from-violet-600/30 via-violet-500/10 to-transparent',
          border: 'border-violet-500/30',
          iconBg: 'bg-violet-500/20',
          iconColor: 'text-violet-400',
          badge: 'text-violet-300 bg-violet-500/15',
          badgeText: String(new Date().getFullYear()),
        },
        {
          id: 'loi-nhuan-thang',
          label: 'Lợi nhuận tháng này',
          value: formatVND(cards.loiNhuanThang),
          raw: cards.loiNhuanThang,
          icon: BarChart3,
          gradient: 'from-emerald-600/30 via-emerald-500/10 to-transparent',
          border: 'border-emerald-500/30',
          iconBg: 'bg-emerald-500/20',
          iconColor: 'text-emerald-400',
          badge: 'text-emerald-300 bg-emerald-500/15',
          badgeText: cards.loiNhuanThang >= 0 ? 'Dương' : 'Âm',
          trendIcon: cards.loiNhuanThang >= 0
            ? <ArrowUpRight className="w-3 h-3" />
            : <ArrowDownRight className="w-3 h-3" />,
        },
        {
          id: 'tong-don-hang',
          label: 'Tổng số đơn hàng',
          value: cards.tongDonHang?.toLocaleString('vi-VN'),
          raw: cards.tongDonHang,
          icon: ShoppingCart,
          gradient: 'from-amber-600/30 via-amber-500/10 to-transparent',
          border: 'border-amber-500/30',
          iconBg: 'bg-amber-500/20',
          iconColor: 'text-amber-400',
          badge: 'text-amber-300 bg-amber-500/15',
          badgeText: 'Tất cả',
        },
      ]
    : [];

  // ── Revenue chart max value for YAxis domain ─────────────────────────────────
  const maxRevenue = revenueChart.length
    ? Math.max(...revenueChart.map((d) => d.doanhThu), 1)
    : 1;

  // ── PieChart total for percentage labels ─────────────────────────────────────
  const totalOrders = orderStatus.reduce((sum, d) => sum + d.soLuong, 0);

  // ── Rank badge style ──────────────────────────────────────────────────────────
  const rankStyle = (index) => {
    if (index === 0) return 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40';
    if (index === 1) return 'bg-slate-400/20 text-slate-300 ring-1 ring-slate-400/40';
    if (index === 2) return 'bg-orange-700/20 text-orange-400 ring-1 ring-orange-600/40';
    return 'bg-slate-700/40 text-slate-500';
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tổng quan hoạt động kinh doanh · {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        <button
          onClick={() => { fetchCards(); fetchRevenueChart(); fetchOrderStatus(); fetchTopProducts(); }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700/60
                     text-slate-400 hover:text-slate-200 hover:border-slate-600 text-xs font-medium
                     transition-all duration-200 hover:bg-slate-700/60 active:scale-95"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Làm mới
        </button>
      </div>

      {/* ── Error (Cards) ── */}
      {errorCards && <ErrorAlert message={errorCards} onRetry={fetchCards} />}

      {/* ── Stat Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingCards
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => (
              <div
                key={card.id}
                className={`relative overflow-hidden bg-gradient-to-br ${card.gradient}
                            bg-slate-800/60 border ${card.border} rounded-2xl p-5
                            transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
                            hover:shadow-black/20 group cursor-default`}
              >
                {/* Decorative glow blob */}
                <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${card.iconBg}
                                 blur-2xl opacity-60 group-hover:opacity-90 transition-opacity`} />

                <div className="relative">
                  {/* Icon + Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                      <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1
                                      rounded-full ${card.badge}`}>
                      {card.trendIcon}
                      {card.badgeText}
                    </span>
                  </div>

                  {/* Value */}
                  <p className="text-2xl font-bold text-slate-100 leading-tight tracking-tight truncate">
                    {card.value}
                  </p>

                  {/* Label */}
                  <p className="text-xs text-slate-500 mt-1.5 font-medium">{card.label}</p>
                </div>
              </div>
            ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* LineChart — Doanh thu 12 tháng */}
        <div className="xl:col-span-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Doanh thu theo tháng</h2>
              <p className="text-xs text-slate-500 mt-0.5">Biểu đồ doanh thu 12 tháng năm {new Date().getFullYear()}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-sky-400 bg-sky-500/10
                            border border-sky-500/20 px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              Live
            </div>
          </div>

          {loadingRevenue ? (
            <SkeletonBox className="h-56" />
          ) : errorRevenue ? (
            <ErrorAlert message={errorRevenue} onRetry={fetchRevenueChart} />
          ) : revenueChart.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-600 gap-2">
              <BarChart3 className="w-8 h-8 opacity-40" />
              <p className="text-sm">Chưa có dữ liệu doanh thu</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <LineChart data={revenueChart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="thang"
                  tickFormatter={(v) => `T${v}`}
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
                  domain={[0, Math.ceil(maxRevenue * 1.2)]}
                  width={52}
                />
                <Tooltip content={<CustomLineTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />
                <ReferenceLine y={0} stroke="#334155" />
                <Line
                  type="monotone"
                  dataKey="doanhThu"
                  stroke="url(#lineGrad)"
                  strokeWidth={2.5}
                  dot={{ fill: '#0ea5e9', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#38bdf8', strokeWidth: 2, stroke: '#1e293b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* PieChart — Trạng thái đơn hàng */}
        <div className="xl:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-slate-100">Trạng thái đơn hàng</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng {totalOrders.toLocaleString('vi-VN')} đơn
            </p>
          </div>

          {loadingStatus ? (
            <SkeletonBox className="h-56" />
          ) : errorStatus ? (
            <ErrorAlert message={errorStatus} onRetry={fetchOrderStatus} />
          ) : orderStatus.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-600 gap-2">
              <ShoppingCart className="w-8 h-8 opacity-40" />
              <p className="text-sm">Chưa có dữ liệu đơn hàng</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={orderStatus}
                    dataKey="soLuong"
                    nameKey="trangThai"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={38}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {orderStatus.map((entry, index) => (
                      <Cell
                        key={entry.trangThai}
                        fill={STATUS_MAP[entry.trangThai]?.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Custom legend below chart */}
              <div className="mt-3 space-y-2">
                {orderStatus.map((entry, index) => {
                  const color = STATUS_MAP[entry.trangThai]?.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
                  const pct = totalOrders > 0 ? ((entry.soLuong / totalOrders) * 100).toFixed(1) : '0';
                  return (
                    <div key={entry.trangThai} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-slate-400 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="truncate">{entry.trangThai}</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="font-semibold text-slate-200">{entry.soLuong.toLocaleString('vi-VN')}</span>
                        <span className="text-slate-600 w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Top 5 Sản phẩm bán chạy ── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              🔥 Top 5 Sản phẩm bán chạy nhất
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Xếp hạng theo số lượng đã bán</p>
          </div>
        </div>

        {loadingTopProducts ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <SkeletonBox className="w-7 h-7 rounded-full shrink-0" />
                <SkeletonBox className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonBox className="h-3.5 w-3/4 rounded" />
                  <SkeletonBox className="h-3 w-1/3 rounded" />
                </div>
                <SkeletonBox className="h-5 w-16 rounded-full" />
                <SkeletonBox className="h-5 w-12 rounded shrink-0" />
              </div>
            ))}
          </div>
        ) : errorTopProducts ? (
          <div className="p-5">
            <ErrorAlert message={errorTopProducts} onRetry={fetchTopProducts} />
          </div>
        ) : topProducts.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-600 gap-2">
            <Package className="w-8 h-8 opacity-40" />
            <p className="text-sm">Chưa có dữ liệu sản phẩm bán chạy</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[2rem_2.5rem_1fr_auto_auto] items-center
                            gap-4 px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider
                            border-b border-slate-700/30">
              <span>#</span>
              <span />
              <span>Sản phẩm</span>
              <span className="text-right">Giá bán</span>
              <span className="text-right w-24">Đã bán</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-700/30">
              {topProducts.map((product, index) => {
                const maxSold = topProducts[0]?.SoLuongDaBan || 1;
                const barPct  = Math.round((product.SoLuongDaBan / maxSold) * 100);

                return (
                  <div
                    key={product.MaSanPham}
                    className="grid grid-cols-[2rem_2.5rem_1fr_auto_auto] items-center
                               gap-4 px-5 py-3.5 hover:bg-slate-700/20 transition-colors duration-150
                               group"
                  >
                    {/* Rank Badge */}
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center
                                      text-xs font-bold shrink-0 ${rankStyle(index)}`}>
                      {index + 1}
                    </span>

                    {/* Product Image */}
                    {product.Anh ? (
                      <img
                        src={product.Anh}
                        alt={product.TenSanPham}
                        className="w-10 h-10 rounded-xl object-cover bg-slate-700 shrink-0
                                   ring-1 ring-slate-700/60 group-hover:ring-slate-600/60 transition"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center
                                      justify-center shrink-0 ring-1 ring-slate-700/60">
                        <Package className="w-4 h-4 text-slate-500" />
                      </div>
                    )}

                    {/* Name + Progress bar */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate
                                    group-hover:text-white transition-colors">
                        {product.TenSanPham}
                      </p>
                      {/* Progress bar */}
                      <div className="mt-1.5 h-1 bg-slate-700/60 rounded-full overflow-hidden w-full max-w-xs">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${barPct}%`,
                            background: index === 0
                              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                              : index === 1
                              ? 'linear-gradient(90deg, #94a3b8, #cbd5e1)'
                              : index === 2
                              ? 'linear-gradient(90deg, #c2410c, #f97316)'
                              : 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-200">
                        {formatVND(product.Gia)}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5">Giá bán</p>
                    </div>

                    {/* Sold count */}
                    <div className="text-right w-24 shrink-0">
                      <p className="text-base font-bold text-slate-100">
                        {product.SoLuongDaBan?.toLocaleString('vi-VN')}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">đã bán</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
