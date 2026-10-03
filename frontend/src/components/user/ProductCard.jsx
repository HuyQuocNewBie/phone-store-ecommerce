import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, PackageCheck } from 'lucide-react';

/**
 * ProductCard – Stitch AI Design
 * Props:
 *   - product / item: { MaSanPham, TenSanPham, Anh, Gia, DungLuong }
 *   - onAddToCart: (product) => void
 *   - onBuyNow: (product) => void
 */
const ProductCard = ({ product, item, onAddToCart, onBuyNow }) => {
  const navigate = useNavigate();
  const data = product || item;

  if (!data) return null;

  const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  return (
    <div className="bg-surface-container-lowest rounded-xl p-unit-md shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Khung ảnh sản phẩm */}
        <div
          onClick={() => navigate(`/products/${data.MaSanPham}`)}
          className="w-full h-48 bg-surface-container-low rounded-lg mb-unit-sm flex items-center justify-center p-unit-sm overflow-hidden cursor-pointer"
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
            onClick={() => onAddToCart?.(data)}
            className="py-unit-xs bg-surface-container-high text-primary font-body-md text-body-md rounded-lg hover:bg-primary hover:text-on-primary transition-colors font-medium flex items-center justify-center gap-1 active:scale-95"
          >
            Thêm giỏ
          </button>
          <button
            type="button"
            onClick={() => onBuyNow?.(data)}
            className="py-unit-xs bg-tertiary-container text-on-tertiary font-body-md text-body-md rounded-lg font-semibold hover:bg-tertiary transition-colors flex items-center justify-center gap-1 active:scale-95"
          >
            Mua ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
