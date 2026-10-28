import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Star,
  ThumbsUp,
  MessageSquare,
  ChevronDown,
  ImageIcon,
  Shield,
  Loader2,
  X,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ReviewModal from "./ReviewModal";

/* ─────────────────────────────────────────────────────────────────────────────
   Hàm tính thời gian tương đối bằng Tiếng Việt (timeAgo)
───────────────────────────────────────────────────────────────────────────── */
export const timeAgo = (dateString) => {
  if (!dateString) return "";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} tiếng trước`;
  if (diffDays < 30) return `${diffDays} ngày trước`;
  if (diffMonths < 12) return `${diffMonths} tháng trước`;
  return `${diffYears} năm trước`;
};

/* ─────────────────────────────────────────────────────────────────────────────
   Ẩn danh tên người dùng theo định dạng chuẩn: "Nguyễn V*** A"
───────────────────────────────────────────────────────────────────────────── */
export const formatAnonymizedName = (rawName = "") => {
  if (!rawName || typeof rawName !== "string") return "Ẩn danh";
  const trimmed = rawName.trim();
  if (!trimmed) return "Ẩn danh";

  // Hàm ẩn danh an toàn cho từng từ đơn
  const maskWord = (w) => {
    if (!w) return "";
    // Trường hợp 1 ký tự (Ví dụ: "Ý", "A") -> "Ý***" (tránh lặp ký tự out-of-bounds hoặc "Ý***Ý")
    if (w.length <= 1) return `${w}***`;
    // Trường hợp 2 ký tự (Ví dụ: "An", "Vũ") -> "A***n" (tránh nối chuỗi sai dạng "A***An")
    if (w.length === 2) return `${w.charAt(0)}***${w.charAt(1)}`;
    // Trường hợp từ 3 ký tự trở lên (Ví dụ: "admin" -> "a***n", "huyquoc" -> "h***c")
    return `${w.charAt(0)}***${w.charAt(w.length - 1)}`;
  };

  // Kiểm tra nếu toàn bộ chuỗi chỉ có 1 hoặc 2 ký tự
  if (trimmed.length <= 2) {
    return maskWord(trimmed);
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return maskWord(parts[0]);
  }

  if (parts.length === 2) {
    return `${parts[0]} ${maskWord(parts[1])}`;
  }

  // 3 từ trở lên: ví dụ "Nguyễn Văn An" -> "Nguyễn V*** A***n"
  const first = parts[0];
  const lastMasked = maskWord(parts[parts.length - 1]);
  const middle = parts
    .slice(1, -1)
    .map((p) => (p.charAt(0) ? p.charAt(0).toUpperCase() + "***" : ""))
    .filter(Boolean)
    .join(" ");

  return `${first} ${middle} ${lastMasked}`;
};

/* ─────────────────────────────────────────────────────────────────────────────
   Nhãn đánh giá tiêu chí – khớp với PHP criteriaLabels
───────────────────────────────────────────────────────────────────────────── */
const CRITERIA_LABELS_MAP = {
  hieu_nang: ["Giật lag", "Không ổn định", "Ổn định", "Mạnh mẽ", "Siêu mạnh mẽ"],
  pin: ["Rất yếu", "Yếu", "Đủ dùng", "Khủng", "Cực khủng"],
  camera: ["Chụp không đẹp", "Bình thường", "Tạm ổn", "Chụp đẹp", "Chụp đẹp, chuyên nghiệp"],
};

/* ─────────────────────────────────────────────────────────────────────────────
   StarDisplay – Hiển thị số sao vàng
───────────────────────────────────────────────────────────────────────────── */
const StarDisplay = ({ rating, size = "w-4 h-4" }) => {
  const rounded = Math.round(Number(rating || 0));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size} ${
            s <= rounded
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   ImageLightbox – Xem ảnh lớn dạng popup
───────────────────────────────────────────────────────────────────────────── */
const ImageLightbox = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
        aria-label="Đóng ảnh"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={src}
        alt={alt || "Ảnh thực tế"}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   ReplyForm – Khung nhập trả lời (Reply Form có bộ đếm ký tự 0/3000)
───────────────────────────────────────────────────────────────────────────── */
const ReplyForm = ({ reviewId, onCancel, onSuccess }) => {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const MAX_CHARS = 3000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      setSubmitting(true);
      await api.post(`/reviews/${reviewId}/replies`, { NoiDung: trimmed });
      toast.success("Đã gửi câu trả lời thành công!");
      setContent("");
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể gửi câu trả lời");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Nhập nội dung bình luận..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2
                     focus:ring-blue-500/30 focus:border-blue-400 text-sm text-slate-800 placeholder:text-slate-400
                     resize-none bg-slate-50 transition-all"
        />
        <span className="absolute bottom-2.5 right-3 text-[11px] font-medium text-slate-400 select-none">
          {content.length}/{MAX_CHARS}
        </span>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600
                     hover:bg-slate-100 transition-all cursor-pointer"
        >
          Huỷ
        </button>
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Gửi
        </button>
      </div>
    </form>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   ReviewCard – Thẻ đánh giá từng người dùng (Review List Item)
   Criteria tags: Hiện TẤT CẢ nhãn từ CRITERIA_LABELS_MAP (mọi mức rating)
   Badge style: nền xám nhạt, chữ tối – khớp với PHP
───────────────────────────────────────────────────────────────────────────── */
const ReviewCard = ({ review, onLike, onLikeReply, onReplySuccess }) => {
  const { isAuthenticated } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  const handleLike = () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để thích đánh giá");
      return;
    }
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 500);
    onLike(review.MaDanhGia, "review", review.isLiked);
  };

  // Trích xuất nhãn tiêu chí từ CRITERIA_LABELS_MAP – hiển thị TẤT CẢ rating
  const criteriaTags = useMemo(() => {
    const list = [];
    (review.criteria || []).forEach((c) => {
      const labels = CRITERIA_LABELS_MAP[c.key];
      if (labels) {
        const r = Math.min(Math.max(Number(c.rating || 1), 1), 5);
        const label = labels[r - 1];
        if (label) list.push({ label });
      }
    });
    return list;
  }, [review.criteria]);

  const authorName = formatAnonymizedName(review.HoTen);
  const firstLetter = (authorName.charAt(0) || "U").toUpperCase();

  return (
    <div
      className="py-6 first:pt-0 last:border-b-0 last:pb-0 flex gap-4"
      style={{ borderBottom: "1px solid rgba(145, 158, 171, 0.24)" }}
    >
      {/* ── Cột trái: Avatar + Tên ẩn danh ── */}
      <div className="w-[200px] shrink-0 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600
                      flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 select-none"
        >
          {firstLetter}
        </div>
        <div className="flex flex-col min-w-0">
          <p className="text-sm font-bold text-slate-800 leading-tight break-all">
            {authorName}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{timeAgo(review.NgayTao)}</p>
        </div>
      </div>

      {/* ── Cột phải: Nội dung ── */}
      <div className="flex-1 min-w-0">
        {/* Số sao */}
        <StarDisplay rating={review.SoSao} />

        {/* Các nhãn tiêu chí (nền xám nhạt – khớp PHP) */}
        {criteriaTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {criteriaTags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  backgroundColor: "#0000000f",
                  borderRadius: "8px",
                  color: "#1d1d20",
                  fontSize: "13px",
                  padding: "3px 10px",
                }}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {/* Nội dung bài viết */}
        {review.NoiDung && (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line mt-3">
            {review.NoiDung}
          </p>
        )}

        {/* Danh sách ảnh thực tế */}
        {review.images?.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-3">
            {review.images.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setLightboxImg(imgUrl)}
                className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200
                           hover:opacity-90 hover:scale-105 transition-transform duration-200 bg-slate-50 cursor-pointer"
              >
                <img
                  src={imgUrl}
                  alt={`Ảnh đánh giá ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* Thời gian đăng */}
        <div className="flex items-center gap-1 text-xs text-slate-400 font-medium mt-3 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Đánh giá đã đăng vào {timeAgo(review.NgayTao)}</span>
        </div>

        {/* Nút Thích & Trả lời */}
        <div className="flex items-center gap-2">
          {/* Toggle Thích */}
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center gap-1 px-2 py-1 border rounded-full text-sm font-medium transition-colors cursor-pointer ${
              review.isLiked
                ? "text-blue-600 border-blue-600 bg-blue-50"
                : "text-slate-700 border-slate-300 bg-white hover:bg-slate-50"
            }`}
          >
            <ThumbsUp
              className={`w-4 h-4 transition-transform duration-200 ${
                likeAnimating ? "scale-125" : "scale-100"
              } ${review.isLiked ? "fill-blue-600" : ""}`}
            />
            <span>{review.soLuotThich || 0}</span>
          </button>

          {/* Nút Trả lời */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setShowReplyForm((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded-full text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Trả lời</span>
              {(review.replies?.length || 0) > 0 && (
                <span className="text-slate-400 font-normal">
                  ({review.replies.length})
                </span>
              )}
            </button>
          )}
        </div>

        {/* Khung Nhập Trả Lời */}
        {showReplyForm && (
          <ReplyForm
            reviewId={review.MaDanhGia}
            onCancel={() => setShowReplyForm(false)}
            onSuccess={() => {
              setShowReplyForm(false);
              if (onReplySuccess) onReplySuccess();
            }}
          />
        )}

        {/* Khối Phản Hồi (Replies) */}
        {review.replies?.length > 0 && (
          <div className="mt-3 space-y-3">
            {review.replies.map((reply) => {
              const replyName = reply.isAdmin ? "Quản trị viên" : formatAnonymizedName(reply.HoTen);
              return (
                <div
                  key={reply.MaTraLoi}
                  className="flex gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {replyName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-800">{replyName}</span>
                      {reply.isAdmin && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold shadow-xs">
                          <Shield className="w-3 h-3" />
                          Quản trị viên
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {timeAgo(reply.NgayTao)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {reply.NoiDung}
                    </p>
                    {/* Nút Thích reply */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAuthenticated) {
                          toast.error("Vui lòng đăng nhập để thích câu trả lời");
                          return;
                        }
                        onLikeReply(reply.MaTraLoi, "reply", reply.isLiked);
                      }}
                      className={`flex items-center gap-1 mt-2 px-2 py-0.5 border rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                        reply.isLiked
                          ? "text-blue-600 border-blue-600 bg-blue-50"
                          : "text-slate-500 border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <ThumbsUp className={`w-3 h-3 ${reply.isLiked ? "fill-blue-600" : ""}`} />
                      <span>{(reply.soLuotThich || 0) > 0 ? reply.soLuotThich : ""}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox phóng to ảnh */}
        {lightboxImg && (
          <ImageLightbox
            src={lightboxImg}
            alt="Ảnh thực tế sản phẩm"
            onClose={() => setLightboxImg(null)}
          />
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   ReviewSummaryBox – Khối Thống Kê Tổng Quan (Layout 3 Cột – khớp PHP)
   - Cột 1: Điểm trung bình 48px + /5 xám + 5 sao + tổng lượt + nút "Viết đánh giá" xanh
   - Cột 2: Progress bars 5→1 sao với số lượng "X đánh giá" (không dùng %)
   - Cột 3: "Đánh giá theo trải nghiệm" + từng tiêu chí (5 sao + X/5 + (count đánh giá))
───────────────────────────────────────────────────────────────────────────── */
const ReviewSummaryBox = ({ summary, onWriteReview, eligibility }) => {
  const { avgRating = 0, total = 0, distribution = {}, criteriaAvg = {} } = summary || {};

  const CRITERIA_MAP = [
    { key: "hieu_nang", label: "Hiệu năng" },
    { key: "pin", label: "Thời lượng pin" },
    { key: "camera", label: "Chất lượng camera" },
  ];

  const avgFloor = Math.floor(avgRating);

  return (
    <div
      className="flex flex-col md:flex-row items-center gap-[20px] bg-white text-[#4a4a4a] py-[24px] px-6 md:px-[48px] mb-[20px] border-b border-gray-100"
      style={{ borderRadius: "16px" }}
    >
      {/* ── div cha thứ nhất ── */}
      <div className="flex flex-col items-center justify-center shrink-0">
        <div className="flex flex-col items-center">
          {/* div con lớn lớn 1 */}
          <div className="flex items-baseline text-[#a1a1aa] text-[32px] leading-none">
            <div className="text-[#18181b] text-[48px] font-bold">
              {avgRating > 0 ? avgRating.toFixed(1) : "0"}
            </div>
            /5
          </div>

          {/* div con lớn lớn 2 */}
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-6 h-6 ${
                  s <= avgFloor
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-gray-300 text-gray-300"
                }`}
              />
            ))}
          </div>

          {/* div con lớn lớn 3 */}
          <div className="mt-1 text-sm text-[#4a4a4a]">{total} lượt đánh giá</div>
        </div>

        {/* button lấy màu chủ đạo (khớp PHP: click mở openReviewModal) */}
        <div className="mt-4 w-full">
          <button
            type="button"
            onClick={() => onWriteReview()}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition w-full shadow-md shadow-blue-500/20 cursor-pointer"
          >
            Viết đánh giá
          </button>
        </div>
      </div>

      {/* ── div cha thứ hai ── */}
      <div className="flex-1 flex flex-col justify-center text-[14px] pl-0 md:pl-[10px] gap-2 w-full">
        {[5, 4, 3, 2, 1].map((star) => {
          const sCount = distribution[star] || 0;
          const percent = total > 0 ? (sCount / total) * 100 : 0;
          return (
            <div key={star} className="flex text-[14px] items-center justify-between gap-3">
              {/* 1. Số sao */}
              <div className="font-medium text-gray-700 w-3 text-right">{star}</div>
              {/* 2. Ngôi sao vàng */}
              <div>
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              </div>
              {/* 3. Progress bar */}
              <div className="flex-1 h-2 bg-gray-200 rounded-[5px] overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-[5px] transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {/* 4. Số đánh giá */}
              <div className="text-[12px] text-[#a1a1aa] w-16 text-right whitespace-nowrap">
                {sCount} đánh giá
              </div>
            </div>
          );
        })}
      </div>

      {/* ── div cha thứ ba ── */}
      <div className="flex-1 text-[14px] pl-0 md:pl-[24px] md:border-l border-[#e4e4e7] w-full">
        <p className="text-[#363636] text-[20px] font-semibold mb-[10px]">
          Đánh giá theo trải nghiệm
        </p>

        {CRITERIA_MAP.map(({ key, label }) => {
          const cData = criteriaAvg[key] || 0;
          const cCount = criteriaAvg[`${key}_count`] || 0;
          const cFloor = Math.floor(cData);
          const cAvgFormatted = cCount > 0 ? Math.round(cData) : 0;

          return (
            <div key={key} className="flex items-center justify-between mb-[5px]">
              {/* div con lớn thứ nhất */}
              <div className="font-medium text-gray-700">{label}</div>

              {/* div con lớn thứ hai */}
              <div className="flex items-center gap-2 mb-[5px]">
                {/* div con nhỏ thứ nhất (5 sao) */}
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= cFloor
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-gray-300 text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                {/* div con nhỏ thứ hai (?/5) */}
                <div className="font-medium text-gray-700">{cAvgFormatted}/5</div>
                {/* div con nhỏ thứ 3 */}
                <div className="text-[#a1a1aa] text-left w-[80px]">({cCount} đánh giá)</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   FilterBar – Thanh Lọc Đánh Giá (khớp PHP: có label "Lọc đánh giá theo")
───────────────────────────────────────────────────────────────────────────── */
const FilterBar = ({ filterStar, filterHasImage, onSelectFilter }) => {
  const chips = [
    { id: "all", label: "Tất cả" },
    { id: "image", label: "Có hình ảnh", hasImage: true },
    { id: "star-5", label: "5 sao", star: 5 },
    { id: "star-4", label: "4 sao", star: 4 },
    { id: "star-3", label: "3 sao", star: 3 },
    { id: "star-2", label: "2 sao", star: 2 },
    { id: "star-1", label: "1 sao", star: 1 },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Label "Lọc đánh giá theo" – khớp PHP */}
      <p className="font-semibold text-slate-800 text-lg w-[200px] shrink-0 whitespace-nowrap hidden sm:block">
        Lọc đánh giá theo
      </p>
      <div className="flex flex-wrap gap-3 flex-1">
        {chips.map((chip) => {
          let isSelected = false;
          if (chip.id === "all") {
            isSelected = filterStar === 0 && !filterHasImage;
          } else if (chip.hasImage) {
            isSelected = filterHasImage;
          } else if (chip.star) {
            isSelected = filterStar === chip.star;
          }

          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onSelectFilter(chip)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-blue-50 text-blue-600 border border-blue-400 shadow-xs"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-400"
              }`}
            >
              {chip.hasImage && <ImageIcon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   ReviewSection – Component tổng thể đánh giá sản phẩm với 2 trạng thái
   A. EMPTY STATE (Total Reviews = 0): Ảnh five_star.png, kêu gọi, nút Đánh giá ngay
   B. ACTIVE STATE (Total Reviews > 0): 3-cột summary, filter bar, review list, load more
───────────────────────────────────────────────────────────────────────────── */
const ReviewSection = ({ productId, productName }) => {
  const { isAuthenticated } = useAuth();

  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [filterStar, setFilterStar] = useState(0);
  const [filterHasImage, setFilterHasImage] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [showWriteModal, setShowWriteModal] = useState(false);

  // Quyền đánh giá của người dùng
  const [eligibility, setEligibility] = useState({
    canReview: false,
    reason: null,
    message: "",
  });

  // Kiểm tra quyền đánh giá
  const checkEligibility = useCallback(async () => {
    if (!isAuthenticated) {
      setEligibility({
        canReview: false,
        reason: "not_logged_in",
        message: "Vui lòng đăng nhập để đánh giá sản phẩm",
      });
      return;
    }

    try {
      const res = await api.get(`/reviews/eligibility/${productId}`);
      if (res.data?.success) {
        setEligibility(res.data.data);
      }
    } catch (err) {
      setEligibility({
        canReview: false,
        reason: "not_purchased",
        message: err.response?.data?.message || "Bạn cần mua sản phẩm này để có thể đánh giá",
      });
    }
  }, [isAuthenticated, productId]);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  // Lấy danh sách ID đã like từ localStorage để hiển thị trạng thái
  const getLikedStorage = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  };

  const setLikedStorage = (key, list) => {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}
  };

  // Tải thống kê đánh giá
  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await api.get(`/reviews/summary/${productId}`);
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch {
      setSummary({ avgRating: 0, total: 0, distribution: {}, criteriaAvg: {} });
    } finally {
      setLoadingSummary(false);
    }
  }, [productId]);

  // Tải danh sách đánh giá theo bộ lọc & phân trang
  const fetchReviews = useCallback(
    async (page = 1, reset = true) => {
      try {
        setLoadingReviews(true);
        const params = { page, limit: 5 };
        if (filterStar > 0) params.star = filterStar;
        if (filterHasImage) params.hasImage = true;

        const res = await api.get(`/reviews/${productId}`, { params });
        if (res.data?.success) {
          const rawData = res.data.data || [];
          const likedReviews = getLikedStorage("liked_reviews");
          const likedReplies = getLikedStorage("liked_replies");

          const merged = rawData.map((r) => ({
            ...r,
            isLiked: likedReviews.includes(r.MaDanhGia),
            replies: (r.replies || []).map((rep) => ({
              ...rep,
              isLiked: likedReplies.includes(rep.MaTraLoi),
            })),
          }));

          setReviews((prev) => (reset ? merged : [...prev, ...merged]));
          setHasMore(rawData.length === 5);
        }
      } catch {
        if (page === 1) setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    },
    [productId, filterStar, filterHasImage]
  );

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    setReviewPage(1);
    fetchReviews(1, true);
  }, [filterStar, filterHasImage, fetchReviews]);

  // Xử lý chuyển bộ lọc
  const handleSelectFilter = (chip) => {
    if (chip.id === "all") {
      setFilterStar(0);
      setFilterHasImage(false);
    } else if (chip.hasImage) {
      setFilterHasImage((prev) => !prev);
    } else if (chip.star) {
      setFilterStar((prev) => (prev === chip.star ? 0 : chip.star));
    }
  };

  // Nút "Xem thêm đánh giá"
  const handleLoadMore = () => {
    const nextPage = reviewPage + 1;
    setReviewPage(nextPage);
    fetchReviews(nextPage, false);
  };

  // Xử lý Like / Bỏ Like đánh giá & phản hồi
  const handleLike = useCallback(async (itemId, itemType, wasLiked) => {
    // Cập nhật localStorage
    const storageKey = itemType === "reply" ? "liked_replies" : "liked_reviews";
    let stored = getLikedStorage(storageKey);
    if (wasLiked) {
      stored = stored.filter((id) => id !== itemId);
    } else {
      stored.push(itemId);
    }
    setLikedStorage(storageKey, stored);

    // Cập nhật state lạc quan
    if (itemType === "review") {
      setReviews((prev) =>
        prev.map((r) =>
          r.MaDanhGia === itemId
            ? {
                ...r,
                isLiked: !wasLiked,
                soLuotThich: wasLiked
                  ? Math.max(0, (r.soLuotThich || 0) - 1)
                  : (r.soLuotThich || 0) + 1,
              }
            : r
        )
      );
    } else {
      setReviews((prev) =>
        prev.map((r) => ({
          ...r,
          replies: (r.replies || []).map((rep) =>
            rep.MaTraLoi === itemId
              ? {
                  ...rep,
                  isLiked: !wasLiked,
                  soLuotThich: wasLiked
                    ? Math.max(0, (rep.soLuotThich || 0) - 1)
                    : (rep.soLuotThich || 0) + 1,
                }
              : rep
          ),
        }))
      );
    }

    // Gửi request API
    try {
      await api.post("/reviews/like", { itemId, itemType, isLiked: wasLiked });
    } catch {
      // Nếu lỗi thì hoàn tác
    }
  }, []);

  const handleOpenWriteModal = () => {
    setShowWriteModal(true);
  };

  const handleReviewSuccess = () => {
    fetchSummary();
    fetchReviews(1, true);
    setReviewPage(1);
    checkEligibility();
  };

  const totalReviews = summary?.total || 0;

  return (
    <section
      className="space-y-6 rounded-2xl py-8 px-0"
      style={{ background: "#f7f7f8" }}
    >
      {/* ── Tiêu đề Section (khớp PHP: Đánh giá [TenSanPham]) ── */}
      <h2
        className="text-2xl md:text-3xl font-bold text-gray-900"
        style={{ margin: "0px 0px 16px" }}
      >
        Đánh giá {productName || "sản phẩm"}
      </h2>

      {loadingSummary ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : totalReviews === 0 ? (
        /* ══════════════════════════════════════════════════════════════════════
           A. TRƯỜNG HỢP CHƯA CÓ ĐÁNH GIÁ (EMPTY STATE – khớp PHP)
        ══════════════════════════════════════════════════════════════════════ */
        <div
          className="rounded-2xl overflow-hidden"
          style={{ padding: "16px", borderRadius: "16px", backgroundColor: "#fff" }}
        >
          {/* Filter bar luôn hiện dù empty */}
          <div className="flex flex-wrap items-center gap-4 mb-6 pb-5 border-b border-slate-100">
            <p className="font-semibold text-slate-800 text-lg w-[200px] shrink-0 whitespace-nowrap hidden sm:block">
              Lọc đánh giá theo
            </p>
            <div className="flex flex-wrap gap-3 flex-1">
              {["Tất cả", "Có hình ảnh", "5 sao", "4 sao", "3 sao", "2 sao", "1 sao"].map(
                (label) => (
                  <button
                    key={label}
                    type="button"
                    disabled
                    className="px-4 py-1.5 rounded-full text-sm font-medium border border-slate-200 text-slate-400 cursor-not-allowed"
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Empty state */}
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <img
              src="/assets/five_star.png"
              alt="Chưa có đánh giá"
              className="w-28 h-28 object-contain mb-5 select-none"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <p className="text-slate-600 text-base mb-6 max-w-sm leading-relaxed">
              Hiện chưa có đánh giá nào.<br />
              Bạn sẽ là người đầu tiên đánh giá sản phẩm này chứ?
            </p>

            <div className="relative group">
              <button
                type="button"
                onClick={handleOpenWriteModal}
                disabled={!eligibility.canReview}
                className={`px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 shadow-xs ${
                  eligibility.canReview
                    ? "bg-[#d70018] hover:bg-[#b30015] text-white shadow-red-500/20 active:scale-[0.98] cursor-pointer"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-75"
                }`}
              >
                <Star className="w-4 h-4 fill-current" />
                Đánh giá ngay
              </button>

              {!eligibility.canReview && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3.5 py-1.5 bg-slate-900/90 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20">
                  {eligibility.message ||
                    (!isAuthenticated
                      ? "Vui lòng đăng nhập để đánh giá"
                      : "Bạn cần mua sản phẩm này để có thể đánh giá")}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/90" />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════
           B. TRƯỜNG HỢP ĐÃ CÓ ĐÁNH GIÁ (ACTIVE STATE)
        ══════════════════════════════════════════════════════════════════════ */
        <div className="space-y-5">
          {/* 1. Khối Thống Kê Tổng Quan */}
          <ReviewSummaryBox
            summary={summary}
            onWriteReview={handleOpenWriteModal}
            eligibility={eligibility}
          />

          {/* 2. Filter + Danh sách reviews trong khối trắng */}
          <div style={{ padding: "16px", borderRadius: "16px", backgroundColor: "#fff" }}>
            {/* 2a. Thanh Lọc */}
            <div className="mb-6 pb-5 border-b border-slate-100">
              <FilterBar
                filterStar={filterStar}
                filterHasImage={filterHasImage}
                onSelectFilter={handleSelectFilter}
              />
            </div>

            {/* 2b. Danh Sách Đánh Giá */}
            {loadingReviews && reviewPage === 1 ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="py-6 first:pt-0 flex gap-4 animate-pulse" style={{ borderBottom: "1px solid rgba(145, 158, 171, 0.24)" }}>
                    <div className="w-[200px] shrink-0 flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 bg-slate-200 rounded w-3/4" />
                        <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-4/5" />
                      <div className="h-3 bg-slate-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-0">
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.MaDanhGia}
                    review={review}
                    onLike={handleLike}
                    onLikeReply={handleLike}
                    onReplySuccess={handleReviewSuccess}
                  />
                ))}

                {/* Nút "Xem thêm đánh giá" */}
                {hasMore && (
                  <div className="flex justify-center pt-5">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingReviews}
                      className="text-blue-600 font-medium hover:underline flex items-center gap-1.5 text-sm cursor-pointer disabled:opacity-50"
                    >
                      {loadingReviews ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                      )}
                      Xem thêm đánh giá
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <img
                  src="/assets/five_star.png"
                  alt="Không có đánh giá"
                  className="w-28 object-contain mb-4 select-none"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <span className="text-slate-500 font-medium">
                  Hiện chưa có đánh giá nào thoả mãn
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── C. Modal Viết Đánh Giá ── */}
      <ReviewModal
        isOpen={showWriteModal}
        onClose={() => setShowWriteModal(false)}
        productId={productId}
        productName={productName}
        onSuccess={handleReviewSuccess}
      />
    </section>
  );
};

export default ReviewSection;
