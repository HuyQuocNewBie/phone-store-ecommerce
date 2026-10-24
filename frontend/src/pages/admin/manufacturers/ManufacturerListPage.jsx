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

      {/* ── Action Bar (Top Right) ── */}
      <div className="flex justify-end items-center gap-3">
        <button
          onClick={fetchManufacturers}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 text-xs font-medium transition-all shadow-sm"
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

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <Search className="w-5 h-5 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          placeholder="Tìm kiếm theo Tên, Email, SĐT hoặc Địa chỉ nhà sản xuất..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none text-slate-700 text-sm focus:outline-none placeholder-slate-400"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <p className="text-slate-700 font-medium">{error}</p>
            <button
              onClick={fetchManufacturers}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">STT</th>
                  <th className="px-6 py-4">Tên nhà sản xuất</th>
                  <th className="px-6 py-4">Địa chỉ</th>
                  <th className="px-6 py-4">Số điện thoại</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-100 rounded w-6 mx-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-40" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-100 rounded w-12 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredManufacturers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      {searchTerm ? 'Không tìm thấy nhà sản xuất phù hợp' : 'Chưa có nhà sản xuất nào'}
                    </td>
                  </tr>
                ) : (
                  filteredManufacturers.map((m, index) => (
                    <tr key={m.MaNhaSanXuat} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-sky-500 shrink-0" />
                        <span>{m.TenNhaSanXuat}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {m.DiaChi}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs font-mono font-medium">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {m.SoDienThoai}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {m.Email}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate(`/admin/manufacturers/${m.MaNhaSanXuat}/edit`)}
                            className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg border border-slate-200 hover:border-sky-200 transition-colors cursor-pointer"
                            title="Sửa nhà sản xuất"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteManufacturer(m)}
                            className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
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
