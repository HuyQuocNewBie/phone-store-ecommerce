import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Warehouse,
  Package,
  PackageCheck,
  Truck,
  User,
  Phone,
  MapPin,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  LogOut,
  LayoutDashboard,
  Smartphone,
  HardDrive,
  Palette,
  Barcode,
  ClipboardCheck,
  CheckSquare,
  Square,
  FileText,
  X,
  Loader2,
  Boxes,
  RotateCcw,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatOrderCode, formatVND, formatDateTime } from '../../utils/formatters';

const TABS = [
  {
    id: 'pending_pack',
    label: 'Chờ đóng gói',
    status: 'DaXacNhan',
    icon: Package,
    description: 'Đơn đã xác nhận — cần nhặt đúng máy trên kệ và đóng gói',
  },
  {
    id: 'ready_ship',
    label: 'Sẵn sàng giao',
    status: 'DangDongGoi',
    icon: Truck,
    description: 'Kiện hàng đã đóng gói xong — sẵn sàng bàn giao cho Shipper',
  },
];

const slugToken = (value) => {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toUpperCase()
    .slice(0, 6);
};

const getItemSku = (item) => {
  if (item?.SKU) return String(item.SKU).trim();
  if (item?.sku) return String(item.sku).trim();
  if (item?.MaSKU) return String(item.MaSKU).trim();

  const base = `SP${String(item?.MaSanPham || 0).padStart(4, '0')}`;
  const storageCode = slugToken(item?.DungLuong);
  const colorCode = slugToken(item?.MauSac);
  return [base, storageCode, colorCode].filter(Boolean).join('-');
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
  return 'bg-sky-500';
};

const getOrderItems = (order) => {
  if (Array.isArray(order?.chitietdonhang)) return order.chitietdonhang;
  if (Array.isArray(order?.ChiTietDonHang)) return order.ChiTietDonHang;
  return [];
};

