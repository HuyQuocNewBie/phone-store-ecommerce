import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ShoppingCart, RefreshCw, Search, AlertCircle, CheckCircle2, Filter
} from 'lucide-react';
import api from '../../services/api';

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

// ── Danh sách Trạng thái Đơn hàng ──
const ORDER_STATUS_OPTIONS = [
  'Chờ xác nhận',
  'Đang xử lý',
  'Đang giao',
  'Đã hoàn thành',
  'Đã hủy'
];

// ── Map Màu cho Trạng thái ──
const STATUS_STYLE_MAP = {
  'Chờ xác nhận': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'Đang xử lý': 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  'Đang giao': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Đã hoàn thành': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Đã hủy': 'bg-rose-500/10 text-rose-400 border-rose-500/30'
};

const OrderPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
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

  // Lọc đơn hàng
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      String(order.MaDonHang).includes(searchTerm) ||
      (order.KhachHang || order.TenNguoiNhan || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || order.TrangThaiDonHang === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-sky-400" />
            Quản lý Đơn hàng
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Xem danh sách đơn hàng và cập nhật nhanh trạng thái xử lý
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 text-xs font-medium transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-8 flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3">
          <Search className="w-5 h-5 text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã đơn (#123) hoặc tên khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none text-slate-200 text-sm focus:outline-none placeholder-slate-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-700/50 rounded-lg"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Filter Status Dropdown */}
        <div className="sm:col-span-4 flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl px-3 py-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-transparent border-none text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-slate-800 text-slate-200">Tất cả trạng thái</option>
            {ORDER_STATUS_OPTIONS.map((st) => (
              <option key={st} value={st} className="bg-slate-800 text-slate-200">
                {st}
              </option>
            ))}
          </select>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-200">
              <thead className="bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 w-32">Mã đơn</th>
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
                      {searchTerm || statusFilter !== 'ALL' ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng nào'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const statusStyle = STATUS_STYLE_MAP[order.TrangThaiDonHang] || 'bg-slate-700 text-slate-300 border-slate-600';
                    const isUpdating = updatingId === order.MaDonHang;

                    return (
                      <tr key={order.MaDonHang} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-6 py-4 font-bold text-sky-400">
                          #{order.MaDonHang}
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
                          {/* Dropdown Đổi Nhanh Trạng Thái Direct In-Table */}
                          <div className="relative inline-block w-44">
                            <select
                              value={order.TrangThaiDonHang || 'Chờ xác nhận'}
                              disabled={isUpdating}
                              onChange={(e) => handleStatusChange(order.MaDonHang, e.target.value)}
                              className={`w-full appearance-none px-3 py-1.5 rounded-xl border text-xs font-semibold text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${statusStyle} ${
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

export default OrderPage;
