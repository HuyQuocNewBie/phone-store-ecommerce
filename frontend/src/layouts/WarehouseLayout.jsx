import { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import {
  Package,
  Boxes,
  RotateCcw,
  Warehouse,
  LogOut,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Navigation Items trên Sidebar Kho ────────────────────────────────────────
const WAREHOUSE_NAV_ITEMS = [
  {
    icon: Package,
    label: 'Soạn hàng & Đóng gói',
    path: '/warehouse/fulfillment',
  },
  {
    icon: Boxes,
    label: 'Tồn kho & Lệch kho',
    path: '/warehouse/inventory',
  },
  {
    icon: RotateCcw,
    label: 'Kiểm định Đổi trả',
    path: '/warehouse/returns',
  },
];

// ─── Route → Header Metadata Mapping ──────────────────────────────────────────
const ROUTE_META = {
  '/warehouse/fulfillment': {
    title: 'Soạn hàng & Đóng gói',
    badge: 'Fulfillment',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  '/warehouse/inventory': {
    title: 'Tồn kho & Lệch kho',
    badge: 'Kiểm kê',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  '/warehouse/returns': {
    title: 'Kiểm định Đổi trả',
    badge: 'Kiểm định',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const getRouteMeta = (pathname) => {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  const matched = Object.keys(ROUTE_META)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key));
  return (
    ROUTE_META[matched] || {
      title: 'Cổng Quản lý Kho',
      badge: 'Warehouse',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    }
  );
};

const resolveAvatarUrl = (url) => {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const base =
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '')
      : 'http://localhost:5000');
  return `${base}${cleanPath}`;
};

/**
 * WarehouseLayout
 * Layout chuẩn Admin Portal dành cho phân hệ Nhân viên Kho:
 *  - Left Sidebar cố định (Desktop sticky full-height / Mobile drawer) nền xanh mờ/trắng sang trọng
 *  - Sticky Top Header: Hamburger (mobile) + Tiêu đề phân hệ bên trái; Avatar + Nhân viên Kho + Đăng xuất bên phải
 *  - <Outlet /> hiển thị các trang con của Kho
 */
const WarehouseLayout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const routeMeta = getRouteMeta(location.pathname);

  const staffName = user?.HoTen || user?.TaiKhoan || 'Nhân viên Kho';
  const roleLabel = isAdmin ? 'Quản trị viên · Kho' : 'Nhân viên Kho';
  const avatarLetter = staffName[0]?.toUpperCase() || 'K';
  const avatarUrl = resolveAvatarUrl(user?.AnhDaiDien);

  // Reset lỗi ảnh đại diện khi avatar thay đổi
  useEffect(() => {
    setAvatarError(false);
  }, [user?.AnhDaiDien]);

  // Lock body scroll khi Mobile Drawer đang mở
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Tự động đóng Mobile Drawer khi resize lên >= 1024px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tự động đóng Mobile Drawer khi chuyển route
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const activeNavPath = WAREHOUSE_NAV_ITEMS.map((item) => item.path)
    .filter((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className="flex min-h-screen bg-[#faf8ff] text-slate-900">
      {/* ── Backdrop Overlay cho Mobile Drawer (< lg) ── */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`
          fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden
          transition-opacity duration-300 ease-in-out
          ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* ── Fixed Left Sidebar (Nền xanh mờ / trắng sang trọng) ── */}
      <aside
        aria-label="Thanh điều hướng phân hệ Kho"
        className={`
          fixed inset-y-0 left-0 z-50 lg:z-30 flex flex-col
          bg-gradient-to-b from-white/95 via-sky-50/70 to-blue-50/85 backdrop-blur-xl
          border-r border-blue-100/90
          shadow-[4px_0_24px_-12px_rgba(37,99,235,0.14)]
          transition-all duration-300 ease-in-out shrink-0
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* ── Brand Logo & Portal Name ── */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-blue-100/80 overflow-hidden">
          <Link to="/warehouse/fulfillment" className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              {!logoError ? (
                <img
                  src="/assets/logo.png"
                  alt="SmartZone Logo"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Warehouse className="w-5 h-5 text-white" />
              )}
            </div>
            <div
              className={`
                flex flex-col overflow-hidden transition-all duration-300
                ${collapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}
              `}
            >
              <span className="text-base font-bold text-slate-900 whitespace-nowrap leading-tight">
                SmartZone
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 whitespace-nowrap">
                Warehouse Portal
              </span>
            </div>
          </Link>

          {/* Nút Đóng Mobile Drawer */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white/80 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Section Label ── */}
        <div
          className={`
            px-5 pt-4 pb-1 transition-all duration-300 overflow-hidden
            ${collapsed ? 'lg:opacity-0 lg:h-0 lg:pt-0 lg:pb-0' : 'opacity-100'}
          `}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
            Nghiệp vụ Kho vận
          </p>
        </div>

        {/* ── Navigation Menu ── */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
          {WAREHOUSE_NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const active = path === activeNavPath;
            return (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                className={`
                  relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm
                  transition-all duration-200 group min-h-[44px]
                  ${
                    active
                      ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/25'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-white/85 hover:shadow-2xs font-medium'
                  }
                `}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors duration-200 ${
                    active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                  }`}
                />

                <span
                  className={`
                    whitespace-nowrap overflow-hidden transition-all duration-300
                    ${
                      collapsed
                        ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none'
                        : 'w-auto opacity-100'
                    }
                  `}
                >
                  {label}
                </span>

                {/* Tooltip khi collapsed trên desktop */}
                {collapsed && (
                  <div className="
                    hidden lg:block absolute left-full ml-3 px-2.5 py-1.5
                    bg-slate-900 border border-slate-800 rounded-lg
                    text-xs text-white font-medium whitespace-nowrap
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-200 z-50 shadow-xl
                  ">
                    {label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ── Sidebar Footer: Admin Link (nếu là Admin) & Warehouse Status ── */}
        <div className="p-3 border-t border-blue-100/80 space-y-2">
          {isAdmin && (
            <Link
              to="/admin/dashboard"
              title={collapsed ? 'Về Admin Portal' : undefined}
              className="relative flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-blue-700 bg-white/80 hover:bg-blue-600 hover:text-white border border-blue-200/80 transition-all duration-200 group min-h-[44px]"
            >
              <LayoutDashboard className="w-[18px] h-[18px] shrink-0 text-blue-600 group-hover:text-white transition-colors" />
              <span
                className={`
                  whitespace-nowrap overflow-hidden transition-all duration-300
                  ${
                    collapsed
                      ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none'
                      : 'w-auto opacity-100'
                  }
                `}
              >
                Admin Portal
              </span>
            </Link>
          )}

          {!collapsed && (
            <div className="px-3 py-2.5 rounded-xl bg-white/75 border border-blue-100/90 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="min-w-0 leading-tight">
                <p className="text-[11px] font-bold text-slate-700 truncate">
                  Kho Vận SmartZone
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  Hệ thống vận hành trực tuyến
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Toggle Collapse Button (Desktop >= lg) ── */}
        <button
          id="btn-warehouse-sidebar-toggle"
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className="
            hidden lg:flex
            absolute top-1/2 -translate-y-1/2 -right-3.5
            w-7 h-7 bg-white border border-blue-200
            rounded-full items-center justify-center
            text-slate-500 hover:text-blue-600 hover:border-blue-400
            shadow-md transition-all duration-200 hover:scale-110 z-10 cursor-pointer
          "
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>

      {/* ── Main Content Area ── */}
      <div
        className={`
          flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}
        `}
      >
        {/* ── Sticky Top Header ── */}
        <header
          className="
            sticky top-0 z-20
            flex items-center justify-between gap-3
            px-4 sm:px-6 py-3.5
            bg-white/95 backdrop-blur-md
            border-b border-slate-200
          "
        >
          {/* Left: Mobile Hamburger + Dynamic Route Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="btn-warehouse-hamburger"
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Mở menu điều hướng kho"
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

            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                {routeMeta.title}
              </h1>
              <span
                className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${routeMeta.badgeClass}`}
              >
                {routeMeta.badge}
              </span>
            </div>
          </div>

          {/* Right: Avatar + Tên "Nhân viên Kho" + Nút Đăng xuất */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="flex items-center gap-2.5 pl-1.5 pr-2 sm:pr-3 py-1.5 rounded-full sm:rounded-xl bg-slate-50 border border-slate-200/90">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm ring-2 ring-blue-500/20 overflow-hidden">
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt={staffName}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  avatarLetter
                )}
              </div>

              <div className="hidden sm:block leading-tight">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                  {staffName}
                </p>
                <p className="text-[11px] font-semibold text-blue-600 truncate">
                  {roleLabel}
                </p>
              </div>
            </div>

            <div className="w-px h-6 bg-slate-200 hidden sm:block" />

            <button
              id="btn-warehouse-logout"
              type="button"
              onClick={logout}
              title="Đăng xuất khỏi hệ thống"
              className="
                inline-flex items-center justify-center gap-2
                px-3 sm:px-3.5 py-2 rounded-xl
                bg-white hover:bg-rose-50
                border border-slate-200 hover:border-rose-200
                text-slate-600 hover:text-rose-600
                text-xs font-semibold transition-all shadow-2xs
                min-h-[40px] cursor-pointer
              "
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* ── Page Content via <Outlet /> ── */}
        <main className="flex-1 bg-[#faf8ff]">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default WarehouseLayout;
