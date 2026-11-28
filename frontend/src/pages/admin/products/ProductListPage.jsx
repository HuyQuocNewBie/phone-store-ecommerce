import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Package,
  Image as ImageIcon,
  X
} from 'lucide-react';
import api from '../../../services/api';
import Pagination from '../../../components/common/Pagination';

/**
 * ProductListPage
 * Trang Quản lý Sản phẩm dành cho Admin - Light Theme (Mô hình Biến thể SKU).
 */
const ProductListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ─── State Management ────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Pop-up Xác nhận Xóa State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Lấy danh sách sản phẩm từ API ──────────────────────────────────────────
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/products');
      if (res.data?.success) {
        setProducts(res.data.data || []);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Lỗi khi lấy danh sách sản phẩm:', err);
      setError(err.response?.data?.message || 'Không thể tải danh sách sản phẩm. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ─── Lấy Toast thông báo từ location.state ───────────────────────────────────
  useEffect(() => {
    if (location.state?.toast) {
      const { type, message } = location.state.toast;
      if (type === 'success') {
        toast.success(message, { id: 'product-nav-toast' });
      } else {
        toast.error(message, { id: 'product-nav-toast' });
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const formatVND = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price || 0);
  };

  const getDisplayVariants = (item) => {
    const all = Array.isArray(item.variants) ? item.variants : [];
    const active = all.filter((v) => (v.TrangThai || v.trangThai) !== 'NgungBan');
    return active.length > 0 ? active : all;
  };

  const getAggregatedStock = (item) => {
    const list = getDisplayVariants(item);
    if (list.length > 0) {
      return list.reduce((sum, v) => sum + (Number(v.TonKho ?? v.tonKho) || 0), 0);
    }
    return Number(item.TonKho) || 0;
  };

  const getPriceRange = (item) => {
    const list = getDisplayVariants(item);
    const prices = list
      .map((v) => Number(v.GiaBan ?? v.giaBan) || 0)
      .filter((p) => p > 0);
    if (prices.length === 0) {
      const fallback = Number(item.Gia) || 0;
      return { min: fallback, max: fallback };
    }
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  };

  const formatVariantName = (variant) => {
    const mauSac = variant.MauSac ?? variant.mauSac;
    const dungLuong = variant.DungLuong ?? variant.dungLuong;
    const parts = [mauSac, dungLuong]
      .map((s) => (s !== undefined && s !== null ? String(s).trim() : ''))
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' - ');
    return variant.MaSKU || variant.maSKU || 'Mặc định';
  };

  // ─── Lọc danh sách theo tìm kiếm (Tên SP, Màu, Dung lượng, SKU) ─────────────
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => {
      if (p.TenSanPham?.toLowerCase().includes(q)) return true;
      const variants = Array.isArray(p.variants) ? p.variants : [];
      return variants.some((v) => {
        const mau = String(v.MauSac ?? v.mauSac ?? '').toLowerCase();
        const dl = String(v.DungLuong ?? v.dungLuong ?? '').toLowerCase();
        const sku = String(v.MaSKU ?? v.maSKU ?? '').toLowerCase();
        return mau.includes(q) || dl.includes(q) || sku.includes(q);
      });
    });
  }, [products, searchQuery]);

  // Reset về trang 1 khi đổi từ khóa tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // ─── Xử lý Xóa Sản Phẩm ─────────────────────────────────────────────────────
  const confirmDelete = (product) => {
    setDeleteTarget(product);
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      const res = await api.delete(`/admin/products/${deleteTarget.MaSanPham}`);

      if (res.data?.success) {
        toast.success(`Đã xóa sản phẩm "${deleteTarget.TenSanPham}" thành công!`, {
          id: `delete-product-${deleteTarget.MaSanPham}`
        });
        setDeleteTarget(null);
        fetchProducts();
      }
    } catch (err) {
      console.error('Lỗi khi xóa sản phẩm:', err);
      const errorMsg =
        err.response?.data?.message ||
        'Không thể xóa sản phẩm do đã có trong đơn hàng (ràng buộc chi tiết đơn hàng)';

      toast.error(errorMsg, { id: 'delete-product-err' });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Toolbar trên bảng ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        {/* Ô tìm kiếm */}
        <div className="relative w-full sm:w-80 md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên sản phẩm, màu sắc, dung lượng, SKU..."
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Phía BÊN PHẢI */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-slate-500 whitespace-nowrap">
            Tổng số: <strong className="text-sky-600 font-semibold">{filteredProducts.length}</strong> sản phẩm
          </span>

          {/* Nút Làm mới */}
          <button
            onClick={fetchProducts}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Nút Thêm sản phẩm */}
          <button
            id="btn-add-product"
            onClick={() => navigate('/admin/products/create')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Thêm sản phẩm</span>
          </button>
        </div>
      </div>

      {/* ── Bảng Danh Sách Sản Phẩm ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
            <p className="text-sm font-medium">Đang tải danh sách sản phẩm...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4 space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
            <p className="text-slate-600 font-medium text-sm">{error}</p>
            <button
              onClick={fetchProducts}
              className="px-4 py-2 bg-slate-100 border border-slate-200 text-sky-600 hover:bg-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4 space-y-3">
            <Package className="w-12 h-12 text-slate-300" />
            <p className="text-slate-500 font-medium text-sm">
              {searchQuery ? `Không tìm thấy sản phẩm nào khớp với "${searchQuery}"` : 'Chưa có sản phẩm nào trong hệ thống.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-4 w-14 text-center">STT</th>
                  <th className="py-4 px-4 w-20 text-center">Ảnh</th>
                  <th className="py-4 px-5 min-w-[180px]">Tên sản phẩm</th>
                  <th className="py-4 px-5 min-w-[280px]">Biến thể (Màu / Dung lượng) &amp; Tồn kho</th>
                  <th className="py-4 px-5 text-right whitespace-nowrap">Giá bán</th>
                  <th className="py-4 px-5 text-center whitespace-nowrap">Tổng tồn kho</th>
                  <th className="py-4 px-5 text-center w-32">Hành động</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {paginatedProducts.map((item, index) => {
                  const displayVariants = getDisplayVariants(item);
                  const totalStock = getAggregatedStock(item);
                  const priceRange = getPriceRange(item);

                  return (
                    <tr
                      key={item.MaSanPham}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      {/* STT */}
                      <td className="py-4 px-4 text-center font-medium text-slate-400 text-xs">
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>

                      {/* Ảnh đại diện */}
                      <td className="py-4 px-4 text-center">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden mx-auto flex items-center justify-center relative shadow-sm">
                          {item.Anh ? (
                            <img
                              src={item.Anh}
                              alt={item.TenSanPham}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextSibling) {
                                  e.currentTarget.nextSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full items-center justify-center text-slate-400 ${
                              item.Anh ? 'hidden' : 'flex'
                            }`}
                          >
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        </div>
                      </td>

                      {/* Tên Sản Phẩm */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-800 group-hover:text-sky-600 transition-colors">
                          {item.TenSanPham}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Mã SP: #{item.MaSanPham} • {displayVariants.length} biến thể
                        </div>
                      </td>

                      {/* Danh sách Biến thể màu / dung lượng kèm tồn kho riêng */}
                      <td className="py-4 px-5">
                        {displayVariants.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">Chưa cấu hình biến thể</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {displayVariants.map((variant, vIdx) => {
                              const vStock = Number(variant.TonKho ?? variant.tonKho) || 0;
                              const vPrice = Number(variant.GiaBan ?? variant.giaBan) || 0;
                              const vImport = Number(variant.GiaNhapGanNhat ?? variant.giaNhapGanNhat) || 0;
                              const vSku = variant.MaSKU ?? variant.maSKU ?? '';
                              const isLowPrice = vPrice > 0 && vImport > 0 && vPrice <= vImport;

                              return (
                                <div
                                  key={variant.MaBienThe ?? variant.maBienThe ?? vIdx}
                                  title={`SKU: ${vSku || 'N/A'} | Giá bán: ${formatVND(vPrice)} | Giá nhập gần nhất: ${formatVND(vImport)}`}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs bg-white shadow-xs ${
                                    isLowPrice
                                      ? 'border-orange-300 bg-orange-50/40'
                                      : 'border-slate-200'
                                  }`}
                                >
                                  <span className="font-medium text-slate-700">
                                    {formatVariantName(variant)}
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                                      vStock > 10
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : vStock > 0
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-rose-50 text-rose-600'
                                    }`}
                                  >
                                    {vStock}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Giá bán */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="font-bold text-sky-600">
                          {formatVND(priceRange.min)}
                        </div>
                        {priceRange.max > priceRange.min && (
                          <div className="text-[11px] text-slate-400 font-medium">
                            đến {formatVND(priceRange.max)}
                          </div>
                        )}
                      </td>

                      {/* Tổng Tồn Kho cộng dồn */}
                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            totalStock > 10
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : totalStock > 0
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-600 border-rose-200'
                          }`}
                        >
                          {totalStock > 0 ? `${totalStock} cái` : 'Hết hàng'}
                        </span>
                      </td>

                      {/* Hành động */}
                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/admin/products/edit/${item.MaSanPham}`)}
                            className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-sky-50 text-slate-500 hover:text-sky-600 border border-slate-200 hover:border-sky-200 transition-all cursor-pointer"
                            title="Sửa sản phẩm"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => confirmDelete(item)}
                            className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredProducts.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            className="border-t border-slate-200"
          />
        )}
      </div>

      {/* ── Modal Confirmation Xóa Sản phẩm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Xác nhận xóa sản phẩm</h3>
                <p className="text-xs text-slate-500">Thao tác này không thể hoàn tác</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-700">
              Bạn có chắc chắn muốn xóa sản phẩm <strong className="text-rose-500">"{deleteTarget.TenSanPham}"</strong> (Mã SP: #{deleteTarget.MaSanPham}) không?
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Đồng ý Xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductListPage;
