import { Routes, Route, Navigate } from 'react-router-dom';
import AdminRoute from '../components/AdminRoute';
import AdminLayout from '../layouts/AdminLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/admin/DashboardPage';

/**
 * AppRoutes — Tập trung toàn bộ cấu hình routing của ứng dụng.
 *
 * Cấu trúc route:
 *  /login                  → LoginPage (public)
 *  /admin                  → AdminRoute (yêu cầu MaVaiTro === 1)
 *    /admin/dashboard      → DashboardPage
 *    /admin/*              → redirect về dashboard
 *  /                       → redirect về /admin/dashboard (tạm thời, sẽ cập nhật khi có trang User)
 *  /*                      → redirect về /admin/dashboard
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* ── Public Routes ── */}
      <Route path="/login" element={<LoginPage />} />

      {/* ── Admin Routes (Protected) ── */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* ── Fallback Routes ── */}
      {/* TODO: Khi có trang User (MaVaiTro === 2), thay thế redirect này */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
