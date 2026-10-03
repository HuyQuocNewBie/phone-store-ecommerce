import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, PackageCheck } from 'lucide-react';

/**
 * ProductCard – EVONDEV Light Theme
 * Props:
 *   - item: { MaSanPham, TenSanPham, Anh, Gia, DungLuong }
 *   - onAddToCart: (item) => void
 */
const ProductCard = ({ item, onAddToCart }) => {
  const navigate = useNavigate();

  const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  return (
    <div
      className="group bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-3
                 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]
                 transition-all duration-300
                 hover:-translate-y-1 hover:shadow-[0_12px_40px_-8px_rgba(37,99,235,0.12)]
                 hover:border-blue-100 cursor-pointer"
    >
      {/* Khung ảnh vuông */}
      <div
        className="aspect-square rounded-xl bg-slate-50 p-4 flex items-center justify-center overflow-hidden mb-1"
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
          <PackageCheck className="w-12 h-12 text-slate-300" />
        )}
      </div>

      {/* Thông tin sản phẩm */}
      <div className="flex flex-col gap-2 flex-1">
        <h3
          onClick={() => navigate(`/products/${item.MaSanPham}`)}
          className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug"
        >
          {item.TenSanPham}
        </h3>

        <div className="flex items-center justify-between">
          <p className="font-bold text-blue-600 text-base">
            {formatVND(item.Gia)}
          </p>
          {item.DungLuong && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
              {item.DungLuong}
            </span>
          )}
        </div>
      </div>

      {/* Nút thêm giỏ hàng */}
      <button
        type="button"
        onClick={() => onAddToCart?.(item)}
        className="w-full py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl
                   transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5
                   shadow-sm shadow-blue-500/20"
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        <span>Thêm vào giỏ</span>
      </button>
    </div>
  );
};

export default ProductCard;
