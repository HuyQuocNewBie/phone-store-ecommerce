import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  CreditCard, 
  Flame, 
  Sparkles, 
  ShoppingCart, 
  Eye, 
  ArrowRight, 
  Newspaper, 
  Award, 
  CheckCircle2, 
  Star,
  Zap,
  TrendingUp,
  PackageCheck
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import api from '../../services/api';

/**
 * Banner Mock Data cho Main Slider
 */
const MAIN_BANNERS = [
  {
    id: 1,
    title: 'iPhone 15 Pro Max',
    subtitle: 'Khung Titanium Hàng Không - Chip A17 Pro Siêu Đỉnh',
    badge: 'Mới Ra Mắt',
    price: 'Từ 29.990.000đ',
    buttonText: 'Mua Ngay Nhận Quà 3Tr',
    bgGradient: 'from-slate-900 via-indigo-950 to-slate-900',
    accentColor: 'text-indigo-400',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    title: 'Samsung Galaxy S24 Ultra',
    subtitle: 'Quyền Năng AI Galaxy - Camera 200MP Zoom 100x',
    badge: 'Hot Seller',
    price: 'Từ 26.990.000đ',
    buttonText: 'Khám Phá Galaxy AI',
    bgGradient: 'from-slate-900 via-sky-950 to-slate-900',
    accentColor: 'text-sky-400',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 3,
    title: 'Xiaomi 14 Ultra Leica',
    subtitle: 'Ống Kính Quang Học Leica - Sạc Siêu Nhanh 90W',
    badge: 'Siêu Cấu Hình',
    price: 'Từ 24.490.000đ',
    buttonText: 'Trải Nghiệm Nhiếp Ảnh',
    bgGradient: 'from-slate-900 via-violet-950 to-slate-900',
    accentColor: 'text-violet-400',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80'
  }
];

/**
 * Sub-banners bên phải Slider
 */
const SUB_BANNERS = [
  {
    id: 1,
    title: 'Thu Cũ Đổi Mới',
    desc: 'Trợ giá lên đến 3.000.000đ',
    tag: 'Tiết kiệm nhất',
    gradient: 'from-violet-900/80 to-slate-900'
  },
  {
    id: 2,
    title: 'Trả Góp 0% Lãi Suất',
    desc: 'Duyệt hồ sơ Online 5 phút',
    tag: 'Thủ tục siêu nhanh',
    gradient: 'from-sky-900/80 to-slate-900'
  },
  {
    id: 3,
    title: 'Siêu Sale Phụ Kiện',
    desc: 'Sạc, Tai nghe giảm đến 50%',
    tag: 'Giá sập sàn',
    gradient: 'from-emerald-900/80 to-slate-900'
  }
];

/**
 * Cam kết dịch vụ
 */
const COMMITMENTS = [
  {
    icon: ShieldCheck,
    title: '100% Chính Hãng',
    desc: 'Cam kết hàng phân phối chính thức, đầy đủ hóa đơn VAT & tem bảo hành',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20'
  },
  {
    icon: Truck,
    title: 'Giao Siêu Tốc 2H',
    desc: 'Nhận hàng nhanh trong 2 giờ tại khu vực nội thành Hà Nội & TP.HCM',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20'
  },
  {
    icon: RotateCcw,
    title: '30 Ngày 1 Đổi 1',
    desc: 'Bảo hành đổi mới 100% trong 30 ngày nếu phát sinh lỗi nhà sản xuất',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20'
  },
  {
    icon: CreditCard,
    title: 'Trả Góp 0%',
    desc: 'Hỗ trợ trả góp 0% lãi suất qua thẻ tín dụng hoặc công ty tài chính',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20'
  }
];

/**
 * Đối tác chiến lược
 */
const PARTNERS = [
  { name: 'Apple', logo: ' Apple Authorized Reseller' },
  { name: 'Samsung', logo: 'Samsung Official Partner' },
  { name: 'Xiaomi', logo: 'Xiaomi Authorized Store' },
  { name: 'ASUS', logo: 'ASUS ROG Premier' },
  { name: 'OPPO', logo: 'OPPO Official Store' },
  { name: 'Vivo', logo: 'Vivo Authorized Dealer' },
  { name: 'Realme', logo: 'Realme Official Partner' },
  { name: 'Anker', logo: 'Anker Premium Partner' }
];

