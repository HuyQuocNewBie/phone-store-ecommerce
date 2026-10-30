import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import { Loader2 } from 'lucide-react';

/**
 * RegisterPage — Trang Đăng Ký Tài Khoản & Xác Thực OTP SmartZone Member
 * Bóc tách và refactor chuẩn JSX từ Stitch AI Design System:
 * - Breadcrumb: Mang chuẩn 100% từ LoginPage.jsx (max-w-container-max mx-auto px-gutter-desktop)
 * - 4 Input gốc của dự án: TaiKhoan, Email, MatKhau, NhapLaiMatKhau (XÓA SẠCH Họ và tên, SĐT)
 * - Khung Card và Stepper 2 bước căn giữa chuẩn UX
 * - Dãy 6 ô nhập mã OTP (otpValues array) kèm Countdown Timer 300s và gửi lại mã
 */
const RegisterPage = () => {
  const navigate = useNavigate();

  // ── Step State: 1 = Nhập thông tin, 2 = Xác thực OTP ──
  const [step, setStep] = useState(1);
  const currentStep = step;
  const setCurrentStep = setStep;

  // ── Step 1: Form State (4 trường gốc của dự án) ──
  const [form, setForm] = useState({
    TaiKhoan: '',
    Email: '',
    MatKhau: '',
    NhapLaiMatKhau: ''
  });
  // Aliases for compatibility
  const formData = {
    ...form,
    username: form.TaiKhoan,
    email: form.Email,
    password: form.MatKhau,
    confirmPassword: form.NhapLaiMatKhau
  };
  const setFormData = (updater) => {
    if (typeof updater === 'function') {
      setForm((prev) => updater(prev));
    } else {
      setForm(updater);
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [clientErrors, setClientErrors] = useState({});
  const errors = clientErrors;
  const setErrors = setClientErrors;

  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Step 2: OTP State (Dãy 6 ô nhập mã OTP) ──
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const otpDigits = otpValues;
  const setOtpDigits = setOtpValues;

  const [timer, setTimer] = useState(300); // 5 phút = 300 giây
  const countdown = timer;
  const setCountdown = setTimer;

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Refs cho 6 ô input OTP
  const otpInputRefs = useRef([]);

  // ── Countdown Timer cho Bước 2 (OTP) ──
  useEffect(() => {
    let timerId = null;
    if (step === 2 && timer > 0) {
      timerId = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [step, timer]);

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
    if (!pass) return { score: 0, label: '', color: '', barColor: '', bars: 0 };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) {
      return { score: 1, label: 'Yếu', color: 'text-error', barColor: 'bg-error', bars: 1 };
    }
    if (score <= 4) {
      return { score: 2, label: 'Trung bình', color: 'text-tertiary-container', barColor: 'bg-tertiary-container', bars: 2 };
    }
    return { score: 3, label: 'Mạnh', color: 'text-secondary', barColor: 'bg-secondary', bars: 4 };
  };

  const passwordStrength = getPasswordStrength(form.MatKhau);

  // ── Validate 4 Trường Input Bước 1 ──
  const validateField = (name, value) => {
    let error = '';
    const trimmed = String(value || '').trim();

    switch (name) {
      case 'TaiKhoan':
      case 'username':
        if (!trimmed) {
          error = 'Vui lòng nhập tên tài khoản';
        } else if (trimmed.length < 3) {
          error = 'Tài khoản tối thiểu 3 ký tự';
        } else if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
          error = 'Chỉ được dùng chữ, số, gạch dưới, gạch ngang';
        }
        break;

      case 'Email':
      case 'email':
        if (!trimmed) {
          error = 'Vui lòng nhập địa chỉ email';
        } else if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
          error = 'Địa chỉ email không đúng định dạng';
        }
        break;

      case 'MatKhau':
      case 'password':
        if (!value) {
          error = 'Vui lòng nhập mật khẩu';
        } else if (value.length < 6) {
          error = 'Mật khẩu phải chứa ít nhất 6 ký tự';
        }
        break;

      case 'NhapLaiMatKhau':
      case 'confirmPassword':
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

  // ── Xử lý Gửi Form Bước 1 / Gửi OTP (POST /api/v1/auth/register) ──
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setServerError('');

    const newTouched = {
      TaiKhoan: true,
      Email: true,
      MatKhau: true,
      NhapLaiMatKhau: true
    };
    setTouched(newTouched);

    const validationErrors = {
      TaiKhoan: validateField('TaiKhoan', form.TaiKhoan),
      Email: validateField('Email', form.Email),
      MatKhau: validateField('MatKhau', form.MatKhau),
      NhapLaiMatKhau: validateField('NhapLaiMatKhau', form.NhapLaiMatKhau)
    };
    setClientErrors(validationErrors);

    const hasError = Object.values(validationErrors).some((err) => Boolean(err));
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
        navigate('/verify-otp', {
          state: {
            email: form.Email.trim().toLowerCase(),
            phone: '',
            username: form.TaiKhoan.trim(),
            password: form.MatKhau
          }
        });
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

  // Aliases for compatibility
  const handleSubmit = handleSendOtp;
  const handleRegisterSubmit = handleSendOtp;

  // ── Xử lý Input các ô OTP Bước 2 ──
  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newOtp = [...otpValues];
    newOtp[index] = cleanVal.slice(-1);
    setOtpValues(newOtp);
    setOtpError('');

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');

    if (digits.length > 0) {
      const newOtp = ['', '', '', '', '', ''];
      digits.forEach((d, idx) => {
        if (idx < 6) newOtp[idx] = d;
      });
      setOtpValues(newOtp);
      setOtpError('');

      const nextIndex = Math.min(digits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
    }
  };

  // ── Xử lý Xác thực OTP (POST /api/v1/auth/verify-otp) ──
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setOtpError('');

    const otpCode = otpValues.join('').trim();
    if (otpCode.length < 5 || otpCode.length > 6) {
      const msg = 'Vui lòng nhập đủ mã OTP gồm 6 chữ số';
      setOtpError(msg);
      toast.error(msg);
      return;
    }

    if (timer === 0) {
      const msg = 'Mã OTP đã hết hiệu lực. Vui lòng bấm "Gửi lại mã OTP".';
      setOtpError(msg);
      toast.error(msg);
      return;
    }

    setIsVerifying(true);
    try {
      const payload = {
        Email: form.Email.trim().toLowerCase(),
        otp_code: otpCode,
        otp: otpCode
      };

      const res = await api.post('/auth/verify-otp', payload);

      if (res.data?.success) {
        const { token, accessToken, refreshToken, user: userData } = res.data?.data || {};
        const validToken = accessToken || token;

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

        toast.success('Chúc mừng bạn! Tài khoản SmartZone Member đã được kích hoạt thành công.', {
          id: 'verify-success',
          duration: 3500
        });

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
  const resendOtp = async () => {
    if (timer > 0 && timer > 240) {
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
        setTimer(300);
        setOtpValues(['', '', '', '', '', '']);
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

  const handleResendOtp = resendOtp;

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased flex flex-col">
      {/* ── Navbar ── */}
      <Navbar />

      {/* ── Main Section ── */}
      <main className="w-full bg-surface">
        <div className="flex flex-col w-full">
          <div className="relative w-full overflow-hidden pt-unit-lg pb-unit-xs">
            {/* Ambient geometric glow overlays */}
            <div className="absolute -top-32 -left-24 w-96 h-96 bg-primary-fixed-dim/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-secondary-fixed/40 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-container-max mx-auto px-gutter-desktop">
              {/* Breadcrumb indicator — Đem chuẩn 100% từ LoginPage.jsx qua */}
              <div className="flex items-center gap-unit-xs mb-unit-lg text-on-surface-variant font-body-sm text-body-sm">
                <Link
                  className="hover:text-primary transition-colors flex items-center gap-unit-2xs"
                  to="/"
                >
                  <span className="material-symbols-outlined text-sm leading-none">home</span>
                  Trang chủ
                </Link>
                <span className="text-outline">/</span>
                <span className="text-on-surface font-medium">Đăng ký tài khoản</span>
              </div>

              {/* ── Stepper Component (2 Bước: 1. Thông tin tài khoản, 2. Xác thực OTP) ── */}
              <div className="max-w-2xl mx-auto mb-unit-xl">
                <div className="bg-surface-container-lowest shadow-md rounded-2xl p-unit-md flex items-center justify-center">
                  <div className="flex items-center justify-between w-full max-w-lg px-unit-xs sm:px-unit-md">
                    {/* Step 1: Thông tin tài khoản */}
                    <button
                      className="flex items-center gap-unit-xs group cursor-pointer focus:outline-none text-left"
                      id="step-nav-1"
                      onClick={() => setStep(1)}
                      type="button"
                    >
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-headline-sm text-sm font-bold transition-all ${
                          step === 1
                            ? 'bg-primary text-on-primary shadow-sm shadow-primary/30 ring-4 ring-primary-fixed/60'
                            : 'bg-secondary-fixed text-secondary'
                        }`}
                        id="step-badge-1"
                      >
                        {step > 1 ? (
                          <span className="material-symbols-outlined text-sm font-bold">check</span>
                        ) : (
                          '1'
                        )}
                      </span>
                      <span
                        className={`tracking-tight ${
                          step === 1
                            ? 'font-title-card text-title-card text-on-surface font-bold'
                            : 'font-body-md text-body-md text-on-surface-variant font-semibold'
                        }`}
                        id="step-text-1"
                      >
                        Thông tin tài khoản
                      </span>
                    </button>

                    {/* Connecting Divider Line */}
                    <div
                      className={`flex-1 mx-unit-sm h-[2px] rounded-full transition-all ${
                        step > 1 ? 'bg-primary' : 'bg-primary-fixed'
                      }`}
                      id="step-connector"
                    />

                    {/* Step 2: Xác thực OTP */}
                    <button
                      className="flex items-center gap-unit-xs group cursor-pointer focus:outline-none text-left"
                      id="step-nav-2"
                      onClick={() => {
                        if (step === 1) handleSendOtp();
                      }}
                      type="button"
                    >
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-headline-sm text-sm transition-all ${
                          step === 2
                            ? 'bg-primary text-on-primary font-bold shadow-sm shadow-primary/30 ring-4 ring-primary-fixed/60'
                            : 'bg-surface-container-low text-on-surface-variant font-semibold'
                        }`}
                        id="step-badge-2"
                      >
                        2
                      </span>
                      <span
                        className={`tracking-tight ${
                          step === 2
                            ? 'font-title-card text-title-card text-on-surface font-bold'
                            : 'font-body-md text-body-md text-on-surface-variant font-medium'
                        }`}
                        id="step-text-2"
                      >
                        Xác thực OTP
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Main Layout: Khung Card Đăng Ký Căn Giữa Gọn Gàng ── */}
              <div className="max-w-2xl mx-auto bg-surface-container-lowest rounded-2xl shadow-xl p-unit-lg sm:p-unit-xl relative">
                {/* Heading Section */}
                <div className="mb-unit-lg text-center sm:text-left">
                  <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight font-bold">
                    Tạo tài khoản SmartZone Member
                  </h1>
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* BƯỚC 1: FORM 4 INPUT GỐC CỦA DỰ ÁN                         */}
                {/* ══════════════════════════════════════════════════════════ */}
                {step === 1 && (
                  <form
                    onSubmit={handleSendOtp}
                    noValidate
                    className="flex flex-col gap-unit-md transition-opacity duration-300"
                    id="step-content-1"
                  >
                    {/* Server Error Alert */}
                    {serverError && (
                      <div
                        role="alert"
                        className="flex items-start gap-unit-xs p-unit-sm rounded-xl bg-error-container text-on-error-container font-body-md text-body-md animate-in fade-in"
                      >
                        <span className="material-symbols-outlined text-error shrink-0">error</span>
                        <div>
                          <p className="font-semibold">Đăng ký không thành công</p>
                          <p className="font-body-sm text-body-sm mt-0.5">{serverError}</p>
                        </div>
                      </div>
                    )}

                    {/* 1. Họ và tên (TaiKhoan) */}
                    <div className="flex flex-col gap-unit-2xs">
                      <label
                        className="font-body-md text-body-md font-semibold text-on-surface"
                        htmlFor="reg-taikhoan"
                      >
                        Họ và tên <span className="text-error">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-unit-md text-outline pointer-events-none">
                          person
                        </span>
                        <input
                          className={`w-full pl-11 pr-unit-md py-unit-sm bg-surface-container-low focus:bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-xl outline-none focus:ring-2 shadow-sm transition-all ${
                            touched.TaiKhoan && clientErrors.TaiKhoan
                              ? 'border border-error focus:ring-error'
                              : 'border border-transparent focus:ring-primary'
                          } disabled:opacity-60`}
                          id="reg-taikhoan"
                          name="TaiKhoan"
                          type="text"
                          value={form.TaiKhoan}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          placeholder="nguyenvana, minhtri99..."
                        />
                      </div>
                      {touched.TaiKhoan && clientErrors.TaiKhoan && (
                        <p className="font-body-sm text-body-sm text-error flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-sm">error</span>
                          <span>{clientErrors.TaiKhoan}</span>
                        </p>
                      )}
                    </div>

                    {/* 2. Địa chỉ Email (Email) */}
                    <div className="flex flex-col gap-unit-2xs">
                      <label
                        className="font-body-md text-body-md font-semibold text-on-surface"
                        htmlFor="reg-email"
                      >
                        Địa chỉ Email <span className="text-error">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-unit-md text-outline pointer-events-none">
                          alternate_email
                        </span>
                        <input
                          className={`w-full pl-11 pr-unit-md py-unit-sm bg-surface-container-low focus:bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-xl outline-none focus:ring-2 shadow-sm transition-all ${
                            touched.Email && clientErrors.Email
                              ? 'border border-error focus:ring-error'
                              : 'border border-transparent focus:ring-primary'
                          } disabled:opacity-60`}
                          id="reg-email"
                          name="Email"
                          type="email"
                          value={form.Email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          placeholder="tenban@example.com (Nhận mã OTP)"
                        />
                      </div>
                      {touched.Email && clientErrors.Email && (
                        <p className="font-body-sm text-body-sm text-error flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-sm">error</span>
                          <span>{clientErrors.Email}</span>
                        </p>
                      )}
                    </div>

                    {/* 3. Mật khẩu (MatKhau) */}
                    <div className="flex flex-col gap-unit-2xs">
                      <label
                        className="font-body-md text-body-md font-semibold text-on-surface"
                        htmlFor="reg-matkhau"
                      >
                        Mật khẩu <span className="text-error">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-unit-md text-outline pointer-events-none">
                          lock
                        </span>
                        <input
                          className={`w-full pl-11 pr-11 py-unit-sm bg-surface-container-low focus:bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-xl outline-none focus:ring-2 shadow-sm transition-all ${
                            touched.MatKhau && clientErrors.MatKhau
                              ? 'border border-error focus:ring-error'
                              : 'border border-transparent focus:ring-primary'
                          } disabled:opacity-60`}
                          id="reg-matkhau"
                          name="MatKhau"
                          type={showPassword ? 'text' : 'password'}
                          value={form.MatKhau}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          placeholder="Tối thiểu 6 ký tự..."
                        />
                        <button
                          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                          className="absolute right-unit-sm text-outline hover:text-on-surface transition-colors p-1 cursor-pointer focus:outline-none"
                          onClick={() => setShowPassword(!showPassword)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-base">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>

                      {/* Password Strength Indicator */}
                      {form.MatKhau && (
                        <div className="mt-unit-2xs px-unit-xs">
                          <div className="flex items-center justify-between font-body-sm text-body-sm mb-1">
                            <span className="text-on-surface-variant">Độ bảo mật mật khẩu:</span>
                            <span className={`font-bold ${passwordStrength.color}`} id="strength-label">
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                passwordStrength.bars >= 1 ? passwordStrength.barColor : 'bg-transparent'
                              }`}
                            />
                            <div
                              className={`h-full rounded-full transition-all ${
                                passwordStrength.bars >= 2 ? passwordStrength.barColor : 'bg-transparent'
                              }`}
                            />
                            <div
                              className={`h-full rounded-full transition-all ${
                                passwordStrength.bars >= 3 ? passwordStrength.barColor : 'bg-transparent'
                              }`}
                            />
                            <div
                              className={`h-full rounded-full transition-all ${
                                passwordStrength.bars >= 4 ? passwordStrength.barColor : 'bg-transparent'
                              }`}
                            />
                          </div>
                        </div>
                      )}

                      {touched.MatKhau && clientErrors.MatKhau && (
                        <p className="font-body-sm text-body-sm text-error flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-sm">error</span>
                          <span>{clientErrors.MatKhau}</span>
                        </p>
                      )}
                    </div>

                    {/* 4. Xác nhận lại mật khẩu (NhapLaiMatKhau) */}
                    <div className="flex flex-col gap-unit-2xs">
                      <label
                        className="font-body-md text-body-md font-semibold text-on-surface"
                        htmlFor="reg-nhaplaimatkhau"
                      >
                        Xác nhận lại mật khẩu <span className="text-error">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-unit-md text-outline pointer-events-none">
                          verified_user
                        </span>
                        <input
                          className={`w-full pl-11 pr-11 py-unit-sm bg-surface-container-low focus:bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-xl outline-none focus:ring-2 shadow-sm transition-all ${
                            touched.NhapLaiMatKhau && clientErrors.NhapLaiMatKhau
                              ? 'border border-error focus:ring-error'
                              : 'border border-transparent focus:ring-primary'
                          } disabled:opacity-60`}
                          id="reg-nhaplaimatkhau"
                          name="NhapLaiMatKhau"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={form.NhapLaiMatKhau}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          placeholder="Nhập lại mật khẩu vừa tạo"
                        />
                        <button
                          aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                          className="absolute right-unit-sm text-outline hover:text-on-surface transition-colors p-1 cursor-pointer focus:outline-none"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-base">
                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      {touched.NhapLaiMatKhau && clientErrors.NhapLaiMatKhau && (
                        <p className="font-body-sm text-body-sm text-error flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-sm">error</span>
                          <span>{clientErrors.NhapLaiMatKhau}</span>
                        </p>
                      )}
                    </div>

                    {/* CTA Next Step Button */}
                    <button
                      className="w-full py-unit-sm px-unit-lg bg-primary-container hover:bg-primary text-on-primary font-body-lg text-body-lg font-bold rounded-xl shadow-lg shadow-primary-container/25 hover:shadow-xl transition-all flex items-center justify-center gap-unit-xs cursor-pointer active:scale-[0.99] mt-unit-xs disabled:opacity-60 disabled:cursor-not-allowed"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>ĐANG GỬI MÃ OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>TIẾP TỤC XÁC THỰC OTP</span>
                          <span className="material-symbols-outlined text-xl leading-none">
                            arrow_forward
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* BƯỚC 2: FORM XÁC THỰC MÃ OTP 6 CHỮ SỐ                     */}
                {/* ══════════════════════════════════════════════════════════ */}
                {step === 2 && (
                  <form
                    onSubmit={handleVerifyOtp}
                    className="flex flex-col gap-unit-lg transition-opacity duration-300"
                    id="step-content-2"
                  >
                    {/* Header thông báo gửi OTP */}
                    <div className="bg-surface-container-low p-unit-md rounded-2xl flex items-start gap-unit-md">
                      <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                        <span
                          className="material-symbols-outlined text-2xl"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          sms
                        </span>
                      </div>
                      <div className="flex-1">
                        <span className="font-body-sm text-body-sm text-on-surface-variant block">
                          Mã bảo mật OTP gửi tới email
                        </span>
                        <strong
                          className="font-title-card text-title-card text-primary tracking-wider"
                          id="otp-phone-display"
                        >
                          {form.Email}
                        </strong>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          Vui lòng kiểm tra hộp thư email (<strong>{form.Email}</strong>) và điền mã xác thực 6 chữ số vào các ô bên dưới.
                        </p>
                      </div>
                      <button
                        className="font-body-sm text-body-sm text-primary hover:underline font-semibold flex items-center gap-0.5 shrink-0 cursor-pointer"
                        onClick={() => setStep(1)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Đổi Email
                      </button>
                    </div>

                    {/* Server/OTP Error Alert */}
                    {otpError && (
                      <div
                        role="alert"
                        className="flex items-start gap-unit-xs p-unit-sm rounded-xl bg-error-container text-on-error-container font-body-md text-body-md animate-in fade-in"
                      >
                        <span className="material-symbols-outlined text-error shrink-0">error</span>
                        <div>
                          <p className="font-semibold">Xác thực thất bại</p>
                          <p className="font-body-sm text-body-sm mt-0.5">{otpError}</p>
                        </div>
                      </div>
                    )}

                    {/* Dãy 6 ô nhập mã OTP */}
                    <div className="flex flex-col items-center gap-unit-sm py-unit-xs">
                      <span className="font-body-sm text-body-sm font-semibold uppercase tracking-wider text-outline">
                        Nhập mã gồm 6 chữ số
                      </span>
                      <div
                        className="flex items-center justify-center gap-2 sm:gap-unit-xs w-full"
                        id="otp-input-group"
                        onPaste={handleOtpPaste}
                      >
                        {otpValues.map((val, idx) => (
                          <input
                            key={idx}
                            ref={(el) => (otpInputRefs.current[idx] = el)}
                            className={`otp-box w-11 h-14 sm:w-14 sm:h-16 text-center font-headline-md text-headline-md font-extrabold rounded-xl shadow-md outline-none focus:ring-2 focus:ring-primary transition-all ${
                              val
                                ? 'text-primary bg-surface-container-lowest ring-2 ring-primary/40'
                                : 'text-on-surface bg-surface-container-low shadow-inner focus:bg-surface-container-lowest'
                            }`}
                            inputMode="numeric"
                            maxLength={1}
                            type="text"
                            value={val}
                            placeholder="-"
                            disabled={isVerifying}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Đếm ngược Timer & Nút Gửi lại mã */}
                    <div className="flex flex-col sm:flex-row items-center justify-between p-unit-sm bg-surface-container-lowest rounded-xl shadow-sm gap-unit-xs border border-surface-container">
                      <div className="flex items-center gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-base text-primary">timer</span>
                        <span>Mã xác thực có hiệu lực trong:</span>
                        <span className="font-bold text-error font-body-md text-body-md" id="otp-timer">
                          {formatTime(timer)}
                        </span>
                      </div>
                      <button
                        className="font-body-sm text-body-sm text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        id="btn-resend-otp"
                        onClick={resendOtp}
                        disabled={isResending || timer > 240}
                        type="button"
                      >
                        {isResending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span>Đang gửi lại mã...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-base">refresh</span>
                            <span>Gửi lại mã OTP</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Nút Hoàn tất đăng ký */}
                    <button
                      className="w-full py-unit-sm px-unit-lg bg-tertiary-container hover:bg-tertiary text-on-tertiary font-body-lg text-body-lg font-bold rounded-xl shadow-lg shadow-tertiary-container/30 hover:shadow-xl transition-all flex items-center justify-center gap-unit-xs cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                      type="submit"
                      disabled={isVerifying || otpValues.join('').length < 5}
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>ĐANG XÁC THỰC TÀI KHOẢN...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xl leading-none">task_alt</span>
                          <span>HOÀN TẤT ĐĂNG KÝ</span>
                        </>
                      )}
                    </button>

                    {/* Quay lại bước 1 */}
                    <div className="text-center">
                      <button
                        className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors inline-flex items-center gap-1 cursor-pointer"
                        onClick={() => setStep(1)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <span>Quay lại chỉnh sửa thông tin đăng ký</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* ── Link Chuyển sang Trang Đăng Nhập ── */}
                <div className="mt-unit-lg pt-unit-md text-center bg-surface-container-low rounded-xl p-unit-sm">
                  <span className="font-body-md text-body-md text-on-surface-variant">
                    Bạn đã có tài khoản SmartZone?{' '}
                  </span>
                  <Link
                    className="font-body-md text-body-md text-primary font-bold hover:underline ml-1 inline-flex items-center gap-0.5"
                    data-path="dang-nhap"
                    to="/login"
                  >
                    Đăng nhập tại đây
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer (Tối ưu khoảng cách trên mỏng gọn) ── */}
      <div className="[&>footer]:!mt-6 md:[&>footer]:!mt-8 [&>footer]:!pt-10 md:[&>footer]:!pt-12">
        <Footer />
      </div>
    </div>
  );
};

export default RegisterPage;
