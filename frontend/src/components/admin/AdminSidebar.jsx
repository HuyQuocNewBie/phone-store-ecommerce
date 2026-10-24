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
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/admin/dashboard' },
  { icon: Package,         label: 'Sản phẩm',     path: '/admin/products' },
  { icon: Users,           label: 'Người dùng',   path: '/admin/users' },
  { icon: Tag,             label: 'Danh mục',     path: '/admin/categories' },
  { icon: Building2,       label: 'Nhà sản xuất', path: '/admin/manufacturers' },
  { icon: Boxes,           label: 'Tồn kho',      path: '/admin/inventory' },
  { icon: ShoppingCart,    label: 'Đơn hàng',     path: '/admin/orders' },
  { icon: TicketPercent,   label: 'Mã giảm giá',  path: '/admin/vouchers' },
  { icon: BarChart3,       label: 'Thống kê',     path: '/admin/analytics' },
];

// ─── AdminSidebar Component ───────────────────────────────────────────────────
const AdminSidebar = ({ collapsed, onToggle, mobileOpen, onCloseMobile }) => {
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
          fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden
          transition-opacity duration-300 ease-in-out
          ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* ── Sidebar Container ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          bg-white border-r border-slate-200
          transition-all duration-300 ease-in-out shrink-0
          lg:static lg:z-auto lg:min-h-screen shadow-sm
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* ── Logo & App Name ── */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600">
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
              <span className="text-base font-bold text-slate-900 whitespace-nowrap leading-tight">SmartZone</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 whitespace-nowrap">Admin Portal</span>
            </div>
          </div>

          {/* Nút Đóng Mobile Drawer (Touch Target >= 44x44px) */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = isActive(path);
            return (
              <NavLink
                key={path}
                to={path}
                onClick={onCloseMobile}
                title={collapsed ? label : undefined}
                className={`
                  relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm
                  transition-all duration-200 group overflow-hidden min-h-[44px]
                  ${active
                    ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                  }
                `}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors duration-200
                    ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}
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
                    bg-gray-900 border border-gray-800 rounded-lg
                    text-xs text-white font-medium whitespace-nowrap
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-200 z-50 shadow-xl
                  ">
                    {label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ── Logout ── */}
        <div className="p-3 border-t border-slate-200">
          <button
            id="btn-logout"
            onClick={logout}
            title={collapsed ? 'Đăng xuất' : undefined}
            className={`
              relative flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl
              text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50
              transition-all duration-200 group overflow-hidden min-h-[44px] cursor-pointer
            `}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0 text-slate-400 group-hover:text-red-600 transition-colors" />
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
                bg-gray-900 border border-gray-800 rounded-lg
                text-xs text-white font-medium whitespace-nowrap
                opacity-0 group-hover:opacity-100 pointer-events-none
                transition-opacity duration-200 z-50 shadow-xl
              ">
                Đăng xuất
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
              </div>
            )}
          </button>
        </div>

        {/* ── Toggle Collapse Button (Desktop >= lg) ── */}
        <button
          id="btn-sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className="
            hidden lg:flex
            absolute top-1/2 -translate-y-1/2 -right-3.5
            w-7 h-7 bg-white border border-slate-200
            rounded-full items-center justify-center
            text-slate-500 hover:text-blue-600 hover:border-blue-300
            shadow-md transition-all duration-200 hover:scale-110 z-10 cursor-pointer
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

export default AdminSidebar;
