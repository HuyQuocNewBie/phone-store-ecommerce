import { useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Custom hook useIdleTimer — Lắng nghe tương tác của người dùng.
 * Sau duration không có tương tác (mặc định 10 phút = 600,000ms),
 * tự động thực hiện callback onIdle / xóa token, bắn Toast thông báo và chuyển về trang chủ (/).
 *
 * @param {Object} options
 * @param {number} options.timeout - Thời gian idle tính bằng ms (mặc định 10 phút)
 * @param {Function} options.onIdle - Hàm callback khi hết thời gian idle
 * @param {boolean} options.enabled - Có đang bật đếm idle hay không (thường bật khi user đã đăng nhập)
 */
export const useIdleTimer = ({
  timeout = 10 * 60 * 1000, // 10 phút
  onIdle,
  enabled = true,
} = {}) => {
  const timerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const handleIdle = useCallback(() => {
    // 1. Xóa JWT Token và thông tin auth từ localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // 2. Bắn Toast thông báo hết hạn
    toast.error('Phiên đăng nhập đã hết hạn do không hoạt động', {
      id: 'idle-timeout-toast',
      duration: 4000,
    });

    // 3. Gọi callback onIdle nếu có
    if (onIdle && typeof onIdle === 'function') {
      onIdle();
    } else {
      // Chuyển hướng về trang chủ
      window.location.href = '/';
    }
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (enabled) {
      timerRef.current = setTimeout(() => {
        handleIdle();
      }, timeout);
    }
  }, [enabled, timeout, handleIdle]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Các sự kiện lắng nghe tương tác của người dùng
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'wheel'];

    let throttleTimeout = null;
    const handleUserActivity = () => {
      // Throttle 1 giây để tránh gọi resetTimer liên tục khi di chuột
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
          resetTimer();
        }, 1000);
      }
    };

    // Khởi tạo timer ban đầu
    resetTimer();

    // Đăng ký event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Cleanup khi unmount hoặc khi enabled / timeout thay đổi
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (throttleTimeout) clearTimeout(throttleTimeout);

      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [enabled, resetTimer]);

  return { resetTimer };
};

export default useIdleTimer;
