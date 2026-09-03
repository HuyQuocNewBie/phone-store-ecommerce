import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Users, RefreshCw, Search, AlertCircle, CheckCircle2,
  Trash2, Edit3, X, Shield, UserCheck, Mail, Phone, MapPin
} from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const UserListPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form Fields
  const [taiKhoan, setTaiKhoan] = useState('');
  const [email, setEmail] = useState('');
  const [maVaiTro, setMaVaiTro] = useState(2);
  const [soDienThoai, setSoDienThoai] = useState('');
  const [diaChi, setDiaChi] = useState('');

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open Edit Modal
  const handleOpenEditModal = async (u) => {
    setEditingUser(u);
    setTaiKhoan(u.TaiKhoan || '');
    setEmail(u.Email || '');
    setMaVaiTro(u.MaVaiTro || 2);
    setSoDienThoai('');
    setDiaChi('');
    setModalError(null);

    // Lấy chi tiết thông tin bổ sung nếu có (SĐT, Địa chỉ)
    try {
      const res = await api.get(`/admin/users/${u.MaNguoiDung}`);
      if (res.data.data) {
        setSoDienThoai(res.data.data.SoDienThoai || '');
        setDiaChi(res.data.data.DiaChi || '');
      }
    } catch (err) {
      // Bỏ qua nếu lỗi chi tiết, dùng thông tin cơ bản
    }

    setIsModalOpen(true);
  };

  // Submit Edit Form
  const handleSubmitUser = async (e) => {
    e.preventDefault();
    setModalError(null);

    const trimmedTaiKhoan = taiKhoan.trim();
    if (!trimmedTaiKhoan) {
      setModalError('Tài khoản không được để trống');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setModalError('Email không được để trống');
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setModalError('Email không đúng định dạng');
      return;
    }

    const payload = {
      TaiKhoan: trimmedTaiKhoan,
      Email: trimmedEmail,
      MaVaiTro: Number(maVaiTro),
      SoDienThoai: soDienThoai.trim(),
      DiaChi: diaChi.trim(),
    };

    setModalLoading(true);
    try {
      const res = await api.put(`/admin/users/${editingUser.MaNguoiDung}`, payload);
      toast.success(res.data.message || 'Cập nhật người dùng thành công', { id: `user-edit-${editingUser.MaNguoiDung}` });
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi khi cập nhật người dùng';
      setModalError(msg);
      toast.error(msg, { id: 'user-save-err' });
    } finally {
      setModalLoading(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (u) => {
    if (currentUser && Number(currentUser.MaNguoiDung) === Number(u.MaNguoiDung)) {
      toast.error('Bạn không thể tự xóa tài khoản của chính mình', { id: 'self-delete-err' });
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${u.TaiKhoan}" (#${u.MaNguoiDung})?`)) {
      return;
    }

    try {
      const res = await api.delete(`/admin/users/${u.MaNguoiDung}`);
      toast.success(res.data.message || 'Xóa tài khoản thành công', { id: `user-delete-${u.MaNguoiDung}` });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa tài khoản này', { id: `user-delete-err-${u.MaNguoiDung}` });
    }
  };

  // Filter list
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      (u.TaiKhoan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.Email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'ADMIN' && u.MaVaiTro === 1) ||
      (roleFilter === 'USER' && u.MaVaiTro === 2);

    return matchSearch && matchRole;
  });

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" />
            Quản lý Người dùng
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Quản lý tài khoản khách hàng, quản trị viên và phân quyền truy cập hệ thống
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3">
        <div className="flex-1 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="Tìm kiếm theo Tài khoản hoặc Email..."
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

        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-700/50 pt-2 sm:pt-0 sm:pl-3">
          <span className="text-xs text-slate-400 whitespace-nowrap">Vai trò:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên (Admin)</option>
            <option value="USER">Khách hàng (User)</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        {error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <p className="text-slate-300 font-medium">{error}</p>
            <button
              onClick={fetchUsers}
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
                  <th className="px-6 py-4 w-28 text-center">Mã ND</th>
                  <th className="px-6 py-4">Tài khoản</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4 text-center w-40">Vai trò</th>
                  <th className="px-6 py-4 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-6 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-10 mx-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-28" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-40" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-6 bg-slate-700/50 rounded-full w-24 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-12 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      {searchTerm || roleFilter !== 'ALL'
                        ? 'Không tìm thấy người dùng phù hợp với bộ lọc'
                        : 'Chưa có người dùng nào'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, index) => {
                    const isAdmin = u.MaVaiTro === 1;
                    const isSelf = currentUser && Number(currentUser.MaNguoiDung) === Number(u.MaNguoiDung);

                    return (
                      <tr key={u.MaNguoiDung} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-6 py-4 text-center font-medium text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-slate-400 text-xs">
                          #{u.MaNguoiDung}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-100 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {(u.TaiKhoan?.[0] || 'U').toUpperCase()}
                          </div>
                          <span>{u.TaiKhoan}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded font-medium">
                              Tôi
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-medium text-xs">
                          {u.Email}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/30">
                              <Shield className="w-3.5 h-3.5" />
                              {u.TenVaiTro || 'Quản trị viên'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                              <UserCheck className="w-3.5 h-3.5" />
                              {u.TenVaiTro || 'Khách hàng'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                              title="Sửa thông tin / phân quyền"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSelf
                                  ? 'text-slate-600 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                              }`}
                              title={isSelf ? 'Không thể xóa tài khoản của chính mình' : 'Xóa tài khoản'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Chỉnh sửa thông tin / Phân quyền Người dùng */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900/50">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
                <Users className="w-5 h-5 text-sky-400" />
                Chỉnh sửa tài khoản #{editingUser.MaNguoiDung}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSubmitUser} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {modalError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Tài khoản & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tên tài khoản <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={taiKhoan}
                    onChange={(e) => setTaiKhoan(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm font-semibold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm font-semibold focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Phân quyền Vai trò */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phân quyền Vai trò <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      Number(maVaiTro) === 1
                        ? 'bg-violet-500/15 border-violet-500/50 text-violet-300'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="MaVaiTro"
                      checked={Number(maVaiTro) === 1}
                      onChange={() => setMaVaiTro(1)}
                      className="text-violet-500 focus:ring-violet-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-100">Quản trị viên</span>
                      <span className="block text-[10px] opacity-70">Quyền truy cập Admin Panel</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      Number(maVaiTro) === 2
                        ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="MaVaiTro"
                      checked={Number(maVaiTro) === 2}
                      onChange={() => setMaVaiTro(2)}
                      className="text-sky-500 focus:ring-sky-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-100">Khách hàng</span>
                      <span className="block text-[10px] opacity-70">Người dùng mua hàng</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Thông tin bổ sung */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-700/40">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="Vd: 0987654321"
                    value={soDienThoai}
                    onChange={(e) => setSoDienThoai(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Địa chỉ</label>
                  <input
                    type="text"
                    placeholder="Vd: 123 Nguyễn Trãi, Hà Nội"
                    value={diaChi}
                    onChange={(e) => setDiaChi(e.target.value)}
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
                  Cập nhật thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListPage;
