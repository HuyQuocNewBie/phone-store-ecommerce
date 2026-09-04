import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Check,
  RefreshCw,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  X
} from 'lucide-react';
import api from '../../../services/api';

const PHONE_REGEX = /^0\d{9}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

/**
 * ManufacturerFormPage
 * Trang riêng biệt Thêm mới / Chỉnh sửa Nhà sản xuất
 */
const ManufacturerFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // States
  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Form Fields
  const [tenNhaSanXuat, setTenNhaSanXuat] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [soDienThoai, setSoDienThoai] = useState('');
  const [email, setEmail] = useState('');

  // Validation Errors
  const [errors, setErrors] = useState({});

  // Fetch Manufacturer detail if editing
  useEffect(() => {
    const fetchDetail = async () => {
      if (!isEditMode) return;

      try {
        setLoading(true);
        setSubmitError(null);
        const res = await api.get(`/admin/manufacturers/${id}`);
        const m = res.data?.data;

        if (m) {
          setTenNhaSanXuat(m.TenNhaSanXuat || '');
          setDiaChi(m.DiaChi || '');
          setSoDienThoai(m.SoDienThoai || '');
          setEmail(m.Email || '');
        } else {
          setSubmitError('Không tìm thấy thông tin nhà sản xuất.');
        }
      } catch (err) {
        console.error('Lỗi khi tải chi tiết nhà sản xuất:', err);
        setSubmitError(err.response?.data?.message || 'Không thể tải thông tin nhà sản xuất.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, isEditMode]);

  // Validation
  const validateForm = () => {
    const newErrors = {};

    const trimmedTen = tenNhaSanXuat.trim();
    if (!trimmedTen) {
      newErrors.tenNhaSanXuat = 'Tên nhà sản xuất không được để trống';
    }

    const trimmedDiaChi = diaChi.trim();
    if (!trimmedDiaChi) {
      newErrors.diaChi = 'Địa chỉ nhà sản xuất không được để trống';
    }

    const trimmedPhone = soDienThoai.trim();
    if (!trimmedPhone) {
      newErrors.soDienThoai = 'Số điện thoại không được để trống';
    } else if (!PHONE_REGEX.test(trimmedPhone)) {
      newErrors.soDienThoai = 'Số điện thoại không hợp lệ (gồm 10 chữ số, bắt đầu bằng 0)';
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email không được để trống';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      newErrors.email = 'Email không đúng định dạng hợp lệ (VD: contact@brand.com)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại các trường thông tin', { id: 'mfg-form-err' });
      return;
    }

    const payload = {
      TenNhaSanXuat: tenNhaSanXuat.trim(),
      DiaChi: diaChi.trim(),
      SoDienThoai: soDienThoai.trim(),
      Email: email.trim(),
    };

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      if (isEditMode) {
        const res = await api.put(`/admin/manufacturers/${id}`, payload);
        toast.success(res.data?.message || 'Cập nhật nhà sản xuất thành công!', { id: `mfg-save-ok-${id}` });
      } else {
        const res = await api.post('/admin/manufacturers', payload);
        toast.success(res.data?.message || 'Thêm nhà sản xuất mới thành công!', { id: 'mfg-save-ok-new' });
      }

      navigate('/admin/manufacturers');
    } catch (err) {
      console.error('Lỗi khi lưu nhà sản xuất:', err);
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin nhà sản xuất.';
      setSubmitError(msg);
      toast.error(msg, { id: 'mfg-save-err' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 max-w-5xl mx-auto flex flex-col items-center justify-center py-24 text-slate-400 space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-sky-400" />
        <p className="text-sm font-medium">Đang tải thông tin nhà sản xuất...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto space-y-6 overflow-auto">
      {/* ── Top Header Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/manufacturers')}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-2 text-sm font-medium"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Quay lại danh sách</span>
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-sky-400" />
              {isEditMode ? `Chỉnh sửa nhà sản xuất #${id}` : 'Thêm nhà sản xuất mới'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditMode
                ? 'Cập nhật tên thương hiệu, địa chỉ trụ sở và thông tin liên hệ'
                : 'Tạo hồ sơ nhà sản xuất/thương hiệu đối tác cung cấp sản phẩm'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/manufacturers')}
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
                <span>{isEditMode ? 'Cập nhật' : 'Thêm nhà sản xuất'}</span>
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

      {/* ── Main Form ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              Thông tin chi tiết nhà sản xuất
            </h2>
            <span className="text-xs text-sky-400/80 bg-sky-500/10 px-2.5 py-1 rounded-lg font-medium border border-sky-500/20">
              Bắt buộc
            </span>
          </div>

          <div className="space-y-5">
            {/* Tên nhà sản xuất */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tên nhà sản xuất / Thương hiệu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Building2 className="w-4 h-4 text-sky-400" />
                </div>
                <input
                  type="text"
                  placeholder="Apple, Samsung, Xiaomi, Sony..."
                  value={tenNhaSanXuat}
                  onChange={(e) => {
                    setTenNhaSanXuat(e.target.value);
                    if (errors.tenNhaSanXuat) setErrors((prev) => ({ ...prev, tenNhaSanXuat: null }));
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border ${
                    errors.tenNhaSanXuat
                      ? 'border-rose-500/80 focus:ring-rose-500/20'
                      : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                  } rounded-xl text-slate-100 text-sm font-semibold placeholder-slate-600 focus:outline-none focus:ring-2 transition-all`}
                />
              </div>
              {errors.tenNhaSanXuat && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.tenNhaSanXuat}
                </p>
              )}
            </div>

            {/* Số điện thoại & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Số điện thoại liên hệ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="0912345678"
                    value={soDienThoai}
                    onChange={(e) => {
                      setSoDienThoai(e.target.value);
                      if (errors.soDienThoai) setErrors((prev) => ({ ...prev, soDienThoai: null }));
                    }}
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border ${
                      errors.soDienThoai
                        ? 'border-rose-500/80 focus:ring-rose-500/20'
                        : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                    } rounded-xl text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 transition-all`}
                  />
                </div>
                {errors.soDienThoai ? (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.soDienThoai}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">Đủ 10 chữ số, bắt đầu bằng 0</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email liên hệ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4 text-violet-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="contact@apple.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    }}
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border ${
                      errors.email
                        ? 'border-rose-500/80 focus:ring-rose-500/20'
                        : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                    } rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 transition-all`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Địa chỉ */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Địa chỉ trụ sở / Văn phòng <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute top-3 left-0 pl-3.5 flex items-start pointer-events-none text-slate-500">
                  <MapPin className="w-4 h-4 text-amber-400" />
                </div>
                <textarea
                  rows={3}
                  placeholder="One Apple Park Way, Cupertino, CA 95014, USA"
                  value={diaChi}
                  onChange={(e) => {
                    setDiaChi(e.target.value);
                    if (errors.diaChi) setErrors((prev) => ({ ...prev, diaChi: null }));
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border ${
                    errors.diaChi
                      ? 'border-rose-500/80 focus:ring-rose-500/20'
                      : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                  } rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 transition-all resize-none`}
                />
              </div>
              {errors.diaChi && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.diaChi}
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ManufacturerFormPage;
