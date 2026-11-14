import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  ImageOff,
  CreditCard,
  Landmark,
  Wallet,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileCheck,
  Send,
  Building2,
} from 'lucide-react';
import api from '../../services/api';
import { formatOrderCode, formatVND, formatDateTime } from '../../utils/formatters';

const formatCurrency = (amount) => formatVND(Number(amount) || 0);

const REFUND_TABS = [
  { id: 'ALL', label: 'Tất cả đạt kiểm định' },
  { id: 'ChoDuyet', label: 'Chờ duyệt lệnh (GĐ 1)' },
  { id: 'DangHoanTien', label: 'Đang xử lý chuyển tiền (GĐ 2)' },
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

/**
 * Phân tích và hiển thị thông tin kênh hoàn tiền chuẩn thực tế
 */
const resolveChannelInfo = (item) => {
  const method = String(
    item?.PhuongThucHoanTien || item?.PhuongThucThanhToan || ''
  ).trim();
  const upper = method.toUpperCase();

  if (upper.includes('VNPAY') || upper.includes('VN PAY')) {
    return {
      key: 'VNPAY',
      label: 'Hoàn tự động về cổng VNPay',
      shortLabel: 'Cổng VNPay',
      channelBadgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: CreditCard,
      isAuto: true,
      description: 'Đơn thanh toán online qua VNPay. Lệnh hoàn sẽ được kích hoạt về thẻ/tài khoản VNPay của khách.',
      guideNote:
        'Admin thực hiện đối soát hoàn tiền qua Cổng quản trị VNPay Merchant hoặc kích hoạt hoàn tự động, sau đó nhập Mã giao dịch hoàn tiền (Refund Transaction ID) để đối soát.',
      refPrefix: 'VNP-REF',
    };
  }

  if (upper.includes('ZALO')) {
    return {
      key: 'ZALOPAY',
      label: 'Hoàn tự động về cổng ZaloPay',
      shortLabel: 'Ví ZaloPay',
      channelBadgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: Wallet,
      isAuto: true,
      description: 'Đơn thanh toán online qua ZaloPay. Lệnh hoàn sẽ chuyển trả về ví ZaloPay của khách.',
      guideNote:
        'Admin thực hiện đối soát hoàn tiền qua Cổng đối tác ZaloPay Merchant, sau đó nhập Mã giao dịch hoàn trả của ZaloPay để đối soát.',
      refPrefix: 'ZLP-REF',
    };
  }

  return {
    key: 'COD',
    label: 'Chuyển khoản ngân hàng cho đơn COD',
    shortLabel: 'Chuyển khoản (COD)',
    channelBadgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Landmark,
    isAuto: false,
    description: 'Đơn thanh toán tiền mặt khi nhận hàng (COD). Admin thực hiện chuyển khoản ngân hàng trực tiếp cho khách.',
    guideNote:
      'Admin thực hiện Chuyển khoản ngân hàng (Internet Banking) tới tài khoản của khách hàng, sau đó nhập Mã tham chiếu ngân hàng (FT... / REF...) để đối soát.',
    refPrefix: 'REF-BANK',
  };
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
      title="Bấm vào ảnh để phóng to"
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

const AdminRefundsPage = () => {
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [refundFilter, setRefundFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Giai đoạn 1: Duyệt yêu cầu & tạo lệnh
  const [stage1ModalItem, setStage1ModalItem] = useState(null);
  const [stage1Submitting, setStage1Submitting] = useState(false);

  // Modal Giai đoạn 2: Nhập mã giao dịch đối soát & xác nhận đã chuyển tiền
  const [stage2ModalItem, setStage2ModalItem] = useState(null);
  const [stage2Form, setStage2Form] = useState({ maGiaoDich: '', ghiChu: '' });
  const [stage2Submitting, setStage2Submitting] = useState(false);

  // Clipboard copy state
  const [copiedCode, setCopiedCode] = useState(null);

  // Lightbox Image Viewer
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Fetch danh sách phiếu đổi trả từ Admin API (hoặc fallback sang Warehouse)
  const fetchPassedReturns = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      let res;
      try {
        res = await api.get('/admin/returns');
      } catch {
        // Fallback sang /warehouse/returns nếu route /admin/returns chưa load
        res = await api.get('/warehouse/returns', {
          params: { ketQua: 'Dat' },
        });
      }

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

  // Keyboard navigation cho Lightbox & Modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) setLightboxOpen(false);
        else if (stage1ModalItem && !stage1Submitting) setStage1ModalItem(null);
        else if (stage2ModalItem && !stage2Submitting) setStage2ModalItem(null);
      } else if (lightboxOpen) {
        if (e.key === 'ArrowRight') {
          setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
        } else if (e.key === 'ArrowLeft') {
          setLightboxIndex(
            (prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length
          );
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, lightboxImages.length, stage1ModalItem, stage1Submitting, stage2ModalItem, stage2Submitting]);

  // Copy mã giao dịch vào bộ nhớ tạm
  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Đã sao chép mã giao dịch: ${code}`, { id: `copy-${code}` });
    setTimeout(() => {
      setCopiedCode((curr) => (curr === code ? null : curr));
    }, 2500);
  };

  // 4 Thống kê KPI cốt lõi
  const metrics = useMemo(() => {
    const pendingList = returnsList.filter((r) => r.TrangThaiHoanTien === 'ChoDuyet');
    const processingList = returnsList.filter((r) => r.TrangThaiHoanTien === 'DangHoanTien');
    const refundedList = returnsList.filter((r) => r.TrangThaiHoanTien === 'DaHoanTien');

    const pendingAmount = pendingList.reduce(
      (sum, r) => sum + (Number(r.TongTien) || 0),
      0
    );
    const processingAmount = processingList.reduce(
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
      pendingAmount,
      processingCount: processingList.length,
      processingAmount,
      refundedCount: refundedList.length,
      refundedAmount,
    };
  }, [returnsList]);

  // Lọc và tìm kiếm danh sách
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
      const ghiChuKho = String(item.GhiChuKho || '').toLowerCase();
      const maGiaoDich = String(item.MaGiaoDichHoanTien || '').toLowerCase();
      const kenhHoan = String(item.PhuongThucHoanTien || item.KenhHoanTien || '').toLowerCase();
      const pttt = String(item.PhuongThucThanhToan || '').toLowerCase();

      return (
        maPhieu.includes(keyword) ||
        maDon.includes(keyword) ||
        codeDon.includes(keyword) ||
        tenSp.includes(keyword) ||
        tenKh.includes(keyword) ||
        email.includes(keyword) ||
        sdt.includes(keyword) ||
        lyDo.includes(keyword) ||
        ghiChuKho.includes(keyword) ||
        maGiaoDich.includes(keyword) ||
        kenhHoan.includes(keyword) ||
        pttt.includes(keyword)
      );
    });
  }, [returnsList, refundFilter, searchQuery]);

  // GIAI ĐOẠN 1: Mở modal duyệt yêu cầu
  const handleOpenStage1Modal = (item) => {
    setStage1ModalItem(item);
  };

  // GIAI ĐOẠN 1: Thực thi Duyệt yêu cầu hoàn tiền (ChoDuyet -> DangHoanTien)
  const handleConfirmStage1 = async () => {
    if (!stage1ModalItem) return;
    const returnId = stage1ModalItem.MaPhieuDoiTra;

    setStage1Submitting(true);
    try {
      const res = await api.post(`/admin/returns/${returnId}/refund`, {
        action: 'initiate',
      });
      const updated = res.data?.data;

      setReturnsList((prev) =>
        prev.map((row) => {
          if (row.MaPhieuDoiTra !== returnId) return row;
          return {
            ...row,
            ...(updated || {}),
            TrangThaiHoanTien: 'DangHoanTien',
            PhuongThucHoanTien: updated?.PhuongThucHoanTien || row.PhuongThucHoanTien,
            KenhHoanTien: updated?.KenhHoanTien || row.KenhHoanTien,
          };
        })
      );

      toast.success('Đã duyệt yêu cầu hoàn tiền', {
        id: `stage1-ok-${returnId}`,
      });

      setStage1ModalItem(null);
      fetchPassedReturns({ silent: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể duyệt yêu cầu hoàn tiền cho phiếu này';
      toast.error(msg, { id: `stage1-err-${returnId}` });
    } finally {
      setStage1Submitting(false);
    }
  };

  // GIAI ĐOẠN 2: Mở modal nhập mã giao dịch đối soát
  const handleOpenStage2Modal = (item) => {
    setStage2ModalItem(item);
    setStage2Form({
      maGiaoDich: item.MaGiaoDichHoanTien || '',
      ghiChu: item.GhiChuHoanTien || '',
    });
  };

  // GIAI ĐOẠN 2: Thực thi Xác nhận đã chuyển tiền (DangHoanTien -> DaHoanTien)
  const handleConfirmStage2 = async () => {
    if (!stage2ModalItem) return;
    const returnId = stage2ModalItem.MaPhieuDoiTra;

    const cleanRef = stage2Form.maGiaoDich.trim();
    if (!cleanRef) {
      toast.error('Vui lòng nhập Mã giao dịch hoàn tiền hoặc Mã tham chiếu ngân hàng thực tế');
      return;
    }

    setStage2Submitting(true);
    try {
      const res = await api.post(`/admin/returns/${returnId}/refund`, {
        action: 'confirm',
        maGiaoDich: cleanRef,
        ghiChu: stage2Form.ghiChu.trim(),
      });
      const updated = res.data?.data;

      setReturnsList((prev) =>
        prev.map((row) => {
          if (row.MaPhieuDoiTra !== returnId) return row;
          return {
            ...row,
            ...(updated || {}),
            TrangThaiHoanTien: 'DaHoanTien',
            TrangThaiDonHang: 'DaHoanTien',
            MaGiaoDichHoanTien: cleanRef,
            GhiChuHoanTien: stage2Form.ghiChu.trim(),
            NgayHoanTien: new Date().toISOString(),
          };
        })
      );

      toast.success(
        res.data?.message ||
          `Xác nhận chuyển tiền thành công cho phiếu #${String(returnId).padStart(4, '0')} (Mã GD: ${cleanRef})`,
        { id: `stage2-ok-${returnId}`, duration: 5500 }
      );

      setStage2ModalItem(null);
      fetchPassedReturns({ silent: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể xác nhận hoàn tiền cho phiếu này';
      toast.error(msg, { id: `stage2-err-${returnId}` });
    } finally {
      setStage2Submitting(false);
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
            Phê duyệt & Đối soát Hoàn tiền Đổi trả
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quy trình hoàn tiền 2 giai đoạn chuẩn thanh toán thực tế: Duyệt tạo lệnh theo kênh thanh toán & Đối soát mã giao dịch chuyển tiền.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchPassedReturns({ silent: true })}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
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

      {/* ── 4 KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng kiểm định Đạt */}
        <button
          type="button"
          onClick={() => setRefundFilter('ALL')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            refundFilter === 'ALL'
              ? 'border-blue-400 ring-2 ring-blue-500/15 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Phiếu đạt kiểm định
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{metrics.total}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Kho đã kiểm tra hợp lệ
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </button>

        {/* Card 2: Chờ duyệt lệnh (GĐ 1) */}
        <button
          type="button"
          onClick={() => setRefundFilter('ChoDuyet')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            refundFilter === 'ChoDuyet'
              ? 'border-amber-400 ring-2 ring-amber-500/15 shadow-md'
              : 'border-slate-200 hover:border-amber-200 shadow-xs'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <span>Chờ duyệt lệnh (GĐ 1)</span>
            </p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              {metrics.pendingCount}
            </h3>
            <span className="text-[11px] text-amber-600 font-semibold mt-0.5 block truncate max-w-[150px]">
              Cần duyệt: {formatCurrency(metrics.pendingAmount)}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </button>

        {/* Card 3: Đang chuyển tiền (GĐ 2) */}
        <button
          type="button"
          onClick={() => setRefundFilter('DangHoanTien')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            refundFilter === 'DangHoanTien'
              ? 'border-indigo-400 ring-2 ring-indigo-500/15 shadow-md'
              : 'border-slate-200 hover:border-indigo-200 shadow-xs'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
              <span>Đang hoàn tiền (GĐ 2)</span>
            </p>
            <h3 className="text-2xl font-bold text-indigo-600 mt-1">
              {metrics.processingCount}
            </h3>
            <span className="text-[11px] text-indigo-600 font-semibold mt-0.5 block truncate max-w-[150px]">
              Chờ CK: {formatCurrency(metrics.processingAmount)}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </button>

        {/* Card 4: Đã hoàn tất */}
        <button
          type="button"
          onClick={() => setRefundFilter('DaHoanTien')}
          className={`text-left bg-white rounded-2xl p-5 border transition-all flex items-center justify-between cursor-pointer ${
            refundFilter === 'DaHoanTien'
              ? 'border-emerald-400 ring-2 ring-emerald-500/15 shadow-md'
              : 'border-slate-200 hover:border-emerald-200 shadow-xs'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Đã hoàn tiền
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {metrics.refundedCount}
            </h3>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block truncate max-w-[150px]">
              Đã hoàn: {formatCurrency(metrics.refundedAmount)}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* ── Filter Tabs & Search Bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {REFUND_TABS.map((tab) => {
            const active = refundFilter === tab.id;
            const count =
              tab.id === 'ALL'
                ? metrics.total
                : tab.id === 'ChoDuyet'
                ? metrics.pendingCount
                : tab.id === 'DangHoanTien'
                ? metrics.processingCount
                : metrics.refundedCount;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRefundFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
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
            placeholder="Tìm mã đơn, mã GD, mã phiếu, kênh hoàn, khách hàng..."
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
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">
            Đang tải danh sách phiếu đổi trả đạt kiểm định...
          </p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-10 text-center space-y-3 shadow-xs">
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
        <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <RotateCcw className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Không tìm thấy phiếu đổi trả phù hợp
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
            const isPendingApproval = item.TrangThaiHoanTien === 'ChoDuyet';
            const isProcessingRefund = item.TrangThaiHoanTien === 'DangHoanTien';
            const isRefunded = item.TrangThaiHoanTien === 'DaHoanTien';

            const channel = resolveChannelInfo(item);
            const ChannelIcon = channel.icon;

            const proofImages = parseProofImages(item);
            const orderCode =
              item.CodeDonHang ||
              formatOrderCode(item.MaDonHang, item.donhang?.NgayMuaHang || item.NgayTao);
            const productImg = item.AnhSanPham || item.sanpham?.Anh;
            const dungLuong =
              item.DungLuong && String(item.DungLuong).trim()
                ? String(item.DungLuong).trim()
                : '';
            const mauSac =
              item.MauSac && String(item.MauSac).trim()
                ? String(item.MauSac).trim()
                : '';
            const orderNote =
              item.GhiChu && String(item.GhiChu).trim()
                ? String(item.GhiChu).trim()
                : item.donhang?.GhiChu && String(item.donhang.GhiChu).trim()
                ? String(item.donhang.GhiChu).trim()
                : '';

            return (
              <div
                key={item.MaPhieuDoiTra}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  isPendingApproval
                    ? 'border-amber-300 ring-1 ring-amber-200/80'
                    : isProcessingRefund
                    ? 'border-indigo-300 ring-1 ring-indigo-200/80'
                    : 'border-emerald-200'
                }`}
              >
                {/* ── Card Header ── */}
                <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
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
                    {/* Kiểm định kho */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kiểm định Kho: Đạt</span>
                    </span>

                    {/* Badge Trạng thái 2 giai đoạn */}
                    {isPendingApproval ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        <span>Chờ duyệt lệnh hoàn tiền</span>
                      </span>
                    ) : isProcessingRefund ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span>GĐ 2: Đang hoàn tiền (Chờ đối soát)</span>
                      </span>
                    ) : isRefunded ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đã hoàn tiền thành công</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.TrangThaiHoanTien}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Card Body ── */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Cột trái: Sản phẩm, Khách hàng & Số tiền hoàn (5 cols) */}
                    <div className="lg:col-span-5 space-y-3.5 border-b lg:border-b-0 lg:border-r border-slate-200 pb-4 lg:pb-0 lg:pr-5">
                      {/* Sản phẩm */}
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
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200/80">
                              {`Màu: ${mauSac || 'N/A'} | Dung lượng: ${dungLuong || 'N/A'}`}
                            </span>
                            <span className="text-xs font-semibold text-slate-600">
                              SL: {item.SoLuong || 1}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 truncate">
                            Ghi chú đơn:{' '}
                            <span className={orderNote ? 'text-slate-700' : 'italic text-slate-400'}>
                              {orderNote || 'Không có'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Box Số tiền hoàn */}
                      <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          Số tiền hoàn trả đơn:
                        </span>
                        <span className="text-base font-extrabold text-emerald-700">
                          {formatCurrency(item.TongTien)}
                        </span>
                      </div>

                      {/* Chi tiết khách hàng */}
                      <div className="space-y-1.5 text-xs text-slate-600 px-1">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">
                            {item.TenKhachHang || item.TaiKhoan || 'Khách hàng'}
                          </span>
                        </div>
                        {item.SoDienThoai && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono">{item.SoDienThoai}</span>
                          </div>
                        )}
                        {item.AnhQRHoanTien && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenLightbox([item.AnhQRHoanTien], 0)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Xem ảnh mã QR nhận hoàn tiền"
                            >
                              <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Xem mã QR nhận tiền</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cột phải: Kênh hoàn tiền, Tiến độ đối soát, Lý do & Ảnh bằng chứng (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* ── Box Kênh Hoàn Tiền Chuẩn Nghiệp Vụ Thực Tế ── */}
                      <div className={`p-4 rounded-xl border ${
                        isPendingApproval
                          ? 'bg-amber-50/50 border-amber-200'
                          : isProcessingRefund
                          ? 'bg-indigo-50/60 border-indigo-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                            <ChannelIcon className={`w-4 h-4 ${
                              channel.key === 'COD' ? 'text-emerald-600' : 'text-blue-600'
                            }`} />
                            <span>Kênh hoàn tiền thực tế:</span>
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${channel.channelBadgeClass}`}>
                              {channel.label}
                            </span>
                          </span>
                        </div>

                        {/* Tình trạng đối soát cụ thể theo từng giai đoạn */}
                        {isProcessingRefund ? (
                          <div className="mt-3 p-3 rounded-lg bg-indigo-100/70 border border-indigo-200 text-xs text-indigo-950 space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-indigo-900">
                              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                              <span>Giai đoạn 2: Lệnh hoàn tiền đã được tạo</span>
                            </div>
                            <p className="text-indigo-800 text-[11px] leading-relaxed">
                              {channel.guideNote}
                            </p>
                          </div>
                        ) : isRefunded ? (
                          <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Đã đối soát & chuyển tiền hoàn tất</span>
                              </div>
                              {item.NgayHoanTien && (
                                <span className="text-[11px] text-emerald-700">
                                  Lúc: {formatDateTime(item.NgayHoanTien)}
                                </span>
                              )}
                            </div>

                            {/* Mã giao dịch hoàn tiền thực tế */}
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-emerald-200">
                              <span className="text-[11px] font-semibold text-slate-500">Mã GD / Tham chiếu:</span>
                              <span className="font-mono font-bold text-emerald-800 text-xs sm:text-sm">
                                {item.MaGiaoDichHoanTien || 'REF-HETHONG-DONE'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(item.MaGiaoDichHoanTien || 'REF-HETHONG-DONE')}
                                className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                                title="Sao chép mã giao dịch"
                              >
                                {copiedCode === (item.MaGiaoDichHoanTien || 'REF-HETHONG-DONE') ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600">Đã chép</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Chép mã</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {item.GhiChuHoanTien && (
                              <p className="text-[11px] text-emerald-800 italic">
                                Ghi chú đối soát: {item.GhiChuHoanTien}
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {/* Lý do đổi trả của khách hàng */}
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                          <MessageSquareQuote className="w-3.5 h-3.5 text-blue-600" />
                          <span>Lý do đổi trả của khách hàng:</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed italic">
                          &ldquo;{item.LyDo || 'Không có mô tả chi tiết'}&rdquo;
                        </div>
                      </div>

                      {/* Ảnh chứng minh lỗi */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            Ảnh minh họa của khách ({proofImages.length})
                          </span>
                          {proofImages.length > 0 && (
                            <span className="text-[11px] text-slate-400">
                              Bấm vào ảnh để phóng to
                            </span>
                          )}
                        </div>
                        {proofImages.length === 0 ? (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400 text-center">
                            Khách hàng không đính kèm ảnh
                          </div>
                        ) : proofImages.length === 1 ? (
                          <ProofImageTile
                            imgUrl={proofImages[0]}
                            index={0}
                            isSingle
                            onOpen={() => handleOpenLightbox(proofImages, 0)}
                          />
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {proofImages.map((imgUrl, idx) => (
                              <ProofImageTile
                                key={idx}
                                imgUrl={imgUrl}
                                index={idx}
                                isSingle={false}
                                onOpen={() => handleOpenLightbox(proofImages, idx)}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Biên bản kiểm định Kho */}
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1">
                          <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Biên bản kiểm định của Kho:</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 leading-relaxed whitespace-pre-line">
                          {item.GhiChuKho || 'Kho xác nhận sản phẩm đạt điều kiện đổi trả.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Card Footer & Action Buttons ── */}
                  <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Trạng thái đơn hàng:</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        {item.TrangThaiDonHang || 'YeuCauDoiTra'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* NÚT GIAI ĐOẠN 1: ChoDuyet -> DangHoanTien */}
                      {isPendingApproval && (
                        <button
                          type="button"
                          onClick={() => handleOpenStage1Modal(item)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                        >
                          <FileCheck className="w-4 h-4" />
                          <span>Duyệt yêu cầu hoàn tiền</span>
                        </button>
                      )}

                      {/* NÚT GIAI ĐOẠN 2: DangHoanTien -> DaHoanTien */}
                      {isProcessingRefund && (
                        <button
                          type="button"
                          onClick={() => handleOpenStage2Modal(item)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer animate-pulse"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Xác nhận đã chuyển tiền</span>
                        </button>
                      )}

                      {/* TRẠNG THÁI HOÀN TẤT */}
                      {isRefunded && (
                        <div className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Đã hoàn tất hoàn tiền</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL GIAI ĐOẠN 1: DUYỆT YÊU CẦU HOÀN TIỀN & TẠO LỆNH ── */}
      {stage1ModalItem &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Duyệt Yêu Cầu Hoàn Tiền
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStage1ModalItem(null)}
                  disabled={stage1Submitting}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phiếu đổi trả:</span>
                    <span className="font-mono font-bold text-slate-900">
                      #{String(stage1ModalItem.MaPhieuDoiTra).padStart(4, '0')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã đơn hàng:</span>
                    <span className="font-mono font-bold text-blue-600">
                      {stage1ModalItem.CodeDonHang || `#${stage1ModalItem.MaDonHang}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Khách hàng:</span>
                    <span className="font-semibold text-slate-900">
                      {stage1ModalItem.TenKhachHang || stage1ModalItem.TaiKhoan}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sản phẩm:</span>
                    <span className="font-semibold text-slate-900 truncate max-w-[250px]">
                      {stage1ModalItem.TenSanPham}
                    </span>
                  </div>
                </div>

                {/* Số tiền hoàn & Kênh thanh toán */}
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-800">
                      Số tiền cần hoàn trả:
                    </span>
                    <span className="text-lg font-extrabold text-amber-900">
                      {formatCurrency(stage1ModalItem.TongTien)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-600">Kênh hoàn tiền dự kiến:</span>
                    <span className="font-bold text-slate-900">
                      {resolveChannelInfo(stage1ModalItem).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStage1ModalItem(null)}
                  disabled={stage1Submitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStage1}
                  disabled={stage1Submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {stage1Submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tạo lệnh...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Xác nhận Duyệt yêu cầu hoàn tiền</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── MODAL GIAI ĐOẠN 2: NHẬP MÃ GIAO DỊCH ĐỐI SOÁT & XÁC NHẬN ĐÃ CHUYỂN TIỀN ── */}
      {stage2ModalItem &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Xác Nhận Đã Chuyển Tiền & Đối Soát
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStage2ModalItem(null)}
                  disabled={stage2Submitting}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 overflow-y-auto">
                {/* Tóm tắt phiếu & Số tiền */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-slate-400 block text-[11px]">Đơn hàng / Phiếu:</span>
                    <span className="font-mono font-bold text-slate-900 block truncate">
                      {stage2ModalItem.CodeDonHang || `#${stage2ModalItem.MaDonHang}`} (Phiếu #{String(stage2ModalItem.MaPhieuDoiTra).padStart(4, '0')})
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <span className="text-emerald-700 block text-[11px] font-semibold">Số tiền cần chuyển:</span>
                    <span className="text-base font-extrabold text-emerald-800 block">
                      {formatCurrency(stage2ModalItem.TongTien)}
                    </span>
                  </div>
                </div>

                {/* Hiển thị trực tiếp Ảnh mã QR nhận hoàn tiền của khách */}
                {stage2ModalItem.AnhQRHoanTien ? (
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenLightbox([stage2ModalItem.AnhQRHoanTien], 0)}
                        className="w-36 h-36 sm:w-40 sm:h-40 rounded-xl bg-white border-2 border-emerald-400 p-2 shadow-xs hover:shadow-md hover:border-emerald-600 transition-all flex items-center justify-center overflow-hidden cursor-pointer"
                        title="Bấm vào ảnh để phóng to mã QR"
                      >
                        <img
                          src={formatImageUrl(stage2ModalItem.AnhQRHoanTien)}
                          alt="Mã QR nhận hoàn tiền của khách"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 text-[11px] font-semibold backdrop-blur-xs">
                            <ZoomIn className="w-3.5 h-3.5" />
                            Phóng to
                          </span>
                        </div>
                      </button>
                      <span className="text-[10px] text-center text-slate-500 block mt-1">
                        Bấm vào ảnh để phóng to
                      </span>
                    </div>

                    <div className="space-y-2 flex-1 text-center sm:text-left">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                        <Landmark className="w-4 h-4 text-emerald-600" />
                        <span>Mã QR ngân hàng nhận hoàn tiền</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Admin quét mã QR trên bằng ứng dụng ngân hàng (VietQR / Mobile Banking) để chuyển tiền hoàn trả{' '}
                        <strong className="text-emerald-700 font-bold">{formatCurrency(stage2ModalItem.TongTien)}</strong>{' '}
                        trực tiếp cho khách hàng.
                      </p>
                      <div className="pt-2 border-t border-emerald-200/60 text-xs text-slate-600 space-y-0.5">
                        <div>Khách hàng: <strong className="text-slate-800 font-semibold">{stage2ModalItem.TenKhachHang || stage2ModalItem.TaiKhoan}</strong></div>
                        {stage2ModalItem.SoDienThoai && (
                          <div>SĐT: <strong className="text-slate-800 font-mono">{stage2ModalItem.SoDienThoai}</strong></div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-amber-900">Không tìm thấy ảnh mã QR của khách</div>
                      <p className="text-amber-700 text-[11px] leading-relaxed">
                        Khách hàng chưa tải lên ảnh mã QR ngân hàng. Vui lòng liên hệ trực tiếp khách hàng qua SĐT ({stage2ModalItem.SoDienThoai || 'N/A'}) để nhận thông tin số tài khoản trước khi chuyển tiền.
                      </p>
                    </div>
                  </div>
                )}

                {/* Input: Mã giao dịch hoàn tiền / Mã tham chiếu ngân hàng (Admin tự nhập tay) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="maGiaoDich"
                    className="text-xs font-bold text-slate-800 flex items-center gap-1"
                  >
                    <span>Mã giao dịch / Mã tham chiếu ngân hàng</span>
                    <span className="text-rose-500">*</span>
                  </label>

                  <input
                    id="maGiaoDich"
                    type="text"
                    value={stage2Form.maGiaoDich}
                    onChange={(e) =>
                      setStage2Form((prev) => ({ ...prev, maGiaoDich: e.target.value }))
                    }
                    placeholder="Nhập mã giao dịch ngân hàng thực tế (Ví dụ: FT2431980023, MBB9823412...)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    autoFocus
                  />
                  <span className="text-[11px] text-slate-500 block">
                    Admin quét QR chuyển khoản qua app ngân hàng, sau đó nhập chính xác mã giao dịch/tham chiếu trên biên lai để lưu hồ sơ đối soát.
                  </span>
                </div>

                {/* Input: Ghi chú đối soát (tùy chọn) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="ghiChuHoanTien"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Ghi chú đối soát hoàn tiền (tùy chọn)
                  </label>
                  <textarea
                    id="ghiChuHoanTien"
                    rows={2}
                    value={stage2Form.ghiChu}
                    onChange={(e) =>
                      setStage2Form((prev) => ({ ...prev, ghiChu: e.target.value }))
                    }
                    placeholder="Ví dụ: Đã chuyển khoản qua app Vietcombank lúc 10h15, khách hàng đã xác nhận nhận tiền..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setStage2ModalItem(null)}
                  disabled={stage2Submitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStage2}
                  disabled={stage2Submitting || !stage2Form.maGiaoDich.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {stage2Submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang chốt hoàn tiền...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận đã chuyển tiền</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── LIGHTBOX IMAGE MODAL ── */}
      {lightboxOpen && lightboxImages.length > 0 &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setLightboxOpen(false);
            }}
            className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 select-none"
          >
            <div className="w-full max-w-5xl flex items-center justify-between text-white py-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20">
                  Ảnh xem chi tiết {lightboxIndex + 1} / {lightboxImages.length}
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
                alt={`Ảnh chi tiết ${lightboxIndex + 1}`}
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
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminRefundsPage;
