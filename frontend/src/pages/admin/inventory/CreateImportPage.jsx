import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  PackagePlus,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Building2,
  FileText,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Boxes
} from 'lucide-react';
import api from '../../../services/api';

// Helper format tiền tệ VND
const formatVND = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const CreateImportPage = () => {
  const navigate = useNavigate();

  // Data Sources State
  const [manufacturers, setManufacturers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [importItems, setImportItems] = useState([
    { MaSanPham: '', SoLuongNhap: 1, DonGiaNhap: 0 }
  ]);

  // UI / Action State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // 1. Fetch initial data (Manufacturers & Products stock list)
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    setFormError(null);
    try {
      const [manuRes, prodRes] = await Promise.all([
        api.get('/admin/manufacturers'),
        api.get('/admin/inventory/stock-list')
      ]);

      const manuList = manuRes.data.data || [];
      const prodList = prodRes.data.data || [];

      setManufacturers(manuList);
      setProducts(prodList);

      // Pre-select first product if available
      if (prodList.length > 0) {
        setImportItems([{ MaSanPham: String(prodList[0].MaSanPham), SoLuongNhap: 1, DonGiaNhap: 0 }]);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu khởi tạo:', err);
      const errorMsg = err.response?.data?.message || 'Không thể tải danh sách nhà sản xuất và sản phẩm';
      setFormError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Identify duplicate product selections across rows
  const duplicateProductIds = useMemo(() => {
    const counts = {};
    const duplicates = new Set();
    importItems.forEach((item) => {
      const id = String(item.MaSanPham);
      if (id) {
        counts[id] = (counts[id] || 0) + 1;
        if (counts[id] > 1) {
          duplicates.add(id);
        }
      }
    });
    return duplicates;
  }, [importItems]);

  // Get map of products for quick lookup
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(String(p.MaSanPham), p));
    return map;
  }, [products]);

  // 3. Row handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...importItems];
    updated[index] = { ...updated[index], [field]: value };
    setImportItems(updated);
    if (formError) setFormError(null);
  };

  const handleAddRow = () => {
    // Find first product that isn't selected yet, or default to first product
    const selectedIds = new Set(importItems.map((item) => String(item.MaSanPham)));
    const unusedProduct = products.find((p) => !selectedIds.has(String(p.MaSanPham)));
    const defaultProduct = unusedProduct ? String(unusedProduct.MaSanPham) : (products[0]?.MaSanPham ? String(products[0].MaSanPham) : '');

    setImportItems((prev) => [
      ...prev,
      { MaSanPham: defaultProduct, SoLuongNhap: 1, DonGiaNhap: 0 }
    ]);
  };

  const handleRemoveRow = (index) => {
    if (importItems.length === 1) return;
    setImportItems((prev) => prev.filter((_, i) => i !== index));
  };

  // 4. Calculate total sum
  const grandTotal = useMemo(() => {
    return importItems.reduce((sum, item) => {
      const qty = Number(item.SoLuongNhap) || 0;
      const price = Number(item.DonGiaNhap) || 0;
      return sum + (qty > 0 && price > 0 ? qty * price : 0);
    }, 0);
  }, [importItems]);

  // 5. Submit Handler with validation & double-submission prevention
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submit

    setFormError(null);

    // Rule 1: Must have at least 1 item
    if (!importItems || importItems.length === 0) {
      const msg = 'Vui lòng thêm ít nhất 1 sản phẩm vào phiếu nhập!';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // Rule 2: Check for duplicates
    if (duplicateProductIds.size > 0) {
      const duplicateNames = Array.from(duplicateProductIds)
        .map((id) => productMap.get(id)?.TenSanPham || `#${id}`)
        .join(', ');
      const msg = `Sản phẩm [${duplicateNames}] bị lặp lại ở nhiều dòng, vui lòng gộp số lượng!`;
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // Rule 3: Validate each line item
    for (let i = 0; i < importItems.length; i++) {
      const item = importItems[i];
      if (!item.MaSanPham) {
        const msg = `Vui lòng chọn sản phẩm ở dòng thứ ${i + 1}`;
        setFormError(msg);
        toast.error(msg);
        return;
      }
      if (isNaN(Number(item.SoLuongNhap)) || Number(item.SoLuongNhap) <= 0) {
        const msg = `Số lượng nhập ở dòng thứ ${i + 1} phải lớn hơn 0`;
        setFormError(msg);
        toast.error(msg);
        return;
      }
      if (isNaN(Number(item.DonGiaNhap)) || Number(item.DonGiaNhap) <= 0) {
        const msg = `Đơn giá nhập ở dòng thứ ${i + 1} phải lớn hơn 0 (VNĐ)`;
        setFormError(msg);
        toast.error(msg);
        return;
      }
    }

    // Construct Payload matching backend schema exactly
    const payload = {
      MaNhaSanXuat: selectedManufacturer ? Number(selectedManufacturer) : null,
      GhiChu: ghiChu.trim() || null,
      ChiTietPhieuNhap: importItems.map((item) => ({
        MaSanPham: Number(item.MaSanPham),
        SoLuongNhap: Number(item.SoLuongNhap),
        DonGiaNhap: Number(item.DonGiaNhap)
      }))
    };

    setIsSubmitting(true);

    const importPromise = (async () => {
      const res = await api.post('/admin/inventory/import', payload);
      return res.data;
    })();

    toast.promise(
      importPromise,
      {
        loading: 'Đang lưu phiếu nhập kho...',
        success: (data) => data.message || 'Tạo phiếu nhập kho thành công!',
        error: (err) => err.response?.data?.message || 'Không thể tạo phiếu nhập kho. Vui lòng thử lại!'
      },
      { id: 'create-import-toast' }
    );

    try {
      await importPromise;
      // On success, redirect back to inventory list
      navigate('/admin/inventory');
    } catch (err) {
      console.error('Lỗi khi submit phiếu nhập kho:', err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo phiếu nhập kho';
      setFormError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto max-w-7xl mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/inventory')}
            className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-all shadow-sm"
            title="Quay lại danh sách tồn kho"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">Lập Phiếu Nhập Kho Mới</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Nhập kho
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Nhập chi tiết danh sách sản phẩm, số lượng và đơn giá để cộng dồn vào kho hàng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/inventory')}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/80 text-xs font-semibold transition-all disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || loadingData}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <PackagePlus className="w-4 h-4" />
                <span>Xác nhận Nhập Kho</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Global Form Error Alert ── */}
      {formError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-medium flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
          <button
            onClick={() => setFormError(null)}
            className="text-xs text-rose-400 hover:text-rose-200 underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* ── Duplicate Warning Banner ── */}
      {duplicateProductIds.size > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs font-medium flex items-center gap-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="font-semibold text-amber-200">Cảnh báo trùng sản phẩm:</p>
            <p className="text-amber-300/90 mt-0.5">
              Phát hiện sản phẩm được chọn trùng lặp ở nhiều dòng. Vui lòng kiểm tra và gộp số lượng trước khi xác nhận.
            </p>
          </div>
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {loadingData ? (
        <div className="space-y-6">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 h-36 animate-pulse" />
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 h-72 animate-pulse" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Card 1: Thông tin chung ── */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-sm">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              Thông tin chung phiếu nhập
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Dropdown Nhà sản xuất */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Nhà sản xuất / Nhà cung cấp <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedManufacturer}
                    onChange={(e) => setSelectedManufacturer(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">-- Chọn Nhà sản xuất --</option>
                    {manufacturers.map((nsx) => (
                      <option key={nsx.MaNhaSanXuat} value={nsx.MaNhaSanXuat}>
                        {nsx.TenNhaSanXuat} {nsx.QuocGia ? `(${nsx.QuocGia})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>

              {/* Ghi chú nhập kho */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Ghi chú nhập kho
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ví dụ: Nhập lô hàng iPhone 15 đợt 1 tháng 9/2026..."
                    value={ghiChu}
                    onChange={(e) => setGhiChu(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder-slate-500"
                  />
                  <FileText className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-500" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 2: Bảng chi tiết sản phẩm nhập ── */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-violet-400" />
                  Danh sách sản phẩm nhập kho
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Chọn sản phẩm, nhập số lượng và đơn giá tương ứng
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 hover:border-sky-500/40 text-xs font-semibold transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Thêm dòng sản phẩm
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="w-full overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/60">
              <table className="w-full text-left text-slate-200 border-collapse">
                <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">#</th>
                    <th className="px-4 py-3.5 min-w-[280px]">Sản phẩm nhập</th>
                    <th className="px-4 py-3.5 w-36 text-center">Số lượng</th>
                    <th className="px-4 py-3.5 w-48 text-right">Đơn giá nhập (₫)</th>
                    <th className="px-4 py-3.5 w-52 text-right">Thành tiền (₫)</th>
                    <th className="px-4 py-3.5 w-16 text-center">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-700/40 text-sm">
                  {importItems.map((item, index) => {
                    const selectedProd = productMap.get(String(item.MaSanPham));
                    const isDuplicate = duplicateProductIds.has(String(item.MaSanPham));
                    const rowQty = Number(item.SoLuongNhap) || 0;
                    const rowPrice = Number(item.DonGiaNhap) || 0;
                    const rowSubtotal = rowQty > 0 && rowPrice > 0 ? rowQty * rowPrice : 0;

                    return (
                      <tr
                        key={index}
                        className={`transition-colors hover:bg-slate-800/40 ${
                          isDuplicate ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        {/* STT */}
                        <td className="px-4 py-3.5 text-center font-medium text-slate-400">
                          {index + 1}
                        </td>

                        {/* Chọn Sản phẩm */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-1">
                            <select
                              value={item.MaSanPham}
                              onChange={(e) => handleItemChange(index, 'MaSanPham', e.target.value)}
                              className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none transition-all ${
                                isDuplicate
                                  ? 'border-amber-500/80 text-amber-200 focus:border-amber-400'
                                  : 'border-slate-700 focus:border-sky-500'
                              }`}
                            >
                              <option value="">-- Chọn sản phẩm --</option>
                              {products.map((sp) => (
                                <option key={sp.MaSanPham} value={sp.MaSanPham}>
                                  #{sp.MaSanPham} - {sp.TenSanPham} (Tồn hiện tại: {sp.TonKho})
                                </option>
                              ))}
                            </select>

                            {selectedProd && (
                              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                                <span>Tồn hiện tại: <strong className="text-slate-200">{selectedProd.TonKho}</strong></span>
                                {isDuplicate && (
                                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Bị trùng
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Số lượng nhập */}
                        <td className="px-4 py-3.5">
                          <input
                            type="number"
                            min="1"
                            value={item.SoLuongNhap}
                            onChange={(e) => handleItemChange(index, 'SoLuongNhap', e.target.value)}
                            className="w-full text-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-medium text-xs focus:outline-none focus:border-sky-500"
                            placeholder="Số lượng"
                          />
                        </td>

                        {/* Đơn giá nhập */}
                        <td className="px-4 py-3.5">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={item.DonGiaNhap}
                            onChange={(e) => handleItemChange(index, 'DonGiaNhap', e.target.value)}
                            className="w-full text-right bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-medium text-xs focus:outline-none focus:border-sky-500"
                            placeholder="0"
                          />
                        </td>

                        {/* Thành tiền tự động */}
                        <td className="px-4 py-3.5 text-right font-semibold text-emerald-400">
                          {formatVND(rowSubtotal)}
                        </td>

                        {/* Nút xóa dòng */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            disabled={importItems.length === 1}
                            className="p-2 min-w-[38px] min-h-[38px] inline-flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg disabled:opacity-20 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                            title={importItems.length === 1 ? 'Phải giữ lại ít nhất 1 dòng' : 'Xóa dòng này'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Summary & Grand Total Banner ── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-700/60 rounded-2xl shadow-inner">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    Tổng số lượng mặt hàng
                  </div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5">
                    {importItems.length} loại sản phẩm ({importItems.reduce((acc, cur) => acc + (Number(cur.SoLuongNhap) || 0), 0)} đơn vị)
                  </div>
                </div>
              </div>

              <div className="text-right w-full sm:w-auto">
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Tổng tiền phiếu nhập kho
                </div>
                <div className="text-2xl font-extrabold text-emerald-400 tracking-tight mt-0.5">
                  {formatVND(grandTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom Actions ── */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/admin/inventory')}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loadingData}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang khởi tạo phiếu nhập...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận Nhập Kho</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateImportPage;
