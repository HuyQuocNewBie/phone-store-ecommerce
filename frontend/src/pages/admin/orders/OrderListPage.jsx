import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  ShoppingCart, RefreshCw, Search, AlertCircle,
  CheckCircle2, Clock, Settings, Truck, XCircle, Package,
  Eye, X, User, Phone, MapPin, FileText, CreditCard, ChevronDown, Check
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

// ── Map Màu cho Trạng thái (Tông màu sáng) ──
const STATUS_STYLE_MAP = {
  'Chờ xác nhận': 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  'Đang xử lý':   'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  'Đang giao':    'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  'Đã giao':      'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  'Đã hủy':       'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
};

// ── Màu Tab khi active (Tông màu sáng) ──
const TAB_ACTIVE_STYLE = {
  ALL:        'text-sky-700 border-b-2 border-sky-600 bg-sky-50/70 font-semibold',
  PENDING:    'text-purple-700 border-b-2 border-purple-600 bg-purple-50/70 font-semibold',
  PROCESSING: 'text-sky-700 border-b-2 border-sky-600 bg-sky-50/70 font-semibold',
  SHIPPING:   'text-amber-700 border-b-2 border-amber-600 bg-amber-50/70 font-semibold',
  DELIVERED:  'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/70 font-semibold',
  CANCELLED:  'text-rose-700 border-b-2 border-rose-600 bg-rose-50/70 font-semibold',
};

const OrderListPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  // Modal Chi tiết Đơn Hàng State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDetail, setModalDetail] = useState(null);

  // 1. Tải danh sách đơn hàng từ API
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/orders');
      setOrders(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 2. Mở Modal Xem Chi Tiết Đơn Hàng
  const handleOpenDetailModal = async (order) => {
    setSelectedOrder(order);
    setModalLoading(true);
    setModalDetail(null);

    try {
      const res = await api.get(`/admin/orders/${order.MaDonHang}`);
      if (res.data?.success && res.data.data) {
        setModalDetail(res.data.data);
      } else {
        // Fallback dùng dữ liệu hiện có trong danh sách nếu API detail không trả về
        setModalDetail({
          ...order,
          chitietdonhang: []
        });
      }
    } catch (err) {
      console.warn('Lỗi tải chi tiết đơn hàng qua API:', err);
      // Fallback lấy thông tin cơ bản
      setModalDetail({
        ...order,
        chitietdonhang: []
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
    setModalDetail(null);
  };

  // 3. Đổi nhanh trạng thái đơn hàng
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await api.put(`/admin/orders/${orderId}/status`, {
        TrangThaiDonHang: newStatus
      });

      const msg = res.data?.message || `Đã cập nhật đơn hàng #${orderId} sang "${newStatus}"`;
      toast.success(msg, { id: `order-status-${orderId}` });

      // Update state tại chỗ trong danh sách
      setOrders((prev) =>
        prev.map((order) =>
          order.MaDonHang === orderId ? { ...order, TrangThaiDonHang: newStatus } : order
        )
      );

      // Cập nhật cả trong modal nếu đang mở đơn này
      if (selectedOrder && selectedOrder.MaDonHang === orderId) {
        setSelectedOrder((prev) => ({ ...prev, TrangThaiDonHang: newStatus }));
        setModalDetail((prev) => prev ? { ...prev, TrangThaiDonHang: newStatus } : null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật trạng thái thất bại', { id: `order-status-${orderId}` });
    } finally {
      setUpdatingId(null);
    }
  };

  // 4. Thống kê số lượng theo tab và doanh thu
  const stats = useMemo(() => {
    const counts = { ALL: orders.length, PENDING: 0, PROCESSING: 0, SHIPPING: 0, DELIVERED: 0, CANCELLED: 0 };
    let totalDeliveredRevenue = 0;

    orders.forEach((o) => {
      const st = o.TrangThaiDonHang;
      if (st === 'Chờ xác nhận') counts.PENDING++;
      else if (st === 'Đang xử lý') counts.PROCESSING++;
      else if (st === 'Đang giao') counts.SHIPPING++;
      else if (st === 'Đã giao') {
        counts.DELIVERED++;
        totalDeliveredRevenue += Number(o.TongTien || 0);
      }
      else if (st === 'Đã hủy') counts.CANCELLED++;
    });

    return { counts, totalDeliveredRevenue };
  }, [orders]);

  // 5. Lọc đơn hàng theo tab + search
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
        (order.KhachHang || order.TenNguoiNhan || '').toLowerCase().includes(searchLower) ||
        (order.SoDienThoai || '').includes(searchLower);

      const matchesTab = !tabStatus || order.TrangThaiDonHang === tabStatus;

      return matchesSearch && matchesTab;
    });
  }, [orders, searchTerm, activeTab]);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">

      {/* ── Top Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="w-7 h-7 text-sky-600" />
            Quản lý Đơn Hàng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi danh sách, tra cứu chi tiết và cập nhật tiến độ giao dịch
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold transition-all shadow-sm"
            title="Tải lại danh sách đơn hàng"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 4 Card Thống Kê Chỉ Số (Light Theme) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng đơn hàng */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng đơn hàng</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{orders.length}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Tất cả giao dịch phát sinh</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Chờ xử lý */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chờ xác nhận</p>
            <h3 className="text-2xl font-bold text-purple-600 mt-1">{stats.counts.PENDING}</h3>
            <span className="text-[11px] text-purple-500 font-medium mt-0.5 block">Cần nhân viên duyệt</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Đang giao hàng */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang vận chuyển</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.counts.SHIPPING}</h3>
            <span className="text-[11px] text-amber-500 font-medium mt-0.5 block">Đang trên đường giao</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Đã hoàn thành & Doanh thu */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã giao thành công</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.counts.DELIVERED}</h3>
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
              Thu về: {formatVND(stats.totalDeliveredRevenue)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Search Bar (Tông sáng) ── */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <Search className="w-5 h-5 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          placeholder="Tìm kiếm theo mã đơn (SZ... / #123), tên khách hàng hoặc số điện thoại..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none text-slate-800 text-sm focus:outline-none placeholder-slate-400"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
          >
            Xóa tìm kiếm
          </button>
        )}
      </div>

      {/* ── 6 Tabs Phân Loại Trạng Thái (Tông sáng) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-stretch overflow-x-auto divide-x divide-slate-100">
          {ORDER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = stats.counts[tab.id] || 0;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[120px] flex flex-col items-center justify-center gap-1 px-3 py-3 text-xs transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? TAB_ACTIVE_STYLE[tab.id]
                    : 'text-slate-500 hover:text-slate-800 border-b-2 border-transparent hover:bg-slate-50'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table Section (Tông sáng) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-slate-700 font-medium">{error}</p>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-44">Mã đơn hàng</th>
                  <th className="px-6 py-4 w-44">Ngày đặt</th>
                  <th className="px-6 py-4">Khách hàng / SĐT</th>
                  <th className="px-6 py-4 text-right w-44">Tổng tiền</th>
                  <th className="px-6 py-4 text-center w-52">Trạng thái</th>
                  <th className="px-6 py-4 text-center w-36">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-40" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-24 ml-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-8 bg-slate-200 rounded-xl w-36 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-8 bg-slate-200 rounded-xl w-24 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-slate-400">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="text-slate-500 font-medium">
                        {searchTerm || activeTab !== 'ALL' ? 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc' : 'Chưa có đơn hàng nào trong hệ thống'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const statusStyle = STATUS_STYLE_MAP[order.TrangThaiDonHang] || 'bg-slate-100 text-slate-700 border-slate-200';
                    const isUpdating = updatingId === order.MaDonHang;
                    const orderCode = formatOrderCode(order.MaDonHang, order.NgayMuaHang);

                    return (
                      <tr key={order.MaDonHang} className="hover:bg-slate-50/80 transition-colors">
                        {/* Mã đơn (Clickable để mở xem chi tiết) */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleOpenDetailModal(order)}
                            className="font-bold text-sky-600 hover:text-sky-700 font-mono tracking-wider text-xs sm:text-sm hover:underline flex items-center gap-1.5"
                            title="Bấm để xem chi tiết đơn hàng"
                          >
                            <span>{orderCode}</span>
                          </button>
                        </td>

                        {/* Ngày đặt */}
                        <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                          {formatDate(order.NgayMuaHang)}
                        </td>

                        {/* Khách hàng & SĐT */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">
                            {order.KhachHang || order.TenNguoiNhan || 'Khách hàng'}
                          </div>
                          {order.SoDienThoai && (
                            <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{order.SoDienThoai}</span>
                            </div>
                          )}
                        </td>

                        {/* Tổng tiền */}
                        <td className="px-6 py-4 text-right font-bold text-emerald-600 text-sm">
                          {formatVND(order.TongTien)}
                        </td>

                        {/* Dropdown Đổi Nhanh Trạng Thái */}
                        <td className="px-6 py-4 text-center">
                          <div className="relative inline-block w-44">
                            <select
                              value={order.TrangThaiDonHang || 'Chờ xác nhận'}
                              disabled={isUpdating}
                              onChange={(e) => handleStatusChange(order.MaDonHang, e.target.value)}
                              className={`w-full appearance-none px-3 py-2 min-h-[38px] rounded-xl border text-xs font-semibold text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${statusStyle} ${
                                isUpdating ? 'opacity-50 cursor-not-allowed' : 'shadow-sm'
                              }`}
                            >
                              {ORDER_STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st} className="bg-white text-slate-700 py-1 text-left font-normal">
                                  {st}
                                </option>
                              ))}
                            </select>
                            {isUpdating ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
                                <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                              </div>
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            )}
                          </div>
                        </td>

                        {/* Nút Xem Chi Tiết */}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleOpenDetailModal(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm"
                            title="Xem chi tiết đơn hàng"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>
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

      {/* ── MODAL XEM CHI TIẾT ĐƠN HÀNG (Tông màu sáng cao cấp) ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">

            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-800 font-mono tracking-wide">
                      {formatOrderCode(selectedOrder.MaDonHang, selectedOrder.NgayMuaHang)}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      STATUS_STYLE_MAP[selectedOrder.TrangThaiDonHang] || 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {selectedOrder.TrangThaiDonHang}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thời gian đặt: {formatDate(selectedOrder.NgayMuaHang)}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                title="Đóng modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Modal (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
                  <p className="text-sm font-medium">Đang tải thông tin chi tiết đơn hàng...</p>
                </div>
              ) : (
                <>
                  {/* Grid 2 Thẻ: Thông tin nhận hàng & Thanh toán */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Thẻ 1: Khách hàng & Giao hàng */}
                    <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4 space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
                        <User className="w-3.5 h-3.5 text-sky-600" />
                        Thông tin giao nhận
                      </h4>
                      <div className="space-y-1.5 text-xs">
                        <p className="flex items-center gap-2">
                          <span className="text-slate-500 w-24 shrink-0">Người nhận:</span>
                          <span className="font-semibold text-slate-800">
                            {modalDetail?.TenNguoiNhan || selectedOrder.KhachHang || 'Khách hàng'}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="text-slate-500 w-24 shrink-0">Điện thoại:</span>
                          <span className="font-semibold text-slate-800 font-mono">
                            {modalDetail?.SoDienThoai || selectedOrder.SoDienThoai || 'Chưa cập nhật'}
                          </span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-slate-500 w-24 shrink-0">Địa chỉ:</span>
                          <span className="font-medium text-slate-700">
                            {modalDetail?.DiaChiGiaoHang || selectedOrder.DiaChiGiaoHang || 'Tại cửa hàng / Chưa nhập địa chỉ'}
                          </span>
                        </p>
                        {modalDetail?.GhiChu && (
                          <p className="flex items-start gap-2 pt-1 border-t border-slate-200">
                            <span className="text-slate-500 w-24 shrink-0">Ghi chú:</span>
                            <span className="text-slate-600 italic">{modalDetail.GhiChu}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Thẻ 2: Thanh toán & Vận chuyển */}
                    <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4 space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                        Thanh toán & Vận chuyển
                      </h4>
                      <div className="space-y-1.5 text-xs">
                        <p className="flex items-center gap-2">
                          <span className="text-slate-500 w-28 shrink-0">Hình thức:</span>
                          <span className="font-semibold text-slate-800">
                            {modalDetail?.PhuongThucThanhToan || 'Thanh toán khi nhận hàng (COD)'}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="text-slate-500 w-28 shrink-0">Phí vận chuyển:</span>
                          <span className="font-medium text-slate-700">
                            {formatVND(modalDetail?.PhiShip || selectedOrder.PhiShip || 0)}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="text-slate-500 w-28 shrink-0">Giảm giá voucher:</span>
                          <span className="font-semibold text-rose-600">
                            -{formatVND(modalDetail?.SoTienGiam || selectedOrder.SoTienGiam || 0)}
                          </span>
                        </p>
                        <p className="flex items-center gap-2 pt-1 border-t border-slate-200">
                          <span className="text-slate-500 w-28 shrink-0 font-bold">Tổng thanh toán:</span>
                          <span className="font-bold text-emerald-600 text-sm">
                            {formatVND(modalDetail?.TongTien || selectedOrder.TongTien)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách Sản phẩm Chi Tiết */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-sky-600" />
                        Danh sách sản phẩm trong đơn
                      </span>
                      <span className="text-xs text-slate-500 font-normal">
                        ({modalDetail?.chitietdonhang?.length || 0} sản phẩm)
                      </span>
                    </h4>

                    {(!modalDetail?.chitietdonhang || modalDetail.chitietdonhang.length === 0) ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                        <p className="text-xs text-slate-500">Chưa có thông tin chi tiết sản phẩm cho đơn hàng này.</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                        {modalDetail.chitietdonhang.map((item, index) => (
                          <div key={item.MaChiTietDonHang || index} className="p-3.5 bg-white hover:bg-slate-50/60 transition-colors flex items-center gap-4">
                            {/* Ảnh sản phẩm */}
                            <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.Anh ? (
                                <img
                                  src={item.Anh}
                                  alt={item.TenSanPham}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextSibling) {
                                      e.currentTarget.nextSibling.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full items-center justify-center text-slate-400 ${item.Anh ? 'hidden' : 'flex'}`}>
                                <Package className="w-6 h-6 text-slate-300" />
                              </div>
                            </div>

                            {/* Tên & Dòng Phân Loại Nổi Bật */}
                            <div className="flex-1 min-w-0">
                              <h5 className="font-semibold text-slate-800 text-sm truncate">
                                {item.TenSanPham || 'Sản phẩm'}
                              </h5>

                              {/* DÒNG PHÂN LOẠI: DungLuong | MauSac */}
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-slate-500 font-medium">Phân loại:</span>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-lg shadow-2xs">
                                  {item.DungLuong || 'Tiêu chuẩn'} | {item.MauSac || 'Tiêu chuẩn'}
                                </span>
                              </div>
                            </div>

                            {/* Số lượng & Đơn giá */}
                            <div className="text-right shrink-0">
                              <div className="font-semibold text-slate-800 text-sm">
                                {formatVND(item.TongGia || item.DonGia * item.SoLuong)}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {formatVND(item.DonGia)} &times; {item.SoLuong}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 whitespace-nowrap">Đổi trạng thái:</span>
                <select
                  value={selectedOrder.TrangThaiDonHang || 'Chờ xác nhận'}
                  onChange={(e) => handleStatusChange(selectedOrder.MaDonHang, e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/30 shadow-sm"
                >
                  {ORDER_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderListPage;
