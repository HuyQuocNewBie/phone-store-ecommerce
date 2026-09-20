import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, PackageCheck } from 'lucide-react';

/**
 * ProductCard – Component tối giản cho sản phẩm
 * Props:
 *   - item: { MaSanPham, TenSanPham, Anh, Gia, DungLuong }
 *   - onAddToCart: (item) => void
 *   - accentColor: 'sky' | 'indigo' (mặc định 'sky')
 */
const ProductCard = ({ item, onAddToCart, accentColor = 'sky' }) => {
  const navigate = useNavigate();

  const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  const colorMap = {
    sky: {
      price: 'text-sky-400',
      btn: 'bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white border-sky-500/20',
      hover: 'hover:border-sky-500/50 hover:shadow-sky-500/10'
    },
    indigo: {
      price: 'text-indigo-400',
      btn: 'bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border-indigo-500/20',
      hover: 'hover:border-indigo-500/50 hover:shadow-indigo-500/10'
    }
  };

  const colors = colorMap[accentColor] || colorMap.sky;

  return (
    <div
      className={`bg-slate-900/90 border border-slate-800 ${colors.hover} rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 hover:shadow-2xl group`}
    >
      {/* Ảnh sản phẩm – aspect-square + object-contain để ảnh vừa vặn không cắt */}
      <div
        className="w-full aspect-square rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden flex items-center justify-center p-4 group-hover:border-slate-700 transition-colors cursor-pointer"
        onClick={() => navigate(`/products/${item.MaSanPham}`)}
      >
        {item.Anh ? (
          <img
            src={item.Anh}
            alt={item.TenSanPham}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <PackageCheck className="w-12 h-12 text-slate-700" />
        )}
      </div>

      {/* Thông tin sản phẩm */}
      <div className="flex flex-col gap-1.5 flex-1">
        <h3
          onClick={() => navigate(`/products/${item.MaSanPham}`)}
          className="text-sm font-bold text-slate-100 hover:text-sky-400 transition-colors cursor-pointer line-clamp-2 leading-snug"
        >
          {item.TenSanPham}
        </h3>

        <div className="flex items-baseline justify-between pt-1">
          <p className={`text-base font-black ${colors.price}`}>
            {formatVND(item.Gia)}
          </p>
          {item.DungLuong && (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
              {item.DungLuong}
            </span>
          )}
        </div>
      </div>

      {/* Nút thêm giỏ hàng */}
      <button
        type="button"
        onClick={() => onAddToCart?.(item)}
        className={`w-full py-2 border ${colors.btn} text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5`}
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        <span>Thêm vào giỏ</span>
      </button>
    </div>
  );
};

export default ProductCard;
