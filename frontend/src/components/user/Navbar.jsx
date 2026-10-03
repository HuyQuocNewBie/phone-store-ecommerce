import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  // Cart Count State
  const [cartCount, setCartCount] = useState(0);

  // UI State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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

  // 2. Tải số lượng giỏ hàng
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/cart')
        .then((res) => {
          if (res.data?.success) {
            const count = res.data.data?.items?.length || res.data.data?.length || 0;
            setCartCount(count);
          }
        })
        .catch(() => {});
    } else {
      setCartCount(0);
    }
  }, [isAuthenticated]);

  // 3. Debounce 350ms khi gõ từ khóa -> gọi API /search/suggest
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
        const res = await api.get('/search/suggest', { params: { q: trimmed } });
        if (res.data?.success) {
          setSuggestions(res.data.data || []);
        }
      } catch (err) {
        console.error('Lỗi gợi ý tìm kiếm:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 4. Click ngoài dropdown để đóng
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 5. Lưu lịch sử tìm kiếm
  const saveSearchHistory = (keyword) => {
    if (!keyword) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== keyword.toLowerCase());
      const updated = [keyword, ...filtered].slice(0, 8);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleRemoveHistoryItem = (keyword) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== keyword);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
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
    <header className="sticky top-0 w-full z-50 bg-surface/95 backdrop-blur-xl border-b border-surface-container shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* ── Topbar Thông Báo Mỏng ── */}
      <div className="bg-surface-container text-on-surface-variant font-body-sm text-body-sm py-unit-2xs hidden md:block">
        <div className="max-w-container-max mx-auto px-gutter-desktop flex items-center justify-between">
          <span>
            Hotline: <strong className="text-primary font-bold">1900 6868</strong> (8:00 - 21:30) | Hệ thống 45 cửa hàng toàn quốc | Thu cũ đổi mới trợ giá tới <strong className="text-tertiary-container font-bold">2.000.000đ</strong>
          </span>
          <div className="flex items-center gap-unit-md">
            <span className="flex items-center gap-unit-2xs">
              <span className="material-symbols-outlined text-sm leading-none text-primary">verified</span>
              Đại lý ủy quyền chính hãng
            </span>
            <span className="flex items-center gap-unit-2xs">
              <span className="material-symbols-outlined text-sm leading-none text-secondary">local_shipping</span>
              Giao nhanh 1h miễn phí
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Navbar ── */}
      <div className="h-20 max-w-container-max mx-auto px-gutter-desktop flex items-center justify-between gap-unit-lg">
        {/* 1. Logo Brand */}
        <Link to="/" className="flex items-center gap-unit-xs shrink-0 group">
          <img
            alt="SmartZone Logo"
            className="h-8 w-auto object-contain group-hover:scale-105 transition-transform"
            src="/assets/logo.png"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                'https://lh3.googleusercontent.com/aida/AEtjO1VFkMUR9lR9HPntOzoRJD2b-3_Otg0zsUpN5dPmnqxMZkNfgXXEuXKX9mDfxFH6gWnTmh3uZtp7BLICIT33cp7pZ-Q1fen8dWJ1z33hnwzcy23h0efriIZ1Ki9aUkgHtlRjF7cZ_5pe42ElHyJNs1cqwyaG7rA4tDnjXpX7Ja4u7T600203lPn-oq6i3zYmy36cdPRjohA8dadvbwuBJz1D5W26dV5-4MSGnPY_ohrsU-qpeyHSCSKjtQM';
            }}
          />
          <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-extrabold">
            Smart<span className="text-tertiary-container">Zone</span>
          </span>
        </Link>

        {/* 2. Thanh Tìm kiếm */}
        <div className="flex-1 max-w-2xl relative" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-unit-md text-outline pointer-events-none leading-none">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Bạn tìm điện thoại gì? (VD: iPhone 16 Pro Max, Galaxy S24 Ultra...)"
              className="w-full pl-11 pr-28 py-unit-xs bg-surface-container-lowest rounded-full text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-[0_1px_3px_rgba(15,23,42,0.06)] border border-surface-container"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-24 p-1 text-outline hover:text-on-surface transition-colors"
                title="Xóa tìm kiếm"
              >
                <span className="material-symbols-outlined text-sm leading-none">close</span>
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1 px-unit-md py-unit-xs bg-primary text-on-primary font-body-md text-body-md rounded-full hover:bg-primary-container transition-colors font-medium shadow-sm active:scale-95"
            >
              Tìm kiếm
            </button>
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

        {/* 3. Actions Right (Giỏ hàng & Tài khoản) */}
        <div className="flex items-center gap-unit-md shrink-0">
          {/* Giỏ hàng */}
          <Link
            to="/cart"
            className="relative flex items-center gap-unit-xs px-unit-sm py-unit-xs bg-surface-container-low hover:bg-surface-container-high rounded-xl text-on-surface transition-colors group shadow-sm"
            title="Giỏ hàng"
          >
            <span className="material-symbols-outlined text-primary leading-none group-hover:scale-110 transition-transform">
              shopping_cart
            </span>
            <span className="font-body-sm text-body-sm font-semibold hidden sm:inline">Giỏ hàng</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-tertiary-container text-on-tertiary font-body-sm text-body-sm flex items-center justify-center font-bold shadow-sm">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Tài Khoản Người Dùng */}
          {isAuthenticated ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-unit-xs px-unit-xs py-1 hover:bg-surface-container-low rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-bold text-xs flex items-center justify-center shadow-sm uppercase">
                  {user?.HoTen ? user.HoTen.charAt(0) : user?.TaiKhoan?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="font-body-sm text-body-sm text-on-surface-variant leading-none">Xin chào,</span>
                  <span className="font-body-md text-body-md text-on-surface font-semibold leading-tight max-w-[100px] truncate">
                    {user?.HoTen || user?.TaiKhoan}
                  </span>
                </div>
                <span
                  className={`material-symbols-outlined text-sm text-outline leading-none transition-transform duration-200 ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-unit-2xs w-60 bg-surface-container-lowest border border-surface-container rounded-xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.12)] p-unit-xs z-50 animate-scale-in">
                  <div className="px-unit-sm py-unit-xs border-b border-surface-container mb-unit-2xs">
                    <p className="font-body-md text-body-md font-semibold text-on-surface truncate">
                      {user?.HoTen || user?.TaiKhoan}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {user?.Email || 'Khách hàng SmartZone'}
                    </p>
                  </div>

                  {isAdmin && (
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-unit-sm px-unit-sm py-unit-xs rounded-lg text-primary hover:bg-surface-container-low transition-colors font-medium font-body-md text-body-md"
                    >
                      <span className="material-symbols-outlined text-sm">dashboard</span>
                      <span>Trang Quản trị Admin</span>
                    </Link>
                  )}

                  <Link
                    to="/orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-unit-sm px-unit-sm py-unit-xs rounded-lg text-on-surface hover:bg-surface-container-low hover:text-primary transition-colors font-body-md text-body-md"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">receipt_long</span>
                    <span>Đơn hàng của tôi</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-unit-sm px-unit-sm py-unit-xs rounded-lg text-red-600 hover:bg-red-50 transition-colors font-medium font-body-md text-body-md mt-1"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-unit-xs px-unit-md py-unit-xs bg-primary text-on-primary font-body-md text-body-md rounded-full hover:bg-primary-container transition-all shadow-sm active:scale-95 font-semibold"
            >
              <span className="material-symbols-outlined text-base">person</span>
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
