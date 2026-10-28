import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

const OVERALL_LABELS = ["Rất tệ", "Tệ", "Bình thường", "Tốt", "Tuyệt vời"];

const CRITERIA_CONFIG = [
  {
    key: "hieu_nang",
    title: "Hiệu năng",
    labels: ["Giật lag", "Không ổn định", "Ổn định", "Mạnh mẽ", "Siêu mạnh mẽ"],
  },
  {
    key: "pin",
    title: "Thời lượng pin",
    labels: ["Rất yếu", "Yếu", "Đủ dùng", "Khủng", "Cực khủng"],
  },
  {
    key: "camera",
    title: "Chất lượng camera",
    labels: ["Chụp không đẹp", "Bình thường", "Tạm ổn", "Chụp đẹp", "Chụp đẹp, chuyên nghiệp"],
  },
];

const ReviewModal = ({ isOpen, onClose, productId, productName, onSuccess }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [selectedOverallRating, setSelectedOverallRating] = useState(5);
  const [hoverOverall, setHoverOverall] = useState(0);

  const [criteriaRatings, setCriteriaRatings] = useState({
    hieu_nang: 5,
    pin: 5,
    camera: 5,
  });
  const [hoverCriteria, setHoverCriteria] = useState({});

  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Trạng thái điều khiển animation fade-in / fade-out
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timer;
    let animFrame;

    if (isOpen) {
      setIsRendered(true);
      document.body.style.overflow = "hidden";
      setSelectedOverallRating(5);
      setHoverOverall(0);
      setCriteriaRatings({ hieu_nang: 5, pin: 5, camera: 5 });
      setHoverCriteria({});
      setContent("");
      setSelectedFiles([]);
      setPreviews([]);

      // Kích hoạt animation xuất hiện (fade-in + slide-up)
      animFrame = requestAnimationFrame(() => {
        timer = setTimeout(() => {
          setIsVisible(true);
        }, 20);
      });
    } else {
      // Khi isOpen đổi từ true -> false, kích hoạt animation biến mất (fade-out + slide-down)
      setIsVisible(false);
      timer = setTimeout(() => {
        setIsRendered(false);
        document.body.style.overflow = "";
      }, 300);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (timer) clearTimeout(timer);
    };
  }, [isOpen]);

  // Hàm đóng có animation fade-out
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && isVisible) handleClose();
    };
    if (isRendered) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isRendered, isVisible]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > 5) {
      toast.error("Chỉ được chọn tối đa 5 ảnh!");
      e.target.value = "";
      return;
    }

    const newFiles = [];
    const newPreviews = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Mỗi ảnh không được vượt quá 5MB!");
        continue;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Chỉ hỗ trợ file hình ảnh!");
        continue;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để đánh giá");
      navigate("/login");
      return;
    }

    const trimmed = content.trim();
    if (trimmed.length < 15) {
      toast.error("Vui lòng nhập tối thiểu 15 kí tự cảm nhận!");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("MaSanPham", productId);
      formData.append("SoSao", selectedOverallRating);
      formData.append("NoiDung", trimmed);

      // Chi tiết đánh giá 3 tiêu chí theo chuẩn cấu trúc
      const criteriaPayload = CRITERIA_CONFIG.map((c) => ({
        key: c.key,
        label: c.title,
        rating: criteriaRatings[c.key] || 5,
      }));
      formData.append("criteria", JSON.stringify(criteriaPayload));

      selectedFiles.forEach((file) => {
        formData.append("review_images[]", file);
      });

      const res = await api.post("/reviews", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        toast.success(res.data?.message || "Đánh giá của bạn đã được ghi nhận!");
        handleClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.data?.message || "Không thể gửi đánh giá.");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Lỗi kết nối, vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isRendered) return null;

  return createPortal(
    <div
      id="reviewModal"
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Modal Dialog Content */}
      <div
        id="reviewModalContent"
        className={`bg-white rounded-2xl w-full max-w-lg mx-4 z-10 flex flex-col max-h-[90vh] shadow-2xl relative transition-all duration-300 ease-out transform ${
          isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Đánh giá & nhận xét</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 transition cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {/* Ảnh five_star.png + Tên sản phẩm */}
          <div className="flex items-center gap-3 mb-6">
            <img
              src="/assets/five_star.png"
              alt="Đánh giá sản phẩm"
              className="w-16 h-16 object-contain shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <h3 className="font-bold text-gray-800 line-clamp-2">
              {productName || "Sản phẩm"}
            </h3>
          </div>

          {/* Đánh giá chung */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-3">Đánh giá chung</h3>
            <div className="flex justify-center gap-4 sm:gap-6" id="overallStars">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const activeVal = hoverOverall || selectedOverallRating;
                const isLit = starVal <= activeVal;
                return (
                  <div
                    key={starVal}
                    className="flex flex-col items-center gap-1 cursor-pointer star-item select-none"
                    onClick={() => setSelectedOverallRating(starVal)}
                    onMouseEnter={() => setHoverOverall(starVal)}
                    onMouseLeave={() => setHoverOverall(0)}
                  >
                    <svg
                      className={`w-9 h-9 star-icon transition-all duration-150 ${
                        isLit ? "text-yellow-400 scale-110" : "text-gray-300"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d={STAR_PATH} />
                    </svg>
                    <span className="text-xs text-gray-500 font-medium">
                      {OVERALL_LABELS[starVal - 1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-gray-100 my-4" />

          {/* Theo trải nghiệm */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-3">Theo trải nghiệm</h3>
            <div className="space-y-3" id="criteriaList">
              {CRITERIA_CONFIG.map(({ key, title, labels }) => {
                const currentVal = criteriaRatings[key] || 5;
                const hoverVal = hoverCriteria[key] || 0;
                const displayVal = hoverVal || currentVal;
                const labelText = labels[displayVal - 1] || "";

                return (
                  <div
                    key={key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "140px 1fr 180px",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 0",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#374151",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {title}
                    </span>

                    <div className="flex gap-1 justify-center">
                      {[1, 2, 3, 4, 5].map((sVal) => {
                        const isLit = sVal <= displayVal;
                        return (
                          <svg
                            key={sVal}
                            onClick={() =>
                              setCriteriaRatings((prev) => ({ ...prev, [key]: sVal }))
                            }
                            onMouseEnter={() =>
                              setHoverCriteria((prev) => ({ ...prev, [key]: sVal }))
                            }
                            onMouseLeave={() =>
                              setHoverCriteria((prev) => ({ ...prev, [key]: 0 }))
                            }
                            className={`criteria-star w-6 h-6 cursor-pointer transition-all duration-100 hover:scale-125 ${
                              isLit ? "text-yellow-400" : "text-gray-300"
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d={STAR_PATH} />
                          </svg>
                        );
                      })}
                    </div>

                    <span
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {labelText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <textarea
            id="reviewContent"
            rows="4"
            className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            placeholder="Xin mời chia sẻ một số cảm nhận về sản phẩm (nhập tối thiểu 15 kí tự)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* Upload */}
          <div className="mt-4">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-gray-500 cursor-pointer"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-xs font-medium">Thêm ảnh</span>
            </button>

            {previews.length > 0 && (
              <div id="imagePreviewContainer" className="flex flex-wrap gap-2 mt-3">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative w-16 h-16">
                    <img
                      src={src}
                      alt={`Review preview ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 cursor-pointer hover:bg-red-600 transition"
                      onClick={() => removeImage(idx)}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 shrink-0">
          <button
            type="button"
            id="submitReviewBtn"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full bg-[#d70018] text-white font-bold py-3 rounded-xl hover:bg-red-700 transition flex justify-center items-center cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                ĐANG TẢI LÊN...
              </>
            ) : (
              "GỬI ĐÁNH GIÁ"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReviewModal;
