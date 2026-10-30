import { useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─── Route → Title Mapping ────────────────────────────────────────────────────
const ROUTE_TITLES = {
  '/admin/dashboard':     'Dashboard',
  '/admin/products':      'Quản lý sản phẩm',
  '/admin/users':         'Người dùng',
  '/admin/categories':    'Danh mục',
  '/admin/manufacturers': 'Nhà sản xuất',
  '/admin/inventory':     'Tồn kho',
  '/admin/orders':        'Đơn hàng',
  '/admin/vouchers':      'Mã giảm giá',
  '/admin/analytics':     'Thống kê',
};

const getRouteTitle = (pathname) => {
  // Exact match trước
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  // Prefix match (e.g. /admin/products/123)
  const matched = Object.keys(ROUTE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key));
  return ROUTE_TITLES[matched] || 'Admin Panel';
};

// ─── AdminHeader Component ────────────────────────────────────────────────────
const AdminHeader = ({ onToggleMobile }) => {
  const { user } = useAuth();
  const location = useLocation();
  const title = getRouteTitle(location.pathname);

  const displayName = user?.TaiKhoan || 'Admin';
  const avatarLetter = displayName[0]?.toUpperCase() || 'A';

  return (
    <header className="
      sticky top-0 z-20
      flex items-center justify-between
      px-4 sm:px-6 py-3.5
      bg-white/95 backdrop-blur-md
      border-b border-slate-200
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
            bg-slate-50 border border-slate-200
            rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50
            transition-all duration-200 cursor-pointer shrink-0
          "
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{title}</h1>
        </div>
      </div>

      {/* ── Right: Bell + Greeting + Avatar ── */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          id="btn-notifications"
          aria-label="Thông báo"
          className="
            relative p-2.5
            bg-slate-50 border border-slate-200
            rounded-xl text-slate-500
            hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50
            transition-all duration-200 cursor-pointer
          "
        >
          <Bell className="w-4 h-4" />
          {/* Notification dot */}
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 hidden sm:block" />

        {/* Greeting + Avatar */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500 leading-none mb-1">Xin chào,</p>
            <p className="text-sm font-semibold text-slate-900 leading-none truncate max-w-[140px]">
              {displayName}
            </p>
          </div>
          <div className="
            w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600
            rounded-full flex items-center justify-center
            text-xs font-bold text-white shrink-0
            shadow-sm ring-2 ring-blue-500/20 hover:ring-blue-500/40
            transition-all duration-200 cursor-pointer overflow-hidden
          ">
            {user?.AnhDaiDien ? (
              <img
                src={user.AnhDaiDien}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              avatarLetter
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
