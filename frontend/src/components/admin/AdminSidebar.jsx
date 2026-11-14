import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Tag,
  Building2,
  Boxes,
  ClipboardCheck,
  ShoppingCart,
  RotateCcw,
  TicketPercent,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  X,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─── Grouped Navigation Items (Phân định rõ Thống kê / Quản trị vs Giám sát Kho Chỉ xem) ───
const navGroups = [
  {
    id: 'overview',
    title: 'Tổng quan & Báo cáo',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
      { icon: BarChart3,       label: 'Thống kê',  path: '/admin/analytics' },
    ],
  },
  {
    id: 'commerce',
    title: 'Quản lý Kinh doanh',
    items: [
      { icon: ShoppingCart,  label: 'Đơn hàng',     path: '/admin/orders' },
      { icon: Package,       label: 'Sản phẩm',     path: '/admin/products' },
      { icon: Tag,           label: 'Danh mục',     path: '/admin/categories' },
      { icon: Building2,     label: 'Nhà sản xuất', path: '/admin/manufacturers' },
      { icon: TicketPercent, label: 'Mã giảm giá',  path: '/admin/vouchers' },
      { icon: Users,         label: 'Người dùng',   path: '/admin/users' },
    ],
  },
  {
    id: 'oversight',
    title: 'Giám sát & Phê duyệt',
    items: [
      {
        icon: Boxes,
        label: 'Theo dõi Tồn kho (Chỉ xem)',
        path: '/admin/inventory',
        readOnly: true,
      },
      { icon: ClipboardCheck, label: 'Duyệt kho & kiểm kê',  path: '/admin/inventory/adjustments' },
      { icon: RotateCcw,      label: 'Duyệt hoàn tiền', path: '/admin/returns' },
    ],
  },
];

const allNavItems = navGroups.flatMap((group) => group.items);

// ─── AdminSidebar Component ───────────────────────────────────────────────────
const AdminSidebar = ({ collapsed, onToggle, mobileOpen, onCloseMobile }) => {
  const { logout } = useAuth();
  const location = useLocation();

  const activeNavPath = allNavItems
    .map((item) => item.path)
    .filter((p) => location.pathname === p || location.pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0];

  const isActive = (path) => path === activeNavPath;

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
          fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden
          transition-opacity duration-300 ease-in-out
          ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* ── Sidebar Container (Fixed full-height trên Desktop & Drawer trên Mobile) ── */}
      <aside
        aria-label="Thanh điều hướng Admin"
        className={`
          fixed inset-y-0 left-0 z-50 lg:z-30 flex flex-col
          bg-white border-r border-slate-200
          transition-all duration-300 ease-in-out shrink-0 shadow-sm
          ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-20' : 'lg:w-[272px]'}
        `}
      >
        {/* ── Logo & App Name ── */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 overflow-hidden shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600">
              <img
                src="/assets/logo.png"
                alt="SmartZone Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextSibling) {
                    e.currentTarget.nextSibling.style.display = 'flex';
                  }
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
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav
          className={`flex-1 px-3 py-2.5 space-y-2.5 ${
            collapsed ? 'overflow-y-auto lg:overflow-visible custom-scrollbar' : 'overflow-y-auto custom-scrollbar'
          }`}
        >
          {navGroups.map((group, groupIdx) => (
            <div key={group.id} className="space-y-0.5">
              {/* Group Label (luôn hiện trên Mobile Drawer; ẩn gọn khi collapsed trên Desktop) */}
              <p
                className={`px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none ${
                  collapsed ? 'lg:hidden' : ''
                }`}
              >
                {group.title}
              </p>
              {collapsed && groupIdx > 0 && (
                <div className="hidden lg:block mx-2 my-1.5 border-t border-slate-100" />
              )}

              {group.items.map(({ icon: Icon, label, path, readOnly }) => {
                const active = isActive(path);
                return (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={onCloseMobile}
                    title={collapsed ? label : undefined}
                    className={`
                      relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px]
                      transition-all duration-200 group min-h-[42px] lg:min-h-[36px]
                      ${active
                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 font-medium'
                      }
                    `}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 transition-colors duration-200
                        ${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}
                      `}
                    />

                    <span
                      className={`
                        flex-1 flex items-center justify-between gap-1.5 min-w-0 transition-all duration-300 overflow-hidden
                        ${collapsed ? 'lg:w-0 lg:flex-none lg:opacity-0 lg:pointer-events-none' : 'opacity-100'}
                      `}
                    >
                      <span className="truncate leading-snug">{label}</span>
                      {readOnly && (
                        <Eye
                          className={`w-3.5 h-3.5 shrink-0 ${
                            active ? 'text-blue-100' : 'text-slate-400'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </span>

                    {/* Tooltip khi collapsed ở desktop */}
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
            </div>
          ))}
        </nav>

        {/* ── Logout ── */}
        <div className="p-3 border-t border-slate-200 shrink-0">
          <button
            id="btn-logout"
            type="button"
            onClick={logout}
            title={collapsed ? 'Đăng xuất' : undefined}
            className="
              relative flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl
              text-[13px] font-medium text-slate-600 hover:text-red-600 hover:bg-red-50
              transition-all duration-200 group min-h-[44px] lg:min-h-[40px] cursor-pointer
            "
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
                bg-slate-900 border border-slate-800 rounded-lg
                text-xs text-white font-medium whitespace-nowrap
                opacity-0 group-hover:opacity-100 pointer-events-none
                transition-opacity duration-200 z-50 shadow-xl
              ">
                Đăng xuất
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
              </div>
            )}
          </button>
        </div>

        {/* ── Toggle Collapse Button (Desktop >= lg) ── */}
        <button
          id="btn-sidebar-toggle"
          type="button"
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
