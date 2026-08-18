import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * AdminRoute — Bảo vệ các route dành riêng cho Admin (MaVaiTro === 1).
 *
 * Luồng kiểm tra:
 *  1. Đang load (kiểm tra auth)        → hiển thị spinner
 *  2. Chưa đăng nhập                   → redirect /login
 *  3. Đăng nhập nhưng không phải Admin → redirect /login (kèm state unauthorized)
 *  4. Admin hợp lệ                     → render children hoặc <Outlet />
 *
 * Sử dụng trong AppRoutes:
 *   <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
 *     <Route path="dashboard" element={<DashboardPage />} />
 *   </Route>
 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  // ── 1. Đang khởi tạo auth ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
        <p className="text-sm font-medium">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  // ── 2. Chưa đăng nhập → về trang Login ───────────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ── 3. Đăng nhập nhưng không phải Admin → về trang Login ─────────────────
  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ unauthorized: true }} />;
  }

  // ── 4. Hợp lệ → render nội dung ──────────────────────────────────────────
  return children ? children : <Outlet />;
};

export default AdminRoute;
