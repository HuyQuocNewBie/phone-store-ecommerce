import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Loader2, X, Mail, ShieldCheck, KeyRound, ArrowRight, RotateCcw,
  AlertCircle, CheckCircle2, Eye, EyeOff, Lock,
} from 'lucide-react';

// ─── Hằng số thời gian ─────────────────────────────────────────────────────
const OTP_TTL_SECONDS     = 300; // 5 phút hết hạn OTP
const RESEND_COOLDOWN_SEC =  60; // Cooldown 60s nút "Gửi lại mã"
const MAX_OTP_ATTEMPTS    =   5; // Tối đa 5 lần nhập sai OTP
const EMAIL_REGEX         = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Điều kiện mật khẩu ─────────────────────────────────────────────────────
const PW_RULES = [
  { id: 'length',   label: 'Ít nhất 8 ký tự',           test: (v) => v.length >= 8 },
  { id: 'upper',    label: 'Có ít nhất 1 chữ hoa (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { id: 'number',   label: 'Có ít nhất 1 chữ số (0-9)',  test: (v) => /[0-9]/.test(v) },
  { id: 'special',  label: 'Có ít nhất 1 ký tự đặc biệt (!@#…)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/** Tính điểm mạnh mật khẩu: 0–4 */
const calcStrength = (value) => PW_RULES.reduce((acc, r) => acc + (r.test(value) ? 1 : 0), 0);

/**
 * ForgotPasswordModal — SmartZone Ecommerce
 *
 * Bước 1: Nhập Email → Gửi mã OTP
 * Bước 2: Nhập 6 ô OTP → Xác thực
 * Bước 3: Đặt mật khẩu mới → Hoàn tất
 *
 * Props:
 *  - isOpen         {boolean}   : Hiển thị / ẩn modal
 *  - onClose        {function}  : Callback đóng modal
 *  - onVerified     {function}  : (Không còn dùng để điều hướng ngoài, giữ để tương thích ngược)
 *  - onResetSuccess {function}  : Callback sau khi đổi mật khẩu thành công
 *                                 Nhận { email } để trang Login tự điền email
 */
const ForgotPasswordModal = ({ isOpen, onClose, onVerified, onResetSuccess }) => {
  // ── Bước hiện tại: 1 = Nhập Email, 2 = Nhập OTP, 3 = Đặt mật khẩu mới ──
  const [step, setStep] = useState(1);

  // ── Bước 1: Email ────────────────────────────────────────────────────────
  const [email, setEmail]               = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [emailError, setEmailError]     = useState('');

  // ── Bước 2: OTP ──────────────────────────────────────────────────────────
  const [otpDigits, setOtpDigits]           = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError]             = useState('');
  const [otpAttempts, setOtpAttempts]       = useState(0); // Đếm số lần nhập sai OTP
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResending, setIsResending]       = useState(false);

  // ── Đồng hồ đếm ngược hết hạn OTP (5 phút) ──────────────────────────────
  const [otpCountdown, setOtpCountdown] = useState(OTP_TTL_SECONDS);

  // ── Trạng thái biên OTP ──────────────────────────────────────────────────
  const isOtpLocked      = otpAttempts >= MAX_OTP_ATTEMPTS;
  const countdownExpired = otpCountdown <= 0;

  // ── Cooldown 60s nút "Gửi lại mã" ───────────────────────────────────────
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Bước 3: Reset Password ───────────────────────────────────────────────
  const [resetToken, setResetToken]             = useState('');
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [showNewPw, setShowNewPw]               = useState(false);
  const [showConfirmPw, setShowConfirmPw]       = useState(false);
  const [isResettingPw, setIsResettingPw]       = useState(false);
  const [resetPwError, setResetPwError]         = useState('');
  const [pwTouched, setPwTouched]               = useState(false);
  const [confirmTouched, setConfirmTouched]     = useState(false);
  const pwStrength                              = calcStrength(newPassword);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const emailInputRef   = useRef(null);
  const newPwInputRef   = useRef(null);
  const otpInputRefs    = useRef([]);
  const otpIntervalRef  = useRef(null);
  const resendIntervalRef = useRef(null);

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

  // ── Auto-focus ô mật khẩu khi vào Bước 3 ────────────────────────────────
  useEffect(() => {
    if (step === 3) {
      const t = setTimeout(() => newPwInputRef.current?.focus(), 150);
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
        if (prev <= 1) {
          clearInterval(otpIntervalRef.current);
          setOtpError('Mã OTP đã hết hiệu lực sau 5 phút. Vui lòng bấm "Gửi lại mã OTP" để nhận mã mới.');
          return 0;
        }
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

  // ── Kiểm tra điều kiện mật khẩu ─────────────────────────────────────────
  const allRulesPassed   = PW_RULES.every((r) => r.test(newPassword));
  const passwordsMatch   = newPassword === confirmPassword && confirmPassword !== '';
  const confirmError     = confirmTouched && confirmPassword && !passwordsMatch
    ? 'Mật khẩu xác nhận không khớp.'
    : '';
  const canSubmitReset   = allRulesPassed && passwordsMatch && !isResettingPw;

  // ── Màu sắc thanh độ mạnh ────────────────────────────────────────────────
  const strengthMeta = (() => {
    if (!newPassword) return { label: '', color: 'bg-slate-200', textColor: 'text-slate-400', bars: 0 };
    if (pwStrength <= 1) return { label: 'Rất yếu',  color: 'bg-red-500',    textColor: 'text-red-500',    bars: 1 };
    if (pwStrength === 2) return { label: 'Yếu',      color: 'bg-orange-400', textColor: 'text-orange-500', bars: 2 };
    if (pwStrength === 3) return { label: 'Trung bình', color: 'bg-yellow-400', textColor: 'text-yellow-600', bars: 3 };
    return                       { label: 'Mạnh',     color: 'bg-emerald-500', textColor: 'text-emerald-600', bars: 4 };
  })();

  // ── Reset toàn bộ state về ban đầu ───────────────────────────────────────
  const resetAll = useCallback(() => {
    setStep(1);
    setEmail('');
    setEmailTouched(false);
    setIsSendingOtp(false);
    setEmailError('');
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setOtpAttempts(0);
    setIsVerifyingOtp(false);
    setIsResending(false);
    setOtpCountdown(OTP_TTL_SECONDS);
    setResendCooldown(0);
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPw(false);
    setShowConfirmPw(false);
    setIsResettingPw(false);
    setResetPwError('');
    setPwTouched(false);
    setConfirmTouched(false);
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
      let res;
      try {
        res = await api.post('/auth/forgot-password/send-otp', { email: email.trim().toLowerCase() });
      } catch (err1) {
        if (err1.response?.status === 404) {
          try {
            res = await api.post('/auth/send-otp', { email: email.trim().toLowerCase() });
          } catch (err2) {
            if (err2.response?.status === 404) {
              res = await api.post('/auth/forgot-password', {
                Email: email.trim().toLowerCase(),
                email: email.trim().toLowerCase(),
              });
            } else {
              throw err2;
            }
          }
        } else {
          throw err1;
        }
      }

      if (res.data?.success) {
        toast.success(res.data.message || 'Mã OTP đã được gửi đến email của bạn!', {
          id: 'send-otp-success',
        });
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        setOtpAttempts(0);
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
      let res;
      try {
        res = await api.post('/auth/forgot-password/send-otp', { email: email.trim().toLowerCase() });
      } catch (err1) {
        if (err1.response?.status === 404) {
          try {
            res = await api.post('/auth/send-otp', { email: email.trim().toLowerCase() });
          } catch (err2) {
            if (err2.response?.status === 404) {
              res = await api.post('/auth/forgot-password', {
                Email: email.trim().toLowerCase(),
                email: email.trim().toLowerCase(),
              });
            } else {
              throw err2;
            }
          }
        } else {
          throw err1;
        }
      }

      if (res.data?.success) {
        toast.success('Mã OTP mới đã được gửi đến email của bạn!', { id: 'resend-otp-success' });
        setOtpDigits(['', '', '', '', '', '']);
        setOtpAttempts(0); // Reset số lần thử sai khi đã gửi mã mới!
        setOtpCountdown(OTP_TTL_SECONDS);
        clearInterval(otpIntervalRef.current);
        otpIntervalRef.current = setInterval(() => {
          setOtpCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(otpIntervalRef.current);
              setOtpError('Mã OTP đã hết hiệu lực sau 5 phút. Vui lòng bấm "Gửi lại mã OTP" để nhận mã mới.');
              return 0;
            }
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

  // ─── Xử lý thất bại khi xác thực OTP (Đếm số lần thử) ────────────────────
  const handleOtpFailure = (serverMsg, status) => {
    const isLockedByBackend =
      status === 429 ||
      (serverMsg && (serverMsg.includes('5 lần') || serverMsg.includes('quá 5 lần')));

    const nextAttempts = isLockedByBackend ? MAX_OTP_ATTEMPTS : otpAttempts + 1;
    setOtpAttempts(nextAttempts);

    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      const lockMsg =
        'Bạn đã nhập sai OTP 5 lần! Ô nhập mã đã bị vô hiệu hóa. Bắt buộc bấm "Gửi lại mã OTP" để nhận mã mới.';
      setOtpError(lockMsg);
      toast.error(lockMsg, { id: 'otp-locked-error', duration: 6000 });
    } else {
      const remaining = MAX_OTP_ATTEMPTS - nextAttempts;
      const failMsg = serverMsg || 'Mã OTP không chính xác hoặc đã hết hiệu lực.';
      const displayMsg = `${failMsg} (Còn ${remaining} lần thử)`;
      setOtpError(displayMsg);
      toast.error(displayMsg, { id: 'verify-otp-error' });
      // Reset các ô OTP để người dùng nhập lại từ đầu
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  };

  // ─── BƯỚC 2: Xử lý nhập OTP ──────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (isOtpLocked || countdownExpired) return;

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
    if (isOtpLocked || countdownExpired) return;

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
    if (isOtpLocked || countdownExpired) {
      e.preventDefault();
      return;
    }

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

  // ─── BƯỚC 2: Xác thực OTP → Chuyển sang Bước 3 ───────────────────────────
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setOtpError('');

    // Edge case 1: Đã nhập sai 5 lần -> bị khóa
    if (isOtpLocked) {
      const msg = 'Bạn đã nhập sai OTP 5 lần! Bắt buộc bấm "Gửi lại mã OTP" để nhận mã mới.';
      setOtpError(msg);
      toast.error(msg, { id: 'otp-locked-error' });
      return;
    }

    // Edge case 2: OTP đã hết hạn sau 5 phút
    if (countdownExpired || otpCountdown <= 0) {
      const msg = 'Mã OTP đã hết hiệu lực sau 5 phút. Vui lòng bấm "Gửi lại mã OTP" để nhận mã mới.';
      setOtpError(msg);
      toast.error(msg, { id: 'otp-expired-error' });
      return;
    }

    const otpCode = otpDigits.join('').trim();

    if (otpCode.length < 6) {
      const msg = 'Vui lòng nhập đủ 6 chữ số mã OTP!';
      setOtpError(msg);
      toast.error(msg, { id: 'otp-incomplete-error' });
      const emptyIdx = otpDigits.findIndex((d) => !d);
      if (emptyIdx !== -1) otpInputRefs.current[emptyIdx]?.focus();
      return;
    }

    setIsVerifyingOtp(true);
    try {
      let res;
      try {
        res = await api.post('/auth/forgot-password/verify-otp', {
          email: email.trim().toLowerCase(),
          otp: otpCode,
          otp_code: otpCode,
          purpose: 'forgot_password',
        });
      } catch (err1) {
        if (err1.response?.status === 404) {
          res = await api.post('/auth/verify-otp', {
            email: email.trim().toLowerCase(),
            otp: otpCode,
            otp_code: otpCode,
            purpose: 'forgot_password',
          });
        } else {
          throw err1;
        }
      }

      if (res.data?.success) {
        const token =
          res.data?.data?.resetToken ||
          res.data?.data?.token ||
          res.data?.resetToken ||
          '';
        toast.success(
          res.data.message || 'Xác thực OTP thành công! Hãy đặt mật khẩu mới.',
          { id: 'verify-otp-success', duration: 3000 }
        );
        // Reset số lần thử sai
        setOtpAttempts(0);
        // Lưu resetToken và chuyển sang Bước 3 (thay vì đóng modal)
        setResetToken(token);
        setNewPassword('');
        setConfirmPassword('');
        setPwTouched(false);
        setConfirmTouched(false);
        setResetPwError('');
        setStep(3);
        // Gọi callback ngược lại để tương thích (nếu có)
        onVerified?.({ email: email.trim().toLowerCase(), resetToken: token });
      } else {
        handleOtpFailure(res.data?.message);
      }
    } catch (err) {
      const status = err.response?.status;
      const apiMsg = err.response?.data?.message;
      handleOtpFailure(apiMsg, status);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ─── BƯỚC 3: Đặt mật khẩu mới ────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    setPwTouched(true);
    setConfirmTouched(true);
    setResetPwError('');

    if (!allRulesPassed) {
      setResetPwError('Mật khẩu chưa đáp ứng đủ các điều kiện bên dưới.');
      newPwInputRef.current?.focus();
      return;
    }
    if (!passwordsMatch) {
      setResetPwError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsResettingPw(true);
    try {
      let res;
      try {
        res = await api.post('/auth/forgot-password/reset-password', {
          resetToken,
          token: resetToken,
          newPassword,
          password: newPassword,
          email: email.trim().toLowerCase(),
        });
      } catch (err1) {
        if (err1.response?.status === 404) {
          res = await api.post('/auth/reset-password', {
            resetToken,
            token: resetToken,
            newPassword,
            password: newPassword,
            email: email.trim().toLowerCase(),
          });
        } else {
          throw err1;
        }
      }

      if (res.data?.success) {
        toast.success(
          res.data.message || 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.',
          { id: 'reset-pw-success', duration: 5000 }
        );
        // Callback trả email để trang Login tự điền
        onResetSuccess?.({ email: email.trim().toLowerCase() });
        handleClose();
      } else {
        const msg = res.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
        setResetPwError(msg);
        toast.error(msg, { id: 'reset-pw-error' });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Đặt lại mật khẩu thất bại. Liên kết có thể đã hết hạn, vui lòng thử lại từ đầu.';
      setResetPwError(msg);
      toast.error(msg, { id: 'reset-pw-error' });
    } finally {
      setIsResettingPw(false);
    }
  };

  // ─── Không render nếu modal đóng ─────────────────────────────────────────
  if (!isOpen) return null;

  // ─── Màu đồng hồ hết hạn ─────────────────────────────────────────────────
  const countdownUrgent = otpCountdown <= 60 && otpCountdown > 0;

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
                      disabled={isVerifyingOtp || isOtpLocked || countdownExpired}
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
                          isOtpLocked
                            ? 'border-red-300 bg-red-50 text-slate-400 cursor-not-allowed'
                            : countdownExpired
                              ? 'border-amber-200 bg-amber-50 text-slate-400 cursor-not-allowed'
                              : otpError
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

              {/* ── Banners thông báo trạng thái & Lỗi biên ── */}
              {isOtpLocked && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200
                             text-red-700 text-xs sm:text-sm w-full animate-shake shadow-xs"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-red-900">Đã nhập sai OTP 5 lần!</p>
                    <p className="mt-0.5 text-red-700 text-xs leading-relaxed">
                      Ô nhập mã đã bị vô hiệu hóa vì lý do bảo mật. Bắt buộc bấm{' '}
                      <strong className="underline font-bold">"Gửi lại mã OTP"</strong> bên dưới để nhận mã mới.
                    </p>
                  </div>
                </div>
              )}

              {countdownExpired && !isOtpLocked && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200
                             text-amber-800 text-xs sm:text-sm w-full shadow-xs"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-900">Mã OTP đã hết hiệu lực</p>
                    <p className="mt-0.5 text-amber-700 text-xs leading-relaxed">
                      Thời hạn 5 phút của mã OTP đã kết thúc. Nút xác nhận đã được tự động vô hiệu hóa. Vui lòng bấm{' '}
                      <strong>"Gửi lại mã OTP mới"</strong> để lấy mã khác.
                    </p>
                  </div>
                </div>
              )}

              {otpError && !isOtpLocked && !countdownExpired && (
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
                  {isOtpLocked ? 'Cần mã mới để tiếp tục:' : 'Không nhận được mã?'}
                </p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isResending}
                  className={`
                    flex items-center gap-1.5 text-sm font-semibold transition-all
                    rounded-xl px-4 py-2
                    ${
                      isOtpLocked
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 ring-2 ring-red-400 font-bold shadow-sm'
                        : resendCooldown > 0 || isResending
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
                      <span>{isOtpLocked ? 'Bấm vào đây để nhận mã OTP mới' : 'Gửi lại mã OTP mới'}</span>
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

              {/* ── Nút Xác nhận OTP (Vô hiệu hóa khi hết hạn 5 phút hoặc nhập sai 5 lần) ── */}
              <button
                type="submit"
                disabled={isVerifyingOtp || countdownExpired || isOtpLocked || otpDigits.join('').trim().length < 6}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white
                           bg-gradient-to-r from-primary to-primary-container
                           shadow-lg shadow-primary/25
                           hover:shadow-primary/40 hover:scale-[1.008]
                           active:scale-[0.985] transition-all
                           flex items-center justify-center gap-2
                           disabled:opacity-50 disabled:cursor-not-allowed
                           disabled:hover:scale-100 disabled:shadow-none"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang xác thực OTP...</span>
                  </>
                ) : isOtpLocked ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Đã khóa (Nhập sai 5 lần)</span>
                  </>
                ) : countdownExpired ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Mã OTP đã hết hạn</span>
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

        {/* ══════════════════════════════════════════════
            BƯỚC 3: ĐẶT MẬT KHẨU MỚI
        ══════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="px-7 pt-7 pb-8 flex flex-col gap-6">

            {/* Header */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center
                              shadow-inner shadow-emerald-500/10">
                <Lock className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2
                  id="forgot-pw-modal-title"
                  className="text-xl font-extrabold text-slate-900 tracking-tight"
                >
                  Đặt mật khẩu mới
                </h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
                  Tạo mật khẩu mạnh để bảo vệ tài khoản <strong className="text-slate-700">{email}</strong>
                </p>
              </div>
            </div>

            {/* Stepper mini */}
            <StepIndicator currentStep={3} />

            {/* Form đặt mật khẩu mới */}
            <form onSubmit={handleResetPassword} noValidate className="flex flex-col gap-5">

              {/* Lỗi tổng từ API hoặc validate */}
              {resetPwError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50
                             border border-red-200 text-red-600 text-sm"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                  <span>{resetPwError}</span>
                </div>
              )}

              {/* ── Ô Mật khẩu mới ── */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-password-input" className="text-sm font-semibold text-slate-700">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    ref={newPwInputRef}
                    id="new-password-input"
                    type={showNewPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Nhập mật khẩu mới"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (resetPwError) setResetPwError('');
                    }}
                    onBlur={() => setPwTouched(true)}
                    disabled={isResettingPw}
                    className={`w-full pl-10 pr-12 py-3 rounded-xl text-sm font-medium text-slate-800
                               bg-slate-50 border transition-all outline-none
                               placeholder:text-slate-400
                               focus:bg-white focus:ring-2 focus:ring-primary/30
                               disabled:opacity-60 disabled:cursor-not-allowed
                               ${
                                 pwTouched && !allRulesPassed
                                   ? 'border-red-400 focus:ring-red-200'
                                   : pwTouched && allRulesPassed
                                     ? 'border-emerald-400 focus:ring-emerald-200'
                                     : 'border-slate-200 focus:border-primary'
                               }`}
                  />
                  {/* Toggle icon mắt */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPw((v) => !v)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showNewPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showNewPw
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye    className="w-4 h-4" />
                    }
                  </button>
                </div>

                {/* ── Thanh đo độ mạnh mật khẩu ── */}
                {newPassword && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {/* 4 thanh bar */}
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300
                                      ${bar <= strengthMeta.bars ? strengthMeta.color : 'bg-slate-200'}`}
                        />
                      ))}
                    </div>
                    {/* Label độ mạnh */}
                    <p className={`text-xs font-semibold ${strengthMeta.textColor}`}>
                      Độ mạnh: {strengthMeta.label}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Ô Xác nhận mật khẩu ── */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirm-password-input" className="text-sm font-semibold text-slate-700">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="confirm-password-input"
                    type={showConfirmPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (resetPwError) setResetPwError('');
                    }}
                    onBlur={() => setConfirmTouched(true)}
                    disabled={isResettingPw}
                    className={`w-full pl-10 pr-12 py-3 rounded-xl text-sm font-medium text-slate-800
                               bg-slate-50 border transition-all outline-none
                               placeholder:text-slate-400
                               focus:bg-white focus:ring-2 focus:ring-primary/30
                               disabled:opacity-60 disabled:cursor-not-allowed
                               ${
                                 confirmError
                                   ? 'border-red-400 focus:ring-red-200'
                                   : confirmTouched && passwordsMatch
                                     ? 'border-emerald-400 focus:ring-emerald-200'
                                     : 'border-slate-200 focus:border-primary'
                               }`}
                  />
                  {/* Toggle icon mắt */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPw((v) => !v)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showConfirmPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirmPw
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye    className="w-4 h-4" />
                    }
                  </button>
                </div>
                {/* Lỗi xác nhận không khớp */}
                {confirmError && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" />
                    {confirmError}
                  </p>
                )}
                {/* Khớp rồi */}
                {confirmTouched && passwordsMatch && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Mật khẩu khớp!
                  </p>
                )}
              </div>

              {/* ── Danh sách điều kiện ── */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Yêu cầu mật khẩu
                </p>
                {PW_RULES.map((rule) => {
                  const passed = rule.test(newPassword);
                  return (
                    <div key={rule.id} className="flex items-center gap-2">
                      <span
                        className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center
                                    transition-all duration-200
                                    ${passed
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-slate-200 text-slate-400'
                                    }`}
                      >
                        {passed
                          ? <CheckCircle2 className="w-3 h-3" />
                          : <span className="w-1.5 h-1.5 rounded-full bg-slate-400 block" />
                        }
                      </span>
                      <span
                        className={`text-xs font-medium transition-colors duration-200
                                    ${passed ? 'text-emerald-700' : 'text-slate-500'}`}
                      >
                        {rule.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ── Nút Hoàn tất ── */}
              <button
                type="submit"
                disabled={!canSubmitReset}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white
                           bg-gradient-to-r from-emerald-500 to-teal-500
                           shadow-lg shadow-emerald-500/25
                           hover:shadow-emerald-500/40 hover:scale-[1.008]
                           active:scale-[0.985] transition-all
                           flex items-center justify-center gap-2
                           disabled:opacity-50 disabled:cursor-not-allowed
                           disabled:hover:scale-100 disabled:hover:shadow-emerald-500/25"
              >
                {isResettingPw ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang đặt lại mật khẩu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Hoàn tất đổi mật khẩu</span>
                  </>
                )}
              </button>

              {/* Nút quay lại */}
              <button
                type="button"
                onClick={() => { setStep(2); setResetPwError(''); }}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium
                           flex items-center justify-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Quay lại nhập OTP
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
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

// ─── Sub-component: Step Indicator (3 Bước) ────────────────────────────────
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

    {/* Thanh nối 1→2 */}
    <div className="flex-1 mx-3 h-0.5 w-10 rounded-full overflow-hidden bg-slate-200">
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
                      ? currentStep > 2
                        ? 'bg-emerald-500 text-white'
                        : 'bg-primary text-white ring-4 ring-primary/20'
                      : 'bg-slate-100 text-slate-400'
                    }`}
      >
        {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
      </div>
      <span className={`text-xs font-semibold hidden sm:inline
                        ${currentStep >= 2 ? (currentStep > 2 ? 'text-emerald-600' : 'text-primary') : 'text-slate-400'}`}>
        Nhập OTP
      </span>
    </div>

    {/* Thanh nối 2→3 */}
    <div className="flex-1 mx-3 h-0.5 w-10 rounded-full overflow-hidden bg-slate-200">
      <div
        className={`h-full transition-all duration-500 rounded-full
                    ${currentStep > 2 ? 'w-full bg-emerald-500' : 'w-0'}`}
      />
    </div>

    {/* Bước 3 */}
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    transition-all shadow-sm
                    ${currentStep >= 3
                      ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                      : 'bg-slate-100 text-slate-400'
                    }`}
      >
        {currentStep >= 3 ? <Lock className="w-3.5 h-3.5" /> : '3'}
      </div>
      <span className={`text-xs font-semibold hidden sm:inline
                        ${currentStep >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
        Mật khẩu mới
      </span>
    </div>
  </div>
);

export default ForgotPasswordModal;
