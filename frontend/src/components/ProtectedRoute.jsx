import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

/**
 * ProtectedRoute - Bảo vệ và phân quyền các route Admin
 *
 * Luồng kiểm tra:
 * 1. Nếu chưa đăng nhập (không có token/user) → chuyển hướng về /login
 * 2. Nếu đã đăng nhập nhưng MaVaiTro !== 1 (không phải Admin) → chuyển hướng về /
 * 3. Nếu hợp lệ → render children hoặc <Outlet />
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  // Đang kiểm tra trạng thái xác thực
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
          <p className="text-sm font-medium">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập → về trang Login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Đã đăng nhập nhưng không phải Admin (MaVaiTro !== 1) → từ chối truy cập
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center p-8 bg-slate-800 rounded-2xl border border-red-500/30 shadow-xl max-w-md">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Không có quyền truy cập</h2>
          <p className="text-slate-400 text-sm mb-6">
            Tài khoản của bạn không có quyền Admin để truy cập trang này.
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  // Hợp lệ → render route content
  return children ? children : <Outlet />;
};

export default ProtectedRoute;
