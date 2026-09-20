import React from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Truck, RotateCcw, CreditCard, Mail, PhoneCall, MapPin, Facebook, Youtube, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-800 text-slate-400 border-t border-slate-700 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Benefits Grid — Giữ lại 3 mục, xóa "100% Chính Hãng" */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-10 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-100 uppercase">Giao Siêu Tốc 2H</h5>
              <p className="text-[11px] text-slate-500">Miễn phí giao toàn quốc</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-100 uppercase">30 Ngày 1 Đổi 1</h5>
              <p className="text-[11px] text-slate-500">Lỗi do nhà sản xuất</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-100 uppercase">Trả Góp 0%</h5>
              <p className="text-[11px] text-slate-500">Duyệt hồ sơ nhanh 5 phút</p>
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
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
              {/* Fallback */}
              <div className="hidden w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-violet-600 items-center justify-center">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-black bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
                SmartZone
              </span>
            </Link>
            <p className="text-slate-400 leading-relaxed">
              Hệ thống bán lẻ điện thoại, laptop, phụ kiện công nghệ chính hãng hàng đầu Việt Nam. Chất lượng uy tín tạo nên thương hiệu.
            </p>
            <div className="space-y-2 text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                <span>123 Đường Công Nghệ, Q. Cầu Giấy, Hà Nội</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>1900 8888 (8:00 - 21:30)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-violet-400 shrink-0" />
                <span>support@smartzone.vn</span>
              </div>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Sản Phẩm</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/products?category=1" className="hover:text-sky-400 transition-colors">iPhone Chính Hãng</Link></li>
              <li><Link to="/products?category=1" className="hover:text-sky-400 transition-colors">Samsung Galaxy Series</Link></li>
              <li><Link to="/products?category=1" className="hover:text-sky-400 transition-colors">Xiaomi & Poco Phone</Link></li>
              <li><Link to="/products?category=2" className="hover:text-sky-400 transition-colors">Laptop Gaming & Văn Phòng</Link></li>
              <li><Link to="/products?category=4" className="hover:text-sky-400 transition-colors">Tai nghe & Phụ kiện cao cấp</Link></li>
            </ul>
          </div>

          {/* Col 3: Support policies */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Chính Sách & Hỗ Trợ</h4>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#" className="hover:text-sky-400 transition-colors">Chính sách bảo hành</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Chính sách đổi trả 30 ngày</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Hướng dẫn mua trả góp 0%</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Chính sách giao hàng & Vận chuyển</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Chính sách bảo mật thông tin</a></li>
            </ul>
          </div>

          {/* Col 4: Newsletter & Social */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Kết Nối Với Chúng Tôi</h4>
            <p className="text-slate-400">Đăng ký nhận thông báo ưu đãi và coupon giảm giá mới nhất.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email của bạn..."
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-sky-500 placeholder-slate-500"
              />
              <button className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl text-xs shrink-0 transition-colors">
                Gửi
              </button>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="p-2 bg-slate-700 border border-slate-600 rounded-xl text-slate-400 hover:text-sky-400 hover:border-slate-500 transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-slate-700 border border-slate-600 rounded-xl text-slate-400 hover:text-rose-400 hover:border-slate-500 transition-all">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-slate-700 border border-slate-600 rounded-xl text-slate-400 hover:text-violet-400 hover:border-slate-500 transition-all">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 border-t border-slate-700 text-center text-[11px] text-slate-500">
          <p>© 2026 SmartZone Store. Tất cả các quyền được bảo lưu. Thiết kế & phát triển bởi Antigravity AI.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
