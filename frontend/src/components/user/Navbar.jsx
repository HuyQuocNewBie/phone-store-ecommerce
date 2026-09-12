import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  ShoppingCart, 
  User, 
  Smartphone, 
  Laptop, 
  Tablet, 
  Headphones, 
  Flame, 
  LogOut, 
  ShieldCheck, 
  Truck, 
  PhoneCall, 
  ChevronDown,
  Menu,
  X,
  Sparkles,
  LayoutDashboard
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SearchDropdown from './SearchDropdown';

const STORAGE_KEY = 'search_history';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // UI State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const userMenuRef = useRef(null);

  // 1. Tải Lịch sử từ khóa tìm kiếm từ localStorage khi Mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSearchHistory(parsed);
        }
      }
    } catch (e) {
      console.error('Lỗi khi đọc search history từ localStorage:', e);
    }
  }, []);

  // 2. Debounce 350ms khi gõ từ khóa -> gọi API /api/v1/search/suggest?q=...
  useEffect(() => {
    const trimmed = searchTerm.trim();

    if (!trimmed) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/search/suggest', {
          params: { q: trimmed }
        });
        if (res.data?.success) {
          setSuggestions(res.data.data || []);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Lỗi khi lấy gợi ý tìm kiếm:', err);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 3. Click outside & Escape Key handler để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 4. Hàm lưu từ khóa vào Lịch sử tìm kiếm (localStorage)
  const saveSearchHistory = (keyword) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    setSearchHistory((prev) => {
      // Loại bỏ trùng lặp và đưa keyword mới lên đầu, tối đa 10 mục
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Lỗi khi ghi search history vào localStorage:', e);
      }
      return updated;
    });
  };

  // 5. Thao tác Xóa Lịch sử
  const handleRemoveHistoryItem = (keyword) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== keyword);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Lỗi khi xóa từ khóa history:', e);
      }
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Lỗi khi xóa toàn bộ search history:', e);
    }
  };

  // 6. Thực hiện Tìm kiếm
  const executeSearch = (query) => {
    const targetQuery = query !== undefined ? query : searchTerm;
    const trimmed = targetQuery.trim();
    if (trimmed) {
      saveSearchHistory(trimmed);
      setSearchTerm(trimmed);
      setIsDropdownOpen(false);
      navigate(`/products?search=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    executeSearch(searchTerm);
  };

  const handleSelectKeyword = (keyword, productId) => {
    saveSearchHistory(keyword);
    setSearchTerm(keyword);
    setIsDropdownOpen(false);
    if (!productId) {
      navigate(`/products?search=${encodeURIComponent(keyword)}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      {/* ── Topbar Thông Báo / Banner Nhỏ ── */}
      <div className="bg-gradient-to-r from-violet-900/60 via-sky-900/60 to-slate-950 border-b border-slate-800/60 text-xs py-1.5 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-slate-300">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              <span>Giao hàng siêu tốc <strong>2H</strong> trong nội thành</span>
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cam kết <strong>100% Chính Hãng</strong></span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1 hover:text-slate-200 transition-colors cursor-pointer">
              <PhoneCall className="w-3.5 h-3.5 text-violet-400" />
              <span>Hotline: <strong className="text-white font-medium">1900 8888</strong></span>
            </span>
            <span>|</span>
            <Link to="/news" className="hover:text-sky-400 transition-colors">Tin công nghệ</Link>
          </div>
        </div>
      </div>

      {/* ── Main Navbar ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* 1. Logo Brand */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform duration-300">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-wider bg-gradient-to-r from-sky-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                SmartZone
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase -mt-1">
                Store Premium
              </span>
            </div>
          </Link>

          {/* 2. Header Search Input & Dropdown */}
          <div className="flex-1 max-w-2xl relative" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Tìm kiếm điện thoại, phụ kiện, iPhone 15 Pro Max..."
                className="w-full pl-11 pr-24 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-inner"
              />

              {/* Icon Tìm kiếm bên trái */}
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

              {/* Nút Clear & Nút Tìm kiếm bên phải */}
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 text-slate-500 hover:text-slate-300 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-sky-500/20 transition-all flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tìm kiếm</span>
                </button>
              </div>
            </form>

            {/* Search Dropdown Component */}
            <SearchDropdown
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
              searchTerm={searchTerm}
              history={searchHistory}
              suggestions={suggestions}
              loading={loadingSuggestions}
              onSelectKeyword={handleSelectKeyword}
              onRemoveHistoryItem={handleRemoveHistoryItem}
              onClearAllHistory={handleClearAllHistory}
            />
          </div>

          {/* 3. Actions Right: Cart & User Account */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Nút Giỏ Hàng */}
            <Link
              to="/cart"
              className="relative p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-sky-400 hover:border-slate-700 transition-all group"
              title="Giỏ hàng của bạn"
            >
              <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-r from-rose-500 to-violet-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-lg border border-slate-950">
                0
              </span>
            </Link>

            {/* Tài Khoản / User Menu */}
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm">
                    {user?.HoTen ? user.HoTen.charAt(0) : user?.TaiKhoan?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-medium max-w-[100px] truncate hidden md:inline">
                    {user?.HoTen || user?.TaiKhoan}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {/* Dropdown Menu User */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <p className="text-xs font-semibold text-slate-200 truncate">{user?.HoTen || user?.TaiKhoan}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user?.Email || 'Khách hàng SmartZone'}</p>
                    </div>

                    {isAdmin && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-sky-400 hover:bg-slate-800 rounded-xl font-medium transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Trang Quản trị Admin</span>
                      </Link>
                    )}

                    <Link
                      to="/orders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4 text-violet-400" />
                      <span>Đơn hàng của tôi</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors mt-1 font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-sky-400 text-xs font-semibold rounded-xl transition-all shadow-sm"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </Link>
            )}

            {/* Mobile Menu Toggle button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-slate-200 md:hidden"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* ── Category Quick Navigation Bar ── */}
        <nav className="hidden md:flex items-center justify-between py-2 border-t border-slate-900 text-xs font-medium text-slate-400">
          <div className="flex items-center gap-6">
            <Link to="/products?category=1" className="flex items-center gap-1.5 hover:text-sky-400 transition-colors">
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span>Điện Thoại</span>
            </Link>
            <Link to="/products?category=2" className="flex items-center gap-1.5 hover:text-sky-400 transition-colors">
              <Laptop className="w-3.5 h-3.5 text-indigo-400" />
              <span>Laptop</span>
            </Link>
            <Link to="/products?category=3" className="flex items-center gap-1.5 hover:text-sky-400 transition-colors">
              <Tablet className="w-3.5 h-3.5 text-violet-400" />
              <span>Máy Tính Bảng</span>
            </Link>
            <Link to="/products?category=4" className="flex items-center gap-1.5 hover:text-sky-400 transition-colors">
              <Headphones className="w-3.5 h-3.5 text-amber-400" />
              <span>Phụ Kiện</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Flame className="w-3 h-3 animate-bounce" />
              <span>Hot Sales Tháng 9</span>
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
