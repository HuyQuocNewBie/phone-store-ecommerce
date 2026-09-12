import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * UserProtectedRoute — Bảo vệ các route người dùng (/cart, /checkout, /orders, ...)
 *
 * Quy tắc:
 * 1. Đang kiểm tra đăng nhập -> Hiển thị spinner loading.
 * 2. Chưa đăng nhập (truy cập trực tiếp) -> Chuyển hướng ngay sang trang 404 Not Found (/404).
 * 3. Đã đăng nhập -> Render route con (children hoặc <Outlet />).
 */
const UserProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
        <p className="text-sm font-medium">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/404" replace />;
  }

  return children ? children : <Outlet />;
};

export default UserProtectedRoute;
