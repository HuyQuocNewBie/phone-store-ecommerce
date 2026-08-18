import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
const Sidebar = ({ collapsed, onToggle }) => {
  const { logout, user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside
      className={`
        relative flex flex-col min-h-screen
        bg-slate-900 border-r border-slate-700/50
        transition-all duration-300 ease-in-out shrink-0
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* ── Logo & App Name ── */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b border-slate-700/50 overflow-hidden`}>
        <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/30 shrink-0">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div
          className={`
            flex flex-col overflow-hidden transition-all duration-300
            ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
          `}
        >
          <span className="text-sm font-bold text-slate-100 whitespace-nowrap">PhoneStore</span>
          <span className="text-xs text-slate-400 whitespace-nowrap">Admin Panel</span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 group overflow-hidden
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
                  ${collapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100'}
                `}
              >
                {label}
              </span>

              {/* Tooltip khi collapsed */}
              {collapsed && (
                <div className="
                  absolute left-full ml-3 px-2.5 py-1.5
                  bg-slate-800 border border-slate-700 rounded-lg
                  text-xs text-slate-100 font-medium whitespace-nowrap
                  opacity-0 group-hover:opacity-100 pointer-events-none
                  transition-opacity duration-200 z-50 shadow-xl
                ">
                  {label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Logout + User Info ── */}
      <div className="p-3 border-t border-slate-700/50">
        {/* User info - chỉ hiện khi không collapsed */}
        <div
          className={`
            flex items-center gap-3 px-2 py-2 mb-2 rounded-xl overflow-hidden
            transition-all duration-300
            ${collapsed ? 'opacity-0 h-0 py-0 mb-0' : 'opacity-100 h-auto'}
          `}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-violet-600 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.TaiKhoan?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">{user?.TaiKhoan || 'Admin'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.Email || 'admin@phonestore.vn'}</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          id="btn-logout"
          onClick={logout}
          title={collapsed ? 'Đăng xuất' : undefined}
          className={`
            relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
            text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10
            border border-transparent hover:border-red-500/20
            transition-all duration-200 group overflow-hidden
          `}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <span
            className={`
              whitespace-nowrap transition-all duration-300
              ${collapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100'}
            `}
          >
            Đăng xuất
          </span>

          {/* Tooltip khi collapsed */}
          {collapsed && (
            <div className="
              absolute left-full ml-3 px-2.5 py-1.5
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

      {/* ── Toggle Collapse Button ── */}
      <button
        id="btn-sidebar-toggle"
        onClick={onToggle}
        aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        className="
          absolute top-1/2 -translate-y-1/2 -right-3.5
          w-7 h-7 bg-slate-800 border border-slate-600/70
          rounded-full flex items-center justify-center
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
  );
};

export default Sidebar;
