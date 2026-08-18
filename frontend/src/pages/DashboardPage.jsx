import { useState, useCallback, useEffect } from 'react';
import {
  ShoppingCart, Package, TrendingUp, DollarSign,
  AlertCircle, RefreshCw, Star,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0 ₫';
  if (value >= 1_000_000_000)
    return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1)}M ₫`;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// ─── Order Status Chart Colors ────────────────────────────────────────────────
const STATUS_COLORS = {
  'Đã hoàn thành': '#10b981',
  'Đang xử lý':    '#0ea5e9',
  'Đang giao':     '#f59e0b',
  'Đã hủy':        '#ef4444',
  'Chờ xác nhận':  '#8b5cf6',
};
const FALLBACK_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
const SkeletonBox = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-700/50 rounded-lg ${className}`} />
);

// ─── Error Alert ──────────────────────────────────────────────────────────────
const ErrorAlert = ({ message, onRetry }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
    <AlertCircle className="w-4 h-4 shrink-0" />
    <span className="flex-1">{message}</span>
    {onRetry && (
      <button
        onClick={onRetry}
        className="flex items-center gap-1 text-xs text-red-300 hover:text-red-100 transition"
      >
        <RefreshCw className="w-3 h-3" /> Thử lại
      </button>
    )}
  </div>
);

// ─── Dashboard Page ───────────────────────────────────────────────────────────
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

  // Fetch 4 stat cards
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

  // Fetch revenue 12-month chart
  const fetchRevenueChart = useCallback(async () => {
    setLoadingRevenue(true);
    setErrorRevenue(null);
    try {
      const res = await api.get('/admin/dashboard/charts/revenue-monthly');
      setRevenueChart(res.data.data);
    } catch (err) {
      setErrorRevenue(err.response?.data?.message || 'Không thể tải biểu đồ doanh thu');
    } finally {
      setLoadingRevenue(false);
    }
  }, []);

  // Fetch order status chart
  const fetchOrderStatus = useCallback(async () => {
    setLoadingStatus(true);
    setErrorStatus(null);
    try {
      const res = await api.get('/admin/dashboard/charts/order-status');
      setOrderStatus(res.data.data);
    } catch (err) {
      setErrorStatus(err.response?.data?.message || 'Không thể tải biểu đồ trạng thái');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Fetch top products
  const fetchTopProducts = useCallback(async () => {
    setLoadingTopProducts(true);
    setErrorTopProducts(null);
    try {
      const res = await api.get('/admin/dashboard/top-products');
      setTopProducts(res.data.data);
    } catch (err) {
      setErrorTopProducts(err.response?.data?.message || 'Không thể tải sản phẩm bán chạy');
    } finally {
      setLoadingTopProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
    fetchRevenueChart();
    fetchOrderStatus();
    fetchTopProducts();
  }, [fetchCards, fetchRevenueChart, fetchOrderStatus, fetchTopProducts]);

  // ── Stat Cards Config ───────────────────────────────────────────────────────
  const statCards = cards
    ? [
        {
          label: 'Doanh thu tháng',
          value: formatCurrency(cards.doanhThuThang),
          icon: DollarSign,
          colorClass: 'from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400',
        },
        {
          label: 'Doanh thu năm',
          value: formatCurrency(cards.doanhThuNam),
          icon: TrendingUp,
          colorClass: 'from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400',
        },
        {
          label: 'Lợi nhuận tháng',
          value: formatCurrency(cards.loiNhuanThang),
          icon: Star,
          colorClass: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
        },
        {
          label: 'Tổng đơn hàng',
          value: cards.tongDonHang?.toLocaleString('vi-VN'),
          icon: ShoppingCart,
          colorClass: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
        },
      ]
    : [];

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* ── Stat Cards ── */}
      {errorCards && <ErrorAlert message={errorCards} onRetry={fetchCards} />}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {loadingCards
          ? Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBox key={i} className="h-28" />
            ))
          : statCards.map((card) => (
              <div
                key={card.label}
                className={`bg-gradient-to-br ${card.colorClass} border rounded-xl p-5 transition hover:scale-[1.02] duration-200`}
              >
                <div className="flex items-start justify-between mb-3">
                  <card.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-slate-100 truncate">{card.value}</p>
                <p className="text-xs text-slate-400 mt-1">{card.label}</p>
              </div>
            ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        {/* Doanh thu 12 tháng */}
        <div className="col-span-3 bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-100">Doanh thu 12 tháng năm nay</h3>
            <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-lg">
              {new Date().getFullYear()}
            </span>
          </div>
          {loadingRevenue ? (
            <SkeletonBox className="h-52" />
          ) : revenueChart.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-500 text-sm">
              Chưa có dữ liệu doanh thu
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="thang"
                  tickFormatter={(v) => `T${v}`}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(v) => `Tháng ${v}`}
                  formatter={(v) => [formatCurrency(v), 'Doanh thu']}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#0ea5e9' }}
                />
                <Area
                  type="monotone"
                  dataKey="doanhThu"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Trạng thái đơn hàng */}
        <div className="col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-100 mb-4">Trạng thái đơn hàng</h3>
          {loadingStatus ? (
            <SkeletonBox className="h-52" />
          ) : errorStatus ? (
            <ErrorAlert message={errorStatus} onRetry={fetchOrderStatus} />
          ) : orderStatus.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-500 text-sm">
              Chưa có dữ liệu đơn hàng
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={orderStatus}
                  dataKey="soLuong"
                  nameKey="trangThai"
                  cx="50%"
                  cy="45%"
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {orderStatus.map((entry, index) => (
                    <Cell
                      key={entry.trangThai}
                      fill={STATUS_COLORS[entry.trangThai] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(v, name) => [v, name]}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Top 5 Sản phẩm bán chạy ── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-100 mb-4">Top 5 sản phẩm bán chạy</h3>
        {loadingTopProducts ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBox key={i} className="h-12" />
            ))}
          </div>
        ) : errorTopProducts ? (
          <ErrorAlert message={errorTopProducts} onRetry={fetchTopProducts} />
        ) : topProducts.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-slate-500 text-sm">
            Chưa có dữ liệu sản phẩm bán chạy
          </div>
        ) : (
          <div className="space-y-2">
            {topProducts.map((product, index) => (
              <div
                key={product.MaSanPham}
                className="flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-slate-700/30 transition"
              >
                {/* Hạng */}
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    index === 0
                      ? 'bg-amber-500/20 text-amber-400'
                      : index === 1
                      ? 'bg-slate-400/20 text-slate-300'
                      : index === 2
                      ? 'bg-orange-700/20 text-orange-400'
                      : 'bg-slate-700/50 text-slate-500'
                  }`}
                >
                  {index + 1}
                </span>

                {/* Ảnh sản phẩm */}
                {product.Anh ? (
                  <img
                    src={product.Anh}
                    alt={product.TenSanPham}
                    className="w-9 h-9 rounded-lg object-cover bg-slate-700 shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-slate-500" />
                  </div>
                )}

                {/* Thông tin */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{product.TenSanPham}</p>
                  <p className="text-xs text-slate-400">{formatCurrency(product.Gia)}</p>
                </div>

                {/* Số lượng bán */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-100">
                    {product.SoLuongDaBan?.toLocaleString('vi-VN')}
                  </p>
                  <p className="text-xs text-slate-500">đã bán</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
