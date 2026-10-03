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
  Home,
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1 py-10 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Top Success Badge */}
          <div className="text-center space-y-4 mb-8">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-600 shadow-md shadow-emerald-500/10 ring-8 ring-emerald-50/50">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 mb-2">
                Đặt hàng thành công
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Cảm ơn bạn đã tin tưởng SmartZone!
              </h1>
              <p className="text-sm sm:text-base text-slate-500 mt-1 max-w-md mx-auto">
                Mã đơn hàng của bạn là <strong className="text-blue-600">#{orderId}</strong>. Đơn hàng đang được hệ thống tiếp nhận và xử lý.
              </p>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl p-6 sm:p-8 space-y-8">

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-slate-100">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Trạng thái đơn</p>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">Chờ xác nhận</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phương thức</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">COD khi nhận hàng</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Thời gian dự kiến</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">1 - 3 ngày làm việc</p>
                </div>
              </div>
            </div>

            {/* Recipient Details & Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Shipping info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Thông tin giao hàng
                </h3>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Người nhận:</span>
                    <span className="font-semibold text-slate-900">{receiverName}</span>
                  </div>
                  {phone && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số điện thoại:</span>
                      <span className="font-semibold text-slate-900">{phone}</span>
                    </div>
                  )}
                  {fullAddress && (
                    <div className="flex flex-col gap-1 pt-2 border-t border-slate-200/60">
                      <span className="text-slate-500">Địa chỉ nhận hàng:</span>
                      <span className="text-slate-800 leading-relaxed font-medium">{fullAddress}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center gap-3">
                  <Truck className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nhân viên giao vận sẽ liên hệ với bạn trước khi giao hàng. Hãy chú ý điện thoại nhé!
                  </p>
                </div>
              </div>

              {/* Order Summary */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-violet-600" />
                  Chi tiết thanh toán
                </h3>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 space-y-3 text-sm">
                  {items.length > 0 && (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1">
                          <span className="text-slate-700 line-clamp-1 max-w-[200px]">
                            {it.TenSanPham} <span className="text-slate-400 font-normal">x{it.SoLuong}</span>
                          </span>
                          <span className="text-slate-900 font-semibold">{formatVND(it.Gia * it.SoLuong)}</span>
                        </div>
                      ))}
                      <div className="border-t border-slate-200/60 my-2" />
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Phí vận chuyển:</span>
                    <span className={shippingFee === 0 ? 'text-emerald-600 font-semibold' : 'text-slate-900 font-semibold'}>
                      {shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-base">
                    <span className="font-bold text-slate-900">Tổng tiền thanh toán:</span>
                    <span className="font-black text-xl text-blue-600">
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
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Tiếp tục mua sắm</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/orders"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all text-center"
              >
                Xem lịch sử đơn hàng
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
