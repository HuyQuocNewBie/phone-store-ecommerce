import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  TicketPercent, Plus, RefreshCw, Search, AlertCircle, CheckCircle2,
  Trash2, Edit3, X, Calendar, DollarSign, Tag, Layers
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

// ── Helper format Date sang datetime-local input string (YYYY-MM-DDTHH:mm) ──
const toDatetimeLocalInput = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const VoucherListPage = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null); // null = Add, object = Edit
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [giaTriGiam, setGiaTriGiam] = useState('');
  const [loaiGiam, setLoaiGiam] = useState('tien');
  const [giaTriToiThieu, setGiaTriToiThieu] = useState('');
  const [soLuong, setSoLuong] = useState('');
  const [ngayHetHan, setNgayHetHan] = useState('');
  const [trangThai, setTrangThai] = useState(1);

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

  // Open Modal Add
  const handleOpenAddModal = () => {
    setEditingVoucher(null);
    setCode('');
    setGiaTriGiam('');
    setLoaiGiam('tien');
    setGiaTriToiThieu('');
    setSoLuong('');

    // Mặc định ngày hết hạn là 7 ngày sau
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setNgayHetHan(toDatetimeLocalInput(nextWeek));

    setTrangThai(1);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open Modal Edit
  const handleOpenEditModal = (v) => {
    setEditingVoucher(v);
    setCode(v.Code || '');
    setGiaTriGiam(v.GiaTriGiam || '');
    setLoaiGiam(v.LoaiGiam || 'tien');
    setGiaTriToiThieu(v.GiaTriToiThieu || '');
    setSoLuong(v.SoLuong || '');
    setNgayHetHan(toDatetimeLocalInput(v.NgayHetHan));
    setTrangThai(v.TrangThai !== undefined ? v.TrangThai : 1);
    setModalError(null);
    setIsModalOpen(true);
  };

  // 3. Submit Modal (Thêm mới hoặc Chỉnh sửa với Validation chặt chẽ)
  const handleSubmitVoucher = async (e) => {
    e.preventDefault();
    setModalError(null);

    // Validation 1: Code
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setModalError('Mã voucher (Code) không được để trống');
      return;
    }
    if (/\s/.test(trimmedCode)) {
      setModalError('Mã voucher không được chứa khoảng trắng');
      return;
    }
    const formattedCode = trimmedCode.toUpperCase();

    // Validation 2: Giá trị giảm (VND)
    const numGiaTriGiam = Number(giaTriGiam);
    if (!giaTriGiam || isNaN(numGiaTriGiam) || numGiaTriGiam <= 0) {
      setModalError('Giá trị giảm phải là số lớn hơn 0 (tính bằng VNĐ)');
      return;
    }

    // Validation 3: Giá trị tối thiểu
    const numGiaTriToiThieu = Number(giaTriToiThieu);
    if (!giaTriToiThieu || isNaN(numGiaTriToiThieu) || numGiaTriToiThieu <= 0) {
      setModalError('Giá trị đơn hàng tối thiểu phải là số lớn hơn 0');
      return;
    }

    if (numGiaTriGiam > numGiaTriToiThieu) {
      setModalError('Giá trị giảm không được lớn hơn giá trị đơn hàng tối thiểu');
      return;
    }

    // Validation 4: Số lượng
    const numSoLuong = Number(soLuong);
    if (!soLuong || isNaN(numSoLuong) || !Number.isInteger(numSoLuong) || numSoLuong <= 0) {
      setModalError('Số lượng phát hành phải là số nguyên lớn hơn 0');
      return;
    }

    // Validation 5: Ngày hết hạn > hiện tại
    if (!ngayHetHan) {
      setModalError('Ngày hết hạn không được để trống');
      return;
    }
    const expireDateObj = new Date(ngayHetHan);
    if (isNaN(expireDateObj.getTime())) {
      setModalError('Ngày hết hạn không đúng định dạng hợp lệ');
      return;
    }
    if (expireDateObj <= new Date()) {
      setModalError('Ngày hết hạn phải lớn hơn thời điểm hiện tại');
      return;
    }

    // Định dạng ISO Date gửi lên backend
    const apiDateStr = expireDateObj.toISOString();

    const payload = {
      Code: formattedCode,
      GiaTriGiam: numGiaTriGiam,
      LoaiGiam: loaiGiam,
      GiaTriToiThieu: numGiaTriToiThieu,
      SoLuong: numSoLuong,
      NgayHetHan: apiDateStr,
      TrangThai: Number(trangThai)
    };

    setModalLoading(true);
    try {
      if (editingVoucher) {
        const res = await api.put(`/admin/vouchers/${editingVoucher.MaVoucher}`, payload);
        toast.success(res.data.message || 'Cập nhật mã giảm giá thành công', { id: `voucher-edit-${editingVoucher.MaVoucher}` });
      } else {
        const res = await api.post('/admin/vouchers', payload);
        toast.success(res.data.message || 'Thêm mã giảm giá mới thành công', { id: 'voucher-add' });
      }

      setIsModalOpen(false);
      fetchVouchers();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi lưu mã giảm giá';
      setModalError(errorMsg);
      toast.error(errorMsg, { id: 'voucher-save-err' });
    } finally {
      setModalLoading(false);
    }
  };

  // 4. Delete Voucher
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

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <TicketPercent className="w-6 h-6 text-sky-400" />
            Quản lý Voucher (Mã giảm giá)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Quản lý khuyến mãi, cấu hình mức giảm và bật/tắt trạng thái sử dụng
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchVouchers}
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
            Thêm mã mới
          </button>
        </div>
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
          <div className="overflow-x-auto">
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
                        {/* Cột "Giảm giá" tính theo VND */}
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
                              onClick={() => handleOpenEditModal(v)}
                              className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                              title="Sửa mã giảm giá"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVoucher(v.MaVoucher, v.Code)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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

      {/* Modal Thêm mới / Chỉnh sửa Voucher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900/50">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
                <Tag className="w-5 h-5 text-sky-400" />
                {editingVoucher ? `Chỉnh sửa Voucher #${editingVoucher.Code}` : 'Thêm mã giảm giá mới'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSubmitVoucher} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {modalError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mã Voucher (Code) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Vd: SUMMER50, PHONESTORE2026..."
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm font-bold tracking-wider focus:outline-none focus:border-sky-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Viết hoa tự động, tuyệt đối không chứa khoảng trắng</p>
              </div>

              {/* Giá trị giảm & Đơn tối thiểu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Giá trị giảm (VNĐ) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    placeholder="Vd: 50000"
                    value={giaTriGiam}
                    onChange={(e) => setGiaTriGiam(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm font-semibold focus:outline-none focus:border-sky-500"
                  />
                  {giaTriGiam && !isNaN(Number(giaTriGiam)) && Number(giaTriGiam) > 0 && (
                    <p className="text-[11px] text-emerald-400 mt-1 font-medium">{formatVND(Number(giaTriGiam))}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Đơn hàng tối thiểu (VNĐ) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    placeholder="Vd: 200000"
                    value={giaTriToiThieu}
                    onChange={(e) => setGiaTriToiThieu(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm font-semibold focus:outline-none focus:border-sky-500"
                  />
                  {giaTriToiThieu && !isNaN(Number(giaTriToiThieu)) && Number(giaTriToiThieu) > 0 && (
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">{formatVND(Number(giaTriToiThieu))}</p>
                  )}
                </div>
              </div>

              {/* Số lượng & Ngày hết hạn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Số lượng phát hành <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Vd: 100"
                    value={soLuong}
                    onChange={(e) => setSoLuong(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm font-semibold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ngày hết hạn <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={ngayHetHan}
                    onChange={(e) => setNgayHetHan(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs font-semibold focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Trạng thái Bật/Tắt */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Trạng thái mã giảm giá
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="TrangThai"
                      checked={Number(trangThai) === 1}
                      onChange={() => setTrangThai(1)}
                      className="text-sky-500 focus:ring-sky-500"
                    />
                    <span>Bật (Kích hoạt ngay)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="radio"
                      name="TrangThai"
                      checked={Number(trangThai) === 0}
                      onChange={() => setTrangThai(0)}
                      className="text-slate-500 focus:ring-slate-500"
                    />
                    <span>Tắt (Tạm ẩn)</span>
                  </label>
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
                  {editingVoucher ? 'Cập nhật mã' : 'Thêm mã mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherListPage;
