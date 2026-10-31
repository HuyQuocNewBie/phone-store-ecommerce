import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * ZaloCallbackPage — Trang hứng và xử lý callback từ Zalo OAuth 2.0
 * Route: /auth/zalo/callback
 *
 * Hỗ trợ 2 kịch bản:
 * 1. Mở dưới dạng Popup: Gửi token/thông tin về cho window.opener và tự động đóng.
 * 2. Mở trực tiếp (Redirect): Lưu token, xử lý giỏ hàng chờ và điều hướng người dùng.
 */
const ZaloCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setToken, setUser } = useAuth();

  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    // Ngăn chặn chạy 2 lần trong React StrictMode
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;

    const handleCallback = async () => {
      try {
        // 1. Phân tích query string và URL hash
        const searchParams = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(
          location.hash.startsWith('#') ? location.hash.substring(1) : location.hash
        );

        // Lấy error nếu người dùng từ chối cấp quyền
        const error = searchParams.get('error') || hashParams.get('error');
        const errorDescription =
          searchParams.get('error_description') ||
          searchParams.get('error_reason') ||
          hashParams.get('error_description');

        if (error) {
          const message = errorDescription || 'Bạn đã hủy yêu cầu đăng nhập bằng Zalo.';
          setStatus('error');
          setErrorMessage(message);

          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              { type: 'ZALO_AUTH_ERROR', message },
              window.location.origin
            );
            setTimeout(() => window.close(), 1200);
          }
          return;
        }

        // Lấy access_token hoặc code
        const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
        const code = searchParams.get('code') || hashParams.get('code');
        const codeVerifier =
          sessionStorage.getItem('zalo_code_verifier') ||
          localStorage.getItem('zalo_code_verifier') ||
          '';

        if (!accessToken && !code) {
          const msg = 'Không tìm thấy thông tin xác thực từ Zalo (thiếu mã code hoặc access_token).';
          setStatus('error');
          setErrorMessage(msg);

          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              { type: 'ZALO_AUTH_ERROR', message: msg },
              window.location.origin
            );
            setTimeout(() => window.close(), 1500);
          }
          return;
        }

        // 2. Gửi mã xác thực lên Backend POST /api/v1/auth/zalo
        const res = await api.post('/auth/zalo', {
          accessToken,
          access_token: accessToken,
          code,
          codeVerifier,
        });

        const resData = res.data?.data || res.data || {};
        const token = resData.token || resData.accessToken;
        const user = resData.user;

        if (!token || !user) {
          throw new Error(
            res.data?.message || 'Không nhận được thông tin xác thực (token, user) từ hệ thống.'
          );
        }

        // Xóa code_verifier đã dùng
        sessionStorage.removeItem('zalo_code_verifier');
        sessionStorage.removeItem('zalo_auth_state');
        localStorage.removeItem('zalo_code_verifier');

        // Lưu token và user vào localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('accessToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        if (resData.refreshToken) {
          localStorage.setItem('refreshToken', resData.refreshToken);
        }

        // Gọi hàm login(user, token) từ useAuth() (AuthContext) để trigger Navbar re-render lại State đã đăng nhập
        if (typeof login === 'function') {
          await login(user, token);
        } else {
          if (setToken) setToken(token);
          if (setUser) setUser(user);
        }

        // 3. Đăng nhập thành công
        setStatus('success');

        // Khôi phục hành vi mua ngay / thêm vào giỏ hàng nếu có
        const intentRaw = sessionStorage.getItem('cart_action_intent');
        if (intentRaw) {
          try {
            const intent = JSON.parse(intentRaw);
            sessionStorage.removeItem('cart_action_intent');

            await api.post('/cart/items', {
              MaSanPham: intent.product_id || intent.MaSanPham,
              SoLuong: intent.quantity || intent.SoLuong || 1,
              DungLuong: intent.DungLuong || intent.variant?.DungLuong || null,
              MauSac: intent.MauSac || intent.variant?.MauSac || null,
            });
          } catch (e) {
            console.warn('Lỗi xử lý cart_action_intent:', e);
          }
        }

        // Nếu mở dưới dạng popup -> Báo cho tab cha và đóng popup
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: 'ZALO_AUTH_SUCCESS',
              user,
              token,
              redirectTarget: '/',
            },
            window.location.origin
          );
          setTimeout(() => {
            window.close();
          }, 600);
        } else {
          // Tiến hành chuyển hướng về trang chủ (navigate('/'))
          toast.success(
            `Đăng nhập Zalo thành công! Chào mừng ${user?.TaiKhoan || user?.HoTen || 'bạn'}.`,
            { id: 'login-toast' }
          );
          navigate('/');
        }
      } catch (err) {
        console.error('Lỗi trong luồng Zalo Callback:', err);
        const msg =
          err.response?.data?.message ||
          err.message ||
          'Đã xảy ra sự cố trong quá trình xác thực Zalo.';
        setStatus('error');
        setErrorMessage(msg);

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: 'ZALO_AUTH_ERROR', message: msg },
            window.location.origin
          );
          setTimeout(() => window.close(), 1800);
        }
      }
    };

    handleCallback();
  }, [location, login, navigate, setToken, setUser]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
        {/* Zalo Brand Header */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-[#0068FF] flex items-center justify-center shadow-lg shadow-[#0068FF]/30">
            <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1 shadow-sm">
              <svg
                role="img"
                viewBox="0 0 24 24"
                className="w-7 h-7 fill-[#0068FF]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9453 0 1.0746.8697 1.9453 1.945 1.9453z" />
              </svg>
            </span>
          </div>
        </div>

        {/* State: Processing */}
        {status === 'processing' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-[#0068FF] animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Đang xác thực Zalo...</h2>
            <p className="text-sm text-slate-400">
              Vui lòng giữ nguyên màn hình, SmartZone đang kết nối tài khoản của bạn.
            </p>
          </div>
        )}

        {/* State: Success */}
        {status === 'success' && (
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Đăng nhập thành công!</h2>
            <p className="text-sm text-slate-400">Đang chuyển tiếp về SmartZone...</p>
          </div>
        )}

        {/* State: Error */}
        {status === 'error' && (
          <div className="flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Xác thực không thành công</h2>
            <p className="text-sm text-rose-300 mb-6 bg-rose-950/40 p-3 rounded-lg border border-rose-800/50">
              {errorMessage || 'Đã có lỗi xảy ra trong quá trình đăng nhập qua Zalo.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link
                to="/login"
                replace
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-sm transition-colors text-center"
              >
                Về trang Đăng nhập
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0068FF] hover:bg-[#0058e0] text-white font-medium text-sm transition-colors text-center"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZaloCallbackPage;

