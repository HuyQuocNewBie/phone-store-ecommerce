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
        if (Array.isArray(parsed)) setSearchHistory(parsed);
      }
    } catch (e) {
      console.error('Lỗi khi đọc search history:', e);
    }
  }, []);

  // 2. Debounce 350ms khi gõ từ khóa -> gọi API /search/suggest
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) { setSuggestions([]); setLoadingSuggestions(false); return; }
    setLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/search/suggest', { params: { q: trimmed } });
        if (res.data?.success) setSuggestions(res.data.data || []);
        else setSuggestions([]);
      } catch { setSuggestions([]); }
      finally { setLoadingSuggestions(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 3. Click outside & Escape Key handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target))
        setIsDropdownOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target))
        setIsUserMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') { setIsDropdownOpen(false); setIsUserMenuOpen(false); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 4. Lưu từ khóa vào Lịch sử
  const saveSearchHistory = (keyword) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // 5. Thao tác Xóa Lịch sử
  const handleRemoveHistoryItem = (keyword) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== keyword);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    setSearchHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
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

  const handleSearchSubmit = (e) => { e.preventDefault(); executeSearch(searchTerm); };

  const handleSelectKeyword = (keyword, productId) => {
    saveSearchHistory(keyword);
    setSearchTerm(keyword);
    setIsDropdownOpen(false);
    if (!productId) navigate(`/products?search=${encodeURIComponent(keyword)}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-[0_1px_12px_-2px_rgba(0,0,0,0.06)]">

      {/* ── Topbar Thông Báo Mỏng ── */}
      <div className="bg-blue-600 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-9">

          {/* Bên trái */}
          <div className="flex items-center gap-5 text-xs text-blue-100">
            <span className="flex items-center gap-1.5">
              <PhoneCall className="w-3 h-3 text-blue-200 shrink-0" />
              <span>Hotline: <strong className="text-white font-semibold">1900 8888</strong> (8:00 - 21:30)</span>
            </span>
            <span className="text-blue-400/60">|</span>
            <span className="text-blue-200">Hệ thống <strong className="text-white font-semibold">45 cửa hàng</strong> toàn quốc</span>
            <span className="text-blue-400/60">|</span>
            <span className="text-blue-200">Thu cũ đổi mới trợ giá tới <strong className="text-yellow-300 font-semibold">2.000.000đ</strong></span>
          </div>

          {/* Bên phải */}
          <div className="flex items-center gap-5 text-xs text-blue-200">
            <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
              <ShieldCheck className="w-3 h-3 text-blue-300" />
              <span>Đại lý ủy quyền chính hãng</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
              <Truck className="w-3 h-3 text-blue-300" />
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
              className="h-9 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback icon logo */}
            <div className="hidden w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 items-center justify-center shadow-md shadow-blue-500/25">
              <Store className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-black tracking-tight text-slate-900">SmartZone</span>
              <span className="text-[9px] text-slate-400 font-medium tracking-widest uppercase">Premium Store</span>
            </div>
          </Link>

          {/* 2. Search Bar */}
          <div className="flex-1 max-w-xl relative" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Tìm kiếm iPhone, Samsung, phụ kiện..."
                className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all duration-200 shadow-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all duration-200 active:scale-[0.97] flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tìm</span>
                </button>
              </div>
            </form>

            {/* Search Dropdown */}
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

          {/* 3. Actions Right */}
          <div className="flex items-center gap-2.5 shrink-0">

            {/* Giỏ hàng */}
            <Link
              to="/cart"
              className="relative p-2.5 border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200 group"
              title="Giỏ hàng"
            >
              <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-blue-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center px-1 shadow-md border-2 border-white">
                0
              </span>
            </Link>

            {/* Tài Khoản */}
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 rounded-xl text-slate-700 transition-all duration-200"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm">
                    {user?.HoTen ? user.HoTen.charAt(0) : user?.TaiKhoan?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-medium max-w-[90px] truncate hidden md:inline text-slate-700">
                    {user?.HoTen || user?.TaiKhoan}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] p-2 z-50 animate-scale-in">
                    <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{user?.HoTen || user?.TaiKhoan}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.Email || 'Khách hàng SmartZone'}</p>
                    </div>

                    {isAdmin && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-xl font-medium transition-colors"
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
                      <ShoppingCart className="w-4 h-4 text-blue-500" />
                      <span>Đơn hàng của tôi</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => { setIsUserMenuOpen(false); logout(); }}
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
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-blue-500/20 active:scale-[0.97]"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors md:hidden"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
