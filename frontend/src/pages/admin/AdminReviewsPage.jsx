import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  MessageSquare,
  Star,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  Send,
  Trash2,
  ShieldCheck,
  Package,
  ThumbsUp,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Reply,
  Image as ImageIcon,
} from 'lucide-react';
import api from '../../services/api';
import Pagination from '../../components/common/Pagination';

const ITEMS_PER_PAGE = 8;

const REPLY_STATUS_TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'UNREPLIED', label: 'Chưa phản hồi' },
  { id: 'REPLIED', label: 'Đã phản hồi' },
];

const STAR_OPTIONS = [
  { value: 'ALL', label: 'Tất cả sao' },
  { value: '5', label: '5 sao' },
  { value: '4', label: '4 sao' },
  { value: '3', label: '3 sao' },
  { value: '2', label: '2 sao' },
  { value: '1', label: '1 sao' },
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

const formatDateTime = (dateValue) => {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const extractVariantLabel = (review) => {
  if (review.TenBienThe) return review.TenBienThe;
  if (review.BienThe) return review.BienThe;

  const details = review.ChiTietDanhGia;
  if (!details || typeof details !== 'object') return null;

  const direct =
    details.TenBienThe ||
    details.BienThe ||
    details.PhanLoai ||
    details.variant;
  if (direct) return String(direct);

  const parts = [details.MauSac || details.color, details.DungLuong || details.storage || details.BoNho]
    .filter(Boolean)
    .map(String);
  return parts.length > 0 ? parts.join(' - ') : null;
};

const StarRating = ({ rating, size = 'w-4 h-4' }) => {
  const score = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${score} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= score
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-200 fill-slate-100'
          }`}
        />
      ))}
    </div>
  );
};

/**
 * Trang Quản lý Đánh giá sản phẩm (Admin)
 * Cho phép theo dõi, lọc theo trạng thái phản hồi/số sao, phản hồi dưới danh nghĩa SmartZone Official và xóa đánh giá vi phạm.
 */
const AdminReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [replyFilter, setReplyFilter] = useState('ALL'); // ALL | UNREPLIED | REPLIED
  const [starFilter, setStarFilter] = useState('ALL'); // ALL | 1..5
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Quick Reply State
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState(null);

  // Delete Modal & Image Lightbox State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/reviews');
      setReviews(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Lock body scroll & Escape listener khi modal / lightbox đang mở
  useEffect(() => {
    const hasOverlay = Boolean(deleteTarget) || Boolean(previewImage);
    document.body.style.overflow = hasOverlay ? 'hidden' : '';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null);
        } else if (deleteTarget && !deleting) {
          setDeleteTarget(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteTarget, deleting, previewImage]);

  // KPI Stats tính trên toàn bộ danh sách đánh giá
  const stats = useMemo(() => {
    const total = reviews.length;
    const unreplied = reviews.filter((r) => !r.isReplied).length;
    const replied = total - unreplied;
    const avgRating =
      total > 0
        ? (reviews.reduce((sum, r) => sum + Number(r.SoSao || 0), 0) / total).toFixed(1)
        : '0.0';
    return { total, unreplied, replied, avgRating };
  }, [reviews]);

  // Lọc theo trạng thái phản hồi, số sao và từ khóa
  const filteredReviews = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return reviews.filter((r) => {
      if (replyFilter === 'UNREPLIED' && r.isReplied) return false;
      if (replyFilter === 'REPLIED' && !r.isReplied) return false;

      if (starFilter !== 'ALL' && Number(r.SoSao) !== Number(starFilter)) {
        return false;
      }

      if (!q) return true;

      return (
        String(r.MaDanhGia).includes(q) ||
        (r.TenNguoiDung || '').toLowerCase().includes(q) ||
        (r.EmailNguoiDung || '').toLowerCase().includes(q) ||
        (r.TenSanPham || '').toLowerCase().includes(q) ||
        (r.NoiDung || '').toLowerCase().includes(q)
      );
    });
  }, [reviews, replyFilter, starFilter, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [replyFilter, starFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReviews.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReviews, currentPage]);

  const handleToggleReplyBox = (reviewId) => {
    setActiveReplyId((prev) => (prev === reviewId ? null : reviewId));
  };

  const handleReplyDraftChange = (reviewId, value) => {
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: value }));
  };

  const handleSubmitReply = async (e, reviewId) => {
    e.preventDefault();
    const content = (replyDrafts[reviewId] || '').trim();
    if (!content) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }

    setSubmittingReplyId(reviewId);
    try {
      const res = await api.post(`/admin/reviews/${reviewId}/reply`, {
        NoiDung: content,
      });
      const newReply = res.data?.data;

      setReviews((prev) =>
        prev.map((item) => {
          if (item.MaDanhGia !== reviewId) return item;
          const updatedReplies = [...(item.replies || []), newReply].filter(Boolean);
          return {
            ...item,
            replies: updatedReplies,
            replyCount: updatedReplies.length,
            isReplied: true,
            replyStatus: 'replied',
          };
        })
      );

      setReplyDrafts((prev) => ({ ...prev, [reviewId]: '' }));
      setActiveReplyId(null);
      toast.success('Đã gửi phản hồi dưới danh nghĩa SmartZone Official');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi phản hồi');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/reviews/${deleteTarget.MaDanhGia}`);
      setReviews((prev) => prev.filter((item) => item.MaDanhGia !== deleteTarget.MaDanhGia));
      toast.success('Đã xóa đánh giá vi phạm');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa đánh giá');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý Đánh giá
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi nhận xét của khách hàng, phản hồi chính thức từ SmartZone Official và xử lý đánh giá vi phạm.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReviews}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tổng số đánh giá
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1.5">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.replied} đánh giá đã phản hồi
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Đánh giá chưa phản hồi
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1.5">{stats.unreplied}</p>
            <p className="text-xs text-slate-500 mt-1">
              Cần kiểm tra & phản hồi khách hàng
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Điểm đánh giá trung bình
            </p>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <p className="text-2xl font-bold text-slate-900">{stats.avgRating}</p>
              <span className="text-sm font-medium text-slate-400">/ 5.0</span>
            </div>
            <div className="mt-1">
              <StarRating rating={Math.round(Number(stats.avgRating))} size="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 fill-emerald-500 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tabs Trạng thái phản hồi */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit">
            {REPLY_STATUS_TABS.map((tab) => {
              const isActive = replyFilter === tab.id;
              const count =
                tab.id === 'ALL'
                  ? stats.total
                  : tab.id === 'UNREPLIED'
                  ? stats.unreplied
                  : stats.replied;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReplyFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                      isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Star filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:max-w-xl justify-end">
            {/* Lọc theo số sao */}
            <div className="flex items-center gap-2">
              <select
                value={starFilter}
                onChange={(e) => setStarFilter(e.target.value)}
                aria-label="Lọc theo số sao"
                className="w-full sm:w-40 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                {STAR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ô tìm kiếm */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên khách, sản phẩm, nội dung..."
                className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-500 shadow-sm">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-medium">Đang tải danh sách đánh giá...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-10 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Đã xảy ra lỗi</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md">{error}</p>
          <button
            type="button"
            onClick={fetchReviews}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            Không có đánh giá nào phù hợp
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            Thử thay đổi bộ lọc trạng thái, số sao hoặc từ khóa tìm kiếm để xem các đánh giá khác.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedReviews.map((review) => {
            const variantLabel = extractVariantLabel(review);
            const isReplyBoxOpen = activeReplyId === review.MaDanhGia;
            const isSubmittingThis = submittingReplyId === review.MaDanhGia;
            const draftText = replyDrafts[review.MaDanhGia] || '';
            const customerInitial = (review.TenNguoiDung || 'K').charAt(0).toUpperCase();

            return (
              <div
                key={review.MaDanhGia}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300/80 transition-colors space-y-4"
              >
                {/* Top Row: Customer Info + Status + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {review.AnhDaiDienNguoiDung ? (
                      <img
                        src={formatImageUrl(review.AnhDaiDienNguoiDung)}
                        alt={review.TenNguoiDung}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {customerInitial}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          {review.TenNguoiDung || 'Khách hàng'}
                        </span>
                        <span className="text-xs text-slate-400">#{review.MaDanhGia}</span>
                        {review.isReplied ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã phản hồi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Chưa phản hồi
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                        {review.EmailNguoiDung && <span>{review.EmailNguoiDung}</span>}
                        <span>•</span>
                        <span>{formatDateTime(review.NgayDanhGia)}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5">
                        <StarRating rating={review.SoSao} />
                        <span className="text-xs font-semibold text-slate-700">
                          {review.SoSao}/5 sao
                        </span>
                        {review.SoLuotThich > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 ml-2">
                            <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                            {review.SoLuotThich}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-start shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleReplyBox(review.MaDanhGia)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isReplyBoxOpen
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      }`}
                    >
                      <Reply className="w-3.5 h-3.5" />
                      {isReplyBoxOpen ? 'Đóng khung' : 'Phản hồi'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(review)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50/70 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer"
                      title="Xóa đánh giá vi phạm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  </div>
                </div>

                {/* Product & Variant Info */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  {review.AnhSanPham ? (
                    <img
                      src={formatImageUrl(review.AnhSanPham)}
                      alt={review.TenSanPham}
                      className="w-11 h-11 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-slate-200/70 text-slate-400 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-400">Sản phẩm đã mua</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {review.TenSanPham}
                    </p>
                    {variantLabel && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Phân loại: <span className="font-medium text-slate-700">{variantLabel}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Review Comment */}
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {review.NoiDung || (
                    <span className="italic text-slate-400">Khách hàng không để lại nội dung bình luận.</span>
                  )}
                </div>

                {/* Review Images */}
                {Array.isArray(review.Anh) && review.Anh.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Ảnh đánh giá từ khách hàng ({review.Anh.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {review.Anh.map((imgUrl, idx) => {
                        const resolvedUrl = formatImageUrl(imgUrl);
                        return (
                          <button
                            key={`${review.MaDanhGia}-img-${idx}`}
                            type="button"
                            onClick={() => setPreviewImage(resolvedUrl)}
                            className="group relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:border-blue-400 transition-all cursor-pointer"
                          >
                            <img
                              src={resolvedUrl}
                              alt={`Ảnh đánh giá ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Existing Replies */}
                {Array.isArray(review.replies) && review.replies.length > 0 && (
                  <div className="pl-3 sm:pl-5 border-l-2 border-blue-200 space-y-2.5 pt-1">
                    {review.replies.map((rep) => {
                      const isOfficial = rep.isAdmin || Number(rep.MaVaiTro) === 1;
                      return (
                        <div
                          key={rep.MaTraLoi}
                          className={`rounded-xl p-3.5 text-sm ${
                            isOfficial
                              ? 'bg-blue-50/70 border border-blue-100'
                              : 'bg-slate-50 border border-slate-200/80'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              {isOfficial ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700">
                                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                                  SmartZone Official
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-slate-800">
                                  {rep.TenNguoiTraLoi || 'Người dùng'}
                                </span>
                              )}
                              {isOfficial && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600 text-white">
                                  Quản trị viên
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {formatDateTime(rep.NgayTraLoi)}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                            {rep.NoiDung}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Reply Form */}
                {isReplyBoxOpen && (
                  <form
                    onSubmit={(e) => handleSubmitReply(e, review.MaDanhGia)}
                    className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        Phản hồi dưới danh nghĩa SmartZone Official
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveReplyId(null)}
                        className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={draftText}
                      onChange={(e) => handleReplyDraftChange(review.MaDanhGia, e.target.value)}
                      placeholder="Nhập nội dung phản hồi gửi tới khách hàng..."
                      disabled={isSubmittingThis}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
                      autoFocus
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveReplyId(null)}
                        disabled={isSubmittingThis}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingThis || !draftText.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer"
                      >
                        {isSubmittingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Gửi phản hồi
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredReviews.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <div
              className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Xóa đánh giá vi phạm?
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Bạn có chắc chắn muốn xóa đánh giá{' '}
                    <span className="font-semibold text-slate-700">#{deleteTarget.MaDanhGia}</span>{' '}
                    của khách hàng{' '}
                    <span className="font-semibold text-slate-700">
                      {deleteTarget.TenNguoiDung}
                    </span>
                    ? Hành động này sẽ xóa cả các phản hồi liên quan và không thể hoàn tác.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Image Lightbox Modal ── */}
      {previewImage &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Đóng xem ảnh"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt="Ảnh đánh giá phóng to"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminReviewsPage;
