import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  ShoppingCart, RefreshCw, Search, AlertCircle,
  CheckCircle2, Clock, Settings, Truck, XCircle, Package
} from 'lucide-react';
import api from '../../../services/api';
import { formatOrderCode } from '../../../utils/formatters';

// ── Helper Format VNĐ ──
const formatVND = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// ── Helper Format Ngày Giờ (dd/mm/yyyy HH:mm) ──
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// ── 5 Trạng thái chuẩn (đồng bộ với User) ──
const ORDER_STATUS_OPTIONS = [
  'Chờ xác nhận',
  'Đang xử lý',
  'Đang giao',
  'Đã giao',
  'Đã hủy'
];

// ── 6 Tabs: Tất cả + 5 trạng thái chuẩn ──
const ORDER_TABS = [
  { id: 'ALL',        label: 'Tất cả',       icon: Package,      status: null },
  { id: 'PENDING',    label: 'Chờ xác nhận', icon: Clock,        status: 'Chờ xác nhận' },
  { id: 'PROCESSING', label: 'Đang xử lý',   icon: Settings,     status: 'Đang xử lý' },
  { id: 'SHIPPING',   label: 'Đang giao',    icon: Truck,        status: 'Đang giao' },
  { id: 'DELIVERED',  label: 'Đã giao',      icon: CheckCircle2, status: 'Đã giao' },
  { id: 'CANCELLED',  label: 'Đã hủy',       icon: XCircle,      status: 'Đã hủy' },
];

// ── Map Màu cho Trạng thái ──
const STATUS_STYLE_MAP = {
  'Chờ xác nhận': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'Đang xử lý':   'bg-sky-500/10 text-sky-400 border-sky-500/30',
  'Đang giao':    'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Đã giao':      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Đã hủy':       'bg-rose-500/10 text-rose-400 border-rose-500/30'
};

// ── Màu Tab khi active ──
const TAB_ACTIVE_STYLE = {
  ALL:        'text-white border-b-2 border-slate-300 bg-slate-700/40',
  PENDING:    'text-purple-300 border-b-2 border-purple-400 bg-purple-500/10',
  PROCESSING: 'text-sky-300 border-b-2 border-sky-400 bg-sky-500/10',
  SHIPPING:   'text-amber-300 border-b-2 border-amber-400 bg-amber-500/10',
  DELIVERED:  'text-emerald-300 border-b-2 border-emerald-400 bg-emerald-500/10',
  CANCELLED:  'text-rose-300 border-b-2 border-rose-400 bg-rose-500/10',
};

const OrderListPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  // 1. Tải danh sách đơn hàng từ API
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/orders');
      setOrders(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 2. Đổi nhanh trạng thái đơn hàng
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await api.put(`/admin/orders/${orderId}/status`, {
        TrangThaiDonHang: newStatus
      });

      const msg = res.data.message || `Đã cập nhật đơn hàng #${orderId} sang "${newStatus}"`;
      toast.success(msg, { id: `order-status-${orderId}` });

      // Update state tại chỗ
      setOrders((prev) =>
        prev.map((order) =>
          order.MaDonHang === orderId ? { ...order, TrangThaiDonHang: newStatus } : order
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật trạng thái thất bại', { id: `order-status-${orderId}` });
    } finally {
      setUpdatingId(null);
    }
  };

  // 3. Đếm số đơn hàng theo từng tab
  const tabCounts = useMemo(() => {
    const counts = { ALL: orders.length, PENDING: 0, PROCESSING: 0, SHIPPING: 0, DELIVERED: 0, CANCELLED: 0 };
    orders.forEach((o) => {
      const st = o.TrangThaiDonHang;
      if (st === 'Chờ xác nhận') counts.PENDING++;
      else if (st === 'Đang xử lý') counts.PROCESSING++;
      else if (st === 'Đang giao') counts.SHIPPING++;
      else if (st === 'Đã giao') counts.DELIVERED++;
      else if (st === 'Đã hủy') counts.CANCELLED++;
    });
    return counts;
  }, [orders]);

  // 4. Lọc đơn hàng theo tab + search
  const filteredOrders = useMemo(() => {
    const activeTabObj = ORDER_TABS.find((t) => t.id === activeTab);
    const tabStatus = activeTabObj?.status;

    return orders.filter((order) => {
      const orderCode = formatOrderCode(order.MaDonHang, order.NgayMuaHang);
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        String(order.MaDonHang).includes(searchLower) ||
        orderCode.toLowerCase().includes(searchLower) ||
        (order.KhachHang || order.TenNguoiNhan || '').toLowerCase().includes(searchLower);

      const matchesTab = !tabStatus || order.TrangThaiDonHang === tabStatus;

      return matchesSearch && matchesTab;
    });
  }, [orders, searchTerm, activeTab]);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">

      {/* ── Action Bar (Top Right) ── */}
      <div className="flex justify-end">
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 text-xs font-medium transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* ── Search Bar ── */}
      <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3">
        <Search className="w-5 h-5 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          placeholder="Tìm kiếm theo mã đơn (SZ... / #123) hoặc tên khách hàng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none text-slate-200 text-sm focus:outline-none placeholder-slate-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-700/50 rounded-lg shrink-0"
          >
            Xóa
          </button>
        )}
      </div>

      {/* ── 6 TABS ── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="flex items-stretch overflow-x-auto">
          {ORDER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id] || 0;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[110px] flex flex-col items-center justify-center gap-1.5 px-3 py-3.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? TAB_ACTIVE_STYLE[tab.id]
                    : 'text-slate-500 hover:text-slate-300 border-b-2 border-transparent hover:bg-slate-700/30'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        {error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <p className="text-slate-300 font-medium">{error}</p>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-200">
              <thead className="bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 w-44">Mã đơn</th>
                  <th className="px-6 py-4 w-48">Ngày đặt</th>
                  <th className="px-6 py-4">Khách hàng</th>
                  <th className="px-6 py-4 text-right w-44">Tổng tiền</th>
                  <th className="px-6 py-4 text-center w-56">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-40" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-700/50 rounded w-24 ml-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-8 bg-slate-700/50 rounded-xl w-36 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      {searchTerm || activeTab !== 'ALL' ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng nào'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const statusStyle = STATUS_STYLE_MAP[order.TrangThaiDonHang] || 'bg-slate-700 text-slate-300 border-slate-600';
                    const isUpdating = updatingId === order.MaDonHang;

                    return (
                      <tr key={order.MaDonHang} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-6 py-4 font-bold text-sky-400 font-mono tracking-wider text-xs sm:text-sm">
                          {formatOrderCode(order.MaDonHang, order.NgayMuaHang)}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-300 font-medium">
                          {formatDate(order.NgayMuaHang)}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-100">
                          {order.KhachHang || order.TenNguoiNhan || 'Khách hàng'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-400">
                          {formatVND(order.TongTien)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {/* Dropdown Đổi Nhanh Trạng Thái - chỉ 5 trạng thái chuẩn */}
                          <div className="relative inline-block w-44">
                            <select
                              value={order.TrangThaiDonHang || 'Chờ xác nhận'}
                              disabled={isUpdating}
                              onChange={(e) => handleStatusChange(order.MaDonHang, e.target.value)}
                              className={`w-full appearance-none px-3 py-2 min-h-[38px] rounded-xl border text-xs font-semibold text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${statusStyle} ${
                                isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'
                              }`}
                            >
                              {ORDER_STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st} className="bg-slate-900 text-slate-200 py-1 text-left">
                                  {st}
                                </option>
                              ))}
                            </select>
                            {isUpdating && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 rounded-xl">
                                <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                              </div>
                            )}
                          </div>
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

export default OrderListPage;
