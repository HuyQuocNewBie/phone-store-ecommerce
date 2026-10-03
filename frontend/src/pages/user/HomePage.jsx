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
  Sparkles,
  ArrowRight,
  Newspaper,
  Building2
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import ProductCard from '../../components/user/ProductCard';
import api from '../../services/api';

/* ─── Banner Data ─────────────────────────────────────────────────────────── */
const MAIN_BANNERS = [
  {
    id: 1,
    title: 'iPhone 15 Pro Max',
    subtitle: 'Khung Titanium Hàng Không · Chip A17 Pro Siêu Đỉnh',
    badge: 'Mới Ra Mắt',
    price: 'Từ 29.990.000đ',
    buttonText: 'Mua Ngay',
    bg: 'from-blue-600 to-indigo-700',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    title: 'Samsung Galaxy S24 Ultra',
    subtitle: 'Galaxy AI · Camera 200MP · Zoom 100x',
    badge: 'Hot Seller',
    price: 'Từ 26.990.000đ',
    buttonText: 'Khám Phá Ngay',
    bg: 'from-violet-600 to-blue-600',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 3,
    title: 'Xiaomi 14 Ultra Leica',
    subtitle: 'Ống Kính Quang Học Leica · Sạc Siêu Nhanh 90W',
    badge: 'Siêu Cấu Hình',
    price: 'Từ 24.490.000đ',
    buttonText: 'Trải Nghiệm Ngay',
    bg: 'from-indigo-600 to-violet-700',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80'
  }
];

const SUB_BANNERS = [
  {
    id: 1,
    title: 'Thu Cũ Đổi Mới',
    desc: 'Trợ giá lên đến 3.000.000đ',
    tag: 'Tiết kiệm nhất',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    border: 'border-blue-100 hover:border-blue-300'
  },
  {
    id: 2,
    title: 'Trả Góp 0% Lãi Suất',
    desc: 'Duyệt hồ sơ Online 5 phút',
    tag: 'Thủ tục siêu nhanh',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    border: 'border-violet-100 hover:border-violet-300'
  },
  {
    id: 3,
    title: 'Siêu Sale Phụ Kiện',
    desc: 'Sạc, Tai nghe giảm đến 50%',
    tag: 'Giá sập sàn',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    border: 'border-emerald-100 hover:border-emerald-300'
  }
];

const COMMITMENTS = [
  {
    icon: ShieldCheck,
    title: '100% Chính Hãng',
    desc: 'Cam kết hàng phân phối chính thức, đầy đủ hóa đơn VAT & tem bảo hành',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    border: 'border-blue-100'
  },
  {
    icon: Truck,
    title: 'Giao Siêu Tốc 2H',
    desc: 'Nhận hàng nhanh trong 2 giờ tại khu vực nội thành Hà Nội & TP.HCM',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    border: 'border-indigo-100'
  },
  {
    icon: RotateCcw,
    title: '30 Ngày 1 Đổi 1',
    desc: 'Bảo hành đổi mới 100% trong 30 ngày nếu phát sinh lỗi nhà sản xuất',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    border: 'border-violet-100'
  },
  {
    icon: CreditCard,
    title: 'Trả Góp 0%',
    desc: 'Hỗ trợ trả góp 0% lãi suất qua thẻ tín dụng hoặc công ty tài chính',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    border: 'border-emerald-100'
  }
];

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
    title: 'Galaxy AI trên S24 Series có gì mới? Hướng dẫn sử dụng tính năng dịch thuật thông minh',
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

/* ─── Skeleton ProductCard Placeholder ───────────────────────────────────── */
const ProductSkeleton = () => (
  <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 animate-pulse shadow-sm">
    <div className="aspect-square rounded-xl bg-slate-100" />
    <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
    <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
    <div className="h-10 bg-slate-100 rounded-xl" />
  </div>
);

