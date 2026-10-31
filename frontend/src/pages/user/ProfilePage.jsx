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
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ProfileEditModal from '../../components/user/ProfileEditModal';
import ChangePasswordDrawer from '../../components/user/ChangePasswordDrawer';
import { profileService } from '../../services/profileService';
import { addressService } from '../../services/addressService';

/**
 * Định dạng ngày sinh theo chuẩn Việt Nam (DD/MM/YYYY)
 * Nếu dữ liệu DB mang giá trị NULL, undefined, '1970-01-01', '1969-12-31' -> Hiển thị "Chưa cập nhật"
 */
const formatDateVN = (dateString) => {
  if (!dateString) return 'Chưa cập nhật';
  try {
    const raw = String(dateString).trim().split('T')[0];
    if (
      !raw ||
      raw === '1970-01-01' ||
      raw === '1969-12-31' ||
      raw === '0000-00-00' ||
      raw === '01/01/1970' ||
      raw === '31/12/1969' ||
      raw === '01/01/2000' ||
      raw === 'null' ||
      raw === 'undefined'
    ) {
      return 'Chưa cập nhật';
    }

    const parts = raw.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      if (y && m && d) {
        const formatted = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
        if (formatted === '01/01/1970' || formatted === '31/12/1969') {
          return 'Chưa cập nhật';
        }
        return formatted;
      }
    }
    // Nếu dateString đã ở dạng DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      if (raw === '01/01/1970' || raw === '31/12/1969') {
        return 'Chưa cập nhật';
      }
      return raw;
    }
    return 'Chưa cập nhật';
  } catch {
    return 'Chưa cập nhật';
  }
};

