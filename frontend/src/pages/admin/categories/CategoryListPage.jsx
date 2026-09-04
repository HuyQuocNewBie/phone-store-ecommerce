import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Tag, Plus, RefreshCw, Search, AlertCircle,
  Trash2, Edit3, X, FolderTree, Check, Sparkles
} from 'lucide-react';
import api from '../../../services/api';

const CategoryListPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Slide-over Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null = Add, object = Edit
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState(null);

  // Form Field
  const [tenLoaiSanPham, setTenLoaiSanPham] = useState('');

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/categories');
      setCategories(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách loại sản phẩm');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Keyboard shortcut listener (Escape key to close drawer)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        handleCloseDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Open Add Drawer
  const handleOpenAddDrawer = () => {
    setEditingCategory(null);
    setTenLoaiSanPham('');
    setDrawerError(null);
    setIsDrawerOpen(true);
  };

  // Open Edit Drawer
  const handleOpenEditDrawer = (cat) => {
    setEditingCategory(cat);
    setTenLoaiSanPham(cat.TenLoaiSanPham || '');
    setDrawerError(null);
    setIsDrawerOpen(true);
  };

  // Close Drawer
  const handleCloseDrawer = () => {
    if (drawerLoading) return;
    setIsDrawerOpen(false);
  };

  // Submit Drawer Form (Add / Edit)
  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    setDrawerError(null);

    const trimmedName = tenLoaiSanPham.trim();
    if (!trimmedName) {
      setDrawerError('Tên loại sản phẩm không được để trống');
      return;
    }

    setDrawerLoading(true);
    try {
      if (editingCategory) {
        const res = await api.put(`/admin/categories/${editingCategory.MaLoaiSanPham}`, {
          TenLoaiSanPham: trimmedName,
        });
        toast.success(res.data?.message || 'Cập nhật loại sản phẩm thành công', { id: `cat-edit-${editingCategory.MaLoaiSanPham}` });
      } else {
        const res = await api.post('/admin/categories', {
          TenLoaiSanPham: trimmedName,
        });
        toast.success(res.data?.message || 'Thêm loại sản phẩm thành công', { id: 'cat-add' });
      }

      setIsDrawerOpen(false);
      fetchCategories();
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi khi lưu loại sản phẩm';
      setDrawerError(msg);
      toast.error(msg, { id: 'cat-save-err' });
    } finally {
      setDrawerLoading(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${cat.TenLoaiSanPham}" (#${cat.MaLoaiSanPham})?`)) {
      return;
    }

    try {
      const res = await api.delete(`/admin/categories/${cat.MaLoaiSanPham}`);
      toast.success(res.data?.message || 'Xóa loại sản phẩm thành công', { id: `cat-delete-${cat.MaLoaiSanPham}` });
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa loại sản phẩm này', { id: `cat-delete-err-${cat.MaLoaiSanPham}` });
    }
  };

  // Filter list
  const filteredCategories = categories.filter((c) =>
    (c.TenLoaiSanPham || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto relative">

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Tag className="w-6 h-6 text-sky-400" />
            Quản lý Danh mục (Loại sản phẩm)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cấu hình các nhóm phân loại sản phẩm hiển thị trên hệ thống cửa hàng
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCategories}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={handleOpenAddDrawer}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Thêm danh mục
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3">
        <Search className="w-5 h-5 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Tìm kiếm theo Tên loại sản phẩm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none text-slate-200 text-sm focus:outline-none placeholder-slate-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-700/50 rounded-lg"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        {error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <p className="text-slate-300 font-medium">{error}</p>
            <button
              onClick={fetchCategories}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-200">
              <thead className="bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">STT</th>
                  <th className="px-6 py-4 w-28 text-center">Mã loại</th>
                  <th className="px-6 py-4">Tên loại sản phẩm</th>
                  <th className="px-6 py-4 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-6 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-10 mx-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-48" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-12 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      <FolderTree className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      {searchTerm ? 'Không tìm thấy loại sản phẩm phù hợp' : 'Chưa có loại sản phẩm nào'}
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((c, index) => (
                    <tr key={c.MaLoaiSanPham} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-slate-400 text-xs">
                        #{c.MaLoaiSanPham}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-100 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>{c.TenLoaiSanPham}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditDrawer(c)}
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                            title="Sửa tên loại sản phẩm"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Xóa loại sản phẩm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Slide-over Drawer (Panel trượt từ bên phải) ── */}
      {/* Backdrop */}
      <div
        onClick={handleCloseDrawer}
        className={`fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Right Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {editingCategory ? `Chỉnh sửa danh mục #${editingCategory.MaLoaiSanPham}` : 'Thêm danh mục mới'}
              </h2>
              <p className="text-xs text-slate-400">
                {editingCategory ? 'Cập nhật thông tin tên phân loại sản phẩm' : 'Nhập tên loại sản phẩm muốn tạo trong cửa hàng'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseDrawer}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            title="Đóng panel (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <form onSubmit={handleSubmitCategory} className="flex-1 p-6 space-y-6 overflow-y-auto">
          {drawerError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{drawerError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tên loại sản phẩm / Danh mục <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Tag className="w-4 h-4 text-sky-400" />
                </div>
                <input
                  type="text"
                  autoFocus
                  placeholder="Vd: Điện thoại, Tablet, Phụ kiện, Âm thanh..."
                  value={tenLoaiSanPham}
                  onChange={(e) => {
                    setTenLoaiSanPham(e.target.value);
                    if (drawerError) setDrawerError(null);
                  }}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl text-slate-100 text-sm font-semibold placeholder-slate-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs space-y-2">
              <div className="flex items-center gap-2 font-medium text-slate-300">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Gợi ý đặt tên:</span>
              </div>
              <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
                <li>Đặt tên rõ ràng, dễ hiểu cho người mua (vd: Smartwatch, Tai nghe).</li>
                <li>Không chứa ký tự đặc biệt không hợp lệ.</li>
              </ul>
            </div>
          </div>

          {/* Hidden Submit Button to allow Enter key submission */}
          <button type="submit" className="hidden" />
        </form>

        {/* Drawer Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/90 backdrop-blur flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCloseDrawer}
            disabled={drawerLoading}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSubmitCategory}
            disabled={drawerLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-500/20 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {drawerLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{editingCategory ? 'Cập nhật danh mục' : 'Tạo danh mục'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryListPage;
