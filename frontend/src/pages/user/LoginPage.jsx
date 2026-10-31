import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import { Loader2, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LcWRQkuAAAAAHATGbDWPmg2432V6GA8uFLpatuu';

/**
 * LoginPageContent – SmartZone Ecommerce
 * Refactored từ Stitch AI HTML Design System:
 * - Cột trái: VIP Member Privileges, công nghệ flagship, danh sách 4 đặc quyền thành viên
 * - Cột phải: Form đăng nhập chuẩn UX, SSO (Google + Zalo), bảo mật SSL 256-bit + 2FA
 */
const LoginPageContent = () => {
  const { login, loginWithGoogle, loginWithZalo, setToken, setUser, loading, error, isAuthenticated, user } = useAuth();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Form State ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ TaiKhoan: '', MatKhau: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [localErr, setLocalErr] = useState(null);
  const [successBanner, setSuccessBanner] = useState('');
  const [touched, setTouched] = useState({ TaiKhoan: false, MatKhau: false });
  const [shake, setShake] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Rate Limiting State (Khóa sau 5 lần sai liên tiếp, đếm ngược 60s) ───────
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isZaloLoading, setIsZaloLoading] = useState(false);

  // ── Google OAuth Login Hook ─────────────────────────────────────────────────
  const handleGoogleLogin = useGoogleLogin({
    scope: 'openid profile email',
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      try {
        let userData;
        if (typeof loginWithGoogle === 'function') {
          const res = await loginWithGoogle(tokenResponse.access_token);
          if (!res.success) {
            toast.error(res.message || 'Đăng nhập Google thất bại.', { id: 'login-toast' });
            return;
          }
          userData = res.user;
        } else {
          const response = await api.post('/auth/google', {
            accessToken: tokenResponse.access_token,
            access_token: tokenResponse.access_token,
          });
          const data = response.data.data;
          userData = data.user;
          const jwtToken = data.token || data.accessToken;
          if (setToken) setToken(jwtToken);
          if (setUser) setUser(userData);
          localStorage.setItem('token', jwtToken);
          localStorage.setItem('accessToken', jwtToken);
          localStorage.setItem('user', JSON.stringify(userData));
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
        }

      toast.success(
        userData?.NgaySinh
          ? `Đăng nhập Google thành công! Chào mừng ${userData?.TaiKhoan || 'bạn'}.`
          : `Đăng nhập Google thành công! Chào mừng ${userData?.TaiKhoan || 'bạn'}. Bạn có thể cập nhật thêm ngày sinh trong trang Cá nhân.`,
        { id: 'login-toast' }
      );

        // Khôi phục hành vi mua ngay / thêm vào giỏ hàng nếu có
        const intentRaw = sessionStorage.getItem('cart_action_intent');
        if (intentRaw) {
          try {
            const intent = JSON.parse(intentRaw);
            sessionStorage.removeItem('cart_action_intent');

            await api.post('/cart/items', {
              MaSanPham: intent.product_id || intent.MaSanPham,
              SoLuong: intent.quantity || intent.SoLuong || 1,
              DungLuong: intent.DungLuong || intent.variant?.DungLuong || null,
              MauSac: intent.MauSac || intent.variant?.MauSac || null,
            });

            if (intent.action_type === 'buy_now') {
              toast.success('Đang chuyển đến trang thanh toán...', { id: 'login-toast' });
              navigate('/checkout', { replace: true });
              return;
            } else {
              toast.success(
                `Đã thêm "${intent.product_name || 'sản phẩm'}" vào giỏ hàng.`,
                { id: 'login-toast', duration: 4000 }
              );
              navigate(intent.redirect_back || '/', { replace: true });
              return;
            }
          } catch {
            // fallback nếu thêm giỏ hàng lỗi
          }
        }

        const dest = userData?.MaVaiTro === 1 ? '/admin/dashboard' : '/';
        navigate(dest, { replace: true });
      } catch (err) {
        console.error('Lỗi khi đăng nhập Google:', err);
        const errMsg =
          err.response?.data?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.';
        toast.error(errMsg, { id: 'login-toast' });
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error('Lỗi Google OAuth Popup:', errorResponse);
      toast.error('Đăng nhập Google không thành công hoặc cửa sổ popup đã bị đóng.', {
        id: 'login-toast',
      });
    },
  });

  // Điền sẵn số điện thoại / email khi điều hướng từ trang Đăng ký thành công
  useEffect(() => {
    if (location.state?.registeredAccount) {
      setForm((prev) => ({ ...prev, TaiKhoan: location.state.registeredAccount }));
      if (location.state?.message) {
        setSuccessBanner(location.state.message);
      }
    }
  }, [location.state]);

  // Kiểm tra thời gian khóa tạm thời
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

  // Tự động chuyển hướng nếu người dùng đã đăng nhập trước đó
  if (isAuthenticated) {
    const dest = user?.MaVaiTro === 1 ? '/admin/dashboard' : '/';
    return <Navigate to={dest} replace />;
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (localErr) setLocalErr(null);
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLocked) {
      const msg =
        lockoutRemaining <= 60
          ? `Hệ thống tạm khóa do nhập sai nhiều lần. Vui lòng chờ đếm ngược ${lockoutRemaining}s!`
          : `Tài khoản tạm thời bị khóa. Vui lòng thử lại sau ${Math.floor(lockoutRemaining / 60)} phút ${lockoutRemaining % 60} giây.`;
      setLocalErr(msg);
      toast.error(msg, { id: 'login-toast' });
      return;
    }

    setTouched({ TaiKhoan: true, MatKhau: true });
    setLocalErr(null);

    if (!form.TaiKhoan.trim() || !form.MatKhau.trim()) {
      const errMsg = 'Vui lòng nhập đầy đủ số điện thoại/email và mật khẩu.';
      setLocalErr(errMsg);
      toast.error(errMsg, { id: 'login-toast' });
      return;
    }

    setIsSubmitting(true);

    // Kích hoạt executeRecaptcha('login') để lấy recaptchaToken
    let recaptchaToken = '';
    if (executeRecaptcha) {
      try {
        recaptchaToken = await executeRecaptcha('login');
      } catch (recaptchaErr) {
        console.error('Lỗi khi thực thi executeRecaptcha:', recaptchaErr);
      }
    } else if (window.grecaptcha?.execute) {
      try {
        recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'login' });
      } catch (recaptchaErr) {
        console.error('Lỗi khi thực thi window.grecaptcha:', recaptchaErr);
      }
    }

    const result = await login(form.TaiKhoan.trim(), form.MatKhau, recaptchaToken);
    setIsSubmitting(false);

    if (result.success) {
      localStorage.removeItem('login_failed_attempts');
      localStorage.removeItem('login_lockout_until');

      // Khôi phục hành vi mua ngay / thêm vào giỏ hàng nếu có
      const intentRaw = sessionStorage.getItem('cart_action_intent');
      if (intentRaw) {
        try {
          const intent = JSON.parse(intentRaw);
          sessionStorage.removeItem('cart_action_intent');

          await api.post('/cart/items', {
            MaSanPham: intent.product_id || intent.MaSanPham,
            SoLuong: intent.quantity || intent.SoLuong || 1,
            DungLuong: intent.DungLuong || intent.variant?.DungLuong || null,
            MauSac: intent.MauSac || intent.variant?.MauSac || null,
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
      const isRateLimitResponse = result.status === 429;
      const storedAttempts = parseInt(localStorage.getItem('login_failed_attempts') || '0', 10);
      const newAttempts = storedAttempts + 1;

      if (newAttempts >= 5 || isRateLimitResponse) {
        const lockoutSeconds = 60;
        const lockoutTime = Date.now() + lockoutSeconds * 1000;
        localStorage.setItem('login_lockout_until', lockoutTime.toString());
        localStorage.removeItem('login_failed_attempts');
        setIsLocked(true);
        setLockoutRemaining(lockoutSeconds);

        const lockMsg = `Bạn đã thử đăng nhập sai 5 lần. Vui lòng chờ 60s trước khi thử lại!`;
        setLocalErr(lockMsg);
        toast.error(lockMsg, { id: 'login-toast', duration: 5000 });
      } else {
        localStorage.setItem('login_failed_attempts', newAttempts.toString());
        const errMsg = `${result.message || 'Tài khoản hoặc mật khẩu không chính xác'} (Nhập sai ${newAttempts}/5 lần)`;
        setLocalErr(errMsg);
        toast.error(errMsg, { id: 'login-toast' });
      }

      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  // ── Zalo SDK & OAuth Initialization ─────────────────────────────────────────
  useEffect(() => {
    if (!window.Zalo) {
      const script = document.createElement('script');
      script.src = 'https://sp.zalo.me/plugins/sdk.js';
      script.async = true;
      script.onload = () => {
        try {
          if (window.Zalo && typeof window.Zalo.init === 'function') {
            window.Zalo.init({
              version: '2.0',
              appId: import.meta.env.VITE_ZALO_APP_ID || '4287436940154377836',
              redirectUrl: `${window.location.origin}/auth/zalo/callback`,
            });
          }
        } catch (e) {
          console.warn('Lỗi khi khởi tạo Zalo JS SDK:', e);
        }
      };
      document.body.appendChild(script);
    }
  }, []);

  // Helper sinh mã code_verifier và code_challenge cho chuẩn bảo mật PKCE
  const generatePKCE = async () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(43);
    window.crypto.getRandomValues(array);
    let verifier = '';
    for (let i = 0; i < array.length; i++) {
      verifier += charset[array[i] % charset.length];
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return { verifier, challenge };
  };

  // Mở Popup hoặc chuyển hướng đăng nhập qua Zalo OAuth
  const handleZaloLogin = async () => {
    setIsZaloLoading(true);
    try {
      const appId = import.meta.env.VITE_ZALO_APP_ID || '4287436940154377836';
      const redirectUri = `${window.location.origin}/auth/zalo/callback`;
      const state = Math.random().toString(36).substring(2, 15);

      const { verifier, challenge } = await generatePKCE();
      sessionStorage.setItem('zalo_code_verifier', verifier);
      sessionStorage.setItem('zalo_auth_state', state);

      const zaloAuthUrl = `https://oauth.zaloapp.com/v4/permission?app_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&code_challenge=${challenge}&state=${state}`;

      // Kích thước chuẩn cho popup mạng xã hội
      const width = 500;
      const height = 650;
      const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
      const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

      const popup = window.open(
        zaloAuthUrl,
        'zalo_login_popup',
        `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,status=no,resizable=yes,scrollbars=yes`
      );

      // Nếu trình duyệt chặn popup hoặc đang ở môi trường di động
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = zaloAuthUrl;
        return;
      }

      // Lắng nghe kết quả từ ZaloCallbackPage gửi về qua postMessage
      const handlePopupMessage = (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === 'ZALO_AUTH_SUCCESS') {
          window.removeEventListener('message', handlePopupMessage);
          clearInterval(checkPopupClosed);
          setIsZaloLoading(false);

          const userData = event.data.user;
          const userToken = event.data.token;
          if (userData && userToken && typeof login === 'function') {
            login(userData, userToken);
          }
          if (userToken) {
            localStorage.setItem('token', userToken);
            localStorage.setItem('accessToken', userToken);
          }
          if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
          }

          toast.success(
            userData?.NgaySinh
              ? `Đăng nhập Zalo thành công! Chào mừng ${userData?.TaiKhoan || 'bạn'}.`
              : `Đăng nhập Zalo thành công! Chào mừng ${userData?.TaiKhoan || 'bạn'}. Bạn có thể cập nhật thêm ngày sinh trong trang Cá nhân.`,
            { id: 'login-toast' }
          );

          const target = event.data.redirectTarget || (userData?.MaVaiTro === 1 ? '/admin/dashboard' : '/');
          navigate(target, { replace: true });
        } else if (event.data?.type === 'ZALO_AUTH_ERROR') {
          window.removeEventListener('message', handlePopupMessage);
          clearInterval(checkPopupClosed);
          setIsZaloLoading(false);
          toast.error(event.data.message || 'Đăng nhập Zalo không thành công.', {
            id: 'login-toast',
          });
        }
      };

      window.addEventListener('message', handlePopupMessage);

      // Tự động giải phóng loading nếu người dùng đóng cửa sổ popup
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handlePopupMessage);
          setIsZaloLoading(false);
        }
      }, 700);
    } catch (err) {
      console.error('Lỗi khi mở đăng nhập Zalo:', err);
      setIsZaloLoading(false);
      toast.error('Không thể kết nối cổng đăng nhập Zalo. Vui lòng thử lại.', {
        id: 'login-toast',
      });
    }
  };

  const formatLockTime = (totalSeconds) => {
    if (totalSeconds <= 60) {
      return `${totalSeconds}s`;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const displayError = localErr || error;
  const taiKhoanBad = touched.TaiKhoan && !form.TaiKhoan.trim();
  const matKhauBad  = touched.MatKhau  && !form.MatKhau.trim();

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased flex flex-col justify-between">
      <Navbar />

      <main className="w-full bg-surface flex-grow">
        <div className="flex flex-col w-full">
          <div className="relative w-full overflow-hidden py-unit-lg lg:py-unit-2xl">
            {/* Ambient geometric glow overlays */}
            <div className="absolute -top-32 -left-24 w-96 h-96 bg-primary-fixed-dim/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-secondary-fixed/40 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-container-max mx-auto px-gutter-desktop">
            {/* Breadcrumb indicator */}
            <div className="flex items-center gap-unit-xs mb-unit-lg text-on-surface-variant font-body-sm text-body-sm">
              <Link
                className="hover:text-primary transition-colors flex items-center gap-unit-2xs"
                to="/"
              >
                <span className="material-symbols-outlined text-sm leading-none">home</span>
                Trang chủ
              </Link>
              <span className="text-outline">/</span>
              <span className="text-on-surface font-medium">Đăng nhập tài khoản</span>
            </div>

            {/* Main Login Container Card */}
            <div
              className={`w-full max-w-5xl mx-auto bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-transform ${
                shake ? 'animate-[shake_0.5s_ease-in-out]' : ''
              }`}
            >
              {/* ── Cột Trái: SmartZone VIP Member Privileges & Showcase ── */}
              <div className="relative lg:col-span-5 bg-gradient-to-br from-primary via-primary-container to-secondary p-unit-xl lg:p-unit-2xl flex flex-col justify-between text-on-primary overflow-hidden">
                {/* Ambient geometric glow overlays */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-surface-container-lowest/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-10 -left-12 w-48 h-48 bg-secondary-container/20 rounded-full blur-xl pointer-events-none" />

                {/* Brand & Tagline */}
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-unit-xs px-unit-sm py-unit-2xs rounded-full bg-surface-container-lowest/15 backdrop-blur-md mb-unit-lg">
                    <span className="material-symbols-outlined text-secondary-fixed text-sm">stars</span>
                    <span className="font-label-spec text-label-spec uppercase tracking-wider text-secondary-fixed">
                      Hệ Sinh Thái SmartZone ID
                    </span>
                  </div>
                  <h2 className="font-headline-md text-headline-md font-bold tracking-tight text-on-primary mb-unit-xs">
                    Đặc Quyền Thành Viên
                  </h2>
                  <p className="font-body-md text-body-md text-on-primary-container leading-relaxed">
                    Trải nghiệm mua sắm công nghệ chuẩn quốc tế cùng hệ tiện ích VIP dành riêng cho bạn.
                  </p>
                </div>

                {/* Technology Showcase Imagery */}
                <div className="relative z-10 my-unit-xl">
                  <div className="relative rounded-xl overflow-hidden shadow-2xl bg-surface-container-highest/20 p-unit-xs backdrop-blur-sm">
                    <img
                      className="w-full h-44 object-cover rounded-lg"
                      alt="Editorial close-up of modern flagship titanium smartphones hovering gracefully over dark brushed steel"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA34pEm5SqPGVE108aeZTY8Njoz-y7_9JCjVdcM7UwVUoYMS7e5yZSjAs-8EeRTvlGRqVQoDEX50DspTokY4JbGPh6PwctX-2XysKkVXdY6dF8yAvKIgk719GyZIbps-zDtKIhlzeTTMYdecqM1V1FMofCsQ14N472uB2BthLWic7ilGMHY53Tgzgj-NjHl63iegRYbvWs8otGh11XtmviYavW4-fnAdDsxfhyvQIxM9Gs20gvFUIMF"
                    />
                    <div className="absolute bottom-unit-sm left-unit-sm right-unit-sm bg-inverse-surface/85 backdrop-blur-md px-unit-sm py-unit-2xs rounded-lg flex items-center justify-between text-inverse-on-surface">
                      <div className="flex items-center gap-unit-2xs">
                        <span className="material-symbols-outlined text-secondary-container text-base">verified_user</span>
                        <span className="font-label-spec text-label-spec uppercase tracking-wider">
                          Bảo hành chính hãng 100%
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-secondary-fixed font-bold">VN/A Direct</span>
                    </div>
                  </div>
                </div>

                {/* Benefits List (4 ưu đãi thành viên) */}
                <div className="relative z-10 flex flex-col gap-unit-sm">
                  <div className="flex items-start gap-unit-sm">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-lowest/15 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-secondary-fixed text-base leading-none">
                        account_balance_wallet
                      </span>
                    </div>
                    <div>
                      <p className="font-body-md text-body-md font-semibold text-on-primary">
                        Tích lũy 2% giá trị mỗi đơn
                      </p>
                      <p className="font-body-sm text-body-sm text-on-primary-container">
                        Quy đổi ngay tiền mặt cho mọi giao dịch kế tiếp
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-unit-sm">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-lowest/15 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-secondary-fixed text-base leading-none">
                        published_with_changes
                      </span>
                    </div>
                    <div>
                      <p className="font-body-md text-body-md font-semibold text-on-primary">
                        Thu cũ đổi mới trợ giá 2.000.000đ
                      </p>
                      <p className="font-body-sm text-body-sm text-on-primary-container">
                        Định giá online 3 phút, thủ tục đơn giản tận nhà
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-unit-sm">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-lowest/15 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-secondary-fixed text-base leading-none">
                        credit_score
                      </span>
                    </div>
                    <div>
                      <p className="font-body-md text-body-md font-semibold text-on-primary">
                        Trả góp 0% duyệt 5 phút
                      </p>
                      <p className="font-body-sm text-body-sm text-on-primary-container">
                        Kỳ hạn linh hoạt qua 28 ngân hàng &amp; công ty tài chính
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-unit-sm">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-lowest/15 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-secondary-fixed text-base leading-none">
                        shield_with_heart
                      </span>
                    </div>
                    <div>
                      <p className="font-body-md text-body-md font-semibold text-on-primary">
                        Bảo hành VIP 1 đổi 1 trong 24 tháng
                      </p>
                      <p className="font-body-sm text-body-sm text-on-primary-container">
                        Đặc quyền cấp máy dùng thử khi chờ bảo hành
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom subtle note */}
                <div className="relative z-10 pt-unit-lg text-on-primary-container font-body-sm text-body-sm flex items-center justify-between">
                  <span>Áp dụng toàn quốc</span>
                  <span className="font-semibold text-on-primary">45+ Showroom</span>
                </div>
              </div>

              {/* ── Cột Phải: Interactive Login Form ── */}
              <div className="lg:col-span-7 p-unit-xl lg:p-unit-2xl flex flex-col justify-between">
                <div>
                  {/* Form Header (Đã xóa bỏ nhãn SmartZone Single Sign-On) */}
                  <div className="mb-unit-xl">
                    <h1 className="font-headline-md text-headline-md text-on-surface font-extrabold tracking-tight">
                      Đăng nhập tài khoản SmartZone
                    </h1>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-unit-2xs">
                      Chào mừng bạn quay trở lại với thế giới công nghệ chính hãng hàng đầu.
                    </p>
                  </div>

                  {/* Success Banner */}
                  {successBanner && (
                    <div
                      role="alert"
                      className="flex items-start gap-unit-xs px-unit-sm py-unit-xs mb-unit-lg rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-body-sm text-body-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                      <span>{successBanner}</span>
                    </div>
                  )}

                  {/* Error Banner */}
                  {displayError && (
                    <div
                      role="alert"
                      className="flex items-start gap-unit-xs px-unit-sm py-unit-xs mb-unit-lg rounded-xl bg-red-50 border border-red-200 text-red-600 font-body-sm text-body-sm"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                      <span>{displayError}</span>
                    </div>
                  )}

                  {/* Form Đăng nhập */}
                  <form
                    className="flex flex-col gap-unit-lg"
                    id="smartzone-login-form"
                    onSubmit={handleSubmit}
                    noValidate
                  >
                    {/* Ô nhập Số điện thoại / Email (Đã xóa bỏ dòng VD: 0988xxx hoặc user@gmail.com) */}
                    <div className="flex flex-col gap-unit-2xs">
                      <label
                        className="font-body-sm text-body-sm font-semibold text-on-surface"
                        htmlFor="identifier"
                      >
                        Số điện thoại hoặc Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-outline leading-none pointer-events-none">
                          contact_phone
                        </span>
                        <input
                          className={`w-full pl-11 pr-unit-md py-unit-sm bg-surface-container-low rounded-xl text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            taiKhoanBad
                              ? 'border border-red-500 focus:ring-red-200'
                              : 'focus:ring-primary'
                          }`}
                          id="identifier"
                          name="TaiKhoan"
                          placeholder="Nhập số điện thoại hoặc email của bạn"
                          type="text"
                          autoComplete="username"
                          autoFocus
                          value={form.TaiKhoan}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={loading || isSubmitting || isLocked}
                          required
                        />
                      </div>
                      {taiKhoanBad && (
                        <p className="text-xs text-red-500 font-medium mt-1">
                          Vui lòng nhập số điện thoại hoặc email
                        </p>
                      )}
                    </div>

                    {/* Ô nhập Mật khẩu + Nút ẩn/hiện mật khẩu */}
                    <div className="flex flex-col gap-unit-2xs">
                      <label
                        className="font-body-sm text-body-sm font-semibold text-on-surface"
                        htmlFor="password"
                      >
                        Mật khẩu tài khoản <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-outline leading-none pointer-events-none">
                          lock
                        </span>
                        <input
                          className={`w-full pl-11 pr-12 py-unit-sm bg-surface-container-low rounded-xl text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            matKhauBad
                              ? 'border border-red-500 focus:ring-red-200'
                              : 'focus:ring-primary'
                          }`}
                          id="password"
                          name="MatKhau"
                          placeholder="Nhập mật khẩu của bạn"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={form.MatKhau}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={loading || isSubmitting || isLocked}
                          required
                        />
                        <button
                          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          className="absolute right-3 p-1 text-outline hover:text-on-surface transition-colors flex items-center justify-center rounded-lg disabled:opacity-50"
                          id="toggle-password-btn"
                          onClick={() => setShowPassword((prev) => !prev)}
                          type="button"
                          tabIndex={-1}
                          disabled={loading || isSubmitting || isLocked}
                        >
                          <span className="material-symbols-outlined text-xl leading-none" id="password-toggle-icon">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      {matKhauBad && (
                        <p className="text-xs text-red-500 font-medium mt-1">
                          Vui lòng nhập mật khẩu
                        </p>
                      )}
                    </div>

                    {/* Checkbox Ghi nhớ & Quên mật khẩu */}
                    <div className="flex items-center justify-between font-body-sm text-body-sm">
                      <label className="flex items-center gap-unit-xs cursor-pointer select-none group">
                        <input
                          className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                          id="remember-device"
                          name="rememberMe"
                          type="checkbox"
                          checked={form.rememberMe}
                          onChange={handleChange}
                          disabled={loading || isSubmitting || isLocked}
                        />
                        <span className="text-on-surface-variant group-hover:text-on-surface transition-colors">
                          Ghi nhớ đăng nhập trên thiết bị này
                        </span>
                      </label>
                      <Link
                        className="font-semibold text-primary hover:underline hover:text-primary-container transition-colors"
                        to="/forgot-password"
                      >
                        Quên mật khẩu?
                      </Link>
                    </div>

                    {/* Nút Đăng nhập "ĐĂNG NHẬP NGAY" */}
                    <button
                      className={`w-full py-unit-sm px-unit-lg rounded-xl font-headline-sm text-headline-sm font-bold tracking-tight shadow-lg transition-all flex items-center justify-center gap-unit-xs text-center ${
                        isLocked
                          ? 'bg-slate-200 text-red-500 cursor-not-allowed shadow-none'
                          : 'bg-gradient-to-r from-primary to-primary-container text-on-primary hover:shadow-primary/30 hover:scale-[1.008] active:scale-[0.985]'
                      } disabled:opacity-75 disabled:cursor-not-allowed`}
                      id="submit-login-btn"
                      type="submit"
                      disabled={loading || isSubmitting || isLocked}
                    >
                      {isLocked ? (
                        <>
                          <Lock className="w-5 h-5" />
                          <span>Nút đã bị khóa ({formatLockTime(lockoutRemaining)})</span>
                        </>
                      ) : loading || isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Đang xác thực bảo mật...</span>
                        </>
                      ) : (
                        <>
                          <span>ĐĂNG NHẬP NGAY</span>
                          <span className="material-symbols-outlined text-xl leading-none">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Social SSO Logins Divider */}
                  <div className="relative my-unit-xl flex items-center justify-center">
                    <div className="w-full h-px bg-surface-container-high" />
                    <span className="absolute px-unit-md bg-surface-container-lowest font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                      Hoặc đăng nhập nhanh bằng
                    </span>
                  </div>

                  {/* Social SSO Buttons Grid (Ngang) */}
                  <div className="grid grid-cols-2 gap-unit-sm">
                    {/* Google SSO */}
                    <button
                      id="google-login-btn"
                      aria-label="Đăng nhập với Google"
                      title="Đăng nhập với Google"
                      className="flex items-center justify-center gap-unit-xs py-unit-xs px-unit-sm bg-white hover:bg-slate-50 text-slate-700 font-body-md text-body-md font-semibold rounded-xl border border-slate-300 shadow-sm transition-all hover:shadow hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed text-center"
                      onClick={() => handleGoogleLogin()}
                      disabled={isGoogleLoading || isZaloLoading || isSubmitting || loading}
                      type="button"
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                      ) : (
                        <svg aria-hidden="true" className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                            fill="#EA4335"
                          />
                        </svg>
                      )}
                      <span>{isGoogleLoading ? 'Đang kết nối...' : 'Google'}</span>
                    </button>

                    {/* Zalo SSO */}
                    <button
                      id="zalo-login-btn"
                      aria-label="Đăng nhập với Zalo"
                      title="Đăng nhập với Zalo"
                      className="flex items-center justify-center gap-unit-xs py-unit-xs px-unit-sm bg-[#0068FF] hover:bg-[#0058e0] active:bg-[#004ec9] text-white font-body-md text-body-md font-semibold rounded-xl border border-transparent shadow-sm transition-all hover:shadow hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed text-center"
                      onClick={handleZaloLogin}
                      disabled={isZaloLoading || isGoogleLoading || isSubmitting || loading}
                      type="button"
                    >
                      {isZaloLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white shrink-0" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0 shadow-sm">
                          <svg
                            role="img"
                            viewBox="0 0 24 24"
                            className="w-3.5 h-3.5 fill-[#0068FF]"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9453 0 1.0746.8697 1.9453 1.945 1.9453z" />
                          </svg>
                        </span>
                      )}
                      <span>{isZaloLoading ? 'Đang kết nối...' : 'Zalo'}</span>
                    </button>
                  </div>
                </div>

                {/* ── Bottom Meta & Security Badges ── */}
                <div className="pt-unit-xl mt-unit-lg flex flex-col gap-unit-md">
                  {/* Thẻ gợi ý đăng ký tài khoản mới (Đã loại bỏ cụm từ "nhận 200.000đ") */}
                  <div className="p-unit-sm rounded-xl bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-unit-xs text-center sm:text-left">
                    <div className="flex items-center gap-unit-xs">
                      <span className="material-symbols-outlined text-tertiary-container text-2xl">
                        redeem
                      </span>
                      <span className="font-body-md text-body-md text-on-surface">
                        Chưa có tài khoản SmartZone?
                      </span>
                    </div>
                    <Link
                      className="inline-flex items-center gap-unit-2xs font-body-md text-body-md font-bold text-primary hover:text-primary-container hover:underline transition-colors shrink-0"
                      to="/register"
                    >
                      <span>Đăng ký ngay</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                  </div>

                  {/* Badge Bảo Mật: SSL 256-bit & Chứng thực 2 lớp (2FA) */}
                  <div className="flex items-center justify-center sm:justify-start gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm">
                    <span className="material-symbols-outlined text-sm text-secondary">verified_user</span>
                    <span>Bảo mật tài khoản chuẩn SSL 256-bit &amp; Chứng thực 2 lớp (2FA)</span>
                  </div>
                </div>
              </div>
            </div>
            {/* 4 Thẻ Quick Trust Indicators đã được XÓA HOÀN TOÀN theo yêu cầu */}
          </div>
        </div>
      </div>
    </main>

      <Footer />
    </div>
  );
};

const LoginPage = () => {
  return (
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
      <LoginPageContent />
    </GoogleReCaptchaProvider>
  );
};

export default LoginPage;
