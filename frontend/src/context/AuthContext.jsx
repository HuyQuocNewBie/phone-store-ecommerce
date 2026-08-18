import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Đồng bộ token vào axios default header khi state thay đổi
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  /**
   * Đăng nhập - gọi API POST /auth/login
   * Backend yêu cầu: { TaiKhoan, MatKhau }
   * @param {string} TaiKhoan - Tên tài khoản hoặc email
   * @param {string} MatKhau - Mật khẩu
   */
  const login = useCallback(async (TaiKhoan, MatKhau) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { TaiKhoan, MatKhau });
      const { user: userData, accessToken, refreshToken } = response.data.data;

      // Lưu token và user vào state & localStorage
      setToken(accessToken);
      setUser(userData);
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));

      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      return { success: true, user: userData };
    } catch (err) {
      const message =
        err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Đăng xuất - xóa toàn bộ thông tin xác thực
   */
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.MaVaiTro === 1,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook để truy cập AuthContext từ bất kỳ component nào
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};

export default AuthContext;
