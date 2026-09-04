import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users, RefreshCw, Search, AlertCircle,
  Trash2, Edit3, Shield, UserCheck
} from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const UserListPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

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

      {/* ── Action Bar (Top Right) ── */}
      <div className="flex justify-end">
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 text-xs font-medium transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
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
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-200">
              <thead className="bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">STT</th>
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
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-28" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-40" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-6 bg-slate-700/50 rounded-full w-24 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-12 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
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
                              onClick={() => navigate(`/admin/users/${u.MaNguoiDung}/edit`)}
                              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Sửa thông tin / phân quyền"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={isSelf}
                              className={`p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg transition-colors ${
                                isSelf
                                  ? 'text-slate-600 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer'
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
    </div>
  );
};

export default UserListPage;
