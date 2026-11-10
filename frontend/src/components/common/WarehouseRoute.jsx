import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Giải mã phần payload của JWT Token (UTF-8 safe) để đọc MaVaiTro.
 */
const decodeJwtPayload = (jwtToken) => {
  if (!jwtToken || typeof jwtToken !== 'string') return null;
  const parts = jwtToken.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * WarehouseRoute — Bảo vệ các route dành riêng cho Nhân viên Kho (MaVaiTro === 3) hoặc Admin (MaVaiTro === 1).
 *
 * Luồng kiểm tra:
 *  1. Đang load (kiểm tra auth)                        → hiển thị spinner
 *  2. Chưa đăng nhập                                   → redirect /login
 *  3. Đăng nhập nhưng không có MaVaiTro === 3 hoặc 1   → redirect /login (kèm state unauthorized)
 *  4. Hợp lệ (Nhân viên Kho hoặc Admin)                → render children hoặc <Outlet />
 */
const WarehouseRoute = ({ children }) => {
  const { isAuthenticated, user, token, loading } = useAuth();

  // ── 1. Đang khởi tạo / kiểm tra auth ──────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
        <p className="text-sm font-medium">Đang kiểm tra quyền truy cập kho...</p>
      </div>
    );
  }

  // ── 2. Chưa đăng nhập → về trang Login ────────────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ── 3. Kiểm tra MaVaiTro === 3 (Nhân viên Kho) hoặc 1 (Admin) từ JWT & User ─
  const activeToken =
    token ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('accessToken')
      : null);
  const jwtPayload = decodeJwtPayload(activeToken);

  const rawTokenRole = jwtPayload?.MaVaiTro;
  const tokenRole =
    rawTokenRole !== undefined && rawTokenRole !== null && !Number.isNaN(Number(rawTokenRole))
      ? Number(rawTokenRole)
      : null;

  const rawUserRole = user?.MaVaiTro;
  const userRole =
    rawUserRole !== undefined && rawUserRole !== null && !Number.isNaN(Number(rawUserRole))
      ? Number(rawUserRole)
      : null;

  const isTokenAllowed = tokenRole === null || tokenRole === 3 || tokenRole === 1;
  const isUserAllowed = userRole === null || userRole === 3 || userRole === 1;
  const hasWarehouseAccess =
    (tokenRole === 3 || tokenRole === 1 || userRole === 3 || userRole === 1) &&
    isTokenAllowed &&
    isUserAllowed;

  if (!hasWarehouseAccess) {
    return <Navigate to="/login" replace state={{ unauthorized: true }} />;
  }

  // ── 4. Hợp lệ → render nội dung ───────────────────────────────────────────
  return children ? children : <Outlet />;
};

export default WarehouseRoute;

