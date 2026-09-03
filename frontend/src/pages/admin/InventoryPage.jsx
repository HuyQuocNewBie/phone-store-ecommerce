import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Boxes, Plus, RefreshCw, Search, AlertCircle, CheckCircle2, X, Trash2, PackagePlus
} from 'lucide-react';
import api from '../../services/api';

// ── Helper format tiền tệ VND ──
const formatVND = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// ── Badges trạng thái tồn kho ──
const getStatusBadge = (trangThai, tonKho) => {
  if (tonKho >= 5 || trangThai === 'Còn hàng') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Còn hàng
      </span>
    );
  }
  if (tonKho > 0 || trangThai === 'Sắp hết') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Sắp hết
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
      Hết hàng
    </span>
  );
};

const InventoryPage = () => {
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [importItems, setImportItems] = useState([
    { MaSanPham: '', SoLuongNhap: 1, DonGiaNhap: 0 }
  ]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // 1. Lấy danh sách tồn kho
  const fetchStockList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/inventory/stock-list');
      setStockList(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách tồn kho');
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Lấy danh sách Nhà sản xuất cho Modal Dropdown
  const fetchManufacturers = useCallback(async () => {
    try {
      const res = await api.get('/admin/manufacturers');
      setManufacturers(res.data.data || []);
    } catch (err) {
      console.error('Không thể tải danh sách nhà sản xuất:', err);
    }
  }, []);

  useEffect(() => {
    fetchStockList();
    fetchManufacturers();
  }, [fetchStockList, fetchManufacturers]);

  // Handle open modal
  const handleOpenModal = () => {
    setSelectedManufacturer('');
    setGhiChu('');
    setImportItems([{ MaSanPham: stockList[0]?.MaSanPham || '', SoLuongNhap: 1, DonGiaNhap: 0 }]);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Handle change import row
  const handleItemChange = (index, field, value) => {
    const updated = [...importItems];
    updated[index][field] = value;
    setImportItems(updated);
  };

  // Add new import row
  const handleAddRow = () => {
    const firstAvailableSp = stockList[0]?.MaSanPham || '';
    setImportItems((prev) => [...prev, { MaSanPham: firstAvailableSp, SoLuongNhap: 1, DonGiaNhap: 0 }]);
  };

  // Remove import row
  const handleRemoveRow = (index) => {
    if (importItems.length === 1) return;
    setImportItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Import Receipt
  const handleSubmitImport = async (e) => {
    e.preventDefault();
    setModalError(null);

    // Frontend validation
    if (!importItems || importItems.length === 0) {
      setModalError('Vui lòng thêm ít nhất 1 sản phẩm vào phiếu nhập');
      return;
    }

    for (let i = 0; i < importItems.length; i++) {
      const item = importItems[i];
      if (!item.MaSanPham) {
        setModalError(`Vui lòng chọn sản phẩm ở dòng thứ ${i + 1}`);
        return;
      }
      if (!item.SoLuongNhap || Number(item.SoLuongNhap) <= 0) {
        setModalError(`Số lượng nhập ở dòng thứ ${i + 1} phải lớn hơn 0`);
        return;
      }
      if (!item.DonGiaNhap || Number(item.DonGiaNhap) <= 0) {
        setModalError(`Đơn giá nhập ở dòng thứ ${i + 1} phải lớn hơn 0`);
        return;
      }
    }

    const payload = {
      MaNhaSanXuat: selectedManufacturer ? Number(selectedManufacturer) : null,
      GhiChu: ghiChu.trim() || null,
      ChiTietPhieuNhap: importItems.map((item) => ({
        MaSanPham: Number(item.MaSanPham),
        SoLuongNhap: Number(item.SoLuongNhap),
        DonGiaNhap: Number(item.DonGiaNhap)
      }))
    };

    setModalLoading(true);
    const importPromise = (async () => {
      const res = await api.post('/admin/inventory/import', payload);
      return res.data;
    })();

    toast.promise(
      importPromise,
      {
        loading: 'Đang khởi tạo phiếu nhập kho...',
        success: (data) => {
          setIsModalOpen(false);
          fetchStockList();
          return data.message || 'Tạo phiếu nhập kho thành công!';
        },
        error: (err) => {
          const errorMsg = err.response?.data?.message || 'Tạo phiếu nhập kho thất bại';
          setModalError(errorMsg);
          return errorMsg;
        }
      },
      { id: 'inventory-import-toast' }
    );

    try {
      await importPromise;
    } catch (err) {
      console.error('Lỗi khi khởi tạo phiếu nhập kho:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Filtered Stock List
  const filteredStock = stockList.filter((item) =>
    item.TenSanPham?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(item.MaSanPham).includes(searchTerm)
  );

  // Total import sum calculation
  const totalImportSum = importItems.reduce(
    (sum, item) => sum + (Number(item.SoLuongNhap) || 0) * (Number(item.DonGiaNhap) || 0),
    0
  );

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-sky-400" />
            Quản lý Tồn kho
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Theo dõi số lượng tồn kho sản phẩm và khởi tạo phiếu nhập kho
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStockList}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 text-xs font-medium transition-all"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Tạo phiếu nhập kho
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3">
        <Search className="w-5 h-5 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Tìm kiếm theo mã sản phẩm hoặc tên sản phẩm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none text-slate-200 text-sm focus:outline-none placeholder-slate-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-700/50 rounded-lg"
          >
            Xóa tìm kiếm
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
              onClick={fetchStockList}
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
                  <th className="px-6 py-4 w-32">Mã SP</th>
                  <th className="px-6 py-4">Tên SP</th>
                  <th className="px-6 py-4 text-center w-36">Tồn kho</th>
                  <th className="px-6 py-4 text-center w-40">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-6 mx-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-48" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-700/50 rounded w-12 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-6 bg-slate-700/50 rounded-full w-24 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <Boxes className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      {searchTerm ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào trong kho'}
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((item, index) => (
                    <tr key={item.MaSanPham} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-semibold text-sky-400">
                        #{item.MaSanPham}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-100">
                        {item.TenSanPham}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-200">
                        {item.TonKho}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(item.TrangThaiTonKho, item.TonKho)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tạo Phiếu Nhập Kho */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900/50">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
                <PackagePlus className="w-5 h-5 text-sky-400" />
                Tạo phiếu nhập kho
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitImport} className="flex-1 overflow-y-auto p-6 space-y-5">
              {modalError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Nhà sản xuất & Ghi chú */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nhà sản xuất (Tùy chọn)
                  </label>
                  <select
                    value={selectedManufacturer}
                    onChange={(e) => setSelectedManufacturer(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Chọn Nhà sản xuất --</option>
                    {manufacturers.map((nsx) => (
                      <option key={nsx.MaNhaSanXuat} value={nsx.MaNhaSanXuat}>
                        {nsx.TenNhaSanXuat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Ghi chú phiếu nhập
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập ghi chú (vd: Nhập lô hàng tháng 8)..."
                    value={ghiChu}
                    onChange={(e) => setGhiChu(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Dynamic Product Detail Rows */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Chi tiết sản phẩm nhập
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold px-2.5 py-1 bg-sky-500/10 rounded-lg hover:bg-sky-500/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm sản phẩm
                  </button>
                </div>

                {importItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-900/70 border border-slate-700/60 p-3.5 rounded-xl"
                  >
                    {/* Chọn Sản phẩm */}
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] text-slate-400 mb-1 font-medium">Sản phẩm</label>
                      <select
                        value={item.MaSanPham}
                        onChange={(e) => handleItemChange(index, 'MaSanPham', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {stockList.map((sp) => (
                          <option key={sp.MaSanPham} value={sp.MaSanPham}>
                            #{sp.MaSanPham} - {sp.TenSanPham} (Tồn hiện tại: {sp.TonKho})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Số lượng nhập */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-slate-400 mb-1 font-medium">Số lượng nhập</label>
                      <input
                        type="number"
                        min="1"
                        value={item.SoLuongNhap}
                        onChange={(e) => handleItemChange(index, 'SoLuongNhap', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    {/* Đơn giá nhập */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-slate-400 mb-1 font-medium">Đơn giá nhập (VNĐ)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={item.DonGiaNhap}
                        onChange={(e) => handleItemChange(index, 'DonGiaNhap', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    {/* Nút xóa dòng */}
                    <div className="sm:col-span-1 flex justify-end items-end pt-3 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        disabled={importItems.length === 1}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                        title="Xóa dòng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Total */}
              <div className="flex items-center justify-between p-4 bg-slate-900/80 border border-slate-700/60 rounded-xl">
                <span className="text-xs font-semibold text-slate-400 uppercase">Tổng tiền nhập kho dự kiến:</span>
                <span className="text-base font-bold text-emerald-400">
                  {formatVND(totalImportSum)}
                </span>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/60">
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
                  Hoàn tất tạo phiếu nhập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
