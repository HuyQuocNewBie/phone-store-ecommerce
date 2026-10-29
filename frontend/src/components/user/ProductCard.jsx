import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';

/**
 * ProductCard – Thiết kế mới
 * Cấu trúc:
 *   1. Hình ảnh sản phẩm (Anh)
 *   2. Tên sản phẩm (TenSanPham)
 *   3. Mức giá bán (Gia) ở hàng trên
 *   4. Icon Trái tim thả tim ở hàng dưới căn phải (flex justify-end mt-2)
 */
const ProductCard = ({ product, item, onAddToCart, onBuyNow }) => {
  const navigate = useNavigate();
  const { isWished, toggleWishlist } = useWishlist();
  const data = product || item;

  if (!data) return null;

  const productId = data.MaSanPham ?? data.id;
  const isOutOfStock = data.TonKho !== undefined && data.TonKho <= 0;
  const isLiked = isWished(productId) === true;

  const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    toggleWishlist(data);
  };

  return (
    <div
      onClick={() => navigate(`/products/${productId}`)}
      className="group flex flex-col justify-between p-unit-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-xl transition-all duration-300 relative border border-surface-container/60 cursor-pointer"
    >
      <div className="flex flex-col">
        {/* 1. Hình ảnh sản phẩm */}
        <div className="w-full aspect-square flex items-center justify-center p-unit-xs relative overflow-hidden bg-surface-container-low rounded-lg mb-unit-xs group/image">
          {data.Anh ? (
            <img
              src={data.Anh}
              alt={data.TenSanPham}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80';
              }}
            />
          ) : (
            <span className="material-symbols-outlined text-4xl text-outline">smartphone</span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-error uppercase tracking-wider px-2 py-1 bg-error-container/20 rounded">
                Hết hàng
              </span>
            </div>
          )}
        </div>

        {/* 2. Tên sản phẩm */}
        <h3
          className="font-title-card text-title-card font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2 mt-unit-xs"
          title={data.TenSanPham}
        >
          {data.TenSanPham}
        </h3>
      </div>

      {/* 3. Giá bán & Icon Trái tim */}
      <div className="mt-unit-xs pt-unit-xs">
        {/* Mức giá bán ở hàng trên */}
        <div className="flex items-baseline">
          <span className="font-price-regular text-price-regular font-extrabold text-tertiary-container">
            {formatVND(data.Gia)}
          </span>
        </div>

        {/* Phía DƯỚI mức giá: Icon Trái tim căn lề phải */}
        <div className="flex justify-end mt-2">
          <button
            type="button"
            id={`btn-wishlist-${productId}`}
            onClick={handleWishlistClick}
            className="group/btn w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-all duration-200 hover:scale-110 active:scale-90"
            title={isLiked ? 'Bỏ yêu thích' : 'Yêu thích'}
            aria-label={isLiked ? 'Bỏ yêu thích' : 'Yêu thích'}
          >
            <Heart
              key={isLiked ? 'liked' : 'unliked'}
              className={`w-5 h-5 transition-colors duration-200 ${
                isLiked
                  ? 'text-[#fe2c55] fill-[#fe2c55] animate-tiktok-heart'
                  : 'text-slate-400 group-hover/btn:text-red-500 hover:text-red-500'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
