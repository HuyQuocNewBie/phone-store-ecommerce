import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import SearchDropdown from './SearchDropdown';

const STORAGE_KEY = 'search_history';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { totalCartCount } = useCart();

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // UI State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const userMenuRef = useRef(null);

  // 1. Tải lịch sử từ khóa tìm kiếm từ localStorage khi mount
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

  // 3. Khoá scroll body khi drawer mở
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileDrawerOpen]);

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

  // Đóng drawer và điều hướng
  const handleDrawerNavigate = (path) => {
    setIsMobileDrawerOpen(false);
    navigate(path);
  };

  // Đóng drawer và đăng xuất
  const handleDrawerLogout = () => {
    setIsMobileDrawerOpen(false);
    logout();
  };

  return (
    <header className="sticky top-0 w-full z-50 bg-surface/95 backdrop-blur-xl border-b border-surface-container shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* ── Topbar Thông Báo Mỏng (chỉ Desktop) ── */}
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

      {/* ══════════════════════════════════════════════════════
          DESKTOP NAVBAR (≥ 768px)
          Layout: Logo | Search | Cart + Account
      ══════════════════════════════════════════════════════ */}
      <div className="hidden md:flex h-20 max-w-container-max mx-auto px-gutter-desktop items-center justify-between gap-unit-lg">
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

        {/* 2. Thanh Tìm kiếm Desktop */}
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
            <span className="font-body-sm text-body-sm font-semibold">Giỏ hàng</span>
            {totalCartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-tertiary-container text-on-tertiary font-body-sm text-body-sm flex items-center justify-center font-bold shadow-sm transition-all duration-300 animate-bounce-once">
                {totalCartCount > 99 ? '99+' : totalCartCount}
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
                <div className="flex flex-col text-left">
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

      {/* ══════════════════════════════════════════════════════
          MOBILE NAVBAR (< 768px)
          Layout: Logo | Search Bar (flex-1) | Cart Badge + Hamburger
      ══════════════════════════════════════════════════════ */}
      <div className="flex md:hidden h-14 items-center gap-2 px-3 w-full">
        {/* Logo bên trái */}
        <Link to="/" className="flex items-center gap-1.5 shrink-0 group" aria-label="SmartZone - Trang chủ">
          <img
            alt="SmartZone Logo"
            className="h-7 w-auto object-contain group-hover:scale-105 transition-transform"
            src="/assets/logo.png"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                'https://lh3.googleusercontent.com/aida/AEtjO1VFkMUR9lR9HPntOzoRJD2b-3_Otg0zsUpN5dPmnqxMZkNfgXXEuXKX9mDfxFH6gWnTmh3uZtp7BLICIT33cp7pZ-Q1fen8dWJ1z33hnwzcy23h0efriIZ1Ki9aUkgHtlRjF7cZ_5pe42ElHyJNs1cqwyaG7rA4tDnjXpX7Ja4u7T600203lPn-oq6i3zYmy36cdPRjohA8dadvbwuBJz1D5W26dV5-4MSGnPY_ohrsU-qpeyHSCSKjtQM';
            }}
          />
          <span className="font-bold text-base text-primary tracking-tight leading-none">
            Smart<span className="text-tertiary-container">Zone</span>
          </span>
        </Link>

        {/* Search Bar giữa (flex-1, co giãn theo chiều rộng) */}
        <div className="flex-1 min-w-0 relative" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-2.5 text-outline pointer-events-none leading-none text-[18px]">
              search
            </span>
            <input
              id="mobile-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Tìm điện thoại..."
              className="w-full pl-8 pr-8 py-1.5 bg-surface-container-lowest rounded-full text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 text-outline hover:text-on-surface transition-colors"
                aria-label="Xóa tìm kiếm"
              >
                <span className="material-symbols-outlined text-[16px] leading-none">close</span>
              </button>
            )}
          </form>

          {/* Search Dropdown Mobile */}
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

        {/* Cụm Icon phải: Cart Badge + Hamburger */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Giỏ hàng với Badge */}
          <Link
            to="/cart"
            className="relative p-2 rounded-xl hover:bg-surface-container-low transition-colors"
            aria-label="Giỏ hàng"
            id="mobile-cart-btn"
          >
            <span className="material-symbols-outlined text-primary leading-none text-[22px]">
              shopping_cart
            </span>
            {totalCartCount > 0 && (
              <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-0.5 rounded-full bg-tertiary-container text-on-tertiary text-[10px] font-bold flex items-center justify-center shadow-sm">
                {totalCartCount > 99 ? '99+' : totalCartCount}
              </span>
            )}
          </Link>

          {/* Hamburger Menu Icon */}
          <button
            type="button"
            id="mobile-hamburger-btn"
            aria-label="Mở menu điều hướng"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 rounded-xl hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface leading-none text-[24px]">menu</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE DRAWER (Slide từ phải sang trái)
      ══════════════════════════════════════════════════════ */}
      {/* Backdrop - lớp phủ đen bên ngoài */}
      <div
        onClick={() => setIsMobileDrawerOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isMobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-4/5 max-w-sm bg-surface shadow-2xl z-[70] flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          isMobileDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu điều hướng"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-container bg-surface-container-lowest shrink-0">
          <Link
            to="/"
            onClick={() => setIsMobileDrawerOpen(false)}
            className="flex items-center gap-2"
          >
            <img
              alt="SmartZone Logo"
              className="h-7 w-auto object-contain"
              src="/assets/logo.png"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  'https://lh3.googleusercontent.com/aida/AEtjO1VFkMUR9lR9HPntOzoRJD2b-3_Otg0zsUpN5dPmnqxMZkNfgXXEuXKX9mDfxFH6gWnTmh3uZtp7BLICIT33cp7pZ-Q1fen8dWJ1z33hnwzcy23h0efriIZ1Ki9aUkgHtlRjF7cZ_5pe42ElHyJNs1cqwyaG7rA4tDnjXpX7Ja4u7T600203lPn-oq6i3zYmy36cdPRjohA8dadvbwuBJz1D5W26dV5-4MSGnPY_ohrsU-qpeyHSCSKjtQM';
              }}
            />
            <span className="font-bold text-base text-primary tracking-tight">
              Smart<span className="text-tertiary-container">Zone</span>
            </span>
          </Link>
          {/* Nút X đóng Drawer */}
          <button
            type="button"
            id="mobile-drawer-close-btn"
            aria-label="Đóng menu"
            onClick={() => setIsMobileDrawerOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[22px] leading-none">close</span>
          </button>
        </div>

        {/* Drawer Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* User Info / Đăng nhập */}
          <div className="px-5 py-4 border-b border-surface-container">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary text-on-primary font-bold text-sm flex items-center justify-center shadow-sm uppercase shrink-0">
                  {user?.HoTen ? user.HoTen.charAt(0) : user?.TaiKhoan?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-on-surface truncate">
                    {user?.HoTen || user?.TaiKhoan}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">
                    {user?.Email || 'Khách hàng SmartZone'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <p className="text-sm text-on-surface-variant">Đăng nhập để xem ưu đãi và theo dõi đơn hàng</p>
                <button
                  type="button"
                  onClick={() => handleDrawerNavigate('/login')}
                  className="w-full py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">person</span>
                  Đăng nhập ngay
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-3" aria-label="Menu điều hướng mobile">
            <p className="px-2 py-1 text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Điều hướng
            </p>

            <button
              type="button"
              onClick={() => handleDrawerNavigate('/')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-container-low text-on-surface transition-colors text-sm font-medium"
            >
              <span className="material-symbols-outlined text-primary text-[20px] leading-none">home</span>
              <span>Trang chủ</span>
            </button>

            <button
              type="button"
              onClick={() => handleDrawerNavigate('/products')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-container-low text-on-surface transition-colors text-sm font-medium"
            >
              <span className="material-symbols-outlined text-primary text-[20px] leading-none">smartphone</span>
              <span>Tất cả điện thoại</span>
            </button>

            <button
              type="button"
              onClick={() => handleDrawerNavigate('/cart')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-container-low text-on-surface transition-colors text-sm font-medium"
            >
              <span className="material-symbols-outlined text-primary text-[20px] leading-none">shopping_cart</span>
              <span>Giỏ hàng</span>
              {totalCartCount > 0 && (
                <span className="ml-auto min-w-[22px] h-[22px] px-1 rounded-full bg-tertiary-container text-on-tertiary text-xs font-bold flex items-center justify-center">
                  {totalCartCount > 99 ? '99+' : totalCartCount}
                </span>
              )}
            </button>

            {isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={() => handleDrawerNavigate('/orders')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-container-low text-on-surface transition-colors text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-primary text-[20px] leading-none">receipt_long</span>
                  <span>Đơn hàng của tôi</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDrawerNavigate('/admin/dashboard')}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-container-low text-primary transition-colors text-sm font-medium"
                  >
                    <span className="material-symbols-outlined text-[20px] leading-none">dashboard</span>
                    <span>Trang Quản trị Admin</span>
                  </button>
                )}
              </>
            )}
          </nav>

          {/* Divider */}
          <div className="mx-5 border-t border-surface-container" />

          {/* Hotline & Hỗ trợ */}
          <div className="px-5 py-4">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
              Hỗ trợ khách hàng
            </p>
            <a
              href="tel:19006868"
              className="flex items-center gap-3 py-2.5 text-on-surface hover:text-primary transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[18px] leading-none">call</span>
              </div>
              <div>
                <p className="text-sm font-bold text-primary">1900 6868</p>
                <p className="text-xs text-on-surface-variant">8:00 – 21:30 mỗi ngày</p>
              </div>
            </a>

            <div className="flex items-center gap-3 py-2">
              <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary text-[18px] leading-none">location_on</span>
              </div>
              <div>
                <p className="text-sm font-medium text-on-surface">45 cửa hàng toàn quốc</p>
                <p className="text-xs text-on-surface-variant">Đại lý ủy quyền chính hãng</p>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer - Đăng xuất (khi đã đăng nhập) */}
        {isAuthenticated && (
          <div className="px-5 py-4 border-t border-surface-container bg-surface-container-lowest shrink-0">
            <button
              type="button"
              onClick={handleDrawerLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-semibold text-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] leading-none">logout</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
