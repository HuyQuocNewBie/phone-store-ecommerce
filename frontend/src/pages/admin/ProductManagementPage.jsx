import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Edit3, Trash2, AlertTriangle, RefreshCw, Package, Image as ImageIcon, CheckCircle2, AlertCircle, X } from 'lucide-react';
import api from '../../services/api';

/**
 * ProductManagementPage
 * Trang Quản lý Sản phẩm dành cho Admin.
 */
const ProductManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ─── State Management ────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pop-up Xác nhận Xóa State
  const [deleteTarget, setDeleteTarget] = useState(null); // Product object to delete
  const [isDeleting, setIsDeleting] = useState(false);

  // Alert / Toast Notification State
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

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

  // ─── Lấy Toast thông báo từ location.state (sau khi lưu từ ProductFormPage) ─
  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast);
      // Toast State Cleansing: Dọn dẹp location.state để tránh bị lặp lại Toast khi người dùng F5 refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Tự động tắt Toast thông báo sau 4 giây
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ─── Format Giá VNĐ ──────────────────────────────────────────────────────────
  const formatVND = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price || 0);
  };

  // ─── Lọc danh sách theo tìm kiếm ─────────────────────────────────────────────
  const filteredProducts = products.filter((p) =>
    p.TenSanPham?.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

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
        setToast({
          type: 'success',
          message: `Đã xóa sản phẩm "${deleteTarget.TenSanPham}" thành công!`
        });
        setDeleteTarget(null);
        fetchProducts();
      }
    } catch (err) {
      console.error('Lỗi khi xóa sản phẩm:', err);
      const errorMsg =
        err.response?.data?.message ||
        'Không thể xóa sản phẩm do đã có trong đơn hàng (ràng buộc chi tiết đơn hàng)';

      setToast({
        type: 'error',
        message: errorMsg
      });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Toast Notification Banner ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md animate-in slide-in-from-top-3 duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <p className="text-sm font-medium pr-2">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors ml-auto text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-sky-400" />
            Quản lý Sản phẩm
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Quản lý danh sách sản phẩm, giá bán, tồn kho và các thông số kỹ thuật động (Dynamic Specs)
          </p>
        </div>

        {/* Nút Thêm Sản Phẩm (Điều hướng đến trang /admin/products/create) */}
        <button
          id="btn-add-product"
          onClick={() => navigate('/admin/products/create')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm sản phẩm</span>
        </button>
      </div>

      {/* ── Search Bar & Stats Header ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Box */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sản phẩm theo tên..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 self-end md:self-auto">
          <span>Tổng số: <strong className="text-sky-400">{filteredProducts.length}</strong> sản phẩm</span>
          <button
            onClick={fetchProducts}
            className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Bảng Danh Sách Sản Phẩm ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
            <p className="text-sm font-medium">Đang tải danh sách sản phẩm...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4 space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
            <p className="text-slate-300 font-medium text-sm">{error}</p>
            <button
              onClick={fetchProducts}
              className="px-4 py-2 bg-slate-800 border border-slate-700 text-sky-400 hover:bg-slate-750 text-xs font-semibold rounded-xl transition-all"
            >
              Thử lại
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4 space-y-3">
            <Package className="w-12 h-12 text-slate-700" />
            <p className="text-slate-400 font-medium text-sm">
              {searchQuery ? `Không tìm thấy sản phẩm nào khớp với "${searchQuery}"` : 'Chưa có sản phẩm nào trong hệ thống.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-4 w-16 text-center">STT</th>
                  <th className="py-4 px-4 w-20 text-center">Ảnh</th>
                  <th className="py-4 px-6">Tên sản phẩm</th>
                  <th className="py-4 px-6 text-right">Giá bán</th>
                  <th className="py-4 px-6 text-center">Tồn kho</th>
                  <th className="py-4 px-6 text-center w-36">Hành động</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                {filteredProducts.map((item, index) => (
                  <tr
                    key={item.MaSanPham}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* STT */}
                    <td className="py-4 px-4 text-center font-medium text-slate-500 text-xs">
                      {item.STT || index + 1}
                    </td>

                    {/* Ảnh đại diện */}
                    <td className="py-4 px-4 text-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden mx-auto flex items-center justify-center relative shadow-inner">
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
                          className={`w-full h-full items-center justify-center text-slate-600 ${
                            item.Anh ? 'hidden' : 'flex'
                          }`}
                        >
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      </div>
                    </td>

                    {/* Tên Sản Phẩm */}
                    <td className="py-4 px-6 font-semibold text-slate-100 group-hover:text-sky-400 transition-colors">
                      <div>
                        <span>{item.TenSanPham}</span>
                        <p className="text-[11px] font-normal text-slate-500">Mã SP: #{item.MaSanPham}</p>
                      </div>
                    </td>

                    {/* Giá */}
                    <td className="py-4 px-6 text-right font-bold text-sky-400 whitespace-nowrap">
                      {formatVND(item.Gia)}
                    </td>

                    {/* Tồn Kho */}
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        item.TonKho > 10
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : item.TonKho > 0
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {item.TonKho > 0 ? `${item.TonKho} cái` : 'Hết hàng'}
                      </span>
                    </td>

                    {/* Hành động (Sửa, Xóa) */}
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {/* Nút Sửa (Điều hướng tới /admin/products/edit/:id) */}
                        <button
                          onClick={() => navigate(`/admin/products/edit/${item.MaSanPham}`)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-sky-500/20 text-slate-400 hover:text-sky-400 border border-slate-700/80 hover:border-sky-500/30 transition-all"
                          title="Sửa sản phẩm"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Nút Xóa */}
                        <button
                          onClick={() => confirmDelete(item)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/30 transition-all"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Confirmation Xóa Sản phẩm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Xác nhận xóa sản phẩm</h3>
                <p className="text-xs text-slate-400">Thao tác này không thể hoàn tác</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-300">
              Bạn có chắc chắn muốn xóa sản phẩm <strong className="text-rose-400">"{deleteTarget.TenSanPham}"</strong> (Mã SP: #{deleteTarget.MaSanPham}) không?
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
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

export default ProductManagementPage;
