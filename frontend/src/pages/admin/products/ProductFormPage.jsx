import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Layers,
  Image as ImageIcon,
  Upload,
  DollarSign,
  Package,
  FileText,
  Check,
  AlertTriangle,
  RefreshCw,
  X,
  AlertCircle
} from 'lucide-react';
import api from '../../../services/api';

/**
 * ProductFormPage
 * Trang riêng biệt (Dedicated Full Page) để Thêm mới / Chỉnh sửa Sản phẩm.
 * Giao diện 2 cột: Cột 1 (Thông tin chung & Ảnh), Cột 2 (Thông số kỹ thuật động).
 */
const ProductFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // ─── Loading & Error State ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ─── Form Fields State ──────────────────────────────────────────────────────
  const [tenSanPham, setTenSanPham] = useState('');
  const [gia, setGia] = useState('');
  const [imageMode, setImageMode] = useState('file'); // 'file' | 'url'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [initialImage, setInitialImage] = useState('');

  // ─── Dynamic Specs Groups State ─────────────────────────────────────────────
  const [specGroups, setSpecGroups] = useState([]);

  // ─── Form Validation & Dirty State ──────────────────────────────────────────
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Mark form as dirty when fields change
  const initialLoadDone = useRef(false);

  const markDirty = () => {
    if (initialLoadDone.current) {
      setIsDirty(true);
    }
  };

  // ─── Unsaved Changes Guard: window beforeunload listener ────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSubmitting]);

  // ─── Helper: Un-flatten mảng thông số từ backend (Edit Mode) ───────────────
  const groupSpecsByNhom = (flatSpecsArray) => {
    if (!flatSpecsArray || !Array.isArray(flatSpecsArray) || flatSpecsArray.length === 0) {
      return [
        {
          id: `group_${Date.now()}_1`,
          name: 'Màn hình',
          items: [
            { id: `item_${Date.now()}_1`, name: 'Kích thước', value: '' },
            { id: `item_${Date.now()}_2`, name: 'Công nghệ màn hình', value: '' }
          ]
        }
      ];
    }

    const groupMap = {};
    flatSpecsArray.forEach((spec, idx) => {
      const groupName = spec.NhomThongSo || 'Thông số chung';
      if (!groupMap[groupName]) {
        groupMap[groupName] = {
          id: `group_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          name: groupName,
          items: []
        };
      }
      groupMap[groupName].items.push({
        id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        name: spec.TenThongSo || '',
        value: spec.GiaTri || ''
      });
    });

    return Object.values(groupMap);
  };

  // ─── Fetch chi tiết sản phẩm nếu ở Edit Mode ──────────────────────────────
  useEffect(() => {
    const fetchProductDetail = async () => {
      if (!isEditMode) {
        // Create Mode default spec groups
        setSpecGroups([
          {
            id: `group_${Date.now()}_1`,
            name: 'Màn hình',
            items: [
              { id: `item_${Date.now()}_1`, name: 'Kích thước', value: '' },
              { id: `item_${Date.now()}_2`, name: 'Độ phân giải', value: '' }
            ]
          },
          {
            id: `group_${Date.now()}_2`,
            name: 'Hiệu năng',
            items: [
              { id: `item_${Date.now()}_3`, name: 'Chipset', value: '' },
              { id: `item_${Date.now()}_4`, name: 'RAM', value: '' },
              { id: `item_${Date.now()}_5`, name: 'Bộ nhớ trong', value: '' }
            ]
          }
        ]);
        setTimeout(() => {
          initialLoadDone.current = true;
        }, 100);
        return;
      }

      try {
        setLoading(true);
        setSubmitError(null);
        const res = await api.get(`/admin/products/${id}`);

        if (res.data?.success && res.data.data) {
          const product = res.data.data;
          setTenSanPham(product.TenSanPham || '');
          setGia(product.Gia !== undefined ? String(product.Gia) : '');

          const existingImg = product.Anh || '';
          setInitialImage(existingImg);
          setImagePreview(existingImg);
          setImageUrlInput(existingImg);
          setImageMode(
            existingImg.startsWith('data:') ||
              existingImg.startsWith('blob:') ||
              !existingImg.startsWith('http')
              ? 'file'
              : 'url'
          );

          const parsedGroups = groupSpecsByNhom(product.thongsokythuat);
          setSpecGroups(parsedGroups);
        } else {
          setSubmitError('Không tìm thấy thông tin sản phẩm.');
        }
      } catch (err) {
        console.error('Lỗi khi lấy thông tin chi tiết sản phẩm:', err);
        setSubmitError(err.response?.data?.message || 'Không thể tải thông tin sản phẩm.');
      } finally {
        setLoading(false);
        setTimeout(() => {
          initialLoadDone.current = true;
        }, 100);
      }
    };

    fetchProductDetail();
  }, [id, isEditMode]);

  // ─── Image Handling ────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      markDirty();
    }
  };

  const handleUrlInputChange = (e) => {
    const url = e.target.value;
    setImageUrlInput(url);
    setImagePreview(url);
    markDirty();
  };

  // ─── Dynamic Specs Operations ──────────────────────────────────────────────
  const handleAddGroup = () => {
    const newGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: '',
      items: [
        {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: '',
          value: ''
        }
      ]
    };
    setSpecGroups((prev) => [...prev, newGroup]);
    markDirty();
  };

  const handleRemoveGroup = (groupId) => {
    setSpecGroups((prev) => prev.filter((g) => g.id !== groupId));
    markDirty();
  };

  const handleGroupChange = (groupId, newName) => {
    setSpecGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name: newName } : g))
    );
    markDirty();
  };

  const handleAddItem = (groupId) => {
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: '',
      value: ''
    };
    setSpecGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, items: [...g.items, newItem] } : g))
    );
    markDirty();
  };

  const handleRemoveItem = (groupId, itemId) => {
    setSpecGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return { ...g, items: g.items.filter((item) => item.id !== itemId) };
        }
        return g;
      })
    );
    markDirty();
  };

  const handleItemChange = (groupId, itemId, field, val) => {
    setSpecGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            items: g.items.map((item) =>
              item.id === itemId ? { ...item, [field]: val } : item
            )
          };
        }
        return g;
      })
    );
    markDirty();
  };

  // ─── Navigation Guard Handler ──────────────────────────────────────────────
  const handleBackNavigation = () => {
    if (isDirty && !isSubmitting) {
      setShowExitConfirm(true);
    } else {
      navigate('/admin/products');
    }
  };

  // ─── Form Validation & Submit ──────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};

    if (!tenSanPham.trim()) {
      newErrors.tenSanPham = 'Tên sản phẩm không được để trống';
    }

    const numGia = Number(gia);
    if (!gia || isNaN(numGia) || numGia <= 0) {
      newErrors.gia = 'Giá sản phẩm phải là số và lớn hơn 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Dynamic Specs Validation & Filtering
      const flatSpecs = specGroups.flatMap((group) => {
        const gName = group.name.trim() || 'Thông số chung';
        return group.items
          .filter((item) => item.name.trim() !== '' || item.value.trim() !== '')
          .map((item) => ({
            NhomThongSo: gName,
            TenThongSo: item.name.trim(),
            GiaTri: item.value.trim()
          }));
      });

      // Đóng gói FormData
      const formData = new FormData();
      formData.append('TenSanPham', tenSanPham.trim());
      formData.append('Gia', gia);
      if (!isEditMode) {
        formData.append('TonKho', '0');
      }

      if (imageFile) {
        formData.append('file', imageFile);
        formData.append('Anh', imageFile);
      } else if (imageMode === 'url' && imageUrlInput.trim()) {
        formData.append('Anh', imageUrlInput.trim());
      } else if (initialImage) {
        formData.append('Anh', initialImage);
      }

      formData.append('thongsokythuat', JSON.stringify(flatSpecs));

      const savePromise = (async () => {
        let res;
        if (isEditMode) {
          res = await api.put(`/admin/products/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          res = await api.post('/admin/products', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }

        if (!res.data?.success) {
          throw new Error(res.data?.message || 'Có lỗi xảy ra khi lưu sản phẩm.');
        }
        return res.data;
      })();

      toast.promise(
        savePromise,
        {
          loading: isEditMode ? 'Đang cập nhật sản phẩm & tải ảnh...' : 'Đang lưu sản phẩm mới & tải ảnh...',
          success: () => {
            setIsDirty(false);
            const successMsg = isEditMode
              ? `Cập nhật sản phẩm "${tenSanPham.trim()}" thành công!`
              : `Thêm sản phẩm mới "${tenSanPham.trim()}" thành công!`;
            navigate('/admin/products', {
              state: {
                toast: {
                  type: 'success',
                  message: successMsg
                }
              }
            });
            return successMsg;
          },
          error: (err) => {
            const msg = err.message || err.response?.data?.message || 'Có lỗi xảy ra khi lưu sản phẩm.';
            setSubmitError(msg);
            return msg;
          }
        },
        { id: 'product-save-toast' }
      );

      await savePromise;
    } catch (err) {
      console.error('Lỗi khi lưu sản phẩm:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex flex-col items-center justify-center py-24 text-slate-400 space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-sky-400" />
        <p className="text-sm font-medium">Đang tải thông tin sản phẩm...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Top Navigation Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-2 text-sm font-medium"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Quay lại danh sách</span>
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
              {isEditMode ? (
                <>
                  <FileText className="w-7 h-7 text-sky-400" />
                  Chỉnh sửa sản phẩm #{id}
                </>
              ) : (
                <>
                  <Plus className="w-7 h-7 text-sky-400" />
                  Thêm sản phẩm mới
                </>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditMode
                ? 'Cập nhật thông tin chi tiết và thông số kỹ thuật động của sản phẩm'
                : 'Điền thông tin cơ bản và thiết lập các nhóm thông số kỹ thuật cho sản phẩm'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackNavigation}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditMode ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Submit Error Alert ── */}
      {submitError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-sm font-medium">{submitError}</p>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="ml-auto text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Main Form Layout: 2 Columns ── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── COLUMN 1: Thông tin chung & Ảnh đại diện (5 Cols on LG) ── */}
        <div className="lg:col-span-5 space-y-6">

          {/* Block 1: Thông tin cơ bản */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Package className="w-4 h-4 text-sky-400" />
              Thông tin chung
            </h2>

            {/* Tên sản phẩm */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tên sản phẩm <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={tenSanPham}
                onChange={(e) => {
                  setTenSanPham(e.target.value);
                  markDirty();
                }}
                placeholder="VD: iPhone 15 Pro Max 256GB"
                className={`w-full px-3.5 py-2.5 bg-slate-950 border ${
                  errors.tenSanPham
                    ? 'border-rose-500/70 focus:ring-rose-500/20'
                    : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                } rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
              />
              {errors.tenSanPham && (
                <p className="mt-1 text-xs text-rose-400 font-medium">{errors.tenSanPham}</p>
              )}
            </div>

            {/* Giá bán */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Giá bán (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <DollarSign className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  value={gia}
                  onChange={(e) => {
                    setGia(e.target.value);
                    markDirty();
                  }}
                  placeholder="29990000"
                  min="0"
                  step="1000"
                  className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border ${
                    errors.gia
                      ? 'border-rose-500/70 focus:ring-rose-500/20'
                      : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                  } rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                />
              </div>
              {errors.gia && (
                <p className="mt-1 text-xs text-rose-400 font-medium">{errors.gia}</p>
              )}
            </div>
          </div>

          {/* Block 2: Ảnh Đại Diện Sản Phẩm (Cloudinary / File / URL) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <ImageIcon className="w-4 h-4 text-violet-400" />
              Ảnh đại diện sản phẩm
            </h2>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setImageMode('file')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  imageMode === 'file'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tải ảnh từ máy (Cloudinary)
              </button>
              <button
                type="button"
                onClick={() => setImageMode('url')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  imageMode === 'url'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Nhập Đường dẫn (URL)
              </button>
            </div>

            {/* Input & Preview */}
            <div className="space-y-4">
              {imageMode === 'file' ? (
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-700/80 hover:border-sky-500/60 rounded-xl cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition-all group">
                  <div className="flex flex-col items-center justify-center py-4 text-center px-4">
                    <Upload className="w-8 h-8 text-slate-500 group-hover:text-sky-400 transition-colors mb-2" />
                    <p className="text-xs text-slate-400">
                      <span className="font-semibold text-sky-400">Bấm để tải tệp lên</span> hoặc kéo thả vào đây
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">PNG, JPG, WEBP hoặc GIF (Tối đa 5MB)</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    URL hình ảnh công khai
                  </label>
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={handleUrlInputChange}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
              )}

              {/* Preview Thumbnail Container */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Xem trước hình ảnh</label>
                {imagePreview ? (
                  <div className="relative group w-36 h-36 rounded-2xl border border-slate-700 bg-slate-950 overflow-hidden shadow-xl flex items-center justify-center mx-auto sm:mx-0">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://via.placeholder.com/200?text=L%E1%BB%97i+ảnh';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                        setImageUrlInput('');
                        markDirty();
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-slate-950/80 hover:bg-rose-600 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-md"
                      title="Xóa ảnh"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-36 h-36 rounded-2xl border border-slate-800 bg-slate-950/60 flex flex-col items-center justify-center text-slate-600 mx-auto sm:mx-0">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-xs">Chưa có ảnh</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUMN 2: Thông số kỹ thuật động (7 Cols on LG) ── */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-400" />
                  Thông số kỹ thuật động (Dynamic Specs)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Phân loại thông số theo từng Nhóm (Màn hình, Hiệu năng, Pin & Sạc, Camera...)
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddGroup}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 rounded-xl text-xs font-semibold text-violet-300 hover:text-violet-200 transition-all shadow-sm shadow-violet-500/10 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Thêm nhóm thông số
              </button>
            </div>

            {/* List các Nhóm thông số */}
            {specGroups.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl space-y-3">
                <Layers className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="text-xs text-slate-400">Chưa có nhóm thông số nào được tạo.</p>
                <button
                  type="button"
                  onClick={handleAddGroup}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-sky-400 text-xs font-semibold rounded-xl border border-slate-700 transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Tạo nhóm thông số đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {specGroups.map((group, gIdx) => (
                  <div
                    key={group.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-4.5 space-y-3 transition-all hover:border-slate-700 shadow-md"
                  >
                    {/* Header Nhóm */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center shrink-0">
                          {gIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => handleGroupChange(group.id, e.target.value)}
                          placeholder="Tên nhóm thông số (VD: Màn hình, Pin & Sạc...)"
                          className="w-full max-w-xs sm:max-w-md px-3 py-1.5 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 font-semibold text-sm focus:outline-none focus:border-sky-500 transition-all placeholder-slate-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(group.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0"
                        title="Xóa nhóm thông số này"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Danh sách các dòng cặp Tên thông số - Giá trị */}
                    <div className="space-y-2 pt-1">
                      {group.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(group.id, item.id, 'name', e.target.value)}
                            placeholder="Tên thông số (VD: Kích thước)"
                            className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                          />

                          <span className="text-slate-600 text-xs font-bold">:</span>

                          <input
                            type="text"
                            value={item.value}
                            onChange={(e) => handleItemChange(group.id, item.id, 'value', e.target.value)}
                            placeholder="Giá trị (VD: 6.7 inch Super Retina XDR)"
                            className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                          />

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(group.id, item.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                            title="Xóa dòng thông số này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Nút Thêm dòng trong Nhóm */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddItem(group.id)}
                        className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium py-1 px-2.5 rounded-lg hover:bg-sky-500/10 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm dòng thông số
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>

      {/* ── Modal Confirmation: Unsaved Changes Guard ── */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Xác nhận rời khỏi trang</h3>
                <p className="text-xs text-slate-400">Dữ liệu vừa nhập chưa được lưu</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-300">
              Bạn có chắc chắn muốn rời khỏi trang không? Mọi thay đổi chưa lưu sẽ bị mất hoàn toàn.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Tiếp tục chỉnh sửa
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDirty(false);
                  setShowExitConfirm(false);
                  navigate('/admin/products');
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition-all"
              >
                Đồng ý thoát
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductFormPage;
