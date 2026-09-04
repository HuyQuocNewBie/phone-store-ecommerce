import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Tag,
  Building2,
  Boxes,
  ShoppingCart,
  TicketPercent,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─── Navigation Items ──────────────────────────────────────────────────────────
const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',         path: '/admin/dashboard' },
  { icon: Package,         label: 'Quản lý sản phẩm', path: '/admin/products' },
  { icon: Users,           label: 'Người dùng',        path: '/admin/users' },
  { icon: Tag,             label: 'Danh mục',          path: '/admin/categories' },
  { icon: Building2,       label: 'Nhà sản xuất',      path: '/admin/manufacturers' },
  { icon: Boxes,           label: 'Tồn kho',           path: '/admin/inventory' },
  { icon: ShoppingCart,    label: 'Đơn hàng',          path: '/admin/orders' },
  { icon: TicketPercent,   label: 'Mã giảm giá',       path: '/admin/vouchers' },
  { icon: BarChart3,       label: 'Thống kê',          path: '/admin/analytics' },
];

// ─── Sidebar Component ─────────────────────────────────────────────────────────
const Sidebar = ({ collapsed, onToggle, mobileOpen, onCloseMobile }) => {
  const { logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Tự động đóng Mobile Drawer khi chuyển route
  useEffect(() => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  }, [location.pathname]);

  return (
    <>
      {/* ── Backdrop Overlay cho Mobile Drawer (< lg) ── */}
      <div
        onClick={onCloseMobile}
        className={`
          fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden
          transition-opacity duration-300 ease-in-out
          ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* ── Sidebar Container ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          bg-slate-900 border-r border-slate-700/50
          transition-all duration-300 ease-in-out shrink-0
          lg:static lg:z-auto lg:min-h-screen
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* ── Logo & App Name ── */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-700/50 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/30 shrink-0 overflow-hidden bg-gradient-to-br from-sky-500 to-violet-600">
              <img
                src="/assets/logo.png"
                alt="SmartZone Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
              <Smartphone className="w-5 h-5 text-white hidden items-center justify-center" style={{ display: 'none' }} />
            </div>
            <div
              className={`
                flex flex-col overflow-hidden transition-all duration-300
                ${collapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}
              `}
            >
              <span className="text-sm font-bold text-slate-100 whitespace-nowrap">SmartZone</span>
            </div>
          </div>

          {/* Nút Đóng Mobile Drawer (Kích thước Touch Target chuẩn >= 44x44px) */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = isActive(path);
            return (
              <NavLink
                key={path}
                to={path}
                onClick={onCloseMobile}
                title={collapsed ? label : undefined}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200 group overflow-hidden min-h-[44px]
                  ${active
                    ? 'bg-gradient-to-r from-sky-500/20 to-violet-500/10 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border border-transparent'
                  }
                `}
              >
                {/* Active left accent bar */}
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-gradient-to-b from-sky-400 to-violet-500 rounded-full" />
                )}

                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors duration-200
                    ${active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}
                  `}
                />

                <span
                  className={`
                    whitespace-nowrap transition-all duration-300
                    ${collapsed ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none' : 'w-auto opacity-100'}
                  `}
                >
                  {label}
                </span>

                {/* Tooltip khi collapsed ở desktop */}
                {collapsed && (
                  <div className="
                    hidden lg:block absolute left-full ml-3 px-2.5 py-1.5
                    bg-slate-800 border border-slate-700 rounded-lg
                    text-xs text-slate-100 font-medium whitespace-nowrap
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-200 z-50 shadow-xl
                  ">
                    {label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ── Logout ── */}
        <div className="p-3 border-t border-slate-700/50">

          {/* Logout button */}
          <button
            id="btn-logout"
            onClick={logout}
            title={collapsed ? 'Đăng xuất' : undefined}
            className={`
              relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
              text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10
              border border-transparent hover:border-red-500/20
              transition-all duration-200 group overflow-hidden min-h-[44px]
            `}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span
              className={`
                whitespace-nowrap transition-all duration-300
                ${collapsed ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none' : 'w-auto opacity-100'}
              `}
            >
              Đăng xuất
            </span>

            {/* Tooltip khi collapsed */}
            {collapsed && (
              <div className="
                hidden lg:block absolute left-full ml-3 px-2.5 py-1.5
                bg-slate-800 border border-slate-700 rounded-lg
                text-xs text-slate-100 font-medium whitespace-nowrap
                opacity-0 group-hover:opacity-100 pointer-events-none
                transition-opacity duration-200 z-50 shadow-xl
              ">
                Đăng xuất
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
              </div>
            )}
          </button>
        </div>

        {/* ── Toggle Collapse Button (Chỉ hiển thị trên Desktop >= lg) ── */}
        <button
          id="btn-sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className="
            hidden lg:flex
            absolute top-1/2 -translate-y-1/2 -right-3.5
            w-7 h-7 bg-slate-800 border border-slate-600/70
            rounded-full items-center justify-center
            text-slate-400 hover:text-sky-400 hover:border-sky-500/50
            shadow-lg shadow-slate-900/50
            transition-all duration-200 hover:scale-110 z-10
          "
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5" />
          }
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
