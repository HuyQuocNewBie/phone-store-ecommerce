import { Routes, Route, Navigate } from 'react-router-dom';
import AdminRoute from '../components/AdminRoute';
import UserProtectedRoute from '../components/user/UserProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import MainLayout from '../layouts/MainLayout';
import LoginPage from '../pages/user/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
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

import HomePage from '../pages/user/HomePage';
import CatalogPage from '../pages/user/CatalogPage';
import ProductDetailPage from '../pages/user/ProductDetailPage';
import ComparePage from '../pages/user/ComparePage';
import CartPage from '../pages/user/CartPage';
import CheckoutPage from '../pages/user/CheckoutPage';
import CheckoutSuccessPage from '../pages/user/CheckoutSuccessPage';
import OrderHistoryPage from '../pages/user/OrderHistoryPage';
import WishlistPage from '../pages/user/WishlistPage';
import ProfilePage from '../pages/user/ProfilePage';
import AddressPage from '../pages/user/AddressPage';
import AccountLayout from '../components/user/AccountLayout';

import RegisterPage from '../pages/user/RegisterPage';
import VerifyOtpPage from '../pages/user/VerifyOtpPage';
import PaymentReturnPage from '../pages/user/PaymentReturnPage';
import ZaloCallbackPage from '../pages/user/ZaloCallbackPage';

/**
 * AppRoutes — Tập trung toàn bộ cấu hình routing của ứng dụng.
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* ── Public & User Protected Routes (Bọc bởi MainLayout) ── */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<CatalogPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/zalo/callback" element={<ZaloCallbackPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/payment-return" element={<PaymentReturnPage />} />
        <Route path="/dang-ky" element={<Navigate to="/register" replace />} />
        <Route path="/xac-thuc-otp" element={<Navigate to="/verify-otp" replace />} />
        <Route path="/404" element={<NotFoundPage />} />

        {/* ── Compatibility / Legacy Redirects (Ngăn ngừa lỗi mất layout khi chuyển trang trực tiếp bằng URL) ── */}
        <Route path="/orders" element={<Navigate to="/user/orders" replace />} />
        <Route path="/wishlist" element={<Navigate to="/user/wishlist" replace />} />
        <Route path="/profile" element={<Navigate to="/user/profile" replace />} />
        <Route path="/addresses" element={<Navigate to="/user/addresses" replace />} />

        {/* ── User Cart & Checkout Routes ── */}
        <Route element={<UserProtectedRoute />}>
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        </Route>
      </Route>

      {/* ── Cấu trúc Nested Routes người dùng bọc bởi AccountLayout ── */}
      <Route element={<UserProtectedRoute />}>
        <Route path="/user" element={<AccountLayout />}>
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="orders" element={<OrderHistoryPage />} />
          <Route path="addresses" element={<AddressPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
        </Route>
      </Route>

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
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>

      {/* ── Fallback Routes ── */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;
