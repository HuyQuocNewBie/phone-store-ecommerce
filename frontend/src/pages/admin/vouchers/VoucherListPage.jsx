import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  TicketPercent, Plus, RefreshCw, Search, AlertCircle, Trash2, Edit3
} from 'lucide-react';
import api from '../../../services/api';

// ── Helper format VNĐ ──
const formatVND = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// ── Helper format Date cho hiển thị (dd/mm/yyyy HH:mm) ──
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const VoucherListPage = () => {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  // 1. Fetch Vouchers
  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/vouchers');
      setVouchers(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách voucher');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // 2. Toggle Status (Công tắc gạt Bật/Tắt)
  const handleToggleStatus = async (voucherId, currentStatus) => {
    setTogglingId(voucherId);
    try {
      const res = await api.patch(`/admin/vouchers/${voucherId}/toggle-status`);
      const newStatus = res.data.data?.TrangThai !== undefined ? res.data.data.TrangThai : (currentStatus === 1 ? 0 : 1);

      const msg = res.data.message || `Đã ${newStatus === 1 ? 'Bật' : 'Tắt'} voucher #${voucherId}`;
      toast.success(msg, { id: `voucher-toggle-${voucherId}` });

      setVouchers((prev) =>
        prev.map((v) => (v.MaVoucher === voucherId ? { ...v, TrangThai: newStatus } : v))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể đổi trạng thái voucher', {
        id: `voucher-toggle-${voucherId}`
      });
    } finally {
      setTogglingId(null);
    }
  };

  // 3. Delete Voucher
  const handleDeleteVoucher = async (voucherId, voucherCode) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã giảm giá "${voucherCode}"?`)) return;

    try {
      const res = await api.delete(`/admin/vouchers/${voucherId}`);
      toast.success(res.data.message || 'Xóa mã giảm giá thành công', { id: `voucher-delete-${voucherId}` });
      fetchVouchers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa mã giảm giá này', { id: `voucher-delete-err-${voucherId}` });
    }
  };

  // Filter Vouchers
  const filteredVouchers = vouchers.filter((v) =>
    (v.Code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">

      {/* ── Action Bar (Top Right) ── */}
      <div className="flex justify-end items-center gap-3">
        <button
          onClick={fetchVouchers}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 text-xs font-medium transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
        <button
          onClick={() => navigate('/admin/vouchers/new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Thêm mã giảm giá
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3">
        <Search className="w-5 h-5 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Tìm kiếm theo Mã giảm giá (mã code)..."
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
              onClick={fetchVouchers}
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
                  <th className="px-6 py-4 w-36">Mã Voucher</th>
                  <th className="px-6 py-4 text-right w-44">Giảm giá</th>
                  <th className="px-6 py-4 text-right w-44">Đơn tối thiểu</th>
                  <th className="px-6 py-4 text-center w-32">Số lượng</th>
                  <th className="px-6 py-4 text-center w-48">Ngày hết hạn</th>
                  <th className="px-6 py-4 text-center w-36">Trạng thái</th>
                  <th className="px-6 py-4 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-6 mx-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-20" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-700/50 rounded w-24 ml-auto" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-700/50 rounded w-24 ml-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-12 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-32 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-6 bg-slate-700/50 rounded-full w-12 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-12 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      <TicketPercent className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      {searchTerm ? 'Không tìm thấy mã giảm giá phù hợp' : 'Chưa có mã giảm giá nào'}
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((v, index) => {
                    const isToggling = togglingId === v.MaVoucher;
                    const isExpired = new Date(v.NgayHetHan) <= new Date();

                    return (
                      <tr key={v.MaVoucher} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-6 py-4 text-center font-medium text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 font-bold text-amber-400 tracking-wider">
                          {v.Code}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-400">
                          {formatVND(v.GiaTriGiam)}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-300">
                          {formatVND(v.GiaTriToiThieu)}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-slate-200">
                          {v.SoLuong}
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium">
                          <span className={isExpired ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                            {formatDateDisplay(v.NgayHetHan)}
                          </span>
                          {isExpired && (
                            <span className="block text-[10px] text-rose-500 font-bold uppercase mt-0.5">
                              (Đã hết hạn)
                            </span>
                          )}
                        </td>

                        {/* Cột "Trạng thái" dạng Công tắc gạt Toggle Switch (Bật/Tắt) */}
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleStatus(v.MaVoucher, v.TrangThai)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              v.TrangThai === 1 ? 'bg-sky-500' : 'bg-slate-700'
                            } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={v.TrangThai === 1 ? 'Gạt để Tắt' : 'Gạt để Bật'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                v.TrangThai === 1 ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Thao tác Edit/Delete */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => navigate(`/admin/vouchers/${v.MaVoucher}/edit`)}
                              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Sửa mã giảm giá"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVoucher(v.MaVoucher, v.Code)}
                              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Xóa mã giảm giá"
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

export default VoucherListPage;