const WarehouseFulfillmentPage = () => {
  const { user, logout, isAdmin } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending_pack');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingIds, setProcessingIds] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [pickedItems, setPickedItems] = useState({});

  const fetchFulfillmentOrders = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await api.get('/warehouse/orders/fulfillment');
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setOrders(data);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể tải danh sách đơn hàng kho. Vui lòng thử lại.';
      setError(msg);
      if (silent) {
        toast.error(msg, { id: 'warehouse-fetch-err' });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFulfillmentOrders();
  }, [fetchFulfillmentOrders]);

  // Phân loại đơn theo 2 trạng thái chuẩn của Kho
  const pendingPackOrders = useMemo(
    () => orders.filter((order) => order.TrangThaiDonHang === 'DaXacNhan'),
    [orders]
  );

  const readyShipOrders = useMemo(
    () => orders.filter((order) => order.TrangThaiDonHang === 'DangDongGoi'),
    [orders]
  );

  const totalUnitsPendingPack = useMemo(
    () =>
      pendingPackOrders.reduce(
        (sum, order) =>
          sum + getOrderItems(order).reduce((s, it) => s + Number(it.SoLuong || 0), 0),
        0
      ),
    [pendingPackOrders]
  );

  const totalUnitsReadyShip = useMemo(
    () =>
      readyShipOrders.reduce(
        (sum, order) =>
          sum + getOrderItems(order).reduce((s, it) => s + Number(it.SoLuong || 0), 0),
        0
      ),
    [readyShipOrders]
  );

  const currentTabConfig = useMemo(
    () => TABS.find((t) => t.id === activeTab) || TABS[0],
    [activeTab]
  );

  const tabOrders = activeTab === 'pending_pack' ? pendingPackOrders : readyShipOrders;

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return tabOrders;

    return tabOrders.filter((order) => {
      const orderCode = (
        order.CodeDonHang || formatOrderCode(order.MaDonHang, order.NgayMuaHang)
      ).toLowerCase();
      const orderIdStr = String(order.MaDonHang || '').toLowerCase();
      const recipientName = String(order.TenNguoiNhan || '').toLowerCase();
      const phone = String(order.SoDienThoai || '').toLowerCase();
      const address = String(order.DiaChiGiaoHang || '').toLowerCase();

      if (
        orderCode.includes(keyword) ||
        orderIdStr.includes(keyword) ||
        recipientName.includes(keyword) ||
        phone.includes(keyword) ||
        address.includes(keyword)
      ) {
        return true;
      }

      const items = getOrderItems(order);
      return items.some((item) => {
        const name = String(item.TenSanPham || '').toLowerCase();
        const sku = getItemSku(item).toLowerCase();
        const color = String(item.MauSac || '').toLowerCase();
        const storage = String(item.DungLuong || '').toLowerCase();
        return (
          name.includes(keyword) ||
          sku.includes(keyword) ||
          color.includes(keyword) ||
          storage.includes(keyword)
        );
      });
    });
  }, [tabOrders, searchTerm]);

  const handleCopyText = async (text, key) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
      setCopiedKey(key);
      toast.success(`Đã sao chép: ${text}`, { id: `copy-${key}`, duration: 1800 });
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1800);
    } catch {
      toast.error('Không thể sao chép vào bộ nhớ tạm');
    }
  };

  const getItemPickKey = (orderId, item, idx) =>
    `${orderId}_${item.MaChiTietDonHang || `${item.MaSanPham}_${idx}`}`;

  const togglePickItem = (orderId, item, idx) => {
    const key = getItemPickKey(orderId, item, idx);
    setPickedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const togglePickAllOrderItems = (order) => {
    const items = getOrderItems(order);
    if (items.length === 0) return;

    const allPicked = items.every(
      (item, idx) => !!pickedItems[getItemPickKey(order.MaDonHang, item, idx)]
    );

    setPickedItems((prev) => {
      const next = { ...prev };
      items.forEach((item, idx) => {
        const key = getItemPickKey(order.MaDonHang, item, idx);
        if (allPicked) {
          delete next[key];
        } else {
          next[key] = true;
        }
      });
      return next;
    });
  };

  const clearOrderPickedState = (order) => {
    const items = getOrderItems(order);
    setPickedItems((prev) => {
      const next = { ...prev };
      items.forEach((item, idx) => {
        delete next[getItemPickKey(order.MaDonHang, item, idx)];
      });
      return next;
    });
  };

  // Gọi API PUT /api/v1/warehouse/orders/:id/pack (DaXacNhan -> DangDongGoi)
  const handlePackOrder = async (order) => {
    const orderId = order.MaDonHang;
    if (processingIds[orderId]) return;

    const orderCode =
      order.CodeDonHang || formatOrderCode(order.MaDonHang, order.NgayMuaHang);

    setProcessingIds((prev) => ({ ...prev, [orderId]: 'pack' }));
    try {
      const res = await api.put(`/warehouse/orders/${orderId}/pack`);
      const nextStatus = res.data?.data?.TrangThaiDonHang || 'DangDongGoi';

      setOrders((prev) =>
        prev.map((o) =>
          o.MaDonHang === orderId ? { ...o, TrangThaiDonHang: nextStatus } : o
        )
      );
      clearOrderPickedState(order);

      toast.success(
        `Đơn ${orderCode} đã xác nhận đóng gói — chuyển sang tab "Sẵn sàng giao"`,
        { id: `pack-${orderId}` }
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        `Không thể xác nhận đóng gói đơn ${orderCode}`;
      toast.error(msg, { id: `pack-${orderId}` });
      if (err.response?.status === 400 || err.response?.status === 404) {
        fetchFulfillmentOrders({ silent: true });
      }
    } finally {
      setProcessingIds((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  // Gọi API PUT /api/v1/warehouse/orders/:id/ship (DangDongGoi -> DangGiao)
  const handleShipOrder = async (order) => {
    const orderId = order.MaDonHang;
    if (processingIds[orderId]) return;

    const orderCode =
      order.CodeDonHang || formatOrderCode(order.MaDonHang, order.NgayMuaHang);

    setProcessingIds((prev) => ({ ...prev, [orderId]: 'ship' }));
    try {
      const res = await api.put(`/warehouse/orders/${orderId}/ship`);
      const nextStatus = res.data?.data?.TrangThaiDonHang || 'DangGiao';

      setOrders((prev) =>
        prev.map((o) =>
          o.MaDonHang === orderId ? { ...o, TrangThaiDonHang: nextStatus } : o
        )
      );

      toast.success(`Đã bàn giao đơn ${orderCode} cho Shipper!`, {
        id: `ship-${orderId}`,
      });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        `Không thể bàn giao đơn ${orderCode} cho Shipper`;
      toast.error(msg, { id: `ship-${orderId}` });
      if (err.response?.status === 400 || err.response?.status === 404) {
        fetchFulfillmentOrders({ silent: true });
      }
    } finally {
      setProcessingIds((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  const staffName = user?.HoTen || user?.TaiKhoan || 'Nhân viên Kho';

  return (
    <div className="min-h-screen bg-[#faf8ff] text-slate-900 flex flex-col">
      {/* ── Top Warehouse Portal Header ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Kho Vận SmartZone
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  Fulfillment
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Quản lý Soạn hàng, Đóng gói &amp; Bàn giao Shipper
              </p>
            </div>
          </div>

          {/* Portal Switcher Navigation */}
          <nav
            aria-label="Điều hướng phân hệ Kho"
            className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200"
          >
            <Link
              to="/warehouse/fulfillment"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-blue-700 shadow-xs border border-slate-200/80"
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Soạn hàng &amp; Đóng gói</span>
            </Link>
            <Link
              to="/warehouse/inventory"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Tồn kho &amp; Lệch kho</span>
            </Link>
            <Link
              to="/warehouse/returns"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kiểm định Đổi trả</span>
            </Link>
          </nav>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Staff Info Pill */}
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0">
                {user?.AnhDaiDien ? (
                  <img
                    src={user.AnhDaiDien}
                    alt={staffName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  staffName[0]?.toUpperCase() || 'K'
                )}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-slate-800 max-w-[140px] truncate">
                  {staffName}
                </p>
                <p className="text-[10px] font-medium text-sky-600">
                  {isAdmin ? 'Quản trị viên' : 'Nhân viên Kho'}
                </p>
              </div>
            </div>

            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin Dashboard</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => fetchFulfillmentOrders({ silent: true })}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-all shadow-2xs disabled:opacity-60 cursor-pointer"
              title="Tải lại danh sách đơn kho"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-sky-600 ${
                  loading || refreshing ? 'animate-spin' : ''
                }`}
              />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 text-xs font-semibold transition-all cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('pending_pack')}
            className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'pending_pack'
                ? 'border-sky-400 ring-2 ring-sky-500/15 shadow-md'
                : 'border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Chờ đóng gói
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-sky-600">
                  {pendingPackOrders.length}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  đơn hàng
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Cần nhặt{' '}
                <strong className="text-slate-700">{totalUnitsPendingPack}</strong>{' '}
                máy trên kệ
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <Package className="w-6 h-6" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ready_ship')}
            className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'ready_ship'
                ? 'border-indigo-400 ring-2 ring-indigo-500/15 shadow-md'
                : 'border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Sẵn sàng giao
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-indigo-600">
                  {readyShipOrders.length}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  đơn hàng
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Gồm{' '}
                <strong className="text-slate-700">{totalUnitsReadyShip}</strong>{' '}
                máy chờ bàn giao Shipper
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
          </button>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tổng xử lý tại kho
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-800">
                  {pendingPackOrders.length + readyShipOrders.length}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  đơn hàng
                </span>
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Tổng cộng {totalUnitsPendingPack + totalUnitsReadyShip} thiết bị
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ── Tabs + Search Controls ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 border-b border-slate-200">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              const count =
                tab.id === 'pending_pack'
                  ? pendingPackOrders.length
                  : readyShipOrders.length;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2.5 px-4 py-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                    isActive
                      ? tab.id === 'pending_pack'
                        ? 'border-sky-600 text-sky-700 bg-sky-50/70'
                        : 'border-indigo-600 text-indigo-700 bg-indigo-50/70'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <TabIcon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isActive
                        ? tab.id === 'pending_pack'
                          ? 'bg-sky-600 text-white'
                          : 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <ClipboardCheck className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{currentTabConfig.description}</span>
            </div>

            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã đơn, tên người nhận, SĐT, SKU, màu sắc..."
                className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Orders Content Area ── */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-4"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="h-5 w-44 bg-slate-200 rounded-lg" />
                  <div className="h-6 w-32 bg-slate-200 rounded-full" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-4 h-36 bg-slate-100 rounded-xl" />
                  <div className="lg:col-span-8 h-36 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white border border-rose-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
            <AlertCircle className="w-11 h-11 text-rose-500 mx-auto" />
            <h2 className="text-base font-bold text-slate-800">
              Không tải được dữ liệu kho
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => fetchFulfillmentOrders()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Thử lại
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              {activeTab === 'pending_pack' ? (
                <PackageCheck className="w-7 h-7" />
              ) : (
                <Truck className="w-7 h-7" />
              )}
            </div>
            <h2 className="text-base font-bold text-slate-800">
              {searchTerm
                ? 'Không tìm thấy đơn hàng phù hợp'
                : activeTab === 'pending_pack'
                ? 'Không có đơn hàng nào đang chờ đóng gói'
                : 'Chưa có đơn hàng nào sẵn sàng giao'}
            </h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              {searchTerm
                ? `Không có đơn nào khớp với từ khóa "${searchTerm}" trong tab "${currentTabConfig.label}".`
                : activeTab === 'pending_pack'
                ? 'Tất cả đơn hàng đã xác nhận đều đã được soạn và đóng gói xong.'
                : 'Hãy xác nhận đóng gói đơn hàng ở tab "Chờ đóng gói" để chuyển đơn sang danh sách chờ bàn giao Shipper.'}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Xóa bộ lọc tìm kiếm
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => {
              const items = getOrderItems(order);
              const orderCode =
                order.CodeDonHang ||
                formatOrderCode(order.MaDonHang, order.NgayMuaHang);
              const totalUnits = items.reduce(
                (sum, it) => sum + Number(it.SoLuong || 0),
                0
              );
              const isProcessing = !!processingIds[order.MaDonHang];
              const isPendingPack = order.TrangThaiDonHang === 'DaXacNhan';

              const pickedCount = items.filter(
                (item, idx) =>
                  !!pickedItems[getItemPickKey(order.MaDonHang, item, idx)]
              ).length;
              const allItemsPicked =
                items.length > 0 && pickedCount === items.length;

              return (
                <article
                  key={order.MaDonHang}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* ── Card Header: Order Code, Timestamp, Status ── */}
                  <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm sm:text-base font-extrabold text-sky-700 tracking-wide">
                          {orderCode}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(orderCode, `code-${order.MaDonHang}`)
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                          title="Sao chép mã đơn hàng"
                        >
                          {copiedKey === `code-${order.MaDonHang}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <span className="text-xs font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                        ID #{order.MaDonHang}
                      </span>

                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateTime(order.NgayMuaHang)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                        <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                        {totalUnits} máy ({items.length} SKU)
                      </span>

                      <span className="text-sm font-bold text-emerald-600">
                        {formatVND(order.TongTien)}
                      </span>

                      {isPendingPack ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                          Chờ đóng gói
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          Đang đóng gói · Sẵn sàng giao
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Card Body: Recipient Details + Picking Items ── */}
                  <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left 4 cols: Thông tin giao nhận đầy đủ */}
                    <div className="lg:col-span-4 bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-3 h-fit">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-sky-600" />
                          Thông tin người nhận
                        </h3>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              `${order.TenNguoiNhan || ''} - ${order.SoDienThoai || ''} - ${order.DiaChiGiaoHang || ''}`,
                              `addr-${order.MaDonHang}`
                            )
                          }
                          className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                          title="Sao chép thông tin giao hàng"
                        >
                          {copiedKey === `addr-${order.MaDonHang}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="space-y-3 text-xs sm:text-sm">
                        <div className="flex items-start gap-2.5">
                          <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                              Tên người nhận
                            </p>
                            <p className="font-bold text-slate-900">
                              {order.TenNguoiNhan || 'Khách hàng'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                              Số điện thoại
                            </p>
                            <p className="font-bold font-mono text-slate-800">
                              {order.SoDienThoai || 'Chưa cập nhật'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                              Địa chỉ giao hàng
                            </p>
                            <p className="font-medium text-slate-700 leading-relaxed break-words">
                              {order.DiaChiGiaoHang || 'Chưa có địa chỉ giao hàng'}
                            </p>
                          </div>
                        </div>

                        {order.GhiChu && (
                          <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-bold">Ghi chú: </span>
                              <span>{order.GhiChu}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right 8 cols: Danh sách máy từ chitietdonhang (SKU, Màu sắc, Dung lượng) */}
                    <div className="lg:col-span-8 flex flex-col">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Barcode className="w-4 h-4 text-sky-600" />
                          Danh sách máy cần soạn ({items.length} dòng)
                        </h3>

                        {isPendingPack && items.length > 0 && (
                          <button
                            type="button"
                            onClick={() => togglePickAllOrderItems(order)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              allItemsPicked
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {allItemsPicked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>
                              {allItemsPicked
                                ? 'Đã kiểm đủ kệ'
                                : 'Đánh dấu đã nhặt hết'}
                            </span>
                          </button>
                        )}
                      </div>

                      {items.length === 0 ? (
                        <div className="flex-1 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
                          Đơn hàng chưa có dữ liệu chi tiết sản phẩm.
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                          {items.map((item, idx) => {
                            const sku = getItemSku(item);
                            const pickKey = getItemPickKey(
                              order.MaDonHang,
                              item,
                              idx
                            );
                            const isPicked = isPendingPack && !!pickedItems[pickKey];
                            const qty = Number(item.SoLuong || 1);

                            return (
                              <div
                                key={item.MaChiTietDonHang || `${item.MaSanPham}-${idx}`}
                                className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3.5 transition-colors ${
                                  isPicked
                                    ? 'bg-emerald-50/60'
                                    : 'bg-white hover:bg-slate-50/70'
                                }`}
                              >
                                <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                                  {/* Pick Checklist Checkbox (Tab 1 helper, non-blocking) */}
                                  {isPendingPack && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        togglePickItem(order.MaDonHang, item, idx)
                                      }
                                      className="mt-1 sm:mt-0 p-1 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
                                      title={
                                        isPicked
                                          ? 'Bỏ đánh dấu đã nhặt'
                                          : 'Đánh dấu đã nhặt đúng máy trên kệ'
                                      }
                                      aria-label="Đánh dấu đã nhặt máy"
                                    >
                                      {isPicked ? (
                                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                                      ) : (
                                        <Square className="w-5 h-5 text-slate-300" />
                                      )}
                                    </button>
                                  )}

                                  {/* Thumbnail */}
                                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                                    {item.Anh ? (
                                      <img
                                        src={item.Anh}
                                        alt={item.TenSanPham || 'Sản phẩm'}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.style.display = 'none';
                                          if (e.currentTarget.nextSibling) {
                                            e.currentTarget.nextSibling.style.display =
                                              'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <div
                                      className={`w-full h-full items-center justify-center text-slate-300 ${
                                        item.Anh ? 'hidden' : 'flex'
                                      }`}
                                    >
                                      <Smartphone className="w-6 h-6" />
                                    </div>
                                  </div>

                                  {/* Product Name + SKU + Màu sắc + Dung lượng */}
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4
                                        className={`text-sm font-bold leading-snug ${
                                          isPicked
                                            ? 'text-emerald-800'
                                            : 'text-slate-900'
                                        }`}
                                      >
                                        {item.TenSanPham || 'Thiết bị di động'}
                                      </h4>
                                      {isPicked && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                          <CheckCircle2 className="w-3 h-3" />
                                          Đã nhặt
                                        </span>
                                      )}
                                    </div>

                                    {/* SKU, Màu sắc, Dung lượng Badges */}
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 font-mono font-bold text-slate-800">
                                        <Barcode className="w-3.5 h-3.5 text-slate-500" />
                                        SKU: {sku}
                                      </span>

                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 border border-purple-200/80 text-purple-800 font-semibold">
                                        <span
                                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${getColorDotClass(
                                            item.MauSac
                                          )}`}
                                        />
                                        <Palette className="w-3 h-3 text-purple-500" />
                                        <span>
                                          Màu:{' '}
                                          <strong>
                                            {item.MauSac || 'Mặc định'}
                                          </strong>
                                        </span>
                                      </span>

                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-50 border border-sky-200/80 text-sky-800 font-semibold">
                                        <HardDrive className="w-3.5 h-3.5 text-sky-600" />
                                        <span>
                                          Dung lượng:{' '}
                                          <strong>
                                            {item.DungLuong || 'Tiêu chuẩn'}
                                          </strong>
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Quantity to Pick & Stock / Price */}
                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 pl-9 sm:pl-0 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                                  <span
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-extrabold border ${
                                      qty > 1
                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}
                                  >
                                    SL: &times;{qty}
                                  </span>

                                  <div className="text-[11px] text-slate-400 text-right">
                                    <span>Mã SP #{item.MaSanPham}</span>
                                    {item.TonKho !== undefined && (
                                      <span className="ml-2 text-slate-500 font-medium">
                                        · Kho: {item.TonKho}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Card Footer: Picking Progress & Primary Action Button ── */}
                  <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {isPendingPack ? (
                        pickedCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Đã kiểm trên kệ: {pickedCount}/{items.length} dòng máy
                          </span>
                        ) : (
                          <span>
                            Kiểm tra đúng <strong>SKU</strong>,{' '}
                            <strong>Màu sắc</strong>, <strong>Dung lượng</strong>{' '}
                            trước khi đóng gói.
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-indigo-700">
                          <PackageCheck className="w-4 h-4 text-indigo-600" />
                          Kiện hàng đã niêm phong — sẵn sàng bàn giao đơn vị vận chuyển.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-end">
                      {isPendingPack ? (
                        <button
                          type="button"
                          onClick={() => handlePackOrder(order)}
                          disabled={isProcessing}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-bold shadow-sm shadow-blue-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Đang cập nhật...</span>
                            </>
                          ) : (
                            <>
                              <PackageCheck className="w-4 h-4" />
                              <span>Xác nhận Đóng gói</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleShipOrder(order)}
                          disabled={isProcessing}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-sm font-bold shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Đang bàn giao...</span>
                            </>
                          ) : (
                            <>
                              <Truck className="w-4 h-4" />
                              <span>Bàn giao Shipper</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default WarehouseFulfillmentPage;
