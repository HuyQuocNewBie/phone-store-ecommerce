import { Routes, Route, Navigate } from 'react-router-dom';
import AdminRoute from '../components/AdminRoute';
import AdminLayout from '../layouts/AdminLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/admin/dashboard/DashboardPage';
import ProductListPage from '../pages/admin/products/ProductListPage';
import ProductFormPage from '../pages/admin/products/ProductFormPage';
import UserListPage from '../pages/admin/users/UserListPage';
import UserEditPage from '../pages/admin/users/UserEditPage';
import CategoryListPage from '../pages/admin/categories/CategoryListPage';
import ManufacturerListPage from '../pages/admin/manufacturers/ManufacturerListPage';
import ManufacturerFormPage from '../pages/admin/manufacturers/ManufacturerFormPage';
import InventoryListPage from '../pages/admin/inventory/InventoryListPage';
import CreateImportPage from '../pages/admin/inventory/CreateImportPage';
import OrderListPage from '../pages/admin/orders/OrderListPage';
import VoucherListPage from '../pages/admin/vouchers/VoucherListPage';
import VoucherFormPage from '../pages/admin/vouchers/VoucherFormPage';
import AnalyticsPage from '../pages/admin/analytics/AnalyticsPage';

/**
 * AppRoutes — Tập trung toàn bộ cấu hình routing của ứng dụng.
 *
 * Cấu trúc route:
 *  /login                  → LoginPage (public)
 *  /admin                  → AdminRoute (yêu cầu MaVaiTro === 1)
 *    /admin/dashboard      → DashboardPage
 *    /admin/products       → ProductManagementPage
 *    /admin/users          → UserManagementPage
 *    /admin/users/:id/edit → UserEditPage
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
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/create" element={<ProductFormPage />} />
        <Route path="products/edit/:id" element={<ProductFormPage />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="users/:id/edit" element={<UserEditPage />} />
        <Route path="categories" element={<CategoryListPage />} />
        <Route path="manufacturers" element={<ManufacturerListPage />} />
        <Route path="manufacturers/new" element={<ManufacturerFormPage />} />
        <Route path="manufacturers/:id/edit" element={<ManufacturerFormPage />} />
        <Route path="inventory" element={<InventoryListPage />} />
        <Route path="inventory/import" element={<CreateImportPage />} />
        <Route path="orders" element={<OrderListPage />} />
        <Route path="vouchers" element={<VoucherListPage />} />
        <Route path="vouchers/new" element={<VoucherFormPage />} />
        <Route path="vouchers/:id/edit" element={<VoucherFormPage />} />
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
