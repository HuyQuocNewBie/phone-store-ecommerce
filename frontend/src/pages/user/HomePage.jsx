import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import ProductCard from '../../components/user/ProductCard';
import api from '../../services/api';

/* ─── Hero Showcase Promotional Slides ───────────────────────────────────── */
const HERO_SLIDES = [
  {
    id: 1,
    tag1: 'SIÊU PHẨM 2025',
    tag2: 'SẴN HÀNG TOÀN QUỐC',
    title: (
      <>
        ĐẶT TRƯỚC <span className="text-primary">IPHONE 16 PRO</span> &amp; PRO MAX
      </>
    ),
    desc: (
      <>
        Titanium Sa Mạc đỉnh cao. Trợ giá thu cũ đổi mới lên đến{' '}
        <span className="text-tertiary font-semibold">2.500.000đ</span>. Giảm thêm{' '}
        <span className="text-primary font-semibold">1.000.000đ</span> khi thanh toán qua VNPay-QR.
      </>
    ),
    stat1Label: 'Trả góp ưu đãi',
    stat1Val: '0% Lãi Suất',
    stat2Label: 'Bảo hành đặc quyền',
    stat2Val: '24 Tháng 1 Đổi 1',
    link: '/products',
  },
  {
    id: 2,
    tag1: 'GALAXY AI ĐỈNH CAO',
    tag2: 'GIẢM ĐẾN 5 TRIỆU',
    title: (
      <>
        SỞ HỮU <span className="text-primary">GALAXY S24 ULTRA</span> 5G
      </>
    ),
    desc: (
      <>
        Quyền năng trí tuệ nhân tạo thế hệ mới. Trợ giá thu cũ đổi mới lên đến{' '}
        <span className="text-tertiary font-semibold">3.000.000đ</span> cùng gói quà tặng chính hãng độc quyền.
      </>
    ),
    stat1Label: 'Đặc quyền VIP',
    stat1Val: 'Tặng Củ Sạc 45W',
    stat2Label: 'Bảo hành đặc quyền',
    stat2Val: '24 Tháng Toàn Diện',
    link: '/products?search=Galaxy%20S24',
  },
  {
    id: 3,
    tag1: 'NHIẾP ẢNH LEICA',
    tag2: 'SẠC SIÊU NHANH 120W',
    title: (
      <>
        KHÁM PHÁ <span className="text-primary">XIAOMI 14 ULTRA</span> LEICA
      </>
    ),
    desc: (
      <>
        Nhiếp ảnh bậc thầy ống kính Summilux Leica đỉnh cao, cảm biến 1-inch vượt trội cùng chip Snapdragon 8 Gen 3 siêu mạnh mẽ.
      </>
    ),
    stat1Label: 'Bộ quà độc quyền',
    stat1Val: 'Photography Kit VIP',
    stat2Label: 'Bảo hành đặc quyền',
    stat2Val: '18 Tháng 1 Đổi 1',
    link: '/products?search=Xiaomi',
  },
];

