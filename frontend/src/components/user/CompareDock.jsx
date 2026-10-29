import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useCompare } from '../../context/CompareContext';
import api from '../../services/api';

const CompareDock = () => {
  const location = useLocation();
  const {
    compareItems,
    isDockCollapsed,
    setIsDockCollapsed,
    addToCompare,
    removeFromCompare,
    goToCompare,
  } = useCompare();

  // Search Modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Load products list for search modal on demand
  useEffect(() => {
    if (isSearchOpen && allProducts.length === 0) {
      setLoadingProducts(true);
      api
        .get('/products?limit=100')
        .then((res) => {
          if (res.data?.success) {
            setAllProducts(res.data.data || []);
          }
        })
        .catch((err) => console.error('Failed to load products for compare search:', err))
        .finally(() => setLoadingProducts(false));
    }
  }, [isSearchOpen, allProducts.length]);

  // Filter products excluding already compared ones
  const filteredProducts = useMemo(() => {
    const comparedIds = compareItems.map((item) => Number(item.id));
    let list = allProducts.filter((p) => !comparedIds.includes(Number(p.MaSanPham)));

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => p.TenSanPham.toLowerCase().includes(q));
    }
    return list;
  }, [allProducts, compareItems, searchQuery]);

  // RULE OF HOOKS: All hooks must execute before this route check
  const isHiddenRoute =
    location.pathname === '/compare' || location.pathname.startsWith('/admin');
  if (isHiddenRoute) {
    return null;
  }

  const hasItems = compareItems.length > 0;
  const isVisible = hasItems && !isDockCollapsed;
  const canCompare = compareItems.length >= 2;

  const handleOpenSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
  };

  const handleSelectProduct = (product) => {
    const success = addToCompare(product);
    if (success) {
      setIsSearchOpen(false);
    }
  };

  const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  return (
    <>
      {/* ── Search Compare Backdrop ── */}
      <div
        id="searchCompareBackdrop"
        onClick={handleCloseSearch}
        className={`fixed inset-0 z-[100] bg-black/30 backdrop-blur-[1px] transition-opacity duration-500 ${
          isSearchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ── Search Compare Modal (Image 4 & product_detail.php:1585) ── */}
      <div
        id="searchCompareModal"
        className="fixed z-[101]"
        style={{
          bottom: '180px',
          left: '50%',
          transform: isSearchOpen
            ? 'translateX(-50%) scale(1)'
            : 'translateX(-50%) scale(0)',
          opacity: isSearchOpen ? 1 : 0,
          pointerEvents: isSearchOpen ? 'auto' : 'none',
          transition: 'all 0.6s ease-in-out',
          width: '880px',
          maxWidth: '95%',
          height: '500px',
          maxHeight: '75vh',
          background: '#fff',
          borderRadius: '12px',
          boxShadow:
            '0 20px 32px -24px rgba(0,0,0,.06), 0 0 36px 0 rgba(0,0,0,.11)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          overflow: 'hidden',
        }}
      >
        {/* Search Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderBottom: '1px solid #f4f4f5',
            paddingBottom: '12px',
            position: 'relative',
          }}
        >
          <svg
            className="w-5 h-5 text-gray-500 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ marginRight: '8px' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            id="searchCompareInput"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm sản phẩm so sánh"
            style={{
              width: '100%',
              outline: 'none',
              border: 'none',
              fontSize: '15px',
              color: '#18181b',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#9ca3af',
              }}
              title="Xóa tìm kiếm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={handleCloseSearch}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#6b7280',
              marginLeft: '8px',
            }}
            title="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results List */}
        <div
          id="searchCompareResults"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '12px',
          }}
        >
          {loadingProducts ? (
            <div style={{ textAlign: 'center', color: '#71717a', marginTop: '40px', fontSize: '14px' }}>
              Đang tải sản phẩm...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#71717a', marginTop: '40px', fontSize: '14px' }}>
              Không tìm thấy sản phẩm nào phù hợp
            </div>
          ) : (
            filteredProducts.map((p) => {
              const imgUrl = p.Anh || '/assets/images/placeholder.jpg';
              return (
                <div
                  key={p.MaSanPham}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid #f4f4f5',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                    <img
                      src={imgUrl}
                      alt={p.TenSanPham}
                      style={{
                        width: '48px',
                        height: '48px',
                        objectFit: 'contain',
                        borderRadius: '4px',
                        border: '1px solid #f4f4f5',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: '#18181b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={p.TenSanPham}
                      >
                        {p.TenSanPham}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#d90018' }}>
                        {formatVND(p.Gia)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    style={{
                      padding: '6px 16px',
                      backgroundColor: '#f4f4f5',
                      color: '#18181b',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                    }}
                    className="hover:bg-gray-200 active:scale-95"
                  >
                    Chọn
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Compare Bottom Bar Dock ── */}
      <div
        id="compareDock"
        className="fixed bottom-6 left-1/2 z-[100] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.15)] rounded-2xl border border-gray-200"
        style={{
          transform: isVisible ? 'translate(-50%, 0)' : 'translate(-50%, 150%)',
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
          transition: 'all 0.6s ease-in-out',
          width: '880px',
          maxWidth: '95%',
          minHeight: '138px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '12px',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* Compare Slots Container */}
          <div
            id="compareSlotsContainer"
            style={{
              display: 'flex',
              gap: '12px',
              flex: 1,
              minWidth: '250px',
              height: '114px',
            }}
          >
            {[0, 1, 2].map((idx) => {
              if (idx < compareItems.length) {
                const item = compareItems[idx];
                return (
                  <div
                    key={item.id ?? idx}
                    style={{
                      alignItems: 'center',
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      color: '#18181b',
                      display: 'flex',
                      flexDirection: 'column',
                      fontSize: '12px',
                      justifyContent: 'center',
                      padding: '8px',
                      textAlign: 'center',
                      flex: 1,
                      height: '114px',
                      position: 'relative',
                      background: '#fff',
                    }}
                  >
                    <img
                      src={item.img || '/assets/images/placeholder.jpg'}
                      alt={item.name}
                      style={{
                        width: '56px',
                        height: '56px',
                        objectFit: 'contain',
                        marginBottom: '4px',
                      }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.2',
                      }}
                    >
                      {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCompare(item.id)}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: 'white',
                        border: '1px solid #e4e4e7',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#666',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s',
                      }}
                      title="Xóa khỏi so sánh"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={`empty-${idx}`}
                  onClick={handleOpenSearch}
                  style={{
                    alignItems: 'center',
                    borderRadius: '8px',
                    border: '0.8px dashed #e4e4e7',
                    color: '#18181b',
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: '12px',
                    gap: '4px',
                    justifyContent: 'center',
                    padding: '8px',
                    textAlign: 'center',
                    flex: 1,
                    height: '114px',
                    position: 'relative',
                    background: '#fafafa',
                    cursor: 'pointer',
                  }}
                  className="hover:bg-gray-100 transition-colors group"
                  title="Bấm để chọn sản phẩm so sánh"
                >
                  <svg
                    className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <p style={{ margin: 0, color: '#71717a' }}>Chọn sản phẩm so sánh</p>
                </div>
              );
            })}
          </div>

          {/* Action Box */}
          <div
            style={{
              borderRadius: '8px',
              color: '#18181b',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              justifyContent: 'center',
              padding: '12px 8px',
              width: '240px',
              height: '114px',
              flexShrink: 0,
            }}
          >
            <p
              id="compareCountText"
              style={{ fontSize: '14px', margin: 0, fontWeight: 500 }}
            >
              Đã chọn {compareItems.length} sản phẩm
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setIsDockCollapsed(true);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  border: '0.8px solid #cfcfd3',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  justifyContent: 'center',
                  padding: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  color: '#18181b',
                  transition: 'all 0.3s',
                }}
              >
                Thu gọn
              </button>
              <button
                id="globalSubmitBtn"
                type="button"
                onClick={goToCompare}
                disabled={!canCompare}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  justifyContent: 'center',
                  padding: '8px',
                  backgroundColor: canCompare ? '#DD2627' : '#e5e7eb',
                  color: canCompare ? '#fff' : '#9ca3af',
                  border: 'none',
                  cursor: canCompare ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s',
                }}
              >
                So sánh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Compare Collapsed Bubble (Image 1 & product_detail.php:1596) ── */}
      <div
        id="compareCollapsedBubble"
        onClick={() => setIsDockCollapsed(false)}
        className="fixed bottom-6 left-6 z-[100] cursor-pointer hover:scale-105"
        style={{
          backgroundColor: '#fff',
          borderRadius: '30px',
          boxShadow: '0px 0px 15px 0px #999',
          padding: '10px 16px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          transform: hasItems && isDockCollapsed ? 'scale(1)' : 'scale(0)',
          opacity: hasItems && isDockCollapsed ? 1 : 0,
          pointerEvents: hasItems && isDockCollapsed ? 'auto' : 'none',
          transition: 'all 0.6s ease-in-out',
        }}
        title="Nhấn để mở thanh so sánh"
      >
        <p style={{ color: '#18181b', fontSize: '12px', margin: 0, fontWeight: 500 }}>
          So sánh
        </p>
        <label
          id="compareBubbleCount"
          style={{
            color: '#d90018',
            fontSize: '14px',
            margin: 0,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          ({compareItems.length})
        </label>
      </div>
    </>
  );
};

export default CompareDock;
