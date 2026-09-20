import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Store,
  Sparkles,
  Gift,
  RefreshCw,
  Clock,
  KeyRound,
  Check
} from 'lucide-react';

/**
 * Danh sách đặc quyền thành viên SmartZone (Branding Panel bên trái)
 */
const MEMBER_PERKS = [
  {
    icon: Gift,
    title: 'Ưu đãi chào mừng thành viên',
    desc: 'Tặng ngay voucher giảm giá tới 500.000đ khi tạo tài khoản mới.',
    badgeColor: 'bg-rose-50 text-rose-600 border-rose-200/60'
  },
  {
    icon: Sparkles,
    title: 'Tích lũy điểm thưởng SmartPoint',
    desc: 'Tích 2% giá trị mọi đơn hàng để quy đổi quà tặng và phụ kiện cao cấp.',
    badgeColor: 'bg-amber-50 text-amber-600 border-amber-200/60'
  },
  {
    icon: RefreshCw,
    title: 'Đặc quyền 30 ngày 1 đổi 1',
    desc: 'Đổi trả miễn phí không lý do trong 30 ngày đầu tiên cho mọi thiết bị.',
    badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-200/60'
  },
  {
    icon: ShieldCheck,
    title: 'Bảo hành điện tử chính hãng',
    desc: 'Tra cứu trạng thái máy, tiến độ bảo hành & bảo dưỡng mọi lúc trên tài khoản.',
    badgeColor: 'bg-sky-50 text-sky-600 border-sky-200/60'
  }
];

