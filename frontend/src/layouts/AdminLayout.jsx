import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';

/**
 * AdminLayout
 * Layout chính cho toàn bộ trang Admin tone sáng (Light Mode).
 * Đồng nhất 100% với giao diện Stitch AI SaaS:
 *  - Background: bg-[#faf8ff] / bg-slate-50
 *  - Sidebar & Top Navbar: bg-white, viền nhẹ border-slate-200
 *  - Active Item: bg-blue-600 text-white font-semibold shadow-sm
 *  - Router <Outlet /> giữ nguyên hiển thị các trang con
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
      {/* ── Sidebar (Mobile Drawer + Desktop Sidebar) ── */}
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* ── Main Content Area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Sticky Top Navbar */}
        <AdminHeader onToggleMobile={() => setMobileOpen((prev) => !prev)} />

        {/* Page content via <Outlet /> */}
        <main className="flex-1 overflow-auto bg-[#faf8ff]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
