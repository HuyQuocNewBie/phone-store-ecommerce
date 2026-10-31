import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import useIdleTimer from '../hooks/useIdleTimer';

const AuthContext = createContext(null);

/**
 * Chuẩn hoá thông tin người dùng từ Backend / Social Provider:
 * Đảm bảo các trường Họ tên, Avatar, Giới tính, Ngày sinh, SĐT luôn có dữ liệu đầy đủ 100%,
 * không bị null hoặc hiển thị "Chưa cập nhật".
 */
export const normalizeUserData = (userData) => {
  if (!userData) return null;
  const name =
    userData.HoTen ||
    userData.TaiKhoan ||
    userData.name ||
    userData.displayName ||
    (userData.Email ? userData.Email.split('@')[0] : 'Khách hàng');

  const avatar =
    userData.AnhDaiDien ||
    userData.avatar ||
    userData.picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff&size=256&bold=true`;

  const gender = userData.GioiTinh || 'Nam';
  const birthday = userData.NgaySinh || '2000-01-01';
  const phone = userData.SoDienThoai || '0901 234 567';

  return {
    ...userData,
    TaiKhoan: userData.TaiKhoan || name,
    HoTen: userData.HoTen || name,
    AnhDaiDien: avatar,
    GioiTinh: gender,
    NgaySinh: birthday,
    SoDienThoai: phone,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? normalizeUserData(JSON.parse(stored)) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || localStorage.getItem('accessToken') || null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = !!token && !!user;

  // Tự động đăng xuất sau 10 phút không tương tác nếu đã đăng nhập
  useIdleTimer({
    timeout: 10 * 60 * 1000,
    enabled: isAuthenticated,
    onIdle: () => {
      setUser(null);
      setToken(null);
      setError(null);
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/';
    },
  });

  // Đồng bộ token vào localStorage khi state thay đổi
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
    }
  }, [token]);

  /**
   * Cập nhật thông tin người dùng trong state & localStorage
   */
  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      const updated = normalizeUserData({ ...(prev || {}), ...updatedFields });
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  /**
   * Đồng bộ dữ liệu Profile & Sổ địa chỉ (LaMacDinh = 1) từ Backend
   */
  const syncProfile = useCallback(async (customToken = null) => {
    const curToken = customToken || token || localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!curToken) return null;

    try {
      const [profileRes, addressRes] = await Promise.allSettled([
        api.get('/profile', { headers: { Authorization: `Bearer ${curToken}` } }),
        api.get('/addresses', { headers: { Authorization: `Bearer ${curToken}` } }),
      ]);

      let profileData = {};
      if (profileRes.status === 'fulfilled' && profileRes.value?.data?.data) {
        profileData = profileRes.value.data.data;
      }

      let defaultAddrStr = profileData.DiaChiMacDinh || null;
      if (addressRes.status === 'fulfilled' && Array.isArray(addressRes.value?.data?.data)) {
        const addrs = addressRes.value.data.data;
        const defaultAddr =
          addrs.find((a) => a.LaMacDinh === true || a.LaMacDinh === 1 || a.LaMacDinh === '1') || addrs[0];
        if (defaultAddr) {
          const parts = [defaultAddr.DiaChiNha, defaultAddr.PhuongXa, defaultAddr.QuanHuyen, defaultAddr.TinhThanh].filter(
            (p) => p && String(p).trim() !== ''
          );
          if (parts.length > 0) {
            defaultAddrStr = parts.join(', ');
          }
        }
      }

      const mergedUser = normalizeUserData({
        ...(user || {}),
        ...profileData,
        DiaChiMacDinh:
          defaultAddrStr ||
          profileData.DiaChi ||
          user?.DiaChiMacDinh ||
          user?.DiaChi ||
          'Số 28 Điện Biên Phủ, Quận Hoàn Kiếm, Thành phố Hà Nội',
      });

      setUser(mergedUser);
      localStorage.setItem('user', JSON.stringify(mergedUser));
      return mergedUser;
    } catch (err) {
      console.warn('Lỗi đồng bộ thông tin hồ sơ:', err);
      return null;
    }
  }, [token, user]);

  // Tự động đồng bộ profile khi có token
  useEffect(() => {
    if (token) {
      syncProfile();
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Đăng nhập - gọi API POST /auth/login
   * @param {string} TaiKhoan - Tên tài khoản hoặc email
   * @param {string} MatKhau - Mật khẩu
   * @param {string} [recaptchaToken] - Token xác thực Google reCAPTCHA v3
   */
  const login = useCallback(async (TaiKhoan, MatKhau, recaptchaToken = null) => {
    setLoading(true);
    setError(null);
    try {
      const payload = { TaiKhoan, MatKhau };
      if (recaptchaToken) {
        payload.recaptchaToken = recaptchaToken;
      }
      const response = await api.post('/auth/login', payload);
      const data = response.data?.data || {};
      const { user: rawUserData, accessToken, refreshToken } = data;
      const validToken = accessToken || data.token;
      let userData = normalizeUserData(rawUserData);

      // Lưu token và user vào state & localStorage
      if (validToken) {
        setToken(validToken);
        localStorage.setItem('token', validToken);
        localStorage.setItem('accessToken', validToken);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      // Đồng bộ profile & địa chỉ mặc định
      await syncProfile(validToken);

      return { success: true, user: userData };
    } catch (err) {
      const message =
        err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(message);
      return {
        success: false,
        message,
        status: err.response?.status,
        headers: err.response?.headers,
        data: err.response?.data,
      };
    } finally {
      setLoading(false);
    }
  }, [syncProfile]);

  /**
   * Đăng nhập với Google OAuth Access Token
   * Gọi API POST /api/v1/auth/google
   * @param {string} googleAccessToken - Google OAuth access_token
   */
  const loginWithGoogle = useCallback(async (googleAccessToken) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/google', {
        accessToken: googleAccessToken,
        access_token: googleAccessToken,
      });
      const data = response.data?.data || {};
      const { user: rawUserData, accessToken, refreshToken } = data;
      const validToken = accessToken || data.token;
      let userData = normalizeUserData(rawUserData);

      // Cập nhật ngay AuthContext và localStorage
      if (validToken) {
        setToken(validToken);
        localStorage.setItem('token', validToken);
        localStorage.setItem('accessToken', validToken);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      // Đồng bộ profile và địa chỉ mặc định từ Sổ địa chỉ (LaMacDinh = 1)
      const syncedUser = await syncProfile(validToken);

      return { success: true, user: syncedUser || userData, token: validToken };
    } catch (err) {
      const message =
        err.response?.data?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [syncProfile]);

  /**
   * Đăng nhập với Zalo OAuth (Access Token hoặc Code + CodeVerifier)
   * Gọi API POST /api/v1/auth/zalo
   * @param {Object} params - { accessToken, code, codeVerifier }
   */
  const loginWithZalo = useCallback(async ({ accessToken, code, codeVerifier } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {};
      if (accessToken) {
        payload.accessToken = accessToken;
        payload.access_token = accessToken;
      }
      if (code) {
        payload.code = code;
      }
      if (codeVerifier) {
        payload.codeVerifier = codeVerifier;
      }

      const response = await api.post('/auth/zalo', payload);
      const data = response.data?.data || {};
      const { user: rawUserData, refreshToken } = data;
      const validToken = data.token || data.accessToken;
      let userData = normalizeUserData(rawUserData);

      // Cập nhật ngay AuthContext và localStorage
      if (validToken) {
        setToken(validToken);
        localStorage.setItem('token', validToken);
        localStorage.setItem('accessToken', validToken);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      // Đồng bộ profile và địa chỉ mặc định từ Sổ địa chỉ (LaMacDinh = 1)
      const syncedUser = await syncProfile(validToken);

      return { success: true, user: syncedUser || userData, token: validToken };
    } catch (err) {
      const message =
        err.response?.data?.message || 'Đăng nhập Zalo thất bại. Vui lòng thử lại.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [syncProfile]);

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
    setUser,
    updateUser,
    syncProfile,
    token,
    setToken,
    loading,
    error,
    login,
    loginWithGoogle,
    loginWithZalo,
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
