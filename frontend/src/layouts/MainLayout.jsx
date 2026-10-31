import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatbotWidget from '../components/user/ChatbotWidget';

/**
 * MainLayout
 * Layout chính bọc toàn bộ phân hệ người dùng (User / Customer).
 * Nhúng ChatbotWidget và truyền token/thông tin user từ AuthContext
 * để AI trợ lý thông minh hỗ trợ xuyên suốt các trang User.
 */
const MainLayout = ({ children }) => {
  const { user, token } = useAuth();

  return (
    <div className="main-layout min-h-screen flex flex-col">
      {/* ── Main Content Area (Outlet hoặc children) ── */}
      <div className="flex-1">
        {children || <Outlet />}
      </div>

      {/* ── Chatbot Widget Tích Hợp Thông Tin Đăng Nhập ── */}
      <ChatbotWidget user={user} token={token} />
    </div>
  );
};

export default MainLayout;

