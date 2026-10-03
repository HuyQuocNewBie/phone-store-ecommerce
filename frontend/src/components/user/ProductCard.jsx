import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShoppingCart, PackageCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

/**
 * ProductCard – Stitch AI Design
 * Props:
 *   - product / item: { MaSanPham, TenSanPham, Anh, Gia, DungLuong, TonKho }
 *   - onAddToCart: (product) => void
 *   - onBuyNow: (product) => void
 */
const ProductCard = ({ product, item, onAddToCart, onBuyNow }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
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
        navigate('/cart');
      } else {
        toast.error(result.message || 'Không thể thêm vào giỏ hàng.', { id: 'cart-error' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể thêm vào giỏ hàng.', { id: 'cart-error' });
    }
  };

  const handleCartClick = () => {
    if (onAddToCart) onAddToCart(data);
    else defaultAddToCart(data);
  };

  const handleBuyClick = () => {
    if (onBuyNow) onBuyNow(data);
    else defaultBuyNow(data);
  };

  const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  return (
    <div className="bg-surface-container-lowest rounded-xl p-unit-md shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Khung ảnh sản phẩm */}
        <div
          onClick={() => navigate(`/products/${data.MaSanPham}`)}
          className="w-full h-48 bg-surface-container-low rounded-lg mb-unit-sm flex items-center justify-center p-unit-sm overflow-hidden cursor-pointer relative"
        >
          {data.Anh ? (
            <img
              src={data.Anh}
              alt={data.TenSanPham}
              className="h-full object-contain group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80';
              }}
            />
          ) : (
            <PackageCheck className="w-12 h-12 text-outline" />
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hết hàng</span>
            </div>
          )}
        </div>

        {/* Tên sản phẩm */}
        <h3
          onClick={() => navigate(`/products/${data.MaSanPham}`)}
          className="font-title-card text-title-card text-on-surface mb-unit-2xs group-hover:text-primary transition-colors cursor-pointer line-clamp-2"
          title={data.TenSanPham}
        >
          {data.TenSanPham}
        </h3>
      </div>

      {/* Giá & Nút hành động */}
      <div className="mt-unit-xs">
        <div className="flex items-baseline justify-between mb-unit-sm">
          <span className="font-price-hero text-price-hero text-primary font-extrabold">
            {formatVND(data.Gia)}
          </span>
          {data.DungLuong && (
            <span className="px-unit-xs py-unit-2xs bg-surface-container-high text-primary rounded font-label-spec text-label-spec">
              {data.DungLuong}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-unit-xs">
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleCartClick}
            className="py-unit-xs bg-surface-container-high text-primary font-body-md text-body-md rounded-lg hover:bg-primary hover:text-on-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-1 active:scale-95"
          >
            {isOutOfStock ? 'Hết hàng' : 'Thêm giỏ'}
          </button>
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleBuyClick}
            className="py-unit-xs bg-tertiary-container text-on-tertiary font-body-md text-body-md rounded-lg font-semibold hover:bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 active:scale-95"
          >
            Mua ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
