import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
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
  ChevronRight,
  Home
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { formatOrderCode } from '../../utils/formatters';

const PaymentReturnPage = () => {
  const location = useLocation();
  const { clearCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Ngăn chặn duplicate call trong React 18 StrictMode
  const hasCalled = useRef(false);

  // Hiệu ứng pháo hoa Confetti chúc mừng
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
        colors: ['#10B981', '#059669', '#34D399'],
      });
      fire(0.2, {
        spread: 60,
        colors: ['#3B82F6', '#60A5FA', '#1D4ED8'],
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        colors: ['#F59E0B', '#FBBF24', '#F43F5E'],
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
        colors: ['#10B981', '#3B82F6', '#F59E0B'],
      });
    } catch (e) {
      // Ignored if confetti fails
    }
  };

  // Kích hoạt pháo hoa liên tục 2.5s khi thanh toán thành công
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
          colors: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'],
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

        // Gọi Endpoint GET /api/v1/payment/verify-payment với toàn bộ query params
        const response = await api.get(`/payment/verify-payment${search}`);
        const resData = response.data;

        setResult(resData);

        // Kích hoạt pháo hoa & dọn dẹp giỏ hàng nếu thanh toán thành công
        if (resData?.success && (resData?.isSuccess !== undefined ? resData?.isSuccess : resData?.success)) {
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

  const getGatewayDisplayName = (gw) => {
    if (!gw) return 'VNPay';
    const str = String(gw).toUpperCase();
    if (str.includes('VNPAY')) return 'VNPay';
    if (str.includes('MOMO')) return 'MoMo';
    if (str.includes('ZALO')) return 'ZaloPay';
    return gw;
  };

  const isSuccess = Boolean(result?.success && (result?.isSuccess !== undefined ? result?.isSuccess : result?.success));
  const data = result?.data || {};
  const gatewayRaw = data.gateway || result?.method || 'VNPay';
  const gateway = getGatewayDisplayName(gatewayRaw);
  const orderId = data.orderId || result?.orderId;
  const orderInfo = data.order || null;
  const orderCode = orderId ? formatOrderCode(orderId, orderInfo?.NgayMuaHang) : (data.orderCode || 'N/A');
  const transactionNo = data.transactionNo || data.transId || result?.transId || 'N/A';
  const orderStatus = data.orderStatus || orderInfo?.TrangThaiDonHang || (isSuccess ? 'Đang xử lý' : 'Thất bại');

  // Sao chép mã đơn hàng
  const handleCopyOrderId = () => {
    if (orderCode && orderCode !== 'N/A') {
      navigator.clipboard.writeText(String(orderCode));
      setCopied(true);
      toast.success('Đã sao chép mã đơn hàng!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Lý do thất bại chi tiết
  const failureReason = result?.message || error || 'Giao dịch bị từ chối hoặc người dùng đã hủy thanh toán trên cổng thanh toán.';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <Navbar />

      {/* ── Breadcrumb Container độc lập nằm ngay dưới Header/Navbar ── */}
      <div className="w-full bg-white/60 border-b border-slate-200/60 mb-6">
        <div className="max-w-container-max mx-auto px-gutter-desktop py-4">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-slate-500 font-medium flex-wrap">
              <li className="flex items-center">
                <Link
                  to="/"
                  className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <Home className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span>Trang chủ</span>
                </Link>
              </li>

              <li className="flex items-center text-slate-400 select-none" aria-hidden="true">
                <ChevronRight className="w-3.5 h-3.5" />
              </li>

              <li className="flex items-center">
                <Link
                  to="/cart"
                  className="text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Giỏ hàng
                </Link>
              </li>

              <li className="flex items-center text-slate-400 select-none" aria-hidden="true">
                <ChevronRight className="w-3.5 h-3.5" />
              </li>

              <li className="flex items-center text-slate-900 font-semibold truncate" aria-current="page">
                Kết quả thanh toán
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* ── Khối Nội dung Chính: Card kết quả thanh toán ── */}
      <main className="flex-1 w-full pb-16 px-4 sm:px-6 lg:px-8">
        {/* ── 1. TRẠNG THÁI LOADING ── */}
        {loading && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 max-w-2xl mx-auto p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Đang xác thực kết quả thanh toán...
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Hệ thống đang đối soát dữ liệu với cổng thanh toán. Vui lòng không đóng trang.
            </p>
          </div>
        )}

        {/* ── 2. CARD NỘI DUNG KẾT QUẢ THANH TOÁN (THÀNH CÔNG HOẶC THẤT BẠI) ── */}
        {!loading && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 max-w-2xl mx-auto p-8 text-center">
            {/* Vùng Icon trạng thái */}
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 stroke-[2.2]" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Giao dịch {gateway} hoàn tất</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <XCircle className="w-10 h-10 text-red-500 stroke-[2.2]" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Thanh toán không thành công</span>
                </div>
              </div>
            )}

            {/* Tiêu đề & Thông điệp phụ */}
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
              {isSuccess ? 'Thanh Toán Thành Công!' : 'Thanh Toán Thất Bại'}
            </h1>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
              {isSuccess
                ? 'Cảm ơn bạn đã lựa chọn SmartZone. Giao dịch đã được xác nhận và đơn hàng đang được xử lý.'
                : (failureReason || 'Giao dịch không thành công hoặc đã bị hủy. Đơn hàng của bạn vẫn được lưu lại.')}
            </p>

            {/* Khối thông tin chi tiết */}
            <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-5 sm:p-6 mb-8 text-left space-y-3.5">
              {/* MÃ ĐƠN HÀNG (có nút bấm copy mã) */}
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

              {/* Phương thức thanh toán */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <span className="text-xs sm:text-sm font-medium text-slate-500">Phương thức thanh toán</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-800">
                  {gateway}
                </span>
              </div>

              {/* Mã giao dịch */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <span className="text-xs sm:text-sm font-medium text-slate-500">Mã giao dịch</span>
                <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                  {transactionNo}
                </span>
              </div>

              {/* Trạng thái đơn hàng */}
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-500">Trạng thái đơn hàng</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isSuccess
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {orderStatus}
                </span>
              </div>
            </div>

            {/* Hàng nút bấm phía dưới */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              {/* Nút 1: "Tiếp tục mua sắm" (chuyển về /products) */}
              <Link
                to="/products"
                id="continue-shopping-btn"
                className="w-full sm:w-1/2 py-3 px-6 rounded-xl font-semibold text-sm border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-center gap-2 group shadow-2xs active:scale-[0.99]"
              >
                <ShoppingBag className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
                <span>Tiếp tục mua sắm</span>
              </Link>

              {/* Nút 2: "Xem lịch sử đơn hàng" (chuyển về /user/orders) */}
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
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PaymentReturnPage;
