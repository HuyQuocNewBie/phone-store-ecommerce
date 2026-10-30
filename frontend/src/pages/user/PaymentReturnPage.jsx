import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
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
  ChevronRight,
  Copy,
  Check,
  Sparkles,
  MapPin,
  Truck,
  HelpCircle
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { formatOrderCode, formatVND } from '../../utils/formatters';

const PaymentReturnPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
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

  const isSuccess = Boolean(result?.success && (result?.isSuccess !== undefined ? result?.isSuccess : result?.success));
  const data = result?.data || {};
  const gateway = data.gateway || result?.method || 'Cổng thanh toán';
  const orderId = data.orderId || result?.orderId;
  const orderInfo = data.order || null;
  const orderCode = orderId ? formatOrderCode(orderId, orderInfo?.NgayMuaHang) : 'N/A';
  const totalAmount = data.amount || result?.amount || orderInfo?.TongTien || 0;
  const transactionNo = data.transactionNo || data.transId || result?.transId || null;
  const orderStatus = data.orderStatus || orderInfo?.TrangThaiDonHang || (isSuccess ? 'Đang xử lý' : 'Chờ thanh toán');

  // Danh sách sản phẩm mua
  const items = (data.items && Array.isArray(data.items) && data.items.length > 0)
    ? data.items
    : (orderInfo?.items || location.state?.orderSummary?.items || location.state?.orderData?.items || []);

  // Thông tin nhận hàng nếu có
  const receiverName = orderInfo?.TenNguoiNhan || location.state?.orderSummary?.formData?.fullName || '';
  const receiverPhone = orderInfo?.SoDienThoai || location.state?.orderSummary?.formData?.phone || '';
  const shippingAddress = orderInfo?.DiaChiGiaoHang || location.state?.orderSummary?.formData?.fullAddress || '';
  const shippingFee = orderInfo?.PhiShip ?? location.state?.orderSummary?.shippingFee ?? null;
  const discountAmount = orderInfo?.SoTienGiam ?? location.state?.orderSummary?.discount ?? null;

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
      {/* Keyframe animations */}
      <style>{`
        @keyframes successBounceIn {
          0% {
            opacity: 0;
            transform: scale(0.25);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
          }
          75% {
            transform: scale(0.94);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.35);
          }
          50% {
            box-shadow: 0 0 0 16px rgba(16, 185, 129, 0);
          }
        }

        @keyframes pulseGlowRed {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.35);
          }
          50% {
            box-shadow: 0 0 0 16px rgba(244, 63, 94, 0);
          }
        }

        .animate-success-bounce {
          animation: successBounceIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-pulse-glow {
          animation: pulseGlow 2.4s infinite;
        }

        .animate-pulse-glow-red {
          animation: pulseGlowRed 2.4s infinite;
        }
      `}</style>

      <Navbar />

      <main className="flex-1 py-10 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Breadcrumb: Trang chủ > Giỏ hàng > Kết quả thanh toán ── */}
          <div className="max-w-container-max mx-auto w-full pb-unit-sm">
            <nav aria-label="Breadcrumb" className="flex items-center gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm">
              <Link to="/" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
                <span className="material-symbols-outlined text-base leading-none">home</span>
                Trang chủ
              </Link>
              <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
              <Link to="/cart" className="hover:text-primary transition-colors">Giỏ hàng</Link>
              <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
              <span className="text-on-surface font-semibold">
                {loading ? 'Kiểm tra thanh toán' : isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại'}
              </span>
            </nav>
          </div>

          {/* ── 1. TRẠNG THÁI LOADING ── */}
          {loading && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-8 sm:p-14 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-56 h-56 bg-blue-50 rounded-full blur-3xl pointer-events-none -z-0 opacity-70" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-6 shadow-inner animate-pulse">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                  Đang xác thực kết quả thanh toán...
                </h2>
                <p className="text-sm text-slate-500 max-w-md leading-relaxed">
                  Hệ thống đang tiến hành đối soát chữ ký bảo mật từ cổng thanh toán. Vui lòng không đóng hoặc tải lại trang.
                </p>
              </div>
            </div>
          )}

          {/* ── 2. TRẠNG THÁI THÀNH CÔNG ── */}
          {!loading && isSuccess && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 sm:p-10 space-y-8 relative overflow-hidden">
              {/* Background gradient blobs */}
              <div className="absolute -top-24 -right-24 w-56 h-56 bg-emerald-50 rounded-full blur-3xl pointer-events-none -z-0 opacity-70" />
              <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-blue-50 rounded-full blur-3xl pointer-events-none -z-0 opacity-70" />

              {/* Header: Icon Tích xanh có vòng tròn mờ bao quanh */}
              <div className="text-center space-y-4 relative z-10">
                <div className="relative inline-flex items-center justify-center">
                  {/* Vòng tròn mờ bao quanh */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-100/60 animate-pulse-glow flex items-center justify-center">
                    {/* Icon Check chính */}
                    <div
                      onClick={triggerCelebration}
                      title="Nhấn để chúc mừng lại!"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-200/80 animate-success-bounce cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    >
                      <CheckCircle2 className="w-11 h-11 sm:w-14 sm:h-14 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Badge tia sáng góc */}
                  <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-1.5 rounded-full shadow-md animate-bounce">
                    <Sparkles className="w-4 h-4 fill-white" />
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Badge phương thức */}
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    Giao dịch {gateway} hoàn tất
                  </div>

                  {/* Tiêu đề */}
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Thanh Toán Thành Công!
                  </h1>

                  <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto leading-relaxed">
                    Cảm ơn bạn đã lựa chọn SmartZone. Giao dịch thanh toán trực tuyến của bạn đã hoàn tất và đơn hàng đang được xử lý.
                  </p>
                </div>

                {/* Mã Đơn Hàng Box */}
                {orderCode !== 'N/A' && (
                  <div className="pt-2 inline-flex items-center justify-center">
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-2.5 shadow-xs">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mã đơn hàng:</span>
                      <span className="font-mono font-bold text-base text-blue-600 tracking-wide">
                        {orderCode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyOrderId}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Sao chép mã đơn hàng"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3 Thẻ thống kê nổi bật */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 relative z-10">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 font-medium">Trạng thái đơn</p>
                    <p className="text-xs sm:text-sm font-bold text-emerald-600 truncate">{orderStatus}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 font-medium">Hình thức</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">Cổng {gateway}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 font-medium">Giao dự kiến</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">1 - 3 ngày</p>
                  </div>
                </div>
              </div>

              {/* ── BẢNG TÓM TẮT ĐƠN HÀNG ── */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 sm:p-6 space-y-4 relative z-10">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    Tóm tắt đơn hàng & thanh toán
                  </span>
                  {receiverName && (
                    <span className="text-xs font-medium text-slate-500">
                      {receiverName} {receiverPhone ? `• ${receiverPhone}` : ''}
                    </span>
                  )}
                </div>

                {/* Bảng chi tiết tóm tắt */}
                <div className="space-y-2.5 text-xs sm:text-sm">
                  {/* Mã đơn hàng */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/40">
                    <span className="text-slate-500 font-medium">Mã đơn hàng:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{orderCode}</span>
                  </div>

                  {/* Mã giao dịch */}
                  {transactionNo && (
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/40">
                      <span className="text-slate-500 font-medium">Mã giao dịch:</span>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                        {transactionNo}
                      </span>
                    </div>
                  )}

                  {/* Phương thức thanh toán */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/40">
                    <span className="text-slate-500 font-medium">Phương thức thanh toán:</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                      Cổng thanh toán {gateway}
                    </span>
                  </div>

                  {/* Trạng thái đơn */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/40">
                    <span className="text-slate-500 font-medium">Trạng thái đơn:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {orderStatus}
                    </span>
                  </div>

                  {/* Phí ship nếu có */}
                  {shippingFee !== null && (
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/40 text-xs text-slate-500">
                      <span>Phí vận chuyển:</span>
                      <span className={shippingFee === 0 ? 'text-emerald-600 font-medium' : 'text-slate-700 font-medium'}>
                        {shippingFee === 0 ? 'Miễn phí giao hàng' : formatVND(shippingFee)}
                      </span>
                    </div>
                  )}

                  {/* Giảm giá nếu có */}
                  {discountAmount !== null && Number(discountAmount) > 0 && (
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/40 text-xs text-emerald-600 font-medium">
                      <span>Mã giảm giá đã áp dụng:</span>
                      <span>-{formatVND(discountAmount)}</span>
                    </div>
                  )}

                  {/* Tổng tiền */}
                  <div className="flex items-center justify-between pt-2 text-sm sm:text-base font-bold text-slate-900">
                    <span className="text-slate-700 font-semibold">Tổng tiền thanh toán:</span>
                    <span className="text-lg sm:text-xl font-extrabold text-blue-600">
                      {formatVND(totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Thông tin địa chỉ nhận hàng nếu có */}
                {shippingAddress && (
                  <div className="pt-3 border-t border-slate-200/60 text-xs text-slate-600 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-700">Địa chỉ giao:</strong> {shippingAddress}</span>
                  </div>
                )}
              </div>

              {/* ── DANH SÁCH SẢN PHẨM TRONG ĐƠN HÀNG ── */}
              {items.length > 0 && (
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      Sản phẩm trong đơn hàng ({items.length})
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/70 bg-white overflow-hidden shadow-xs">
                    {items.map((item, idx) => {
                      const itemImg = item.Anh || item.HinhAnh || item.image || item.img;
                      const variantDetails = [];
                      if (item.MauSac) variantDetails.push(`Màu: ${item.MauSac}`);
                      if (item.DungLuong) variantDetails.push(`Dung lượng: ${item.DungLuong}`);
                      const variantString = variantDetails.join(' | ') || 'Phiên bản tiêu chuẩn';

                      const unitPrice = item.DonGia || item.Gia || 0;
                      const quantity = item.SoLuong || 1;
                      const totalPrice = item.TongGia || (unitPrice * quantity);

                      return (
                        <div
                          key={item.MaChiTietDonHang || item.MaSanPham || idx}
                          className="p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Thumbnail */}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-50 p-1.5 border border-slate-100 shrink-0 flex items-center justify-center overflow-hidden">
                            {itemImg ? (
                              <img
                                src={itemImg}
                                alt={item.TenSanPham || 'Sản phẩm'}
                                className="w-full h-full object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <Package className="w-6 h-6 text-slate-300" />
                            )}
                          </div>

                          {/* Tên sản phẩm & Phân loại */}
                          <div className="flex-1 min-w-0">
                            <Link
                              to={item.MaSanPham ? `/products/${item.MaSanPham}` : '#'}
                              className="text-xs sm:text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors line-clamp-1"
                            >
                              {item.TenSanPham || 'Sản phẩm SmartZone'}
                            </Link>
                            
                            {/* Phân loại (Màu sắc | Dung lượng) */}
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                              {variantString}
                            </p>

                            {/* Số lượng & Đơn giá */}
                            <div className="text-[11px] sm:text-xs text-slate-400 mt-1 flex items-center gap-2">
                              <span>Đơn giá: <strong className="font-semibold text-slate-600">{formatVND(unitPrice)}</strong></span>
                              <span>•</span>
                              <span>Số lượng: <strong className="font-semibold text-slate-700">x{quantity}</strong></span>
                            </div>
                          </div>

                          {/* Thành tiền */}
                          <div className="text-right shrink-0">
                            <span className="text-xs sm:text-sm font-extrabold text-slate-900 block">
                              {formatVND(totalPrice)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Banner hỗ trợ giao hàng */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center gap-3 relative z-10">
                <Truck className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nhân viên giao nhận sẽ liên hệ với số điện thoại <strong className="text-slate-800">{receiverPhone || 'của bạn'}</strong> trước khi giao. Hãy chú ý giữ liên lạc nhé!
                </p>
              </div>

              {/* ── 2 NÚT HÀNH ĐỘNG CỦA TRANG (THÀNH CÔNG) ── */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 relative z-10">
                {/* Nút 1: "Tiếp tục mua sắm" (Nút viền outline điều hướng về /products) */}
                <Link
                  to="/products"
                  id="continue-shopping-btn"
                  className="w-full sm:w-auto min-w-[200px] px-8 py-3.5 rounded-xl font-bold text-sm border-2 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 transition-all flex items-center justify-center gap-2 group shadow-2xs"
                >
                  <ShoppingBag className="w-4 h-4 text-slate-500 transition-transform group-hover:rotate-12" />
                  <span>Tiếp tục mua sắm</span>
                </Link>

                {/* Nút 2: "Xem lịch sử đơn hàng" (Nút màu xanh primary điều hướng về /user/orders) */}
                <Link
                  to="/user/orders"
                  id="order-history-btn"
                  className="w-full sm:w-auto min-w-[200px] px-8 py-3.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-lg shadow-blue-500/25 transition-all text-center flex items-center justify-center gap-2 group"
                >
                  <Package className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>Xem lịch sử đơn hàng</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

            </div>
          )}

          {/* ── 3. TRẠNG THÁI THẤT BẠI / BỊ HỦY / LỖI CHỮ KÝ ── */}
          {!loading && !isSuccess && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 sm:p-10 space-y-8 relative overflow-hidden">
              {/* Background decoration elements */}
              <div className="absolute -top-24 -right-24 w-56 h-56 bg-rose-50 rounded-full blur-3xl pointer-events-none -z-0 opacity-70" />
              <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-amber-50 rounded-full blur-3xl pointer-events-none -z-0 opacity-60" />

              {/* Header: Icon X màu đỏ có vòng tròn mờ bao quanh */}
              <div className="text-center space-y-4 relative z-10">
                <div className="relative inline-flex items-center justify-center">
                  {/* Vòng tròn mờ bao quanh */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-rose-100/60 animate-pulse-glow-red flex items-center justify-center">
                    {/* Icon X chính */}
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 ring-4 ring-rose-200/80 animate-success-bounce"
                    >
                      <XCircle className="w-11 h-11 sm:w-14 sm:h-14 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Badge tia cảnh báo góc */}
                  <div className="absolute -top-1 -right-1 bg-rose-500 text-white p-1.5 rounded-full shadow-md">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Badge phương thức thất bại */}
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    Giao dịch {gateway} chưa hoàn thành
                  </div>

                  {/* Tiêu đề */}
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Thanh Toán Thất Bại!
                  </h1>

                  <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto leading-relaxed">
                    Giao dịch trực tuyến chưa thể hoàn tất. Đừng lo lắng, giỏ hàng hoặc đơn hàng của bạn vẫn được lưu lại để thử lại bất cứ lúc nào.
                  </p>
                </div>

                {/* Hộp Lý do thất bại nổi bật */}
                <div className="pt-2 max-w-lg mx-auto">
                  <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 text-rose-800 text-left flex items-start gap-3 shadow-2xs">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm">
                      <p className="font-bold text-rose-900 mb-0.5">Lý do thất bại:</p>
                      <p className="text-rose-700 leading-relaxed">{failureReason}</p>
                    </div>
                  </div>
                </div>

                {/* Mã Đơn Hàng Box nếu có */}
                {orderCode !== 'N/A' && (
                  <div className="pt-1 inline-flex items-center justify-center">
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-2.5 shadow-xs">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mã đơn hàng:</span>
                      <span className="font-mono font-bold text-base text-slate-800 tracking-wide">
                        {orderCode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyOrderId}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Sao chép mã đơn hàng"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bảng Tóm Tắt Đơn Hàng Thất Bại */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 sm:p-6 space-y-4 relative z-10">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-rose-500" />
                    Thông tin đơn hàng chưa thanh toán
                  </span>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                    Chưa thanh toán
                  </span>
                </div>

                <div className="space-y-2.5 text-xs sm:text-sm">
                  {orderCode !== 'N/A' && (
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/40">
                      <span className="text-slate-500 font-medium">Mã đơn hàng:</span>
                      <span className="font-mono font-bold text-slate-900">{orderCode}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1 border-b border-slate-200/40">
                    <span className="text-slate-500 font-medium">Cổng thanh toán:</span>
                    <span className="font-semibold text-slate-800">{gateway}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200/40">
                    <span className="text-slate-500 font-medium">Trạng thái giao dịch:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Không thành công / Đã hủy
                    </span>
                  </div>

                  {totalAmount > 0 && (
                    <div className="flex items-center justify-between pt-2 text-sm sm:text-base font-bold text-slate-900">
                      <span className="text-slate-700 font-semibold">Số tiền cần thanh toán:</span>
                      <span className="text-lg sm:text-xl font-extrabold text-rose-600">
                        {formatVND(totalAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Danh sách sản phẩm nếu có */}
              {items.length > 0 && (
                <div className="space-y-3 relative z-10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500" />
                    Sản phẩm trong đơn hàng ({items.length})
                  </h3>

                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/70 bg-white overflow-hidden shadow-xs">
                    {items.map((item, idx) => {
                      const itemImg = item.Anh || item.HinhAnh || item.image || item.img;
                      const variantDetails = [];
                      if (item.MauSac) variantDetails.push(`Màu: ${item.MauSac}`);
                      if (item.DungLuong) variantDetails.push(`Dung lượng: ${item.DungLuong}`);
                      const variantString = variantDetails.join(' | ') || 'Phiên bản tiêu chuẩn';

                      const unitPrice = item.DonGia || item.Gia || 0;
                      const quantity = item.SoLuong || 1;
                      const totalPrice = item.TongGia || (unitPrice * quantity);

                      return (
                        <div
                          key={item.MaChiTietDonHang || item.MaSanPham || idx}
                          className="p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-50 p-1.5 border border-slate-100 shrink-0 flex items-center justify-center overflow-hidden">
                            {itemImg ? (
                              <img
                                src={itemImg}
                                alt={item.TenSanPham || 'Sản phẩm'}
                                className="w-full h-full object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <Package className="w-6 h-6 text-slate-300" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <Link
                              to={item.MaSanPham ? `/products/${item.MaSanPham}` : '#'}
                              className="text-xs sm:text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors line-clamp-1"
                            >
                              {item.TenSanPham || 'Sản phẩm SmartZone'}
                            </Link>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                              {variantString}
                            </p>
                            <div className="text-[11px] sm:text-xs text-slate-400 mt-1 flex items-center gap-2">
                              <span>Đơn giá: <strong className="font-semibold text-slate-600">{formatVND(unitPrice)}</strong></span>
                              <span>•</span>
                              <span>Số lượng: <strong className="font-semibold text-slate-700">x{quantity}</strong></span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs sm:text-sm font-extrabold text-slate-900 block">
                              {formatVND(totalPrice)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hướng dẫn trợ giúp */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 flex items-center gap-3 relative z-10">
                <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Quý khách có thể chọn <strong>Thử thanh toán lại</strong> để kiểm tra lại tài khoản hoặc chuyển sang phương thức thanh toán COD khi nhận hàng.
                </p>
              </div>

              {/* ── NÚT HÀNH ĐỘNG KHI THẤT BẠI ── */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 relative z-10">
                {/* Nút "Thử thanh toán lại" điều hướng về Giỏ hàng / Checkout */}
                <Link
                  to="/cart"
                  id="retry-payment-btn"
                  className="w-full sm:w-auto min-w-[200px] px-8 py-3.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group"
                >
                  <RotateCcw className="w-4 h-4 transition-transform group-hover:-rotate-45" />
                  <span>Thử thanh toán lại</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                {/* Nút "Xem lịch sử đơn hàng" điều hướng về /user/orders */}
                <Link
                  to="/user/orders"
                  id="failed-order-history-btn"
                  className="w-full sm:w-auto min-w-[200px] px-8 py-3.5 rounded-xl font-bold text-sm border-2 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 transition-all text-center flex items-center justify-center gap-2 group shadow-2xs"
                >
                  <Package className="w-4 h-4 text-slate-500 transition-transform group-hover:scale-110" />
                  <span>Xem lịch sử đơn hàng</span>
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
