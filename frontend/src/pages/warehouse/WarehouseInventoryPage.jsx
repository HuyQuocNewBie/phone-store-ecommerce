import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Warehouse,
  Boxes,
  Package,
  PackagePlus,
  ClipboardCheck,
  AlertTriangle,
  AlertCircle,
  Search,
  RefreshCw,
  LogOut,
  LayoutDashboard,
  Building2,
  Smartphone,
  HardDrive,
  Palette,
  Calculator,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Loader2,
  ArrowRight,
  FileText,
  Truck,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatVND, formatDateTime } from '../../utils/formatters';

const STOCK_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'in_stock', label: 'Còn hàng (≥ 5)' },
  { id: 'low_stock', label: 'Sắp hết (1 – 4)' },
  { id: 'out_of_stock', label: 'Hết hàng (0)' },
];

const QUICK_ADJUST_REASONS = [
  'Kiểm kê định kỳ phát hiện chênh lệch thực tế trên kệ',
  'Hàng bị trầy xước / móp hộp chuyển khu vực kiểm định',
  'Nhập bổ sung kiểm đếm thừa khi đối soát lô hàng',
];

const getStockBadge = (tonKho, productStatus) => {
  const qty = Number(tonKho) || 0;
  if (qty >= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Còn hàng
      </span>
    );
  }
  if (qty > 0) {
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
      {productStatus === 'NgungBan' ? 'Ngừng bán (0)' : 'Hết hàng'}
    </span>
  );
};

const getAdjustStatusBadge = (status) => {
  if (status === 'DaDuyet') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Admin đã duyệt
      </span>
    );
  }
  if (status === 'TuChoi') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        Từ chối
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3.5 h-3.5 text-amber-600" />
      Chờ Admin duyệt
    </span>
  );
};

