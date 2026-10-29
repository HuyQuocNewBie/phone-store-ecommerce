import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Heart, ShoppingCart, Sparkles, ArrowRight } from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

/* ─── Formatter ───────────────────────────────────────────────────────────── */
const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

/* ─── Skeleton Card ───────────────────────────────────────────────────────── */
const WishlistSkeleton = () => (
  <div className="flex flex-col rounded-xl bg-surface-container-lowest shadow-sm animate-pulse border border-surface-container/50 overflow-hidden">
    <div className="w-full aspect-square bg-surface-container-low" />
    <div className="p-unit-md space-y-3">
      <div className="h-4 bg-surface-container-low rounded w-3/4" />
      <div className="h-3 bg-surface-container-low rounded w-1/2" />
      <div className="h-5 bg-surface-container-low rounded w-2/5 mt-unit-xs" />
      <div className="h-9 bg-surface-container-low rounded-lg w-full" />
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

          {/* Inner heart highlight (empty / broken look) */}
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
      <h1 className="relative z-10 font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg text-on-surface font-extrabold tracking-tight mb-unit-xs">
        Danh sách yêu thích của bạn đang trống
      </h1>
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

/* ─── Wishlist Product Card ───────────────────────────────────────────────── */
const WishlistCard = ({ item, onRemove, onAddToCart }) => {
  const navigate = useNavigate();
  const [addingToCart, setAddingToCart] = useState(false);
  const [removing, setRemoving] = useState(false);

  const productId = Number(item.MaSanPham ?? item.id ?? item.product_id);
  const isOutOfStock = item.TonKho !== undefined && item.TonKho <= 0;

  const handleRemove = async (e) => {
    e.stopPropagation();
    setRemoving(true);
    await onRemove(item);
    // No need to setRemoving(false) because the component will unmount
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    setAddingToCart(true);
    await onAddToCart(item);
    setAddingToCart(false);
  };

  return (
    <div className="group flex flex-col rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-xl transition-all duration-300 border border-surface-container/60 overflow-hidden">
      {/* Image area */}
      <div
        onClick={() => navigate(`/products/${productId}`)}
        className="relative w-full aspect-square bg-surface-container-low flex items-center justify-center p-unit-sm cursor-pointer overflow-hidden"
      >
        {/* Remove from wishlist button */}
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-sm hover:shadow-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 disabled:opacity-50"
          title="Xóa khỏi yêu thích"
        >
          {removing ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-[#fe2c55]/40 border-t-[#fe2c55] rounded-full animate-spin" />
          ) : (
            <Heart className="w-4 h-4 text-[#fe2c55] fill-[#fe2c55] transition-colors duration-200" />
          )}
        </button>

        {/* Product image */}
        {item.Anh ? (
          <img
            src={item.Anh}
            alt={item.TenSanPham}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80';
            }}
          />
        ) : (
          <span className="material-symbols-outlined text-5xl text-outline">smartphone</span>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex items-center justify-center rounded-none">
            <span className="text-xs font-bold text-error uppercase tracking-wider px-2 py-1 bg-error-container/20 rounded">
              Hết hàng
            </span>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex flex-col flex-1 p-unit-md pt-unit-sm gap-unit-xs">
        {/* Name */}
        <h3
          onClick={() => navigate(`/products/${productId}`)}
          className="font-title-card text-title-card font-bold text-on-surface group-hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug"
          title={item.TenSanPham}
        >
          {item.TenSanPham}
        </h3>

        {/* Brand / Category badge (if available) */}
        {(item.TenNhaSanXuat || item.TenDanhMuc) && (
          <span className="text-xs text-on-surface-variant font-medium">
            {item.TenNhaSanXuat || item.TenDanhMuc}
          </span>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-unit-xs mt-auto pt-unit-xs">
          <span className="font-price-regular text-price-regular font-extrabold text-tertiary-container">
            {formatVND(item.Gia)}
          </span>
          {item.GiaGoc && Number(item.GiaGoc) > Number(item.Gia) && (
            <>
              <span className="text-xs text-outline line-through">{formatVND(item.GiaGoc)}</span>
              <span className="text-[11px] font-bold text-[#fe2c55] bg-[#fe2c55]/10 px-1.5 py-0.5 rounded">
                -{Math.round((1 - Number(item.Gia) / Number(item.GiaGoc)) * 100)}%
              </span>
            </>
          )}
        </div>

        {/* Add to cart button */}
        <button
          type="button"
          disabled={isOutOfStock || addingToCart}
          onClick={handleAddToCart}
          className="mt-unit-xs w-full flex items-center justify-center gap-unit-xs py-2 px-unit-xs rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-primary/20 hover:shadow-md"
        >
          {addingToCart ? (
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <ShoppingCart className="w-4 h-4" />
          )}
          <span>{isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}</span>
        </button>
      </div>
    </div>
  );
};

/* ─── WishlistPage ────────────────────────────────────────────────────────── */
const WishlistPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { wishlistItems, loading, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  /* ── Handlers ── */
  const handleRemove = async (item) => {
    await toggleWishlist(item);
  };

  const handleAddToCart = async (item) => {
    if (!isAuthenticated) {
      toast('Vui lòng đăng nhập để tiếp tục', { icon: '🔐', id: 'login-required', duration: 2500 });
      navigate('/login');
      return;
    }

    const productId = Number(item.MaSanPham ?? item.id ?? item.product_id);

    if (item.TonKho !== undefined && item.TonKho <= 0) {
      toast.error('Sản phẩm đã hết hàng', { id: `out-of-stock-${productId}` });
      return;
    }

    try {
      const result = await addToCart(productId, 1);
      if (result?.success) {
        toast.success(`Đã thêm "${item.TenSanPham}" vào giỏ hàng!`, {
          id: `add-cart-${productId}`,
          duration: 3000,
        });
      } else {
        toast.error(result?.message || 'Không thể thêm vào giỏ hàng.', { id: 'cart-error' });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không thể thêm vào giỏ hàng.', { id: 'cart-error' });
    }
  };

  const count = wishlistItems.length;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 w-full bg-surface py-unit-lg md:py-unit-xl pb-unit-4xl">
        <div className="max-w-container-max mx-auto px-gutter-desktop w-full flex flex-col gap-unit-lg">

          {/* ── Breadcrumb ── */}
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-unit-2xs text-on-surface-variant font-body-sm text-body-sm">
              <Link to="/" className="hover:text-primary transition-colors flex items-center gap-unit-2xs">
                <span className="material-symbols-outlined text-base leading-none">home</span>
                Trang chủ
              </Link>
              <span className="material-symbols-outlined text-xs text-outline leading-none">chevron_right</span>
              <span className="text-on-surface font-semibold">Danh sách yêu thích</span>
            </nav>
          </div>

          {/* ── Page Header ── */}
          <div className="flex items-center justify-between flex-wrap gap-unit-sm">
            <div className="flex items-center gap-unit-sm">
              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-[#fe2c55]/10 flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6 text-[#fe2c55] fill-[#fe2c55]" />
              </div>
              <div>
                <h1 className="font-headline-sm text-headline-sm font-extrabold text-on-surface leading-tight">
                  Sản phẩm yêu thích của tôi
                </h1>
                {!loading && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    {count > 0
                      ? `${count} sản phẩm đang được lưu`
                      : 'Chưa có sản phẩm nào'}
                  </p>
                )}
              </div>
            </div>

            {/* Count badge */}
            {!loading && count > 0 && (
              <div className="flex items-center gap-unit-xs">
                <span className="inline-flex items-center gap-1 px-unit-sm py-1 rounded-full bg-[#fe2c55]/10 text-[#fe2c55] font-body-sm text-body-sm font-bold">
                  <Heart className="w-3.5 h-3.5 fill-[#fe2c55]" />
                  {count}
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="inline-flex items-center gap-1 px-unit-sm py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-body-sm text-body-sm font-semibold transition-colors"
                >
                  <span className="material-symbols-outlined text-sm leading-none">explore</span>
                  Tiếp tục mua sắm
                </button>
              </div>
            )}
          </div>

          {/* ── Content Area ── */}
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
            /* Product grid */
            <>
              {/* Stats bar */}
              <div className="flex items-center gap-unit-sm px-unit-sm py-unit-xs rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm">
                <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-base leading-none text-[#fe2c55]">favorite</span>
                  <span>
                    Hiển thị <span className="font-bold text-on-surface">{count}</span> sản phẩm yêu thích
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-1 font-label-spec text-label-spec text-outline uppercase tracking-wider text-[11px]">
                  <span className="material-symbols-outlined text-sm leading-none">info</span>
                  Nhấn tim để xóa khỏi danh sách
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-unit-md">
                {wishlistItems.map((item) => {
                  const key = item.MaSanPham ?? item.id ?? item.product_id;
                  return (
                    <WishlistCard
                      key={key}
                      item={item}
                      onRemove={handleRemove}
                      onAddToCart={handleAddToCart}
                    />
                  );
                })}
              </div>

              {/* Bottom CTA */}
              <div className="flex flex-col items-center gap-unit-sm pt-unit-sm pb-unit-md text-center">
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Muốn khám phá thêm nhiều sản phẩm mới?
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="inline-flex items-center gap-unit-xs px-unit-lg py-unit-xs rounded-xl bg-surface-container hover:bg-primary-fixed/30 text-primary font-body-sm text-body-sm font-bold border border-primary/20 hover:border-primary/40 transition-all duration-200 active:scale-95"
                >
                  <span className="material-symbols-outlined text-base leading-none">grid_view</span>
                  Xem tất cả sản phẩm
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WishlistPage;

