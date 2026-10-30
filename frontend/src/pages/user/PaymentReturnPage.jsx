import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShoppingBag,
  Package,
  Calendar,
  CreditCard,
  ShieldCheck,
  RotateCcw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';
import { formatOrderCode, formatVND } from '../../utils/formatters';

const PaymentReturnPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Ngăn chặn duplicate call trong React 18 StrictMode
  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;

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

        // Kích hoạt pháo hoa nếu thanh toán thành công
        if (resData?.success && resData?.isSuccess) {
          triggerConfetti();
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
  }, [location.search]);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // Ignored if confetti fails
    }
  };

  const isSuccess = Boolean(result?.success && result?.isSuccess);
  const data = result?.data || {};
  const gateway = data.gateway || 'Cổng thanh toán';
  const orderId = data.orderId;
  const orderCode = orderId ? formatOrderCode(orderId) : 'N/A';
  const amount = data.amount || 0;
  const transactionNo = data.transactionNo || data.transId || 'N/A';
  const orderStatus = data.orderStatus || 'Đang xử lý';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          
          {/* Breadcrumb nhỏ */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 font-medium">
            <Link to="/" className="hover:text-slate-600 transition-colors">Trang chủ</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/cart" className="hover:text-slate-600 transition-colors">Giỏ hàng</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 font-semibold">Kết quả thanh toán</span>
          </nav>

          {/* 1. Trạng thái Loading */}
          {loading && (
            <div className="bg-white rounded-3xl p-10 sm:p-14 shadow-xl border border-slate-100 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-6 animate-pulse">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Đang xác thực kết quả thanh toán...</h2>
              <p className="text-sm text-slate-500 max-w-md">
                Hệ thống đang tiến hành đối soát chữ ký bảo mật từ cổng thanh toán. Vui lòng không đóng trình duyệt.
              </p>
            </div>
          )}

          {/* 2. Trạng thái Thành Công */}
          {!loading && isSuccess && (
            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 flex flex-col items-center">
              
              {/* Icon thành công */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center ring-8 ring-emerald-50/50">
                  <CheckCircle2 className="w-14 h-14" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1.5 rounded-full shadow">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              {/* Tiêu đề & Cổng thanh toán */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Giao dịch {gateway} hoàn tất
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 text-center mb-2">
                Thanh Toán Thành Công!
              </h1>
              <p className="text-sm text-slate-500 text-center max-w-md mb-8">
                {result?.message || 'Cảm ơn quý khách. Đơn hàng của bạn đã được ghi nhận và đang chuyển sang giai đoạn xử lý đóng gói.'}
              </p>

              {/* Card tóm tắt giao dịch */}
              <div className="w-full bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-100 flex flex-col gap-3.5 mb-8">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-sm">
                  <span className="text-slate-500">Mã đơn hàng:</span>
                  <span className="font-bold text-slate-800 font-mono text-base">{orderCode}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-sm">
                  <span className="text-slate-500">Phương thức:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Cổng {gateway}
                  </span>
                </div>

                {transactionNo !== 'N/A' && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-sm">
                    <span className="text-slate-500">Mã giao dịch:</span>
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {transactionNo}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-sm">
                  <span className="text-slate-500">Trạng thái đơn:</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {orderStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 text-base font-bold text-slate-900">
                  <span className="text-slate-700">Tổng tiền thanh toán:</span>
                  <span className="text-xl sm:text-2xl text-emerald-600 font-black">
                    {formatVND(amount)}
                  </span>
                </div>
              </div>

              {/* Hành động */}
              <div className="w-full flex flex-col sm:flex-row gap-3">
                <Link
                  to="/user/orders"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-[0.99] transition shadow-md hover:shadow-blue-200"
                >
                  <Package className="w-4 h-4" />
                  Xem chi tiết đơn hàng
                </Link>
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 active:scale-[0.99] transition"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Tiếp tục mua sắm
                </Link>
              </div>
            </div>
          )}

          {/* 3. Trạng thái Thất Bại / Bị Hủy / Lỗi Chữ Ký */}
          {!loading && !isSuccess && (
            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 flex flex-col items-center">
              
              {/* Icon thất bại */}
              <div className="w-24 h-24 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center ring-8 ring-rose-50/50 mb-6">
                <XCircle className="w-14 h-14" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 mb-3">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Giao dịch chưa hoàn thành
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 text-center mb-2">
                Thanh Toán Không Thành Công
              </h1>
              <p className="text-sm text-slate-500 text-center max-w-md mb-8">
                {result?.message || error || 'Giao dịch bị từ chối hoặc người dùng đã hủy thanh toán. Quý khách có thể thử lại hoặc chọn phương thức khác.'}
              </p>

              {/* Thông tin lỗi */}
              <div className="w-full bg-rose-50/50 rounded-2xl p-5 border border-rose-100 flex flex-col gap-3 mb-8 text-sm">
                {orderId && (
                  <div className="flex items-center justify-between py-1 border-b border-rose-100">
                    <span className="text-slate-600">Mã đơn hàng:</span>
                    <span className="font-bold text-slate-900 font-mono">{orderCode}</span>
                  </div>
                )}
                {amount > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-rose-100">
                    <span className="text-slate-600">Số tiền:</span>
                    <span className="font-bold text-rose-600">{formatVND(amount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-600">Cổng thanh toán:</span>
                  <span className="font-semibold text-slate-800">{gateway}</span>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="w-full flex flex-col sm:flex-row gap-3">
                <Link
                  to="/cart"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-[0.99] transition shadow-md hover:shadow-blue-200"
                >
                  <RotateCcw className="w-4 h-4" />
                  Thử lại thanh toán
                </Link>
                <Link
                  to="/user/orders"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 active:scale-[0.99] transition"
                >
                  <Package className="w-4 h-4" />
                  Đơn hàng của tôi
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentReturnPage;

