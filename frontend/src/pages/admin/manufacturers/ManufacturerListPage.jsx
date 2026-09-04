import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Building2, Plus, RefreshCw, Search, AlertCircle,
  Trash2, Edit3, Phone, Mail, MapPin
} from 'lucide-react';
import api from '../../../services/api';

const ManufacturerListPage = () => {
  const navigate = useNavigate();
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Manufacturers
  const fetchManufacturers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/manufacturers');
      setManufacturers(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách nhà sản xuất');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManufacturers();
  }, [fetchManufacturers]);

  // Delete Manufacturer
  const handleDeleteManufacturer = async (m) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhà sản xuất "${m.TenNhaSanXuat}" (#${m.MaNhaSanXuat})?`)) {
      return;
    }

    try {
      const res = await api.delete(`/admin/manufacturers/${m.MaNhaSanXuat}`);
      toast.success(res.data?.message || 'Xóa nhà sản xuất thành công', { id: `mfg-delete-${m.MaNhaSanXuat}` });
      fetchManufacturers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa nhà sản xuất này', { id: `mfg-delete-err-${m.MaNhaSanXuat}` });
    }
  };

  // Filter list
  const filteredManufacturers = manufacturers.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      (m.TenNhaSanXuat || '').toLowerCase().includes(term) ||
      (m.Email || '').toLowerCase().includes(term) ||
      (m.SoDienThoai || '').includes(term) ||
      (m.DiaChi || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-400" />
            Quản lý Nhà sản xuất
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Quản lý thông tin thương hiệu, đối tác và nhà cung cấp sản phẩm
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchManufacturers}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={() => navigate('/admin/manufacturers/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Thêm nhà sản xuất
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3">
        <Search className="w-5 h-5 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Tìm kiếm theo Tên, Email, SĐT hoặc Địa chỉ nhà sản xuất..."
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
              onClick={fetchManufacturers}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-200">
              <thead className="bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">STT</th>
                  <th className="px-6 py-4 w-28 text-center">Mã NSX</th>
                  <th className="px-6 py-4">Tên nhà sản xuất</th>
                  <th className="px-6 py-4">Địa chỉ</th>
                  <th className="px-6 py-4">Số điện thoại</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-6 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-10 mx-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-40" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-24" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-32" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-12 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredManufacturers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      {searchTerm ? 'Không tìm thấy nhà sản xuất phù hợp' : 'Chưa có nhà sản xuất nào'}
                    </td>
                  </tr>
                ) : (
                  filteredManufacturers.map((m, index) => (
                    <tr key={m.MaNhaSanXuat} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-slate-400 text-xs">
                        #{m.MaNhaSanXuat}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-100 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>{m.TenNhaSanXuat}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          {m.DiaChi}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-xs font-mono font-medium">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          {m.SoDienThoai}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          {m.Email}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate(`/admin/manufacturers/${m.MaNhaSanXuat}/edit`)}
                            className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Sửa nhà sản xuất"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteManufacturer(m)}
                            className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Xóa nhà sản xuất"
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
    </div>
  );
};

export default ManufacturerListPage;
