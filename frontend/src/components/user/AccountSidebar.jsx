import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  ClipboardList,
  MapPin,
  Heart,
  LogOut,
  ChevronRight,
} from 'lucide-react';

/* ─── Navigation Items ──────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    to: '/user/profile',
    label: 'Hồ sơ cá nhân',
    icon: User,
  },
  {
    to: '/user/orders',
    label: 'Lịch sử đơn hàng',
    icon: ClipboardList,
  },
  {
    to: '/user/addresses',
    label: 'Sổ địa chỉ',
    icon: MapPin,
  },
  {
    to: '/user/wishlist',
    label: 'Sản phẩm yêu thích',
    icon: Heart,
  },
];

/* ─── Avatar Fallback Helper ─────────────────────────────────────────────────── */
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
  const location = useLocation();

  const handleLogout = async () => {
    await logout?.();
    navigate('/login', { replace: true });
  };

  const initials = getInitials(user?.HoTen || user?.TaiKhoan || '');
  const displayName = user?.HoTen || user?.TaiKhoan || 'Khách hàng';

  return (
    <aside className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* ── User Profile Header ── */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3.5 bg-gradient-to-r from-blue-50/50 via-slate-50/30 to-transparent">
        <div className="relative shrink-0">
          {user?.AnhDaiDien ? (
            <img
              src={user.AnhDaiDien}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-base shadow-sm shadow-blue-500/20">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-800 truncate" title={displayName}>
            {displayName}
          </h3>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {user?.Email || 'customer@smartzone.vn'}
          </p>
          {user?.SoDienThoai && (
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {user.SoDienThoai}
            </p>
          )}
        </div>
      </div>

      {/* ── Navigation Menu ── */}
      <nav className="p-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const isActive =
            location.pathname === to ||
            (to !== '/user' && location.pathname.startsWith(`${to}/`));

          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/20'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/60 font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  size={18}
                  strokeWidth={2}
                  className={`shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{label}</span>
              </div>
              <ChevronRight
                size={16}
                className={`shrink-0 transition-all ${
                  isActive
                    ? 'text-white/90'
                    : 'text-slate-400'
                }`}
              />
            </Link>
          );
        })}
      </nav>

      {/* ── Logout Button ── */}
      <div className="p-3 border-t border-slate-100">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <LogOut
              size={18}
              strokeWidth={2}
              className="shrink-0 text-rose-500 group-hover:text-rose-600"
            />
            <span className="truncate">Đăng xuất</span>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default AccountSidebar;
