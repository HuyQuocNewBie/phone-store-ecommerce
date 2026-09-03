import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Calendar, FileSpreadsheet, AlertCircle, CheckCircle2, RefreshCw, ShoppingCart, DollarSign, ArrowUpRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../../../services/api';

// ── Helper format VNĐ ──
const formatVND = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// ── Helper format ngày ngắn ──
const formatShortVND = (value) => {
  if (!value && value !== 0) return '0';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
};

// ── Helper format Date sang YYYY-MM-DD cho input[type="date"] và API ──
const formatDateToYYYYMMDD = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ── Helper format YYYY-MM-DD sang DD/MM/YYYY cho hiển thị thân thiện ──
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
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

// Custom Tooltip cho Biểu đồ cột Doanh thu
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600/70 rounded-xl p-3 shadow-2xl text-xs space-y-1">
      <p className="text-slate-400 font-semibold">Ngày {formatDateDisplay(label)}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
        <span className="text-emerald-400 font-bold">{formatVND(payload[0]?.value)}</span>
      </div>
    </div>
  );
};

const AnalyticsPage = () => {
  // Dates State (Mặc định: Đầu tháng tới hôm nay)
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [fromDate, setFromDate] = useState(formatDateToYYYYMMDD(startOfMonth));
  const [toDate, setToDate] = useState(formatDateToYYYYMMDD(today));

  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // 1. Tải Dữ liệu Thống kê khi nhấn nút "Kết quả"
  const fetchRevenueData = useCallback(async (start, end) => {
    setErrorBanner(null);

    // Validation: Từ ngày > Đến ngày
    if (new Date(start) > new Date(end)) {
      setErrorBanner('Ngày bắt đầu ("Từ ngày") không được lớn hơn Ngày kết thúc ("Đến ngày")');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/admin/analytics/revenue?fromDate=${start}&toDate=${end}`);
      setAnalyticsData(res.data.data);
    } catch (err) {
      setErrorBanner(err.response?.data?.message || 'Không thể lấy dữ liệu thống kê doanh thu');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Tự động tải dữ liệu ban đầu
  useEffect(() => {
    fetchRevenueData(fromDate, toDate);
  }, [fetchRevenueData, fromDate, toDate]);

  // Xử lý khi nhấn nút "Kết quả"
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchRevenueData(fromDate, toDate);
  };

  // 2. Xuất Báo cáo Excel (.xlsx)
  const handleExportExcel = async () => {
    if (!analyticsData || (analyticsData.summary?.tongDoanhThu || 0) <= 0) return;

    setExportLoading(true);
    try {
      const response = await api.get(
        `/admin/analytics/export-excel?fromDate=${fromDate}&toDate=${toDate}`,
        { responseType: 'blob' }
      );

      // Tạo Blob URL để tải xuống file .xlsx
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bao-cao-doanh-thu-${fromDate}-den-${toDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Xuất file Excel thất bại: ' + (err.message || 'Lỗi server'));
    } finally {
      setExportLoading(false);
    }
  };

  // Tính xem nút "Xuất Excel" có được enabled không
  // Mặc định disabled (màu xám). Chỉ enabled khi đã bấm Kết quả & tongDoanhThu > 0
  const isExcelEnabled = Boolean(
    analyticsData &&
    !loading &&
    !errorBanner &&
    (analyticsData.summary?.tongDoanhThu || 0) > 0
  );

  const chartList = analyticsData?.chart || [];
  const ordersList = analyticsData?.orders || [];
  const tongDoanhThu = analyticsData?.summary?.tongDoanhThu || 0;
  const tongDonHang = analyticsData?.summary?.tongDonHang || 0;

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-400" />
            Báo cáo thống kê doanh thu
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Theo dõi tổng doanh thu, biểu đồ phân tích và chi tiết danh sách đơn hàng theo mốc thời gian
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleFilterSubmit} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Ô "Từ" (dd/mm/yyyy) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                Từ (dd/mm/yyyy):
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {formatDateDisplay(fromDate)}
              </span>
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full h-[42px] bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500 font-medium"
            />
          </div>

          {/* Ô "Đến" (dd/mm/yyyy) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                Đến (dd/mm/yyyy):
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {formatDateDisplay(toDate)}
              </span>
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full h-[42px] bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500 font-medium"
            />
          </div>

          {/* Nút "Kết quả" */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[42px] flex items-center justify-center gap-2 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
              Kết quả
            </button>
          </div>

          {/* Nút "Xuất Excel" */}
          <div>
            <button
              type="button"
              disabled={!isExcelEnabled || exportLoading}
              onClick={handleExportExcel}
              className={`w-full h-[42px] flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-semibold shadow-lg transition-all ${
                isExcelEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95 cursor-pointer'
                  : 'bg-slate-700/60 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
              title={!isExcelEnabled ? 'Vui lòng nhấn "Kết quả" và đảm bảo doanh thu > 0 để xuất Excel' : 'Xuất báo cáo dạng file Excel (.xlsx)'}
            >
              {exportLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              Xuất Excel
            </button>
          </div>
        </div>
      </form>

      {/* Error Banner ngay tại chỗ nếu Từ > Đến hoặc có lỗi API */}
      {errorBanner && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm font-medium flex items-center gap-3 shadow-lg animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Tổng doanh thu thực tế</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">
              {formatVND(tongDoanhThu)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Chỉ tính các đơn hàng đã hoàn thành trong khoảng thời gian chọn
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Tổng số đơn hàng</p>
            <p className="text-2xl font-extrabold text-sky-400 mt-1">
              {tongDonHang} <span className="text-sm font-semibold text-slate-400">đơn</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Tất cả trạng thái đơn phát sinh trong khoảng thời gian chọn
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Column / Bar Chart Section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              📊 Biểu đồ doanh thu theo ngày
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Thời gian: từ {formatDateDisplay(fromDate)} đến {formatDateDisplay(toDate)}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
          </div>
        ) : chartList.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
            <BarChart3 className="w-10 h-10 opacity-30" />
            <p className="text-sm">Chưa có dữ liệu thống kê doanh thu</p>
          </div>
        ) : (
          <div className="w-full h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartList} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="ngay"
                  tickFormatter={(val) => {
                    const parts = val.split('-');
                    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                  }}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(val) => formatShortVND(val)}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar
                  dataKey="doanhThu"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  barSize={Math.max(12, Math.min(32, Math.floor(600 / (chartList.length || 1))))}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Orders List Table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            📋 Danh sách đơn hàng phát sinh ({ordersList.length} đơn)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-200">
            <thead className="bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
              <tr>
                <th className="px-6 py-4 w-28">Mã đơn</th>
                <th className="px-6 py-4 w-44">Ngày mua</th>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4 text-center w-40">Trạng thái</th>
                <th className="px-6 py-4 text-right w-44">Tổng tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30 text-sm">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-36" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-6 bg-slate-700/50 rounded-full w-24 mx-auto" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-700/50 rounded w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : ordersList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    Chưa có đơn hàng nào trong khoảng thời gian này
                  </td>
                </tr>
              ) : (
                ordersList.map((order) => (
                  <tr key={order.MaDonHang} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-sky-400">
                      #{order.MaDonHang}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300 font-medium">
                      {formatDateDisplay(order.NgayMuaHang?.slice(0, 10))}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-100">
                      {order.KhachHang || 'Khách hàng'}
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-semibold">
                      <span className={`inline-block px-2.5 py-1 rounded-full border ${
                        order.TrangThaiDonHang === 'Đã hoàn thành'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : order.TrangThaiDonHang === 'Đã hủy'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {order.TrangThaiDonHang}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-400">
                      {formatVND(order.TongTien)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
