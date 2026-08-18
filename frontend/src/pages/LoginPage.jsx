import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Loader2, Eye, EyeOff, AlertCircle,
  Smartphone, ShieldCheck, BarChart3,
  Package, ShoppingCart, Users,
} from 'lucide-react';

// ─── Feature list for branding panel ─────────────────────────────────────────
const FEATURES = [
  { icon: BarChart3,    label: 'Dashboard thời gian thực' },
  { icon: Package,      label: 'Quản lý sản phẩm & kho hàng' },
  { icon: ShoppingCart, label: 'Theo dõi & xử lý đơn hàng' },
  { icon: Users,        label: 'Quản lý khách hàng' },
];

// ─── LoginPage ────────────────────────────────────────────────────────────────
const LoginPage = () => {
  const { login, loading, error, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]         = useState({ TaiKhoan: '', MatKhau: '' });
  const [showPw, setShowPw]     = useState(false);
  const [localErr, setLocalErr] = useState(null);
  const [touched, setTouched]   = useState({ TaiKhoan: false, MatKhau: false });
  const [shake, setShake]       = useState(false);

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
    setTouched({ TaiKhoan: true, MatKhau: true });
    setLocalErr(null);

    if (!form.TaiKhoan.trim() || !form.MatKhau.trim()) {
      setLocalErr('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
      return;
    }

    const result = await login(form.TaiKhoan.trim(), form.MatKhau);

    if (result.success) {
      const dest = result.user?.MaVaiTro === 1 ? '/admin/dashboard' : '/';
      navigate(dest, { replace: true });
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const displayError   = localErr || error;
  const taiKhoanBad    = touched.TaiKhoan && !form.TaiKhoan.trim();
  const matKhauBad     = touched.MatKhau  && !form.MatKhau.trim();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10 relative overflow-hidden">

      {/* ── Ambient background orbs ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-emerald-500/5 blur-[160px]" />
      </div>

      {/* ── Main card ── */}
      <div className="relative z-10 w-full max-w-4xl flex rounded-3xl overflow-hidden shadow-2xl shadow-black/60 border border-slate-800/80">

        {/* ── Left branding panel ── */}
        <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 border-r border-slate-700/50">
          <div>
            {/* Logo */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/25 mb-8">
              <Smartphone className="w-7 h-7 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-slate-100 mb-2 leading-snug">
              Phone Store<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-400">
                Admin System
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-10">
              Hệ thống quản trị thương mại điện tử — Quản lý toàn bộ cửa hàng từ một nơi duy nhất.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-slate-700/60 border border-slate-600/40 flex items-center justify-center flex-shrink-0 group-hover:border-sky-500/50 transition-colors duration-200">
                    <Icon className="w-4 h-4 text-sky-400" />
                  </div>
                  <span className="text-sm text-slate-300">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-10">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Bảo mật SSL · Mã hóa end-to-end</span>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex-1 bg-slate-900/80 backdrop-blur-xl p-10 flex flex-col justify-center">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-100">Phone Store Admin</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-100 mb-1">Đăng nhập</h2>
          <p className="text-slate-400 text-sm mb-8">
            Nhập thông tin tài khoản để truy cập hệ thống
          </p>

          {/* ── Error Banner ── */}
          {displayError && (
            <div
              role="alert"
              className="flex items-start gap-3 px-4 py-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
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
            <div className="space-y-5">

              {/* Tài Khoản */}
              <div>
                <label
                  htmlFor="input-taikhoan"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Tài khoản
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
                  placeholder="Tên tài khoản hoặc email..."
                  disabled={loading}
                  required
                  className={`w-full px-4 py-3 rounded-xl bg-slate-800/60 border text-slate-100 placeholder-slate-500
                    focus:outline-none focus:ring-2 transition-all duration-200
                    ${taiKhoanBad
                      ? 'border-red-500/60 focus:ring-red-500/30 focus:border-red-500'
                      : 'border-slate-700 focus:ring-sky-500/30 focus:border-sky-500'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                {taiKhoanBad && (
                  <p className="mt-1.5 text-xs text-red-400">Vui lòng nhập tài khoản</p>
                )}
              </div>

              {/* Mật Khẩu */}
              <div>
                <label
                  htmlFor="input-matkhau"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Mật khẩu
                </label>
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
                    disabled={loading}
                    required
                    className={`w-full px-4 py-3 pr-12 rounded-xl bg-slate-800/60 border text-slate-100 placeholder-slate-500
                      focus:outline-none focus:ring-2 transition-all duration-200
                      ${matKhauBad
                        ? 'border-red-500/60 focus:ring-red-500/30 focus:border-red-500'
                        : 'border-slate-700 focus:ring-sky-500/30 focus:border-sky-500'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  <button
                    type="button"
                    id="btn-toggle-password"
                    onClick={() => setShowPw((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {matKhauBad && (
                  <p className="mt-1.5 text-xs text-red-400">Vui lòng nhập mật khẩu</p>
                )}
              </div>

              {/* Submit */}
              <button
                id="btn-login"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm
                  bg-gradient-to-r from-sky-500 to-violet-600
                  hover:from-sky-400 hover:to-violet-500
                  active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  shadow-lg shadow-sky-500/20
                  focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={17} className="animate-spin" />
                    Đang đăng nhập...
                  </span>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} Phone Store E-Commerce. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
