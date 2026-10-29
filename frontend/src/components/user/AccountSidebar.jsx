import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  ClipboardList,
  Heart,
  MapPin,
  LogOut,
  ChevronRight,
} from 'lucide-react';

/* ─── Navigation Items ──────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    to: '/user/profile',
    label: 'Hồ sơ cá nhân',
    icon: User,
    description: 'Thông tin tài khoản',
  },
  {
    to: '/user/orders',
    label: 'Lịch sử đơn hàng',
    icon: ClipboardList,
    description: 'Theo dõi & quản lý đơn',
  },
  {
    to: '/user/wishlist',
    label: 'Sản phẩm yêu thích',
    icon: Heart,
    description: 'Danh sách lưu trữ',
  },
  {
    to: '/user/addresses',
    label: 'Sổ địa chỉ',
    icon: MapPin,
    description: 'Địa chỉ giao hàng',
  },
];

/* ─── Avatar Fallback ───────────────────────────────────────────────────────── */
const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
/* ─── AccountSidebar Component ──────────────────────────────────────────────── */
const AccountSidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout?.();
    navigate('/login', { replace: true });
  };

  const initials = getInitials(user?.HoTen || user?.TaiKhoan || '');
  const displayName = user?.HoTen || user?.TaiKhoan || 'Khách hàng';

  return (
    <aside className="flex flex-col gap-4">
      {/* ── User Identity Card ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-surface-container/60 shadow-sm overflow-hidden">
        {/* Gradient Banner */}
        <div className="h-16 bg-gradient-to-r from-primary/80 to-primary-container relative">
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        {/* Avatar + Info */}
        <div className="px-4 pb-4 -mt-8 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-white ring-4 ring-white shadow-md flex items-center justify-center overflow-hidden">
            {user?.AnhDaiDien ? (
              <img
                src={user.AnhDaiDien}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary text-white text-lg font-bold rounded-full">
                {initials}
              </div>
            )}
          </div>

          {/* Name */}
          <h3 className="mt-2 text-sm font-semibold text-on-surface leading-tight line-clamp-1">
            {displayName}
          </h3>
        </div>
      </div>

      {/* ── Navigation Menu ────────────────────────────────────────────── */}
      <nav className="bg-white rounded-2xl border border-surface-container/60 shadow-sm overflow-hidden">
        <ul className="divide-y divide-surface-container/40">
          {NAV_ITEMS.map(({ to, label, icon: Icon, description }) => (
            <li key={to}>
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  [
                    'group flex items-center gap-3 px-4 py-3 transition-all duration-150',
                    isActive
                      ? 'bg-primary/5 text-primary'
                      : 'text-on-surface hover:bg-surface-container-low',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Icon */}
                    <span
                      className={[
                        'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-150',
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-surface-container-low text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary',
                      ].join(' ')}
                    >
                      <Icon size={16} strokeWidth={2} />
                    </span>

                    {/* Text */}
                    <span className="flex-1 min-w-0">
                      <span
                        className={[
                          'block text-sm font-medium leading-tight',
                          isActive ? 'text-primary' : 'text-on-surface',
                        ].join(' ')}
                      >
                        {label}
                      </span>
                      <span className="block text-xs text-on-surface-variant truncate">
                        {description}
                      </span>
                    </span>

                    {/* Arrow */}
                    <ChevronRight
                      size={14}
                      className={[
                        'flex-shrink-0 transition-all duration-150',
                        isActive
                          ? 'text-primary opacity-100'
                          : 'text-on-surface-variant opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5',
                      ].join(' ')}
                    />

                    {/* Active left border indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* ── Logout Button ─────────────────────────────────────────────── */}
        <div className="px-3 py-3 border-t border-surface-container/40">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-error hover:bg-error/5 transition-all duration-150 group"
          >
            <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-error/8 group-hover:bg-error/15 transition-colors duration-150">
              <LogOut size={15} strokeWidth={2} />
            </span>
            <span className="text-sm font-medium">Đăng xuất</span>
          </button>
        </div>
      </nav>

      {/* ── Help / Support card ────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary/5 to-primary-fixed/10 rounded-2xl border border-primary/10 px-4 py-4">
        <p className="text-xs font-semibold text-primary mb-0.5">Cần hỗ trợ?</p>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Liên hệ đội ngũ chăm sóc khách hàng qua chat hoặc hotline.
        </p>
        <a
          href="tel:19001234"
          className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-primary hover:underline"
        >
          1900 1234
          <ChevronRight size={11} />
        </a>
      </div>
    </aside>
  );
};

export default AccountSidebar;

