import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import ProductCard from '../../components/user/ProductCard';
import { useWishlist } from '../../context/WishlistContext';

/* ─── Skeleton Card ───────────────────────────────────────────────────────── */
const WishlistSkeleton = () => (
  <div className="flex flex-col justify-between p-unit-md rounded-xl bg-surface-container-lowest shadow-sm animate-pulse border border-surface-container/50">
    <div className="flex flex-col">
      <div className="w-full aspect-square bg-surface-container-low rounded-lg mb-unit-xs" />
      <div className="h-4 bg-surface-container-low rounded w-3/4 mt-unit-xs" />
      <div className="h-4 bg-surface-container-low rounded w-1/2 mt-2" />
    </div>
    <div className="mt-unit-xs pt-unit-xs flex items-center justify-between">
      <div className="h-5 bg-surface-container-low rounded w-1/3" />
      <div className="w-8 h-8 bg-surface-container-low rounded-lg" />
    </div>
  </div>
);

/* ─── Empty State ─────────────────────────────────────────────────────────── */
const EmptyWishlist = () => {
  const navigate = useNavigate();
  return (
    <div className="relative w-full rounded-2xl bg-surface-container-lowest p-unit-xl md:p-unit-3xl shadow-sm flex flex-col items-center text-center overflow-hidden">
      {/* Ambient gradient glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#fe2c55]/10 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute -bottom-20 right-1/4 w-72 h-72 bg-primary-fixed/20 rounded-full blur-2xl pointer-events-none -z-0" />

      {/* SVG Illustration */}
      <div className="relative z-10 w-48 h-48 mb-unit-lg flex items-center justify-center select-none">
        <svg className="w-full h-full" fill="none" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
          {/* Floor glow */}
          <ellipse className="text-surface-container-high" cx="90" cy="158" fill="currentColor" rx="62" ry="10" />

          {/* Floating sparkles */}
          <path className="text-secondary-container animate-pulse" d="M148 32L151.5 42L161.5 45.5L151.5 49L148 59L144.5 49L134.5 45.5L144.5 42L148 32Z" fill="currentColor" />
          <circle className="text-primary-container" cx="30" cy="48" fill="currentColor" opacity="0.6" r="5" />
          <circle className="text-tertiary-container" cx="156" cy="110" fill="currentColor" opacity="0.45" r="6" />
          <circle className="text-secondary" cx="38" cy="118" fill="currentColor" opacity="0.4" r="3" />

          {/* Heart body */}
          <path
            className="text-surface-container-low"
            d="M90 140C90 140 34 108 34 68C34 50.3 48.3 36 66 36C75.2 36 83.4 40.2 89.9 46.8C96.4 40.2 104.8 36 114 36C131.7 36 146 50.3 146 68C146 108 90 140 90 140Z"
            fill="currentColor"
          />
          {/* Heart fill gradient via two overlaid paths */}
          <path
            d="M90 133C90 133 40 103 40 68C40 53.7 51.7 42 66 42C74.6 42 82.3 46.2 88.1 52.7L90 54.8L91.9 52.7C97.7 46.2 105.4 42 114 42C128.3 42 140 53.7 140 68C140 103 90 133 90 133Z"
            fill="#fe2c55"
            opacity="0.18"
          />

          {/* Inner heart highlight */}
          <path
            d="M90 125C90 125 47 98 47 68C47 57.5 55.5 49 66 49C72.5 49 78.4 52.3 82.7 57.5L90 65.8L97.3 57.5C101.6 52.3 107.5 49 114 49C124.5 49 133 57.5 133 68C133 98 90 125 90 125Z"
            fill="#fe2c55"
            opacity="0.09"
          />

          {/* Center broken / empty badge */}
          <circle cx="90" cy="82" r="20" fill="white" opacity="0.85" />
          <circle cx="90" cy="82" r="16" fill="#fe2c55" opacity="0.12" />
          {/* Plus icon inside */}
          <line x1="90" y1="75" x2="90" y2="89" stroke="#fe2c55" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="83" y1="82" x2="97" y2="82" stroke="#fe2c55" strokeWidth="2.5" strokeLinecap="round" />

          {/* Small floating hearts */}
          <path
            d="M152 68C152 68 144 63 144 57.5C144 54.5 146.5 52 149.5 52C151 52 152.2 52.8 153 54C153.8 52.8 155 52 156.5 52C159.5 52 162 54.5 162 57.5C162 63 154 68 154 68H152Z"
            fill="#fe2c55"
            opacity="0.35"
          />
          <path
            d="M22 80C22 80 16 76.2 16 72.3C16 70 17.8 68 20 68C21.1 68 22.1 68.6 22.7 69.5C23.3 68.6 24.3 68 25.4 68C27.6 68 29.4 70 29.4 72.3C29.4 76.2 23.4 80 23.4 80H22Z"
            fill="#fe2c55"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Text content */}
      <h2 className="relative z-10 font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg text-on-surface font-extrabold tracking-tight mb-unit-xs">
        Danh sách yêu thích của bạn đang trống
      </h2>
      <p className="relative z-10 font-body-lg text-body-lg text-on-surface-variant max-w-lg mx-auto mb-unit-xl">
        Nhấn vào icon&nbsp;
        <Heart className="inline-block w-4 h-4 text-[#fe2c55] fill-[#fe2c55] align-middle" />
        &nbsp;trên bất kỳ sản phẩm nào để lưu vào danh sách yêu thích và mua sắm tiện lợi hơn!
      </p>

      <div className="relative z-10 flex items-center justify-center w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-unit-xs px-unit-xl py-unit-sm bg-[#fe2c55] hover:bg-[#d4234a] text-white rounded-xl font-body-md text-body-md font-bold shadow-md shadow-[#fe2c55]/25 hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
        >
          <Sparkles className="w-5 h-5" />
          <span>Khám phá sản phẩm ngay</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/* ─── WishlistPage ────────────────────────────────────────────────────────── */
const WishlistPage = () => {
  const { wishlistItems, loading } = useWishlist();
  const count = wishlistItems.length;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 w-full bg-surface py-unit-lg md:py-unit-xl pb-unit-4xl">
        <div className="max-w-container-max mx-auto px-gutter-desktop w-full flex flex-col gap-unit-lg">

          {/* ── Breadcrumb ── */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
              <span className="material-symbols-outlined text-base leading-none">home</span>
              Trang chủ
            </Link>
            <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
            <span className="text-on-surface font-semibold">Danh sách yêu thích</span>
          </nav>

          {/* ── Tiêu đề chính + Badge số lượng ── */}
          <div className="flex items-center gap-unit-xs">
            <h1 className="font-headline-sm text-headline-sm font-extrabold text-on-surface leading-tight">
              Sản phẩm yêu thích của tôi
            </h1>
            {!loading && count > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#fe2c55]/10 text-[#fe2c55] font-body-sm text-body-sm font-bold">
                {count}
              </span>
            )}
          </div>

          {/* ── Danh sách sản phẩm ── */}
          {loading ? (
            /* Loading skeleton */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-unit-md">
              {Array.from({ length: 8 }).map((_, i) => (
                <WishlistSkeleton key={i} />
              ))}
            </div>
          ) : count === 0 ? (
            /* Empty state */
            <EmptyWishlist />
          ) : (
            /* Grid hiển thị sản phẩm sử dụng ProductCard */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-unit-md">
              {wishlistItems.map((item) => {
                const key = item.MaSanPham ?? item.id ?? item.product_id;
                return (
                  <ProductCard
                    key={key}
                    product={item}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WishlistPage;
