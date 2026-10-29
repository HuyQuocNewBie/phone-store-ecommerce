import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCompare } from '../../context/CompareContext';

/**
 * ProductCard – Stitch AI Design
 * 5 Thành phần:
 *   1. Hình ảnh sản phẩm (Anh)
 *   2. Tên sản phẩm (TenSanPham)
 *   3. Giá bán sản phẩm (Gia)
 *   4. Nút "Thêm giỏ" (addToCart)
 *   5. Nút "Mua ngay" (addToCart + navigate '/checkout')
 */
const ProductCard = ({ product, item, onAddToCart, onBuyNow }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { toggleCompare, isInCompare } = useCompare();
  const data = product || item;

  if (!data) return null;

  const isOutOfStock = data.TonKho !== undefined && data.TonKho <= 0;

  const defaultAddToCart = async (p) => {
    if (!isAuthenticated) {
      const intent = {
        product_id: p.MaSanPham,
        quantity: 1,
        action_type: 'add_to_cart',
        product_name: p.TenSanPham,
        redirect_back: window.location.pathname + window.location.search,
      };
      sessionStorage.setItem('cart_action_intent', JSON.stringify(intent));
      toast('Vui lòng đăng nhập để tiếp tục', { icon: '🔐', id: 'login-required', duration: 2500 });
      navigate('/login');
      return;
    }
    if (isOutOfStock) {
      toast.error('Sản phẩm đã hết hàng', { id: `out-of-stock-${p.MaSanPham}` });
      return;
    }
    try {
      const result = await addToCart(p.MaSanPham, 1);
      if (result.success) {
        toast.success(`Đã thêm "${p.TenSanPham}" vào giỏ hàng!`, {
          id: `add-cart-${p.MaSanPham}`,
          duration: 3000,
        });
      } else {
        toast.error(result.message || 'Không thể thêm vào giỏ hàng.', { id: 'cart-error' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể thêm vào giỏ hàng.', { id: 'cart-error' });
    }
  };

  const defaultBuyNow = async (p) => {
    if (!isAuthenticated) {
      const intent = {
        product_id: p.MaSanPham,
        quantity: 1,
        action_type: 'buy_now',
        product_name: p.TenSanPham,
        redirect_back: '/checkout',
      };
      sessionStorage.setItem('cart_action_intent', JSON.stringify(intent));
      toast('Vui lòng đăng nhập để tiếp tục', { icon: '🔐', id: 'login-required', duration: 2500 });
      navigate('/login');
      return;
    }
    if (isOutOfStock) {
      toast.error('Sản phẩm đã hết hàng', { id: `out-of-stock-${p.MaSanPham}` });
      return;
    }
    try {
      const result = await addToCart(p.MaSanPham, 1);
      if (result.success) {
        navigate('/checkout');
      } else {
        toast.error(result.message || 'Không thể thêm vào giỏ hàng.', { id: 'cart-error' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể thêm vào giỏ hàng.', { id: 'cart-error' });
    }
  };

  const handleCartClick = (e) => {
    e.stopPropagation();
    if (onAddToCart) onAddToCart(data);
    else defaultAddToCart(data);
  };

  const handleBuyClick = (e) => {
    e.stopPropagation();
    if (onBuyNow) onBuyNow(data);
    else defaultBuyNow(data);
  };

  const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  return (
    <div className="group flex flex-col justify-between p-unit-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-xl transition-all duration-300 relative border border-surface-container/60">
      <div className="flex flex-col">
        {/* 1. Hình ảnh sản phẩm */}
        <div
          onClick={() => navigate(`/products/${data.MaSanPham}`)}
          className="w-full aspect-square flex items-center justify-center p-unit-xs relative overflow-hidden bg-surface-container-low rounded-lg mb-unit-xs cursor-pointer"
        >
          {/* Nút Toggle So sánh */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCompare(data);
            }}
            className={`btn-compare-toggle absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isInCompare(data.MaSanPham)
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/90 backdrop-blur-sm text-gray-500 hover:text-blue-600 hover:bg-white shadow-sm'
            }`}
            title={isInCompare(data.MaSanPham) ? 'Đã thêm vào so sánh (Click để bỏ)' : 'So sánh sản phẩm'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          {data.Anh ? (
            <img
              src={data.Anh}
              alt={data.TenSanPham}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80';
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
          onClick={() => navigate(`/products/${data.MaSanPham}`)}
          className="font-title-card text-title-card font-bold text-on-surface group-hover:text-primary transition-colors cursor-pointer line-clamp-2 mt-unit-xs"
          title={data.TenSanPham}
        >
          {data.TenSanPham}
        </h3>
      </div>

      {/* 3. Giá bán & Nút hành động */}
      <div className="mt-unit-xs pt-unit-xs">
        <div className="flex items-baseline mb-unit-xs">
          <span className="font-price-regular text-price-regular font-extrabold text-tertiary-container">
            {formatVND(data.Gia)}
          </span>
        </div>

        {/* 4. Nút Thêm giỏ & 5. Nút Mua ngay */}
        <div className="flex items-center gap-unit-xs pt-unit-2xs">
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleCartClick}
            className="flex-1 py-2 px-unit-xs rounded-lg bg-surface-container hover:bg-primary-fixed text-primary font-body-sm text-body-sm font-semibold transition-colors flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Thêm vào giỏ"
          >
            <span className="material-symbols-outlined text-lg leading-none">add_shopping_cart</span>
            <span className="hidden sm:inline">Thêm giỏ</span>
          </button>
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleBuyClick}
            className="flex-1 py-2 px-unit-xs rounded-lg bg-tertiary-container hover:bg-tertiary text-on-tertiary font-body-sm text-body-sm font-bold shadow-sm transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mua ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
