import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/admin/Sidebar';
import Navbar from '../components/admin/Navbar';

/**
 * AdminLayout
 * Layout chính cho toàn bộ trang Admin.
 * Bao gồm:
 *  - Sidebar thu gọn linh hoạt (w-64 ↔ w-20)
 *  - Navbar sticky ở trên cùng phần nội dung
 *  - <Outlet /> để render các trang con (React Router v6)
 */
const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* ── Sidebar ── */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />

      {/* ── Main Content Area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Sticky Navbar */}
        <Navbar />

        {/* Page content via <Outlet /> */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
