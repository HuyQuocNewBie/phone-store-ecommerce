import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Search, Trash2, X, ArrowRight, Loader2, Package, Sparkles } from 'lucide-react';

/**
 * SearchDropdown Component
 * 
 * Hiển thị dropdown gợi ý khi người dùng tìm kiếm:
 * - Khi chưa gõ: Hiển thị Lịch sử từ khóa tìm kiếm (localStorage).
 * - Khi gõ từ khóa: Hiển thị kết quả gợi ý API (/api/v1/search/suggest).
 */
const SearchDropdown = ({
  isOpen,
  onClose,
  searchTerm,
  history = [],
  suggestions = [],
  loading = false,
  onSelectKeyword,
  onRemoveHistoryItem,
  onClearAllHistory
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const formatVND = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price || 0);
  };

  const handleProductClick = (product) => {
    // Lưu từ khóa tìm kiếm vào lịch sử và chuyển hướng đến trang chi tiết sản phẩm
    onSelectKeyword(product.TenSanPham, product.MaSanPham);
    navigate(`/products/${product.MaSanPham}`);
    onClose();
  };

  const isSearchEmpty = searchTerm.trim() === '';

  return (
    <div
      className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ── Case 1: Chưa nhập từ khóa -> Hiển thị Lịch sử từ khóa ── */}
      {isSearchEmpty ? (
        <div className="p-4">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <History className="w-4 h-4 text-sky-400" />
              <span>Lịch sử tìm kiếm</span>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearAllHistory}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa tất cả</span>
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              <p>Chưa có lịch sử tìm kiếm nào</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
              {history.map((keyword, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-sky-500/10 border border-slate-700/60 hover:border-sky-500/40 rounded-xl text-xs text-slate-200 hover:text-sky-300 transition-all cursor-pointer"
                  onClick={() => onSelectKeyword(keyword)}
                >
                  <History className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0" />
                  <span className="font-medium truncate max-w-[180px]">{keyword}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveHistoryItem(keyword);
                    }}
                    className="p-0.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 rounded-md transition-colors ml-0.5"
                    title="Xóa từ khóa này"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Case 2: Đã nhập từ khóa -> Gợi ý tìm kiếm API ── */
        <div className="p-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 px-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Gợi ý sản phẩm ({suggestions.length})</span>
            </div>
            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-sky-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tìm...</span>
              </div>
            )}
          </div>

          {loading && suggestions.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400 mx-auto" />
              <p className="text-xs text-slate-400">Đang tìm sản phẩm phù hợp...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-8 text-center px-4 space-y-2">
              <Package className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                Không tìm thấy sản phẩm nào khớp với từ khóa <strong className="text-slate-200">"{searchTerm}"</strong>
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {suggestions.map((item) => (
                <div
                  key={item.MaSanPham}
                  onClick={() => handleProductClick(item)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 transition-all cursor-pointer group border border-transparent hover:border-slate-700/50"
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center p-1">
                    {item.Anh ? (
                      <img
                        src={item.Anh}
                        alt={item.TenSanPham}
                        className="w-full h-full object-cover rounded-md group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Package className="w-5 h-5 text-slate-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-100 group-hover:text-sky-400 transition-colors truncate">
                      {item.TenSanPham}
                    </h4>
                    <p className="text-xs font-bold text-sky-400 mt-0.5">
                      {formatVND(item.Gia)}
                    </p>
                  </div>

                  <div className="text-slate-600 group-hover:text-sky-400 transition-colors p-1.5">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Search Action */}
          <div className="mt-2 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => onSelectKeyword(searchTerm)}
              className="w-full py-2 px-3 bg-slate-800/50 hover:bg-slate-800 text-sky-400 hover:text-sky-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Xem tất cả kết quả cho "{searchTerm}"</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchDropdown;
