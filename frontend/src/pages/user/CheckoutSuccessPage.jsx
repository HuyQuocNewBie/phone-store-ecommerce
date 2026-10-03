import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  Package,
  ArrowRight,
  ShoppingBag,
  Truck,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';

const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

const CheckoutSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);

  const orderData = location.state?.orderData || null;
  const orderSummary = location.state?.orderSummary || null;

  // Fallback data if accessed directly
  const orderId = orderData?.MaDonHang || 'DH' + Math.floor(100000 + Math.random() * 900000);
  const totalAmount = orderData?.TongTien ?? orderSummary?.total ?? 0;
  const receiverName = orderSummary?.formData?.fullName || orderData?.TenNguoiNhan || 'Quý khách';
  const phone = orderSummary?.formData?.phone || orderData?.SoDienThoai || '';
  const fullAddress = orderSummary?.formData?.fullAddress || orderData?.DiaChiGiaoHang || '';
  const items = orderSummary?.items || orderData?.items || [];
  const shippingFee = orderSummary?.shippingFee ?? orderData?.PhiShip ?? 0;
  const discountAmount = orderSummary?.discount ?? orderData?.SoTienGiam ?? 0;
  const paymentMethod = orderSummary?.paymentMethod || 'COD (Thanh toán khi nhận hàng)';

  // Hàm kích hoạt hiệu ứng pháo hoa Confetti
  const triggerCelebration = () => {
    // 1. Pháo hoa bung tỏa ngay tại trung tâm
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
  };

  // Tự động bắn pháo hoa khi vừa mount trang
  useEffect(() => {
    triggerCelebration();

    // Hiệu ứng pháo hoa bắn nhẹ nhàng 2 bên trong 2.5 giây
    const end = Date.now() + 2500;
    const interval = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      confetti({
        startVelocity: 28,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random() < 0.5 ? 0.15 : 0.85, y: Math.random() * 0.35 + 0.25 },
        colors: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'],
        zIndex: 9999,
        particleCount: 22,
      });
    }, 350);

    return () => {
      clearInterval(interval);
      confetti.reset();
    };
  }, []);

  // Sao chép mã đơn hàng
  const handleCopyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(String(orderId));
      setCopied(true);
      toast.success('Đã sao chép mã đơn hàng!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

        .animate-success-bounce {
          animation: successBounceIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-pulse-glow {
          animation: pulseGlow 2.4s infinite;
        }
      `}</style>

      <Navbar />

      <main className="flex-1 py-10 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── CARD THÔNG BÁO ĐẶT HÀNG THÀNH CÔNG ── */}
          <div className="bg-white border border-slate-100 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.07)] rounded-3xl p-6 sm:p-10 space-y-8 relative overflow-hidden">
            
            {/* Background decoration elements */}
            <div className="absolute -top-24 -right-24 w-56 h-56 bg-emerald-50 rounded-full blur-3xl pointer-events-none -z-0 opacity-70" />
            <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-blue-50 rounded-full blur-3xl pointer-events-none -z-0 opacity-70" />

            {/* Header: Icon Check Xanh Lá Nổi Bật có animation nẩy (bounce/scale-in) */}
            <div className="text-center space-y-4 relative z-10">
              <div className="relative inline-flex items-center justify-center">
                {/* Vòng sáng lan tỏa */}
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
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  Giao dịch thành công
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Đặt hàng thành công!
                </h1>

                <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto leading-relaxed">
                  Cảm ơn bạn đã lựa chọn SmartZone. Đơn hàng của bạn đã được ghi nhận và đang chuẩn bị xử lý.
                </p>
              </div>

              {/* Mã Đơn Hàng Box */}
              <div className="pt-2 inline-flex items-center justify-center">
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-2.5 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-base text-blue-600">
                    #{orderId}
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
            </div>

            {/* Thông tin nổi bật 3 cột */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 relative z-10">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Trạng thái đơn</p>
                  <p className="text-xs sm:text-sm font-bold text-emerald-600">Chờ xác nhận</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Hình thức</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">COD nhận hàng</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Giao dự kiến</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">1 - 3 ngày</p>
                </div>
              </div>
            </div>

            {/* Chi tiết đơn hàng tóm tắt */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 sm:p-6 space-y-4 relative z-10">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Thông tin nhận hàng
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {receiverName} • {phone}
                </span>
              </div>

              {fullAddress && (
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {fullAddress}
                </p>
              )}

              {/* Danh sách sản phẩm mua tóm tắt */}
              {items.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Sản phẩm đã đặt ({items.length}):</p>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-700 line-clamp-1 max-w-[240px] sm:max-w-sm">
                          {it.TenSanPham} <span className="text-slate-400 font-normal">x{it.SoLuong}</span>
                        </span>
                        <span className="text-slate-900 font-semibold shrink-0">
                          {formatVND((it.DonGia || it.Gia || 0) * (it.SoLuong || 1))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tổng kết tiền */}
              <div className="pt-3 border-t border-slate-200/60 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Phí giao hàng:</span>
                  <span className={shippingFee === 0 ? 'text-emerald-600 font-medium' : 'text-slate-700 font-medium'}>
                    {shippingFee === 0 ? 'Miễn phí giao hàng' : formatVND(shippingFee)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 font-medium">
                    <span>Mã giảm giá đã áp dụng:</span>
                    <span>-{formatVND(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm sm:text-base pt-2 font-bold text-slate-900">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="text-lg sm:text-xl font-extrabold text-blue-600">
                    {formatVND(totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Banner hỗ trợ giao hàng */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center gap-3 relative z-10">
              <Truck className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Nhân viên giao nhận sẽ liên hệ với số điện thoại <strong className="text-slate-800">{phone || 'của bạn'}</strong> trước khi giao. Hãy giữ liên lạc nhé!
              </p>
            </div>

            {/* ── CÁC NÚT ĐIỀU HƯỚNG THEO YÊU CẦU ── */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 relative z-10">
              {/* Nút Tiếp tục mua sắm */}
              <Link
                to="/products"
                id="continue-shopping-btn"
                className="w-full sm:w-auto min-w-[200px] px-8 py-3.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group"
              >
                <ShoppingBag className="w-4 h-4 transition-transform group-hover:rotate-12" />
                <span>Tiếp tục mua sắm</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>

              {/* Nút Xem lịch sử đơn hàng */}
              <Link
                to="/orders"
                id="order-history-btn"
                className="w-full sm:w-auto min-w-[200px] px-7 py-3.5 rounded-xl font-semibold text-sm bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 transition-all text-center flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4 text-slate-500" />
                <span>Xem lịch sử đơn hàng</span>
              </Link>
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutSuccessPage;

