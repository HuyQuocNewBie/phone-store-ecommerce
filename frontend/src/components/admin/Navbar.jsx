import { useLocation } from 'react-router-dom';
import { Bell, Search, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─── Route → Title Mapping ────────────────────────────────────────────────────
const ROUTE_TITLES = {
  '/admin/dashboard':     { title: 'Dashboard',         subtitle: 'Tổng quan hệ thống Phone Store' },
  '/admin/products':      { title: 'Quản lý sản phẩm',  subtitle: 'Thêm, sửa, xóa và quản lý toàn bộ sản phẩm' },
  '/admin/users':         { title: 'Người dùng',         subtitle: 'Quản lý tài khoản và phân quyền người dùng' },
  '/admin/categories':    { title: 'Danh mục',           subtitle: 'Quản lý danh mục sản phẩm' },
  '/admin/manufacturers': { title: 'Nhà sản xuất',       subtitle: 'Quản lý thông tin thương hiệu & nhà sản xuất' },
  '/admin/inventory':     { title: 'Tồn kho',            subtitle: 'Theo dõi và quản lý tồn kho sản phẩm' },
  '/admin/orders':        { title: 'Đơn hàng',           subtitle: 'Xem và xử lý toàn bộ đơn hàng của khách' },
  '/admin/vouchers':      { title: 'Mã giảm giá',        subtitle: 'Tạo và quản lý các chương trình khuyến mãi' },
  '/admin/analytics':     { title: 'Thống kê',           subtitle: 'Báo cáo doanh thu và hiệu suất kinh doanh' },
};

const getRouteInfo = (pathname) => {
  // Exact match trước
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  // Prefix match (e.g. /admin/products/123)
  const matched = Object.keys(ROUTE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key));
  return ROUTE_TITLES[matched] || { title: 'Admin Panel', subtitle: 'Phone Store E-Commerce' };
};

// ─── Navbar Component ──────────────────────────────────────────────────────────
const Navbar = ({ onToggleMobile }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { title, subtitle } = getRouteInfo(location.pathname);

  const displayName = user?.TaiKhoan || 'Admin';
  const avatarLetter = displayName[0]?.toUpperCase() || 'A';

  return (
    <header className="
      sticky top-0 z-20
      flex items-center justify-between
      px-4 sm:px-6 py-4
      bg-slate-900/80 backdrop-blur-md
      border-b border-slate-700/50
    ">
      {/* ── Left: Hamburger Button + Dynamic Title ── */}
      <div className="flex items-center gap-3">
        {/* Nút Hamburger Menu trên Mobile (< lg) */}
        <button
          id="btn-hamburger-menu"
          onClick={onToggleMobile}
          aria-label="Mở menu điều hướng"
          className="
            lg:hidden flex items-center justify-center
            p-2.5 min-w-[44px] min-h-[44px]
            bg-slate-800/80 border border-slate-700/60
            rounded-xl text-slate-300 hover:text-sky-400 hover:border-sky-500/40 hover:bg-sky-500/10
            transition-all duration-200 cursor-pointer shrink-0
          "
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-100 leading-tight">{title}</h1>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{subtitle}</p>
        </div>
      </div>

      {/* ── Right: Search + Bell + Greeting + Avatar ── */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            id="navbar-search"
            type="text"
            placeholder="Tìm kiếm..."
            className="
              pl-8 pr-4 py-2 w-44
              bg-slate-800/80 border border-slate-700/60
              rounded-lg text-sm text-slate-300 placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50
              transition-all duration-200
            "
          />
        </div>

        {/* Notification Bell */}
        <button
          id="btn-notifications"
          aria-label="Thông báo"
          className="
            relative p-2.5
            bg-slate-800/80 border border-slate-700/60
            rounded-lg text-slate-400
            hover:text-sky-400 hover:border-sky-500/40 hover:bg-sky-500/5
            transition-all duration-200
          "
        >
          <Bell className="w-4 h-4" />
          {/* Notification dot */}
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-sky-400 rounded-full ring-2 ring-slate-900" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-700/60 hidden sm:block" />

        {/* Greeting + Avatar */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400 leading-none mb-0.5">Xin chào,</p>
            <p className="text-sm font-semibold text-slate-100 leading-none truncate max-w-[120px]">
              {displayName}
            </p>
          </div>
          <div className="
            w-8 h-8 bg-gradient-to-br from-sky-500 to-violet-600
            rounded-full flex items-center justify-center
            text-xs font-bold text-white shrink-0
            ring-2 ring-sky-500/30 hover:ring-sky-400/60
            transition-all duration-200 cursor-pointer
          ">
            {avatarLetter}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
