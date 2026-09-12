import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

/**
 * ScrollToTop — Floating Action Button (FAB) ở góc dưới bên phải.
 * Hiển thị khi window.scrollY > 300px. Khi click sẽ cuộn mượt lên đầu trang.
 */
const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility(); // Kiểm tra ngay khi mount

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      id="btn-scroll-to-top"
      aria-label="Cuộn lên đầu trang"
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-50 p-3.5 rounded-2xl
        bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-sky-400
        hover:text-white hover:bg-sky-600 hover:border-sky-500 hover:shadow-sky-500/25
        shadow-xl shadow-black/50 transition-all duration-300 transform active:scale-90
        focus:outline-none focus:ring-2 focus:ring-sky-500/50
        ${
          isVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
    >
      <ChevronUp className="w-6 h-6 stroke-[2.5]" />
    </button>
  );
};

export default ScrollToTop;
