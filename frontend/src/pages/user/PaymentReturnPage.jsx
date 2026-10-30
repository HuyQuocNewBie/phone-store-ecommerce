import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ShoppingBag,
  Package,
  Copy,
  Check,
  RotateCcw,
  Tag,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { formatOrderCode, formatVND, formatDateTime } from '../../utils/formatters';

/* ─────────────────────────────────────────────
   ZaloPay Logo Component
───────────────────────────────────────────── */
const ZaloPayLogo = ({ className = 'h-5 w-auto' }) => (
  <svg
    viewBox="0 0 130 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Logo ZaloPay"
  >
    <rect x="1" y="2" width="32" height="32" rx="8" fill="#0068FF" />
    <path
      d="M10 11H24L12 24H24"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="23" cy="11.5" r="1.5" fill="#00BA51" />
    <text
      x="39"
      y="24"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      fontSize="18"
      fontWeight="800"
      fill="#0068FF"
      letterSpacing="-0.5"
    >
      Zalo
    </text>
    <text
      x="80"
      y="24"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      fontSize="18"
      fontWeight="800"
      fill="#00BA51"
      letterSpacing="-0.5"
    >
      Pay
    </text>
  </svg>
);

const PaymentReturnPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Ngăn chặn duplicate call trong React 18 StrictMode
  const hasCalled = useRef(false);

  // 1. Phân tích và trích xuất các tham số từ URL ZaloPay / VNPay
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  // Các tham số đặc thù của ZaloPay
  const zaloStatus = searchParams.get('status');
  const apptransid = searchParams.get('apptransid') || searchParams.get('app_trans_id');
  const discountamount = searchParams.get('discountamount') || searchParams.get('discount_amount');
  const rawAmount = searchParams.get('amount');
  const pmcid = searchParams.get('pmcid');
  const bankcode = searchParams.get('bankcode') || searchParams.get('bankCode');
  const appid = searchParams.get('appid');
  const checksum = searchParams.get('checksum');

  // Xác định cổng thanh toán
  const isZaloPay = Boolean(
    apptransid ||
    discountamount !== null ||
    appid ||
    pmcid ||
    searchParams.get('gateway')?.toLowerCase() === 'zalopay' ||
    result?.data?.gateway?.toLowerCase() === 'zalopay' ||
    result?.method?.toLowerCase() === 'zalopay'
  );

  const isVNPay = Boolean(
    searchParams.get('vnp_ResponseCode') ||
    searchParams.get('vnp_TxnRef') ||
    searchParams.get('vnp_SecureHash') ||
    searchParams.get('gateway')?.toLowerCase() === 'vnpay' ||
    result?.data?.gateway?.toLowerCase() === 'vnpay'
  );

  // Trích xuất mã đơn hàng từ apptransid (định dạng YYMMDD_orderId_timestamp)
  const extractOrderIdFromAppTransId = (transId) => {
    if (!transId) return null;
    const parts = String(transId).split('_');
    if (parts.length >= 3 && /^\d{6}$/.test(parts[0])) {
      return parts[1];
    } else if (parts.length === 2) {
      return parts[0];
    }
    return transId;
  };

  // Hiệu ứng pháo hoa Confetti chúc mừng thanh toán thành công
  const triggerCelebration = () => {
    try {
      const count = 180;
      const defaults = {
        origin: { y: 0.65 },
        zIndex: 9999,
      };

      const fire = (particleRatio, opts) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: ['#0068FF', '#00BA51', '#34D399'],
      });
      fire(0.2, {
        spread: 60,
        colors: ['#3B82F6', '#60A5FA', '#1D4ED8'],
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        colors: ['#00BA51', '#FBBF24', '#F43F5E'],
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
        colors: ['#8B5CF6', '#A855F7'],
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
        colors: ['#0068FF', '#00BA51', '#F59E0B'],
      });
    } catch (e) {
      // Bỏ qua nếu confetti không thể chạy
    }
  };

  // Kích hoạt pháo hoa lặp lại trong 2.5s khi thanh toán thành công
  const startCelebrationLoop = () => {
    triggerCelebration();
    const end = Date.now() + 2500;
    const interval = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      try {
        confetti({
          startVelocity: 28,
          spread: 360,
          ticks: 60,
          origin: { x: Math.random() < 0.5 ? 0.15 : 0.85, y: Math.random() * 0.35 + 0.25 },
          colors: ['#0068FF', '#00BA51', '#3B82F6', '#F59E0B', '#EC4899'],
          zIndex: 9999,
          particleCount: 22,
        });
      } catch (e) {}
    }, 350);

    return () => {
      clearInterval(interval);
      try {
        confetti.reset();
      } catch (e) {}
    };
  };

  // 2. Gọi API GET /api/v1/payment/verify-payment để kiểm tra kết quả giao dịch với Backend
  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;

    let cleanupConfetti = null;

    const verify = async () => {
      try {
        setLoading(true);
        const search = location.search;

        if (!search) {
          setError('Không tìm thấy tham số kết quả giao dịch từ cổng thanh toán.');
          setLoading(false);
          return;
        }

        // Gọi Endpoint GET /api/v1/payment/verify-payment với toàn bộ query params trả về từ ZaloPay
        const response = await api.get(`/payment/verify-payment${search}`);
        const resData = response.data;

        setResult(resData);

        // Kích hoạt pháo hoa & dọn dẹp giỏ hàng nếu thanh toán thành công
        const paymentOk = Boolean(resData?.success && (resData?.isSuccess !== undefined ? resData?.isSuccess : resData?.success));
        if (paymentOk) {
          if (typeof clearCart === 'function') {
            clearCart();
          }
          cleanupConfetti = startCelebrationLoop();
        }
      } catch (err) {
        console.error('Lỗi xác thực thanh toán:', err);
        const errData = err.response?.data;
        if (errData) {
          setResult(errData);
        } else {
          setError(err.message || 'Có lỗi xảy ra khi xác thực kết quả thanh toán với máy chủ.');
        }
      } finally {
        setLoading(false);
      }
    };

    verify();

    return () => {
      if (cleanupConfetti) {
        cleanupConfetti();
      }
    };
  }, [location.search, clearCart]);

  // Xác định tên hiển thị của cổng thanh toán
  const gatewayName = useMemo(() => {
    if (isZaloPay) return 'ZaloPay';
    if (isVNPay) return 'VNPay';
    const gw = result?.data?.gateway || result?.method;
    if (gw) {
      const str = String(gw).toUpperCase();
      if (str.includes('ZALO')) return 'ZaloPay';
      if (str.includes('VNPAY')) return 'VNPay';
      return gw;
    }
    return 'ZaloPay';
  }, [isZaloPay, isVNPay, result]);

  // Kiểm tra trạng thái thành công
  const isSuccess = Boolean(
    result?.success &&
    (result?.isSuccess !== undefined ? result?.isSuccess : result?.success)
  );

  const data = result?.data || {};
  const orderInfo = data.order || null;

  // Lấy mã đơn hàng: từ backend response hoặc giải mã từ apptransid hoặc URL param
  const rawOrderId = data.orderId || result?.orderId || searchParams.get('orderId') || extractOrderIdFromAppTransId(apptransid);
  const orderCode = rawOrderId ? formatOrderCode(rawOrderId, orderInfo?.NgayMuaHang) : (data.orderCode || 'N/A');

  // Mã giao dịch: apptransid hoặc transactionNo
  const transactionNo = data.transactionNo || data.transId || result?.transId || apptransid || searchParams.get('vnp_TransactionNo') || 'N/A';

  // Số tiền thanh toán
  const paymentAmount = Number(data.amount || result?.amount || rawAmount || orderInfo?.TongTien || 0);

  // Số tiền giảm giá từ ZaloPay (nếu có)
  const discountAmountNum = Number(discountamount || data.discountAmount || 0);

  // Trạng thái đơn hàng
  const orderStatus = data.orderStatus || orderInfo?.TrangThaiDonHang || (isSuccess ? 'Đang xử lý' : 'Chờ thanh toán');

  // Phương thức chi tiết qua ZaloPay
  const getPmcLabel = (code) => {
    switch (String(code)) {
      case '36': return 'Ví điện tử ZaloPay';
      case '37': return 'Thẻ Visa / MasterCard / JCB';
      case '38': return 'Thẻ ATM nội địa (Napas)';
      case '39': return 'Tài khoản trả sau ZaloPay';
      case '41': return 'Mã QR đa năng ZaloPay';
      default: return 'Ví ZaloPay / ZaloPay QR';
    }
  };

  // Sao chép mã đơn hàng
  const handleCopyOrderId = () => {
    if (orderCode && orderCode !== 'N/A') {
      navigator.clipboard.writeText(String(orderCode));
      setCopied(true);
      toast.success('Đã sao chép mã đơn hàng!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Xử lý nút "Thử lại": Khởi tạo lại giao dịch thanh toán ZaloPay cho đơn hàng
  const handleRetryPayment = async () => {
    if (!rawOrderId) {
      toast.error('Không tìm thấy mã đơn hàng để thử lại. Đang chuyển về trang thanh toán...');
      navigate('/checkout');
      return;
    }

    try {
      setRetrying(true);
      toast.loading('Đang khởi tạo lại liên kết thanh toán...', { id: 'retry-pay' });

      if (isZaloPay || gatewayName === 'ZaloPay') {
        const res = await api.post('/payment/create-zalopay', {
          orderId: rawOrderId,
          amount: paymentAmount > 0 ? paymentAmount : undefined,
          orderInfo: `Thanh toan don hang #${rawOrderId}`
        });
        toast.dismiss('retry-pay');

        const payUrl = res.data?.payUrl || res.data?.order_url || res.data?.data?.payUrl;
        if (res.data?.success && payUrl) {
          toast.success('Đang chuyển hướng tới cổng thanh toán ZaloPay...');
          window.location.href = payUrl;
          return;
        } else {
          toast.error(res.data?.message || 'Không thể tạo liên kết thanh toán ZaloPay mới');
        }
      } else if (isVNPay || gatewayName === 'VNPay') {
        const res = await api.post('/payment/create-vnpay', {
          orderId: rawOrderId,
          amount: paymentAmount > 0 ? paymentAmount : undefined,
          orderInfo: `Thanh toan don hang #${rawOrderId}`
        });
        toast.dismiss('retry-pay');

        const payUrl = res.data?.payUrl || res.data?.paymentUrl || res.data?.url;
        if (res.data?.success && payUrl) {
          toast.success('Đang chuyển hướng tới cổng thanh toán VNPay...');
          window.location.href = payUrl;
          return;
        } else {
          toast.error(res.data?.message || 'Không thể tạo liên kết thanh toán VNPay mới');
        }
      } else {
        toast.dismiss('retry-pay');
        navigate('/checkout');
      }
    } catch (err) {
      toast.dismiss('retry-pay');
      console.error('Lỗi khi thử lại thanh toán:', err);
      const errMsg = err.response?.data?.message || err.message || 'Không thể kết nối lại cổng thanh toán';
      toast.error(errMsg);
      // Chuyển về trang lịch sử đơn hàng để người dùng kiểm tra trạng thái
      setTimeout(() => {
        navigate('/user/orders');
      }, 1500);
    } finally {
      setRetrying(false);
    }
  };

  // Thông báo chi tiết lý do thất bại
  const getFailureReason = () => {
    if (zaloStatus === '-49' || String(zaloStatus) === '-49') {
      return 'Giao dịch đã bị hủy bởi người dùng trên ứng dụng ZaloPay. Đơn hàng của bạn vẫn được lưu lại an toàn với trạng thái "Chờ thanh toán".';
    }
    if (result?.message) {
      return result.message;
    }
    if (error) {
      return error;
    }
    return 'Giao dịch qua cổng thanh toán ZaloPay không thành công hoặc đã bị gián đoạn. Đơn hàng của bạn vẫn được lưu trữ với trạng thái "Chờ thanh toán".';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-16">
        {/* ── Breadcrumb: Trang chủ > Thanh toán > Kết quả thanh toán ── */}
        <div className="max-w-container-max mx-auto w-full pb-unit-sm mb-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
              <span className="material-symbols-outlined text-base leading-none">home</span>
              Trang chủ
            </Link>
            <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
            <Link to="/checkout" className="hover:text-primary transition-colors">Thanh toán</Link>
            <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
            <span className="text-on-surface font-semibold truncate max-w-[200px] sm:max-w-xs">Kết quả thanh toán</span>
          </nav>
        </div>
        {/* ── 1. TRẠNG THÁI LOADING ── */}
        {loading && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 max-w-2xl mx-auto p-8 sm:p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5 animate-pulse">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              Đang xác thực kết quả thanh toán...
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Hệ thống đang đối soát dữ liệu với cổng thanh toán {gatewayName}. Vui lòng không tắt hoặc tải lại trang.
            </p>
          </div>
        )}

        {/* ── 2. CARD KẾT QUẢ THANH TOÁN (THÀNH CÔNG HOẶC THẤT BẠI) ── */}
        {!loading && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 max-w-2xl mx-auto p-6 sm:p-10 text-center">
            {/* ── A. UI KHI THANH TOÁN THÀNH CÔNG ── */}
            {isSuccess ? (
              <>
                {/* Tích xanh + Badge "Giao dịch ZaloPay hoàn tất" */}
                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 shadow-sm">
                    <CheckCircle2 className="w-11 h-11 text-emerald-500 stroke-[2.3]" />
                  </div>
                  <div
                    id="payment-success-badge"
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Giao dịch {gatewayName} hoàn tất</span>
                  </div>
                </div>

                {/* Tiêu đề & Thông điệp thành công */}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2.5">
                  Thanh Toán Thành Công!
                </h1>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                  Cảm ơn bạn đã lựa chọn SmartZone. Giao dịch qua cổng {gatewayName} đã được hoàn tất thành công và đơn hàng của bạn đang được chuẩn bị để giao.
                </p>
              </>
            ) : (
              /* ── B. UI KHI THANH TOÁN THẤT BẠI ── */
              <>
                {/* X đỏ + "Thanh toán ZaloPay thất bại" */}
                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-4 shadow-sm">
                    <XCircle className="w-11 h-11 text-red-500 stroke-[2.3]" />
                  </div>
                  <div
                    id="payment-failed-badge"
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-red-50 text-red-700 border border-red-200/80 shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Thanh toán {gatewayName} thất bại</span>
                  </div>
                </div>

                {/* Tiêu đề "Thanh toán ZaloPay thất bại" */}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2.5">
                  Thanh toán {gatewayName} thất bại
                </h1>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                  {getFailureReason()}
                </p>
              </>
            )}

            {/* ── BẢNG THÔNG TIN CHI TIẾT GIAO DỊCH ── */}
            <div className="bg-slate-50/80 rounded-2xl border border-slate-200/70 p-5 sm:p-6 mb-8 text-left space-y-3.5">
              {/* MÃ ĐƠN HÀNG (Kèm nút bấm sao chép) */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <span className="text-xs sm:text-sm font-medium text-slate-500">Mã đơn hàng</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                    {orderCode}
                  </span>
                  {orderCode && orderCode !== 'N/A' && (
                    <button
                      type="button"
                      onClick={handleCopyOrderId}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 active:scale-95 transition-all"
                      title="Sao chép mã đơn hàng"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* PHƯƠNG THỨC THANH TOÁN */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <span className="text-xs sm:text-sm font-medium text-slate-500">Phương thức thanh toán</span>
                <div className="flex items-center gap-2">
                  {isZaloPay ? (
                    <div className="flex items-center gap-1.5">
                      <ZaloPayLogo className="h-5 w-auto" />
                      {pmcid && (
                        <span className="text-xs text-slate-500 hidden sm:inline">
                          ({getPmcLabel(pmcid)})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">
                      {gatewayName}
                    </span>
                  )}
                </div>
              </div>

              {/* MÃ GIAO DỊCH CỔNG THANH TOÁN (APPMTRANSID) */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <span className="text-xs sm:text-sm font-medium text-slate-500">
                  {isZaloPay ? 'Mã GD ZaloPay (AppTransId)' : 'Mã giao dịch'}
                </span>
                <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs max-w-[220px] sm:max-w-none truncate">
                  {transactionNo}
                </span>
              </div>

              {/* SỐ TIỀN THANH TOÁN */}
              {paymentAmount > 0 && (
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                  <span className="text-xs sm:text-sm font-medium text-slate-500">Số tiền thanh toán</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    {formatVND(paymentAmount)}
                  </span>
                </div>
              )}

              {/* SỐ TIỀN GIẢM GIÁ TỪ ZALOPAY (NẾU CÓ) */}
              {discountAmountNum > 0 && (
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                  <span className="text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Giảm giá từ ZaloPay</span>
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-600">
                    -{formatVND(discountAmountNum)}
                  </span>
                </div>
              )}

              {/* THỜI GIAN GIAO DỊCH */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <span className="text-xs sm:text-sm font-medium text-slate-500">Thời gian thực hiện</span>
                <span className="text-xs sm:text-sm text-slate-700">
                  {formatDateTime(new Date())}
                </span>
              </div>

              {/* TRẠNG THÁI ĐƠN HÀNG */}
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-500">Trạng thái đơn hàng</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isSuccess
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {orderStatus}
                </span>
              </div>
            </div>

            {/* ── HÀNG NÚT BẤM ĐIỀU HƯỚNG ── */}
            {isSuccess ? (
              /* Nút bấm khi Thành Công: "Xem lịch sử đơn hàng" + "Tiếp tục mua sắm" */
              <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3.5">
                <Link
                  to="/products"
                  id="continue-shopping-btn"
                  className="w-full sm:w-1/2 py-3 px-6 rounded-xl font-semibold text-sm border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-center gap-2 group shadow-2xs active:scale-[0.99]"
                >
                  <ShoppingBag className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
                  <span>Tiếp tục mua sắm</span>
                </Link>

                <Link
                  to="/user/orders"
                  id="order-history-btn"
                  className="w-full sm:w-1/2 py-3 px-6 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group active:scale-[0.99]"
                >
                  <Package className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Xem lịch sử đơn hàng</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            ) : (
              /* Nút bấm khi Thất Bại: "Thử lại" + "Xem lịch sử đơn hàng" */
              <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3.5">
                <Link
                  to="/user/orders"
                  id="order-history-btn"
                  className="w-full sm:w-1/2 py-3 px-6 rounded-xl font-semibold text-sm border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-center gap-2 group shadow-2xs active:scale-[0.99]"
                >
                  <Package className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
                  <span>Xem lịch sử đơn hàng</span>
                </Link>

                <button
                  type="button"
                  id="retry-payment-btn"
                  onClick={handleRetryPayment}
                  disabled={retrying}
                  className="w-full sm:w-1/2 py-3 px-6 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm shadow-red-500/25 transition-all flex items-center justify-center gap-2 group active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {retrying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang kết nối lại ZaloPay...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 group-hover:-rotate-45 transition-transform" />
                      <span>Thử lại</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PaymentReturnPage;
