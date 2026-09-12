import { Link } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

/**
 * NotFoundPage — Trang hiển thị khi không tìm thấy đường dẫn hoặc bị chặn truy cập route bảo vệ
 */
const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-black/80">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
          <FileQuestion className="w-10 h-10 animate-bounce" />
        </div>

        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-violet-400 tracking-tight mb-2">
          404
        </h1>
        <h2 className="text-2xl font-bold text-slate-100 mb-3">
          Trang không tồn tại
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Rất tiếc, trang bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc yêu cầu quyền truy cập đã đăng nhập.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-sky-500/20 active:scale-95"
          >
            <Home className="w-4 h-4" />
            Về Trang chủ
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700/80 text-slate-300 hover:text-white font-medium text-sm transition-all duration-200 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
