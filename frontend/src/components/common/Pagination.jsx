import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable Pagination component
 * 
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total number of records/items
 * @param {number} itemsPerPage - Number of items displayed per page
 * @param {function} onPageChange - Callback when page changes: (page: number) => void
 * @param {string} [className] - Optional container CSS class name
 */
const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  className = '',
}) => {
  // Tự động ẩn thanh phân trang nếu totalPages <= 1
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  // Tính toán chỉ số bắt đầu và kết thúc
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Tạo mảng số trang hiển thị linh hoạt (có dấu chấm lửng '...')
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Luôn có trang 1
    pages.push(1);

    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      startPage = 2;
      endPage = 4;
    } else if (currentPage >= totalPages - 2) {
      startPage = totalPages - 3;
      endPage = totalPages - 1;
    }

    if (startPage > 2) {
      pages.push('dots-prev');
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages - 1) {
      pages.push('dots-next');
    }

    // Luôn có trang cuối
    pages.push(totalPages);

    return pages;
  };

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange?.(page);
    }
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 sm:px-4 bg-white border-t border-slate-200 select-none ${className}`}
    >
      {/* Thông tin số lượng hiển thị */}
      <div className="text-sm text-slate-600">
        Hiển thị <span className="font-semibold text-slate-900">{startItem}</span> -{' '}
        <span className="font-semibold text-slate-900">{endItem}</span> trên tổng số{' '}
        <span className="font-semibold text-blue-600">{totalItems}</span> mục
      </div>

      {/* Các nút điều hướng trang */}
      <div className="flex items-center space-x-1 sm:space-x-1.5">
        {/* Nút Trước (Previous) */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            currentPage === 1
              ? 'text-slate-300 bg-slate-50 border border-slate-200 cursor-not-allowed'
              : 'text-slate-600 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 shadow-sm active:scale-95'
          }`}
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {/* Danh sách các số trang */}
        <div className="flex items-center space-x-1">
          {pageNumbers.map((page, index) => {
            if (page === 'dots-prev' || page === 'dots-next') {
              return (
                <span
                  key={`${page}-${index}`}
                  className="w-9 h-9 flex items-center justify-center text-sm font-medium text-slate-400 select-none"
                >
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => handlePageClick(page)}
                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 scale-100 ring-2 ring-blue-600 ring-offset-1'
                    : 'text-slate-600 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 active:scale-95'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Nút Sau (Next) */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            currentPage === totalPages
              ? 'text-slate-300 bg-slate-50 border border-slate-200 cursor-not-allowed'
              : 'text-slate-600 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 shadow-sm active:scale-95'
          }`}
          title="Trang sau"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
