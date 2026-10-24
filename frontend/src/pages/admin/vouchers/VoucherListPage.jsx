import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  TicketPercent, Plus, RefreshCw, Search, AlertCircle, Trash2, Edit3,
  CheckCircle2, PauseCircle, Clock, Sparkles
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
      setVouchers(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách voucher');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Thống kê số lượng chỉ số voucher
  const stats = useMemo(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    let expiredCount = 0;
    const now = new Date();

    vouchers.forEach((v) => {
      const isExpired = new Date(v.NgayHetHan) <= now;
      if (isExpired) {
        expiredCount++;
      } else if (v.TrangThai === 1) {
        activeCount++;
      } else {
        inactiveCount++;
      }
    });

    return {
      total: vouchers.length,
      activeCount,
      inactiveCount,
      expiredCount
    };
  }, [vouchers]);

  // 2. Toggle Status (Công tắc gạt Bật/Tắt)
  const handleToggleStatus = async (voucherId, currentStatus) => {
    setTogglingId(voucherId);
    try {
      const res = await api.patch(`/admin/vouchers/${voucherId}/toggle-status`);
      const newStatus = res.data?.data?.TrangThai !== undefined ? res.data.data.TrangThai : (currentStatus === 1 ? 0 : 1);

      const msg = res.data?.message || `Đã ${newStatus === 1 ? 'Bật' : 'Tắt'} voucher #${voucherId}`;
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
      toast.success(res.data?.message || 'Xóa mã giảm giá thành công', { id: `voucher-delete-${voucherId}` });
      fetchVouchers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa mã giảm giá này', { id: `voucher-delete-err-${voucherId}` });
    }
  };

  // Filter Vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) =>
      (v.Code || '').toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [vouchers, searchTerm]);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">

      {/* ── Top Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <TicketPercent className="w-7 h-7 text-sky-600" />
            Quản lý Mã Giảm Giá
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập khuyến mãi, kiểm soát số lượng phát hành và thời hạn hiệu lực voucher
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchVouchers}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold transition-all shadow-sm"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => navigate('/admin/vouchers/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm voucher</span>
          </button>
        </div>
      </div>

      {/* ── 4 Card Thống Kê Voucher (Tông sáng) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng voucher */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng voucher</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Tất cả chương trình tạo</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <TicketPercent className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Đang hoạt động */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang hoạt động</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.activeCount}</h3>
            <span className="text-[11px] text-emerald-500 font-medium mt-0.5 block">Khách có thể áp dụng</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Tạm tắt / Ẩn */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tạm ẩn</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.inactiveCount}</h3>
            <span className="text-[11px] text-amber-500 font-medium mt-0.5 block">Đang tạm ngưng áp dụng</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <PauseCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Đã hết hạn */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã hết hạn</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{stats.expiredCount}</h3>
            <span className="text-[11px] text-rose-500 font-medium mt-0.5 block">Quá thời hạn hiệu lực</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Search Bar (Tông sáng) ── */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <Search className="w-5 h-5 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          placeholder="Tìm kiếm theo Mã giảm giá (mã code, ví dụ: SUMMER, PHONESTORE)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none text-slate-800 text-sm focus:outline-none placeholder-slate-400"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
          >
            Xóa
          </button>
        )}
      </div>

      {/* ── Table Section (Tông sáng) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-slate-700 font-medium">{error}</p>
            <button
              onClick={fetchVouchers}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
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
                  <th className="px-6 py-4 w-44">Mã Voucher</th>
                  <th className="px-6 py-4 text-right w-44">Giảm giá</th>
                  <th className="px-6 py-4 text-right w-44">Đơn tối thiểu</th>
                  <th className="px-6 py-4 text-center w-32">Số lượng</th>
                  <th className="px-6 py-4 text-center w-48">Ngày hết hạn</th>
                  <th className="px-6 py-4 text-center w-36">Trạng thái</th>
                  <th className="px-6 py-4 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-200 rounded w-6 mx-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-24 ml-auto" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-24 ml-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-200 rounded w-12 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-200 rounded w-32 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-6 bg-slate-200 rounded-full w-12 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-200 rounded w-12 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-14 text-center text-slate-400">
                      <TicketPercent className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="text-slate-500 font-medium">
                        {searchTerm ? 'Không tìm thấy mã giảm giá phù hợp' : 'Chưa có mã giảm giá nào trong hệ thống'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((v, index) => {
                    const isToggling = togglingId === v.MaVoucher;
                    const isExpired = new Date(v.NgayHetHan) <= new Date();

                    return (
                      <tr key={v.MaVoucher} className="hover:bg-slate-50/80 transition-colors">
                        {/* STT */}
                        <td className="px-6 py-4 text-center font-medium text-slate-400 text-xs">
                          {index + 1}
                        </td>

                        {/* Mã Code */}
                        <td className="px-6 py-4">
                          <span className="font-bold text-sky-700 font-mono tracking-wider bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200/80 inline-block shadow-2xs">
                            {v.Code}
                          </span>
                        </td>

                        {/* Mức giảm */}
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">
                          {formatVND(v.GiaTriGiam)}
                        </td>

                        {/* Đơn tối thiểu */}
                        <td className="px-6 py-4 text-right font-medium text-slate-700">
                          {formatVND(v.GiaTriToiThieu)}
                        </td>

                        {/* Số lượng */}
                        <td className="px-6 py-4 text-center font-semibold text-slate-800">
                          {v.SoLuong}
                        </td>

                        {/* Ngày hết hạn */}
                        <td className="px-6 py-4 text-center text-xs font-medium">
                          <span className={isExpired ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                            {formatDateDisplay(v.NgayHetHan)}
                          </span>
                          {isExpired && (
                            <span className="block text-[10px] text-rose-600 font-bold uppercase mt-0.5">
                              (Đã hết hạn)
                            </span>
                          )}
                        </td>

                        {/* Công tắc gạt Toggle Switch (Bật/Tắt) */}
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleStatus(v.MaVoucher, v.TrangThai)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${
                              v.TrangThai === 1 ? 'bg-sky-600' : 'bg-slate-300'
                            } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={v.TrangThai === 1 ? 'Gạt để Tắt' : 'Gạt để Bật'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                v.TrangThai === 1 ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Thao tác */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => navigate(`/admin/vouchers/${v.MaVoucher}/edit`)}
                              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                              title="Sửa mã giảm giá"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVoucher(v.MaVoucher, v.Code)}
                              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
