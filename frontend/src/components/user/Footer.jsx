import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="w-full bg-surface-container-low mt-20 md:mt-28 pt-16 md:pt-24 pb-14 md:pb-16 border-t border-slate-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
      <div className="max-w-container-max mx-auto px-gutter-desktop">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-unit-xl pb-unit-2xl">
          {/* Cột 1: Thông tin công ty */}
          <div className="flex flex-col gap-unit-sm">
            <div className="flex items-center gap-unit-xs">
              <span className="font-headline-sm text-headline-sm text-primary font-bold">
                Smart<span className="text-tertiary-container">Zone</span>
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Hệ thống bán lẻ điện thoại thông minh, máy tính bảng và phụ kiện công nghệ chính hãng hàng đầu Việt Nam.
            </p>
            <div className="flex flex-col gap-unit-2xs font-body-md text-body-md text-on-surface-variant">
              <div className="flex items-start gap-unit-xs">
                <span className="material-symbols-outlined text-primary leading-tight">location_on</span>
                <span>Trụ sở chính: Tầng 8, Tòa nhà Smart Tower, 128 Nguyễn Trãi, Thanh Xuân, Hà Nội.</span>
              </div>
              <div className="flex items-center gap-unit-xs">
                <span className="material-symbols-outlined text-primary leading-none">call</span>
                <span>Tổng đài: <strong className="text-on-surface">1900 6868</strong> (Miễn phí)</span>
              </div>
              <div className="flex items-center gap-unit-xs">
                <span className="material-symbols-outlined text-primary leading-none">mail</span>
                <span>cskh@smartzone.vn</span>
              </div>
              <div className="flex items-center gap-unit-xs">
                <span className="material-symbols-outlined text-primary leading-none">description</span>
                <span>GPĐKKD số: 0108962341 do Sở KH&amp;ĐT TP. Hà Nội cấp.</span>
              </div>
            </div>
          </div>

          {/* Cột 2: Chính sách & Bảo hành */}
          <div className="flex flex-col gap-unit-sm">
            <h4 className="font-title-card text-title-card text-on-surface font-semibold">Chính sách &amp; Bảo hành</h4>
            <ul className="flex flex-col gap-unit-xs font-body-md text-body-md text-on-surface-variant">
              <li>
                <Link to="/products" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
                  <span className="material-symbols-outlined text-sm leading-none text-primary">check_circle</span>
                  Chính sách 1 đổi 1 trong 30 ngày
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
                  <span className="material-symbols-outlined text-sm leading-none text-primary">check_circle</span>
                  Bảo hành chính hãng 12 tháng
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
                  <span className="material-symbols-outlined text-sm leading-none text-primary">check_circle</span>
                  Giao hàng &amp; Thanh toán tận nơi
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
                  <span className="material-symbols-outlined text-sm leading-none text-primary">check_circle</span>
                  Chính sách bảo mật thông tin
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
                  <span className="material-symbols-outlined text-sm leading-none text-primary">check_circle</span>
                  Tra cứu thông tin bảo hành
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Phương thức thanh toán */}
          <div className="flex flex-col gap-unit-sm">
            <h4 className="font-title-card text-title-card text-on-surface font-semibold">Phương thức thanh toán</h4>
            <p className="font-body-md text-body-md text-on-surface-variant">Đa dạng cổng thanh toán an toàn và bảo mật tiêu chuẩn quốc tế:</p>
            <div className="grid grid-cols-2 gap-unit-xs font-body-md text-body-md text-on-surface">
              <div className="px-unit-sm py-unit-xs bg-surface-container-lowest rounded-xl flex items-center gap-unit-xs shadow-[0_1px_3px_rgba(15,23,42,0.04)] border border-surface-container/60">
                <span className="material-symbols-outlined text-primary leading-none">credit_card</span>
                <span>Visa / Master</span>
              </div>
              <div className="px-unit-sm py-unit-xs bg-surface-container-lowest rounded-xl flex items-center gap-unit-xs shadow-[0_1px_3px_rgba(15,23,42,0.04)] border border-surface-container/60">
                <span className="material-symbols-outlined text-secondary leading-none">qr_code_scanner</span>
                <span>VNPay-QR</span>
              </div>
              <div className="px-unit-sm py-unit-xs bg-surface-container-lowest rounded-xl flex items-center gap-unit-xs shadow-[0_1px_3px_rgba(15,23,42,0.04)] border border-surface-container/60">
                <span className="material-symbols-outlined text-tertiary leading-none">account_balance_wallet</span>
                <span>Ví MoMo</span>
              </div>
              <div className="px-unit-sm py-unit-xs bg-surface-container-lowest rounded-xl flex items-center gap-unit-xs shadow-[0_1px_3px_rgba(15,23,42,0.04)] border border-surface-container/60">
                <span className="material-symbols-outlined text-primary leading-none">percent</span>
                <span>Trả góp 0%</span>
              </div>
            </div>
            <div className="pt-unit-xs">
              <span className="font-body-sm text-body-sm text-on-surface-variant block mb-unit-2xs">Chứng nhận an toàn giao dịch</span>
              <div className="inline-flex items-center gap-unit-2xs px-unit-sm py-unit-2xs bg-surface-container-high rounded-full text-primary font-body-sm text-body-sm font-semibold">
                <span className="material-symbols-outlined text-sm leading-none">lock</span>
                Bảo mật SSL 256-bit Certified
              </div>
            </div>
          </div>

          {/* Cột 4: Đăng ký nhận khuyến mãi */}
          <div className="flex flex-col gap-unit-sm">
            <h4 className="font-title-card text-title-card text-on-surface font-semibold">Đăng ký nhận khuyến mãi</h4>
            <p className="font-body-md text-body-md text-on-surface-variant">Nhận voucher 200.000đ và cập nhật siêu phẩm công nghệ mới nhất.</p>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-unit-xs">
              <div className="relative flex items-center">
                <input
                  className="w-full px-unit-sm py-unit-xs bg-surface-container-lowest rounded-xl text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container/60"
                  placeholder="Nhập email của bạn..."
                  type="email"
                />
                <button
                  className="absolute right-1 px-unit-sm py-unit-2xs bg-tertiary-container text-on-tertiary font-body-sm text-body-sm rounded-lg font-bold hover:bg-tertiary transition-colors"
                  type="button"
                >
                  Đăng ký
                </button>
              </div>
            </form>
            <div className="pt-unit-2xs">
              <span className="font-body-sm text-body-sm text-on-surface-variant block mb-unit-xs">Kết nối với SmartZone qua mạng xã hội:</span>
              <div className="flex items-center gap-unit-xs">
                <a className="w-9 h-9 rounded-xl bg-surface-container-lowest hover:bg-primary hover:text-on-primary text-on-surface flex items-center justify-center shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all border border-surface-container/60" href="#">
                  <span className="material-symbols-outlined text-base leading-none">public</span>
                </a>
                <a className="w-9 h-9 rounded-xl bg-surface-container-lowest hover:bg-primary hover:text-on-primary text-on-surface flex items-center justify-center shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all border border-surface-container/60" href="#">
                  <span className="material-symbols-outlined text-base leading-none">smart_display</span>
                </a>
                <a className="w-9 h-9 rounded-xl bg-surface-container-lowest hover:bg-primary hover:text-on-primary text-on-surface flex items-center justify-center shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all border border-surface-container/60" href="#">
                  <span className="material-symbols-outlined text-base leading-none">videocam</span>
                </a>
                <a className="w-9 h-9 rounded-xl bg-surface-container-lowest hover:bg-primary hover:text-on-primary text-on-surface flex items-center justify-center shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all border border-surface-container/60" href="#">
                  <span className="material-symbols-outlined text-base leading-none">chat</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bản quyền dưới chân */}
        <div className="pt-unit-xl border-t border-surface-container flex flex-col md:flex-row items-center justify-between gap-unit-md">
          <div className="font-body-sm text-body-sm text-on-surface-variant text-center md:text-left">
            <span>© 2025 SmartZone Vietnam. Tất cả quyền được bảo lưu. Đối tác ủy quyền cao cấp của Apple, Samsung, Xiaomi tại Việt Nam.</span>
          </div>
          <div className="flex items-center gap-unit-md">
            <span className="font-label-spec text-label-spec uppercase tracking-wider text-secondary px-unit-xs py-unit-2xs bg-secondary-fixed rounded">
              Đã thông báo Bộ Công Thương
            </span>
            <span className="font-label-spec text-label-spec uppercase tracking-wider text-primary px-unit-xs py-unit-2xs bg-primary-fixed rounded">
              DMCA Protected
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
