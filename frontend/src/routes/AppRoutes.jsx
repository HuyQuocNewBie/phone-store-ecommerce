import { Routes, Route, Navigate, Link } from 'react-router-dom';
import AdminRoute from '../components/AdminRoute';
import WarehouseRoute from '../components/common/WarehouseRoute';
import UserProtectedRoute from '../components/user/UserProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { Package, LogOut, LayoutDashboard } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import MainLayout from '../layouts/MainLayout';
import WarehouseLayout from '../layouts/WarehouseLayout';
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
import AdminAdjustmentsPage from '../pages/admin/AdminAdjustmentsPage';
import AdminRefundsPage from '../pages/admin/AdminRefundsPage';
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
import ForgotPasswordPage from '../pages/user/ForgotPasswordPage';
import PaymentReturnPage from '../pages/user/PaymentReturnPage';
import ZaloCallbackPage from '../pages/user/ZaloCallbackPage';
import WarehouseFulfillmentPage from '../pages/warehouse/WarehouseFulfillmentPage';
import WarehouseInventoryPage from '../pages/warehouse/WarehouseInventoryPage';
import WarehouseReturnsPage from '../pages/warehouse/WarehouseReturnsPage';

/**
 * Placeholder tạm thời cho các màn hình kho trước khi module Warehouse UI được hoàn thiện.
 */
const WarehousePlaceholder = ({ title }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-800">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
          <Package className="w-7 h-7" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold mb-3">
          Phân hệ Kho vận SmartZone
        </span>
        <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-500 mb-6">
          Xin chào{' '}
          <strong className="text-slate-700">
            {user?.HoTen || user?.TaiKhoan || 'Nhân viên Kho'}
          </strong>
          . Khu vực làm việc kho đã được bảo vệ phân quyền thành công.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Về Admin Dashboard
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/zalo/callback" element={<ZaloCallbackPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/payment-return" element={<PaymentReturnPage />} />
        <Route path="/dang-ky" element={<Navigate to="/register" replace />} />
        <Route path="/xac-thuc-otp" element={<Navigate to="/verify-otp" replace />} />
        <Route path="/quen-mat-khau" element={<Navigate to="/forgot-password" replace />} />
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
        <Route path="inventory/import" element={<Navigate to="/admin/inventory" replace />} />
        <Route path="inventory/adjustments" element={<AdminAdjustmentsPage />} />
        <Route path="orders" element={<OrderListPage />} />
        <Route path="returns" element={<AdminRefundsPage />} />
        <Route path="vouchers" element={<VoucherListPage />} />
        <Route path="vouchers/new" element={<VoucherFormPage />} />
        <Route path="vouchers/:id/edit" element={<VoucherFormPage />} />
        <Route path="coupons" element={<Navigate to="../vouchers" replace />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="statistics" element={<Navigate to="../analytics" replace />} />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>

      {/* ── Warehouse Routes (Protected: MaVaiTro === 3 hoặc 1) ── */}
      <Route
        path="/warehouse"
        element={
          <WarehouseRoute>
            <WarehouseLayout />
          </WarehouseRoute>
        }
      >
        <Route index element={<Navigate to="fulfillment" replace />} />
        <Route path="fulfillment" element={<WarehouseFulfillmentPage />} />
        <Route path="inventory" element={<WarehouseInventoryPage />} />
        <Route path="returns" element={<WarehouseReturnsPage />} />
        <Route
          path="*"
          element={<WarehousePlaceholder title="Cổng Quản lý Kho SmartZone" />}
        />
      </Route>

      {/* ── Fallback Routes ── */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;
