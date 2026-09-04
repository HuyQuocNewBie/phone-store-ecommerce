import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/admin/Sidebar';
import Navbar from '../components/admin/Navbar';

/**
 * AdminLayout
 * Layout chính cho toàn bộ trang Admin.
 * Bao gồm:
 *  - Sidebar thu gọn linh hoạt (w-64 ↔ w-20) trên Desktop & Mobile Drawer trên màn hình nhỏ (< lg)
 *  - Navbar sticky ở trên cùng phần nội dung với nút Hamburger Menu
 *  - <Outlet /> để render các trang con (React Router v6)
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
    <div className="flex min-h-screen bg-slate-900">
      {/* ── Sidebar (Mobile Drawer + Desktop Sidebar) ── */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* ── Main Content Area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Sticky Navbar */}
        <Navbar onToggleMobile={() => setMobileOpen((prev) => !prev)} />

        {/* Page content via <Outlet /> */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
