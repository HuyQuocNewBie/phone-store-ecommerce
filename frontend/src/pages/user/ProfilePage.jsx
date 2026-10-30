import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit3,
  Lock,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProfileEditModal from '../../components/user/ProfileEditModal';
import ChangePasswordDrawer from '../../components/user/ChangePasswordDrawer';
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
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

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

  const user = profileData || authUser;
  const displayName = user?.HoTen || user?.TaiKhoan || 'Người dùng';
  const initialLetter = displayName.charAt(0).toUpperCase();

  // Địa chỉ mặc định (nếu có từ profile)
  // Ưu tiên: DiaChiMacDinh (string ghép từ sodiachi) → DiaChi (cột cũ) → null
  const defaultAddressStr =
    user?.DiaChiMacDinh ||
    user?.DiaChi ||
    '';

  const hasDefaultAddress = Boolean(defaultAddressStr);

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

      {/* ── Main Profile Details Grid ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 pb-3 mb-5 border-b border-slate-100">
          Thông tin cá nhân
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
          {/* Họ và tên */}
          <div className="sm:col-span-1 md:col-span-3 flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Họ và tên</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {user?.TaiKhoan || user?.HoTen || (
                  <span className="text-slate-400 font-normal italic">Chưa cập nhật</span>
                )}
              </p>
            </div>
          </div>

          {/* Địa chỉ Email */}
          <div className="sm:col-span-1 md:col-span-3 flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Mail size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Địa chỉ Email</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {user?.Email || (
                  <span className="text-slate-400 font-normal italic">Chưa cập nhật</span>
                )}
              </p>
            </div>
          </div>

          {/* Số điện thoại */}
          <div className="sm:col-span-1 md:col-span-2 flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Phone size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Số điện thoại</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {user?.SoDienThoai || (
                  <span className="text-slate-400 font-normal italic">Chưa cập nhật</span>
                )}
              </p>
            </div>
          </div>

          {/* Giới tính */}
          <div className="sm:col-span-1 md:col-span-2 flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Giới tính</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {user?.GioiTinh || (
                  <span className="text-slate-400 font-normal italic">Chưa cập nhật</span>
                )}
              </p>
            </div>
          </div>

          {/* Ngày sinh */}
          <div className="sm:col-span-2 md:col-span-2 flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Ngày sinh</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {user?.NgaySinh ? (
                  formatDateVN(user.NgaySinh)
                ) : (
                  <span className="text-slate-400 font-normal italic">Chưa cập nhật</span>
                )}
              </p>
            </div>
          </div>

          {/* Địa chỉ giao hàng mặc định */}
          <div className="sm:col-span-2 md:col-span-6 flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <MapPin size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Địa chỉ giao hàng mặc định</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {hasDefaultAddress ? (
                  defaultAddressStr
                ) : (
                  <span className="text-slate-400 font-normal italic">Chưa thiết lập địa chỉ</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Security / Password Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Bảo mật & Đổi mật khẩu</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nên đổi mật khẩu định kỳ để bảo vệ tài khoản tốt hơn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsChangePasswordOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-blue-200 hover:border-blue-600 hover:bg-blue-50 text-blue-600 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-xs shrink-0"
          >
            <Lock size={15} />
            <span>Đổi mật khẩu</span>
          </button>
        </div>
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

      {/* ── Drawer Đổi Mật Khẩu ── */}
      <ChangePasswordDrawer
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export default ProfilePage;