const RegisterPage = () => {
  const navigate = useNavigate();

  // ── Step State: 1 = Nhập thông tin, 2 = Xác thực OTP ──
  const [step, setStep] = useState(1);

  // ── Step 1: Form State ──
  const [form, setForm] = useState({
    TaiKhoan: '',
    Email: '',
    MatKhau: '',
    NhapLaiMatKhau: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [clientErrors, setClientErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Step 2: OTP State ──
  // Mã OTP 5 chữ số -> Array 5 phần tử
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '']);
  const [countdown, setCountdown] = useState(300); // 5 phút = 300 giây
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Refs cho 5 ô input OTP
  const otpInputRefs = useRef([]);

  // ── Countdown Timer cho Bước 2 (OTP) ──
  useEffect(() => {
    let timerId = null;
    if (step === 2 && countdown > 0) {
      timerId = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [step, countdown]);

  // Tự động focus vào ô OTP đầu tiên khi chuyển sang Bước 2
  useEffect(() => {
    if (step === 2 && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // ── Format Thời Gian mm:ss ──
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // ── Kiểm tra Độ mạnh Mật khẩu ──
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) || /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Yếu', color: 'bg-rose-500', text: 'text-rose-500' };
    if (score <= 4) return { score: 2, label: 'Trung bình', color: 'bg-amber-500', text: 'text-amber-500' };
    return { score: 3, label: 'Mạnh', color: 'bg-emerald-500', text: 'text-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(form.MatKhau);

  // ── Validate Input Bước 1 ──
  const validateField = (name, value) => {
    let error = '';
    const trimmed = String(value || '').trim();

    switch (name) {
      case 'TaiKhoan':
        if (!trimmed) {
          error = 'Vui lòng nhập tên tài khoản';
        } else if (trimmed.length < 3) {
          error = 'Tài khoản tối thiểu 3 ký tự';
        } else if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
          error = 'Chỉ được dùng chữ, số, gạch dưới, gạch ngang';
        }
        break;

      case 'Email':
        if (!trimmed) {
          error = 'Vui lòng nhập địa chỉ email';
        } else if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
          error = 'Địa chỉ email không đúng định dạng';
        }
        break;

      case 'MatKhau':
        if (!value) {
          error = 'Vui lòng nhập mật khẩu';
        } else if (value.length < 6) {
          error = 'Mật khẩu phải chứa ít nhất 6 ký tự';
        }
        break;

      case 'NhapLaiMatKhau':
        if (!value) {
          error = 'Vui lòng nhập lại mật khẩu';
        } else if (value !== form.MatKhau) {
          error = 'Mật khẩu xác nhận không trùng khớp';
        }
        break;

      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setServerError('');

    if (touched[name]) {
      setClientErrors((prev) => ({
        ...prev,
        [name]: validateField(name, value)
      }));
    }

    // Nếu sửa mật khẩu chính, kiểm tra lại trường xác nhận mật khẩu
    if (name === 'MatKhau' && touched.NhapLaiMatKhau) {
      setClientErrors((prev) => ({
        ...prev,
        NhapLaiMatKhau: value !== form.NhapLaiMatKhau ? 'Mật khẩu xác nhận không trùng khớp' : ''
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setClientErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value)
    }));
  };

  // ── Xử lý Gửi Form Bước 1 (POST /api/v1/auth/register) ──
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    // Đánh dấu touched toàn bộ các trường
    const newTouched = {
      TaiKhoan: true,
      Email: true,
      MatKhau: true,
      NhapLaiMatKhau: true
    };
    setTouched(newTouched);

    const errors = {
      TaiKhoan: validateField('TaiKhoan', form.TaiKhoan),
      Email: validateField('Email', form.Email),
      MatKhau: validateField('MatKhau', form.MatKhau),
      NhapLaiMatKhau: validateField('NhapLaiMatKhau', form.NhapLaiMatKhau)
    };
    setClientErrors(errors);

    const hasError = Object.values(errors).some((err) => Boolean(err));
    if (hasError) {
      toast.error('Vui lòng kiểm tra lại thông tin đăng ký');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        TaiKhoan: form.TaiKhoan.trim(),
        Email: form.Email.trim().toLowerCase(),
        MatKhau: form.MatKhau
      };

      const res = await api.post('/auth/register', payload);

      if (res.data?.success) {
        toast.success(res.data.message || 'Mã OTP đã được gửi về email của bạn!', {
          id: 'otp-sent',
          duration: 4000
        });
        // Chuyển sang Bước 2 (Nhập OTP)
        setCountdown(300); // 5 phút
        setOtpDigits(['', '', '', '', '']);
        setOtpError('');
        setStep(2);
      } else {
        setServerError(res.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng hoặc thử lại sau.';
      setServerError(errMsg);
      toast.error(errMsg, { id: 'register-error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Xử lý Input các ô OTP ──
  const handleOtpChange = (index, value) => {
    // Chỉ chấp nhận số
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newOtp = [...otpDigits];
    newOtp[index] = cleanVal.slice(-1); // Lấy chữ số cuối cùng
    setOtpDigits(newOtp);
    setOtpError('');

    // Tự động focus sang ô tiếp theo
    if (cleanVal && index < 4) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 4) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    const digits = pastedData.replace(/\D/g, '').slice(0, 5).split('');

    if (digits.length > 0) {
      const newOtp = ['', '', '', '', ''];
      digits.forEach((d, idx) => {
        if (idx < 5) newOtp[idx] = d;
      });
      setOtpDigits(newOtp);
      setOtpError('');

      // Focus vào ô tiếp theo hoặc ô cuối cùng
      const nextIndex = Math.min(digits.length, 4);
      otpInputRefs.current[nextIndex]?.focus();
    }
  };

  // ── Xử lý Xác thực OTP (POST /api/v1/auth/verify-otp) ──
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setOtpError('');

    const otpCode = otpDigits.join('').trim();
    if (otpCode.length !== 5) {
      const msg = 'Vui lòng nhập đủ 5 chữ số mã OTP xác thực';
      setOtpError(msg);
      toast.error(msg);
      return;
    }

    if (countdown === 0) {
      const msg = 'Mã OTP đã hết hiệu lực. Vui lòng bấm "Gửi lại mã OTP".';
      setOtpError(msg);
      toast.error(msg);
      return;
    }

    setIsVerifying(true);
    try {
      const payload = {
        Email: form.Email.trim().toLowerCase(),
        otp_code: otpCode
      };

      const res = await api.post('/auth/verify-otp', payload);

      if (res.data?.success) {
        const { token, accessToken, refreshToken, user: userData } = res.data?.data || {};
        const validToken = accessToken || token;

        // Lưu JWT Token và User vào localStorage
        if (validToken) {
          localStorage.setItem('token', validToken);
          localStorage.setItem('accessToken', validToken);
        }
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData));
        }

        toast.success('Xác thực thành công! Tài khoản của bạn đã sẵn sàng.', {
          id: 'verify-success',
          duration: 3500
        });

        // Chuyển hướng về trang Đăng nhập kèm thông tin điền sẵn
        navigate('/login', {
          replace: true,
          state: {
            registeredAccount: form.TaiKhoan.trim(),
            message: 'Đăng ký tài khoản thành công! Vui lòng nhập mật khẩu để đăng nhập.'
          }
        });
      } else {
        setOtpError(res.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng thử lại.';
      setOtpError(errMsg);
      toast.error(errMsg, { id: 'verify-error' });
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Xử lý Gửi lại mã OTP ──
  const handleResendOtp = async () => {
    if (countdown > 0 && countdown > 240) {
      toast('Vui lòng đợi một chút trước khi yêu cầu mã mới.', { icon: '⏳' });
      return;
    }

    setIsResending(true);
    setOtpError('');
    try {
      const payload = {
        TaiKhoan: form.TaiKhoan.trim(),
        Email: form.Email.trim().toLowerCase(),
        MatKhau: form.MatKhau
      };

      const res = await api.post('/auth/register', payload);

      if (res.data?.success) {
        setCountdown(300); // Reset lại 5 phút
        setOtpDigits(['', '', '', '', '']);
        toast.success('Mã OTP mới đã được gửi tới email của bạn!');
        otpInputRefs.current[0]?.focus();
      } else {
        toast.error(res.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi lại mã OTP. Vui lòng thử lại.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden text-slate-800 font-sans">
      {/* ── Ambient Background Glows (Light Theme Soft Tones) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 w-[32rem] h-[32rem] rounded-full bg-indigo-400/10 blur-[130px]" />
        <div className="absolute -bottom-24 left-1/3 w-[36rem] h-[36rem] rounded-full bg-violet-400/10 blur-[140px]" />
      </div>

      {/* ── Main Container Card (Light Premium Glassmorphism) ── */}
      <div className="relative z-10 w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-2xl shadow-sky-500/5 overflow-hidden flex flex-col lg:flex-row">

        {/* ── Cột Trái: Giới thiệu Thương hiệu & Đặc quyền Thành viên (Light Luxury Style) ── */}
        <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-slate-50 via-sky-50/40 to-indigo-50/30 p-10 flex-col justify-between border-r border-slate-200/60 relative">
          <div>
            {/* Logo Brand */}
            <Link to="/" className="inline-flex items-center gap-3 group mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/25 group-hover:scale-105 transition-transform duration-300">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-wider bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  SmartZone
                </span>
                <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase -mt-0.5">
                  Store Premium
                </span>
              </div>
            </Link>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-100/80 border border-sky-200/60 text-sky-700 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
              <span>Thành viên SmartZone Member</span>
            </div>

            {/* Header Text */}
            <h1 className="text-2xl font-extrabold text-slate-900 leading-snug mb-3">
              Gia nhập SmartZone,<br />
              <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
                Nhận ngàn đặc quyền
              </span>
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed mb-8">
              Trải nghiệm mua sắm công nghệ chính hãng đỉnh cao với cam kết giá tốt nhất, hậu mãi chuẩn quốc tế và dịch vụ chăm sóc 24/7.
            </p>

            {/* Member Perks List */}
            <div className="space-y-4">
              {MEMBER_PERKS.map((perk, index) => {
                const IconComponent = perk.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3.5 p-3 rounded-2xl bg-white/70 border border-slate-200/60 shadow-sm hover:shadow-md hover:bg-white transition-all duration-200 group"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${perk.badgeColor} group-hover:scale-105 transition-transform`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 leading-snug">
                        {perk.title}
                      </h2>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                        {perk.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="pt-8 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-slate-600">Bảo mật SSL 256-bit</span>
            </div>
            <span className="text-slate-400">·</span>
            <span>Mã hóa tài khoản OTP</span>
          </div>
        </div>

        {/* ── Cột Phải: Form Đăng ký & Xác thực OTP ── */}
        <div className="flex-1 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-white">
          <div>
            {/* Header Mobile Logo */}
            <div className="flex items-center justify-between lg:hidden mb-6 pb-4 border-b border-slate-100">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-violet-600 flex items-center justify-center text-white shadow-md">
                  <Store className="w-5 h-5" />
                </div>
                <span className="text-lg font-black bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent">
                  SmartZone
                </span>
              </Link>

              <Link
                to="/login"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1"
              >
                <span>Đăng nhập</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Step Progress Indicator (Stepper) */}
            <div className="mb-8">
              <div className="flex items-center justify-between max-w-sm mx-auto sm:mx-0">
                {/* Step 1 Indicator */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      step === 1
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30 ring-4 ring-sky-100'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {step > 1 ? <Check className="w-4 h-4" /> : '1'}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      step === 1 ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    Thông tin tài khoản
                  </span>
                </div>

                {/* Connector Line */}
                <div
                  className={`flex-1 mx-3 h-0.5 rounded transition-all duration-500 ${
                    step > 1 ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                />

                {/* Step 2 Indicator */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      step === 2
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30 ring-4 ring-sky-100'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    2
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      step === 2 ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    Xác thực OTP
                  </span>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* BƯỚC 1: FORM ĐĂNG KÝ TÀI KHOẢN                           */}
            {/* ═══════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Tạo tài khoản mới
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Điền thông tin bên dưới để bắt đầu nhận ngay các ưu đãi đặc quyền
                  </p>
                </div>

                {/* Server Error Alert */}
                {serverError && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 p-4 mb-6 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-sm animate-in fade-in"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Đăng ký không thành công</p>
                      <p className="text-xs text-rose-600 mt-0.5">{serverError}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
                  {/* Trường 1: Tài Khoản */}
                  <div>
                    <label
                      htmlFor="register-taikhoan"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Tên tài khoản <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="register-taikhoan"
                        name="TaiKhoan"
                        type="text"
                        autoComplete="username"
                        value={form.TaiKhoan}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Ví dụ: nguyenvana, minhtri99..."
                        disabled={isSubmitting}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-slate-50 border transition-all duration-200 placeholder:text-slate-400 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                          touched.TaiKhoan && clientErrors.TaiKhoan
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                            : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                        } disabled:opacity-60`}
                      />
                    </div>
                    {touched.TaiKhoan && clientErrors.TaiKhoan && (
                      <p className="mt-1 text-xs text-rose-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{clientErrors.TaiKhoan}</span>
                      </p>
                    )}
                  </div>

                  {/* Trường 2: Email */}
                  <div>
                    <label
                      htmlFor="register-email"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Địa chỉ Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="register-email"
                        name="Email"
                        type="email"
                        autoComplete="email"
                        value={form.Email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="tenban@example.com (Dùng để nhận mã OTP)"
                        disabled={isSubmitting}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-slate-50 border transition-all duration-200 placeholder:text-slate-400 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                          touched.Email && clientErrors.Email
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                            : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                        } disabled:opacity-60`}
                      />
                    </div>
                    {touched.Email && clientErrors.Email && (
                      <p className="mt-1 text-xs text-rose-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{clientErrors.Email}</span>
                      </p>
                    )}
                  </div>

                  {/* Trường 3: Mật Khẩu */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="register-matkhau"
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                      >
                        Mật khẩu <span className="text-rose-500">*</span>
                      </label>
                      {form.MatKhau && (
                        <span className={`text-xs font-bold ${passwordStrength.text}`}>
                          {passwordStrength.label}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="register-matkhau"
                        name="MatKhau"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={form.MatKhau}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Tối thiểu 6 ký tự..."
                        disabled={isSubmitting}
                        className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm bg-slate-50 border transition-all duration-200 placeholder:text-slate-400 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                          touched.MatKhau && clientErrors.MatKhau
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                            : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                        } disabled:opacity-60`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Thanh đo độ mạnh mật khẩu */}
                    {form.MatKhau && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength.score >= 1 ? passwordStrength.color : 'bg-slate-200'
                          }`}
                        />
                        <div
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength.score >= 2 ? passwordStrength.color : 'bg-slate-200'
                          }`}
                        />
                        <div
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength.score >= 3 ? passwordStrength.color : 'bg-slate-200'
                          }`}
                        />
                      </div>
                    )}

                    {touched.MatKhau && clientErrors.MatKhau && (
                      <p className="mt-1 text-xs text-rose-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{clientErrors.MatKhau}</span>
                      </p>
                    )}
                  </div>

                  {/* Trường 4: Nhập Lại Mật Khẩu */}
                  <div>
                    <label
                      htmlFor="register-nhaplaimatkhau"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Xác nhận mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <input
                        id="register-nhaplaimatkhau"
                        name="NhapLaiMatKhau"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={form.NhapLaiMatKhau}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Nhập lại mật khẩu vừa tạo..."
                        disabled={isSubmitting}
                        className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm bg-slate-50 border transition-all duration-200 placeholder:text-slate-400 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                          touched.NhapLaiMatKhau && clientErrors.NhapLaiMatKhau
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                            : form.NhapLaiMatKhau && form.NhapLaiMatKhau === form.MatKhau
                            ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                            : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                        } disabled:opacity-60`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                        aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {touched.NhapLaiMatKhau && clientErrors.NhapLaiMatKhau && (
                      <p className="mt-1 text-xs text-rose-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{clientErrors.NhapLaiMatKhau}</span>
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    id="btn-submit-register"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 active:scale-[0.99] transition-all duration-200 shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang khởi tạo tài khoản...</span>
                      </>
                    ) : (
                      <>
                        <span>Đăng ký tài khoản</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* BƯỚC 2: FORM XÁC THỰC MÃ OTP (5 CHỮ SỐ)                  */}
            {/* ═══════════════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Back button to Step 1 */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-600 transition-colors mb-4 group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Thay đổi thông tin đăng ký</span>
                </button>

                <div className="mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-3 shadow-sm">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Xác thực mã OTP
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Hệ thống đã gửi mã xác thực 5 chữ số đến địa chỉ email:
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold font-mono">
                    <Mail className="w-3.5 h-3.5 text-sky-600" />
                    <span>{form.Email}</span>
                  </div>
                </div>

                {/* OTP Error Alert */}
                {otpError && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 p-4 mb-6 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-sm animate-in fade-in"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Mã OTP không hợp lệ</p>
                      <p className="text-xs text-rose-600 mt-0.5">{otpError}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  {/* 5 Ô Nhập Mã OTP */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-center mb-3">
                      Nhập 5 chữ số xác thực
                    </label>

                    <div
                      className="flex items-center justify-center gap-2.5 sm:gap-3.5"
                      onPaste={handleOtpPaste}
                    >
                      {otpDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (otpInputRefs.current[index] = el)}
                          id={`otp-input-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          disabled={isVerifying}
                          className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black rounded-2xl bg-slate-50 border-2 transition-all duration-200 focus:bg-white focus:outline-none font-mono ${
                            digit
                              ? 'border-sky-500 text-slate-900 bg-sky-50/20 shadow-sm'
                              : 'border-slate-200 text-slate-700 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10'
                          } disabled:opacity-50`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Countdown Timer Badge */}
                  <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                    <div
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        countdown === 0
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : countdown <= 60
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200/60'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {countdown > 0 ? (
                          <>
                            Mã có hiệu lực trong: <strong>{formatTime(countdown)}</strong>
                          </>
                        ) : (
                          'Mã OTP đã hết hiệu lực'
                        )}
                      </span>
                    </div>

                    {/* Resend Action */}
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span>Chưa nhận được mã?</span>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isResending || (countdown > 240)}
                        className="font-bold text-sky-600 hover:text-sky-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {isResending ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Đang gửi lại...
                          </span>
                        ) : (
                          'Gửi lại mã OTP'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit Verify Button */}
                  <button
                    id="btn-verify-otp"
                    type="submit"
                    disabled={isVerifying || otpDigits.join('').length !== 5}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 active:scale-[0.99] transition-all duration-200 shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang xác thực mã OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Xác thực & Hoàn tất</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Bottom Card Navigation (Back to Login) */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Đã có tài khoản SmartZone?</span>
            <Link
              to="/login"
              className="font-bold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 hover:underline"
            >
              <span>Đăng nhập ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
