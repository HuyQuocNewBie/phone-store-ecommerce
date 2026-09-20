import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';

const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

const CheckoutSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const orderData = location.state?.orderData || null;
  const orderSummary = location.state?.orderSummary || null;

  // Fallback data if accessed directly
  const orderId = orderData?.MaDonHang || 'DH' + Math.floor(100000 + Math.random() * 900000);
  const totalAmount = orderData?.TongTien ?? orderSummary?.total ?? 0;
  const receiverName = orderSummary?.formData?.fullName || orderData?.TenNguoiNhan || 'Quý khách';
  const phone = orderSummary?.formData?.phone || orderData?.SoDienThoai || '';
  const fullAddress = orderSummary?.formData?.fullAddress || orderData?.DiaChiGiaoHang || '';
  const items = orderSummary?.items || [];
  const shippingFee = orderSummary?.shippingFee ?? orderData?.PhiShip ?? 0;
  const paymentMethod = orderSummary?.paymentMethod || 'COD (Thanh toán khi nhận hàng)';

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <Navbar />

      <main className="flex-1 py-10 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Success Badge */}
          <div className="text-center space-y-4 mb-10">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl scale-150 animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
            </div>

            <div>
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
                Đặt hàng thành công
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                Cảm ơn bạn đã tin tưởng SmartZone!
              </h1>
              <p className="text-sm sm:text-base text-slate-400 mt-1 max-w-md mx-auto">
                Mã đơn hàng của bạn là <strong className="text-sky-400">#{orderId}</strong>. Đơn hàng đang được hệ thống tiếp nhận và xử lý.
              </p>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 backdrop-blur-xl shadow-2xl">
            
            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-slate-800">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Trạng thái đơn</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">Chờ xác nhận</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Phương thức</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">COD khi nhận hàng</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Thời gian dự kiến</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">1 - 3 ngày làm việc</p>
                </div>
              </div>
            </div>

            {/* Recipient Details & Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Shipping info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-400" />
                  Thông tin giao hàng
                </h3>

                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Người nhận:</span>
                    <span className="font-semibold text-slate-200">{receiverName}</span>
                  </div>
                  {phone && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Số điện thoại:</span>
                      <span className="font-semibold text-slate-200">{phone}</span>
                    </div>
                  )}
                  {fullAddress && (
                    <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400">Địa chỉ nhận hàng:</span>
                      <span className="text-slate-300 leading-relaxed font-medium">{fullAddress}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/15 flex items-center gap-3">
                  <Truck className="w-5 h-5 text-sky-400 shrink-0" />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Nhân viên giao vận sẽ liên hệ với bạn trước khi giao hàng. Hãy chú ý điện thoại nhé!
                  </p>
                </div>
              </div>

              {/* Order Summary */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-violet-400" />
                  Chi tiết thanh toán
                </h3>

                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3 text-sm">
                  {items.length > 0 && (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1">
                          <span className="text-slate-300 line-clamp-1 max-w-[200px]">
                            {it.TenSanPham} <span className="text-slate-500">x{it.SoLuong}</span>
                          </span>
                          <span className="text-slate-200 font-semibold">{formatVND(it.Gia * it.SoLuong)}</span>
                        </div>
                      ))}
                      <div className="border-t border-slate-800/60 my-2" />
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400">
                    <span>Phí vận chuyển:</span>
                    <span className={shippingFee === 0 ? 'text-emerald-400 font-semibold' : 'text-slate-200'}>
                      {shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-base">
                    <span className="font-bold text-slate-200">Tổng tiền cần thanh toán:</span>
                    <span className="font-black text-xl text-emerald-400">
                      {formatVND(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/products"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Tiếp tục mua sắm</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-semibold text-sm bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all text-center"
              >
                Về trang chủ
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
