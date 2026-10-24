import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes, Plus, RefreshCw, Search, AlertCircle
} from 'lucide-react';
import api from '../../../services/api';

// ── Badges trạng thái tồn kho ──
const getStatusBadge = (trangThai, tonKho) => {
  if (tonKho >= 5 || trangThai === 'Còn hàng') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Còn hàng
      </span>
    );
  }
  if (tonKho > 0 || trangThai === 'Sắp hết') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Sắp hết
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      Hết hàng
    </span>
  );
};

const InventoryListPage = () => {
  const navigate = useNavigate();
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Lấy danh sách tồn kho
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

  useEffect(() => {
    fetchStockList();
  }, [fetchStockList]);

  // Filtered Stock List
  const filteredStock = stockList.filter((item) =>
    item.TenSanPham?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(item.MaSanPham).includes(searchTerm)
  );

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">

      {/* ── Action Bar (Top Right) ── */}
      <div className="flex justify-end items-center gap-3">
        <button
          onClick={fetchStockList}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 text-xs font-medium transition-all shadow-sm"
          title="Tải lại danh sách"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
        <button
          onClick={() => navigate('/admin/inventory/import')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 text-white font-semibold text-xs shadow-md shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Tạo phiếu nhập kho
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <Search className="w-5 h-5 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Tìm kiếm theo mã sản phẩm hoặc tên sản phẩm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none text-slate-700 text-sm focus:outline-none placeholder-slate-400"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Xóa tìm kiếm
          </button>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <p className="text-slate-600 font-medium">{error}</p>
            <button
              onClick={fetchStockList}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">STT</th>
                  <th className="px-6 py-4">Tên SP</th>
                  <th className="px-6 py-4 text-center w-36">Tồn kho</th>
                  <th className="px-6 py-4 text-center w-40">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-200 rounded w-6 mx-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-48" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-200 rounded w-12 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-6 bg-slate-200 rounded-full w-24 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      <Boxes className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      {searchTerm ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào trong kho'}
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((item, index) => (
                    <tr key={item.MaSanPham} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {item.TenSanPham}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">
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
    </div>
  );
};

export default InventoryListPage;
