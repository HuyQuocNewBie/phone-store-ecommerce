import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  ShoppingCart, 
  User, 
  LogOut, 
  ShieldCheck, 
  Truck, 
  PhoneCall, 
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  Store
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm text-slate-900">
      {/* ── Topbar Thông Báo / Banner Nhỏ ── */}
      <div className="bg-slate-800 text-xs py-2 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Bên trái: Hotline & thông tin cửa hàng */}
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Hotline: <strong className="text-white">1900 8888</strong> (8:00 - 21:30)</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Hệ thống <strong className="text-slate-200">45 cửa hàng</strong> toàn quốc</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Thu cũ đổi mới trợ giá tới <strong className="text-amber-400">2.000.000đ</strong></span>
          </div>

          {/* Bên phải: Đại lý & Giao hàng */}
          <div className="flex items-center gap-5 text-slate-400">
            <span className="flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Đại lý ủy quyền chính hãng</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer">
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              <span>Giao nhanh miễn phí</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Navbar ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* 1. Logo Brand */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <img
              src="/assets/logo.png"
              alt="SmartZone Logo"
              className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Fallback nếu logo.png không tồn tại
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback icon logo */}
            <div className="hidden w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-violet-600 items-center justify-center shadow-lg shadow-sky-500/20">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-wider bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
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
                className="w-full pl-11 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-inner"
              />

              {/* Icon Tìm kiếm bên trái */}
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

              {/* Nút Clear & Nút Tìm kiếm bên phải */}
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
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
              className="relative p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 transition-all group"
              title="Giỏ hàng của bạn"
            >
              <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-r from-rose-500 to-violet-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                0
              </span>
            </Link>

            {/* Tài Khoản / User Menu */}
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 hover:border-sky-200 hover:bg-sky-50 rounded-xl text-slate-700 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm">
                    {user?.HoTen ? user.HoTen.charAt(0) : user?.TaiKhoan?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-medium max-w-[100px] truncate hidden md:inline">
                    {user?.HoTen || user?.TaiKhoan}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu User */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{user?.HoTen || user?.TaiKhoan}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.Email || 'Khách hàng SmartZone'}</p>
                    </div>

                    {isAdmin && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-sky-600 hover:bg-sky-50 rounded-xl font-medium transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Trang Quản trị Admin</span>
                      </Link>
                    )}

                    <Link
                      to="/orders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4 text-violet-500" />
                      <span>Đơn hàng của tôi</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-500 hover:bg-rose-50 rounded-xl transition-colors mt-1 font-medium"
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
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 text-sky-600 text-xs font-semibold rounded-xl transition-all shadow-sm"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </Link>
            )}

            {/* Mobile Menu Toggle button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-500 hover:text-slate-700 md:hidden"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
