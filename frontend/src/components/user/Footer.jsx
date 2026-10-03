import React from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Truck, RotateCcw, CreditCard, Mail, PhoneCall, MapPin, Facebook, Youtube, Instagram, ShieldCheck } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 pt-12 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Top Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Giao Siêu Tốc 2H</h5>
              <p className="text-[11px] text-slate-500 mt-0.5">Miễn phí giao toàn quốc</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wide">30 Ngày 1 Đổi 1</h5>
              <p className="text-[11px] text-slate-500 mt-0.5">Lỗi do nhà sản xuất</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Trả Góp 0%</h5>
              <p className="text-[11px] text-slate-500 mt-0.5">Duyệt hồ sơ nhanh 5 phút</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">

          {/* Col 1: Store info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/assets/logo.png"
                alt="SmartZone Logo"
                className="h-8 w-auto object-contain brightness-200"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 items-center justify-center">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-black text-white">SmartZone</span>
            </Link>

            <p className="text-slate-400 leading-relaxed text-xs">
              Hệ thống bán lẻ điện thoại, laptop, phụ kiện công nghệ chính hãng hàng đầu Việt Nam.
            </p>

            <div className="space-y-2.5 text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs text-slate-400">123 Đường Công Nghệ, Q. Cầu Giấy, Hà Nội</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-400">1900 8888 (8:00 - 21:30)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="text-xs text-slate-400">support@smartzone.vn</span>
              </div>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Sản Phẩm</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/products?category=1" className="hover:text-blue-400 transition-colors">iPhone Chính Hãng</Link></li>
              <li><Link to="/products?category=1" className="hover:text-blue-400 transition-colors">Samsung Galaxy Series</Link></li>
              <li><Link to="/products?category=1" className="hover:text-blue-400 transition-colors">Xiaomi &amp; Poco Phone</Link></li>
              <li><Link to="/products?category=2" className="hover:text-blue-400 transition-colors">Laptop Gaming &amp; Văn Phòng</Link></li>
              <li><Link to="/products?category=4" className="hover:text-blue-400 transition-colors">Tai nghe &amp; Phụ kiện cao cấp</Link></li>
            </ul>
          </div>

          {/* Col 3: Support policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Chính Sách &amp; Hỗ Trợ</h4>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Chính sách bảo hành</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Chính sách đổi trả 30 ngày</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Hướng dẫn mua trả góp 0%</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Chính sách giao hàng &amp; Vận chuyển</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Chính sách bảo mật thông tin</a></li>
            </ul>
          </div>

          {/* Col 4: Newsletter & Social */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Kết Nối Với Chúng Tôi</h4>
            <p className="text-xs text-slate-400">Đăng ký nhận thông báo ưu đãi và coupon giảm giá mới nhất.</p>

            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email của bạn..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder-slate-500 transition-all"
              />
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shrink-0 transition-colors active:scale-[0.97]">
                Gửi
              </button>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <a href="#" className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-blue-400 hover:border-slate-600 transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-red-400 hover:border-slate-600 transition-all">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-pink-400 hover:border-slate-600 transition-all">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© 2026 SmartZone Store. Tất cả các quyền được bảo lưu.</p>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Thiết kế bởi <span className="text-slate-400 font-medium">Antigravity AI</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
