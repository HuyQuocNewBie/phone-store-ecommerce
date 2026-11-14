import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';

/**
 * AdminLayout
 * Layout chính cho toàn bộ cổng Quản trị Admin (Light Mode).
 * Phân định rạch ròi vai trò:
 *  - Admin Portal: Dashboard, Thống kê, Quản lý Kinh doanh, Phê duyệt & Theo dõi Tồn kho.
 *  - Warehouse Portal (/warehouse/*): Thực hiện toàn bộ tác nghiệp nhập/xuất/kiểm kê kho.
 */
const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 1. Lock Body Scroll khi Mobile Drawer đang mở
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // 2. Tự động đóng Mobile Drawer khi xoay / resize màn hình lên >= 1024px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#faf8ff] text-slate-900">
      {/* ── Sidebar (Mobile Drawer + Desktop Fixed Full-Height Sidebar) ── */}
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* ── Main Content Area ── */}
      <div
        className={`flex flex-col flex-1 min-w-0 overflow-x-clip transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:pl-20' : 'lg:pl-[272px]'
        }`}
      >
        {/* Sticky Top Navbar */}
        <AdminHeader onToggleMobile={() => setMobileOpen((prev) => !prev)} />

        {/* Page content via <Outlet /> */}
        <main className="flex-1 bg-[#faf8ff]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
