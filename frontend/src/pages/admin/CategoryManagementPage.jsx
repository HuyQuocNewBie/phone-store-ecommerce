import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Tag, Plus, RefreshCw, Search, AlertCircle, CheckCircle2,
  Trash2, Edit3, X, FolderTree
} from 'lucide-react';
import api from '../../services/api';

const CategoryManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null = Add, object = Edit
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form Field
  const [tenLoaiSanPham, setTenLoaiSanPham] = useState('');

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/categories');
      setCategories(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách loại sản phẩm');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setTenLoaiSanPham('');
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setTenLoaiSanPham(cat.TenLoaiSanPham || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  // Submit Modal Form (Add / Edit)
  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    setModalError(null);

    const trimmedName = tenLoaiSanPham.trim();
    if (!trimmedName) {
      setModalError('Tên loại sản phẩm không được để trống');
      return;
    }

    setModalLoading(true);
    try {
      if (editingCategory) {
        const res = await api.put(`/admin/categories/${editingCategory.MaLoaiSanPham}`, {
          TenLoaiSanPham: trimmedName,
        });
        toast.success(res.data.message || 'Cập nhật loại sản phẩm thành công', { id: `cat-edit-${editingCategory.MaLoaiSanPham}` });
      } else {
        const res = await api.post('/admin/categories', {
          TenLoaiSanPham: trimmedName,
        });
        toast.success(res.data.message || 'Thêm loại sản phẩm thành công', { id: 'cat-add' });
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi khi lưu loại sản phẩm';
      setModalError(msg);
      toast.error(msg, { id: 'cat-save-err' });
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${cat.TenLoaiSanPham}" (#${cat.MaLoaiSanPham})?`)) {
      return;
    }

    try {
      const res = await api.delete(`/admin/categories/${cat.MaLoaiSanPham}`);
      toast.success(res.data.message || 'Xóa loại sản phẩm thành công', { id: `cat-delete-${cat.MaLoaiSanPham}` });
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
    <div className="flex-1 p-6 space-y-6 overflow-auto">

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Tag className="w-6 h-6 text-sky-400" />
            Quản lý Danh mục (Loại sản phẩm)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cấu hình phân loại sản phẩm trong cửa hàng
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
            onClick={handleOpenAddModal}
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
                            onClick={() => handleOpenEditModal(c)}
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

      {/* Modal Thêm mới / Chỉnh sửa Loại sản phẩm */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900/50">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
                <Tag className="w-5 h-5 text-sky-400" />
                {editingCategory ? `Chỉnh sửa loại #${editingCategory.MaLoaiSanPham}` : 'Thêm loại sản phẩm mới'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSubmitCategory} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tên loại sản phẩm <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Vd: Điện thoại, Tablet, Phụ kiện..."
                  value={tenLoaiSanPham}
                  onChange={(e) => setTenLoaiSanPham(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm font-semibold focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 text-xs font-semibold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 text-white font-semibold text-xs shadow-lg hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {modalLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingCategory ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagementPage;