/**
 * Tin tức công nghệ mẫu
 */
const NEWS_ITEMS = [
  {
    id: 1,
    title: 'Đánh giá chi tiết iPhone 15 Pro Max sau 6 tháng sử dụng: Vẫn là vua flagship?',
    date: '12 Tháng 9, 2026',
    timeRead: '5 phút đọc',
    category: 'Đánh giá',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&auto=format&fit=crop&q=80',
    excerpt: 'Cùng phân tích độ bền của khung vỏ Titanium, hiệu năng chip A17 Pro và chất lượng camera sau thời gian dài trải nghiệm thực tế.'
  },
  {
    id: 2,
    title: 'Galaxy AI trên S24 Series có gì mới? Hướng dẫn sử dụng các tính năng dịch thuật thông minh',
    date: '10 Tháng 9, 2026',
    timeRead: '4 phút đọc',
    category: 'Mẹo hay',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&auto=format&fit=crop&q=80',
    excerpt: 'Tổng hợp các tính năng Galaxy AI đột phá nhất giúp bạn tối ưu hóa công việc và giải trí hàng ngày.'
  },
  {
    id: 3,
    title: 'Top 5 mẫu smartphone tầm trung đáng mua nhất mùa khai trường 2026',
    date: '08 Tháng 9, 2026',
    timeRead: '6 phút đọc',
    category: 'Tư vấn',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80',
    excerpt: 'Gợi ý những dòng điện thoại sở hữu pin trâu, màn hình 120Hz mượt mà cùng mức giá cực hấp dẫn cho học sinh, sinh viên.'
  },
  {
    id: 4,
    title: 'Chip Apple M4 có thực sự vượt trội? Điểm số Benchmark khiến đối thủ ngỡ ngàng',
    date: '05 Tháng 9, 2026',
    timeRead: '3 phút đọc',
    category: 'Công nghệ',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&auto=format&fit=crop&q=80',
    excerpt: 'Khám phá kiến trúc nhân mới và hiệu năng xử lý trí tuệ nhân tạo thần tốc của dòng chip M4 vừa ra mắt.'
  }
];

