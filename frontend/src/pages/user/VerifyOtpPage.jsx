import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import { Loader2 } from 'lucide-react';

/**
 * VerifyOtpPage — Trang Độc Lập Xác Thực Mã OTP SmartZone
 * Bóc tách và refactor chuẩn JSX từ Stitch AI Design System:
 * - Breadcrumb: Trang chủ / Đăng ký tài khoản / Xác thực mã OTP (Đã xóa badge 256-bit)
 * - Stepper 2 bước: Bước 1 (Hoàn thành) -> Bước 2 (Đang hoạt động)
 * - Main Card: 6 ô nhập mã OTP Array, Countdown Timer 5 phút, nút Đổi email, gửi lại mã, nút Xác nhận & Hoàn tất
 * - Nhận email/phone từ location.state, tự động fallback / redirect nếu truy cập trực tiếp
 * - Đã loại bỏ Banner đặc quyền SmartMember và Hotline bar theo yêu cầu
 * - Giữ lại 3 thẻ bảo mật: Chuẩn PCI-DSS, Không chia sẻ, Thời lượng 5 phút
 */
const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Lấy state truyền từ RegisterPage ──
  const email = location.state?.email || location.state?.Email || '';
  const phone = location.state?.phone || location.state?.soDienThoai || '';
  const username = location.state?.username || location.state?.TaiKhoan || '';
  const password = location.state?.password || location.state?.MatKhau || '';

  // ── State Dãy 6 ô nhập mã OTP ──
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef([]);

  // ── State Thời gian đếm ngược & Loading ──
  const [countdown, setCountdown] = useState(300); // 5 phút = 300 giây
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Fallback hoặc tự động điều hướng về /dang-ky (/register) nếu không có email/phone
  useEffect(() => {
    if (!email && !phone) {
      toast.error('Không tìm thấy thông tin đăng ký. Vui lòng thực hiện từ Bước 1.', {
        id: 'no-register-state',
        duration: 4000
      });
      navigate('/register', { replace: true });
    }
  }, [email, phone, navigate]);

  // Hiển thị fallback email nếu truy cập URL
  const displayTarget = email || phone || 'hoangnam.smart@gmail.com';

  // ── Đồng hồ đếm ngược ──
  useEffect(() => {
    let timerId = null;
    if (countdown > 0) {
      timerId = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [countdown]);

  // Tự động focus ô đầu tiên khi trang tải
  useEffect(() => {
    if (otpInputRefs.current[0]) {
      const focusTimer = setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 200);
      return () => clearTimeout(focusTimer);
    }
  }, []);

  // Format mm:ss
  const formatCountdown = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}s`;
  };

  // ── Xử lý khi nhập từng ô OTP (Tự động nhảy ô kế tiếp) ──
  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal.slice(-1);
    setOtpDigits(newDigits);
    setOtpError('');

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
      otpInputRefs.current[index + 1]?.select();
    }
  };

  // ── Xử lý phím Backspace và mũi tên ──
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // ── Hỗ trợ Paste mã 6 chữ số ──
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');

    if (digits.length > 0) {
      const newDigits = ['', '', '', '', '', ''];
      digits.forEach((d, idx) => {
        if (idx < 6) newDigits[idx] = d;
      });
      setOtpDigits(newDigits);
      setOtpError('');

      const targetIndex = Math.min(digits.length, 5);
      otpInputRefs.current[targetIndex]?.focus();
    }
  };

  // ── Xử lý Xác thực mã OTP ──
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setOtpError('');

    const otpCode = otpDigits.join('').trim();
    if (otpCode.length < 6) {
      const msg = 'Vui lòng nhập đủ 6 chữ số mã xác thực OTP!';
      setOtpError(msg);
      toast.error(msg);
      const emptyIdx = otpDigits.findIndex((d) => !d);
      if (emptyIdx !== -1 && otpInputRefs.current[emptyIdx]) {
        otpInputRefs.current[emptyIdx].focus();
      }
      return;
    }

    if (countdown === 0) {
      const msg = 'Mã OTP đã hết hiệu lực. Vui lòng bấm "Gửi lại mã OTP mới".';
      setOtpError(msg);
      toast.error(msg);
      return;
    }

    setIsVerifying(true);
    try {
      const targetEmail = (email || '').trim().toLowerCase();
      const payload = {
        Email: targetEmail,
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

        toast.success(
          res.data.message || 'Chúc mừng bạn! Tài khoản SmartZone đã được kích hoạt thành công.',
          {
            id: 'otp-verify-success',
            duration: 4000
          }
        );

        navigate('/login', {
          replace: true,
          state: {
            registeredAccount: username || email,
            message: 'Đăng ký tài khoản thành công! Vui lòng nhập mật khẩu để đăng nhập.'
          }
        });
      } else {
        const errMsg = res.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.';
        setOtpError(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        'Mã OTP không chính xác hoặc đã hết hiệu lực. Vui lòng thử lại!';
      setOtpError(errMsg);
      toast.error(errMsg, { id: 'verify-otp-error' });
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Xử lý Gửi lại mã OTP ──
  const handleResendOtp = async () => {
    if (countdown > 240) {
      toast('Vui lòng đợi 60 giây trước khi yêu cầu mã mới.', { icon: '⏳' });
      return;
    }

    setIsResending(true);
    setOtpError('');
    try {
      const targetEmail = (email || '').trim().toLowerCase();
      const payload = {
        TaiKhoan: username || targetEmail.split('@')[0],
        Email: targetEmail,
        MatKhau: password || ''
      };

      const res = await api.post('/auth/register', payload);

      if (res.data?.success) {
        setCountdown(300);
        setOtpDigits(['', '', '', '', '', '']);
        toast.success('Mã OTP mới đã được gửi đến email của bạn!', {
          id: 'resend-otp-success'
        });
        otpInputRefs.current[0]?.focus();
      } else {
        toast.error(res.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lỗi gửi lại mã OTP. Vui lòng thử lại!';
      toast.error(errMsg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased flex flex-col">
      {/* ── Global Navbar ── */}
      <Navbar />

      {/* ── Main Section Bóc Tách từ Stitch AI ── */}
      <main className="w-full bg-surface">
        <div className="flex flex-col w-full">
          <div className="relative w-full overflow-hidden pt-unit-lg pb-unit-xs">
            {/* Ambient geometric glow overlays */}
            <div className="absolute -top-32 -left-24 w-96 h-96 bg-primary-fixed-dim/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-secondary-fixed/40 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-container-max mx-auto px-gutter-desktop">
              {/* Breadcrumb indicator — Đem chuẩn 100% từ RegisterPage / LoginPage qua */}
              <div className="flex items-center gap-unit-xs mb-unit-lg text-on-surface-variant font-body-sm text-body-sm">
                <Link
                  className="hover:text-primary transition-colors flex items-center gap-unit-2xs"
                  to="/"
                >
                  <span className="material-symbols-outlined text-sm leading-none">home</span>
                  Trang chủ
                </Link>
                <span className="text-outline">/</span>
                <Link
                  className="hover:text-primary transition-colors"
                  to="/register"
                >
                  Đăng ký tài khoản
                </Link>
                <span className="text-outline">/</span>
                <span className="text-on-surface font-medium">Xác thực mã OTP</span>
              </div>

              {/* ── 2. Stepper (2 Bước: 1. Thông tin đã xong, 2. Xác thực OTP đang chạy) ── */}
              <div className="max-w-2xl mx-auto mb-unit-xl">
                <div className="bg-surface-container-lowest rounded-2xl shadow-sm px-unit-lg py-unit-md flex items-center justify-center">
                  <div className="flex items-center w-full max-w-lg justify-between">
                    {/* Step 1: Completed */}
                    <button
                      type="button"
                      className="flex items-center gap-unit-sm group cursor-pointer focus:outline-none text-left"
                      onClick={() => navigate('/register')}
                      title="Quay lại Bước 1: Thông tin tài khoản"
                    >
                      <div className="relative flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold shadow-sm transition-transform group-hover:scale-105">
                          <span className="material-symbols-outlined text-xl leading-none">check</span>
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-surface-container-lowest flex items-center justify-center text-on-primary">
                          <span className="material-symbols-outlined text-[10px] font-bold">done</span>
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                          Bước 1
                        </span>
                        <span className="font-body-md text-body-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                          Thông tin tài khoản
                        </span>
                      </div>
                    </button>

                    {/* Connection Bar */}
                    <div className="flex-1 mx-unit-md h-1 bg-gradient-to-r from-primary-fixed to-primary rounded-full relative overflow-hidden">
                      <div className="absolute inset-0 bg-primary w-full animate-pulse opacity-40" />
                    </div>

                    {/* Step 2: Active (Current) */}
                    <div className="flex items-center gap-unit-sm">
                      <div className="relative flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold shadow-md shadow-primary/25 ring-4 ring-primary-fixed/60">
                          2
                        </div>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm text-primary font-bold">Bước 2</span>
                        <span className="font-body-md text-body-md text-primary font-bold">
                          Xác thực OTP
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 3. Main OTP Card (Balanced ~720px) ── */}
              <div className="max-w-2xl mx-auto bg-surface-container-lowest rounded-2xl shadow-xl p-unit-lg md:p-unit-xl relative overflow-hidden">
              {/* Subtle top brand accent line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-primary-container" />

              {/* Header Visual & Heading */}
              <div className="flex flex-col items-center text-center">
                {/* Shield / SMS Key Icon with layered glow */}
                <div className="relative mb-unit-md mt-unit-2xs flex items-center justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-surface-container-low flex items-center justify-center shadow-inner relative z-10">
                    <div className="w-14 h-14 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-lg shadow-primary/30">
                      <span className="material-symbols-outlined text-3xl leading-none">mail</span>
                    </div>
                  </div>
                  {/* Layered badge */}
                  <div className="absolute -bottom-2 -right-2 z-20 w-8 h-8 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center text-secondary">
                    <span
                      className="material-symbols-outlined text-lg leading-none"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified_user
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl -z-0" />
                </div>

                <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight font-extrabold mb-unit-2xs">
                  Xác thực địa chỉ Email
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md leading-relaxed">
                  Mã xác thực OTP gồm{' '}
                  <strong className="text-on-surface font-semibold">6 chữ số</strong> đã được gửi đến
                  hòm thư email của bạn
                </p>

                {/* Email / phone pill with quick change action */}
                <div className="mt-unit-xs inline-flex items-center gap-unit-xs px-unit-md py-unit-2xs rounded-full bg-surface-container-low max-w-full">
                  <span className="material-symbols-outlined text-primary text-base leading-none">
                    mail
                  </span>
                  <span className="font-headline-sm text-body-md sm:text-headline-sm text-primary tracking-wide font-extrabold truncate max-w-[240px] sm:max-w-md">
                    {displayTarget}
                  </span>
                  <span className="text-outline-variant font-light">|</span>
                  <button
                    className="text-primary hover:text-primary-container font-body-sm text-body-sm font-semibold flex items-center gap-unit-2xs transition-colors shrink-0"
                    title="Đổi địa chỉ email nhận mã"
                    type="button"
                    onClick={() => navigate('/register')}
                  >
                    <span className="material-symbols-outlined text-sm leading-none">edit</span>
                    <span>Đổi email</span>
                  </button>
                </div>
              </div>

              {/* OTP Form Container */}
              <form
                className="mt-unit-xl flex flex-col items-center w-full"
                id="otpForm"
                onSubmit={handleVerifyOtp}
              >
                {/* 6 OTP INPUT BOXES */}
                <div className="flex items-center justify-center gap-unit-xs sm:gap-unit-sm w-full max-w-md">
                  {otpDigits.map((digit, index) => {
                    const isFilled = digit !== '';
                    return (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        className={`otp-digit w-12 h-14 sm:w-14 sm:h-16 text-center font-headline-md text-headline-md font-bold rounded-xl shadow-sm focus:outline-none transition-all select-all placeholder:text-outline-variant ${
                          isFilled
                            ? 'bg-surface-container-lowest text-primary ring-2 sm:ring-4 ring-primary-fixed'
                            : 'bg-surface-container-low text-on-surface focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary-fixed focus:text-primary'
                        }`}
                        data-index={index}
                        inputMode="numeric"
                        maxLength={1}
                        type="text"
                        value={digit}
                        placeholder={isFilled ? '' : '•'}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        onFocus={(e) => e.target.select()}
                        autoComplete="one-time-code"
                      />
                    );
                  })}
                </div>

                {/* Error message */}
                {otpError && (
                  <div className="mt-unit-sm text-error text-body-sm font-medium flex items-center gap-unit-2xs">
                    <span className="material-symbols-outlined text-base leading-none">error</span>
                    <span>{otpError}</span>
                  </div>
                )}

                {/* Timer & Resend Controls */}
                <div className="mt-unit-lg flex flex-col items-center gap-unit-xs text-center">
                  <div className="flex items-center gap-unit-2xs font-body-md text-body-md text-on-surface-variant">
                    <span
                      className={`material-symbols-outlined text-primary text-lg leading-none ${
                        countdown > 0 ? 'animate-spin' : ''
                      }`}
                      style={{ animationDuration: '4s' }}
                    >
                      history
                    </span>
                    <span>Không nhận được mã? Gửi lại mã sau</span>
                    <span
                      className={`font-headline-sm text-body-md font-extrabold tracking-wide ${
                        countdown > 0 ? 'text-tertiary-container' : 'text-error'
                      }`}
                      id="countdownTimer"
                    >
                      {countdown > 0 ? formatCountdown(countdown) : 'Hết hiệu lực'}
                    </span>
                  </div>

                  <button
                    className={`font-body-sm text-body-sm font-semibold flex items-center gap-unit-2xs transition-colors ${
                      countdown > 240 || isResending
                        ? 'text-outline cursor-not-allowed opacity-60'
                        : 'text-primary hover:text-primary-container cursor-pointer'
                    }`}
                    id="resendBtn"
                    type="button"
                    disabled={countdown > 240 || isResending}
                    onClick={handleResendOtp}
                  >
                    {isResending ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <span className="material-symbols-outlined text-sm leading-none">refresh</span>
                    )}
                    <span>{isResending ? 'Đang gửi lại...' : 'Gửi lại mã OTP mới'}</span>
                  </button>

                  {/* Spam Folder Reminder */}
                  <div className="pt-unit-xs">
                    <div className="inline-flex items-center gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm">
                      <span className="material-symbols-outlined text-base leading-none text-secondary">
                        info
                      </span>
                      <span>
                        Không tìm thấy thư? Hãy kiểm tra thư mục{' '}
                        <strong className="text-on-surface font-semibold">Spam / Hộp thư rác</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* MAIN CTAs */}
                <div className="mt-unit-xl w-full flex flex-col gap-unit-sm">
                  {/* Primary Submit Button */}
                  <button
                    className="w-full py-unit-md px-unit-lg bg-primary hover:bg-primary-container text-on-primary font-title-card text-title-card font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] transition-all flex items-center justify-center gap-unit-sm group cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-on-primary" />
                        <span>ĐANG XÁC THỰC MÃ OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>XÁC NHẬN &amp; HOÀN TẤT ĐĂNG KÝ</span>
                        <span className="material-symbols-outlined text-xl leading-none group-hover:translate-x-1 transition-transform">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>

                  {/* Back to Step 1 Button */}
                  <div className="flex items-center justify-center gap-unit-md pt-unit-xs">
                    <button
                      type="button"
                      className="font-body-md text-body-md text-on-surface-variant hover:text-primary font-semibold flex items-center gap-unit-2xs py-unit-xs px-unit-sm rounded-lg hover:bg-surface-container transition-colors"
                      onClick={() => navigate('/register')}
                    >
                      <span className="material-symbols-outlined text-base leading-none">
                        arrow_back
                      </span>
                      <span>Quay lại bước nhập thông tin</span>
                    </button>
                    <span className="text-outline-variant font-thin">•</span>
                    <button
                      type="button"
                      className="font-body-md text-body-md text-outline hover:text-on-surface font-medium transition-colors"
                      onClick={() => navigate('/')}
                    >
                      Hủy bỏ
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* ── 4. SECURITY TRUST BADGES (Chỉ giữ lại 3 thẻ bảo mật theo yêu cầu) ── */}
            <div className="max-w-2xl mx-auto mt-unit-lg mb-0 flex flex-col gap-unit-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-unit-md">
                <div className="bg-surface-container-lowest rounded-xl p-unit-md shadow-sm flex items-center gap-unit-sm">
                  <span className="material-symbols-outlined text-2xl leading-none text-primary">
                    verified_user
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="font-title-card text-body-md font-bold text-on-surface">
                      Chuẩn PCI-DSS
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Bảo mật đạt chứng chỉ ngân hàng quốc tế
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-unit-md shadow-sm flex items-center gap-unit-sm">
                  <span className="material-symbols-outlined text-2xl leading-none text-secondary">
                    shield_lock
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="font-title-card text-body-md font-bold text-on-surface">
                      Không chia sẻ
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Tuyệt đối không tiết lộ số cho bên thứ ba
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-unit-md shadow-sm flex items-center gap-unit-sm">
                  <span className="material-symbols-outlined text-2xl leading-none text-tertiary">
                    timer
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="font-title-card text-body-md font-bold text-on-surface">
                      Thời lượng 5 phút
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Mã xác nhận hết hạn tự động để an toàn
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

      {/* ── Global Footer (Tối ưu khoảng cách trên mỏng gọn) ── */}
      <div className="[&>footer]:!mt-6 md:[&>footer]:!mt-8 [&>footer]:!pt-10 md:[&>footer]:!pt-12">
        <Footer />
      </div>
    </div>
  );
};

export default VerifyOtpPage;
