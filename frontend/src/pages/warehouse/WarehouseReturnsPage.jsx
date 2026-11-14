import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  Smartphone,
  Eye,
  User,
  Phone,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ZoomIn,
  ShieldCheck,
  ShieldAlert,
  ClipboardCheck,
  ExternalLink,
  MessageSquareQuote,
  CheckSquare,
  Square,
  Filter,
  ImageOff,
} from 'lucide-react';
import api from '../../services/api';
import { formatOrderCode, formatVND, formatDateTime } from '../../utils/formatters';

const formatCurrency = (amount) => formatVND(Number(amount) || 0);

// Format static or external image URLs safely
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

const ProofImageTile = ({ imgUrl, index, isSingle, onOpen }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [imgUrl]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 cursor-pointer shadow-2xs hover:shadow-md hover:border-blue-400 transition-all text-left ${
        isSingle ? 'w-full max-w-sm h-44 sm:h-48' : 'w-full h-28 sm:h-32'
      }`}
      title="Bấm vào ảnh để phóng to đối chiếu"
    >
      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-400 p-2 text-center">
          <ImageOff className="w-5 h-5" />
          <span className="text-[11px] font-medium">Không tải được ảnh</span>
        </div>
      ) : (
        <img
          src={formatImageUrl(imgUrl)}
          alt={`Ảnh minh họa lỗi ${index + 1}`}
          onError={() => setHasError(true)}
          className={`w-full h-full transition-transform duration-200 group-hover:scale-[1.03] ${
            isSingle ? 'object-contain p-1.5' : 'object-cover'
          }`}
        />
      )}
      <div className="absolute inset-0 bg-slate-900/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 text-[11px] font-semibold backdrop-blur-sm">
          <ZoomIn className="w-3.5 h-3.5" />
          Phóng to
        </span>
      </div>
      {!isSingle && (
        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/65 text-white text-[10px] font-mono">
          #{index + 1}
        </span>
      )}
    </button>
  );
};

// Preset quick inspection notes for warehouse staff
const QUICK_NOTES_PASS = [
  'Ngoại quan nguyên vẹn, màn hình lỗi sọc do phần cứng NSX, đủ phụ kiện.',
  'Máy không trầy xước, tem niêm phong còn nguyên, lỗi nguồn không nhận sạc.',
  'Kiểm tra IMEI trùng khớp với đơn hàng, máy lỗi camera rung giật do NSX.',
  'Thiết bị đủ điều kiện đổi trả theo chính sách 30 ngày SmartZone.',
];

const QUICK_NOTES_FAIL = [
  'Vỏ máy có vết cấn móp sâu ở 4 góc do va đập vật lý (lỗi người dùng).',
  'Màn hình có dấu hiệu nứt vỡ kính bên trong và loang mực do tì đè mạnh.',
  'Kiểm tra phát hiện quỳ tím báo ngấm chất lỏng / vào nước qua khay SIM.',
  'Tem bảo hành có dấu hiệu bị bóc cạo, ốc đáy máy trầy trượt do tự ý tháo mở.',
  'Thiếu hộp đựng nguyên bản và phụ kiện đi kèm theo biên bản nhận máy.',
];

const INSPECTION_CHECKLIST = [
  'Kiểm tra số Serial / IMEI trên thân máy trùng khớp thông tin đơn hàng',
  'Kiểm tra ngoại quan thân vỏ, viền nhôm/thép, kính trước & sau không rơi vỡ',
  'Kiểm tra tem niêm phong SmartZone / hãng còn nguyên vẹn, ốc đáy chưa tháo',
  'Kiểm tra cảm biến ẩm / quỳ tím không chuyển màu đỏ (không vào nước)',
  'Đối chiếu chi tiết thực tế với hình ảnh chứng minh khách hàng cung cấp',
];

const WarehouseReturnsPage = () => {
  // State
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterVerdict, setFilterVerdict] = useState('all'); // 'all' | 'ChoKiemDinh' | 'Dat' | 'Loi_KhongDat'
  const [searchQuery, setSearchQuery] = useState('');

  // Inspection Modal state
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [activeReturn, setActiveReturn] = useState(null);
  const [inspectVerdict, setInspectVerdict] = useState('Dat'); // 'Dat' | 'Loi_KhongDat'
  const [inspectNotes, setInspectNotes] = useState('');
  const [checkedChecklist, setCheckedChecklist] = useState({});
  const [submittingInspect, setSubmittingInspect] = useState(false);

  // Lightbox Image Gallery state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Fetch returns list from GET /api/v1/warehouse/returns
  const fetchReturns = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get('/warehouse/returns');
      if (res.data && res.data.success) {
        setReturnsList(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        toast.error(res.data?.message || 'Không thể tải danh sách phiếu đổi trả');
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách phiếu đổi trả:', err);
      toast.error(
        err.response?.data?.message || 'Lỗi kết nối máy chủ khi lấy danh sách đổi trả'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // Keyboard navigation for image lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, lightboxImages.length]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = returnsList.length;
    const pending = returnsList.filter((r) => r.KetQuaKiemDinh === 'ChoKiemDinh').length;
    const passed = returnsList.filter((r) => r.KetQuaKiemDinh === 'Dat').length;
    const failed = returnsList.filter((r) => r.KetQuaKiemDinh === 'Loi_KhongDat').length;
    return { total, pending, passed, failed };
  }, [returnsList]);

  // Filtered & Searched data
  const filteredReturns = useMemo(() => {
    return returnsList.filter((item) => {
      // Verdict filter
      if (filterVerdict !== 'all' && item.KetQuaKiemDinh !== filterVerdict) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const query = searchQuery.trim().toLowerCase();
      const codeDon = String(item.CodeDonHang || '').toLowerCase();
      const maDon = String(item.MaDonHang || '');
      const maPhieu = String(item.MaPhieuDoiTra || '');
      const tenSp = String(item.TenSanPham || '').toLowerCase();
      const tenKh = String(item.TenKhachHang || item.TaiKhoan || '').toLowerCase();
      const sdt = String(item.SoDienThoai || '');
      const lyDo = String(item.LyDo || '').toLowerCase();

      return (
        codeDon.includes(query) ||
        maDon.includes(query) ||
        maPhieu.includes(query) ||
        tenSp.includes(query) ||
        tenKh.includes(query) ||
        sdt.includes(query) ||
        lyDo.includes(query)
      );
    });
  }, [returnsList, filterVerdict, searchQuery]);

  // Open Inspection Modal
  const handleOpenInspect = (item) => {
    setActiveReturn(item);
    // Pre-fill existing verdict and notes if already inspected, or defaults
    if (item.KetQuaKiemDinh === 'Loi_KhongDat') {
      setInspectVerdict('Loi_KhongDat');
    } else {
      setInspectVerdict('Dat');
    }
    setInspectNotes(item.GhiChuKho || '');
    setCheckedChecklist({});
    setInspectModalOpen(true);
  };

  // Close Inspection Modal
  const handleCloseInspect = () => {
    if (submittingInspect) return;
    setInspectModalOpen(false);
    setActiveReturn(null);
    setInspectNotes('');
  };

  // Submit Inspection result -> PUT /api/v1/warehouse/returns/:id/inspect
  const handleSubmitInspect = async (e) => {
    e?.preventDefault();
    if (!activeReturn) return;

    const trimmedNotes = inspectNotes.trim();
    if (!trimmedNotes) {
      toast.error('Vui lòng nhập ghi chú kết quả kiểm định của kho');
      return;
    }

    try {
      setSubmittingInspect(true);
      const payload = {
        ketQua: inspectVerdict,
        ghiChuKho: trimmedNotes,
      };

      const res = await api.put(
        `/warehouse/returns/${activeReturn.MaPhieuDoiTra}/inspect`,
        payload
      );

      if (res.data && res.data.success) {
        toast.success(
          inspectVerdict === 'Dat'
            ? 'Đã ghi nhận: Đạt điều kiện đổi trả!'
            : 'Đã ghi nhận: Không đạt (Lỗi do người dùng)!'
        );
        handleCloseInspect();
        fetchReturns({ silent: true });
      } else {
        toast.error(res.data?.message || 'Cập nhật kiểm định thất bại');
      }
    } catch (err) {
      console.error('Lỗi khi lưu kết quả kiểm định:', err);
      toast.error(
        err.response?.data?.message || 'Có lỗi xảy ra khi gửi kết quả kiểm định'
      );
    } finally {
      setSubmittingInspect(false);
    }
  };

  // Open Lightbox Image Viewer
  const handleOpenLightbox = (images, initialIndex = 0) => {
    if (!images || images.length === 0) return;
    setLightboxImages(images);
    setLightboxIndex(initialIndex);
    setLightboxOpen(true);
  };

  // Toggle checklist item
  const handleToggleChecklist = (index) => {
    setCheckedChecklist((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 pb-12">
      {/* ── Page Header & Action Bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-blue-600 shrink-0" />
            <span>Kiểm định Hàng Đổi trả</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Tiếp nhận máy trả về, đối chiếu ảnh chụp bằng chứng khách gửi &amp; lập biên bản kiểm định gửi Admin duyệt hoàn tiền.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchReturns({ silent: true })}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw
              className={`w-4 h-4 text-blue-600 ${refreshing || loading ? 'animate-spin' : ''}`}
            />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── Metrics Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Tổng phiếu */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tổng yêu cầu
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {metrics.total}
            </p>
            <p className="mt-1 text-xs text-slate-400">Tất cả biên bản đổi trả</p>
          </div>

          {/* Card 2: Chờ kiểm định (Highlight quan trọng) */}
          <div
            onClick={() => setFilterVerdict('ChoKiemDinh')}
            className={`cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all ${
              filterVerdict === 'ChoKiemDinh'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
                : 'bg-white border-slate-200 hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" />
                Chờ kiểm định
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                Cần xử lý
              </span>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-600">
              {metrics.pending}
            </p>
            <p className="mt-1 text-xs text-amber-700/80">Máy trả về chờ đối chiếu</p>
          </div>

          {/* Card 3: Đạt điều kiện */}
          <div
            onClick={() => setFilterVerdict('Dat')}
            className={`cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all ${
              filterVerdict === 'Dat'
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/30'
                : 'bg-white border-slate-200 hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Đạt điều kiện
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {metrics.passed}
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">Lỗi NSX - duyệt hoàn tiền</p>
          </div>

          {/* Card 4: Không đạt (Lỗi người dùng) */}
          <div
            onClick={() => setFilterVerdict('Loi_KhongDat')}
            className={`cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all ${
              filterVerdict === 'Loi_KhongDat'
                ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-400/30'
                : 'bg-white border-slate-200 hover:border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Lỗi do người dùng
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-rose-600">
              {metrics.failed}
            </p>
            <p className="mt-1 text-xs text-rose-700/80">Từ chối / cấn móp, ẩm nước</p>
          </div>
        </div>

        {/* ── Filter & Search Toolbar ── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterVerdict('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                filterVerdict === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Tất cả ({metrics.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterVerdict('ChoKiemDinh')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                filterVerdict === 'ChoKiemDinh'
                  ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/20'
                  : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100/70'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chờ kiểm định ({metrics.pending})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterVerdict('Dat')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                filterVerdict === 'Dat'
                  ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100/70'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đạt điều kiện ({metrics.passed})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterVerdict('Loi_KhongDat')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                filterVerdict === 'Loi_KhongDat'
                  ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/20'
                  : 'bg-rose-50 text-rose-800 border border-rose-200/80 hover:bg-rose-100/70'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Lỗi do người dùng ({metrics.failed})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[280px] sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn, tên máy, khách hàng..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Main Returns List ── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              Đang tải danh sách phiếu đổi trả...
            </p>
            <p className="text-xs text-slate-400 mt-1">Đang đồng bộ dữ liệu từ phân hệ Kho Vận</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <RotateCcw className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Không có phiếu đổi trả nào phù hợp
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              {searchQuery || filterVerdict !== 'all'
                ? 'Không tìm thấy kết quả khớp với bộ lọc hiện tại. Vui lòng thử xóa từ khóa tìm kiếm hoặc chọn bộ lọc khác.'
                : 'Hiện tại chưa có yêu cầu đổi trả hàng nào được gửi từ khách hàng.'}
            </p>
            {(searchQuery || filterVerdict !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setFilterVerdict('all');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Đặt lại bộ lọc</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReturns.map((item) => {
              const isPending = item.KetQuaKiemDinh === 'ChoKiemDinh';
              const isPassed = item.KetQuaKiemDinh === 'Dat';
              const isFailed = item.KetQuaKiemDinh === 'Loi_KhongDat';
              const proofImages = parseProofImages(item);
              const orderNote =
                item.GhiChu && String(item.GhiChu).trim()
                  ? String(item.GhiChu).trim()
                  : item.donhang?.GhiChu && String(item.donhang.GhiChu).trim()
                  ? String(item.donhang.GhiChu).trim()
                  : '';

              return (
                <div
                  key={item.MaPhieuDoiTra}
                  className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                    isPending
                      ? 'border-amber-300 ring-1 ring-amber-200/80 bg-gradient-to-r from-amber-50/20 to-white'
                      : isPassed
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : 'border-rose-200 hover:border-rose-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-900 text-white">
                          Phiếu #{String(item.MaPhieuDoiTra).padStart(4, '0')}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          Đơn hàng:{' '}
                          <strong className="text-blue-600 font-mono">
                            {item.CodeDonHang ||
                              formatOrderCode(
                                item.MaDonHang,
                                item.donhang?.NgayMuaHang || item.NgayTao
                              )}
                          </strong>
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                      <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDateTime(item.NgayTao)}</span>
                      </div>
                    </div>

                    {/* Verdict & Refund Badges */}
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          <span>Chờ kiểm định kho</span>
                        </span>
                      )}
                      {isPassed && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đạt điều kiện đổi trả</span>
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Khác (Lỗi do người dùng)</span>
                        </span>
                      )}

                      {/* Refund Status */}
                      {item.TrangThaiHoanTien === 'DangHoanTien' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          Đang hoàn tiền
                        </span>
                      )}
                      {item.TrangThaiHoanTien === 'DaHoanTien' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Đã hoàn tiền
                        </span>
                      )}
                      {item.TrangThaiHoanTien === 'TuChoi' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700 border border-slate-300">
                          Đã từ chối hoàn tiền
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* Left: Product & Customer Info (5 cols) */}
                      <div className="lg:col-span-5 space-y-3.5 border-b lg:border-b-0 lg:border-r border-slate-200 pb-4 lg:pb-0 lg:pr-5">
                        {/* Product item */}
                        <div className="flex items-start gap-3.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                          <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                            {item.AnhSanPham ? (
                              <img
                                src={formatImageUrl(item.AnhSanPham)}
                                alt={item.TenSanPham}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Smartphone className="w-8 h-8 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
                              {item.TenSanPham || 'Sản phẩm đổi trả'}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200/80">
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
                              <span className="text-xs font-semibold text-blue-600">
                                {formatCurrency(
                                  item.TongTien !== null && item.TongTien !== undefined
                                    ? item.TongTien
                                    : item.DonGia || item.GiaSanPham || 0
                                )}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Ghi chú:{' '}
                              <span
                                className={
                                  orderNote ? 'text-slate-700' : 'italic text-slate-400'
                                }
                              >
                                {orderNote || 'Không có ghi chú'}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Customer snippet */}
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
                          {item.SoDienThoai && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <a
                                href={`tel:${item.SoDienThoai}`}
                                className="text-blue-600 hover:underline"
                              >
                                {item.SoDienThoai}
                              </a>
                            </div>
                          )}
                          {item.donhang?.DiaChiGiaoHang && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              Địa chỉ: {item.donhang.DiaChiGiaoHang}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Center & Right: Reason & Evidence Photos & Notes (7 cols) */}
                      <div className="lg:col-span-7 space-y-4">
                        {/* User's Reason Block */}
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                            <MessageSquareQuote className="w-4 h-4 text-blue-600" />
                            <span>Lý do đổi trả do khách hàng cung cấp:</span>
                          </div>
                          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed italic">
                            &ldquo;{item.LyDo || 'Không có mô tả chi tiết'}&rdquo;
                          </div>
                        </div>

                        {/* User Evidence Photos */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <Eye className="w-4 h-4 text-slate-500" />
                              Ảnh minh họa lỗi của khách ({proofImages.length})
                            </span>
                            {proofImages.length > 0 && (
                              <span className="text-[11px] text-slate-400">
                                Bấm vào ảnh để phóng to đối chiếu
                              </span>
                            )}
                          </div>

                          {proofImages.length === 0 ? (
                            <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400 text-center">
                              Khách hàng không đính kèm ảnh bằng chứng
                            </div>
                          ) : proofImages.length === 1 ? (
                            <ProofImageTile
                              imgUrl={proofImages[0]}
                              index={0}
                              isSingle
                              onOpen={() => handleOpenLightbox(proofImages, 0)}
                            />
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              {proofImages.map((imgUrl, imgIdx) => (
                                <ProofImageTile
                                  key={imgIdx}
                                  imgUrl={imgUrl}
                                  index={imgIdx}
                                  isSingle={false}
                                  onOpen={() => handleOpenLightbox(proofImages, imgIdx)}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Existing Inspection Note (if already inspected) */}
                        {!isPending && item.GhiChuKho && (
                          <div
                            className={`p-3 rounded-xl border text-xs space-y-1 ${
                              isPassed
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                : 'bg-rose-50/70 border-rose-200 text-rose-900'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold">
                              <ClipboardCheck className="w-4 h-4" />
                              <span>Biên bản kiểm định của Kho:</span>
                              <span className="font-normal text-[11px] opacity-80">
                                ({formatDateTime(item.NgayCapNhat || item.NgayTao)})
                              </span>
                            </div>
                            <p className="leading-relaxed pl-5 whitespace-pre-line">
                              {item.GhiChuKho}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-400">
                        Trạng thái đơn hàng:{' '}
                        <span className="font-semibold text-slate-600">
                          {item.TrangThaiDonHang || 'YeuCauDoiTra'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => handleOpenInspect(item)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition-all"
                          >
                            <ClipboardCheck className="w-4 h-4" />
                            <span>Kiểm định sản phẩm</span>
                          </button>
                        ) : (
                          item.TrangThaiHoanTien === 'ChoDuyet' && (
                            <button
                              type="button"
                              onClick={() => handleOpenInspect(item)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Đánh giá lại / Cập nhật</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* ── MODAL: KIỂM ĐỊNH HÀNG ĐỔI TRẢ (PUT /warehouse/returns/:id/inspect) ── */}
      {inspectModalOpen && activeReturn && (() => {
        const modalProofImages = parseProofImages(activeReturn);
        return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">
                    Biên Bản Kiểm Định Hàng Đổi Trả
                  </h3>
                  <p className="text-xs text-slate-300">
                    Phiếu #{String(activeReturn.MaPhieuDoiTra).padStart(4, '0')} • Đơn hàng{' '}
                    <span className="text-blue-300 font-mono font-semibold">
                      {activeReturn.CodeDonHang ||
                        formatOrderCode(
                          activeReturn.MaDonHang,
                          activeReturn.donhang?.NgayMuaHang || activeReturn.NgayTao
                        )}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseInspect}
                disabled={submittingInspect}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitInspect} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Product and Customer recap */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                    {activeReturn.AnhSanPham ? (
                      <img
                        src={formatImageUrl(activeReturn.AnhSanPham)}
                        alt={activeReturn.TenSanPham}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Smartphone className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">
                      {activeReturn.TenSanPham}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200/80">
                        {`Màu: ${
                          activeReturn.MauSac && String(activeReturn.MauSac).trim()
                            ? String(activeReturn.MauSac).trim()
                            : 'N/A'
                        } | Dung lượng: ${
                          activeReturn.DungLuong && String(activeReturn.DungLuong).trim()
                            ? String(activeReturn.DungLuong).trim()
                            : 'N/A'
                        }`}
                      </span>
                      <span className="text-xs font-bold text-blue-600">
                        {formatCurrency(
                          activeReturn.TongTien !== null &&
                            activeReturn.TongTien !== undefined
                            ? activeReturn.TongTien
                            : activeReturn.DonGia || activeReturn.GiaSanPham || 0
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-slate-800">
                    {activeReturn.TenKhachHang || activeReturn.TaiKhoan}
                  </p>
                  <p className="text-slate-500 text-[11px] font-mono">
                    {activeReturn.SoDienThoai || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Customer's Reason & Direct Proof Image Preview */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                    <MessageSquareQuote className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Lý do đổi trả của khách hàng:</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed italic">
                    &ldquo;{activeReturn.LyDo || 'Không có mô tả chi tiết'}&rdquo;
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-slate-500" />
                      Ảnh minh họa lỗi của khách ({modalProofImages.length})
                    </span>
                    {modalProofImages.length > 0 && (
                      <span className="text-[11px] text-slate-400">
                        Bấm vào ảnh để phóng to
                      </span>
                    )}
                  </div>
                  {modalProofImages.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400 text-center">
                      Khách hàng không đính kèm ảnh chứng minh
                    </div>
                  ) : modalProofImages.length === 1 ? (
                    <ProofImageTile
                      imgUrl={modalProofImages[0]}
                      index={0}
                      isSingle
                      onOpen={() => handleOpenLightbox(modalProofImages, 0)}
                    />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {modalProofImages.map((imgUrl, idx) => (
                        <ProofImageTile
                          key={idx}
                          imgUrl={imgUrl}
                          index={idx}
                          isSingle={false}
                          onOpen={() => handleOpenLightbox(modalProofImages, idx)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Technical Inspection Guidelines Checklist */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Quy trình kiểm định kỹ thuật tại kho:
                </span>
                <div className="space-y-1.5">
                  {INSPECTION_CHECKLIST.map((step, idx) => {
                    const isChecked = !!checkedChecklist[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleChecklist(idx)}
                        className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 hover:text-slate-900 select-none"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <span className={isChecked ? 'line-through text-slate-400' : ''}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 1: Select Verdict (Radio Cards) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Kết luận kiểm định máy trả về <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Đạt */}
                  <label
                    className={`relative flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      inspectVerdict === 'Dat'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="inspectVerdict"
                      value="Dat"
                      checked={inspectVerdict === 'Dat'}
                      onChange={() => setInspectVerdict('Dat')}
                      className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-900">
                          Đạt điều kiện đổi trả
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700/80 mt-1 leading-snug">
                        Lỗi do nhà sản xuất (phần cứng/màn hình/nguồn). Ngoại quan nguyên vẹn,
                        không ngấm nước, đủ điều kiện hoàn tiền.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Lỗi do người dùng */}
                  <label
                    className={`relative flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      inspectVerdict === 'Loi_KhongDat'
                        ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="inspectVerdict"
                      value="Loi_KhongDat"
                      checked={inspectVerdict === 'Loi_KhongDat'}
                      onChange={() => setInspectVerdict('Loi_KhongDat')}
                      className="mt-1 h-4 w-4 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span className="text-sm font-bold text-rose-900">
                          Khác (Lỗi do người dùng)
                        </span>
                      </div>
                      <p className="text-xs text-rose-700/80 mt-1 leading-snug">
                        Thiết bị cấn móp, nứt vỡ, ngấm chất lỏng, rách tem bảo hành hoặc can
                        thiệp trái phép. Từ chối hoàn tiền.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Step 2: Inspection Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="ghiChuKhoInput"
                    className="block text-xs font-bold text-slate-800 uppercase tracking-wider"
                  >
                    2. Ghi chú chi tiết biên bản kiểm định{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {inspectNotes.length} ký tự
                  </span>
                </div>

                {/* Preset Suggestions */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500">Mẫu ghi chú nhanh:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(inspectVerdict === 'Dat' ? QUICK_NOTES_PASS : QUICK_NOTES_FAIL).map(
                      (preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setInspectNotes(preset)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-colors text-left"
                        >
                          + {preset.slice(0, 42)}...
                        </button>
                      )
                    )}
                  </div>
                </div>

                <textarea
                  id="ghiChuKhoInput"
                  rows={4}
                  value={inspectNotes}
                  onChange={(e) => setInspectNotes(e.target.value)}
                  placeholder="Ghi rõ tình trạng ngoại quan thực tế, kết quả bật nguồn thử nghiệm, phát hiện lỗi phần cứng hoặc dấu vết va đập/chất lỏng..."
                  className="w-full p-3.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 leading-relaxed placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseInspect}
                  disabled={submittingInspect}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingInspect || !inspectNotes.trim()}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 ${
                    inspectVerdict === 'Dat'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  }`}
                >
                  {submittingInspect ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu biên bản...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lưu kết quả kiểm định</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* ── LIGHTBOX: PHÓNG TO ẢNH BẰNG CHỨNG CỦA KHÁCH HÀNG ── */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 select-none"
        >
          {/* Lightbox Header */}
          <div className="w-full max-w-5xl flex items-center justify-between text-white py-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20">
                Ảnh chứng minh {lightboxIndex + 1} / {lightboxImages.length}
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
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Center Image with Navigation */}
          <div className="relative w-full max-w-5xl flex-1 flex items-center justify-center min-h-0 py-2">
            {lightboxImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex(
                    (prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length
                  )
                }
                className="absolute left-2 sm:left-4 z-10 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-105"
                title="Ảnh trước (Mũi tên trái)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <div className="max-w-full max-h-full flex items-center justify-center p-2">
              <img
                src={formatImageUrl(lightboxImages[lightboxIndex])}
                alt={`Ảnh ${lightboxIndex + 1}`}
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>

            {lightboxImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) => (prev + 1) % lightboxImages.length)
                }
                className="absolute right-2 sm:right-4 z-10 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-105"
                title="Ảnh tiếp theo (Mũi tên phải)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Thumbnails Footer */}
          {lightboxImages.length > 1 && (
            <div className="w-full max-w-5xl py-2 flex items-center justify-center gap-2 overflow-x-auto">
              {lightboxImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={`w-14 h-14 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    idx === lightboxIndex
                      ? 'border-blue-500 scale-105 ring-2 ring-blue-400/40'
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

export default WarehouseReturnsPage;

