import { Routes, Route, Navigate } from 'react-router-dom';
import AdminRoute from '../components/AdminRoute';
import AdminLayout from '../layouts/AdminLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/admin/DashboardPage';
import ProductManagementPage from '../pages/admin/ProductManagementPage';
import ProductFormPage from '../pages/admin/ProductFormPage';
import UserManagementPage from '../pages/admin/UserManagementPage';
import CategoryManagementPage from '../pages/admin/CategoryManagementPage';
import ManufacturerManagementPage from '../pages/admin/ManufacturerManagementPage';
import InventoryPage from '../pages/admin/InventoryPage';
import OrderPage from '../pages/admin/OrderPage';
import VoucherPage from '../pages/admin/VoucherPage';
import AnalyticsPage from '../pages/admin/AnalyticsPage';

/**
 * AppRoutes — Tập trung toàn bộ cấu hình routing của ứng dụng.
 *
 * Cấu trúc route:
 *  /login                  → LoginPage (public)
 *  /admin                  → AdminRoute (yêu cầu MaVaiTro === 1)
 *    /admin/dashboard      → DashboardPage
 *    /admin/products       → ProductManagementPage
 *    /admin/users          → UserManagementPage
 *    /admin/categories     → CategoryManagementPage
 *    /admin/manufacturers  → ManufacturerManagementPage
 *    /admin/inventory      → InventoryPage
 *    /admin/orders         → OrderPage
 *    /admin/vouchers       → VoucherPage
 *    /admin/analytics      → AnalyticsPage
 *    /admin/*              → redirect về dashboard
 *  /                       → redirect về /admin/dashboard
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
        <Route path="products" element={<ProductManagementPage />} />
        <Route path="products/create" element={<ProductFormPage />} />
        <Route path="products/edit/:id" element={<ProductFormPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="categories" element={<CategoryManagementPage />} />
        <Route path="manufacturers" element={<ManufacturerManagementPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="orders" element={<OrderPage />} />
        <Route path="vouchers" element={<VoucherPage />} />
        <Route path="coupons" element={<Navigate to="../vouchers" replace />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="statistics" element={<Navigate to="../analytics" replace />} />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* ── Fallback Routes ── */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
