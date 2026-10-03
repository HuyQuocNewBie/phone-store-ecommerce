import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  Loader2, Eye, EyeOff, AlertCircle,
  Smartphone, ShieldCheck, BarChart3,
  Package, ShoppingCart, Users, Lock,
  Store, ArrowLeft, Sparkles, CheckCircle2,
} from 'lucide-react';

// ─── Feature list for branding panel ─────────────────────────────────────────
const FEATURES = [
  { icon: Sparkles,     label: 'Trải nghiệm mua sắm thiết bị chính hãng 100%' },
  { icon: Package,      label: 'Theo dõi hành trình đơn hàng theo thời gian thực' },
  { icon: ShoppingCart, label: 'Tích điểm thành viên & săn voucher độc quyền' },
  { icon: ShieldCheck,  label: 'Bảo hành điện tử toàn quốc chuẩn quốc tế' },
];

// ─── LoginPage (Evondev UI/UX Premium - Light Theme) ──────────────────────────
const LoginPage = () => {
  const { login, loading, error, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm]         = useState({ TaiKhoan: '', MatKhau: '' });
  const [showPw, setShowPw]     = useState(false);
  const [localErr, setLocalErr] = useState(null);
  const [successBanner, setSuccessBanner] = useState('');
  const [touched, setTouched]   = useState({ TaiKhoan: false, MatKhau: false });
  const [shake, setShake]       = useState(false);

  // Điền sẵn tài khoản khi chuyển hướng từ màn Đăng ký / Xác thực OTP
  useEffect(() => {
    if (location.state?.registeredAccount) {
      setForm((prev) => ({ ...prev, TaiKhoan: location.state.registeredAccount }));
      if (location.state?.message) {
        setSuccessBanner(location.state.message);
      }
    }
  }, [location.state]);

  // Rate Limiting States
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Kiểm tra trạng thái khóa từ localStorage khi mount & định kỳ
  useEffect(() => {
    const checkLockout = () => {
      const storedUntil = localStorage.getItem('login_lockout_until');
      if (storedUntil) {
        const until = parseInt(storedUntil, 10);
        const now = Date.now();
        if (now < until) {
          setIsLocked(true);
          setLockoutRemaining(Math.ceil((until - now) / 1000));
        } else {
          setIsLocked(false);
          setLockoutRemaining(0);
          localStorage.removeItem('login_lockout_until');
          localStorage.removeItem('login_failed_attempts');
        }
      } else {
        setIsLocked(false);
        setLockoutRemaining(0);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  // Redirect nếu đã đăng nhập
  if (isAuthenticated) {
    const dest = user?.MaVaiTro === 1 ? '/admin/dashboard' : '/';
    return <Navigate to={dest} replace />;
  }

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (localErr) setLocalErr(null);
  };

  const handleBlur = (e) =>
    setTouched((p) => ({ ...p, [e.target.name]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLocked) {
      const minutes = Math.floor(lockoutRemaining / 60);
      const seconds = lockoutRemaining % 60;
      const msg = `Tài khoản tạm thời bị khóa. Vui lòng thử lại sau ${minutes} phút ${seconds} giây.`;
      setLocalErr(msg);
      toast.error(msg, { id: 'login-toast' });
      return;
    }

    setTouched({ TaiKhoan: true, MatKhau: true });
    setLocalErr(null);

    if (!form.TaiKhoan.trim() || !form.MatKhau.trim()) {
      const errMsg = 'Vui lòng nhập đầy đủ tài khoản và mật khẩu.';
      setLocalErr(errMsg);
      toast.error(errMsg, { id: 'login-toast' });
      return;
    }

    const result = await login(form.TaiKhoan.trim(), form.MatKhau);

    if (result.success) {
      localStorage.removeItem('login_failed_attempts');
      localStorage.removeItem('login_lockout_until');

      const intentRaw = sessionStorage.getItem('cart_action_intent');
      if (intentRaw) {
        try {
          const intent = JSON.parse(intentRaw);
          sessionStorage.removeItem('cart_action_intent');

          await api.post('/cart/items', {
            MaSanPham: intent.product_id,
            SoLuong: intent.quantity || 1,
          });

          if (intent.action_type === 'buy_now') {
            toast.success('Đăng nhập thành công! Đang chuyển đến thanh toán...', { id: 'login-toast' });
            navigate('/checkout', { replace: true });
          } else {
            toast.success(
              `Đăng nhập thành công! Đã thêm "${intent.product_name || 'sản phẩm'}" vào giỏ hàng.`,
              { id: 'login-toast', duration: 4000 }
            );
            navigate(intent.redirect_back || '/', { replace: true });
          }
        } catch {
          toast.success('Đăng nhập thành công!', { id: 'login-toast' });
          const dest = result.user?.MaVaiTro === 1 ? '/admin/dashboard' : '/';
          navigate(dest, { replace: true });
        }
      } else {
        toast.success('Đăng nhập thành công! Đang chuyển hướng...', { id: 'login-toast' });
        const dest = result.user?.MaVaiTro === 1 ? '/admin/dashboard' : '/';
        navigate(dest, { replace: true });
      }
    } else {
      const storedAttempts = parseInt(localStorage.getItem('login_failed_attempts') || '0', 10);
      const newAttempts = storedAttempts + 1;

      if (newAttempts >= 3) {
        const lockoutTime = Date.now() + 5 * 60 * 1000;
        localStorage.setItem('login_lockout_until', lockoutTime.toString());
        localStorage.removeItem('login_failed_attempts');
        setIsLocked(true);
        setLockoutRemaining(300);

        const lockMsg = 'Đã nhập sai 3 lần liên tiếp. Nút đăng nhập đã bị khóa 5 phút.';
        setLocalErr(lockMsg);
        toast.error(lockMsg, { id: 'login-toast', duration: 5000 });
      } else {
        localStorage.setItem('login_failed_attempts', newAttempts.toString());
        const errMsg = `${result.message || 'Tài khoản hoặc mật khẩu không chính xác'} (Nhập sai ${newAttempts}/3 lần)`;
        setLocalErr(errMsg);
        toast.error(errMsg, { id: 'login-toast' });
      }

      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const formatLockTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const displayError   = localErr || error;
  const taiKhoanBad    = touched.TaiKhoan && !form.TaiKhoan.trim();
  const matKhauBad     = touched.MatKhau  && !form.MatKhau.trim();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-10 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">

      {/* ── Ambient subtle background blobs ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-100/40 blur-[120px]" />
      </div>

      {/* ── Main Card (Evondev Light Premium) ── */}
      <div className="relative z-10 w-full max-w-4xl flex rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-slate-100 bg-white">

        {/* ── Left branding panel ── */}
        <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 p-10 border-r border-slate-100">
          <div>
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-3 group mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  SmartZone
                </span>
                <span className="text-[10px] text-blue-600 font-bold tracking-widest uppercase -mt-0.5">
                  Store Premium
                </span>
              </div>
            </Link>

            <h1 className="text-2xl font-bold text-slate-900 mb-2 leading-snug tracking-tight">
              Đăng nhập tài khoản<br />
              <span className="text-blue-600">
                Trải nghiệm đỉnh cao
              </span>
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Hệ thống bán lẻ thiết bị công nghệ chính hãng hàng đầu với dịch vụ tận tâm và hậu mãi uy tín.
            </p>

            {/* Features */}
            <div className="space-y-3.5">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center flex-shrink-0 group-hover:border-blue-300 group-hover:bg-blue-50 transition-colors duration-200">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-8 border-t border-slate-200/60">
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Bảo mật SSL 256-bit</span>
            </div>
            <span>Mã hóa tài khoản</span>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex-1 bg-white p-8 sm:p-12 flex flex-col justify-center">

          {/* Mobile brand header */}
          <div className="flex items-center justify-between lg:hidden mb-6 pb-4 border-b border-slate-100">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Store className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-slate-900">
                SmartZone
              </span>
            </Link>

            <Link
              to="/"
              className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Đăng nhập</h2>
            <p className="text-slate-500 text-sm mt-1">
              Nhập thông tin tài khoản để truy cập hệ thống SmartZone
            </p>
          </div>

          {/* ── Success Banner ── */}
          {successBanner && (
            <div
              role="alert"
              className="flex items-start gap-3 px-4 py-3 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"
            >
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <span>{successBanner}</span>
            </div>
          )}

          {/* ── Error Banner ── */}
          {displayError && (
            <div
              role="alert"
              className="flex items-start gap-3 px-4 py-3 mb-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          {/* ── Form ── */}
          <form
            id="login-form"
            onSubmit={handleSubmit}
            noValidate
            className={shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}
          >
            <div className="space-y-4">

              {/* Tài Khoản */}
              <div>
                <label
                  htmlFor="input-taikhoan"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Tên tài khoản hoặc Email <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-taikhoan"
                  name="TaiKhoan"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={form.TaiKhoan}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Nhập tên tài khoản hoặc email..."
                  disabled={loading || isLocked}
                  required
                  className={`w-full px-4 py-3 rounded-xl bg-slate-50 border text-slate-900 placeholder-slate-400 text-sm
                    focus:bg-white focus:outline-none focus:ring-4 transition-all duration-200
                    ${taiKhoanBad
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                {taiKhoanBad && (
                  <p className="mt-1.5 text-xs text-rose-500 font-medium">Vui lòng nhập tài khoản</p>
                )}
              </div>

              {/* Mật Khẩu */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="input-matkhau"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="input-matkhau"
                    name="MatKhau"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.MatKhau}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Nhập mật khẩu..."
                    disabled={loading || isLocked}
                    required
                    className={`w-full px-4 py-3 pr-12 rounded-xl bg-slate-50 border text-slate-900 placeholder-slate-400 text-sm
                      focus:bg-white focus:outline-none focus:ring-4 transition-all duration-200
                      ${matKhauBad
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                        : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  <button
                    type="button"
                    id="btn-toggle-password"
                    onClick={() => setShowPw((v) => !v)}
                    tabIndex={-1}
                    disabled={loading || isLocked}
                    aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {matKhauBad && (
                  <p className="mt-1.5 text-xs text-rose-500 font-medium">Vui lòng nhập mật khẩu</p>
                )}
              </div>

              {/* Submit */}
              <button
                id="btn-login"
                type="submit"
                disabled={loading || isLocked}
                className={`w-full py-3.5 rounded-xl font-bold text-white text-sm
                  transition-all duration-200 shadow-lg focus:outline-none focus:ring-4
                  ${
                    isLocked
                      ? 'bg-slate-200 border border-rose-300 text-rose-500 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-500/25 hover:shadow-blue-500/40 focus:ring-blue-100'
                  }
                  disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isLocked ? (
                  <span className="flex items-center justify-center gap-2 text-rose-600 font-medium">
                    <Lock size={17} />
                    Nút đã bị khóa ({formatLockTime(lockoutRemaining)})
                  </span>
                ) : loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={17} className="animate-spin" />
                    Đang đăng nhập...
                  </span>
                ) : (
                  'Đăng nhập'
                )}
              </button>

              {/* ── Link điều hướng sang trang Đăng ký ── */}
              <div className="pt-3 text-center text-xs text-slate-500">
                <span>Chưa có tài khoản? </span>
                <Link
                  to="/register"
                  className="font-bold text-blue-600 hover:text-blue-700 transition-colors underline underline-offset-4"
                >
                  Đăng ký ngay
                </Link>
              </div>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link
              to="/"
              className="text-xs text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại trang chủ SmartZone</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