const WarehouseInventoryPage = () => {
  const { user, logout, isAdmin } = useAuth();

  // Core data state
  const [products, setProducts] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [adjustRequests, setAdjustRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Page view & filter state
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'adjust_requests'
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [highlightedProductId, setHighlightedProductId] = useState(null);

  // Modal 1: Nhập kho hàng mới
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importForm, setImportForm] = useState({
    MaNhaSanXuat: '',
    MaSanPham: '',
    SoLuongNhap: '1',
    DonGiaNhap: '',
    GhiChu: '',
  });
  const [importError, setImportError] = useState(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);

  // Modal 2: Báo lệch kho
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    maSanPham: '',
    soLuongThucTe: '',
    lyDoGiaiTrinh: '',
  });
  const [adjustError, setAdjustError] = useState(null);
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Fetch products (TonKho từ bảng sanpham), manufacturers & adjustment requests
  const fetchInventoryData = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const fetchStockPromise = api
        .get('/warehouse/inventory/stock-list')
        .catch(async (err) => {
          if (err.response?.status === 404) {
            return api.get('/products', { params: { limit: 1000 } });
          }
          throw err;
        });

      const fetchManufacturersPromise = api.get('/manufacturers');

      const fetchAdjustmentsPromise = api
        .get('/warehouse/inventory/adjust-requests')
        .catch((err) => {
          if (err.response?.status === 404) {
            return { data: { data: null } };
          }
          throw err;
        });

      const [stockRes, manuRes, adjRes] = await Promise.all([
        fetchStockPromise,
        fetchManufacturersPromise,
        fetchAdjustmentsPromise,
      ]);

      const rawProducts = Array.isArray(stockRes.data?.data) ? stockRes.data.data : [];
      const manuList = Array.isArray(manuRes.data?.data) ? manuRes.data.data : [];
      const manuMap = new Map(manuList.map((m) => [Number(m.MaNhaSanXuat), m.TenNhaSanXuat]));

      const normalizedProducts = rawProducts.map((item) => ({
        ...item,
        MaSanPham: Number(item.MaSanPham),
        Gia: Number(item.Gia) || 0,
        TonKho: Number(item.TonKho) || 0,
        MaNhaSanXuat: item.MaNhaSanXuat ? Number(item.MaNhaSanXuat) : null,
        TenNhaSanXuat:
          item.TenNhaSanXuat ||
          (item.MaNhaSanXuat ? manuMap.get(Number(item.MaNhaSanXuat)) || null : null),
      }));

      setProducts(normalizedProducts);
      setManufacturers(manuList);

      if (Array.isArray(adjRes.data?.data)) {
        setAdjustRequests(adjRes.data.data);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể tải dữ liệu tồn kho từ hệ thống. Vui lòng thử lại.';
      setError(msg);
      if (silent) {
        toast.error(msg, { id: 'warehouse-inv-fetch-err' });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  // Escape key to close active modal (when not submitting)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (isImportModalOpen && !isSubmittingImport) {
        setIsImportModalOpen(false);
      } else if (isAdjustModalOpen && !isSubmittingAdjust) {
        setIsAdjustModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImportModalOpen, isSubmittingImport, isAdjustModalOpen, isSubmittingAdjust]);

  // Lookup maps
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(String(p.MaSanPham), p));
    return map;
  }, [products]);

  // Summary metrics
  const summaryStats = useMemo(() => {
    const totalProducts = products.length;
    const totalUnits = products.reduce((sum, p) => sum + (Number(p.TonKho) || 0), 0);
    const outOfStockCount = products.filter((p) => Number(p.TonKho) <= 0).length;
    const lowStockCount = products.filter((p) => {
      const qty = Number(p.TonKho);
      return qty > 0 && qty < 5;
    }).length;
    const pendingAdjustCount = adjustRequests.filter(
      (req) => req.TrangThai === 'ChoDuyet'
    ).length;

    return {
      totalProducts,
      totalUnits,
      outOfStockCount,
      lowStockCount,
      attentionCount: outOfStockCount + lowStockCount,
      pendingAdjustCount,
    };
  }, [products, adjustRequests]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return products.filter((p) => {
      const qty = Number(p.TonKho) || 0;
      if (stockFilter === 'in_stock' && qty < 5) return false;
      if (stockFilter === 'low_stock' && (qty <= 0 || qty >= 5)) return false;
      if (stockFilter === 'out_of_stock' && qty > 0) return false;

      if (!keyword) return true;

      const name = String(p.TenSanPham || '').toLowerCase();
      const idStr = String(p.MaSanPham || '');
      const color = String(p.MauSac || '').toLowerCase();
      const storage = String(p.DungLuong || '').toLowerCase();
      const manu = String(p.TenNhaSanXuat || '').toLowerCase();

      return (
        name.includes(keyword) ||
        idStr.includes(keyword) ||
        `#${idStr}`.includes(keyword) ||
        color.includes(keyword) ||
        storage.includes(keyword) ||
        manu.includes(keyword)
      );
    });
  }, [products, searchTerm, stockFilter]);

  // Filtered adjustment requests
  const filteredAdjustRequests = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return adjustRequests;

    return adjustRequests.filter((item) => {
      const name = String(item.TenSanPham || '').toLowerCase();
      const idStr = String(item.MaPhieuAdjust || '');
      const prodIdStr = String(item.MaSanPham || '');
      const reason = String(item.LyDoGiaiTrinh || '').toLowerCase();
      const creator = String(item.NguoiTaoKho || '').toLowerCase();

      return (
        name.includes(keyword) ||
        idStr.includes(keyword) ||
        prodIdStr.includes(keyword) ||
        reason.includes(keyword) ||
        creator.includes(keyword)
      );
    });
  }, [adjustRequests, searchTerm]);

  // ── Open Modal 1: Nhập kho hàng mới ──
  const openImportModal = (preselectedProduct = null) => {
    const targetProduct = preselectedProduct || products[0] || null;
    const defaultProductId = targetProduct ? String(targetProduct.MaSanPham) : '';
    const defaultManuId = targetProduct?.MaNhaSanXuat
      ? String(targetProduct.MaNhaSanXuat)
      : manufacturers[0]?.MaNhaSanXuat
      ? String(manufacturers[0].MaNhaSanXuat)
      : '';

    setImportForm({
      MaNhaSanXuat: defaultManuId,
      MaSanPham: defaultProductId,
      SoLuongNhap: '1',
      DonGiaNhap: '',
      GhiChu: '',
    });
    setImportError(null);
    setIsImportModalOpen(true);
  };

  const handleImportProductChange = (newProductId) => {
    const selected = productMap.get(String(newProductId));
    setImportForm((prev) => ({
      ...prev,
      MaSanPham: newProductId,
      MaNhaSanXuat:
        selected?.MaNhaSanXuat && !prev.MaNhaSanXuat
          ? String(selected.MaNhaSanXuat)
          : prev.MaNhaSanXuat,
    }));
    if (importError) setImportError(null);
  };

  const selectedImportProduct = productMap.get(String(importForm.MaSanPham)) || null;
  const parsedImportQty = Number(importForm.SoLuongNhap);
  const parsedImportPrice = Number(importForm.DonGiaNhap);
  const importTotalAmount =
    Number.isFinite(parsedImportQty) &&
    parsedImportQty > 0 &&
    Number.isFinite(parsedImportPrice) &&
    parsedImportPrice > 0
      ? parsedImportQty * parsedImportPrice
      : 0;

  // Submit Nhập kho hàng mới -> POST /api/v1/warehouse/inventory/import
  const handleSubmitImport = async (e) => {
    e.preventDefault();
    if (isSubmittingImport) return;
    setImportError(null);

    if (!importForm.MaNhaSanXuat && manufacturers.length > 0) {
      setImportError('Vui lòng chọn Nhà sản xuất');
      return;
    }

    if (!importForm.MaSanPham) {
      setImportError('Vui lòng chọn Sản phẩm cần nhập kho');
      return;
    }

    const qty = Number(importForm.SoLuongNhap);
    if (!Number.isInteger(qty) || qty <= 0) {
      setImportError('Số lượng nhập phải là số nguyên dương lớn hơn 0');
      return;
    }

    const price = Number(importForm.DonGiaNhap);
    if (!Number.isFinite(price) || price <= 0) {
      setImportError('Giá nhập phải lớn hơn 0 (VNĐ)');
      return;
    }

    const payload = {
      MaNhaSanXuat: importForm.MaNhaSanXuat ? Number(importForm.MaNhaSanXuat) : null,
      GhiChu: importForm.GhiChu.trim() || null,
      ChiTietPhieuNhap: [
        {
          MaSanPham: Number(importForm.MaSanPham),
          SoLuongNhap: qty,
          DonGiaNhap: price,
        },
      ],
    };

    setIsSubmittingImport(true);
    try {
      const res = await api.post('/warehouse/inventory/import', payload);
      const createdReceipt = res.data?.data;
      const importedItem = createdReceipt?.ChiTietPhieuNhap?.[0];
      const targetProdId = Number(importForm.MaSanPham);
      const newStock =
        importedItem?.TonKhoMoi !== undefined
          ? Number(importedItem.TonKhoMoi)
          : (selectedImportProduct?.TonKho || 0) + qty;

      // Cập nhật TonKho tức thì trên UI
      setProducts((prev) =>
        prev.map((p) => {
          if (Number(p.MaSanPham) !== targetProdId) return p;
          return {
            ...p,
            TonKho: newStock,
            TrangThai: newStock > 0 && p.TrangThai === 'HetHang' ? 'DangBan' : p.TrangThai,
          };
        })
      );

      setHighlightedProductId(targetProdId);
      setTimeout(() => {
        setHighlightedProductId((prev) => (prev === targetProdId ? null : prev));
      }, 3000);

      toast.success(
        `Phiếu nhập #${createdReceipt?.MaPhieuNhap || ''} thành công! Tồn kho "${
          importedItem?.TenSanPham || selectedImportProduct?.TenSanPham || `#${targetProdId}`
        }" tăng lên ${newStock} máy.`,
        { id: `import-ok-${targetProdId}`, duration: 4500 }
      );

      setIsImportModalOpen(false);
      fetchInventoryData({ silent: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể lập phiếu nhập kho. Vui lòng kiểm tra lại dữ liệu.';
      setImportError(msg);
      toast.error(msg, { id: 'import-err' });
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // ── Open Modal 2: Báo lệch kho ──
  const openAdjustModal = (preselectedProduct = null) => {
    const targetProduct = preselectedProduct || products[0] || null;
    setAdjustForm({
      maSanPham: targetProduct ? String(targetProduct.MaSanPham) : '',
      soLuongThucTe: targetProduct ? String(targetProduct.TonKho ?? 0) : '',
      lyDoGiaiTrinh: '',
    });
    setAdjustError(null);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustProductChange = (newProductId) => {
    const selected = productMap.get(String(newProductId));
    setAdjustForm((prev) => ({
      ...prev,
      maSanPham: newProductId,
      soLuongThucTe: selected ? String(selected.TonKho ?? 0) : '',
    }));
    if (adjustError) setAdjustError(null);
  };

  const selectedAdjustProduct = productMap.get(String(adjustForm.maSanPham)) || null;
  const systemTonKho = selectedAdjustProduct ? Number(selectedAdjustProduct.TonKho) || 0 : 0;
  const hasActualQtyInput =
    adjustForm.soLuongThucTe !== '' &&
    adjustForm.soLuongThucTe !== null &&
    adjustForm.soLuongThucTe !== undefined;
  const parsedActualQty = hasActualQtyInput ? Number(adjustForm.soLuongThucTe) : NaN;
  const isActualQtyValid = Number.isInteger(parsedActualQty) && parsedActualQty >= 0;
  const discrepancyQty = isActualQtyValid ? parsedActualQty - systemTonKho : null;

  // Submit Báo lệch kho -> POST /api/v1/warehouse/inventory/adjust-request
  const handleSubmitAdjust = async (e) => {
    e.preventDefault();
    if (isSubmittingAdjust) return;
    setAdjustError(null);

    if (!adjustForm.maSanPham) {
      setAdjustError('Vui lòng chọn Sản phẩm cần báo lệch kho');
      return;
    }

    if (!hasActualQtyInput || !Number.isInteger(parsedActualQty) || parsedActualQty < 0) {
      setAdjustError('Số lượng đếm thực tế phải là số nguyên không âm (≥ 0)');
      return;
    }

    const reason = adjustForm.lyDoGiaiTrinh.trim();
    if (!reason) {
      setAdjustError('Vui lòng nhập lý do giải trình chênh lệch kho');
      return;
    }

    const payload = {
      maSanPham: Number(adjustForm.maSanPham),
      soLuongThucTe: parsedActualQty,
      soLuongChechLech: parsedActualQty - systemTonKho,
      lyDoGiaiTrinh: reason,
    };

    setIsSubmittingAdjust(true);
    try {
      const res = await api.post('/warehouse/inventory/adjust-request', payload);
      const createdTicket = res.data?.data;

      if (createdTicket) {
        const enrichedTicket = {
          ...createdTicket,
          TenSanPham:
            createdTicket.TenSanPham ||
            selectedAdjustProduct?.TenSanPham ||
            `Sản phẩm #${payload.maSanPham}`,
          AnhSanPham: createdTicket.AnhSanPham || selectedAdjustProduct?.Anh || null,
          DungLuong: createdTicket.DungLuong || selectedAdjustProduct?.DungLuong || null,
          MauSac: createdTicket.MauSac || selectedAdjustProduct?.MauSac || null,
          NguoiTaoKho:
            createdTicket.NguoiTaoKho || user?.TaiKhoan || user?.HoTen || 'Nhân viên Kho',
        };
        setAdjustRequests((prev) => [enrichedTicket, ...prev]);
      }

      toast.success(
        `Đã gửi phiếu báo lệch kho #${
          createdTicket?.MaPhieuAdjust || ''
        } lên Admin chờ duyệt! Tồn kho hệ thống giữ nguyên chờ phê duyệt.`,
        { id: 'adjust-ok', duration: 4500 }
      );

      setIsAdjustModalOpen(false);
      fetchInventoryData({ silent: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể gửi phiếu đề nghị điều chỉnh lệch kho. Vui lòng thử lại.';
      setAdjustError(msg);
      toast.error(msg, { id: 'adjust-err' });
    } finally {
      setIsSubmittingAdjust(false);
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
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Tồn kho &amp; Kiểm kê
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Theo dõi TonKho thực tế, Nhập kho hàng mới &amp; Báo lệch kho chờ Admin duyệt
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Soạn hàng &amp; Đóng gói</span>
            </Link>
            <Link
              to="/warehouse/inventory"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-blue-700 shadow-xs border border-slate-200/80"
            >
              <Boxes className="w-3.5 h-3.5 text-blue-600" />
              <span>Tồn kho &amp; Lệch kho</span>
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
              onClick={() => fetchInventoryData({ silent: true })}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-all shadow-2xs disabled:opacity-60 cursor-pointer"
              title="Tải lại tồn kho thực tế"
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
        {/* ── Action Banner ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Quản lý Tồn kho &amp; Đề nghị Điều chỉnh Lệch kho
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Nhập kho hàng mới từ nhà sản xuất để tăng <strong>TonKho</strong> tức thì, hoặc lập phiếu báo lệch kho gửi Admin phê duyệt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              id="btn-warehouse-import"
              onClick={() => openImportModal()}
              disabled={loading || products.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-md shadow-blue-600/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Nhập kho hàng mới</span>
            </button>

            <button
              type="button"
              id="btn-warehouse-adjust"
              onClick={() => openAdjustModal()}
              disabled={loading || products.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Báo lệch kho</span>
            </button>
          </div>
        </div>

        {/* ── Summary KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('inventory');
              setStockFilter('all');
            }}
            className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'inventory' && stockFilter === 'all'
                ? 'border-blue-400 ring-2 ring-blue-500/15 shadow-md'
                : 'border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tổng sản phẩm trong kho
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-blue-600">
                  {summaryStats.totalProducts}
                </span>
                <span className="text-xs font-medium text-slate-500">dòng SP</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Tổng tồn thực tế:{' '}
                <strong className="text-slate-800">
                  {summaryStats.totalUnits.toLocaleString('vi-VN')}
                </strong>{' '}
                máy
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('inventory');
              setStockFilter(
                summaryStats.outOfStockCount > 0 ? 'out_of_stock' : 'low_stock'
              );
            }}
            className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'inventory' &&
              (stockFilter === 'low_stock' || stockFilter === 'out_of_stock')
                ? 'border-rose-400 ring-2 ring-rose-500/15 shadow-md'
                : 'border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cảnh báo tồn thấp / Hết
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-rose-600">
                  {summaryStats.attentionCount}
                </span>
                <span className="text-xs font-medium text-slate-500">sản phẩm</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Hết hàng:{' '}
                <strong className="text-rose-600">
                  {summaryStats.outOfStockCount}
                </strong>{' '}
                · Sắp hết:{' '}
                <strong className="text-amber-600">
                  {summaryStats.lowStockCount}
                </strong>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('adjust_requests')}
            className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'adjust_requests'
                ? 'border-amber-400 ring-2 ring-amber-500/15 shadow-md'
                : 'border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Phiếu lệch kho chờ duyệt
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-amber-600">
                  {summaryStats.pendingAdjustCount}
                </span>
                <span className="text-xs font-medium text-slate-500">phiếu</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Tổng đã lập:{' '}
                <strong className="text-slate-700">{adjustRequests.length}</strong>{' '}
                phiếu điều chỉnh
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <ClipboardCheck className="w-6 h-6" />
            </div>
          </button>
        </div>

        {/* ── Tabs + Search & Filter Bar ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 border-b border-slate-200">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center justify-center gap-2.5 px-4 py-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                activeTab === 'inventory'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/60'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span>Danh sách Tồn kho thực tế</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'inventory'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {products.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'adjust_requests'}
              onClick={() => setActiveTab('adjust_requests')}
              className={`flex items-center justify-center gap-2.5 px-4 py-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                activeTab === 'adjust_requests'
                  ? 'border-amber-500 text-amber-700 bg-amber-50/60'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              <span>Phiếu báo lệch kho</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'adjust_requests'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {adjustRequests.length}
              </span>
            </button>
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {activeTab === 'inventory' ? (
              <div className="flex flex-wrap items-center gap-2">
                {STOCK_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStockFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      stockFilter === f.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Phiếu báo lệch không tự động thay đổi <strong>TonKho</strong> — chỉ cập nhật khi Admin phê duyệt.
                </span>
              </div>
            )}

            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeTab === 'inventory'
                    ? 'Tìm tên sản phẩm, #Mã SP, dung lượng, màu sắc, NSX...'
                    : 'Tìm theo mã phiếu, tên sản phẩm, lý do giải trình...'
                }
                className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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

        {/* ── Tab Content Area ── */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-56 bg-slate-200 rounded" />
                  <div className="h-3 w-36 bg-slate-100 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-200 rounded-lg" />
                <div className="h-8 w-28 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white border border-rose-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
            <AlertCircle className="w-11 h-11 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Không tải được dữ liệu tồn kho
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => fetchInventoryData()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Thử lại
            </button>
          </div>
        ) : activeTab === 'inventory' ? (
          /* ── Tab 1: Product Inventory Table ── */
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  {searchTerm || stockFilter !== 'all'
                    ? 'Không có sản phẩm phù hợp với bộ lọc'
                    : 'Chưa có sản phẩm nào trong bảng sanpham'}
                </h3>
                {(searchTerm || stockFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStockFilter('all');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Đặt lại bộ lọc
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-24 text-center">Mã SP</th>
                      <th className="py-3.5 px-4 min-w-[280px]">Sản phẩm</th>
                      <th className="py-3.5 px-4 hidden md:table-cell">Nhà sản xuất</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">Giá bán</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">
                        Tồn kho (TonKho)
                      </th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Trạng thái</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">Thao tác nhanh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredProducts.map((product) => {
                      const isHighlighted = highlightedProductId === product.MaSanPham;
                      return (
                        <tr
                          key={product.MaSanPham}
                          className={`transition-colors ${
                            isHighlighted
                              ? 'bg-emerald-50/70'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-700">
                              #{product.MaSanPham}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                                {product.Anh ? (
                                  <img
                                    src={product.Anh}
                                    alt={product.TenSanPham}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextSibling) {
                                        e.currentTarget.nextSibling.style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : null}
                                <div
                                  className={`w-full h-full items-center justify-center text-slate-300 ${
                                    product.Anh ? 'hidden' : 'flex'
                                  }`}
                                >
                                  <Smartphone className="w-5 h-5" />
                                </div>
                              </div>

                              <div className="min-w-0 space-y-1">
                                <p className="font-bold text-slate-900 leading-snug">
                                  {product.TenSanPham}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                  {product.DungLuong && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/80 font-medium">
                                      <HardDrive className="w-3 h-3" />
                                      {product.DungLuong}
                                    </span>
                                  )}
                                  {product.MauSac && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 font-medium">
                                      <Palette className="w-3 h-3" />
                                      {product.MauSac}
                                    </span>
                                  )}
                                  {product.TenLoaiSanPham && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                                      {product.TenLoaiSanPham}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 hidden md:table-cell">
                            {product.TenNhaSanXuat ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {product.TenNhaSanXuat}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">
                            {formatVND(product.Gia)}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center min-w-[68px] px-3 py-1 rounded-xl font-extrabold text-sm border ${
                                product.TonKho >= 5
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : product.TonKho > 0
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {product.TonKho.toLocaleString('vi-VN')}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {getStockBadge(product.TonKho, product.TrangThai)}
                          </td>

                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openImportModal(product)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors cursor-pointer"
                                title={`Nhập kho thêm cho ${product.TenSanPham}`}
                              >
                                <PackagePlus className="w-3.5 h-3.5" />
                                <span>Nhập kho</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openAdjustModal(product)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold transition-colors cursor-pointer"
                                title={`Báo lệch kho cho ${product.TenSanPham}`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Báo lệch</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* ── Tab 2: Submitted Adjust Requests History ── */
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {filteredAdjustRequests.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  {searchTerm
                    ? 'Không tìm thấy phiếu báo lệch phù hợp'
                    : 'Chưa có phiếu đề nghị điều chỉnh lệch kho nào'}
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Khi kiểm kê phát hiện số lượng thực tế khác tồn kho hệ thống, bấm nút &quot;Báo lệch kho&quot; để lập phiếu gửi Admin phê duyệt.
                </p>
                {!searchTerm && (
                  <button
                    type="button"
                    onClick={() => openAdjustModal()}
                    disabled={products.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Lập phiếu báo lệch kho
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-24 text-center">Mã phiếu</th>
                      <th className="py-3.5 px-4 min-w-[220px]">Sản phẩm</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Đếm thực tế</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Chênh lệch</th>
                      <th className="py-3.5 px-4 min-w-[240px]">Lý do giải trình</th>
                      <th className="py-3.5 px-4 whitespace-nowrap hidden md:table-cell">
                        Thời gian lập
                      </th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredAdjustRequests.map((req) => {
                      const diff = Number(req.SoLuongChechLech) || 0;
                      return (
                        <tr key={req.MaPhieuAdjust} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-700">
                              #ADJ{String(req.MaPhieuAdjust).padStart(4, '0')}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-900">
                                {req.TenSanPham || `Sản phẩm #${req.MaSanPham}`}
                              </p>
                              <p className="text-xs text-slate-500">
                                Mã SP #{req.MaSanPham}
                                {req.TonKhoHeThong !== undefined && (
                                  <span> · Tồn HT hiện tại: {req.TonKhoHeThong}</span>
                                )}
                              </p>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center font-extrabold text-slate-800">
                            {Number(req.SoLuongThucTe).toLocaleString('vi-VN')}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs font-bold border ${
                                diff < 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : diff > 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {diff < 0 ? (
                                <TrendingDown className="w-3.5 h-3.5" />
                              ) : diff > 0 ? (
                                <TrendingUp className="w-3.5 h-3.5" />
                              ) : (
                                <Minus className="w-3.5 h-3.5" />
                              )}
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-xs text-slate-700 leading-relaxed max-w-xs">
                            {req.LyDoGiaiTrinh}
                          </td>

                          <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap hidden md:table-cell">
                            <div>{formatDateTime(req.NgayTao)}</div>
                            {req.NguoiTaoKho && (
                              <div className="text-[11px] text-slate-400">
                                bởi {req.NguoiTaoKho}
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {getAdjustStatusBadge(req.TrangThai)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: NHẬP KHO HÀNG MỚI (POST /api/v1/warehouse/inventory/import) ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => !isSubmittingImport && setIsImportModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/20 shrink-0">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="import-modal-title" className="text-base font-bold text-slate-900">
                    Nhập kho hàng mới
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cộng dồn trực tiếp vào <strong>TonKho</strong> bảng <code>sanpham</code>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmittingImport && setIsImportModalOpen(false)}
                disabled={isSubmittingImport}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Đóng modal nhập kho"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitImport} className="p-6 space-y-4">
              {importError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {/* 1. Nhà sản xuất */}
              <div>
                <label
                  htmlFor="import-manufacturer"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Nhà sản xuất <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="import-manufacturer"
                    value={importForm.MaNhaSanXuat}
                    onChange={(e) => {
                      setImportForm((prev) => ({ ...prev, MaNhaSanXuat: e.target.value }));
                      if (importError) setImportError(null);
                    }}
                    disabled={isSubmittingImport}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="">-- Chọn Nhà sản xuất --</option>
                    {manufacturers.map((m) => (
                      <option key={m.MaNhaSanXuat} value={m.MaNhaSanXuat}>
                        {m.TenNhaSanXuat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Sản phẩm */}
              <div>
                <label
                  htmlFor="import-product"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Sản phẩm nhập kho <span className="text-rose-500">*</span>
                </label>
                <select
                  id="import-product"
                  value={importForm.MaSanPham}
                  onChange={(e) => handleImportProductChange(e.target.value)}
                  disabled={isSubmittingImport}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="">-- Chọn Sản phẩm --</option>
                  {products.map((p) => (
                    <option key={p.MaSanPham} value={p.MaSanPham}>
                      #{p.MaSanPham} - {p.TenSanPham}
                      {p.DungLuong ? ` (${p.DungLuong})` : ''} — Tồn: {p.TonKho}
                    </option>
                  ))}
                </select>

                {selectedImportProduct && (
                  <div className="mt-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Tồn kho hiện tại:{' '}
                      <strong className="text-slate-900">
                        {selectedImportProduct.TonKho} máy
                      </strong>
                    </span>
                    <span>
                      Giá bán:{' '}
                      <strong className="text-blue-600">
                        {formatVND(selectedImportProduct.Gia)}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Số lượng + 4. Giá nhập */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="import-qty"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Số lượng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="import-qty"
                    type="number"
                    min="1"
                    step="1"
                    value={importForm.SoLuongNhap}
                    onChange={(e) => {
                      setImportForm((prev) => ({ ...prev, SoLuongNhap: e.target.value }));
                      if (importError) setImportError(null);
                    }}
                    disabled={isSubmittingImport}
                    placeholder="Ví dụ: 10"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="import-price"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Giá nhập / máy (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="import-price"
                    type="number"
                    min="1"
                    step="1000"
                    value={importForm.DonGiaNhap}
                    onChange={(e) => {
                      setImportForm((prev) => ({ ...prev, DonGiaNhap: e.target.value }));
                      if (importError) setImportError(null);
                    }}
                    disabled={isSubmittingImport}
                    placeholder="Ví dụ: 18500000"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* 5. Ghi chú */}
              <div>
                <label
                  htmlFor="import-note"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Ghi chú phiếu nhập <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    id="import-note"
                    type="text"
                    value={importForm.GhiChu}
                    onChange={(e) =>
                      setImportForm((prev) => ({ ...prev, GhiChu: e.target.value }))
                    }
                    disabled={isSubmittingImport}
                    placeholder="Ví dụ: Nhập bổ sung lô hàng chính hãng..."
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                    <Boxes className="w-3.5 h-3.5 text-blue-600" />
                    Dự kiến TonKho sau nhập:
                  </span>
                  <span className="font-bold text-blue-700 flex items-center gap-1.5">
                    <span>{selectedImportProduct?.TonKho ?? 0}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>
                      {(selectedImportProduct?.TonKho ?? 0) +
                        (Number.isInteger(parsedImportQty) && parsedImportQty > 0
                          ? parsedImportQty
                          : 0)}{' '}
                      máy
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-blue-200/60">
                  <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                    <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                    Tổng giá trị phiếu nhập:
                  </span>
                  <span className="text-sm font-extrabold text-emerald-600">
                    {formatVND(importTotalAmount)}
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={isSubmittingImport}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingImport}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/20 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSubmittingImport ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang nhập kho...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận Nhập kho</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: BÁO LỆCH KHO (POST /api/v1/warehouse/inventory/adjust-request) ── */}
      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {isAdjustModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => !isSubmittingAdjust && setIsAdjustModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjust-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-amber-50/70 border-b border-amber-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/20 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="adjust-modal-title" className="text-base font-bold text-slate-900">
                    Báo lệch kho (Gửi Admin duyệt)
                  </h3>
                  <p className="text-xs text-slate-600">
                    Ghi nhận số lượng đếm thực tế — không tự ý sửa <strong>TonKho</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmittingAdjust && setIsAdjustModalOpen(false)}
                disabled={isSubmittingAdjust}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-amber-100/70 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Đóng modal báo lệch kho"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitAdjust} className="p-6 space-y-4">
              {adjustError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{adjustError}</span>
                </div>
              )}

              {/* 1. Chọn sản phẩm */}
              <div>
                <label
                  htmlFor="adjust-product"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Sản phẩm kiểm kê <span className="text-rose-500">*</span>
                </label>
                <select
                  id="adjust-product"
                  value={adjustForm.maSanPham}
                  onChange={(e) => handleAdjustProductChange(e.target.value)}
                  disabled={isSubmittingAdjust}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                >
                  <option value="">-- Chọn Sản phẩm --</option>
                  {products.map((p) => (
                    <option key={p.MaSanPham} value={p.MaSanPham}>
                      #{p.MaSanPham} - {p.TenSanPham}
                      {p.DungLuong ? ` (${p.DungLuong})` : ''} — Tồn HT: {p.TonKho}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Số lượng đếm thực tế & Chênh lệch tự động */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tồn kho trên hệ thống
                  </label>
                  <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-700">
                    {selectedAdjustProduct ? `${systemTonKho} máy` : '—'}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="adjust-actual-qty"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Số lượng đếm thực tế <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="adjust-actual-qty"
                    type="number"
                    min="0"
                    step="1"
                    value={adjustForm.soLuongThucTe}
                    onChange={(e) => {
                      setAdjustForm((prev) => ({ ...prev, soLuongThucTe: e.target.value }));
                      if (adjustError) setAdjustError(null);
                    }}
                    disabled={isSubmittingAdjust}
                    placeholder="Nhập số đếm thực tế..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Live Discrepancy Summary */}
              {selectedAdjustProduct && discrepancyQty !== null && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                    discrepancyQty < 0
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : discrepancyQty > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <span className="font-semibold">
                    Chênh lệch dự kiến (Thực tế − Hệ thống):
                  </span>
                  <span className="font-mono text-sm font-extrabold">
                    {discrepancyQty > 0
                      ? `+${discrepancyQty} máy (Thừa)`
                      : discrepancyQty < 0
                      ? `${discrepancyQty} máy (Thiếu)`
                      : '0 máy (Khớp kho)'}
                  </span>
                </div>
              )}

              {/* 3. Lý do giải trình */}
              <div>
                <label
                  htmlFor="adjust-reason"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Lý do giải trình <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="adjust-reason"
                  rows={3}
                  value={adjustForm.lyDoGiaiTrinh}
                  onChange={(e) => {
                    setAdjustForm((prev) => ({ ...prev, lyDoGiaiTrinh: e.target.value }));
                    if (adjustError) setAdjustError(null);
                  }}
                  disabled={isSubmittingAdjust}
                  placeholder="Mô tả chi tiết nguyên nhân lệch kho khi kiểm đếm thực tế..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
                />

                {/* Quick Reason Chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_ADJUST_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setAdjustForm((prev) => ({ ...prev, lyDoGiaiTrinh: preset }))
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 hover:border-amber-200 text-[11px] text-slate-600 font-medium transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={isSubmittingAdjust}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm shadow-amber-500/20 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSubmittingAdjust ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang gửi phiếu...</span>
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Gửi phiếu báo lệch kho</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseInventoryPage;

