import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Loader2, X, Mail, ShieldCheck, KeyRound, ArrowRight, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

// ─── Hằng số thời gian ─────────────────────────────────────────────────────
const OTP_TTL_SECONDS     = 300; // 5 phút hết hạn OTP
const RESEND_COOLDOWN_SEC =  60; // Cooldown 60s nút "Gửi lại mã"
const EMAIL_REGEX         = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ForgotPasswordModal — SmartZone Ecommerce
 *
 * Bước 1: Nhập Email → Gửi mã OTP
 * Bước 2: Nhập 6 ô OTP → Xác thực
 *
 * Props:
 *  - isOpen       {boolean}   : Hiển thị / ẩn modal
 *  - onClose      {function}  : Callback đóng modal
 *  - onVerified   {function}  : Callback sau khi OTP xác thực thành công
 *                               Nhận { email, resetToken } để bước tiếp theo đổi mật khẩu
 */
const ForgotPasswordModal = ({ isOpen, onClose, onVerified }) => {
  // ── Bước hiện tại: 1 = Nhập Email, 2 = Nhập OTP ────────────────────────
  const [step, setStep] = useState(1);

  // ── Bước 1: Email ────────────────────────────────────────────────────────
  const [email, setEmail]               = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [emailError, setEmailError]     = useState('');

  // ── Bước 2: OTP ──────────────────────────────────────────────────────────
  const [otpDigits, setOtpDigits]       = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError]         = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResending, setIsResending]   = useState(false);

  // ── Đồng hồ đếm ngược hết hạn OTP (5 phút) ──────────────────────────────
  const [otpCountdown, setOtpCountdown] = useState(OTP_TTL_SECONDS);

  // ── Cooldown 60s nút "Gửi lại mã" ───────────────────────────────────────
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const emailInputRef                   = useRef(null);
  const otpInputRefs                    = useRef([]);
  const otpIntervalRef                  = useRef(null);
  const resendIntervalRef               = useRef(null);

  // ── Khóa scroll + phím Escape ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Auto-focus Email input khi modal mở ở Bước 1 ────────────────────────
  useEffect(() => {
    if (isOpen && step === 1) {
      const t = setTimeout(() => emailInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen, step]);

  // ── Auto-focus ô OTP đầu tiên khi vào Bước 2 ────────────────────────────
  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [step]);

  // ── Đồng hồ đếm ngược hết hạn OTP ───────────────────────────────────────
  useEffect(() => {
    if (step !== 2) return;
    clearInterval(otpIntervalRef.current);
    setOtpCountdown(OTP_TTL_SECONDS);
    otpIntervalRef.current = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) { clearInterval(otpIntervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(otpIntervalRef.current);
  }, [step]);

  // ── Cooldown đếm ngược nút "Gửi lại mã" ─────────────────────────────────
  const startResendCooldown = useCallback(() => {
    clearInterval(resendIntervalRef.current);
    setResendCooldown(RESEND_COOLDOWN_SEC);
    resendIntervalRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(resendIntervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Cleanup tất cả interval khi unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(otpIntervalRef.current);
      clearInterval(resendIntervalRef.current);
    };
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const emailFieldError = emailTouched && !isEmailValid
    ? (!email.trim() ? 'Vui lòng nhập địa chỉ email.' : 'Địa chỉ email không đúng định dạng.')
    : '';

  // ── Reset toàn bộ state về ban đầu ───────────────────────────────────────
  const resetAll = useCallback(() => {
    setStep(1);
    setEmail('');
    setEmailTouched(false);
    setIsSendingOtp(false);
    setEmailError('');
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setIsVerifyingOtp(false);
    setIsResending(false);
    setOtpCountdown(OTP_TTL_SECONDS);
    setResendCooldown(0);
    clearInterval(otpIntervalRef.current);
    clearInterval(resendIntervalRef.current);
  }, []);

  const handleClose = useCallback(() => {
    resetAll();
    onClose?.();
  }, [resetAll, onClose]);

  // ─── BƯỚC 1: Gửi OTP ─────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setEmailTouched(true);
    setEmailError('');

    if (!isEmailValid) {
      const msg = !email.trim()
        ? 'Vui lòng nhập địa chỉ email.'
        : 'Địa chỉ email không đúng định dạng.';
      setEmailError(msg);
      emailInputRef.current?.focus();
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await api.post('/auth/send-otp', { email: email.trim().toLowerCase() });
      if (res.data?.success) {
        toast.success(res.data.message || 'Mã OTP đã được gửi đến email của bạn!', {
          id: 'send-otp-success',
        });
        // Chuyển sang Bước 2
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        setStep(2);
        startResendCooldown();
      } else {
        const msg = res.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
        setEmailError(msg);
        toast.error(msg, { id: 'send-otp-error' });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể gửi mã OTP. Vui lòng kiểm tra lại email và thử lại.';
      setEmailError(msg);
      toast.error(msg, { id: 'send-otp-error' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ─── BƯỚC 2: Gửi lại OTP ─────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setOtpError('');
    try {
      const res = await api.post('/auth/send-otp', { email: email.trim().toLowerCase() });
      if (res.data?.success) {
        toast.success('Mã OTP mới đã được gửi đến email của bạn!', { id: 'resend-otp-success' });
        setOtpDigits(['', '', '', '', '', '']);
        setOtpCountdown(OTP_TTL_SECONDS);
        clearInterval(otpIntervalRef.current);
        otpIntervalRef.current = setInterval(() => {
          setOtpCountdown((prev) => {
            if (prev <= 1) { clearInterval(otpIntervalRef.current); return 0; }
            return prev - 1;
          });
        }, 1000);
        startResendCooldown();
        otpInputRefs.current[0]?.focus();
      } else {
        toast.error(res.data?.message || 'Không thể gửi lại mã OTP.', { id: 'resend-otp-error' });
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi gửi lại mã OTP. Vui lòng thử lại!',
        { id: 'resend-otp-error' }
      );
    } finally {
      setIsResending(false);
    }
  };

  // ─── BƯỚC 2: Xử lý nhập OTP ──────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    const clean = value.replace(/\D/g, '');
    if (!clean && value !== '') return;

    const next = [...otpDigits];
    next[index] = clean.slice(-1);
    setOtpDigits(next);
    setOtpError('');

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
      otpInputRefs.current[index + 1]?.select();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleVerifyOtp();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const raw = e.clipboardData.getData('text/plain').trim();
    const digits = raw.replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    const next = ['', '', '', '', '', ''];
    digits.forEach((d, i) => { next[i] = d; });
    setOtpDigits(next);
    setOtpError('');
    const focus = Math.min(digits.length, 5);
    otpInputRefs.current[focus]?.focus();
  };

  // ─── BƯỚC 2: Xác thực OTP ────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setOtpError('');

    const otpCode = otpDigits.join('').trim();

    if (otpCode.length < 6) {
      const msg = 'Vui lòng nhập đủ 6 chữ số mã OTP!';
      setOtpError(msg);
      toast.error(msg);
      const emptyIdx = otpDigits.findIndex((d) => !d);
      if (emptyIdx !== -1) otpInputRefs.current[emptyIdx]?.focus();
      return;
    }

    if (otpCountdown === 0) {
      const msg = 'Mã OTP đã hết hiệu lực. Vui lòng bấm "Gửi lại mã".';
      setOtpError(msg);
      toast.error(msg);
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await api.post('/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp:   otpCode,
        otp_code: otpCode,
        purpose: 'forgot_password',
      });

      if (res.data?.success) {
        const resetToken = res.data?.data?.resetToken || res.data?.data?.token || '';
        toast.success(
          res.data.message || 'Xác thực OTP thành công!',
          { id: 'verify-otp-success', duration: 3000 }
        );
        // Gọi callback với email + resetToken để màn hình cha xử lý bước đặt mật khẩu mới
        onVerified?.({ email: email.trim().toLowerCase(), resetToken });
        handleClose();
      } else {
        const msg = res.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.';
        setOtpError(msg);
        toast.error(msg, { id: 'verify-otp-error' });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Mã OTP không chính xác hoặc đã hết hiệu lực. Vui lòng thử lại!';
      setOtpError(msg);
      toast.error(msg, { id: 'verify-otp-error' });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ─── Không render nếu modal đóng ─────────────────────────────────────────
  if (!isOpen) return null;

  // ─── Màu đồng hồ hết hạn ─────────────────────────────────────────────────
  const countdownUrgent = otpCountdown <= 60 && otpCountdown > 0;
  const countdownExpired = otpCountdown === 0;

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-pw-modal-title"
    >
      {/* Overlay mờ — nhấp ngoài để đóng */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* ── Modal Card (animate slide-up + fade-in) ── */}
      <div
        className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-900/20
                   overflow-hidden
                   animate-[modalSlideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        style={{
          // Fallback nếu Tailwind chưa có keyframe này
          animation: 'modalSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {/* Thanh accent màu gradient trên cùng */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-secondary to-primary-container" />

        {/* ── Nút đóng ── */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700
                     hover:bg-slate-100 transition-all z-10"
          aria-label="Đóng modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ══════════════════════════════════════════════
            BƯỚC 1: NHẬP EMAIL
        ══════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="px-7 pt-7 pb-8 flex flex-col gap-6">

            {/* Header */}
            <div className="flex flex-col items-center text-center gap-3">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center
                              shadow-inner shadow-primary/10">
                <Mail className="w-8 h-8 text-primary" />
              </div>

              <div>
                <h2
                  id="forgot-pw-modal-title"
                  className="text-xl font-extrabold text-slate-900 tracking-tight"
                >
                  Quên mật khẩu?
                </h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
                  Nhập email tài khoản SmartZone của bạn — chúng tôi sẽ gửi mã xác thực OTP ngay lập tức.
                </p>
              </div>
            </div>

            {/* Stepper mini */}
            <StepIndicator currentStep={1} />

            {/* Form Email */}
            <form onSubmit={handleSendOtp} noValidate className="flex flex-col gap-4">

              {/* Lỗi từ API */}
              {emailError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50
                             border border-red-200 text-red-600 text-sm"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                  <span>{emailError}</span>
                </div>
              )}

              {/* Ô nhập email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="forgot-email-input"
                  className="text-sm font-semibold text-slate-700"
                >
                  Địa chỉ Email <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    ref={emailInputRef}
                    id="forgot-email-input"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="Nhập địa chỉ email của bạn"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    onBlur={() => setEmailTouched(true)}
                    disabled={isSendingOtp}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium text-slate-800
                               bg-slate-50 border transition-all outline-none
                               placeholder:text-slate-400
                               focus:bg-white focus:ring-2 focus:ring-primary/30
                               disabled:opacity-60 disabled:cursor-not-allowed
                               ${
                                 emailFieldError || emailError
                                   ? 'border-red-400 focus:ring-red-200'
                                   : 'border-slate-200 focus:border-primary'
                               }`}
                  />
                </div>
                {emailFieldError && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" />
                    {emailFieldError}
                  </p>
                )}
              </div>

              {/* Nút Gửi mã OTP */}
              <button
                type="submit"
                disabled={isSendingOtp}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white
                           bg-gradient-to-r from-primary to-primary-container
                           shadow-lg shadow-primary/25
                           hover:shadow-primary/40 hover:scale-[1.008]
                           active:scale-[0.985] transition-all
                           flex items-center justify-center gap-2
                           disabled:opacity-70 disabled:cursor-not-allowed
                           disabled:hover:scale-100 disabled:hover:shadow-primary/25"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang gửi mã OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Gửi mã OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Link quay lại Đăng nhập */}
              <p className="text-center text-sm text-slate-500">
                Nhớ ra mật khẩu rồi?{' '}
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-primary font-semibold hover:underline transition-colors"
                >
                  Quay lại đăng nhập
                </button>
              </p>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            BƯỚC 2: NHẬP OTP
        ══════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="px-7 pt-7 pb-8 flex flex-col gap-6">

            {/* Header */}
            <div className="flex flex-col items-center text-center gap-3">
              {/* Icon */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center
                                shadow-inner shadow-primary/10">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                {/* Ping dot */}
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary" />
                </span>
              </div>

              <div>
                <h2
                  id="forgot-pw-modal-title"
                  className="text-xl font-extrabold text-slate-900 tracking-tight"
                >
                  Nhập mã xác thực OTP
                </h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Mã gồm <strong className="text-slate-700 font-semibold">6 chữ số</strong> đã được gửi đến
                </p>
                {/* Email pill */}
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                bg-primary/10 border border-primary/20 max-w-full">
                  <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm font-bold text-primary truncate max-w-[220px]">
                    {email}
                  </span>
                  <span className="text-slate-300 font-light">|</span>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setOtpError(''); }}
                    className="text-xs font-semibold text-primary hover:text-primary/70
                               transition-colors shrink-0 flex items-center gap-0.5"
                    title="Đổi địa chỉ email"
                  >
                    Đổi email
                  </button>
                </div>
              </div>
            </div>

            {/* Stepper mini */}
            <StepIndicator currentStep={2} />

            {/* ── Đồng hồ đếm ngược hết hạn OTP ── */}
            <div className="flex items-center justify-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-mono font-bold text-base
                            border transition-all
                            ${
                              countdownExpired
                                ? 'bg-red-50 border-red-200 text-red-600'
                                : countdownUrgent
                                  ? 'bg-amber-50 border-amber-200 text-amber-600 animate-pulse'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
              >
                {/* Icon đồng hồ quay */}
                <svg
                  className={`w-4 h-4 ${countdownExpired ? 'text-red-500' : countdownUrgent ? 'text-amber-500' : 'text-slate-500'}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {countdownExpired ? (
                  <span className="text-sm font-semibold">Mã đã hết hạn</span>
                ) : (
                  <span>{formatTime(otpCountdown)}</span>
                )}
              </div>
              {!countdownExpired && (
                <span className="text-xs text-slate-400">còn lại</span>
              )}
            </div>

            {/* Form OTP */}
            <form onSubmit={handleVerifyOtp} className="flex flex-col items-center gap-5">

              {/* 6 ô OTP */}
              <div className="flex items-center justify-center gap-2 w-full">
                {otpDigits.map((digit, index) => {
                  const isFilled = digit !== '';
                  return (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      placeholder="·"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      disabled={isVerifyingOtp}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      onFocus={(e) => e.target.select()}
                      className={`
                        w-11 h-14 text-center text-2xl font-extrabold rounded-xl
                        border-2 outline-none transition-all select-all
                        placeholder:text-slate-300
                        disabled:opacity-60 disabled:cursor-not-allowed
                        ${
                          otpError
                            ? 'border-red-400 bg-red-50 text-red-600'
                            : isFilled
                              ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                              : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'
                        }
                      `}
                    />
                  );
                })}
              </div>

              {/* Error OTP */}
              {otpError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50
                             border border-red-200 text-red-600 text-sm w-full"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              {/* ── Gửi lại mã + Cooldown ── */}
              <div className="flex flex-col items-center gap-1.5 w-full text-center">
                <p className="text-sm text-slate-500">
                  Không nhận được mã?
                </p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isResending}
                  className={`
                    flex items-center gap-1.5 text-sm font-semibold transition-all
                    rounded-lg px-3 py-1.5
                    ${
                      resendCooldown > 0 || isResending
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-primary hover:text-primary/80 hover:bg-primary/5 cursor-pointer'
                    }
                  `}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang gửi lại...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>
                        Gửi lại mã{' '}
                        <span className="font-mono font-bold text-slate-500">
                          ({resendCooldown}s)
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Gửi lại mã OTP mới</span>
                    </>
                  )}
                </button>

                {/* Spam reminder */}
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Hãy kiểm tra thư mục{' '}
                  <strong className="text-slate-500 font-semibold">Spam / Thư rác</strong>
                </p>
              </div>

              {/* ── Nút Xác nhận OTP ── */}
              <button
                type="submit"
                disabled={isVerifyingOtp || countdownExpired}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white
                           bg-gradient-to-r from-primary to-primary-container
                           shadow-lg shadow-primary/25
                           hover:shadow-primary/40 hover:scale-[1.008]
                           active:scale-[0.985] transition-all
                           flex items-center justify-center gap-2
                           disabled:opacity-60 disabled:cursor-not-allowed
                           disabled:hover:scale-100"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang xác thực OTP...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Xác nhận mã OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Nút quay lại */}
              <button
                type="button"
                onClick={() => { setStep(1); setOtpError(''); setEmail(''); setEmailTouched(false); setEmailError(''); }}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium
                           flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Quay lại nhập email
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Keyframe CSS nhúng inline */}
      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
};

// ─── Sub-component: Step Indicator ────────────────────────────────────────────
const StepIndicator = ({ currentStep }) => (
  <div className="flex items-center justify-center gap-0">
    {/* Bước 1 */}
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    transition-all shadow-sm
                    ${currentStep >= 1
                      ? currentStep > 1
                        ? 'bg-emerald-500 text-white'
                        : 'bg-primary text-white ring-4 ring-primary/20'
                      : 'bg-slate-100 text-slate-400'
                    }`}
      >
        {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
      </div>
      <span className={`text-xs font-semibold hidden sm:inline
                        ${currentStep >= 1 ? (currentStep > 1 ? 'text-emerald-600' : 'text-primary') : 'text-slate-400'}`}>
        Nhập Email
      </span>
    </div>

    {/* Thanh nối */}
    <div className="flex-1 mx-3 h-0.5 w-16 rounded-full overflow-hidden bg-slate-200">
      <div
        className={`h-full transition-all duration-500 rounded-full
                    ${currentStep > 1 ? 'w-full bg-primary' : 'w-0'}`}
      />
    </div>

    {/* Bước 2 */}
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    transition-all shadow-sm
                    ${currentStep >= 2
                      ? 'bg-primary text-white ring-4 ring-primary/20'
                      : 'bg-slate-100 text-slate-400'
                    }`}
      >
        2
      </div>
      <span className={`text-xs font-semibold hidden sm:inline
                        ${currentStep >= 2 ? 'text-primary' : 'text-slate-400'}`}>
        Nhập OTP
      </span>
    </div>
  </div>
);

export default ForgotPasswordModal;

