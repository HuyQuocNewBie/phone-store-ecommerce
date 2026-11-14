import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  AlertCircle,
  Boxes,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Smartphone,
  User,
  ArrowRight,
  X,
  PackagePlus,
  Building2,
  FileText,
  DollarSign,
  Tag,
} from 'lucide-react';
import api from '../../services/api';
import { formatVND, formatDateTime } from '../../utils/formatters';

const STATUS_TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'ChoDuyet', label: 'Chờ phê duyệt' },
  { id: 'DaDuyet', label: 'Đã phê duyệt' },
  { id: 'TuChoi', label: 'Đã từ chối' },
];

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

const getStatusBadge = (status) => {
  if (status === 'DaDuyet') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Đã phê duyệt
      </span>
    );
  }
  if (status === 'TuChoi') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        Đã từ chối
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
      Chờ duyệt
    </span>
  );
};

const AdminAdjustmentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = searchParams.get('tab') === 'adjustments' ? 'adjustments' : 'imports';

  const [activeView, setActiveView] = useState(initialView); // 'imports' | 'adjustments'
  const [imports, setImports] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingMap, setProcessingMap] = useState({});
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Đóng modal từ chối khi bấm ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && rejectItem) {
        setRejectItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rejectItem]);

  const openRejectModal = (item) => {
    setRejectItem(item);
    setRejectReason('');
    setRejectError('');
  };

  // Cập nhật URL search param khi đổi tab
  const handleSwitchView = (view) => {
    setActiveView(view);
    setStatusFilter('ALL');
    setSearchParams(view === 'adjustments' ? { tab: 'adjustments' } : {});
  };

  // Fetch cả phiếu nhập kho và phiếu điều chỉnh kho
  const fetchAllData = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const fetchImportsPromise = api
        .get('/admin/inventory/imports')
        .catch(async (err) => {
          if (err.response?.status === 404) {
            return api.get('/warehouse/inventory/import-receipts');
          }
          throw err;
        })
        .catch(() => ({ data: { data: [] } }));

      const fetchAdjustmentsPromise = api
        .get('/warehouse/inventory/adjust-requests')
        .catch((err) => {
          if (err.response?.status === 404) {
            return { data: { data: [] } };
          }
          throw err;
        })
        .catch(() => ({ data: { data: [] } }));

      const [importsRes, adjRes] = await Promise.all([
        fetchImportsPromise,
        fetchAdjustmentsPromise,
      ]);

      const importRows = Array.isArray(importsRes.data?.data) ? importsRes.data.data : [];
      const adjRows = Array.isArray(adjRes.data?.data) ? adjRes.data.data : [];

      setImports(importRows);
      setAdjustments(adjRows);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể tải dữ liệu duyệt kho từ máy chủ';
      setError(msg);
      if (silent) {
        toast.error(msg, { id: 'admin-approval-fetch-err' });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Thống kê phiếu nhập kho
  const importStats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    imports.forEach((item) => {
      if (item.TrangThai === 'DaDuyet') approved++;
      else if (item.TrangThai === 'TuChoi') rejected++;
      else pending++;
    });

    return {
      total: imports.length,
      pending,
      approved,
      rejected,
    };
  }, [imports]);

  // Thống kê phiếu điều chỉnh kho
  const adjustStats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    adjustments.forEach((item) => {
      if (item.TrangThai === 'DaDuyet') approved++;
      else if (item.TrangThai === 'TuChoi') rejected++;
      else pending++;
    });

    return {
      total: adjustments.length,
      pending,
      approved,
      rejected,
    };
  }, [adjustments]);

  // Thống kê theo tab đang chọn
  const activeStats = activeView === 'imports' ? importStats : adjustStats;

  // Lọc danh sách phiếu nhập kho
  const filteredImports = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return imports.filter((item) => {
      if (statusFilter !== 'ALL' && item.TrangThai !== statusFilter) {
        return false;
      }

      if (!keyword) return true;

      const idStr = String(item.MaPhieuNhap || '');
      const codeStr = `#pn${String(item.MaPhieuNhap || '').padStart(4, '0')}`.toLowerCase();
      const manu = String(item.TenNhaSanXuat || '').toLowerCase();
      const note = String(item.GhiChu || '').toLowerCase();
      const creator = String(item.TaiKhoanKho || '').toLowerCase();
      const admin = String(item.TaiKhoanAdmin || '').toLowerCase();
      const matchProduct = (item.ChiTiet || []).some((ct) =>
        String(ct.TenSanPham || '').toLowerCase().includes(keyword) ||
        String(ct.MaSanPham || '').includes(keyword)
      );

      return (
        idStr.includes(keyword) ||
        codeStr.includes(keyword) ||
        manu.includes(keyword) ||
        note.includes(keyword) ||
        creator.includes(keyword) ||
        admin.includes(keyword) ||
        matchProduct
      );
    });
  }, [imports, statusFilter, searchTerm]);

  // Lọc danh sách phiếu điều chỉnh kho
  const filteredAdjustments = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return adjustments.filter((item) => {
      if (statusFilter !== 'ALL' && item.TrangThai !== statusFilter) {
        return false;
      }

      if (!keyword) return true;

      const idStr = String(item.MaPhieuAdjust || '');
      const adjCode = `#adj${String(item.MaPhieuAdjust || '').padStart(4, '0')}`;
      const prodName = String(item.TenSanPham || '').toLowerCase();
      const prodId = String(item.MaSanPham || '');
      const reason = String(item.LyDoGiaiTrinh || '').toLowerCase();
      const staff = String(item.NguoiTaoKho || '').toLowerCase();

      return (
        idStr.includes(keyword) ||
        adjCode.includes(keyword) ||
        prodName.includes(keyword) ||
        prodId.includes(keyword) ||
        reason.includes(keyword) ||
        staff.includes(keyword)
      );
    });
  }, [adjustments, statusFilter, searchTerm]);

  // 1. Phê duyệt / Từ chối Phiếu Nhập Kho: PUT /api/v1/admin/inventory/imports/:id/approve
  const handleImportDecision = async (item, hanhDong) => {
    const importId = item.MaPhieuNhap;
    const processKey = `import_${importId}`;
    if (processingMap[processKey]) return;

    setProcessingMap((prev) => ({ ...prev, [processKey]: hanhDong }));

    try {
      const res = await api.put(
        `/admin/inventory/imports/${importId}/approve`,
        { hanhDong }
      );
      const updated = res.data?.data;

      setImports((prev) =>
        prev.map((row) => {
          if (row.MaPhieuNhap !== importId) return row;
          if (!updated) {
            return {
              ...row,
              TrangThai: hanhDong === 'Approve' ? 'DaDuyet' : 'TuChoi',
            };
          }
          return {
            ...row,
            ...updated,
            TrangThai: hanhDong === 'Approve' ? 'DaDuyet' : 'TuChoi',
          };
        })
      );

      if (hanhDong === 'Approve') {
        toast.success(
          res.data?.message ||
            `Đã phê duyệt phiếu nhập #PN${String(importId).padStart(4, '0')} — Tồn kho đã được cộng vào hệ thống!`,
          { id: `import-approve-${importId}`, duration: 4000 }
        );
      } else {
        toast.success(
          res.data?.message ||
            `Đã từ chối phiếu nhập #PN${String(importId).padStart(4, '0')} — Giữ nguyên tồn kho hiện tại!`,
          { id: `import-reject-${importId}`, duration: 4000 }
        );
      }

      fetchAllData({ silent: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (hanhDong === 'Approve'
          ? 'Không thể phê duyệt phiếu nhập kho'
          : 'Không thể từ chối phiếu nhập kho');
      toast.error(msg, { id: `import-err-${importId}` });
      if (err.response?.status === 400 || err.response?.status === 404) {
        fetchAllData({ silent: true });
      }
    } finally {
      setProcessingMap((prev) => {
        const next = { ...prev };
        delete next[processKey];
        return next;
      });
    }
  };

  // 2. Phê duyệt / Từ chối Phiếu Báo Lệch Kho: PUT /api/v1/admin/inventory/adjustments/:id/approve
  const handleAdjustDecision = async (item, hanhDong, lyDoTuChoi = '') => {
    const adjustmentId = item.MaPhieuAdjust;
    const processKey = `adjust_${adjustmentId}`;
    if (processingMap[processKey]) return;

    setProcessingMap((prev) => ({ ...prev, [processKey]: hanhDong }));

    try {
      const payload = { hanhDong };
      if (hanhDong === 'Reject' && lyDoTuChoi) {
        payload.lyDoTuChoi = lyDoTuChoi;
      }

      const res = await api.put(
        `/admin/inventory/adjustments/${adjustmentId}/approve`,
        payload
      );
      const updated = res.data?.data;

      setAdjustments((prev) =>
        prev.map((row) => {
          if (row.MaPhieuAdjust !== adjustmentId) return row;
          if (!updated) {
            return {
              ...row,
              TrangThai: hanhDong === 'Approve' ? 'DaDuyet' : 'TuChoi',
              LyDoTuChoi: lyDoTuChoi || row.LyDoTuChoi,
            };
          }
          return {
            ...row,
            ...updated,
            LyDoTuChoi: updated.LyDoTuChoi || lyDoTuChoi || row.LyDoTuChoi,
            TonKhoHeThong:
              updated.TonKhoMoi !== undefined
                ? Number(updated.TonKhoMoi)
                : updated.TonKhoHienTai !== undefined
                ? Number(updated.TonKhoHienTai)
                : row.TonKhoHeThong,
          };
        })
      );

      if (hanhDong === 'Approve') {
        const newStock =
          updated?.TonKhoMoi ?? updated?.TonKhoHienTai ?? item.SoLuongThucTe;
        toast.success(
          res.data?.message ||
            `Đã phê duyệt phiếu #ADJ${String(adjustmentId).padStart(4, '0')} — Tồn kho cập nhật thành ${newStock}`,
          { id: `adjust-approve-${adjustmentId}`, duration: 4000 }
        );
      } else {
        toast.success(
          res.data?.message ||
            `Đã từ chối phiếu #ADJ${String(adjustmentId).padStart(4, '0')} — Giữ nguyên tồn kho hiện tại`,
          { id: `adjust-reject-${adjustmentId}`, duration: 4000 }
        );
      }

      fetchAllData({ silent: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (hanhDong === 'Approve'
          ? 'Không thể phê duyệt phiếu điều chỉnh kho'
          : 'Không thể từ chối phiếu điều chỉnh kho');
      toast.error(msg, { id: `adjust-err-${adjustmentId}` });
      if (err.response?.status === 400 || err.response?.status === 404) {
        fetchAllData({ silent: true });
      }
    } finally {
      setProcessingMap((prev) => {
        const next = { ...prev };
        delete next[processKey];
        return next;
      });
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-auto max-w-7xl mx-auto w-full">
      {/* ── Top Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <ClipboardCheck className="w-7 h-7 text-blue-600 shrink-0" />
            Trung tâm Phê duyệt Kho hàng
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/admin/inventory"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs font-semibold transition-all shadow-sm"
          >
            <Boxes className="w-3.5 h-3.5 text-sky-600" />
            <span>Theo dõi Tồn kho</span>
          </Link>

          <button
            type="button"
            onClick={() => fetchAllData({ silent: true })}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold transition-all shadow-sm disabled:opacity-60 cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loading || refreshing ? 'animate-spin text-blue-600' : ''
              }`}
            />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── View Switcher: Nhập kho vs Lệch kho ── */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => handleSwitchView('imports')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeView === 'imports'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PackagePlus className="w-4 h-4 text-blue-600" />
          <span>Phê duyệt Nhập kho</span>
          {importStats.pending > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
              {importStats.pending}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSwitchView('adjustments')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeView === 'adjustments'
              ? 'bg-white text-amber-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-amber-600" />
          <span>Phê duyệt Lệch kho</span>
          {adjustStats.pending > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
              {adjustStats.pending}
            </span>
          )}
        </button>
      </div>

      {/* ── 4 KPI Summary Cards (Dynamically reflects active view) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            statusFilter === 'ALL'
              ? 'border-blue-400 ring-2 ring-blue-500/15 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {activeView === 'imports' ? 'Tổng phiếu nhập kho' : 'Tổng phiếu báo lệch'}
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeStats.total}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Tất cả các phiếu đã tạo
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            {activeView === 'imports' ? <PackagePlus className="w-6 h-6" /> : <ClipboardCheck className="w-6 h-6" />}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ChoDuyet')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            statusFilter === 'ChoDuyet'
              ? 'border-amber-400 ring-2 ring-amber-500/15 shadow-md'
              : 'border-slate-200 hover:border-amber-200 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chờ Admin duyệt
            </p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{activeStats.pending}</h3>
            <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">
              Cần phê duyệt hoặc từ chối
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('DaDuyet')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            statusFilter === 'DaDuyet'
              ? 'border-emerald-400 ring-2 ring-emerald-500/15 shadow-md'
              : 'border-slate-200 hover:border-emerald-200 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Đã phê duyệt
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activeStats.approved}</h3>
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
              {activeView === 'imports' ? 'Đã cộng tồn kho thành công' : 'Đã cập nhật tồn kho mới'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('TuChoi')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            statusFilter === 'TuChoi'
              ? 'border-rose-400 ring-2 ring-rose-500/15 shadow-md'
              : 'border-slate-200 hover:border-rose-200 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Đã từ chối
            </p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{activeStats.rejected}</h3>
            <span className="text-[11px] text-rose-500 font-medium mt-0.5 block">
              Giữ nguyên tồn kho cũ
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* ── Filter Tabs + Search Toolbar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.id;
            const count =
              tab.id === 'ALL'
                ? activeStats.total
                : tab.id === 'ChoDuyet'
                ? activeStats.pending
                : tab.id === 'DaDuyet'
                ? activeStats.approved
                : activeStats.rejected;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeView === 'imports'
                ? 'Tìm mã phiếu #PN..., nhà sản xuất, sản phẩm...'
                : 'Tìm mã phiếu #ADJ..., sản phẩm, lý do giải trình...'
            }
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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

      {/* ── Table Section ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-14 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              Đang tải danh sách phiếu kho...
            </p>
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-slate-700 font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => fetchAllData()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : activeView === 'imports' ? (
          /* ═════════════════════════════════════════════════════════════════ */
          /* ── TABLE 1: PHÊ DUYỆT PHIẾU NHẬP KHO HÀNG ── */
          /* ═════════════════════════════════════════════════════════════════ */
          filteredImports.length === 0 ? (
            <div className="p-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <PackagePlus className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Không tìm thấy phiếu nhập kho phù hợp'
                  : 'Chưa có phiếu nhập kho nào cần phê duyệt'}
              </h3>
              {(searchTerm || statusFilter !== 'ALL') && (
                <div className="mt-2 space-y-3">
                  <p className="text-xs text-slate-500">
                    Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('ALL');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Đặt lại bộ lọc
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left border-collapse text-slate-700">
                <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 w-[140px] whitespace-nowrap">Mã phiếu</th>
                    <th className="px-4 py-3.5 w-[180px]">Nhà sản xuất</th>
                    <th className="px-4 py-3.5 min-w-[320px]">Chi tiết sản phẩm &amp; Giá nhập</th>
                    <th className="px-4 py-3.5 w-[150px] text-right whitespace-nowrap">Tổng tiền nhập</th>
                    <th className="px-4 py-3.5 w-[130px] text-center whitespace-nowrap">Trạng thái</th>
                    <th className="px-5 py-3.5 w-[210px] text-center whitespace-nowrap">Thao tác Admin</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredImports.map((receipt) => {
                    const isPending = receipt.TrangThai === 'ChoDuyet';
                    const activeAction = processingMap[`import_${receipt.MaPhieuNhap}`];
                    const items = receipt.ChiTiet || [];

                    return (
                      <tr
                        key={receipt.MaPhieuNhap}
                        className={`transition-colors ${
                          isPending
                            ? 'bg-amber-50/20 hover:bg-amber-50/45'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Mã phiếu & Thời gian */}
                        <td className="px-5 py-4 align-top whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 font-mono text-xs font-bold text-indigo-700">
                            #PN{String(receipt.MaPhieuNhap).padStart(4, '0')}
                          </span>
                          <div className="text-[11px] text-slate-400 mt-1.5">
                            {formatDateTime(receipt.NgayNhap)}
                          </div>
                          {receipt.TaiKhoanKho && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                              <User className="w-3 h-3 shrink-0 text-slate-400" />
                              <span>Kho: <strong className="font-semibold text-slate-700">{receipt.TaiKhoanKho}</strong></span>
                            </div>
                          )}
                        </td>

                        {/* Nhà sản xuất & Ghi chú */}
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{receipt.TenNhaSanXuat || 'Nhà sản xuất đối tác'}</span>
                            </div>
                            {receipt.GhiChu && (
                              <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 whitespace-pre-line">
                                &ldquo;{receipt.GhiChu}&rdquo;
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Chi tiết sản phẩm nhập */}
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-2.5">
                            {items.map((prod) => {
                              const currStock = Number(prod.TonKhoHienTai) || 0;
                              const importQty = Number(prod.SoLuongNhap) || 0;
                              const expectedStock = currStock + importQty;
                              const unitPrice = Number(prod.DonGiaNhap) || 0;
                              const retailPrice = Number(prod.Gia) || 0;

                              return (
                                <div
                                  key={prod.MaChiTietNhap || prod.MaSanPham}
                                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                                      {prod.Anh ? (
                                        <img
                                          src={formatImageUrl(prod.Anh)}
                                          alt={prod.TenSanPham}
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        <Smartphone className="w-4 h-4 text-slate-300" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
                                        {prod.TenSanPham}
                                      </p>
                                      <p className="text-[11px] text-slate-500">
                                        Mã SP: #{prod.MaSanPham}
                                        {prod.DungLuong && ` · ${prod.DungLuong}`}
                                        {prod.MauSac && ` · ${prod.MauSac}`}
                                      </p>
                                    </div>
                                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                      +{importQty} máy
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-xs">
                                    <div className="flex items-center gap-3">
                                      <span className="text-slate-600">
                                        Giá nhập: <strong className="text-emerald-600 font-bold">{formatVND(unitPrice)}</strong>
                                      </span>
                                      {retailPrice > 0 && (
                                        <span className="text-slate-400 text-[11px]">
                                          Giá bán niêm yết: <span className="line-through">{formatVND(retailPrice)}</span>
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                      <span>Tồn: {currStock}</span>
                                      <ArrowRight className="w-3 h-3 text-slate-400" />
                                      <span className="font-bold text-blue-700">Dự kiến {expectedStock}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Tổng tiền nhập */}
                        <td className="px-4 py-4 text-right align-top whitespace-nowrap">
                          <div className="text-sm font-extrabold text-emerald-600">
                            {formatVND(receipt.TongTienNhap)}
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {items.length} mặt hàng
                          </span>
                        </td>

                        {/* Trạng thái */}
                        <td className="px-4 py-4 text-center align-top whitespace-nowrap">
                          {getStatusBadge(receipt.TrangThai)}
                          {!isPending && (receipt.TaiKhoanAdmin || receipt.NgayDuyet) && (
                            <div className="text-[11px] text-slate-400 mt-1.5 space-y-0.5">
                              {receipt.TaiKhoanAdmin && (
                                <div>
                                  Duyệt: <strong className="text-slate-700 font-semibold">{receipt.TaiKhoanAdmin}</strong>
                                </div>
                              )}
                              {receipt.NgayDuyet && (
                                <div>{formatDateTime(receipt.NgayDuyet)}</div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Thao tác duyệt / từ chối */}
                        <td className="px-5 py-4 text-center align-top whitespace-nowrap">
                          {isPending ? (
                            <div className="inline-flex items-center justify-center gap-2">
                              <button
                                type="button"
                                disabled={Boolean(activeAction)}
                                onClick={() => handleImportDecision(receipt, 'Approve')}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                title="Phê duyệt phiếu nhập và cộng số lượng vào tồn kho hệ thống"
                              >
                                {activeAction === 'Approve' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Phê duyệt</span>
                              </button>

                              <button
                                type="button"
                                disabled={Boolean(activeAction)}
                                onClick={() => handleImportDecision(receipt, 'Reject')}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                title="Từ chối phiếu nhập kho và không thay đổi tồn kho"
                              >
                                {activeAction === 'Reject' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                                <span>Từ chối</span>
                              </button>
                            </div>
                          ) : receipt.TrangThai === 'DaDuyet' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Đã cộng tồn kho</span>
                            </span>
                          ) : receipt.TrangThai === 'TuChoi' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Đã từ chối</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium">
                              Đã xử lý
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ═════════════════════════════════════════════════════════════════ */
          /* ── TABLE 2: PHÊ DUYỆT PHIẾU BÁO LỆCH KHO ── */
          /* ═════════════════════════════════════════════════════════════════ */
          filteredAdjustments.length === 0 ? (
            <div className="p-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <ClipboardCheck className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Không tìm thấy phiếu điều chỉnh kho phù hợp'
                  : 'Chưa có phiếu điều chỉnh kho nào'}
              </h3>
              {(searchTerm || statusFilter !== 'ALL') && (
                <div className="mt-2 space-y-3">
                  <p className="text-xs text-slate-500">
                    Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('ALL');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Đặt lại bộ lọc
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[980px] text-left border-collapse text-slate-700">
                <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 w-[130px] whitespace-nowrap">Mã phiếu</th>
                    <th className="px-4 py-3.5 w-[24%]">Sản phẩm</th>
                    <th className="px-4 py-3.5 w-[150px] text-center whitespace-nowrap">
                      Đối chiếu tồn kho
                    </th>
                    <th className="px-4 py-3.5 w-[110px] text-center whitespace-nowrap">
                      Chênh lệch
                    </th>
                    <th className="px-4 py-3.5 w-[25%]">Lý do giải trình</th>
                    <th className="px-4 py-3.5 w-[140px] text-center whitespace-nowrap">
                      Trạng thái
                    </th>
                    <th className="px-5 py-3.5 min-w-[260px] text-center whitespace-nowrap">
                      Thao tác duyệt
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredAdjustments.map((item) => {
                    const diff = Number(item.SoLuongChechLech) || 0;
                    const sysStock = item.TonKhoHeThong ?? item.TonKhoHienTai ?? 0;
                    const actualStock = Number(item.SoLuongThucTe) || 0;
                    const isPending = item.TrangThai === 'ChoDuyet';
                    const activeAction = processingMap[`adjust_${item.MaPhieuAdjust}`];

                    return (
                      <tr
                        key={item.MaPhieuAdjust}
                        className={`transition-colors ${
                          isPending
                            ? 'bg-amber-50/20 hover:bg-amber-50/45'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Mã phiếu & Thời gian */}
                        <td className="px-5 py-4 align-middle whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-800">
                            #ADJ{String(item.MaPhieuAdjust).padStart(4, '0')}
                          </span>
                          <div className="text-[11px] text-slate-400 mt-1.5">
                            {formatDateTime(item.NgayTao)}
                          </div>
                        </td>

                        {/* Sản phẩm */}
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                              {item.AnhSanPham ? (
                                <img
                                  src={formatImageUrl(item.AnhSanPham)}
                                  alt={item.TenSanPham}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Smartphone className="w-5 h-5 text-slate-300" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 leading-snug line-clamp-2">
                                {item.TenSanPham || `Sản phẩm #${item.MaSanPham}`}
                              </p>
                              {item.MaChiTietDonHang && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                                  <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200/80 font-semibold">
                                    {`Màu: ${
                                      item.MauSac && String(item.MauSac).trim()
                                        ? String(item.MauSac).trim()
                                        : 'N/A'
                                    } | Dung lượng: ${
                                      item.DungLuong && String(item.DungLuong).trim()
                                        ? String(item.DungLuong).trim()
                                        : 'N/A'
                                    }`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Đối chiếu tồn kho */}
                        <td className="px-4 py-4 text-center align-middle whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <span
                              className="text-slate-500 font-semibold"
                              title="Tồn kho hệ thống"
                            >
                              {Number(sysStock).toLocaleString('vi-VN')}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span
                              className="font-extrabold text-blue-700"
                              title="Số lượng thực tế đề xuất"
                            >
                              {actualStock.toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Hệ thống → Thực tế
                          </p>
                        </td>

                        {/* Chênh lệch */}
                        <td className="px-4 py-4 text-center align-middle whitespace-nowrap">
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

                        {/* Lý do giải trình */}
                        <td className="px-4 py-4 align-middle">
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            {item.LyDoGiaiTrinh && String(item.LyDoGiaiTrinh).trim()
                              ? String(item.LyDoGiaiTrinh).trim()
                              : 'Không có ghi chú'}
                          </p>
                          {item.NguoiTaoKho && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1.5">
                              <User className="w-3 h-3 shrink-0" />
                              <span>
                                Lập bởi:{' '}
                                <strong className="text-slate-600 font-semibold">
                                  {item.NguoiTaoKho}
                                </strong>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="px-4 py-4 text-center align-middle whitespace-nowrap">
                          {getStatusBadge(item.TrangThai)}
                          {!isPending && (item.NguoiDuyetAdmin || item.NgayDuyet) && (
                            <div className="text-[11px] text-slate-400 mt-1.5 space-y-0.5">
                              {item.NguoiDuyetAdmin && (
                                <div>
                                  bởi{' '}
                                  <strong className="text-slate-600 font-semibold">
                                    {item.NguoiDuyetAdmin}
                                  </strong>
                                </div>
                              )}
                              {item.NgayDuyet && (
                                <div>{formatDateTime(item.NgayDuyet)}</div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Thao tác: Phê duyệt / Từ chối */}
                        <td className="px-5 py-4 text-center align-middle whitespace-nowrap">
                          {isPending ? (
                            <div className="inline-flex items-center justify-center gap-2">
                              <button
                                type="button"
                                disabled={Boolean(activeAction)}
                                onClick={() => handleAdjustDecision(item, 'Approve')}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                title={`Phê duyệt và cập nhật tồn kho thành ${actualStock}`}
                              >
                                {activeAction === 'Approve' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Phê duyệt</span>
                              </button>

                              <button
                                type="button"
                                disabled={Boolean(activeAction)}
                                onClick={() => openRejectModal(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                title="Từ chối phiếu điều chỉnh và yêu cầu nhập lý do"
                              >
                                {activeAction === 'Reject' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                                <span>Từ chối</span>
                              </button>
                            </div>
                          ) : item.TrangThai === 'DaDuyet' ? (
                            (() => {
                              const before = item.TonKhoTruoc ?? (Number(item.SoLuongThucTe) - Number(item.SoLuongChechLech));
                              const after = item.TonKhoMoi ?? Number(item.SoLuongThucTe);
                              return (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Đã cập nhật tồn kho ({before} → {after})</span>
                                </span>
                              );
                            })()
                          ) : item.TrangThai === 'TuChoi' ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold max-w-[280px]"
                              title={item.LyDoTuChoi ? `Lý do từ chối: ${item.LyDoTuChoi}` : 'Đã từ chối'}
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span className="truncate">
                                Đã từ chối{item.LyDoTuChoi ? `: ${item.LyDoTuChoi}` : ''}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium">
                              Đã xử lý
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Modal popup nhập lý do từ chối phiếu điều chỉnh kho ── */}
      {rejectItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
          onClick={() => {
            if (!processingMap[`adjust_${rejectItem.MaPhieuAdjust}`]) {
              setRejectItem(null);
            }
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 id="reject-modal-title" className="font-bold text-slate-800 text-sm sm:text-base">
                  Từ chối phiếu lệch kho #ADJ{String(rejectItem.MaPhieuAdjust).padStart(4, '0')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!processingMap[`adjust_${rejectItem.MaPhieuAdjust}`]) {
                    setRejectItem(null);
                  }
                }}
                disabled={Boolean(processingMap[`adjust_${rejectItem.MaPhieuAdjust}`])}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <p className="font-semibold text-slate-800 line-clamp-1">
                  {rejectItem.TenSanPham || `Sản phẩm #${rejectItem.MaSanPham}`}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Tồn HT: <strong className="text-slate-700">{Number(rejectItem.TonKhoHeThong ?? rejectItem.TonKhoHienTai ?? 0).toLocaleString('vi-VN')}</strong>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>
                    Thực tế: <strong className="text-blue-700">{Number(rejectItem.SoLuongThucTe).toLocaleString('vi-VN')}</strong>
                  </span>
                  <span>
                    Lệch: <strong className={Number(rejectItem.SoLuongChechLech) < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                      {Number(rejectItem.SoLuongChechLech) > 0 ? `+${rejectItem.SoLuongChechLech}` : rejectItem.SoLuongChechLech}
                    </strong>
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="reject-reason-input" className="block font-semibold text-slate-700 mb-1.5">
                  Lý do từ chối <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="reject-reason-input"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectError) setRejectError('');
                  }}
                  placeholder="Nhập lý do từ chối để Nhân viên Kho biết nguyên nhân..."
                  className={`w-full p-3 rounded-xl border text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all resize-none ${
                    rejectError
                      ? 'border-rose-400 focus:ring-rose-500/20 bg-rose-50/20'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-slate-50 focus:bg-white'
                  }`}
                  disabled={Boolean(processingMap[`adjust_${rejectItem.MaPhieuAdjust}`])}
                  autoFocus
                />
                {rejectError && (
                  <p className="text-xs text-rose-600 font-medium mt-1">{rejectError}</p>
                )}
              </div>

              {/* Quick suggestion tags */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Gợi ý nhanh:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Kiểm đếm lại chưa khớp thực tế',
                    'Cần bổ sung biên bản giải trình chi tiết',
                    'Số liệu đề xuất không có cơ sở xác thực',
                    'Yêu cầu thủ kho kiểm tra lại vị trí kệ',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setRejectReason(preset);
                        if (rejectError) setRejectError('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectItem(null)}
                disabled={Boolean(processingMap[`adjust_${rejectItem.MaPhieuAdjust}`])}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={Boolean(processingMap[`adjust_${rejectItem.MaPhieuAdjust}`])}
                onClick={async () => {
                  if (!rejectReason.trim()) {
                    setRejectError('Vui lòng nhập lý do từ chối');
                    return;
                  }
                  const itemToReject = rejectItem;
                  const reasonToReject = rejectReason.trim();
                  setRejectItem(null);
                  await handleAdjustDecision(itemToReject, 'Reject', reasonToReject);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {processingMap[`adjust_${rejectItem.MaPhieuAdjust}`] === 'Reject' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Xác nhận từ chối</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAdjustmentsPage;