/* ─── Main HomePage ───────────────────────────────────────────────────────── */
const HomePage = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [manufacturers, setManufacturers] = useState([]);
  const [loadingManufacturers, setLoadingManufacturers] = useState(true);

  // Auto-slide every 5s
  useEffect(() => {
    const t = setInterval(() => setCurrentSlide((p) => (p + 1) % MAIN_BANNERS.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Fetch categories
  useEffect(() => {
    api.get('/products/categories')
      .then((res) => { if (res.data?.success) setCategories(res.data.data || []); })
      .catch(() => {});
  }, []);

  // Fetch featured products
  useEffect(() => {
    setLoadingProducts(true);
    const params = { limit: 8, page: 1 };
    if (activeCategory !== null) params.category_id = activeCategory;
    api.get('/products', { params })
      .then((res) => { if (res.data?.success) setFeaturedProducts(res.data.data || []); })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [activeCategory]);

  // Fetch manufacturers
  useEffect(() => {
    api.get('/manufacturers')
      .then((res) => { if (res.data?.success) setManufacturers(res.data.data || []); })
      .catch(() => {})
      .finally(() => setLoadingManufacturers(false));
  }, []);

  const handleAddToCart = (product) => {
    toast.success(`Đã thêm "${product.TenSanPham}" vào giỏ hàng!`, { id: `add-cart-${product.MaSanPham}` });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 space-y-16 py-8 pb-20">

        {/* ── 1. Hero Section ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Main Slider (8 cols) */}
            <div className="lg:col-span-8 relative rounded-2xl overflow-hidden shadow-[0_8px_40px_-8px_rgba(37,99,235,0.2)] group min-h-[360px] sm:min-h-[420px]">
              {MAIN_BANNERS.map((banner, idx) => (
                <div
                  key={banner.id}
                  className={`absolute inset-0 bg-gradient-to-br ${banner.bg} flex flex-col justify-between p-7 sm:p-10 transition-opacity duration-700 ${
                    idx === currentSlide ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {/* Background image glow */}
                  <div className="absolute right-0 top-0 bottom-0 w-2/5 opacity-20 pointer-events-none">
                    <img src={banner.image} alt={banner.title} className="w-full h-full object-cover blur-sm scale-110" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 space-y-4 max-w-lg">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-white/20 text-white border border-white/25 backdrop-blur-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                      {banner.badge}
                    </span>

                    <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-sm">
                      {banner.title}
                    </h1>

                    <p className="text-sm text-white/80 font-medium leading-relaxed">{banner.subtitle}</p>

                    <div className="pt-1">
                      <span className="text-2xl sm:text-3xl font-extrabold text-white">{banner.price}</span>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => navigate('/products')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-200 active:scale-[0.97]"
                      >
                        <span>{banner.buttonText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Product float preview */}
                  <div className="hidden sm:block absolute right-6 bottom-6 z-10 w-40 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2.5 shadow-xl">
                    <img src={banner.image} alt={banner.title} className="w-full h-24 object-cover rounded-xl mb-2" />
                    <p className="text-[11px] font-bold text-white truncate">{banner.title}</p>
                    <p className="text-[10px] text-white/80 font-medium mt-0.5">{banner.price}</p>
                  </div>
                </div>
              ))}

              {/* Controls */}
              <button
                type="button"
                onClick={() => setCurrentSlide((p) => (p === 0 ? MAIN_BANNERS.length - 1 : p - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentSlide((p) => (p + 1) % MAIN_BANNERS.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-4 left-7 z-20 flex items-center gap-2">
                {MAIN_BANNERS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentSlide ? 'w-8 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Sub-banners (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {SUB_BANNERS.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => navigate('/products')}
                  className={`flex-1 p-5 rounded-2xl bg-white border ${sub.border} shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col justify-between`}
                >
                  <div className="space-y-1.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${sub.iconBg} ${sub.iconColor}`}>
                      {sub.tag}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {sub.title}
                    </h3>
                    <p className="text-xs text-slate-500">{sub.desc}</p>
                  </div>
                  <div className="pt-3 flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
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
                  className={`p-5 rounded-2xl bg-white border ${item.border} shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 flex items-start gap-4`}
                >
                  <div className={`p-3 rounded-xl ${item.iconBg} shrink-0`}>
                    <IconComponent className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 3. Điện Thoại Nổi Bật ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Điện Thoại Nổi Bật
                </h2>
                <p className="text-xs text-slate-500">Lựa chọn hàng đầu từ SmartZone</p>
              </div>
            </div>

            {/* Category pills + Xem tất cả */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                  activeCategory === null
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:text-blue-600'
                }`}
              >
                Tất cả
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.MaLoaiSanPham}
                  onClick={() => setActiveCategory(cat.MaLoaiSanPham)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                    activeCategory === cat.MaLoaiSanPham
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:text-blue-600'
                  }`}
                >
                  {cat.TenLoaiSanPham}
                </button>
              ))}

              <Link
                to={activeCategory ? `/products?category=${activeCategory}` : '/products'}
                className="ml-1 text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                Xem tất cả
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Product Grid */}
          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-400 text-sm">Chưa có sản phẩm nào trong danh mục này</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredProducts.map((item) => (
                <ProductCard
                  key={item.MaSanPham}
                  item={item}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── 4. Đối Tác Chiến Lược ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Thương Hiệu Hàng Đầu</p>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Đối Tác Chiến Lược Chính Thức</h2>
          </div>

          {loadingManufacturers ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : manufacturers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <Building2 className="w-8 h-8 text-slate-300" />
              <span>Chưa có nhà sản xuất nào</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {manufacturers.map((m) => (
                <div
                  key={m.MaNhaSanXuat}
                  onClick={() => navigate(`/products?manufacturer=${m.MaNhaSanXuat}`)}
                  className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md text-center transition-all duration-300 cursor-pointer group flex items-center justify-center min-h-[56px] shadow-sm"
                >
                  <span className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">
                    {m.TenNhaSanXuat}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 5. Tin Tức Công Nghệ ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Tin Tức Công Nghệ</h2>
                <p className="text-xs text-slate-500">Bài viết đánh giá, mẹo hay và xu hướng thị trường</p>
              </div>
            </div>
            <Link
              to="/news"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
            >
              Đọc thêm
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {NEWS_ITEMS.map((news) => (
              <article
                key={news.id}
                className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.1)] hover:border-slate-200 shadow-sm group cursor-pointer"
              >
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={news.image}
                    alt={news.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-blue-600 border border-blue-100 backdrop-blur-sm shadow-sm">
                    {news.category}
                  </span>
                </div>

                <div className="p-4 space-y-2.5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{news.date}</span>
                    <span>{news.timeRead}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    {news.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed flex-1">
                    {news.excerpt}
                  </p>

                  <div className="pt-1 text-xs font-medium text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Đọc tiếp</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
