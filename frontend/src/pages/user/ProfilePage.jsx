import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Calendar,
  Edit3,
  Lock,
  Camera,
  Loader2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProfileEditModal from '../../components/user/ProfileEditModal';
import { profileService } from '../../services/profileService';

/**
 * Định dạng ngày sinh theo chuẩn Việt Nam (DD/MM/YYYY)
 */
const formatDateVN = (dateString) => {
  if (!dateString) return 'Chưa cập nhật';
  try {
    const raw = String(dateString).split('T')[0];
    const [y, m, d] = raw.split('-');
    if (y && m && d) {
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
};

const ProfilePage = () => {
  const { user: authUser, updateUser } = useAuth();
  const [profileData, setProfileData] = useState(authUser || {});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Tải thông tin hồ sơ mới nhất từ API backend
  const fetchProfile = useCallback(async () => {
    try {
      const response = await profileService.getProfile();
      if (response?.data) {
        setProfileData(response.data);
        if (updateUser) {
          updateUser(response.data);
        }
      }
    } catch (err) {
      console.error('Không thể tải thông tin hồ sơ:', err);
    }
  }, [updateUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Vui lòng nhập đầy đủ thông tin mật khẩu!');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không trùng khớp!');
      return;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error('Mật khẩu mới không được trùng với mật khẩu hiện tại!');
      return;
    }

    setPasswordSubmitting(true);
    try {
      await profileService.changePassword({
        matKhauCu: passwordData.currentPassword,
        matKhauMoi: passwordData.newPassword,
        xacNhanMatKhauMoi: passwordData.confirmPassword,
      });

      toast.success('Đổi mật khẩu thành công!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại!';
      toast.error(msg);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const user = profileData || authUser;
  const displayName = user?.HoTen || user?.TaiKhoan || 'Người dùng';
  const initialLetter = displayName.charAt(0).toUpperCase();

  // Địa chỉ mặc định (nếu có từ profile)
  const defaultAddressStr = user?.diaChiMacDinh
    ? [
        user.diaChiMacDinh.DiaChiNha,
        user.diaChiMacDinh.PhuongXa,
        user.diaChiMacDinh.QuanHuyen,
        user.diaChiMacDinh.TinhThanh,
      ]
        .filter(Boolean)
        .join(', ')
    : user?.DiaChi || 'Chưa thiết lập địa chỉ';

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Hồ sơ cá nhân</h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý thông tin tài khoản và cài đặt bảo mật của bạn
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
        >
          <Edit3 size={16} />
          <span>Chỉnh sửa thông tin</span>
        </button>
      </div>

      {/* ── Avatar Banner Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div
          onClick={() => setIsEditModalOpen(true)}
          className="relative w-24 h-24 rounded-full cursor-pointer group shrink-0 ring-4 ring-blue-50 shadow-md select-none"
          title="Nhấp để đổi avatar"
        >
          {user?.AnhDaiDien ? (
            <img
              src={user.AnhDaiDien}
              alt={displayName}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-3xl shadow-inner">
              {initialLetter}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200">
            <Camera size={20} />
          </div>
          <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white group-hover:scale-110 transition-transform">
            <Camera size={12} />
          </div>
        </div>

        <div className="text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-bold text-slate-800 truncate">{displayName}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              {user?.MaVaiTro === 1 ? 'Quản trị viên' : 'Khách hàng'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {user?.Email || 'Chưa cập nhật email'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Nhấp vào nút <span className="font-semibold text-blue-600">"Chỉnh sửa thông tin"</span> hoặc ảnh đại diện để cập nhật thông tin cá nhân.
          </p>
        </div>
      </div>

      {/* ── Main Profile Details Grid ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 pb-3 mb-5 border-b border-slate-100">
          Chi tiết thông tin cá nhân
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Họ và tên */}
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Họ và tên</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {user?.HoTen || 'Chưa cập nhật'}
              </p>
            </div>
          </div>

          {/* Tên tài khoản */}
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Shield size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Tên tài khoản</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {user?.TaiKhoan || '---'}
              </p>
            </div>
          </div>

          {/* Địa chỉ Email */}
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Mail size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Địa chỉ Email</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {user?.Email || 'Chưa cập nhật'}
              </p>
            </div>
          </div>

          {/* Số điện thoại */}
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Phone size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Số điện thoại</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {user?.SoDienThoai || 'Chưa cập nhật'}
              </p>
            </div>
          </div>

          {/* Giới tính */}
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Giới tính</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {user?.GioiTinh || 'Chưa cập nhật'}
              </p>
            </div>
          </div>

          {/* Ngày sinh */}
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Ngày sinh</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {formatDateVN(user?.NgaySinh)}
              </p>
            </div>
          </div>

          {/* Địa chỉ giao hàng mặc định */}
          <div className="md:col-span-2 flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <MapPin size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Địa chỉ giao hàng mặc định</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {defaultAddressStr}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Security / Password Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Lock size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Bảo mật & Đổi mật khẩu</h2>
              <p className="text-xs text-slate-500">
                Nên đổi mật khẩu định kỳ để bảo vệ tài khoản tốt hơn
              </p>
            </div>
          </div>
          {!isChangingPassword && (
            <button
              type="button"
              onClick={() => setIsChangingPassword(true)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Đổi mật khẩu
            </button>
          )}
        </div>

        {isChangingPassword && (
          <form onSubmit={handleSavePassword} className="mt-5 space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm outline-none transition-all font-medium"
                placeholder="Nhập mật khẩu cũ"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mật khẩu mới
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm outline-none transition-all font-medium"
                placeholder="Tối thiểu 6 ký tự"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm outline-none transition-all font-medium"
                placeholder="Nhập lại mật khẩu mới"
                required
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsChangingPassword(false)}
                disabled={passwordSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={passwordSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {passwordSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <span>Cập nhật mật khẩu</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Modal Chỉnh sửa hồ sơ ── */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        userData={user}
        onSuccess={(updatedUser) => {
          setProfileData(updatedUser);
        }}
      />
    </div>
  );
};

export default ProfilePage;
