import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  RefreshCw,
  Search,
  AlertCircle,
  Trash2,
  Edit3,
  Shield,
  UserCheck,
  Warehouse,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ROLE_OPTIONS = [
  { value: 1, label: 'Quản trị viên (Admin)' },
  { value: 2, label: 'Khách hàng' },
  { value: 3, label: 'Nhân viên Kho' },
];

const ROLE_SELECT_STYLE = {
  1: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100/70',
  2: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100/70',
  3: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70',
};

const ROLE_AVATAR_STYLE = {
  1: 'from-purple-500 to-indigo-600',
  2: 'from-sky-500 to-violet-600',
  3: 'from-amber-500 to-orange-600',
};

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [updatingRoleId, setUpdatingRoleId] = useState(null);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Thống kê số lượng theo vai trò (1: Admin, 2: Customer, 3: Nhân viên Kho)
  const stats = useMemo(() => {
    let adminCount = 0;
    let warehouseCount = 0;
    let customerCount = 0;

    users.forEach((u) => {
      const role = Number(u.MaVaiTro);
      if (role === 1) adminCount++;
      else if (role === 3) warehouseCount++;
      else customerCount++;
    });

    return {
      total: users.length,
      adminCount,
      warehouseCount,
      customerCount,
    };
  }, [users]);

  // Đổi vai trò nhanh trong bảng -> Gọi PUT /api/v1/admin/users/:id/role
  const handleRoleChange = async (targetUser, nextRoleValue) => {
    const newRoleId = Number(nextRoleValue);
    const currentRoleId = Number(targetUser.MaVaiTro);
    if (!newRoleId || newRoleId === currentRoleId) return;

    const isSelf =
      currentUser &&
      Number(currentUser.MaNguoiDung) === Number(targetUser.MaNguoiDung);

    if (isSelf && newRoleId !== 1) {
      toast.error('Không thể tự hạ quyền tài khoản Admin đang đăng nhập', {
        id: 'self-role-err',
      });
      return;
    }

    setUpdatingRoleId(targetUser.MaNguoiDung);
    try {
      const res = await api.put(`/admin/users/${targetUser.MaNguoiDung}/role`, {
        maVaiTro: newRoleId,
      });

      const updatedData = res.data?.data;
      const roleLabel =
        ROLE_OPTIONS.find((r) => r.value === newRoleId)?.label ||
        updatedData?.TenVaiTro ||
        '';

      setUsers((prev) =>
        prev.map((u) =>
          Number(u.MaNguoiDung) === Number(targetUser.MaNguoiDung)
            ? {
                ...u,
                MaVaiTro: newRoleId,
                TenVaiTro: updatedData?.TenVaiTro || roleLabel,
              }
            : u
        )
      );

      toast.success(
        res.data?.message ||
          `Đã cập nhật vai trò tài khoản "${targetUser.TaiKhoan}" thành ${roleLabel}`,
        { id: `user-role-${targetUser.MaNguoiDung}` }
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Không thể cập nhật vai trò người dùng',
        { id: `user-role-err-${targetUser.MaNguoiDung}` }
      );
    } finally {
      setUpdatingRoleId(null);
    }
  };

  // Delete User
  const handleDeleteUser = async (u) => {
    if (
      currentUser &&
      Number(currentUser.MaNguoiDung) === Number(u.MaNguoiDung)
    ) {
      toast.error('Bạn không thể tự xóa tài khoản của chính mình', {
        id: 'self-delete-err',
      });
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa tài khoản "${u.TaiKhoan}" (#${u.MaNguoiDung})?`
      )
    ) {
      return;
    }

    try {
      const res = await api.delete(`/admin/users/${u.MaNguoiDung}`);
      toast.success(res.data?.message || 'Xóa tài khoản thành công', {
        id: `user-delete-${u.MaNguoiDung}`,
      });
      fetchUsers();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Không thể xóa tài khoản này',
        { id: `user-delete-err-${u.MaNguoiDung}` }
      );
    }
  };

  // Filter list
  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();
    return users.filter((u) => {
      const matchSearch =
        !keyword ||
        (u.TaiKhoan || '').toLowerCase().includes(keyword) ||
        (u.Email || '').toLowerCase().includes(keyword) ||
        (u.SoDienThoai || '').includes(searchTerm.trim());

      const role = Number(u.MaVaiTro);
      const matchRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'ADMIN' && role === 1) ||
        (roleFilter === 'WAREHOUSE' && role === 3) ||
        (roleFilter === 'USER' && role === 2);

      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* ── Top Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-sky-600" />
            Quản lý Người Dùng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tra cứu danh sách thành viên, cập nhật thông tin và gán vai trò Admin / Nhân viên Kho / Khách hàng
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchUsers}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loading ? 'animate-spin text-sky-600' : ''
              }`}
            />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 4 Card Thống Kê Người Dùng (Tông sáng) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng người dùng */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng người dùng
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {stats.total}
            </h3>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Tài khoản đã đăng ký
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Quản trị viên */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Quản trị viên (Admin)
            </p>
            <h3 className="text-2xl font-bold text-purple-600 mt-1">
              {stats.adminCount}
            </h3>
            <span className="text-[11px] text-purple-500 font-medium mt-0.5 block">
              Toàn quyền phê duyệt
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Nhân viên Kho */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Nhân viên Kho
            </p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              {stats.warehouseCount}
            </h3>
            <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">
              Quản lý xuất nhập &amp; kiểm định
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Warehouse className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Khách hàng */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Khách hàng (User)
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {stats.customerCount}
            </h3>
            <span className="text-[11px] text-emerald-500 font-medium mt-0.5 block">
              Người mua hàng tiêu dùng
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar (Tông sáng) ── */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="flex-1 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 ml-1 shrink-0" />
          <input
            type="text"
            placeholder="Tìm kiếm theo Tài khoản, Email hoặc Số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none text-slate-800 text-sm focus:outline-none placeholder-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Xóa
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">
            Lọc vai trò:
          </span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="ALL">Tất cả vai trò ({users.length})</option>
            <option value="ADMIN">Quản trị viên ({stats.adminCount})</option>
            <option value="WAREHOUSE">
              Nhân viên Kho ({stats.warehouseCount})
            </option>
            <option value="USER">Khách hàng ({stats.customerCount})</option>
          </select>
        </div>
      </div>

      {/* ── Table Section (Tông sáng) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-slate-700 font-medium">{error}</p>
            <button
              type="button"
              onClick={fetchUsers}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
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
                  <th className="px-6 py-4">Tài khoản</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Số điện thoại</th>
                  <th className="px-6 py-4 text-center w-56">Vai trò</th>
                  <th className="px-6 py-4 text-center w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 text-center">
                        <div className="h-4 bg-slate-200 rounded w-6 mx-auto" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-slate-200 rounded w-28" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-slate-200 rounded w-40" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-slate-200 rounded w-28" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-8 bg-slate-200 rounded-xl w-40 mx-auto" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-4 bg-slate-200 rounded w-16 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-14 text-center text-slate-400"
                    >
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="text-slate-500 font-medium">
                        {searchTerm || roleFilter !== 'ALL'
                          ? 'Không tìm thấy người dùng phù hợp với bộ lọc'
                          : 'Chưa có người dùng nào trong hệ thống'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, index) => {
                    const roleNum = Number(u.MaVaiTro) || 2;
                    const isSelf =
                      currentUser &&
                      Number(currentUser.MaNguoiDung) === Number(u.MaNguoiDung);
                    const isUpdatingRole =
                      Number(updatingRoleId) === Number(u.MaNguoiDung);
                    const selectStyle =
                      ROLE_SELECT_STYLE[roleNum] ||
                      'bg-slate-100 text-slate-700 border-slate-200';
                    const avatarGradient =
                      ROLE_AVATAR_STYLE[roleNum] || 'from-sky-500 to-violet-600';

                    return (
                      <tr
                        key={u.MaNguoiDung}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* STT */}
                        <td className="px-6 py-4 text-center font-medium text-slate-400 text-xs">
                          {index + 1}
                        </td>

                        {/* Tài khoản */}
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm`}
                            >
                              {(u.TaiKhoan?.[0] || 'U').toUpperCase()}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="hover:text-sky-600 transition-colors">
                                {u.TaiKhoan}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded font-bold">
                                  Bạn
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4 text-slate-600 font-medium text-xs">
                          {u.Email}
                        </td>

                        {/* Số điện thoại */}
                        <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                          {u.SoDienThoai || (
                            <span className="text-slate-300 italic">
                              Chưa có
                            </span>
                          )}
                        </td>

                        {/* Vai trò — Dropdown đổi vai trò nhanh (PUT /api/v1/admin/users/:id/role) */}
                        <td className="px-6 py-4 text-center">
                          <div className="relative inline-block w-48">
                            <select
                              aria-label={`Vai trò của ${u.TaiKhoan}`}
                              value={roleNum}
                              disabled={isSelf || isUpdatingRole}
                              onChange={(e) =>
                                handleRoleChange(u, e.target.value)
                              }
                              title={
                                isSelf
                                  ? 'Không thể tự thay đổi vai trò của tài khoản đang đăng nhập'
                                  : 'Chọn vai trò cho tài khoản'
                              }
                              className={`w-full appearance-none pl-3 pr-8 py-2 min-h-[38px] rounded-xl border text-xs font-semibold text-left transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${selectStyle} ${
                                isSelf || isUpdatingRole
                                  ? 'opacity-65 cursor-not-allowed'
                                  : 'cursor-pointer shadow-2xs'
                              }`}
                            >
                              {ROLE_OPTIONS.map((opt) => (
                                <option
                                  key={opt.value}
                                  value={opt.value}
                                  className="bg-white text-slate-800 font-normal"
                                >
                                  {opt.label}
                                </option>
                              ))}
                            </select>

                            {isUpdatingRole ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/75 rounded-xl">
                                <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                              </div>
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            )}
                          </div>
                        </td>

                        {/* Thao tác */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/admin/users/${u.MaNguoiDung}/edit`)
                              }
                              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                              title="Sửa thông tin / phân quyền"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              disabled={isSelf}
                              className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors ${
                                isSelf
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                              }`}
                              title={
                                isSelf
                                  ? 'Không thể xóa tài khoản của chính mình'
                                  : 'Xóa tài khoản'
                              }
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

export default AdminUsersPage;