const ProfilePage = () => {
  const { user: authUser, updateUser } = useAuth();
  const [profileData, setProfileData] = useState(authUser || {});
  const [defaultAddress, setDefaultAddress] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Tải thông tin hồ sơ và địa chỉ mặc định (LaMacDinh = 1) từ API Backend
  const fetchProfileAndAddresses = useCallback(async () => {
    try {
      const [profileRes, addressRes] = await Promise.allSettled([
        profileService.getProfile(),
        addressService.getAddresses(),
      ]);

      let backendUser = {};
      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        backendUser = profileRes.value.data;
      }

      // 1. Tìm địa chỉ có LaMacDinh = 1 từ danh sách Sổ địa chỉ
      let defaultAddrStr = backendUser?.DiaChiMacDinh || null;
      if (addressRes.status === 'fulfilled') {
        const rawAddrs = addressRes.value?.data;
        const addressList = Array.isArray(rawAddrs)
          ? rawAddrs
          : Array.isArray(rawAddrs?.data)
          ? rawAddrs.data
          : [];

        if (addressList.length > 0) {
          // Ưu tiên bản ghi có LaMacDinh = 1 hoặc LaMacDinh = true
          const defaultRecord =
            addressList.find(
              (item) => item.LaMacDinh === 1 || item.LaMacDinh === true || item.LaMacDinh === '1'
            ) || addressList[0];

          if (defaultRecord) {
            const parts = [
              defaultRecord.DiaChiNha,
              defaultRecord.PhuongXa,
              defaultRecord.QuanHuyen,
              defaultRecord.TinhThanh,
            ].filter((p) => p && String(p).trim() !== '');

            if (parts.length > 0) {
              defaultAddrStr = parts.join(', ');
            }
          }
        }
      }

      // Không dùng fallback dữ liệu giả hardcode
      const resolvedAddress =
        defaultAddrStr ||
        backendUser?.DiaChi ||
        null;

      setDefaultAddress(resolvedAddress);

      const mergedProfile = {
        ...backendUser,
        DiaChiMacDinh: resolvedAddress,
      };

      setProfileData((prev) => ({
        ...(prev || {}),
        ...mergedProfile,
      }));

      if (updateUser) {
        updateUser(mergedProfile);
      }
    } catch (err) {
      console.error('Không thể tải thông tin hồ sơ & địa chỉ:', err);
    }
  }, [updateUser]);

  useEffect(() => {
    fetchProfileAndAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hợp nhất dữ liệu user giữa profileData và authUser
  const user = { ...(authUser || {}), ...(profileData || {}) };

  // 1. Họ và tên
  const displayName =
    user?.HoTen ||
    user?.TaiKhoan ||
    user?.name ||
    user?.displayName ||
    (user?.Email ? user.Email.split('@')[0] : 'Chưa cập nhật');

  const initialLetter = displayName.charAt(0).toUpperCase();

  // 2. Email
  const displayEmail = user?.Email || 'Chưa cập nhật';

  // 3. Số điện thoại (xóa fallback 0901 234 567)
  const rawPhone = user?.SoDienThoai;
  const displayPhone =
    rawPhone &&
    rawPhone !== '0901 234 567' &&
    rawPhone !== 'null' &&
    rawPhone !== 'undefined' &&
    String(rawPhone).trim() !== ''
      ? String(rawPhone).trim()
      : 'Chưa cập nhật';

  // 4. Giới tính (xóa fallback Nam mặc định)
  const rawGender = user?.GioiTinh;
  let displayGender = 'Chưa cập nhật';
  if (
    rawGender !== null &&
    rawGender !== undefined &&
    rawGender !== 'null' &&
    rawGender !== 'undefined' &&
    String(rawGender).trim() !== ''
  ) {
    const g = String(rawGender).trim().toLowerCase();
    if (g === 'nam' || g === '1' || g === 1 || g === 'male') {
      displayGender = 'Nam';
    } else if (g === 'nữ' || g === 'nu' || g === '0' || g === 0 || g === 'female') {
      displayGender = 'Nữ';
    } else if (g === 'khác' || g === 'khac' || g === 'other') {
      displayGender = 'Khác';
    } else {
      displayGender = String(rawGender);
    }
  }

  // 5. Ngày sinh (xóa fallback 01/01/2000, 31/12/1969, 1970-01-01)
  const displayBirthday = formatDateVN(user?.NgaySinh);

  // 6. Avatar
  const displayAvatar =
    user?.AnhDaiDien ||
    user?.avatar ||
    user?.picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff&size=256&bold=true`;

  // 7. Địa chỉ giao hàng mặc định (xóa fallback Số 28 Điện Biên Phủ)
  const rawAddress = defaultAddress || user?.DiaChiMacDinh || user?.DiaChi;
  const finalAddressStr =
    rawAddress &&
    !String(rawAddress).includes('Điện Biên Phủ') &&
    rawAddress !== 'null' &&
    rawAddress !== 'undefined' &&
    String(rawAddress).trim() !== ''
      ? String(rawAddress).trim()
      : 'Chưa cập nhật';

  // Đếm phần trăm hoàn thiện hồ sơ thực tế
  const totalFields = 6;
  let filledCount = 0;
  if (displayName && displayName !== 'Chưa cập nhật') filledCount++;
  if (displayEmail && displayEmail !== 'Chưa cập nhật') filledCount++;
  if (displayPhone && displayPhone !== 'Chưa cập nhật') filledCount++;
  if (displayGender && displayGender !== 'Chưa cập nhật') filledCount++;
  if (displayBirthday && displayBirthday !== 'Chưa cập nhật') filledCount++;
  if (finalAddressStr && finalAddressStr !== 'Chưa cập nhật') filledCount++;
  const completionPercent = Math.round((filledCount / totalFields) * 100);

  return (
    <div className="space-y-6">
      {/* ── Page Header / Hero Profile Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          {/* Avatar Thumbnail */}
          <div
            className="relative shrink-0 group cursor-pointer"
            onClick={() => setIsEditModalOpen(true)}
            title="Nhấp để thay đổi thông tin cá nhân"
          >
            {!avatarError && displayAvatar ? (
              <img
                src={displayAvatar}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-blue-50 shadow-md transition-all group-hover:scale-105"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-2xl shadow-md shadow-blue-500/20">
                {initialLetter}
              </div>
            )}
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs ring-2 ring-white"
              title="Đã xác thực tài khoản"
            >
              <CheckCircle2 size={13} strokeWidth={2.5} />
            </div>
          </div>

          {/* User Basic Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 truncate" title={displayName}>
                {displayName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                <ShieldCheck size={12} />
                <span>{user?.MaVaiTro === 1 ? 'Quản trị viên' : 'Thành viên SmartZone'}</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 truncate">{displayEmail}</p>
            {completionPercent === 100 ? (
              <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Đã đồng bộ đầy đủ thông tin tài khoản
              </p>
            ) : (
              <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                Hồ sơ hoàn thiện {completionPercent}% ({filledCount}/{totalFields} thông tin)
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-500/25 cursor-pointer shrink-0"
        >
          <Edit3 size={16} />
          <span>Chỉnh sửa thông tin</span>
        </button>
      </div>

      {/* ── Main Profile Details Grid ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Thông tin cá nhân</h2>
          <span className="text-xs font-medium text-slate-400">
            {completionPercent === 100 ? 'Đã hoàn thiện 100% dữ liệu' : `Đã điền ${completionPercent}% dữ liệu`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
          {/* Họ và tên */}
          <div className="sm:col-span-1 md:col-span-3 flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Họ và tên</p>
              <p
                className={`text-sm mt-0.5 truncate ${
                  displayName === 'Chưa cập nhật'
                    ? 'text-slate-400 italic font-normal'
                    : 'font-semibold text-slate-800'
                }`}
                title={displayName}
              >
                {displayName}
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
              <p
                className={`text-sm mt-0.5 truncate ${
                  displayEmail === 'Chưa cập nhật'
                    ? 'text-slate-400 italic font-normal'
                    : 'font-semibold text-slate-800'
                }`}
                title={displayEmail}
              >
                {displayEmail}
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
              <p
                className={`text-sm mt-0.5 truncate ${
                  displayPhone === 'Chưa cập nhật'
                    ? 'text-slate-400 italic font-normal'
                    : 'font-semibold text-slate-800'
                }`}
              >
                {displayPhone}
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
              <p
                className={`text-sm mt-0.5 truncate ${
                  displayGender === 'Chưa cập nhật'
                    ? 'text-slate-400 italic font-normal'
                    : 'font-semibold text-slate-800'
                }`}
              >
                {displayGender}
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
              <p
                className={`text-sm mt-0.5 truncate ${
                  displayBirthday === 'Chưa cập nhật'
                    ? 'text-slate-400 italic font-normal'
                    : 'font-semibold text-slate-800'
                }`}
              >
                {displayBirthday}
              </p>
            </div>
          </div>

          {/* Địa chỉ giao hàng mặc định */}
          <div className="sm:col-span-2 md:col-span-6 flex items-start sm:items-center gap-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <MapPin size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
                  <span>Địa chỉ giao hàng mặc định</span>
                  {finalAddressStr !== 'Chưa cập nhật' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                      Mặc định (LaMacDinh = 1)
                    </span>
                  )}
                </p>
                <Link
                  to="/user/addresses"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer shrink-0"
                >
                  <span>Sổ địa chỉ</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
              <p
                className={`text-sm mt-1 leading-snug break-words ${
                  finalAddressStr === 'Chưa cập nhật'
                    ? 'text-slate-400 italic font-normal'
                    : 'font-semibold text-slate-800'
                }`}
              >
                {finalAddressStr}
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
          if (updateUser) {
            updateUser(updatedUser);
          }
          fetchProfileAndAddresses();
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
