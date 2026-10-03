import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
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
    <>
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
              placeholder="Bạn cần tìm điện thoại gì?"
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
          MOBILE NAVBAR (< 768px) — 2 HÀNG
          HÀNG 1: Hamburger | Logo (căn giữa) | Cart
          HÀNG 2: Thanh tìm kiếm Full Width
      ══════════════════════════════════════════════════════ */}
      <div className="flex md:hidden flex-col w-full">

        {/* ── HÀNG 1: Hamburger | Logo (center) | Cart ── */}
        <div className="flex items-center justify-between h-14 px-3 w-full">

          {/* Hamburger bên TRÁI */}
          <button
            type="button"
            id="mobile-hamburger-btn"
            aria-label="Mở menu điều hướng"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 rounded-xl hover:bg-surface-container-low transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-on-surface leading-none text-[24px]">menu</span>
          </button>

          {/* Logo + Tên — CHÍNH GIỮA (absolute để không bị đẩy lệch) */}
          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 group"
            aria-label="SmartZone - Trang chủ"
          >
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

          {/* Cart Icon bên PHẢI */}
          <Link
            to="/cart"
            className="relative p-2 rounded-xl hover:bg-surface-container-low transition-colors shrink-0"
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
        </div>

        {/* ── HÀNG 2: Thanh Tìm Kiếm Full Width ── */}
        <div className="px-3 pb-2.5 relative" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-outline pointer-events-none leading-none text-[18px]">
              search
            </span>
            <input
              id="mobile-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Bạn cần tìm điện thoại gì?"
              className="w-full pl-9 pr-9 py-2 bg-surface-container-lowest rounded-full text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container shadow-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 text-outline hover:text-on-surface transition-colors"
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
      </div>

    </header>

    {/* ══════════════════════════════════════════════════════
        MOBILE DRAWER — Dùng Portal để thoát khỏi stacking
        context của <header z-50>, render thẳng vào body
    ══════════════════════════════════════════════════════ */}
    {ReactDOM.createPortal(
      <>
        {/* Backdrop */}
        <div
          onClick={() => setIsMobileDrawerOpen(false)}
          className={`fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
            isMobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden="true"
        />

        {/* Drawer Panel */}
        <div
          className={`fixed inset-y-0 right-0 w-[82vw] max-w-[340px] bg-white z-[9999] flex flex-col transition-transform duration-300 ease-in-out md:hidden shadow-[-4px_0_30px_rgba(0,0,0,0.15)] ${
            isMobileDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
        >

        {/* ── HEADER: Logo + Nút X ── */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white shrink-0">
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
            <span className="font-bold text-[15px] text-blue-600 tracking-tight leading-none">
              Smart<span className="text-orange-500">Zone</span>
            </span>
          </Link>

          <button
            type="button"
            id="mobile-drawer-close-btn"
            aria-label="Đóng menu"
            onClick={() => setIsMobileDrawerOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-500 text-[20px] leading-none">close</span>
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── KHU VỰC AUTH ── */}
          {isAuthenticated ? (
            /* ─── LOGGED-IN: Profile Block ─── */
            <div className="bg-gradient-to-br from-blue-50 to-slate-50 border-b border-slate-100">
              {/* Profile Card */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-base flex items-center justify-center shadow-md uppercase shrink-0 ring-2 ring-white ring-offset-1">
                  {user?.HoTen ? user.HoTen.charAt(0) : user?.TaiKhoan?.charAt(0) || 'U'}
                </div>
                {/* Name & Email */}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[14px] text-slate-800 truncate leading-tight">
                    {user?.HoTen || user?.TaiKhoan}
                  </p>
                  <p className="text-[12px] text-slate-500 truncate mt-0.5">
                    {user?.Email || 'Khách hàng SmartZone'}
                  </p>
                </div>
              </div>

              {/* Quick Links */}
              <div className="flex gap-2 px-4 pb-4">
                <button
                  type="button"
                  onClick={() => handleDrawerNavigate('/profile')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white rounded-lg border border-slate-200 text-slate-700 text-[12px] font-semibold hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[15px] leading-none">manage_accounts</span>
                  Hồ sơ cá nhân
                </button>
                <button
                  type="button"
                  onClick={() => handleDrawerNavigate('/orders')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white rounded-lg border border-slate-200 text-slate-700 text-[12px] font-semibold hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[15px] leading-none">receipt_long</span>
                  Đơn hàng
                </button>
              </div>
            </div>
          ) : (
            /* ─── GUEST: 2 Nút Auth ─── */
            <div className="px-4 py-4 border-b border-slate-100 bg-slate-50">
              <p className="text-[12px] text-slate-500 mb-3 leading-snug">
                Đăng nhập để xem ưu đãi độc quyền &amp; theo dõi đơn hàng
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDrawerNavigate('/login')}
                  className="flex-1 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all hover:bg-blue-700"
                >
                  <span className="material-symbols-outlined text-[16px] leading-none">login</span>
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => handleDrawerNavigate('/register')}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all hover:bg-slate-50 hover:border-slate-300"
                >
                  <span className="material-symbols-outlined text-[16px] leading-none">person_add</span>
                  Đăng ký
                </button>
              </div>
            </div>
          )}

          {/* ── MENU ĐIỀU HƯỚNG CHÍNH ── */}
          <nav className="px-3 pt-3 pb-1" aria-label="Menu điều hướng mobile">
            <p className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Điều hướng
            </p>

            <button
              type="button"
              onClick={() => handleDrawerNavigate('/')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors text-[13px] font-medium group"
            >
              <span className="material-symbols-outlined text-blue-500 text-[20px] leading-none group-hover:scale-110 transition-transform">home</span>
              <span>Trang chủ</span>
            </button>

            <button
              type="button"
              onClick={() => handleDrawerNavigate('/cart')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors text-[13px] font-medium group"
            >
              <span className="material-symbols-outlined text-blue-500 text-[20px] leading-none group-hover:scale-110 transition-transform">shopping_cart</span>
              <span>Giỏ hàng</span>
              {totalCartCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {totalCartCount > 99 ? '99+' : totalCartCount}
                </span>
              )}
            </button>

            {isAuthenticated && isAdmin && (
              <button
                type="button"
                onClick={() => handleDrawerNavigate('/admin/dashboard')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors text-[13px] font-semibold group"
              >
                <span className="material-symbols-outlined text-[20px] leading-none group-hover:scale-110 transition-transform">dashboard</span>
                <span>Trang Quản trị Admin</span>
                <span className="ml-auto text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">Admin</span>
              </button>
            )}
          </nav>

          {/* ── DANH MỤC SẢN PHẨM ── */}
          <div className="px-3 py-1">
            <p className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Danh mục sản phẩm
            </p>

            {[
              { label: 'iPhone (Apple)', icon: 'phone_iphone', query: 'iPhone', color: 'text-slate-600' },
              { label: 'Samsung Galaxy', icon: 'smartphone', query: 'Samsung', color: 'text-blue-500' },
              { label: 'Xiaomi / POCO', icon: 'smartphone', query: 'Xiaomi', color: 'text-orange-500' },
              { label: 'OPPO / Reno', icon: 'smartphone', query: 'OPPO', color: 'text-green-500' },
              { label: 'Vivo / Y-Series', icon: 'smartphone', query: 'Vivo', color: 'text-purple-500' },
              { label: 'Tất cả điện thoại', icon: 'apps', query: '', color: 'text-blue-600' },
            ].map(({ label, icon, query, color }) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  query
                    ? handleDrawerNavigate(`/products?search=${encodeURIComponent(query)}`)
                    : handleDrawerNavigate('/products')
                }
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-colors text-[13px] font-medium text-slate-700 group"
              >
                <span className={`material-symbols-outlined text-[20px] leading-none ${color} group-hover:scale-110 transition-transform`}>
                  {icon}
                </span>
                <span>{label}</span>
                <span className="material-symbols-outlined text-[14px] leading-none text-slate-300 ml-auto">chevron_right</span>
              </button>
            ))}
          </div>

          {/* ── HỖ TRỢ KHÁCH HÀNG ── */}
          <div className="px-4 pt-2 pb-4 mt-1">
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-2xl p-3 border border-blue-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Hỗ trợ khách hàng
              </p>
              <a
                href="tel:19008888"
                className="flex items-center gap-3 py-1 group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-white text-[18px] leading-none">call</span>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-blue-600 leading-tight">1900 8888</p>
                  <p className="text-[11px] text-slate-500">8:00 – 21:30 • Miễn phí</p>
                </div>
              </a>

              <div className="flex items-center gap-3 py-1 mt-1">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-white text-[18px] leading-none">location_on</span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-700">45 cửa hàng toàn quốc</p>
                  <p className="text-[11px] text-slate-500">Đại lý ủy quyền chính hãng</p>
                </div>
              </div>
            </div>
          </div>

        </div>
        {/* ── END SCROLLABLE BODY ── */}

        {/* ── FOOTER: Nút Đăng xuất (chỉ khi Logged In) ── */}
        {isAuthenticated && (
          <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0">
            <button
              type="button"
              onClick={handleDrawerLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 font-semibold text-[13px] transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px] leading-none">logout</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        )}

        </div>
      </>,
      document.body
    )}
    </>
  );
};

export default Navbar;
