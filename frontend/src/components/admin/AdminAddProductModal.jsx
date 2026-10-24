import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { X, Upload, Plus, Loader2 } from 'lucide-react';
import api from '../../services/api';

/**
 * AdminAddProductModal Component
 * Modal thêm sản phẩm mới dành cho Admin - Light Theme + Dynamic Tag/Chip Multi-Input
 * Đảm bảo key upload file là 'Anh', khớp 100% với Multer middleware Backend: upload.single('Anh')
 */
const AdminAddProductModal = ({ isOpen, onClose, onSuccess }) => {
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    TenSanPham: '',
    Gia: '',
    TonKho: '0',
    MoTa: '',
    MaLoaiSanPham: '',
    MaNhaSanXuat: ''
  });

  const [dungLuongList, setDungLuongList] = useState([]);
  const [mauSacList, setMauSacList] = useState([]);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Dung lượng Tag handlers
  const handleAddDungLuong = () => {
    setDungLuongList((prev) => [...prev, '']);
  };

  const handleUpdateDungLuong = (idx, val) => {
    setDungLuongList((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleRemoveDungLuong = (idx) => {
    setDungLuongList((prev) => prev.filter((_, i) => i !== idx));
  };

  // Màu sắc Tag handlers
  const handleAddMauSac = () => {
    setMauSacList((prev) => [...prev, '']);
  };

  const handleUpdateMauSac = (idx, val) => {
    setMauSacList((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleRemoveMauSac = (idx) => {
    setMauSacList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chọn một file hình ảnh hợp lệ!');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Kích thước ảnh tối đa là 10MB!');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.TenSanPham.trim()) {
      setErrorMsg('Vui lòng nhập tên sản phẩm.');
      return;
    }

    if (!formData.Gia || Number(formData.Gia) <= 0) {
      setErrorMsg('Vui lòng nhập giá sản phẩm hợp lệ (> 0).');
      return;
    }

    if (!imageFile) {
      setErrorMsg('Vui lòng chọn hình ảnh sản phẩm.');
      return;
    }

    try {
      setLoading(true);

      const dungLuongJoined = dungLuongList
        .map((s) => s.trim())
        .filter(Boolean)
        .join(', ');

      const mauSacJoined = mauSacList
        .map((s) => s.trim())
        .filter(Boolean)
        .join(', ');

      // Đóng gói FormData
      const data = new FormData();
      data.append('TenSanPham', formData.TenSanPham.trim());
      data.append('Gia', formData.Gia);
      data.append('TonKho', formData.TonKho || '0');
      data.append('MoTa', formData.MoTa.trim());
      if (dungLuongJoined) data.append('DungLuong', dungLuongJoined);
      if (mauSacJoined) data.append('MauSac', mauSacJoined);
      if (formData.MaLoaiSanPham) data.append('MaLoaiSanPham', formData.MaLoaiSanPham);
      if (formData.MaNhaSanXuat) data.append('MaNhaSanXuat', formData.MaNhaSanXuat);

      // ĐẢM BẢO KEY LÀ 'Anh' TRÙNG KHỚP 100% VỚI BACKEND upload.single('Anh')
      data.append('Anh', imageFile);

      const res = await api.post('/admin/products', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        toast.success(`Thêm sản phẩm "${formData.TenSanPham}" thành công!`);
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      } else {
        throw new Error(res.data?.message || 'Có lỗi xảy ra khi thêm sản phẩm.');
      }
    } catch (err) {
      console.error('Lỗi khi thêm sản phẩm:', err);
      const message =
        err.response?.data?.message ||
        err.message ||
        'Không thể thêm sản phẩm. Vui lòng kiểm tra lại!';
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Thêm Sản Phẩm Mới</h3>
            <p className="text-xs text-slate-500 mt-0.5">Điền thông tin và tải lên ảnh sản phẩm</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm shrink-0">
            {errorMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tên sản phẩm <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="TenSanPham"
                value={formData.TenSanPham}
                onChange={handleChange}
                placeholder="Ví dụ: iPhone 15 Pro Max"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Giá niêm yết (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="Gia"
                value={formData.Gia}
                onChange={handleChange}
                placeholder="Ví dụ: 29990000"
                min="1000"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Số lượng tồn kho
            </label>
            <input
              type="number"
              name="TonKho"
              value={formData.TonKho}
              onChange={handleChange}
              min="0"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
            />
          </div>

          {/* Dynamic Multi-Input for Dung Lượng & Màu Sắc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dung lượng Tag/Chip Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Dung lượng
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {dungLuongList.filter(Boolean).length} lựa chọn
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[46px]">
                {dungLuongList.map((item, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-semibold text-slate-800 transition-all focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500"
                  >
                    <input
                      type="text"
                      value={item}
                      autoFocus={item === ''}
                      onChange={(e) => handleUpdateDungLuong(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDungLuong();
                        } else if (e.key === 'Backspace' && !item) {
                          e.preventDefault();
                          handleRemoveDungLuong(idx);
                        }
                      }}
                      placeholder="128GB"
                      className="w-16 bg-transparent border-none outline-none text-slate-800 font-semibold text-xs focus:ring-0 p-0 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDungLuong(idx)}
                      className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-0.5 rounded transition-colors cursor-pointer"
                      title="Xóa"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddDungLuong}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 hover:text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm dung lượng</span>
                </button>
              </div>
            </div>

            {/* Màu sắc Tag/Chip Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Màu sắc
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {mauSacList.filter(Boolean).length} lựa chọn
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[46px]">
                {mauSacList.map((item, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-semibold text-slate-800 transition-all focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500"
                  >
                    <input
                      type="text"
                      value={item}
                      autoFocus={item === ''}
                      onChange={(e) => handleUpdateMauSac(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMauSac();
                        } else if (e.key === 'Backspace' && !item) {
                          e.preventDefault();
                          handleRemoveMauSac(idx);
                        }
                      }}
                      placeholder="Titan Tự Nhiên"
                      className="w-20 bg-transparent border-none outline-none text-slate-800 font-semibold text-xs focus:ring-0 p-0 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveMauSac(idx)}
                      className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-0.5 rounded transition-colors cursor-pointer"
                      title="Xóa"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddMauSac}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 hover:text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm màu sắc</span>
                </button>
              </div>
            </div>
          </div>

          {/* Upload hình ảnh (Key: 'Anh') */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hình ảnh sản phẩm <span className="text-rose-500">*</span>{' '}
              <span className="text-xs text-sky-600 font-normal">(FormData field: 'Anh')</span>
            </label>

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-sky-50/20"
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-medium">Bấm để chọn file ảnh hoặc kéo thả vào đây</p>
                <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, WEBP lên đến 10MB</p>
              </div>
            ) : (
              <div className="relative inline-block border border-slate-200 rounded-xl p-2 bg-slate-50">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mô tả sản phẩm</label>
            <textarea
              name="MoTa"
              rows={3}
              value={formData.MoTa}
              onChange={handleChange}
              placeholder="Nhập thông tin mô tả chi tiết về sản phẩm..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all resize-y"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <span>Lưu Sản Phẩm</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAddProductModal;

