import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Calendar,
  Edit3,
  Check,
  Lock,
  Camera,
  Save,
  X,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [formData, setFormData] = useState({
    hoTen: user?.HoTen || user?.TaiKhoan || '',
    email: user?.Email || '',
    soDienThoai: user?.SoDienThoai || '',
    diaChi: user?.DiaChi || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    // Giả lập lưu hoặc cập nhật local
    toast.success('Cập nhật hồ sơ cá nhân thành công!');
    setIsEditing(false);
  };

  const handleSavePassword = (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Vui lòng nhập đầy đủ thông tin mật khẩu!');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu mới không trùng khớp!');
      return;
    }
    toast.success('Đổi mật khẩu thành công!');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsChangingPassword(false);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="bg-white rounded-2xl border border-surface-container/60 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Hồ sơ cá nhân</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Quản lý thông tin tài khoản và cài đặt bảo mật của bạn
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Edit3 size={16} />
            <span>Chỉnh sửa thông tin</span>
          </button>
        )}
      </div>

      {/* ── Main Profile Card ── */}
      <div className="bg-white rounded-2xl border border-surface-container/60 p-6 shadow-sm">
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <h2 className="text-base font-semibold text-on-surface pb-3 border-b border-surface-container/60">
              Chỉnh sửa thông tin cơ bản
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Họ và tên
                </label>
                <input
                  type="text"
                  name="hoTen"
                  value={formData.hoTen}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none transition-all"
                  placeholder="Nhập họ và tên"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Tên tài khoản (Không thể đổi)
                </label>
                <input
                  type="text"
                  value={user?.TaiKhoan || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline/20 bg-surface-container-low text-on-surface-variant text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none transition-all"
                  placeholder="example@domain.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  name="soDienThoai"
                  value={formData.soDienThoai}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none transition-all"
                  placeholder="0912345678"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Địa chỉ mặc định
                </label>
                <input
                  type="text"
                  name="diaChi"
                  value={formData.diaChi}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none transition-all"
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container/60">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-outline/30 text-on-surface hover:bg-surface-container-low text-sm font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Save size={16} />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* View Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex items-center gap-3.5 p-4 rounded-xl bg-surface-container-lowest border border-surface-container/50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Họ và tên</p>
                  <p className="text-sm font-semibold text-on-surface mt-0.5">
                    {user?.HoTen || user?.TaiKhoan || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-4 rounded-xl bg-surface-container-lowest border border-surface-container/50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Tên tài khoản</p>
                  <p className="text-sm font-semibold text-on-surface mt-0.5">
                    {user?.TaiKhoan || '---'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-4 rounded-xl bg-surface-container-lowest border border-surface-container/50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Địa chỉ Email</p>
                  <p className="text-sm font-semibold text-on-surface mt-0.5">
                    {user?.Email || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-4 rounded-xl bg-surface-container-lowest border border-surface-container/50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Số điện thoại</p>
                  <p className="text-sm font-semibold text-on-surface mt-0.5">
                    {user?.SoDienThoai || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              <div className="md:col-span-2 flex items-center gap-3.5 p-4 rounded-xl bg-surface-container-lowest border border-surface-container/50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MapPin size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-on-surface-variant">Địa chỉ giao hàng mặc định</p>
                  <p className="text-sm font-semibold text-on-surface mt-0.5">
                    {user?.DiaChi || 'Chưa thiết lập địa chỉ'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Security / Password Card ── */}
      <div className="bg-white rounded-2xl border border-surface-container/60 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-surface-container/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Lock size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-on-surface">Bảo mật & Đổi mật khẩu</h2>
              <p className="text-xs text-on-surface-variant">
                Nên đổi mật khẩu định kỳ để bảo vệ tài khoản tốt hơn
              </p>
            </div>
          </div>
          {!isChangingPassword && (
            <button
              type="button"
              onClick={() => setIsChangingPassword(true)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Đổi mật khẩu
            </button>
          )}
        </div>

        {isChangingPassword && (
          <form onSubmit={handleSavePassword} className="mt-5 space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none"
                placeholder="Nhập mật khẩu cũ"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Mật khẩu mới
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none"
                placeholder="Tối thiểu 6 ký tự"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none"
                placeholder="Nhập lại mật khẩu mới"
                required
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsChangingPassword(false)}
                className="px-4 py-2 rounded-xl border border-outline/30 text-on-surface hover:bg-surface-container-low text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Cập nhật mật khẩu
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;

