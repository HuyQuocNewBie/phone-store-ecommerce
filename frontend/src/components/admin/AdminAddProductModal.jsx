import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import api from '../../services/api';

/**
 * AdminAddProductModal Component
 * Modal thêm sản phẩm mới dành cho Admin
 * Đảm bảo key upload file là 'Anh', khớp 100% với Multer middleware Backend: upload.single('Anh')
 */
const AdminAddProductModal = ({ isOpen, onClose, onSuccess }) => {
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    TenSanPham: '',
    Gia: '',
    TonKho: '0',
    DungLuong: '',
    MauSac: '',
    MoTa: '',
    MaLoaiSanPham: '',
    MaNhaSanXuat: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

      // Đóng gói FormData
      const data = new FormData();
      data.append('TenSanPham', formData.TenSanPham.trim());
      data.append('Gia', formData.Gia);
      data.append('TonKho', formData.TonKho || '0');
      data.append('MoTa', formData.MoTa.trim());
      if (formData.DungLuong) data.append('DungLuong', formData.DungLuong.trim());
      if (formData.MauSac) data.append('MauSac', formData.MauSac.trim());
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
      // Bắt lỗi Multer hoặc API error trả về từ backend
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Thêm Sản Phẩm Mới</h3>
            <p className="text-xs text-slate-400 mt-0.5">Điền thông tin và tải lên ảnh sản phẩm</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Tên sản phẩm <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                name="TenSanPham"
                value={formData.TenSanPham}
                onChange={handleChange}
                placeholder="Ví dụ: iPhone 15 Pro Max"
                required
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Giá niêm yết (VNĐ) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                name="Gia"
                value={formData.Gia}
                onChange={handleChange}
                placeholder="Ví dụ: 29990000"
                min="1000"
                required
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Số lượng tồn kho
              </label>
              <input
                type="number"
                name="TonKho"
                value={formData.TonKho}
                onChange={handleChange}
                min="0"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Dung lượng (phân cách dấu phẩy)
              </label>
              <input
                type="text"
                name="DungLuong"
                value={formData.DungLuong}
                onChange={handleChange}
                placeholder="128GB, 256GB"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Màu sắc (phân cách dấu phẩy)
              </label>
              <input
                type="text"
                name="MauSac"
                value={formData.MauSac}
                onChange={handleChange}
                placeholder="Titan Tự Nhiên, Đen"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
              />
            </div>
          </div>

          {/* Upload hình ảnh (Key: 'Anh') */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Hình ảnh sản phẩm <span className="text-rose-400">*</span>{' '}
              <span className="text-xs text-sky-400 font-normal">(FormData field: 'Anh')</span>
            </label>

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-slate-950/80"
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-medium">Bấm để chọn file ảnh hoặc kéo thả vào đây</p>
                <p className="text-[11px] text-slate-500 mt-1">PNG, JPG, WEBP lên đến 10MB</p>
              </div>
            ) : (
              <div className="relative inline-block border border-slate-700 rounded-xl p-2 bg-slate-950">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-colors"
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
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Mô tả sản phẩm</label>
            <textarea
              name="MoTa"
              rows={3}
              value={formData.MoTa}
              onChange={handleChange}
              placeholder="Nhập thông tin mô tả chi tiết về sản phẩm..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
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
