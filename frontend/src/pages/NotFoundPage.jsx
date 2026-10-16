import { Link } from 'react-router-dom';
import Navbar from '../components/user/Navbar';
import Footer from '../components/user/Footer';

/**
 * NotFoundPage — Trang 404 với thiết kế Stitch AI SmartZone.
 * Hiển thị badge lỗi, đồ họa SVG Radar/Vệ tinh giữa số 404,
 * tiêu đề, mô tả lỗi và nút điều hướng về trang chủ.
 */
const NotFoundPage = () => {
  return (
    <>
      <Navbar />

      <main className="w-full bg-surface min-h-screen">
        {/* ── 404 Hero Section ── */}
        <section className="relative w-full py-16 overflow-hidden">

          {/* Glow Background Effects */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full bg-gradient-to-br from-[#dbe1ff] via-[rgba(172,237,255,0.4)] to-transparent blur-3xl" />
            <div className="absolute top-12 left-10 w-96 h-96 rounded-full bg-[rgba(226,231,255,0.6)] blur-2xl" />
            <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-[rgba(180,197,255,0.3)] blur-2xl" />
          </div>

          <div className="relative max-w-[80rem] mx-auto px-6 flex flex-col items-center text-center">

            {/* ── Badge Thông Báo ── */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high text-primary shadow-sm mb-6">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-tertiary-container animate-pulse" />
              <span
                className="font-bold text-on-surface-variant tracking-wider uppercase"
                style={{ fontSize: '11px', lineHeight: '14px', letterSpacing: '0.04em' }}
              >
                Lỗi 404 • Tín hiệu không phản hồi
              </span>
            </div>

            {/* ── Khối Hình Ảnh 4 [SVG Radar] 4 ── */}
            <div className="relative flex items-center justify-center select-none my-2">
              {/* Số 4 trái */}
              <span
                className="font-extrabold tracking-tighter text-surface-container-highest leading-none drop-shadow-sm"
                style={{ fontSize: 'clamp(110px, 15vw, 210px)' }}
              >
                4
              </span>

              {/* Radar / Satellite SVG ở giữa */}
              <div className="relative mx-2 md:mx-4 flex items-center justify-center">
                <div className="relative w-28 h-28 md:w-44 md:h-44 lg:w-48 lg:h-48 rounded-full bg-surface-container-lowest shadow-xl flex items-center justify-center overflow-hidden">

                  {/* SVG Radar */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    fill="none"
                    viewBox="0 0 200 200"
                    style={{ color: 'rgba(0,104,122,0.3)' }}
                  >
                    <circle cx="100" cy="100" r="90" stroke="currentColor" strokeDasharray="6 6" strokeWidth="1.5" />
                    <circle cx="100" cy="100" r="66" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="100" cy="100" r="42" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" />
                    <line stroke="currentColor" strokeWidth="0.75" x1="100" x2="100" y1="10" y2="190" />
                    <line stroke="currentColor" strokeWidth="0.75" x1="10" x2="190" y1="100" y2="100" />
                    <circle
                      className="animate-ping"
                      cx="100" cy="100"
                      fill="#004ac6"
                      r="6"
                      style={{ opacity: 0.75 }}
                    />
                    <path
                      d="M100 100 L165 45 A 90 90 0 0 0 100 10 Z"
                      fill="url(#radarSweep404)"
                      opacity="0.35"
                    />
                    <defs>
                      <linearGradient id="radarSweep404" x1="0%" x2="100%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#00687a" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Phone / Satellite Device */}
                  <div className="relative z-10 w-16 h-28 md:w-20 md:h-36 rounded-2xl bg-inverse-surface shadow-2xl p-1.5 flex flex-col items-center justify-between">
                    <div className="w-8 h-1 rounded-full bg-outline-variant/60" />
                    <div className="w-full flex-1 rounded-lg bg-inverse-surface flex flex-col items-center justify-center px-1">
                      <span
                        className="material-symbols-outlined text-secondary-container animate-bounce"
                        style={{ fontSize: '1.5rem' }}
                      >
                        satellite_alt
                      </span>
                      <span
                        className="text-surface-container-high tracking-tight text-center leading-tight mt-1 font-bold"
                        style={{ fontSize: '9px', letterSpacing: '0.04em' }}
                      >
                        NO SIGNAL
                      </span>
                      <div className="flex items-center gap-0.5 mt-1">
                        <span className="w-1 h-1 rounded-full bg-error" />
                        <span className="w-1 h-1 rounded-full bg-error opacity-50" />
                        <span className="w-1 h-1 rounded-full bg-error opacity-20" />
                      </div>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-outline/40" />
                  </div>

                  {/* WiFi Off Badge */}
                  <div className="absolute -top-1 -right-1 w-9 h-9 md:w-11 md:h-11 rounded-full bg-error-container text-error flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined font-bold" style={{ fontSize: '1.125rem' }}>
                      wifi_off
                    </span>
                  </div>
                </div>
              </div>

              {/* Số 4 phải */}
              <span
                className="font-extrabold tracking-tighter text-surface-container-highest leading-none drop-shadow-sm"
                style={{ fontSize: 'clamp(110px, 15vw, 210px)' }}
              >
                4
              </span>
            </div>

            {/* ── Tiêu Đề & Mô Tả Lỗi ── */}
            <div className="max-w-2xl mt-2">
              <h1
                className="text-on-surface tracking-tight font-extrabold"
                style={{ fontSize: 'clamp(22px, 3vw, 40px)', lineHeight: '1.2' }}
              >
                Ối! Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển
              </h1>
              <p
                className="text-on-surface-variant mt-3 leading-relaxed"
                style={{ fontSize: '16px', lineHeight: '24px' }}
              >
                Đường dẫn bạn truy cập có thể đã hết hạn, sản phẩm đã đổi tên hoặc địa chỉ URL bị nhập sai.
                Đừng lo lắng, SmartZone sẵn sàng hỗ trợ bạn tiếp tục khám phá thiết bị flagship mong muốn!
              </p>
            </div>

            {/* ── Nút "Về Trang Chủ SmartZone" ── */}
            <div className="flex items-center justify-center mt-8 mb-16">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary hover:bg-primary-container text-on-primary font-bold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
                style={{ fontSize: '14px', lineHeight: '20px' }}
              >
                <span
                  className="material-symbols-outlined leading-none"
                  style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}
                >
                  home
                </span>
                <span>Về Trang Chủ SmartZone</span>
              </Link>
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default NotFoundPage;
