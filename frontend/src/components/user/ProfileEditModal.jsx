import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  X,
  Camera,
  User,
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  Check,
  Loader2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';

/**
 * Kiểm tra định dạng số điện thoại Việt Nam
 * Hợp lệ: 10 chữ số bắt đầu bằng 0 hoặc +84 với các đầu số di động 3, 5, 7, 8, 9
 */
const isValidVietnamesePhone = (phone) => {
  if (!phone || phone.trim() === '') return true;
  const trimmed = phone.trim();
  const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
  return vnPhoneRegex.test(trimmed);
};

/* ─── ProfileEditModal Component ─────────────────────────────────────────── */
const ProfileEditModal = ({
  isOpen,
  onClose,
  userData = null,
  onSuccess,
}) => {
  const { user: authUser, updateUser } = useAuth();
  const currentUser = userData || authUser;

  // Animation states
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    gioiTinh: '',
    soDienThoai: '',
    ngaySinh: '',
  });

  // Avatar states
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  // Dọn dẹp object URL preview khi unmount để tránh rò rỉ bộ nhớ
  const cleanupPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      cleanupPreview();
    };
  }, []);

  // Điều khiển animation Fade Up (mở) và Fade Down (đóng)
  useEffect(() => {
    let animTimer;
    let frameId;

    if (isOpen) {
      setIsRendered(true);
      document.body.style.overflow = 'hidden';

      // Trích xuất dữ liệu ngày sinh từ user (định dạng YYYY-MM-DD)
      let initNgaySinh = '';
      if (currentUser?.NgaySinh) {
        try {
          initNgaySinh = String(currentUser.NgaySinh).split('T')[0];
        } catch (e) {
          console.error('Lỗi phân tích ngày sinh:', e);
        }
      }

      setFormData({
        gioiTinh: currentUser?.GioiTinh || '',
        soDienThoai: currentUser?.SoDienThoai || '',
        ngaySinh: initNgaySinh,
      });

      setAvatarPreview(currentUser?.AnhDaiDien || null);
      setSelectedFile(null);

      // Kích hoạt transition xuất hiện (Fade Up)
      frameId = requestAnimationFrame(() => {
        animTimer = setTimeout(() => {
          setIsVisible(true);
        }, 20);
      });
    } else {
      // Transition biến mất (Fade Down)
      setIsVisible(false);
      animTimer = setTimeout(() => {
        setIsRendered(false);
        document.body.style.overflow = '';
        cleanupPreview();
        setSelectedFile(null);
      }, 250);
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (animTimer) clearTimeout(animTimer);
    };
  }, [isOpen, currentUser]);

  // Đóng modal với animation Fade Down
  const handleClose = () => {
    if (submitting) return;
    setIsVisible(false);
    setTimeout(() => {
      cleanupPreview();
      setSelectedFile(null);
      onClose();
    }, 250);
  };

  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isVisible && !submitting) {
        handleClose();
      }
    };
    if (isRendered) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRendered, isVisible, submitting]);

  // Xử lý thay đổi các input text/select cơ bản
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Xử lý validation và preview khi chọn file ảnh avatar
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Kiểm tra định dạng file ảnh: Chỉ cho phép image/jpeg, image/png, image/webp
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận file hình ảnh (JPG, PNG, WEBP)!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Kiểm tra dung lượng file: Tối đa 2MB
    const maxSizeBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSizeBytes) {
      toast.error('Dung lượng ảnh không được vượt quá 2MB!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 3. Tạo preview tức thì
    cleanupPreview();
    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setAvatarPreview(objectUrl);
    setSelectedFile(file);
  };

  // Submit cập nhật thông tin cá nhân
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Kiểm tra số điện thoại Việt Nam
    if (formData.soDienThoai && !isValidVietnamesePhone(formData.soDienThoai)) {
      toast.error('Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam (VD: 0912345678).');
      return;
    }

    // 2. Xử lý ngày sinh
    let formattedNgaySinh = formData.ngaySinh || null;

    if (formattedNgaySinh) {
      const dateObj = new Date(formattedNgaySinh);
      if (isNaN(dateObj.getTime())) {
        toast.error('Ngày sinh không hợp lệ!');
        return;
      }
      if (dateObj > new Date()) {
        toast.error('Ngày sinh không được lớn hơn ngày hiện tại!');
        return;
      }
    }

    setSubmitting(true);

    try {
      let finalAvatarUrl = currentUser?.AnhDaiDien || null;

      // Nếu người dùng chọn ảnh mới, gọi API POST /api/v1/upload/avatar trước
      if (selectedFile) {
        try {
          const uploadRes = await profileService.uploadAvatar(selectedFile);
          if (uploadRes?.data?.url) {
            finalAvatarUrl = uploadRes.data.url;
          }
        } catch (uploadErr) {
          const errMsg =
            uploadErr.response?.data?.message ||
            'Upload ảnh đại diện thất bại. Vui lòng thử lại!';
          toast.error(errMsg);
          setSubmitting(false);
          return;
        }
      }

      // Gọi API PUT /api/v1/profile cập nhật thông tin cá nhân
      const updatePayload = {
        GioiTinh: formData.gioiTinh || null,
        NgaySinh: formattedNgaySinh,
        SoDienThoai: formData.soDienThoai.trim() || null,
        AnhDaiDien: finalAvatarUrl,
      };

      const updateRes = await profileService.updateProfile(updatePayload);
      const updatedUser = updateRes?.data;

      // Cập nhật AuthContext và localStorage ngay lập tức
      const newAvatarUrl = updatedUser?.AnhDaiDien || finalAvatarUrl;
      if (updateUser) {
        updateUser({
          ...(updatedUser || {}),
          AnhDaiDien: newAvatarUrl,
        });
      }

      toast.success('Cập nhật thông tin cá nhân thành công!');
      onSuccess?.(updatedUser || { ...currentUser, AnhDaiDien: newAvatarUrl });
      handleClose();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại!';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isRendered) return null;

  const displayName = formData.hoTen || currentUser?.HoTen || currentUser?.TaiKhoan || 'U';
  const initialLetter = displayName.charAt(0).toUpperCase();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-edit-modal-title"
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-250 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* ── Backdrop mờ ── */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-250 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* ── Modal Dialog Content (Fade Up / Fade Down mượt mà) ── */}
      <div
        className={`bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 z-10 flex flex-col max-h-[92vh] overflow-hidden relative transition-all duration-300 ease-out transform ${
          isVisible
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-8 opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2
              id="profile-edit-modal-title"
              className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
            >
              Cập nhật thông tin cá nhân
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Thay đổi avatar và chi tiết hồ sơ của bạn
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Đóng modal"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body (Form) ── */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div
            className="p-5 sm:p-6 overflow-y-auto space-y-4"
            style={{ scrollbarWidth: 'thin' }}
          >
            {/* ── Khung xem trước Avatar hình tròn ở giữa ── */}
            <div className="flex flex-col items-center justify-center pt-1 pb-3">
              <div
                onClick={() => !submitting && fileInputRef.current?.click()}
                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full cursor-pointer group select-none shadow-md ring-4 ring-blue-50 hover:ring-blue-100 transition-all duration-200"
                title="Nhấp vào để thay đổi avatar"
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-3xl shadow-inner">
                    {initialLetter}
                  </div>
                )}

                {/* Overlay hover */}
                <div className="absolute inset-0 rounded-full bg-slate-900/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 backdrop-blur-[1px]">
                  <Camera className="w-7 h-7 mb-1 stroke-[2]" />
                  <span className="text-[11px] font-semibold tracking-wide">Thay đổi</span>
                </div>

                {/* Badge Icon máy ảnh góc dưới */}
                <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white group-hover:scale-110 transition-transform duration-200">
                  <Camera size={14} />
                </div>
              </div>

              {/* Dòng chữ mờ hướng dẫn */}
              <p className="text-xs text-slate-400 mt-2.5 text-center font-medium">
                Nhấp vào ảnh để thay đổi avatar
              </p>

              {/* Input file ẩn */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={submitting}
              />
            </div>

            {/* ── Grid các trường thông tin ── */}
            <div className="space-y-4">
              {/* Input Họ và tên: Cố định theo tài khoản, không cho phép chỉnh sửa */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <User size={14} className="text-slate-400" />
                  <span>Họ và tên</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentUser?.HoTen || currentUser?.TaiKhoan || ''}
                    disabled
                    aria-disabled="true"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm cursor-not-allowed select-none font-medium pr-10"
                  />
                  <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Họ và tên cố định theo tài khoản và không thể thay đổi
                </p>
              </div>

              {/* Select Giới tính: Dropdown Chọn Nam / Nữ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Giới tính
                </label>
                <div className="relative">
                  <select
                    name="gioiTinh"
                    value={formData.gioiTinh}
                    onChange={handleInputChange}
                    disabled={submitting}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm text-slate-800 outline-none transition-all font-medium appearance-none bg-white pr-9 cursor-pointer disabled:bg-slate-50"
                  >
                    <option value="">-- Chọn giới tính --</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Khối Ngày sinh (3 Select Option nằm ngang: [Ngày] [Tháng] [Năm]) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  <span>Ngày sinh</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="ngaySinh"
                    value={formData.ngaySinh}
                    onChange={handleInputChange}
                    max={new Date().toISOString().split('T')[0]}
                    min="1920-01-01"
                    disabled={submitting}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm text-slate-800 outline-none transition-all font-medium bg-white cursor-pointer disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Input Số điện thoại: Cho phép sửa + Validation SĐT Việt Nam */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-400" />
                  <span>Số điện thoại</span>
                </label>
                <input
                  type="tel"
                  name="soDienThoai"
                  value={formData.soDienThoai}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: 0912345678"
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhập số điện thoại 10 chữ số của các nhà mạng Việt Nam
                </p>
              </div>

              {/* Input Email: Vô hiệu hóa (disabled nền xám) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Mail size={14} className="text-slate-400" />
                  <span>Địa chỉ Email</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={currentUser?.Email || ''}
                    disabled
                    aria-disabled="true"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm cursor-not-allowed select-none font-medium pr-10"
                  />
                  <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Email dùng để nhận thông báo đơn hàng và đăng nhập
                </p>
              </div>
            </div>
          </div>

          {/* ── Footer: Nút Hủy & Nút Lưu thay đổi (màu xanh bg-blue-600 góc dưới bên phải) ── */}
          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ProfileEditModal;
