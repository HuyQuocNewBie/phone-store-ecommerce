import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  AlertCircle,
  Smartphone,
  User,
  Phone,
  Mail,
  Calendar,
  Eye,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ClipboardCheck,
  MessageSquareQuote,
  Banknote,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';
import { formatOrderCode, formatVND, formatDateTime } from '../../utils/formatters';

const REFUND_TABS = [
  { id: 'ALL', label: 'Tất cả đạt kiểm định' },
  { id: 'ChoDuyet', label: 'Chờ xác nhận hoàn tiền' },
  { id: 'DaHoanTien', label: 'Đã hoàn tiền' },
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

const parseProofImages = (item) => {
  if (Array.isArray(item?.HinhAnhProofList) && item.HinhAnhProofList.length > 0) {
    return item.HinhAnhProofList;
  }
  if (!item?.HinhAnhProof) return [];
  try {
    const parsed = JSON.parse(item.HinhAnhProof);
    if (Array.isArray(parsed)) {
      return parsed.map((u) => String(u).trim()).filter(Boolean);
    }
  } catch {
    // Fallback comma-separated or single URL
  }
  return String(item.HinhAnhProof)
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
};

const AdminRefundsPage = () => {
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [refundFilter, setRefundFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refundingIds, setRefundingIds] = useState({});

  // Lightbox Image Viewer
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Fetch danh sách phiếu đổi trả từ phieudoitra có KetQuaKiemDinh = 'Dat'
  const fetchPassedReturns = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await api.get('/warehouse/returns', {
        params: { ketQua: 'Dat' },
      });
      const rawData = Array.isArray(res.data?.data) ? res.data.data : [];
      const passedOnly = rawData.filter((r) => r.KetQuaKiemDinh === 'Dat');
      setReturnsList(passedOnly);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể tải danh sách phiếu đổi trả đạt kiểm định';
      setError(msg);
      if (silent) {
        toast.error(msg, { id: 'admin-refunds-fetch-err' });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPassedReturns();
  }, [fetchPassedReturns]);

  // Keyboard navigation cho Lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex(
          (prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, lightboxImages.length]);

  const metrics = useMemo(() => {
    const pendingList = returnsList.filter((r) => r.TrangThaiHoanTien === 'ChoDuyet');
    const refundedList = returnsList.filter(
      (r) => r.TrangThaiHoanTien === 'DaHoanTien'
    );

    const pendingAmount = pendingList.reduce(
      (sum, r) => sum + (Number(r.TongTien) || 0),
      0
    );
    const refundedAmount = refundedList.reduce(
      (sum, r) => sum + (Number(r.TongTien) || 0),
      0
    );

    return {
      total: returnsList.length,
      pendingCount: pendingList.length,
      refundedCount: refundedList.length,
      pendingAmount,
      refundedAmount,
    };
  }, [returnsList]);

  const filteredReturns = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return returnsList.filter((item) => {
      if (refundFilter !== 'ALL' && item.TrangThaiHoanTien !== refundFilter) {
        return false;
      }

      if (!keyword) return true;

      const maPhieu = String(item.MaPhieuDoiTra || '');
      const maDon = String(item.MaDonHang || '');
      const codeDon = String(item.CodeDonHang || '').toLowerCase();
      const tenSp = String(item.TenSanPham || '').toLowerCase();
      const tenKh = String(item.TenKhachHang || item.TaiKhoan || '').toLowerCase();
      const email = String(item.Email || '').toLowerCase();
      const sdt = String(item.SoDienThoai || '').toLowerCase();
      const lyDo = String(item.LyDo || '').toLowerCase();
      const ghiChu = String(item.GhiChuKho || '').toLowerCase();

      return (
        maPhieu.includes(keyword) ||
        maDon.includes(keyword) ||
        codeDon.includes(keyword) ||
        tenSp.includes(keyword) ||
        tenKh.includes(keyword) ||
        email.includes(keyword) ||
        sdt.includes(keyword) ||
        lyDo.includes(keyword) ||
        ghiChu.includes(keyword)
      );
    });
  }, [returnsList, refundFilter, searchQuery]);

  // Gọi API POST /api/v1/admin/returns/:id/refund
  const handleConfirmRefund = async (item) => {
    const returnId = item.MaPhieuDoiTra;
    if (refundingIds[returnId]) return;

    setRefundingIds((prev) => ({ ...prev, [returnId]: true }));
    try {
      const res = await api.post(`/admin/returns/${returnId}/refund`);
      const updated = res.data?.data;

      setReturnsList((prev) =>
        prev.map((row) => {
          if (row.MaPhieuDoiTra !== returnId) return row;
          return {
            ...row,
            ...(updated || {}),
            TrangThaiHoanTien: updated?.TrangThaiHoanTien || 'DaHoanTien',
            TrangThaiDonHang: updated?.TrangThaiDonHang || 'DaHoanTien',
          };
        })
      );

      const orderCode =
        item.CodeDonHang || formatOrderCode(item.MaDonHang, item.NgayTao);
      toast.success(
        res.data?.message ||
          `Xác nhận hoàn tiền thành công cho phiếu #${String(returnId).padStart(
            4,
            '0'
          )} (${orderCode})`,
        { id: `refund-ok-${returnId}`, duration: 4500 }
      );

      fetchPassedReturns({ silent: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể xác nhận hoàn tiền cho phiếu đổi trả này';
      toast.error(msg, { id: `refund-err-${returnId}` });
      if (err.response?.status === 400 || err.response?.status === 404) {
        fetchPassedReturns({ silent: true });
      }
    } finally {
      setRefundingIds((prev) => {
        const next = { ...prev };
        delete next[returnId];
        return next;
      });
    }
  };

  const handleOpenLightbox = (images, initialIndex = 0) => {
    if (!images || images.length === 0) return;
    setLightboxImages(images);
    setLightboxIndex(initialIndex);
    setLightboxOpen(true);
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* ── Top Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Banknote className="w-7 h-7 text-emerald-600" />
            Phê duyệt Hoàn tiền Đổi trả
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách các phiếu đổi trả đã qua kiểm định đạt tiêu chuẩn từ Kho chờ Admin xác nhận hoàn tiền
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchPassedReturns({ silent: true })}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold transition-all shadow-sm disabled:opacity-60 cursor-pointer"
            title="Tải lại danh sách hoàn tiền"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loading || refreshing ? 'animate-spin text-emerald-600' : ''
              }`}
            />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 3 KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setRefundFilter('ALL')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            refundFilter === 'ALL'
              ? 'border-blue-400 ring-2 ring-blue-500/15 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Phiếu đạt kiểm định
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{metrics.total}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Kho đã xác nhận đạt điều kiện
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setRefundFilter('ChoDuyet')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            refundFilter === 'ChoDuyet'
              ? 'border-amber-400 ring-2 ring-amber-500/15 shadow-md'
              : 'border-slate-200 hover:border-amber-200 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chờ hoàn tiền
            </p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              {metrics.pendingCount}
            </h3>
            <span className="text-[11px] text-amber-600 font-semibold mt-0.5 block">
              Tổng cần hoàn: {formatVND(metrics.pendingAmount)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setRefundFilter('DaHoanTien')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            refundFilter === 'DaHoanTien'
              ? 'border-emerald-400 ring-2 ring-emerald-500/15 shadow-md'
              : 'border-slate-200 hover:border-emerald-200 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Đã hoàn tiền
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {metrics.refundedCount}
            </h3>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">
              Tổng đã hoàn: {formatVND(metrics.refundedAmount)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* ── Filter Tabs & Search Bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {REFUND_TABS.map((tab) => {
            const active = refundFilter === tab.id;
            const count =
              tab.id === 'ALL'
                ? metrics.total
                : tab.id === 'ChoDuyet'
                ? metrics.pendingCount
                : metrics.refundedCount;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRefundFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xs'
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm mã đơn, mã phiếu, sản phẩm, khách hàng..."
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content List ── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">
            Đang tải danh sách phiếu đổi trả đạt kiểm định...
          </p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-10 text-center space-y-3 shadow-sm">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-slate-700 font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => fetchPassedReturns()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <RotateCcw className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Không có phiếu đổi trả đạt kiểm định nào
          </h3>
          {(searchQuery || refundFilter !== 'ALL') && (
            <div className="mt-2 space-y-3">
              <p className="text-xs text-slate-500">
                Không tìm thấy phiếu đổi trả khớp với bộ lọc hiện tại.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setRefundFilter('ALL');
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
        <div className="space-y-4">
          {filteredReturns.map((item) => {
            const isPendingRefund = item.TrangThaiHoanTien === 'ChoDuyet';
            const isRefunded = item.TrangThaiHoanTien === 'DaHoanTien';
            const isRefunding = Boolean(refundingIds[item.MaPhieuDoiTra]);
            const proofImages = parseProofImages(item);
            const orderCode =
              item.CodeDonHang ||
              formatOrderCode(item.MaDonHang, item.donhang?.NgayMuaHang || item.NgayTao);
            const productImg = item.AnhSanPham || item.sanpham?.Anh;
            const dungLuong = item.DungLuong || item.sanpham?.DungLuong;
            const mauSac = item.MauSac || item.sanpham?.MauSac;

            return (
              <div
                key={item.MaPhieuDoiTra}
                className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                  isPendingRefund
                    ? 'border-amber-300 ring-1 ring-amber-200/80'
                    : 'border-emerald-200'
                }`}
              >
                {/* Card Header */}
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-900 text-white">
                      Phiếu #{String(item.MaPhieuDoiTra).padStart(4, '0')}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      Đơn hàng:{' '}
                      <strong className="text-blue-600 font-mono">{orderCode}</strong>
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDateTime(item.NgayTao)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kiểm định Kho: Đạt</span>
                    </span>

                    {isPendingRefund ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        <span>Chờ xác nhận hoàn tiền</span>
                      </span>
                    ) : isRefunded ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Đã hoàn tiền</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.TrangThaiHoanTien}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left: Product, Customer & Refund Amount */}
                    <div className="lg:col-span-5 space-y-3.5 border-b lg:border-b-0 lg:border-r border-slate-200 pb-4 lg:pb-0 lg:pr-5">
                      {/* Product Info */}
                      <div className="flex items-start gap-3.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                        <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          {productImg ? (
                            <img
                              src={formatImageUrl(productImg)}
                              alt={item.TenSanPham}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Smartphone className="w-8 h-8 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
                            {item.TenSanPham || `Sản phẩm #${item.MaSanPham}`}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {dungLuong && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/80 text-slate-700">
                                {dungLuong}
                              </span>
                            )}
                            {mauSac && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/80 text-slate-700">
                                {mauSac}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-blue-600">
                              {formatVND(item.GiaSanPham || item.TongTien)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Mã SP: #{item.MaSanPham} • Đơn hàng: #{item.MaDonHang}
                          </p>
                        </div>
                      </div>

                      {/* Refund Amount Highlight Box */}
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          Số tiền hoàn đơn hàng:
                        </span>
                        <span className="text-base font-extrabold text-emerald-700">
                          {formatVND(item.TongTien)}
                        </span>
                      </div>

                      {/* Customer Details */}
                      <div className="space-y-1.5 text-xs text-slate-600 px-1">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">
                            {item.TenKhachHang || item.TaiKhoan || 'Khách hàng'}
                          </span>
                          {item.TaiKhoan && (
                            <span className="text-slate-400 text-[11px]">
                              (@{item.TaiKhoan})
                            </span>
                          )}
                        </div>
                        {item.Email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{item.Email}</span>
                          </div>
                        )}
                        {item.SoDienThoai && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono">{item.SoDienThoai}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Customer Reason, Evidence & Warehouse Inspection Note */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Customer Reason */}
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                          <MessageSquareQuote className="w-4 h-4 text-blue-600" />
                          <span>Lý do đổi trả của khách hàng:</span>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed italic">
                          &ldquo;{item.LyDo || 'Không có mô tả chi tiết'}&rdquo;
                        </div>
                      </div>

                      {/* Warehouse Inspection Result Note */}
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1.5">
                          <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                          <span>Biên bản kiểm định của Kho:</span>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 leading-relaxed whitespace-pre-line">
                          {item.GhiChuKho || 'Kho xác nhận sản phẩm đạt điều kiện đổi trả.'}
                        </div>
                      </div>

                      {/* Evidence Photos */}
                      {proofImages.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <Eye className="w-4 h-4 text-slate-500" />
                              Ảnh bằng chứng ({proofImages.length})
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Nhấn vào ảnh để phóng to
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2.5">
                            {proofImages.map((imgUrl, idx) => (
                              <div
                                key={idx}
                                onClick={() => handleOpenLightbox(proofImages, idx)}
                                className="group relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer shadow-2xs hover:shadow-md hover:border-blue-400 transition-all"
                              >
                                <img
                                  src={formatImageUrl(imgUrl)}
                                  alt={`Bằng chứng ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <ZoomIn className="w-4 h-4" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer & Action */}
                  <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      Trạng thái đơn hàng hiện tại:{' '}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        {item.TrangThaiDonHang || 'YeuCauDoiTra'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPendingRefund ? (
                        <button
                          type="button"
                          disabled={isRefunding}
                          onClick={() => handleConfirmRefund(item)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isRefunding ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Đang xác nhận hoàn tiền...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Xác nhận Hoàn tiền</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span>Đã hoàn tiền đơn hàng</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Lightbox Image Modal ── */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 select-none">
          <div className="w-full max-w-5xl flex items-center justify-between text-white py-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20">
                Ảnh bằng chứng {lightboxIndex + 1} / {lightboxImages.length}
              </span>
              <a
                href={formatImageUrl(lightboxImages[lightboxIndex])}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Mở ảnh gốc
              </a>
            </div>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative w-full max-w-5xl flex-1 flex items-center justify-center min-h-0 py-2">
            {lightboxImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex(
                    (prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length
                  )
                }
                className="absolute left-2 sm:left-4 z-10 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={formatImageUrl(lightboxImages[lightboxIndex])}
              alt={`Ảnh bằng chứng ${lightboxIndex + 1}`}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
            />

            {lightboxImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) => (prev + 1) % lightboxImages.length)
                }
                className="absolute right-2 sm:right-4 z-10 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {lightboxImages.length > 1 && (
            <div className="w-full max-w-5xl py-2 flex items-center justify-center gap-2 overflow-x-auto">
              {lightboxImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={`w-14 h-14 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    idx === lightboxIndex
                      ? 'border-emerald-500 scale-105'
                      : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={formatImageUrl(img)}
                    alt={`Thumb ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminRefundsPage;