const HomePage = () => {
  const navigate = useNavigate();

  // Slider State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Dynamic Data States
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [loadingManufacturers, setLoadingManufacturers] = useState(true);

  // Auto-slide Hero Showcase every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Danh mục sản phẩm (Categories)
  useEffect(() => {
    api
      .get('/categories')
      .then((res) => {
        if (res.data?.success) {
          setCategories(res.data.data || []);
        }
      })
      .catch(() => {
        // Dự phòng endpoint /products/categories nếu backend có cấu trúc cũ
        api
          .get('/products/categories')
          .then((res) => {
            if (res.data?.success) setCategories(res.data.data || []);
          })
          .catch(() => {});
      });
  }, []);

  // Fetch Sản phẩm nổi bật (Featured Products)
  useEffect(() => {
    setLoadingProducts(true);
    api
      .get('/products', { params: { limit: 8, page: 1 } })
      .then((res) => {
        if (res.data?.success) {
          setProducts(res.data.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  // Fetch Danh sách Thương hiệu / Đối tác (Manufacturers)
  useEffect(() => {
    setLoadingManufacturers(true);
    api
      .get('/manufacturers')
      .then((res) => {
        if (res.data?.success) {
          setManufacturers(res.data.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingManufacturers(false));
  }, []);

  // Thêm vào giỏ hàng
  const handleAddToCart = async (product) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (token) {
        await api.post('/cart/items', { MaSanPham: product.MaSanPham, SoLuong: 1 });
      }
      toast.success(`Đã thêm "${product.TenSanPham}" vào giỏ hàng!`, {
        id: `add-cart-${product.MaSanPham}`,
      });
    } catch {
      toast.success(`Đã thêm "${product.TenSanPham}" vào giỏ hàng!`, {
        id: `add-cart-${product.MaSanPham}`,
      });
    }
  };

  // Mua ngay
  const handleBuyNow = async (product) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (token) {
        await api.post('/cart/items', { MaSanPham: product.MaSanPham, SoLuong: 1 });
        navigate('/cart');
      } else {
        toast.success(`Đang chuyển tới trang chi tiết "${product.TenSanPham}"!`, {
          id: `buy-now-${product.MaSanPham}`,
        });
        navigate(`/products/${product.MaSanPham}`);
      }
    } catch {
      navigate(`/products/${product.MaSanPham}`);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased flex flex-col">
      <Navbar />

      <main className="w-full bg-surface min-h-screen">
        <div className="flex flex-col w-full">
          <div className="max-w-container-max mx-auto px-gutter-desktop w-full pb-unit-3xl">
            {/* 1. Hero Showcase Area */}
            <section className="grid grid-cols-12 gap-unit-md pt-unit-md pb-unit-xl items-stretch">
              {/* Main Promotional Slider Card */}
              <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-md flex flex-col justify-between overflow-hidden relative group min-h-[420px]">
                <div className="absolute -right-16 -bottom-16 w-96 h-96 bg-primary-fixed/40 rounded-full blur-3xl pointer-events-none" />
                <div className="p-unit-lg lg:p-unit-xl relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex flex-wrap items-center gap-unit-xs mb-unit-sm">
                      <span className="px-unit-xs py-unit-2xs bg-tertiary-container text-on-tertiary rounded font-label-spec text-label-spec uppercase tracking-wider">
                        {HERO_SLIDES[currentSlide].tag1}
                      </span>
                      <span className="px-unit-xs py-unit-2xs bg-secondary-fixed text-secondary font-label-spec text-label-spec uppercase tracking-wider">
                        {HERO_SLIDES[currentSlide].tag2}
                      </span>
                    </div>
                    <div className="max-w-xl">
                      <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-none mb-unit-xs">
                        {HERO_SLIDES[currentSlide].title}
                      </h1>
                      <p className="font-body-lg text-body-lg text-on-surface-variant mb-unit-md">
                        {HERO_SLIDES[currentSlide].desc}
                      </p>
                      <div className="flex flex-wrap items-center gap-unit-sm">
                        <button
                          type="button"
                          onClick={() => navigate(HERO_SLIDES[currentSlide].link)}
                          className="px-unit-lg py-unit-sm bg-tertiary-container text-on-tertiary font-title-card text-title-card rounded-lg shadow-sm hover:bg-tertiary transition-transform active:scale-95 flex items-center gap-unit-2xs"
                        >
                          <span className="material-symbols-outlined leading-none">bolt</span>
                          <span>Đặt Trước Ngay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(HERO_SLIDES[currentSlide].link)}
                          className="px-unit-lg py-unit-sm bg-surface-container-high text-primary font-title-card text-title-card rounded-lg hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-unit-2xs"
                        >
                          <span>Xem Đặc Quyền</span>
                          <span className="material-symbols-outlined text-sm leading-none">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="pt-unit-lg mt-unit-md flex items-center justify-between border-t border-surface-container/50">
                    <div className="flex items-center gap-unit-lg">
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {HERO_SLIDES[currentSlide].stat1Label}
                        </span>
                        <span className="font-title-card text-title-card text-primary font-bold">
                          {HERO_SLIDES[currentSlide].stat1Val}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {HERO_SLIDES[currentSlide].stat2Label}
                        </span>
                        <span className="font-title-card text-title-card text-on-surface font-bold">
                          {HERO_SLIDES[currentSlide].stat2Val}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-unit-2xs">
                      <button
                        type="button"
                        aria-label="Slide trước"
                        onClick={() => setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
                        className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Slide sau"
                        onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
                        className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 Side Sub-Banners */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-unit-md">
                {/* Sub Banner 1 */}
                <div
                  onClick={() => navigate('/products?search=Galaxy%20S24')}
                  className="bg-surface-container-lowest rounded-xl p-unit-md shadow-md flex-1 flex flex-col justify-between hover:-translate-y-1 transition-transform cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-unit-2xs">
                      <span className="px-unit-xs py-unit-2xs bg-primary-fixed text-primary rounded font-label-spec text-label-spec uppercase">
                        Galaxy AI
                      </span>
                      <span className="font-body-sm text-body-sm text-tertiary font-bold">
                        Giảm 5.000.000đ
                      </span>
                    </div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface mb-unit-2xs">
                      Galaxy S24 Ultra
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Quyền năng trí tuệ nhân tạo thế hệ mới, khung viền Titanium chống trầy.
                    </p>
                  </div>
                  <div className="pt-unit-sm flex items-center justify-between">
                    <span className="font-price-regular text-price-regular text-primary font-bold">
                      25.990.000đ
                    </span>
                    <span className="px-unit-sm py-unit-2xs bg-surface-container-low text-primary rounded-lg font-body-md text-body-md hover:bg-primary hover:text-on-primary transition-colors font-medium">
                      Chi tiết
                    </span>
                  </div>
                </div>

                {/* Sub Banner 2 */}
                <div
                  onClick={() => navigate('/products?search=Xiaomi')}
                  className="bg-surface-container-lowest rounded-xl p-unit-md shadow-md flex-1 flex flex-col justify-between hover:-translate-y-1 transition-transform cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-unit-2xs">
                      <span className="px-unit-xs py-unit-2xs bg-secondary-fixed text-secondary rounded font-label-spec text-label-spec uppercase">
                        Leica Optics
                      </span>
                      <span className="font-body-sm text-body-sm text-tertiary font-bold">
                        Sạc 120W Tặng Kèm
                      </span>
                    </div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface mb-unit-2xs">
                      Xiaomi 14T Series
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Nhiếp ảnh bậc thầy ống kính Summilux Leica, màn hình 144Hz AI chân thực.
                    </p>
                  </div>
                  <div className="pt-unit-sm flex items-center justify-between">
                    <span className="font-price-regular text-price-regular text-primary font-bold">
                      12.490.000đ
                    </span>
                    <span className="px-unit-sm py-unit-2xs bg-surface-container-low text-primary rounded-lg font-body-md text-body-md hover:bg-primary hover:text-on-primary transition-colors font-medium">
                      Chi tiết
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Khối cam kết dịch vụ / Ưu đãi độc quyền */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-unit-md pb-unit-2xl">
              <div className="p-unit-md bg-surface-container-lowest rounded-xl shadow-sm flex items-center gap-unit-sm">
                <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-2xl">verified_user</span>
                </div>
                <div>
                  <h3 className="font-title-card text-title-card text-on-surface font-semibold">100% Chính Hãng</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Bảo hành 12 - 24 tháng chính ngạch</p>
                </div>
              </div>

              <div className="p-unit-md bg-surface-container-lowest rounded-xl shadow-sm flex items-center gap-unit-sm">
                <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
                  <span className="material-symbols-outlined text-2xl">rocket_launch</span>
                </div>
                <div>
                  <h3 className="font-title-card text-title-card text-on-surface font-semibold">Giao Siêu Tốc 2H</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Miễn phí giao hàng nội thành</p>
                </div>
              </div>

              <div className="p-unit-md bg-surface-container-lowest rounded-xl shadow-sm flex items-center gap-unit-sm">
                <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-2xl">published_with_changes</span>
                </div>
                <div>
                  <h3 className="font-title-card text-title-card text-on-surface font-semibold">30 Ngày 1 Đổi 1</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Lỗi phần cứng từ nhà sản xuất</p>
                </div>
              </div>

              <div className="p-unit-md bg-surface-container-lowest rounded-xl shadow-sm flex items-center gap-unit-sm">
                <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0">
                  <span className="material-symbols-outlined text-2xl">credit_card_clock</span>
                </div>
                <div>
                  <h3 className="font-title-card text-title-card text-on-surface font-semibold">Trả Góp 0% Lãi Suất</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Duyệt nhanh hồ sơ online trong 5 phút</p>
                </div>
              </div>
            </section>

            {/* 3. Khối Điện Thoại Nổi Bật (Thay cho khối Điện thoại mới ra mắt & Bán chạy) */}
            <section className="mb-unit-3xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-unit-md mb-unit-lg">
                <div>
                  <span className="font-label-spec text-label-spec text-primary font-bold uppercase tracking-wider">
                    TUYỂN CHỌN HÀNG ĐẦU
                  </span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">
                    Điện Thoại Nổi Bật
                  </h2>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-unit-2xs overflow-x-auto py-unit-2xs">
                  <button
                    type="button"
                    onClick={() => navigate('/products')}
                    className="px-unit-md py-unit-xs rounded-full bg-primary text-on-primary font-body-md text-body-md font-semibold whitespace-nowrap shadow-sm hover:bg-primary-container transition-colors"
                  >
                    Tất cả
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.MaLoaiSanPham}
                      type="button"
                      onClick={() => navigate(`/products?category=${cat.MaLoaiSanPham}`)}
                      className="px-unit-md py-unit-xs rounded-full bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-primary font-body-md text-body-md whitespace-nowrap transition-colors"
                    >
                      {cat.TenLoaiSanPham}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => navigate('/products')}
                    className="px-unit-md py-unit-xs rounded-full bg-surface-container-high text-primary hover:bg-primary hover:text-on-primary font-body-md text-body-md font-semibold whitespace-nowrap transition-colors flex items-center gap-1"
                  >
                    <span>Xem tất cả</span>
                    <span className="material-symbols-outlined text-sm leading-none">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* Lưới sản phẩm */}
              {loadingProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-unit-md">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-surface-container-lowest rounded-xl p-unit-md shadow-sm space-y-3 animate-pulse"
                    >
                      <div className="w-full h-48 bg-surface-container-low rounded-lg" />
                      <div className="h-5 bg-surface-container-low rounded w-3/4" />
                      <div className="h-6 bg-surface-container-low rounded w-1/2" />
                      <div className="grid grid-cols-2 gap-unit-xs pt-2">
                        <div className="h-8 bg-surface-container-low rounded" />
                        <div className="h-8 bg-surface-container-low rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="py-16 text-center text-outline">
                  <span className="material-symbols-outlined text-5xl mb-2 text-outline">devices_off</span>
                  <p className="font-body-md text-body-md">Chưa có sản phẩm nào để hiển thị</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-unit-md">
                  {products.map((product) => (
                    <ProductCard
                      key={product.MaSanPham}
                      product={product}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                    />
                  ))}
                </div>
              )}

              <div className="mt-unit-xl flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="px-unit-xl py-unit-sm bg-surface-container-high text-primary font-title-card text-title-card rounded-xl hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-unit-xs shadow-sm"
                >
                  <span>Xem Thêm Điện Thoại Khác</span>
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                </button>
              </div>
            </section>

            {/* 4. Khối Đối Tác Chiến Lược (Thương hiệu) */}
            <section className="mb-unit-3xl bg-surface-container-lowest rounded-xl p-unit-lg shadow-sm">
              <div className="flex flex-col items-center text-center mb-unit-lg">
                <span className="font-label-spec text-label-spec text-primary font-bold uppercase tracking-wider mb-unit-2xs">
                  ĐỐI TÁC CHIẾN LƯỢC
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Đại Lý Ủy Quyền Chính Thức Tại Việt Nam
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                  Mọi thiết bị bán ra tại SmartZone đều có hóa đơn VAT điện tử, đầy đủ tem niêm phong và bảo hành điện tử chính hãng từ hãng sản xuất.
                </p>
              </div>

              {loadingManufacturers ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-unit-sm items-center">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="p-unit-sm bg-surface-container-low rounded-xl h-20 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-unit-sm items-center">
                  {manufacturers.map((brand, idx) => {
                    const brandIcons = [
                      'laptop_mac',
                      'smartphone',
                      'devices',
                      'phone_android',
                      'cell_wifi',
                      'bolt',
                      'sports_esports',
                    ];
                    const iconName = brandIcons[idx % brandIcons.length];
                    return (
                      <div
                        key={brand.MaNhaSanXuat}
                        onClick={() => navigate(`/products?manufacturer=${brand.MaNhaSanXuat}`)}
                        className="p-unit-sm bg-surface-container-low rounded-xl flex flex-col items-center justify-center gap-unit-2xs text-center hover:bg-surface-container-high transition-colors cursor-pointer group min-h-[80px]"
                      >
                        <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">
                          {iconName}
                        </span>
                        <span className="font-body-sm text-body-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                          {brand.TenNhaSanXuat}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 5. Khối Tin Tức & Đánh Giá Công Nghệ (SMARTZONE BLOG) */}
            <section className="mb-unit-xl">
              <div className="flex items-center justify-between mb-unit-lg">
                <div>
                  <span className="font-label-spec text-label-spec text-primary font-bold uppercase tracking-wider">
                    SMARTZONE BLOG
                  </span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">
                    Tin Tức &amp; Đánh Giá Công Nghệ Mới Nhất
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="font-body-md text-body-md text-primary font-semibold hover:underline flex items-center gap-unit-2xs"
                >
                  <span>Xem tất cả bài viết</span>
                  <span className="material-symbols-outlined text-sm leading-none">arrow_forward</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-unit-lg">
                {/* Post 1 */}
                <article
                  onClick={() => navigate('/products')}
                  className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer border border-surface-container/60"
                >
                  <div>
                    <div className="w-full h-48 overflow-hidden relative">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        alt="Đánh giá chi tiết nút Camera Control trên iPhone 16 Pro"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDF5PuI_MKuVe1Yb9W5GZ6D3hVzzmujhVESqDytJlq-YQFbj64kkMB93lVa4FvBzj_y7jREDiAB1xFmyCz7Sl9N1pywAcmjL3ZMkVVzwmfchdKoIFKChd6NlMEK4aRtss50BjN7PcRVMpmxfEfWXSZm3I8nw7QOxTkcw4BotIB8FJJbMriTLev9vavklvy_-fWkJhER8D-q727ONJsBWtYuvB7qNfdpks0c8bhudT1erDGMXPefzFL8"
                      />
                      <span className="absolute top-unit-xs left-unit-xs px-unit-xs py-unit-2xs bg-surface-container-lowest/90 backdrop-blur rounded text-primary font-label-spec text-label-spec uppercase font-bold shadow-sm">
                        Đánh giá
                      </span>
                    </div>
                    <div className="p-unit-md">
                      <div className="flex items-center gap-unit-xs font-body-sm text-body-sm text-outline mb-unit-xs">
                        <span>24/10/2025</span>
                        <span>•</span>
                        <span>5 phút đọc</span>
                      </div>
                      <h3 className="font-title-card text-title-card text-on-surface mb-unit-xs group-hover:text-primary transition-colors leading-snug">
                        Đánh giá chi tiết nút Camera Control trên iPhone 16 Pro: Cuộc cách mạng chụp ảnh di động?
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                        Trải nghiệm thực tế phím bấm điện dung mới của Apple sau 2 tuần: Nhanh hơn, chính xác hơn và mở ra cách quay phim hoàn toàn mới.
                      </p>
                    </div>
                  </div>
                  <div className="px-unit-md pb-unit-md">
                    <span className="font-body-md text-body-md text-primary font-semibold hover:underline flex items-center gap-unit-2xs">
                      <span>Đọc tiếp</span>
                      <span className="material-symbols-outlined text-xs leading-none">arrow_forward</span>
                    </span>
                  </div>
                </article>

                {/* Post 2 */}
                <article
                  onClick={() => navigate('/products')}
                  className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer border border-surface-container/60"
                >
                  <div>
                    <div className="w-full h-48 overflow-hidden relative">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        alt="Top 5 tính năng Galaxy AI hữu ích nhất cho người đi làm"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBhogMxY9PMDq8PKbHOpyQAB1nbX3wD8nEwHRiWTfWCYMskCRwub-i7Ce-ZgxByBFQgu-YkCtoeUrCUqhVjh2-YqRJf4rZTeM0Dcd1IrHPmk3eHwGIuSy3Zn6JI_tH39Exq7OcKlhzcGR9mGHqFw3kzmwC3Lreemknb4IkgMHd-kJgA517VhZLTt_mE8JaTli6dUoXYanG-9LNf96JIduP4WVSBJfUxWlsa4p46zUv2B35kPHFogB-"
                      />
                      <span className="absolute top-unit-xs left-unit-xs px-unit-xs py-unit-2xs bg-surface-container-lowest/90 backdrop-blur rounded text-secondary font-label-spec text-label-spec uppercase font-bold shadow-sm">
                        Mẹo &amp; Thủ thuật
                      </span>
                    </div>
                    <div className="p-unit-md">
                      <div className="flex items-center gap-unit-xs font-body-sm text-body-sm text-outline mb-unit-xs">
                        <span>22/10/2025</span>
                        <span>•</span>
                        <span>4 phút đọc</span>
                      </div>
                      <h3 className="font-title-card text-title-card text-on-surface mb-unit-xs group-hover:text-primary transition-colors leading-snug">
                        Top 5 tính năng Galaxy AI hữu ích nhất cho người đi làm bạn không nên bỏ lỡ
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                        Khoanh tròn tìm kiếm, tóm tắt ghi chú cuộc họp tức thì và dịch cuộc gọi song phương trực tiếp không cần mạng Internet.
                      </p>
                    </div>
                  </div>
                  <div className="px-unit-md pb-unit-md">
                    <span className="font-body-md text-body-md text-primary font-semibold hover:underline flex items-center gap-unit-2xs">
                      <span>Đọc tiếp</span>
                      <span className="material-symbols-outlined text-xs leading-none">arrow_forward</span>
                    </span>
                  </div>
                </article>

                {/* Post 3 */}
                <article
                  onClick={() => navigate('/products')}
                  className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer border border-surface-container/60"
                >
                  <div>
                    <div className="w-full h-48 overflow-hidden relative">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        alt="So sánh chất ảnh Leica trên Xiaomi 14T Series và hệ thống xử lý màu trên iPhone 15"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBi2SScxqW3aL9Mgq9wHdEhHt0fDTNIL05KDVBB7bELLwUFXHqcYVbJ_-VQgdMsUigXNbz6-liCcILv06nKrQ1GA4S43a3E6LpFiV5qmM_LMQMztbgSCqBHclJ4Z58mw1Mj4K8iZMAnIQN7RtV5vGLwNk32SBG2KA5CSkX_lx1Q9KSSf0YZmt4QNQPdWa2049GAFuWnIbg3igqYX32ZOx6zmfyyUkeSg9yWmzXaC9HeWa2g-aKBcoFk"
                      />
                      <span className="absolute top-unit-xs left-unit-xs px-unit-xs py-unit-2xs bg-surface-container-lowest/90 backdrop-blur rounded text-tertiary-container font-label-spec text-label-spec uppercase font-bold shadow-sm">
                        So sánh
                      </span>
                    </div>
                    <div className="p-unit-md">
                      <div className="flex items-center gap-unit-xs font-body-sm text-body-sm text-outline mb-unit-xs">
                        <span>19/10/2025</span>
                        <span>•</span>
                        <span>6 phút đọc</span>
                      </div>
                      <h3 className="font-title-card text-title-card text-on-surface mb-unit-xs group-hover:text-primary transition-colors leading-snug">
                        So sánh chất ảnh Leica trên Xiaomi 14T Series và hệ thống xử lý màu trên iPhone 15
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                        Khi Leica Authentic đối đầu với Smart HDR 5 của Apple: Điểm khác biệt rõ rệt trong nhiếp ảnh chân dung và tương phản ánh sáng.
                      </p>
                    </div>
                  </div>
                  <div className="px-unit-md pb-unit-md">
                    <span className="font-body-md text-body-md text-primary font-semibold hover:underline flex items-center gap-unit-2xs">
                      <span>Đọc tiếp</span>
                      <span className="material-symbols-outlined text-xs leading-none">arrow_forward</span>
                    </span>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