const HomePage = () => {
  const navigate = useNavigate();

  // Banner Slider State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Products State
  const [bestSellers, setBestSellers] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Tự động chuyển Banner Slider mỗi 5 giây
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % MAIN_BANNERS.length);
    }, 5000);
    return () => clearInterval(slideTimer);
  }, []);

  // Fetch Danh sách Sản phẩm bán chạy & Mới ra mắt
  useEffect(() => {
    const fetchHomeProducts = async () => {
      try {
        setLoadingProducts(true);

        // Gọi API lấy 8 sản phẩm mới ra mắt (Sắp xếp mặc định MaSanPham DESC)
        const resNew = await api.get('/products', {
          params: { limit: 8, page: 1 }
        });

        // Gọi API lấy 8 sản phẩm (Sắp xếp theo giá hoặc tiêu chuẩn)
        const resHot = await api.get('/products', {
          params: { limit: 8, page: 1, sort_by: 'price_desc' }
        });

        if (resNew.data?.success) {
          setNewArrivals(resNew.data.data || []);
        }

        if (resHot.data?.success) {
          setBestSellers(resHot.data.data || []);
        }
      } catch (err) {
        console.error('Lỗi khi lấy sản phẩm trang chủ:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchHomeProducts();
  }, []);

  const formatVND = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price || 0);
  };

  const handleAddToCart = (product) => {
    toast.success(`Đã thêm "${product.TenSanPham}" vào giỏ hàng!`, {
      id: `add-cart-${product.MaSanPham}`
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Navbar Component */}
      <Navbar />

      <main className="flex-1 space-y-16 py-6 pb-20">
        
        {/* ── 1. Hero Section: Banner Quảng cáo Slider & Sub-banners ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Main Carousel Slider (Col 8) */}
            <div className="lg:col-span-8 relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900 group min-h-[380px] sm:min-h-[440px] flex flex-col justify-between">
              
              {/* Slides */}
              {MAIN_BANNERS.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-br ${banner.bgGradient} ${
                    index === currentSlide ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {/* Background Glow Image */}
                  <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none">
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover object-center filter blur-sm scale-110"
                    />
                  </div>

                  {/* Banner Content */}
                  <div className="relative z-10 space-y-4 max-w-xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                      {banner.badge}
                    </span>

                    <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
                      {banner.title}
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                      {banner.subtitle}
                    </p>

                    <div className="pt-2 flex items-baseline gap-3">
                      <span className={`text-xl sm:text-3xl font-extrabold ${banner.accentColor}`}>
                        {banner.price}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        Giá niêm yết
                      </span>
                    </div>

                    <div className="pt-4 flex items-center gap-3">
                      <button
                        onClick={() => navigate('/products')}
                        className="px-6 py-3 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xl shadow-sky-500/25 transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center gap-2"
                      >
                        <span>{banner.buttonText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Floating Product Card Preview inside Banner */}
                  <div className="hidden sm:block absolute right-8 bottom-8 z-10 w-44 rounded-2xl bg-slate-900/80 border border-slate-800 p-2.5 backdrop-blur-md shadow-2xl">
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-28 object-cover rounded-xl mb-2"
                    />
                    <p className="text-[11px] font-bold text-slate-200 truncate">{banner.title}</p>
                    <p className="text-[10px] text-sky-400 font-semibold">{banner.price}</p>
                  </div>
                </div>
              ))}

              {/* Prev / Next Slider Controls */}
              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => (prev === 0 ? MAIN_BANNERS.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-950/60 hover:bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-all backdrop-blur-md opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => (prev + 1) % MAIN_BANNERS.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-950/60 hover:bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-all backdrop-blur-md opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Carousel Indicators Dots */}
              <div className="absolute bottom-4 left-6 sm:left-10 z-20 flex items-center gap-2">
                {MAIN_BANNERS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentSlide ? 'w-8 bg-sky-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Sub-banners Stack (Col 4) */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-4">
              {SUB_BANNERS.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => navigate('/products')}
                  className={`flex-1 p-5 rounded-2xl bg-gradient-to-r ${sub.gradient} border border-slate-800 hover:border-slate-700 transition-all duration-300 cursor-pointer group flex flex-col justify-between shadow-lg relative overflow-hidden`}
                >
                  <div className="relative z-10 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                      {sub.tag}
                    </span>
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                      {sub.title}
                    </h3>
                    <p className="text-xs text-slate-400">{sub.desc}</p>
                  </div>

                  <div className="relative z-10 pt-3 flex items-center text-xs font-semibold text-sky-400 group-hover:translate-x-1 transition-transform">
                    <span>Xem chi tiết</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── 2. Cam Kết Dịch Vụ ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMMITMENTS.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={index}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all duration-300 hover:-translate-y-1 shadow-xl flex items-start gap-4"
                >
                  <div className={`p-3 rounded-2xl ${item.bg} ${item.color} shrink-0`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-100">{item.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 3. Khối Sản Phẩm Bán Chạy (Hot Sellers Grid 8) ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                  Sản Phẩm Bán Chạy
                </h2>
                <p className="text-xs text-slate-400">Top điện thoại & thiết bị được săn đón nhiều nhất</p>
              </div>
            </div>

            <Link
              to="/products"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 hover:underline"
            >
              <span>Xem tất cả sản phẩm</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Grid 8 Sản Phẩm Bán Chạy */}
          {loadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 animate-pulse">
                  <div className="w-full h-48 bg-slate-800 rounded-xl" />
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-4 bg-slate-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : bestSellers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">Chưa có sản phẩm nào</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {bestSellers.map((item) => (
                <div
                  key={item.MaSanPham}
                  className="bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/10 group relative"
                >
                  {/* Badge */}
                  <div className="absolute top-6 left-6 z-10 flex flex-col gap-1">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      HOT
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Trả góp 0%
                    </span>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="relative w-full h-48 rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden flex items-center justify-center p-3 mb-4 group-hover:border-slate-700 transition-colors">
                    {item.Anh ? (
                      <img
                        src={item.Anh}
                        alt={item.TenSanPham}
                        className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <PackageCheck className="w-12 h-12 text-slate-700" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-amber-400 text-xs mb-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span className="font-bold text-slate-300">4.9</span>
                        <span className="text-slate-500 text-[10px]">(128 đánh giá)</span>
                      </div>

                      <h3
                        onClick={() => navigate(`/products/${item.MaSanPham}`)}
                        className="text-sm font-bold text-slate-100 hover:text-sky-400 transition-colors cursor-pointer line-clamp-2"
                      >
                        {item.TenSanPham}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-baseline justify-between">
                      <div>
                        <p className="text-base font-black text-sky-400">
                          {formatVND(item.Gia)}
                        </p>
                        {item.DungLuong && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                            {item.DungLuong}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      className="flex-1 py-2 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/20 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Thêm giỏ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/products/${item.MaSanPham}`)}
                      className="p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 4. Khối Sản Phẩm Mới Ra Mắt (New Arrivals Grid 8) ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                  Mới Ra Mắt 2026
                </h2>
                <p className="text-xs text-slate-400">Cập nhật những siêu phẩm smartphone mới trình làng</p>
              </div>
            </div>

            <Link
              to="/products"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 hover:underline"
            >
              <span>Khám phá bộ sưu tập mới</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Grid 8 Sản Phẩm Mới */}
          {loadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 animate-pulse">
                  <div className="w-full h-48 bg-slate-800 rounded-xl" />
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-4 bg-slate-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : newArrivals.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">Chưa có sản phẩm nào</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {newArrivals.map((item) => (
                <div
                  key={item.MaSanPham}
                  className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 group relative"
                >
                  {/* Badge */}
                  <div className="absolute top-6 left-6 z-10 flex flex-col gap-1">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      NEW 2026
                    </span>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="relative w-full h-48 rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden flex items-center justify-center p-3 mb-4 group-hover:border-slate-700 transition-colors">
                    {item.Anh ? (
                      <img
                        src={item.Anh}
                        alt={item.TenSanPham}
                        className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <PackageCheck className="w-12 h-12 text-slate-700" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-indigo-400 text-xs mb-1">
                        <Zap className="w-3.5 h-3.5 fill-indigo-400" />
                        <span className="font-bold text-slate-300">Công nghệ mới</span>
                      </div>

                      <h3
                        onClick={() => navigate(`/products/${item.MaSanPham}`)}
                        className="text-sm font-bold text-slate-100 hover:text-indigo-400 transition-colors cursor-pointer line-clamp-2"
                      >
                        {item.TenSanPham}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-baseline justify-between">
                      <div>
                        <p className="text-base font-black text-indigo-400">
                          {formatVND(item.Gia)}
                        </p>
                        {item.MauSac && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                            {item.MauSac}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      className="flex-1 py-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Thêm giỏ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/products/${item.MaSanPham}`)}
                      className="p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 5. Đối Tác Chiến Lược & Tin Tức Công Nghệ ── */}
        
        {/* Đối Tác Chiến Lược */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest">Thương Hiệu Hàng Đầu</h3>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100">Đối Tác Chiến Lược Chính Thức</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {PARTNERS.map((p, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-sky-500/40 hover:bg-slate-900 text-center transition-all duration-300 cursor-pointer group flex items-center justify-center"
              >
                <span className="text-xs font-bold text-slate-400 group-hover:text-sky-300 transition-colors">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Tin Tức Công Nghệ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Newspaper className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                  Tin Tức Công Nghệ
                </h2>
                <p className="text-xs text-slate-400">Cập nhật bài viết đánh giá, mẹo hay và xu hướng thị trường</p>
              </div>
            </div>

            <Link
              to="/news"
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1.5 hover:underline"
            >
              <span>Đọc thêm tin tức</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {NEWS_ITEMS.map((news) => (
              <article
                key={news.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-lg group cursor-pointer"
              >
                <div className="relative h-44 overflow-hidden bg-slate-950">
                  <img
                    src={news.image}
                    alt={news.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-950/80 text-sky-400 border border-slate-800 backdrop-blur-md">
                    {news.category}
                  </span>
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{news.date}</span>
                      <span>{news.timeRead}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-400 transition-colors line-clamp-2">
                      {news.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {news.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 text-xs font-semibold text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Đọc tiếp</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

      </main>

      {/* Footer Component */}
      <Footer />
    </div>
  );
};

export default HomePage;
