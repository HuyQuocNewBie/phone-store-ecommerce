import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Check,
  RefreshCw,
  AlertCircle,
  TicketPercent,
  DollarSign,
  Calendar,
  Tag,
  AlertTriangle,
  X,
  Layers,
  Sparkles,
  ShieldAlert,
  Clock,
  Hash
} from 'lucide-react';
import api from '../../../services/api';

// ── Helper format VNĐ ──
const formatVND = (value) => {
  if (value === null || value === undefined || isNaN(value) || value === '') return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// ── Helper format Date sang datetime-local input string (YYYY-MM-DDTHH:mm) ──
const toDatetimeLocalInput = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// ── Helper format Date hiển thị tiếng Việt dạng ngày/tháng/năm giờ:phút ──
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} lúc ${hours}:${minutes}`;
};

/**
 * VoucherFormPage
 * Trang riêng biệt Thêm mới / Chỉnh sửa Mã giảm giá (Voucher)
 */
const VoucherFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Loading & Submitting State
  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Form Fields State
  const [code, setCode] = useState('');
  const [giaTriGiam, setGiaTriGiam] = useState('');
  const [loaiGiam, setLoaiGiam] = useState('tien');
  const [giaTriToiThieu, setGiaTriToiThieu] = useState('');
  const [soLuong, setSoLuong] = useState('');
  const [ngayHetHan, setNgayHetHan] = useState('');
  const [trangThai, setTrangThai] = useState(1);

  // Form Validation & Dirty State
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const initialLoadDone = useRef(false);

  const markDirty = () => {
    if (initialLoadDone.current) {
      setIsDirty(true);
    }
  };

  // Unsaved Changes Guard: beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSubmitting]);

  // Fetch Voucher Detail if in Edit Mode
  useEffect(() => {
    const fetchVoucherDetail = async () => {
      if (!isEditMode) {
        // Mặc định ngày hết hạn là 7 ngày sau ở chế độ Thêm mới
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        setNgayHetHan(toDatetimeLocalInput(nextWeek));

        setTimeout(() => {
          initialLoadDone.current = true;
        }, 100);
        return;
      }

      try {
        setLoading(true);
        setSubmitError(null);
        const res = await api.get(`/admin/vouchers/${id}`);

        if (res.data?.success && res.data.data) {
          const v = res.data.data;
          setCode(v.Code || '');
          setGiaTriGiam(v.GiaTriGiam !== undefined ? String(v.GiaTriGiam) : '');
          setLoaiGiam(v.LoaiGiam || 'tien');
          setGiaTriToiThieu(v.GiaTriToiThieu !== undefined ? String(v.GiaTriToiThieu) : '');
          setSoLuong(v.SoLuong !== undefined ? String(v.SoLuong) : '');
          setNgayHetHan(toDatetimeLocalInput(v.NgayHetHan));
          setTrangThai(v.TrangThai !== undefined ? v.TrangThai : 1);
        } else {
          setSubmitError('Không tìm thấy thông tin mã giảm giá.');
        }
      } catch (err) {
        console.error('Lỗi khi tải chi tiết voucher:', err);
        setSubmitError(err.response?.data?.message || 'Không thể tải thông tin mã giảm giá.');
      } finally {
        setLoading(false);
        setTimeout(() => {
          initialLoadDone.current = true;
        }, 100);
      }
    };

    fetchVoucherDetail();
  }, [id, isEditMode]);

  // Handler back button
  const handleBackNavigation = () => {
    if (isDirty && !isSubmitting) {
      setShowExitConfirm(true);
    } else {
      navigate('/admin/vouchers');
    }
  };

  // Validate form fields directly
  const validateForm = () => {
    const newErrors = {};

    // 1. Mã Code
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      newErrors.code = 'Mã giảm giá (Code) không được để trống';
    } else if (/\s/.test(trimmedCode)) {
      newErrors.code = 'Mã giảm giá không được chứa khoảng trắng';
    }

    // 2. Giá trị giảm
    const numGiaTriGiam = Number(giaTriGiam);
    if (!giaTriGiam || isNaN(numGiaTriGiam) || numGiaTriGiam <= 0) {
      newErrors.giaTriGiam = 'Giá trị giảm phải là số lớn hơn 0 (VNĐ)';
    }

    // 3. Đơn hàng tối thiểu
    const numGiaTriToiThieu = Number(giaTriToiThieu);
    if (!giaTriToiThieu || isNaN(numGiaTriToiThieu) || numGiaTriToiThieu <= 0) {
      newErrors.giaTriToiThieu = 'Giá trị đơn hàng tối thiểu phải là số lớn hơn 0 (VNĐ)';
    } else if (numGiaTriGiam && numGiaTriGiam > numGiaTriToiThieu) {
      newErrors.giaTriGiam = 'Giá trị giảm không được lớn hơn giá trị đơn hàng tối thiểu';
    }

    // 4. Số lượng
    const numSoLuong = Number(soLuong);
    if (!soLuong || isNaN(numSoLuong) || !Number.isInteger(numSoLuong) || numSoLuong <= 0) {
      newErrors.soLuong = 'Số lượng phát hành phải là số nguyên lớn hơn 0';
    }

    // 5. Ngày hết hạn
    if (!ngayHetHan) {
      newErrors.ngayHetHan = 'Ngày hết hạn không được để trống';
    } else {
      const expireDateObj = new Date(ngayHetHan);
      if (isNaN(expireDateObj.getTime())) {
        newErrors.ngayHetHan = 'Ngày hết hạn không hợp lệ';
      } else if (expireDateObj <= new Date()) {
        newErrors.ngayHetHan = 'Ngày hết hạn phải lớn hơn thời điểm hiện tại';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin trên biểu mẫu', { id: 'voucher-validate-err' });
      return;
    }

    const trimmedCode = code.trim().toUpperCase();
    const expireDateObj = new Date(ngayHetHan);

    const payload = {
      Code: trimmedCode,
      GiaTriGiam: Number(giaTriGiam),
      LoaiGiam: loaiGiam,
      GiaTriToiThieu: Number(giaTriToiThieu),
      SoLuong: Number(soLuong),
      NgayHetHan: expireDateObj.toISOString(),
      TrangThai: Number(trangThai)
    };

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      if (isEditMode) {
        const res = await api.put(`/admin/vouchers/${id}`, payload);
        toast.success(res.data.message || 'Cập nhật mã giảm giá thành công!', { id: 'voucher-save-success' });
      } else {
        const res = await api.post('/admin/vouchers', payload);
        toast.success(res.data.message || 'Thêm mã giảm giá mới thành công!', { id: 'voucher-save-success' });
      }

      setIsDirty(false);
      navigate('/admin/vouchers');
    } catch (err) {
      console.error('Lỗi khi lưu mã giảm giá:', err);
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu mã giảm giá.';
      setSubmitError(msg);
      toast.error(msg, { id: 'voucher-save-error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex flex-col items-center justify-center py-24 text-slate-400 space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-sky-400" />
        <p className="text-sm font-medium">Đang tải thông tin mã giảm giá...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── Top Header Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-2 text-sm font-medium"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Quay lại danh sách</span>
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
              <TicketPercent className="w-7 h-7 text-sky-400" />
              {isEditMode ? `Chỉnh sửa mã giảm giá #${code || id}` : 'Thêm mã giảm giá mới'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditMode
                ? 'Thay đổi thông tin, hạn sử dụng hoặc giá trị áp dụng của voucher'
                : 'Thiết lập mã code mới, giá trị giảm giá và thời gian áp dụng'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackNavigation}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditMode ? 'Cập nhật mã' : 'Lưu mã mới'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Submit Error Banner ── */}
      {submitError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-sm font-medium">{submitError}</p>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="ml-auto text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Main Form Form ── */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── CARD 1: Thông tin mã ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-4 h-4 text-sky-400" />
              Card 1: Thông tin mã giảm giá
            </h2>
            <span className="text-xs text-sky-400/80 bg-sky-500/10 px-2.5 py-1 rounded-lg font-medium border border-sky-500/20">
              Cơ bản
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Mã Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mã Code (Voucher) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Hash className="w-4 h-4 text-amber-400" />
                </div>
                <input
                  type="text"
                  placeholder="SUMMER50, PHONESTORE2026..."
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase().replace(/\s/g, ''));
                    if (errors.code) setErrors((prev) => ({ ...prev, code: null }));
                    markDirty();
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border ${
                    errors.code
                      ? 'border-rose-500/80 focus:ring-rose-500/20'
                      : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                  } rounded-xl text-amber-400 text-sm font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:ring-2 transition-all`}
                />
              </div>
              {errors.code ? (
                <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.code}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">Viết hoa tự động, không chứa khoảng trắng</p>
              )}
            </div>

            {/* Số lượng */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Số lượng phát hành <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Layers className="w-4 h-4 text-sky-400" />
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="100"
                  value={soLuong}
                  onChange={(e) => {
                    setSoLuong(e.target.value);
                    if (errors.soLuong) setErrors((prev) => ({ ...prev, soLuong: null }));
                    markDirty();
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border ${
                    errors.soLuong
                      ? 'border-rose-500/80 focus:ring-rose-500/20'
                      : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                  } rounded-xl text-slate-100 text-sm font-semibold placeholder-slate-600 focus:outline-none focus:ring-2 transition-all`}
                />
              </div>
              {errors.soLuong && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.soLuong}
                </p>
              )}
            </div>
          </div>

          {/* Trạng thái Bật/Tắt */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Trạng thái áp dụng
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
              <label
                onClick={() => {
                  setTrangThai(1);
                  markDirty();
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  Number(trangThai) === 1
                    ? 'bg-sky-500/10 border-sky-500/50 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="TrangThai"
                  checked={Number(trangThai) === 1}
                  onChange={() => {}}
                  className="hidden"
                />
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  Number(trangThai) === 1 ? 'border-sky-400 bg-sky-500' : 'border-slate-600'
                }`}>
                  {Number(trangThai) === 1 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="block text-xs font-bold">Bật (Kích hoạt ngay)</span>
                  <span className="block text-[11px] text-slate-500">Khách hàng có thể sử dụng mã ngay lập tức</span>
                </div>
              </label>

              <label
                onClick={() => {
                  setTrangThai(0);
                  markDirty();
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  Number(trangThai) === 0
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="TrangThai"
                  checked={Number(trangThai) === 0}
                  onChange={() => {}}
                  className="hidden"
                />
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  Number(trangThai) === 0 ? 'border-amber-400 bg-amber-500' : 'border-slate-600'
                }`}>
                  {Number(trangThai) === 0 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="block text-xs font-bold">Tắt (Tạm ẩn)</span>
                  <span className="block text-[11px] text-slate-500">Mã chưa sẵn sàng cho khách áp dụng</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* ── CARD 2: Điều kiện giảm giá ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Card 2: Điều kiện giảm giá (VNĐ)
            </h2>
            <span className="text-xs text-emerald-400/80 bg-emerald-500/10 px-2.5 py-1 rounded-lg font-medium border border-emerald-500/20">
              Giá trị
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Số tiền giảm VND */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Giá trị giảm (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  placeholder="50000"
                  value={giaTriGiam}
                  onChange={(e) => {
                    setGiaTriGiam(e.target.value);
                    if (errors.giaTriGiam) setErrors((prev) => ({ ...prev, giaTriGiam: null }));
                    markDirty();
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border ${
                    errors.giaTriGiam
                      ? 'border-rose-500/80 focus:ring-rose-500/20'
                      : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                  } rounded-xl text-emerald-400 text-sm font-bold placeholder-slate-600 focus:outline-none focus:ring-2 transition-all`}
                />
              </div>
              {errors.giaTriGiam ? (
                <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.giaTriGiam}
                </p>
              ) : (
                giaTriGiam && !isNaN(Number(giaTriGiam)) && Number(giaTriGiam) > 0 && (
                  <p className="text-[11px] text-emerald-400 font-medium mt-1">
                    Bằng chữ / định dạng: <span className="font-bold">{formatVND(Number(giaTriGiam))}</span>
                  </p>
                )
              )}
            </div>

            {/* Đơn tối thiểu VND */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Đơn hàng tối thiểu (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  placeholder="200000"
                  value={giaTriToiThieu}
                  onChange={(e) => {
                    setGiaTriToiThieu(e.target.value);
                    if (errors.giaTriToiThieu) setErrors((prev) => ({ ...prev, giaTriToiThieu: null }));
                    markDirty();
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border ${
                    errors.giaTriToiThieu
                      ? 'border-rose-500/80 focus:ring-rose-500/20'
                      : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                  } rounded-xl text-slate-100 text-sm font-semibold placeholder-slate-600 focus:outline-none focus:ring-2 transition-all`}
                />
              </div>
              {errors.giaTriToiThieu ? (
                <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.giaTriToiThieu}
                </p>
              ) : (
                giaTriToiThieu && !isNaN(Number(giaTriToiThieu)) && Number(giaTriToiThieu) > 0 && (
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    Bằng chữ / định dạng: <span className="font-bold">{formatVND(Number(giaTriToiThieu))}</span>
                  </p>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── CARD 3: Thời gian áp dụng ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-400" />
              Card 3: Thời gian áp dụng
            </h2>
            <span className="text-xs text-violet-400/80 bg-violet-500/10 px-2.5 py-1 rounded-lg font-medium border border-violet-500/20">
              Thời hạn
            </span>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ngày giờ hết hạn <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Clock className="w-4 h-4 text-violet-400" />
              </div>
              <input
                type="datetime-local"
                value={ngayHetHan}
                onChange={(e) => {
                  setNgayHetHan(e.target.value);
                  if (errors.ngayHetHan) setErrors((prev) => ({ ...prev, ngayHetHan: null }));
                  markDirty();
                }}
                className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border ${
                  errors.ngayHetHan
                    ? 'border-rose-500/80 focus:ring-rose-500/20'
                    : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                } rounded-xl text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 transition-all`}
              />
            </div>
            {errors.ngayHetHan ? (
              <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.ngayHetHan}
              </p>
            ) : (
              ngayHetHan && (
                <p className="text-[11px] text-violet-300 font-medium mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  Mã sẽ hết hiệu lực vào: <span className="font-bold">{formatDateDisplay(ngayHetHan)}</span>
                </p>
              )
            )}
          </div>
        </div>
      </form>

      {/* ── Confirmation Modal: Unsaved Changes Guard ── */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Xác nhận rời khỏi trang</h3>
                <p className="text-xs text-slate-400">Dữ liệu vừa nhập chưa được lưu</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-300">
              Bạn có chắc chắn muốn rời khỏi trang không? Mọi thay đổi chưa lưu sẽ bị mất hoàn toàn.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Tiếp tục chỉnh sửa
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  setIsDirty(false);
                  navigate('/admin/vouchers');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-colors"
              >
                Rời khỏi trang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherFormPage;
