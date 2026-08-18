import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, RefreshCw, Search, AlertCircle, CheckCircle2,
  Trash2, Edit3, X, Phone, Mail, MapPin
} from 'lucide-react';
import api from '../../services/api';

const PHONE_REGEX = /^0\d{9}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const ManufacturerManagementPage = () => {
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState(null); // null = Add, object = Edit
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form Fields
  const [tenNhaSanXuat, setTenNhaSanXuat] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [soDienThoai, setSoDienThoai] = useState('');
  const [email, setEmail] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Manufacturers
  const fetchManufacturers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/manufacturers');
      setManufacturers(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách nhà sản xuất');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManufacturers();
  }, [fetchManufacturers]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingManufacturer(null);
    setTenNhaSanXuat('');
    setDiaChi('');
    setSoDienThoai('');
    setEmail('');
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (m) => {
    setEditingManufacturer(m);
    setTenNhaSanXuat(m.TenNhaSanXuat || '');
    setDiaChi(m.DiaChi || '');
    setSoDienThoai(m.SoDienThoai || '');
    setEmail(m.Email || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  // Submit Form (Add / Edit)
  const handleSubmitManufacturer = async (e) => {
    e.preventDefault();
    setModalError(null);

    const trimmedTen = tenNhaSanXuat.trim();
    if (!trimmedTen) {
      setModalError('Tên nhà sản xuất không được để trống');
      return;
    }

    const trimmedDiaChi = diaChi.trim();
    if (!trimmedDiaChi) {
      setModalError('Địa chỉ nhà sản xuất không được để trống');
      return;
    }

    const trimmedPhone = soDienThoai.trim();
    if (!trimmedPhone) {
      setModalError('Số điện thoại không được để trống');
      return;
    }
    if (!PHONE_REGEX.test(trimmedPhone)) {
      setModalError('Số điện thoại không hợp lệ (phải đủ 10 chữ số và bắt đầu bằng số 0)');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setModalError('Email không được để trống');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setModalError('Email không đúng định dạng hợp lệ');
      return;
    }

    const payload = {
      TenNhaSanXuat: trimmedTen,
      DiaChi: trimmedDiaChi,
      SoDienThoai: trimmedPhone,
      Email: trimmedEmail,
    };

    setModalLoading(true);
    try {
      if (editingManufacturer) {
        const res = await api.put(`/admin/manufacturers/${editingManufacturer.MaNhaSanXuat}`, payload);
        showToast(res.data.message || 'Cập nhật nhà sản xuất thành công');
      } else {
        const res = await api.post('/admin/manufacturers', payload);
        showToast(res.data.message || 'Thêm nhà sản xuất thành công');
      }

      setIsModalOpen(false);
      fetchManufacturers();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Lỗi khi lưu nhà sản xuất');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Manufacturer
  const handleDeleteManufacturer = async (m) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhà sản xuất "${m.TenNhaSanXuat}" (#${m.MaNhaSanXuat})?`)) {
      return;
    }

    try {
      const res = await api.delete(`/admin/manufacturers/${m.MaNhaSanXuat}`);
      showToast(res.data.message || 'Xóa nhà sản xuất thành công');
      fetchManufacturers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể xóa nhà sản xuất này', 'error');
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
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
              : 'bg-slate-800 text-rose-400 border-rose-500/40'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

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
            onClick={handleOpenAddModal}
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
          <div className="overflow-x-auto">
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
                            onClick={() => handleOpenEditModal(m)}
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                            title="Sửa nhà sản xuất"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteManufacturer(m)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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

      {/* Modal Thêm mới / Chỉnh sửa Nhà sản xuất */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900/50">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
                <Building2 className="w-5 h-5 text-sky-400" />
                {editingManufacturer ? `Chỉnh sửa NSX #${editingManufacturer.MaNhaSanXuat}` : 'Thêm nhà sản xuất mới'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSubmitManufacturer} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {modalError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Tên nhà sản xuất */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tên nhà sản xuất <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Vd: Apple, Samsung, Xiaomi..."
                  value={tenNhaSanXuat}
                  onChange={(e) => setTenNhaSanXuat(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm font-semibold focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Địa chỉ trụ sở / văn phòng <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Vd: Cupertino, California, Mỹ"
                  value={diaChi}
                  onChange={(e) => setDiaChi(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Số điện thoại & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Số điện thoại <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Vd: 0912345678"
                    value={soDienThoai}
                    onChange={(e) => setSoDienThoai(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Đủ 10 chữ số, bắt đầu bằng số 0</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email liên hệ <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Vd: contact@apple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
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
                  {editingManufacturer ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManufacturerManagementPage;
