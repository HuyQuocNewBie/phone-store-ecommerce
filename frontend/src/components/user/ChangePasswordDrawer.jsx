import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, Lock, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { profileService } from '../../services/profileService';

/**
 * ChangePasswordDrawer — Drawer Đổi Mật Khẩu cho phân hệ Hồ Sơ Cá Nhân
 *
 * Tính năng:
 * - Trượt mượt từ Phải sang Trái (Slide-in Right-to-Left 300ms) kèm Backdrop mờ.
 * - Header: Tiêu đề "Đổi mật khẩu" + Nút đóng X.
 * - Form 3 ô Input: "Mật khẩu hiện tại", "Mật khẩu mới", "Xác nhận mật khẩu mới".
 * - Toggle Eye Icon: Mỗi ô Input có icon Mắt bên phải để ẩn/hiện mật khẩu độc lập.
 * - Validation:
 *    + Bắt buộc nhập đầy đủ tất cả các trường.
 *    + Mật khẩu mới tối thiểu 6 ký tự.
 *    + Xác nhận mật khẩu mới phải khớp 100% với Mật khẩu mới.
 *    + Mật khẩu mới không được trùng với mật khẩu hiện tại.
 * - Nút bấm DUY NHẤT: "ĐỔI MẬT KHẨU" full-width màu xanh ở góc dưới (footer).
 *
 * Props:
 *  - isOpen    {boolean}  : Trạng thái mở/đóng Drawer
 *  - onClose   {function} : Callback đóng Drawer
 *  - onSuccess {function} : Callback gọi khi đổi mật khẩu thành công
 */
const ChangePasswordDrawer = ({ isOpen, onClose, onSuccess }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animating, setAnimating] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // State ẩn / hiện mật khẩu cho từng ô input
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation errors & loading
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Quản lý Animation trượt mượt 300ms và khóa cuộn body khi mở
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => setAnimating(true), 20);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      setAnimating(false);
      document.body.style.overflow = '';
      const timer = setTimeout(() => {
        setShouldRender(false);
        // Reset form khi đóng hẳn
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setErrors({});
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 2. Lắng nghe phím Escape để đóng Drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  // 3. Xử lý thay đổi input và xóa lỗi tương ứng khi người dùng gõ
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Xóa lỗi của trường đang gõ
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    // Nếu gõ lại ô confirmPassword hoặc newPassword thì xóa lỗi khớp nhau nếu có
    if ((name === 'newPassword' || name === 'confirmPassword') && errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: null }));
    }
  };

  // 4. Validate toàn bộ form
  const validateForm = () => {
    const newErrors = {};

    // Validate "Mật khẩu hiện tại"
    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }

    // Validate "Mật khẩu mới"
    if (!formData.newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có tối thiểu 6 ký tự';
    } else if (formData.currentPassword && formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại';
    }

    // Validate "Xác nhận mật khẩu mới"
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (formData.newPassword && formData.confirmPassword !== formData.newPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu mới không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 5. Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await profileService.changePassword({
        matKhauCu: formData.currentPassword,
        matKhauMoi: formData.newPassword,
        xacNhanMatKhauMoi: formData.confirmPassword,
      });

      toast.success(response?.message || 'Đổi mật khẩu thành công!');

      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({});

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      const message =
        err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại!';
      toast.error(message);

      // Nếu lỗi từ backend liên quan mật khẩu cũ
      if (message.toLowerCase().includes('mật khẩu cũ') || message.toLowerCase().includes('hiện tại')) {
        setErrors((prev) => ({ ...prev, currentPassword: message }));
      } else if (message.toLowerCase().includes('trùng')) {
        setErrors((prev) => ({ ...prev, newPassword: message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shouldRender) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="change-password-drawer-title"
      role="dialog"
      aria-modal="true"
    >
      {/* ── Backdrop mờ trượt mượt 300ms ── */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          animating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      {/* ── Container Drawer Slide-in từ Phải sang Trái ── */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <div
          className={`w-screen max-w-md bg-white shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 ease-in-out ${
            animating ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* ── Header: Tiêu đề "Đổi mật khẩu" + Nút đóng X ── */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h1
                  id="change-password-drawer-title"
                  className="text-lg font-bold text-slate-800 tracking-tight"
                >
                  Đổi mật khẩu
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập mật khẩu mới để bảo vệ tài khoản
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Đóng bảng đổi mật khẩu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Form Body (Cuộn nội dung độc lập) ── */}
          <form
            id="change-password-drawer-form"
            onSubmit={handleSubmit}
            noValidate
            className="flex-1 overflow-y-auto px-6 py-6 space-y-5"
          >
            {/* Lời nhắc bảo mật */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-800 text-xs leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Mật khẩu nên có tối thiểu 6 ký tự, bao gồm chữ cái và số để tăng cường độ an toàn.
              </span>
            </div>

            {/* ── Ô 1: Mật khẩu hiện tại ── */}
            <div className="space-y-1.5">
              <label
                htmlFor="drawer-current-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Mật khẩu hiện tại <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="drawer-current-password"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="Nhập mật khẩu hiện tại của bạn"
                  autoComplete="current-password"
                  className={`w-full bg-white border rounded-xl px-3.5 py-2.5 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.currentPassword
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                  } disabled:bg-slate-50 disabled:text-slate-400`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label={showCurrentPassword ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.currentPassword}
                </p>
              )}
            </div>

            {/* ── Ô 2: Mật khẩu mới ── */}
            <div className="space-y-1.5">
              <label
                htmlFor="drawer-new-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="drawer-new-password"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  autoComplete="new-password"
                  className={`w-full bg-white border rounded-xl px-3.5 py-2.5 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.newPassword
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                  } disabled:bg-slate-50 disabled:text-slate-400`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.newPassword ? (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.newPassword}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Tối thiểu 6 ký tự
                </p>
              )}
            </div>

            {/* ── Ô 3: Xác nhận mật khẩu mới ── */}
            <div className="space-y-1.5">
              <label
                htmlFor="drawer-confirm-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Xác nhận mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="drawer-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                  className={`w-full bg-white border rounded-xl px-3.5 py-2.5 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.confirmPassword
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                  } disabled:bg-slate-50 disabled:text-slate-400`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </form>

          {/* ── NÚT BẤM DUY NHẤT: "ĐỔI MẬT KHẨU" full-width màu xanh ở góc dưới ── */}
          <div className="p-5 border-t border-slate-200 bg-white shrink-0">
            <button
              type="submit"
              form="change-password-drawer-form"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ĐANG XỬ LÝ...</span>
                </>
              ) : (
                <span>ĐỔI MẬT KHẨU</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChangePasswordDrawer;

