import React, { useState, useRef } from 'react';
import {
  ShoppingBag,
  ExternalLink,
  Tag,
  Copy,
  Check,
  CheckCheck,
  Scale,
  Truck,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Smartphone,
  CreditCard,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Định dạng tiền tệ VNĐ
 */
const formatVND = (price) => {
  const num = Number(price);
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=300&auto=format&fit=crop&q=80';

// ============================================================================
// 1. ProductListCard: Danh sách sản phẩm nằm ngang
// ============================================================================
/**
 * Render danh sách sản phẩm nằm ngang (Ảnh, Tên, Giá, Cấu hình chính, Nút "Xem chi tiết").
 * Hỗ trợ cuộn ngang mượt mà kèm nút bấm điều hướng trái/phải.
 */
export const ProductListCard = ({ products = [], data, onNavigate }) => {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Hỗ trợ truyền vào qua prop 'data' hoặc 'products'
  const targetData = data !== undefined ? data : products;

  const rawList = Array.isArray(targetData)
    ? targetData
    : targetData?.products && Array.isArray(targetData.products)
    ? targetData.products
    : [];

  const list = rawList.slice(0, 8); // Tối đa 8 sản phẩm

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Trạng thái rỗng (Empty State) khi data rỗng hoặc không tìm thấy sản phẩm
  if (!targetData || (Array.isArray(targetData) && targetData.length === 0) || list.length === 0) {
    return (
      <div className="w-full my-2 p-4 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200/90 flex flex-col items-center justify-center text-center gap-2.5">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <Search className="w-5 h-5 text-slate-500" />
        </div>
        <p className="text-xs font-medium text-slate-600 leading-relaxed max-w-[260px]">
          Không tìm thấy sản phẩm phù hợp trong hệ thống
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.('/products')}
          className="mt-0.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all duration-200 active:scale-95"
        >
          <span>Xem tất cả sản phẩm</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full my-2 text-slate-800">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <span className="p-1 rounded-lg bg-blue-100 text-blue-600">
            <Smartphone className="w-3.5 h-3.5" />
          </span>
          <span>Sản phẩm gợi ý ({list.length})</span>
        </div>

        {/* Nút điều hướng cuộn ngang */}
        {list.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              aria-label="Cuộn sang trái"
              className="p-1 rounded-full bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 shadow-2xs text-slate-600 transition-all active:scale-90"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              aria-label="Cuộn sang phải"
              className="p-1 rounded-full bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 shadow-2xs text-slate-600 transition-all active:scale-90"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Danh sách thẻ sản phẩm nằm ngang */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 scroll-smooth no-scrollbar snap-x snap-mandatory"
        style={{ scrollbarWidth: 'thin' }}
      >
        {list.map((item, idx) => {
          const id = item.productId || item.MaSanPham || item.id;
          const name = item.name || item.TenSanPham || 'Điện thoại thông minh';
          const price = item.priceFormatted || formatVND(item.price || item.Gia || 0);
          const image = item.imageUrl || item.Anh || FALLBACK_IMAGE;
          const brand = item.brand || item.ThuongHieu || null;
          const storage = item.storage || item.DungLuong || null;
          const color = item.color || item.MauSac || null;
          const isOutOfStock = item.stock !== undefined && item.stock <= 0;

          return (
            <div
              key={id || idx}
              onClick={() => id && onNavigate?.(`/products/${id}`)}
              className="min-w-[190px] w-[190px] flex-shrink-0 snap-start bg-white rounded-2xl p-2.5 border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group select-none"
            >
              <div>
                {/* Ảnh sản phẩm + nhãn */}
                <div className="relative w-full h-24 bg-slate-50/80 rounded-xl flex items-center justify-center p-1.5 mb-2 overflow-hidden border border-slate-100 group-hover:bg-blue-50/30 transition-colors">
                  {brand && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-white/90 text-slate-700 shadow-2xs border border-slate-100">
                      {brand}
                    </span>
                  )}
                  {isOutOfStock ? (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                      Hết hàng
                    </span>
                  ) : (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                      Sẵn hàng
                    </span>
                  )}
                  <img
                    src={image}
                    alt={name}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                </div>

                {/* Tên sản phẩm */}
                <h4
                  className="font-semibold text-xs text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors min-h-[32px]"
                  title={name}
                >
                  {name}
                </h4>

                {/* Cấu hình chính (Tags) */}
                <div className="flex flex-wrap items-center gap-1 my-1.5 min-h-[18px]">
                  {storage && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                      {storage}
                    </span>
                  )}
                  {color && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 truncate max-w-[95px]">
                      {color}
                    </span>
                  )}
                </div>

                {/* Giá bán */}
                <div className="mt-1">
                  <span className="text-[13px] font-extrabold text-blue-600 tracking-tight">
                    {price}
                  </span>
                </div>
              </div>

              {/* Nút Xem chi tiết */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  id && onNavigate?.(`/products/${id}`);
                }}
                className="mt-2.5 w-full py-1.5 px-2 rounded-xl bg-slate-100 group-hover:bg-blue-600 text-slate-700 group-hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-all duration-200 active:scale-95 shadow-2xs"
              >
                <span>Xem chi tiết</span>
                <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 2. CompareMatrixCard: Bảng so sánh 2-3 điện thoại mini
// ============================================================================
/**
 * Trích xuất giá trị thông số kỹ thuật từ sản phẩm theo danh sách từ khóa tìm kiếm
 */
const getSpecValue = (product, searchKeys) => {
  if (!product) return '—';
  const keys = Array.isArray(searchKeys) ? searchKeys : [searchKeys];

  for (const specKey of keys) {
    const target = specKey.toLowerCase();

    // 1. Quét từ specifications mảng: [{ specName, value, group }]
    if (Array.isArray(product.specifications)) {
      const found = product.specifications.find((s) => {
        const name = (s.specName || '').toLowerCase();
        const group = (s.group || '').toLowerCase();
        return name.includes(target) || group.includes(target);
      });
      if (found && found.value && String(found.value).trim()) {
        return String(found.value).trim();
      }
    }

    // 2. Quét từ specificationsByGroup object: { "Màn hình": { ... } }
    if (product.specificationsByGroup && typeof product.specificationsByGroup === 'object') {
      for (const groupName of Object.keys(product.specificationsByGroup)) {
        const group = product.specificationsByGroup[groupName];
        if (group && typeof group === 'object') {
          for (const [key, val] of Object.entries(group)) {
            if (key.toLowerCase().includes(target) && val && String(val).trim()) {
              return String(val).trim();
            }
          }
        }
      }
    }

    // 3. Fallbacks theo thuộc tính trực tiếp
    if (target === 'storage' || target === 'bộ nhớ' || target === 'dung lượng') {
      if (product.storage || product.DungLuong) return product.storage || product.DungLuong;
    }
    if (target === 'brand' || target === 'hãng' || target === 'thương hiệu') {
      if (product.brand || product.ThuongHieu) return product.brand || product.ThuongHieu;
    }
  }

  return 'Đang cập nhật';
};

/**
 * Bảng so sánh 2-3 điện thoại mini
 */
export const CompareMatrixCard = ({ products = [], onNavigate }) => {
  const rawList = Array.isArray(products)
    ? products
    : products?.products && Array.isArray(products.products)
    ? products.products
    : [];

  const list = rawList.slice(0, 3); // So sánh tối đa 3 điện thoại

  if (!list || list.length < 2) {
    return null;
  }

  const ids = list.map((p) => p.productId || p.MaSanPham || p.id).filter(Boolean);

  const compareCriteria = [
    {
      label: 'Giá bán',
      key: 'price',
      render: (p) => p.priceFormatted || formatVND(p.price || p.Gia || 0),
      isHighlight: true
    },
    {
      label: 'Màn hình',
      key: 'screen',
      render: (p) => getSpecValue(p, ['kích thước', 'màn hình', 'screen'])
    },
    {
      label: 'Vi xử lý (CPU)',
      key: 'cpu',
      render: (p) => getSpecValue(p, ['chip', 'cpu', 'vi xử lý', 'bộ vi xử lý'])
    },
    {
      label: 'RAM / Lưu trữ',
      key: 'ram',
      render: (p) => {
        const ram = getSpecValue(p, ['ram', 'dung lượng ram']);
        const rom = p.storage || p.DungLuong || getSpecValue(p, ['lưu trữ', 'bộ nhớ']);
        if (ram !== 'Đang cập nhật' && rom) return `${ram} • ${rom}`;
        if (ram !== 'Đang cập nhật') return ram;
        if (rom) return rom;
        return 'Đang cập nhật';
      }
    },
    {
      label: 'Camera sau',
      key: 'camera',
      render: (p) => getSpecValue(p, ['camera sau', 'độ phân giải camera', 'camera'])
    },
    {
      label: 'Pin & Sạc',
      key: 'battery',
      render: (p) => getSpecValue(p, ['dung lượng pin', 'pin', 'battery', 'sạc'])
    }
  ];

  return (
    <div className="w-full my-2 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <span className="p-1 rounded-lg bg-indigo-100 text-indigo-600">
            <Scale className="w-3.5 h-3.5" />
          </span>
          <span>Bảng so sánh mini ({list.length} máy)</span>
        </div>

        {ids.length >= 2 && (
          <button
            type="button"
            onClick={() => onNavigate?.(`/compare?ids=${ids.join(',')}`)}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
          >
            Chi tiết ↗
          </button>
        )}
      </div>

      {/* Mini Compare Table Box */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Row 1: Header Sản phẩm (Ảnh, Tên, Giá) */}
        <div className="grid grid-cols-12 bg-slate-50/90 border-b border-slate-200/90 p-2 gap-1 items-start">
          <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-2">
            Model
          </div>
          <div className={`col-span-9 grid ${list.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
            {list.map((prod, idx) => {
              const id = prod.productId || prod.MaSanPham || prod.id;
              const name = prod.name || prod.TenSanPham || `Thiết bị ${idx + 1}`;
              const img = prod.imageUrl || prod.Anh || FALLBACK_IMAGE;
              const price = prod.priceFormatted || formatVND(prod.price || prod.Gia || 0);

              return (
                <div
                  key={id || idx}
                  onClick={() => id && onNavigate?.(`/products/${id}`)}
                  className="flex flex-col items-center text-center cursor-pointer group"
                >
                  <div className="w-11 h-11 bg-white rounded-lg p-1 border border-slate-200/80 mb-1 flex items-center justify-center overflow-hidden">
                    <img
                      src={img}
                      alt={name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                  </div>
                  <h5 className="text-[11px] font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors w-full">
                    {name}
                  </h5>
                  <span className="text-[10px] font-extrabold text-blue-600 mt-0.5 truncate w-full">
                    {price}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows: Các tiêu chí so sánh */}
        <div className="divide-y divide-slate-100 text-[11px]">
          {compareCriteria.map((crit, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-12 p-2 gap-1 items-center ${
                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
              }`}
            >
              <div className="col-span-3 text-[10px] font-semibold text-slate-500">
                {crit.label}
              </div>
              <div
                className={`col-span-9 grid ${
                  list.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                } gap-2 text-[10px]`}
              >
                {list.map((prod, pIdx) => {
                  const val = crit.render(prod);
                  return (
                    <div
                      key={pIdx}
                      className={`break-words leading-tight ${
                        crit.isHighlight ? 'font-bold text-blue-600' : 'text-slate-700'
                      }`}
                    >
                      {val}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: Nút mở rộng xem trang so sánh chuyên sâu */}
        {ids.length >= 2 && (
          <div className="p-2 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate?.(`/compare?ids=${ids.join(',')}`)}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Xem bảng so sánh chuyên sâu đầy đủ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 3. OrderStatusCard: Timeline tiến trình đơn hàng
// ============================================================================
/**
 * Timeline tiến trình đơn hàng (Đã đặt -> Đã thanh toán / Đã xác nhận -> Đang giao -> Đã giao)
 */
export const OrderStatusCard = ({ orders = [], onNavigate }) => {
  const [copiedCode, setCopiedCode] = useState(null);

  const rawList = Array.isArray(orders)
    ? orders
    : orders && typeof orders === 'object'
    ? orders.orders && Array.isArray(orders.orders)
      ? orders.orders
      : [orders]
    : [];

  const list = rawList.filter((o) => o && (o.orderId || o.orderCode || o.MaDonHang));

  const handleCopy = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Đã sao chép mã đơn: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!list || list.length === 0) {
    return null;
  }

  // Các bước trong tiến trình đơn hàng
  const STEPS = [
    { key: 'placed', label: 'Đã đặt', subtext: 'Chờ duyệt', icon: Package },
    { key: 'confirmed', label: 'Đã xác nhận', subtext: 'Đã thanh toán', icon: CheckCircle2 },
    { key: 'shipping', label: 'Đang giao', subtext: 'Vận chuyển', icon: Truck },
    { key: 'delivered', label: 'Đã giao', subtext: 'Hoàn thành', icon: CheckCheck }
  ];

  /**
   * Tính toán trạng thái bước hiện tại (0, 1, 2, 3)
   */
  const getStepStatus = (order) => {
    const status = String(order.orderStatus || order.TrangThaiDonHang || '').toLowerCase();
    const paymentStatus = String(
      order.payment?.status || order.TrangThaiThanhToan || ''
    ).toLowerCase();

    if (status.includes('hủy') || status.includes('cancel')) {
      return { stepIndex: -1, isCancelled: true, badgeText: 'Đã hủy', badgeColor: 'rose' };
    }

    if (status.includes('đã giao') || status.includes('hoàn thành')) {
      return { stepIndex: 3, isCancelled: false, badgeText: 'Đã giao thành công', badgeColor: 'emerald' };
    }

    if (status.includes('đang giao') || status.includes('vận chuyển') || status.includes('đang vận chuyển')) {
      return { stepIndex: 2, isCancelled: false, badgeText: 'Đang giao hàng', badgeColor: 'blue' };
    }

    if (
      status.includes('xác nhận') ||
      status.includes('đang xử lý') ||
      paymentStatus.includes('đã thanh toán') ||
      paymentStatus.includes('thành công')
    ) {
      return { stepIndex: 1, isCancelled: false, badgeText: 'Đã xác nhận', badgeColor: 'indigo' };
    }

    return { stepIndex: 0, isCancelled: false, badgeText: 'Đã đặt hàng', badgeColor: 'amber' };
  };

  return (
    <div className="w-full my-2 space-y-2.5 text-slate-800">
      {list.map((order, idx) => {
        const orderCode =
          order.orderCode || (order.orderId ? `#SZ${order.orderId}` : `#${idx + 1}`);
        const totalAmount =
          order.pricing?.totalAmountFormatted ||
          formatVND(order.pricing?.totalAmount || order.TongTien || 0);
        const recipientName = order.recipient?.name || order.TenNguoiNhan || 'Khách hàng';
        const recipientPhone = order.recipient?.phone || order.SoDienThoai || '';
        const recipientAddress = order.recipient?.address || order.DiaChiGiaoHang || '';
        const paymentMethod = order.payment?.method || order.PhuongThucThanhToan || 'COD';
        const paymentStatus = order.payment?.status || order.TrangThaiThanhToan || 'Chưa thanh toán';
        const items = Array.isArray(order.items) ? order.items : [];
        const isCopied = copiedCode === orderCode;

        const { stepIndex, isCancelled, badgeText, badgeColor } = getStepStatus(order);

        const dateStr = order.orderDate || order.NgayMuaHang;
        const formattedDate = dateStr
          ? new Date(dateStr).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '';

        return (
          <div
            key={order.orderId || idx}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs p-3 transition-all"
          >
            {/* Header: Mã đơn hàng + Badge trạng thái */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="p-1 rounded-lg bg-blue-100 text-blue-600">
                  <Package className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                      {orderCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(orderCode)}
                      title="Sao chép mã đơn"
                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                    >
                      {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  {formattedDate && (
                    <p className="text-[10px] text-slate-400">{formattedDate}</p>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                  isCancelled
                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : badgeColor === 'emerald'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : badgeColor === 'blue'
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : badgeColor === 'indigo'
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {badgeText}
              </span>
            </div>

            {/* Timeline Tiến trình đơn hàng (Đã đặt -> Đã thanh toán / Xác nhận -> Đang giao -> Đã giao) */}
            {isCancelled ? (
              <div className="my-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Đơn hàng này đã bị hủy. Quý khách vui lòng liên hệ CSKH nếu có thắc mắc!</span>
              </div>
            ) : (
              <div className="my-3 px-1">
                <div className="relative flex items-center justify-between">
                  {/* Đường kết nối nền */}
                  <div className="absolute top-3.5 left-3 right-3 h-0.5 bg-slate-200 z-0" />

                  {/* Đường kết nối tiến trình active */}
                  <div
                    className="absolute top-3.5 left-3 h-0.5 bg-emerald-500 transition-all duration-500 z-0"
                    style={{
                      width: `${Math.min(100, (stepIndex / (STEPS.length - 1)) * 100)}%`
                    }}
                  />

                  {/* Các nốt tiến trình */}
                  {STEPS.map((step, sIdx) => {
                    const isCompleted = sIdx < stepIndex;
                    const isCurrent = sIdx === stepIndex;
                    const isUpcoming = sIdx > stepIndex;
                    const StepIcon = step.icon;

                    return (
                      <div
                        key={step.key}
                        className="relative z-10 flex flex-col items-center flex-1 text-center"
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isCompleted
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : isCurrent
                              ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm animate-pulse'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            <StepIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                          )}
                        </div>

                        <span
                          className={`mt-1.5 text-[10px] leading-tight font-medium ${
                            isCurrent
                              ? 'font-bold text-blue-600'
                              : isCompleted
                              ? 'font-semibold text-slate-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chi tiết người nhận & Tóm tắt đơn hàng */}
            <div className="bg-slate-50/80 rounded-xl p-2.5 text-[11px] space-y-1.5 border border-slate-100 mt-2.5">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Người nhận:</span>
                <span className="font-semibold text-slate-700">
                  {recipientName} {recipientPhone && `(${recipientPhone})`}
                </span>
              </div>

              {recipientAddress && (
                <div className="flex items-start justify-between text-slate-600 gap-2">
                  <span className="text-slate-400 flex-shrink-0">Địa chỉ:</span>
                  <span className="font-medium text-slate-700 text-right line-clamp-1" title={recipientAddress}>
                    {recipientAddress}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Thanh toán:</span>
                <span className="font-semibold text-slate-700">
                  {paymentMethod} •{' '}
                  <span
                    className={
                      paymentStatus.includes('đã') || paymentStatus.includes('thành công')
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }
                  >
                    {paymentStatus}
                  </span>
                </span>
              </div>

              {/* Danh sách mặt hàng vắn tắt */}
              {items.length > 0 && (
                <div className="pt-1.5 border-t border-slate-200/60 space-y-1">
                  {items.slice(0, 2).map((prod, pIdx) => (
                    <div key={pIdx} className="flex items-center justify-between gap-1 text-[10px]">
                      <span className="text-slate-700 truncate max-w-[190px]">
                        • {prod.productName || prod.name} (x{prod.quantity || 1})
                      </span>
                      <span className="text-slate-500 font-medium flex-shrink-0">
                        {prod.totalPriceFormatted || prod.unitPriceFormatted || formatVND(prod.unitPrice || 0)}
                      </span>
                    </div>
                  ))}
                  {items.length > 2 && (
                    <p className="text-[10px] text-slate-400 italic">
                      + và {items.length - 2} sản phẩm khác...
                    </p>
                  )}
                </div>
              )}

              {/* Tổng thanh toán */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-xs">
                <span className="font-semibold text-slate-600">Tổng thanh toán:</span>
                <span className="font-extrabold text-blue-600 text-[13px]">{totalAmount}</span>
              </div>
            </div>

            {/* Action: Link sang trang Lịch sử đơn hàng */}
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => onNavigate?.('/user/orders')}
                className="w-full py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors border border-slate-200/70"
              >
                <span>Xem chi tiết lịch sử đơn hàng</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// 4. VoucherListCard: Thẻ mã giảm giá kèm nút "Sao chép mã"
// ============================================================================
/**
 * Thẻ mã giảm giá kèm nút "Sao chép mã" tiện lợi
 */
export const VoucherListCard = ({ vouchers = [], onCopy, onNavigate }) => {
  const [copiedCode, setCopiedCode] = useState(null);

  const rawList = Array.isArray(vouchers)
    ? vouchers
    : vouchers?.vouchers && Array.isArray(vouchers.vouchers)
    ? vouchers.vouchers
    : [];

  const list = rawList.slice(0, 4); // Tối đa 4 voucher hot

  const handleCopy = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    if (onCopy) {
      onCopy(code);
    } else {
      toast.success(`Đã sao chép mã voucher: ${code}`);
    }
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  if (!list || list.length === 0) {
    return null;
  }

  return (
    <div className="w-full my-2 space-y-2 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <span className="p-1 rounded-lg bg-amber-100 text-amber-600">
            <Tag className="w-3.5 h-3.5" />
          </span>
          <span>Mã giảm giá hot SmartZone ({list.length})</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('/products')}
          className="text-[11px] font-semibold text-blue-600 hover:underline"
        >
          Dùng ngay
        </button>
      </div>

      {/* Danh sách thẻ Voucher dạng Coupon */}
      <div className="space-y-2">
        {list.map((v, idx) => {
          const code = v.code || v.Code || v.MaVoucher || `VOUCHER${idx + 1}`;
          const isCopied = copiedCode === code;

          const isPercent = v.discountType === 'phantram' || v.LoaiGiam === 'phantram';
          const discountVal = Number(v.discountValue || v.GiaTriGiam || 0);
          const discountDisplay =
            v.discountDisplay ||
            (isPercent ? `Giảm ${discountVal}%` : `Giảm ${formatVND(discountVal)}`);

          const minOrder = Number(v.minOrderValue || v.GiaTriToiThieu || 0);
          const minOrderText =
            minOrder > 0 ? `Đơn từ ${formatVND(minOrder)}` : 'Cho mọi đơn hàng';

          const expiryText = v.expiryDateFormatted || v.NgayHetHan || '';
          const remaining = v.remainingQuantity !== undefined ? v.remainingQuantity : v.SoLuong;

          return (
            <div
              key={code || idx}
              className="relative bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 rounded-2xl border border-amber-200/80 p-2.5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2 overflow-hidden group"
            >
              {/* Cạnh răng cưa / ticket cutout trang trí bên trái */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-3 bg-slate-100 rounded-r-full" />

              {/* Thông tin giảm giá */}
              <div className="min-w-0 pl-1.5 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono font-extrabold text-xs text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded-md tracking-wider border border-amber-200">
                    {code}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700">
                    {discountDisplay}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 flex-wrap">
                  <span>{minOrderText}</span>
                  {expiryText && (
                    <>
                      <span>•</span>
                      <span>HSD: {expiryText}</span>
                    </>
                  )}
                  {remaining !== undefined && remaining > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-800 font-medium">Còn {remaining} lượt</span>
                    </>
                  )}
                </div>
              </div>

              {/* Nút Sao chép mã */}
              <button
                type="button"
                onClick={() => handleCopy(code)}
                className={`py-1.5 px-2.5 rounded-xl text-[11px] font-semibold transition-all duration-200 flex items-center gap-1 flex-shrink-0 active:scale-95 shadow-2xs ${
                  isCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                }`}
              >
                {isCopied ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Đã lưu</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 5. PaymentGuideCard: Hướng dẫn thanh toán (Bonus)
// ============================================================================
export const PaymentGuideCard = ({ data = [], onNavigate }) => {
  const methods = Array.isArray(data) ? data : [];

  return (
    <div className="w-full my-2 bg-white rounded-2xl border border-slate-200 p-3 shadow-xs text-slate-800">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
        <span className="p-1 rounded-lg bg-emerald-100 text-emerald-600">
          <CreditCard className="w-3.5 h-3.5" />
        </span>
        <span>Phương thức thanh toán được hỗ trợ</span>
      </div>

      <div className="space-y-1.5 text-xs">
        {methods.length > 0 ? (
          methods.map((m, idx) => (
            <div
              key={idx}
              className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-slate-800">{m.name || m.method}</span>
                <p className="text-[11px] text-slate-500 mt-0.5">{m.description || m.guide}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-1.5 text-[11px] text-slate-600">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800">1. COD (Thanh toán khi nhận hàng):</span>
              <p className="text-slate-500 mt-0.5">Kiểm tra máy trước khi thanh toán tiền mặt cho shipper.</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800">2. VNPAY-QR:</span>
              <p className="text-slate-500 mt-0.5">Quét mã QR qua ứng dụng ngân hàng hoặc ví VNPAY nhanh chóng.</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800">3. ZaloPay:</span>
              <p className="text-slate-500 mt-0.5">Thanh toán tức thì qua ví điện tử ZaloPay nhận thêm ưu đãi.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: ChatbotRichCards
// ============================================================================
/**
 * Component chính điều phối (dispatcher) các Rich Content Card tương ứng dựa vào `type` và `data`
 *
 * @param {Object} props
 * @param {string} props.type - Loại Rich Card: 'PRODUCT_LIST' | 'COMPARE' | 'ORDER_STATUS' | 'VOUCHER_LIST' | 'PAYMENT_GUIDE'
 * @param {any} props.data - Dữ liệu trả về từ backend API
 * @param {Function} [props.onNavigate] - Hàm điều hướng (thường là navigate từ useNavigate())
 * @param {Function} [props.onCopyVoucher] - Hàm callback khi sao chép mã voucher
 */
const ChatbotRichCards = ({ type, data, onNavigate, onCopyVoucher }) => {
  if (!type) return null;

  const normalizedType = String(type).trim().toUpperCase();

  // Các thẻ khác yêu cầu có data, riêng PRODUCT_LIST sẽ hiển thị giao diện Empty State khi data rỗng
  if (!data && normalizedType !== 'PRODUCT_LIST' && normalizedType !== 'PRODUCTS') return null;

  switch (normalizedType) {
    case 'PRODUCT_LIST':
    case 'PRODUCTS':
      return <ProductListCard products={data} data={data} onNavigate={onNavigate} />;

    case 'COMPARE':
    case 'COMPARE_MATRIX':
    case 'COMPARE_PRODUCTS':
      return <CompareMatrixCard products={data} onNavigate={onNavigate} />;

    case 'ORDER_STATUS':
    case 'ORDER':
    case 'ORDERS':
      return <OrderStatusCard orders={data} onNavigate={onNavigate} />;

    case 'VOUCHER_LIST':
    case 'VOUCHER':
    case 'VOUCHERS':
      return (
        <VoucherListCard
          vouchers={data}
          onCopy={onCopyVoucher}
          onNavigate={onNavigate}
        />
      );

    case 'PAYMENT_GUIDE':
      return <PaymentGuideCard data={data} onNavigate={onNavigate} />;

    default:
      return null;
  }
};

export default ChatbotRichCards;
