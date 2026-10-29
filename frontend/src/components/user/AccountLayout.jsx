import { Link, useLocation, Outlet } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import AccountSidebar from './AccountSidebar';

/* ─── Breadcrumb Map ────────────────────────────────────────────────────────── */
const PAGE_TITLES = {
  '/user/orders':    'Lịch sử đơn hàng',
  '/user/wishlist':  'Sản phẩm yêu thích',
  '/user/profile':   'Hồ sơ cá nhân',
  '/user/addresses': 'Sổ địa chỉ',
};

/* ─── Breadcrumb Component ──────────────────────────────────────────────────── */
const Breadcrumb = ({ currentTitle }) => (
  <nav aria-label="breadcrumb">
    <ol className="flex items-center gap-1.5 text-sm">
      <li>
        <Link
          to="/"
          className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors duration-150 font-medium"
        >
          <Home size={14} strokeWidth={2} />
          <span>Trang chủ</span>
        </Link>
      </li>

      <li className="flex items-center text-outline">
        <ChevronRight size={14} strokeWidth={2} />
      </li>

      <li
        className="text-on-surface font-semibold truncate"
        aria-current="page"
      >
        {currentTitle || 'Trang cá nhân'}
      </li>
    </ol>
  </nav>
);

/* ─── AccountLayout — Parent Layout Route ───────────────────────────────────── */
/**
 * AccountLayout
 * Khung layout chung cho toàn bộ phân hệ Trang cá nhân người dùng (/user/*).
 *
 * Cấu trúc:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  <Navbar />                                             │
 *  ├─────────────────────────────────────────────────────────┤
 *  │  Breadcrumb                                             │
 *  │  ┌───────────────┐  ┌──────────────────────────────────┐│
 *  │  │ AccountSidebar│  │  <Outlet /> (child page)         ││
 *  │  │  (3 cols)     │  │  (9 cols)                        ││
 *  │  └───────────────┘  └──────────────────────────────────┘│
 *  ├─────────────────────────────────────────────────────────┤
 *  │  <Footer />                                             │
 *  └─────────────────────────────────────────────────────────┘
 */
const AccountLayout = () => {
  const { pathname } = useLocation();

  // Resolve tên trang từ pathname hiện tại
  // Hỗ trợ khớp chính xác lẫn các sub-path (vd: /user/orders/123)
  const currentTitle =
    PAGE_TITLES[pathname] ||
    Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ||
    'Trang cá nhân';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── Top Navigation ─────────────────────────────────────────────── */}
      <Navbar />

      {/* ── Page Body ──────────────────────────────────────────────────── */}
      <main className="flex-1">
        <div className="max-w-[80rem] mx-auto px-[1.5rem] py-6">

          {/* Breadcrumb Row */}
          <div className="mb-6">
            <Breadcrumb currentTitle={currentTitle} />
          </div>

          {/* 2-Column Grid: Sidebar (3 cols) + Content (9 cols) */}
          <div className="grid grid-cols-12 gap-6 items-start">

            {/* ── Left: Sidebar ─────────────────────────────────────────── */}
            <div className="col-span-12 lg:col-span-3">
              <AccountSidebar />
            </div>

            {/* ── Right: Page Content (Outlet) ──────────────────────────── */}
            <div className="col-span-12 lg:col-span-9">
              <Outlet />
            </div>

          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
};

export default AccountLayout;

