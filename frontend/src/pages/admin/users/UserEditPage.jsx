import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Check,
  RefreshCw,
  AlertCircle,
  Users,
  Shield,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  User,
  Lock,
  X,
  AlertTriangle
} from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

/**
 * UserEditPage
 * Trang chuyên dụng Chỉnh sửa thông tin & Phân quyền Người dùng
 */
const UserEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  // State quản lý dữ liệu người dùng
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Form state
  const [taiKhoan, setTaiKhoan] = useState('');
  const [email, setEmail] = useState('');
  const [soDienThoai, setSoDienThoai] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [maVaiTro, setMaVaiTro] = useState(2);

  // State lỗi validate theo từng trường
  const [errors, setErrors] = useState({});

  // Kiểm tra nếu tài khoản đang sửa chính là Admin đang đăng nhập (Tránh tự hạ quyền)
  const isSelf = currentUser && Number(currentUser.MaNguoiDung) === Number(id);

  // Tải thông tin chi tiết người dùng
  useEffect(() => {
    const fetchUserDetail = async () => {
      const userId = Number(id);
      if (!id || isNaN(userId)) {
        toast.error('Mã người dùng không hợp lệ!', { id: 'invalid-user-id' });
        navigate('/admin/users');
        return;
      }

      try {
        setLoading(true);
        setSubmitError(null);
        const res = await api.get(`/admin/users/${userId}`);

        if (res.data?.success && res.data.data) {
          const u = res.data.data;
          setUserData(u);
          setTaiKhoan(u.TaiKhoan || '');
          setEmail(u.Email || '');
          setSoDienThoai(u.SoDienThoai || '');
          setDiaChi(u.DiaChi || '');
          setMaVaiTro(u.MaVaiTro || 2);
        } else {
          toast.error('Người dùng không tồn tại hoặc đã bị xóa!', { id: 'user-not-found' });
          navigate('/admin/users');
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin người dùng:', err);
        toast.error(
          err.response?.data?.message || 'Người dùng không tồn tại hoặc đã bị xóa!',
          { id: 'user-fetch-error' }
        );
        navigate('/admin/users');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetail();
  }, [id, navigate]);

  // Kiểm tra Validate thông tin nhập liệu
  const validateForm = () => {
    const newErrors = {};

    // 1. Validate Tài khoản / Họ tên
    const trimmedTaiKhoan = taiKhoan.trim();
    if (!trimmedTaiKhoan) {
      newErrors.taiKhoan = 'Tài khoản không được để trống';
    } else if (trimmedTaiKhoan.length < 3) {
      newErrors.taiKhoan = 'Tài khoản phải có ít nhất 3 ký tự';
    }

    // 2. Validate Email chuẩn
    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!trimmedEmail) {
      newErrors.email = 'Email không được để trống';
    } else if (!emailRegex.test(trimmedEmail)) {
      newErrors.email = 'Email không đúng định dạng chuẩn (Vd: example@domain.com)';
    }

    // 3. Validate SĐT chuẩn định dạng Việt Nam (bắt đầu 03, 05, 07, 08, 09 hoặc +84)
    const trimmedPhone = soDienThoai.trim();
    const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    if (trimmedPhone && !vnPhoneRegex.test(trimmedPhone)) {
      newErrors.soDienThoai = 'Số điện thoại không đúng chuẩn Việt Nam (Vd: 0987654321 hoặc +84987654321)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Form cập nhật
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin nhập liệu!', { id: 'validate-err' });
      return;
    }

    const payload = {
      TaiKhoan: taiKhoan.trim(),
      Email: email.trim(),
      MaVaiTro: isSelf ? 1 : Number(maVaiTro), // Giữ nguyên vai trò Admin nếu tự sửa chính mình
      SoDienThoai: soDienThoai.trim(),
      DiaChi: diaChi.trim(),
    };

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const res = await api.put(`/admin/users/${id}`, payload);
      toast.success(res.data.message || 'Cập nhật thông tin người dùng thành công!', {
        id: `user-update-success-${id}`
      });

      navigate('/admin/users');
    } catch (err) {
      console.error('Lỗi khi cập nhật người dùng:', err);
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật người dùng.';
      setSubmitError(msg);
      toast.error(msg, { id: 'user-update-error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex flex-col items-center justify-center py-24 text-slate-400 space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-sky-400" />
        <p className="text-sm font-medium">Đang tải thông tin người dùng #{id}...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Header Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-2 text-sm font-medium"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Quay lại danh sách</span>
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
              <Users className="w-7 h-7 text-sky-400" />
              Chỉnh sửa người dùng #{id}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Cập nhật thông tin cá nhân, liên hệ và phân quyền tài khoản
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
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
                <span>Lưu thay đổi</span>
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

      {/* ── Main Layout: Grid 2 cột ── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── CỘT BÊN TRÁI: Avatar & Thông tin cố định (1 Cột) ── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center text-center">
            {/* Avatar Circle */}
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 p-1 shadow-xl">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-3xl font-extrabold text-white">
                  {(taiKhoan?.[0] || 'U').toUpperCase()}
                </div>
              </div>
              <span className="absolute bottom-0 right-0 p-1.5 bg-slate-900 border border-slate-700 rounded-full text-sky-400">
                <User className="w-4 h-4" />
              </span>
            </div>

            {/* Thông tin cố định */}
            <h2 className="text-lg font-bold text-slate-100">{userData?.TaiKhoan || taiKhoan}</h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-3 font-mono">ID: #{id}</p>

            {/* Role Badge */}
            <div className="mb-4">
              {Number(maVaiTro) === 1 ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  <Shield className="w-4 h-4" />
                  Quản trị viên (Admin)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  <UserCheck className="w-4 h-4" />
                  Khách hàng (User)
                </span>
              )}
            </div>

            {isSelf && (
              <div className="w-full p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium flex items-center justify-center gap-2">
                <Shield className="w-4 h-4 shrink-0" />
                <span>Đây là tài khoản đang đăng nhập của bạn</span>
              </div>
            )}

            {/* Thông tin cố định khác */}
            <div className="w-full mt-6 pt-6 border-t border-slate-800/80 space-y-3 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  Mật khẩu:
                </span>
                <span className="text-slate-400 italic">Được bảo mật</span>
              </div>

              {userData?.GioiTinh && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Giới tính:</span>
                  <span className="text-slate-200 font-medium">{userData.GioiTinh}</span>
                </div>
              )}

              {userData?.NgaySinh && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Ngày sinh:</span>
                  <span className="text-slate-200 font-medium">
                    {new Date(userData.NgaySinh).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CỘT BÊN PHẢI: Form Chỉnh sửa thông tin & Vai trò (2 Cột) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card 1: Thông tin cá nhân & Liên hệ */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-sky-400" />
                Thông tin cá nhân & Liên hệ
              </h2>
              <span className="text-xs text-sky-400/80 bg-sky-500/10 px-2.5 py-1 rounded-lg font-medium border border-sky-500/20">
                Bắt buộc
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Họ và tên / Tài khoản */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tài khoản / Họ và tên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={taiKhoan}
                    onChange={(e) => {
                      setTaiKhoan(e.target.value);
                      if (errors.taiKhoan) setErrors((prev) => ({ ...prev, taiKhoan: null }));
                    }}
                    placeholder="Nhập tên tài khoản..."
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border ${
                      errors.taiKhoan
                        ? 'border-rose-500/80 focus:ring-rose-500/20'
                        : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                    } rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 transition-all`}
                  />
                </div>
                {errors.taiKhoan && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.taiKhoan}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Địa chỉ Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    }}
                    placeholder="user@example.com"
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border ${
                      errors.email
                        ? 'border-rose-500/80 focus:ring-rose-500/20'
                        : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                    } rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 transition-all`}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              {/* Số điện thoại chuẩn Việt Nam */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Số điện thoại (Định dạng VN)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={soDienThoai}
                    onChange={(e) => {
                      setSoDienThoai(e.target.value);
                      if (errors.soDienThoai) setErrors((prev) => ({ ...prev, soDienThoai: null }));
                    }}
                    placeholder="0987654321 hoặc +84987654321"
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border ${
                      errors.soDienThoai
                        ? 'border-rose-500/80 focus:ring-rose-500/20'
                        : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                    } rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 transition-all`}
                  />
                </div>
                {errors.soDienThoai ? (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.soDienThoai}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">Chấp nhận đầu số 03, 05, 07, 08, 09 hoặc +84</p>
                )}
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Địa chỉ liên hệ
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={diaChi}
                    onChange={(e) => setDiaChi(e.target.value)}
                    placeholder="123 Nguyễn Trãi, Thanh Xuân, Hà Nội"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Phân quyền Vai trò hệ thống */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-400" />
                Phân quyền truy cập hệ thống
              </h2>
              <span className="text-xs text-violet-400/80 bg-violet-500/10 px-2.5 py-1 rounded-lg font-medium border border-violet-500/20">
                Vai trò
              </span>
            </div>

            {/* Cảnh báo tự thay đổi vai trò cá nhân */}
            {isSelf && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                <span>
                  <strong>Lưu ý bảo mật:</strong> Bạn không thể tự thay đổi vai trò Quản trị viên của chính mình!
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Quản trị viên */}
              <label
                className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all ${
                  isSelf
                    ? 'opacity-70 cursor-not-allowed bg-slate-950 border-slate-800 text-slate-400'
                    : Number(maVaiTro) === 1
                    ? 'bg-violet-500/15 border-violet-500/50 text-violet-200 cursor-pointer shadow-lg shadow-violet-500/5'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="MaVaiTro"
                  disabled={isSelf}
                  checked={Number(maVaiTro) === 1}
                  onChange={() => !isSelf && setMaVaiTro(1)}
                  className="mt-1 text-violet-500 focus:ring-violet-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-bold text-slate-100">Quản trị viên (Admin)</span>
                  </div>
                  <p className="text-xs opacity-75 mt-1">
                    Toàn quyền quản trị Dashboard, sản phẩm, đơn hàng, người dùng và cài đặt.
                  </p>
                </div>
              </label>

              {/* Option 2: Khách hàng */}
              <label
                className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all ${
                  isSelf
                    ? 'opacity-50 cursor-not-allowed bg-slate-950 border-slate-800 text-slate-500'
                    : Number(maVaiTro) === 2
                    ? 'bg-sky-500/15 border-sky-500/50 text-sky-200 cursor-pointer shadow-lg shadow-sky-500/5'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="MaVaiTro"
                  disabled={isSelf}
                  checked={Number(maVaiTro) === 2}
                  onChange={() => !isSelf && setMaVaiTro(2)}
                  className="mt-1 text-sky-500 focus:ring-sky-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-sky-400" />
                    <span className="text-sm font-bold text-slate-100">Khách hàng (User)</span>
                  </div>
                  <p className="text-xs opacity-75 mt-1">
                    Tài khoản người dùng thông thường, mua hàng và xem lịch sử đơn hàng.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default UserEditPage;
