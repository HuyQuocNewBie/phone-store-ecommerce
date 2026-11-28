import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Layers,
  Image as ImageIcon,
  Upload,
  Link,
  Package,
  FileText,
  Check,
  AlertTriangle,
  RefreshCw,
  X,
  AlertCircle,
  Boxes
} from 'lucide-react';
import api from '../../../services/api';

const createEmptyVariant = () => ({
  localId: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  maBienThe: null,
  maSKU: '',
  mauSac: '',
  dungLuong: '',
  giaNhapGanNhat: 0,
  giaBan: '',
  tonKho: 0,
  trangThai: 'DangBan'
});

const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(Number(amount) || 0);
};

/**
 * ProductFormPage
 * Trang riêng biệt (Dedicated Full Page) để Thêm mới / Chỉnh sửa Sản phẩm theo mô hình Biến thể SKU.
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
  const [moTa, setMoTa] = useState('');
  const [maLoaiSanPham, setMaLoaiSanPham] = useState('');
  const [maNhaSanXuat, setMaNhaSanXuat] = useState('');
  const [imageMode, setImageMode] = useState('file'); // 'file' | 'url'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [initialImage, setInitialImage] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);

  // ─── SKU Variants State ─────────────────────────────────────────────────────
  const [variants, setVariants] = useState(() => [createEmptyVariant()]);
  const [variantErrors, setVariantErrors] = useState({});

  // ─── Categories & Manufacturers for Select Dropdowns ────────────────────────
  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);

  // ─── Dynamic Specs Groups State ─────────────────────────────────────────────
  const [specGroups, setSpecGroups] = useState([]);

  // ─── Form Validation & Dirty State ──────────────────────────────────────────
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const initialLoadDone = useRef(false);

  const markDirty = () => {
    if (initialLoadDone.current) {
      setIsDirty(true);
    }
  };

  // ─── Tổng hợp chỉ số từ danh sách biến thể ──────────────────────────────────
  const variantSummary = useMemo(() => {
    const validPrices = variants
      .map((v) => Number(v.giaBan))
      .filter((p) => Number.isFinite(p) && p > 0);
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
    const totalStock = variants.reduce((sum, v) => sum + (Number(v.tonKho) || 0), 0);
    const lowPriceCount = variants.filter((v) => {
      const giaBanNum = Number(v.giaBan);
      const giaNhapNum = Number(v.giaNhapGanNhat) || 0;
      return Number.isFinite(giaBanNum) && giaBanNum > 0 && giaBanNum <= giaNhapNum;
    }).length;

    return { minPrice, maxPrice, totalStock, lowPriceCount };
  }, [variants]);

  // ─── Fetch danh sách Categories & Manufacturers ──────────────────────────────
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [catRes, mfRes] = await Promise.all([
          api.get('/admin/categories'),
          api.get('/admin/manufacturers')
        ]);
        if (catRes.data?.success) setCategories(catRes.data.data || []);
        if (mfRes.data?.success) setManufacturers(mfRes.data.data || []);
      } catch (err) {
        console.error('Lỗi khi tải danh sách loại SP / nhà sản xuất:', err);
      }
    };
    fetchDropdownData();
  }, []);

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
        setVariants([createEmptyVariant()]);
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
          setMoTa(product.MoTa || '');
          setMaLoaiSanPham(product.MaLoaiSanPham ? String(product.MaLoaiSanPham) : '');
          setMaNhaSanXuat(product.MaNhaSanXuat ? String(product.MaNhaSanXuat) : '');

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

          // Load danh sách biến thể SKU
          const rawVariants = Array.isArray(product.variants) ? product.variants : [];
          const activeVariants = rawVariants.filter((v) => (v.TrangThai || v.trangThai) !== 'NgungBan');
          const displayVariants = activeVariants.length > 0 ? activeVariants : rawVariants;

          if (displayVariants.length > 0) {
            setVariants(
              displayVariants.map((v, idx) => ({
                localId: `var_${v.MaBienThe ?? idx}_${Math.random().toString(36).substring(2, 6)}`,
                maBienThe: v.MaBienThe ?? v.maBienThe ?? null,
                maSKU: v.MaSKU ?? v.maSKU ?? '',
                mauSac: v.MauSac ?? v.mauSac ?? '',
                dungLuong: v.DungLuong ?? v.dungLuong ?? '',
                giaNhapGanNhat: Number(v.GiaNhapGanNhat ?? v.giaNhapGanNhat) || 0,
                giaBan:
                  v.GiaBan !== undefined && v.GiaBan !== null
                    ? String(v.GiaBan)
                    : v.giaBan !== undefined && v.giaBan !== null
                    ? String(v.giaBan)
                    : '',
                tonKho: Number(v.TonKho ?? v.tonKho) || 0,
                trangThai: v.TrangThai ?? v.trangThai ?? 'DangBan'
              }))
            );
          } else {
            // Fallback cho sản phẩm cũ chưa có biến thể
            setVariants([
              {
                ...createEmptyVariant(),
                mauSac: product.MauSac ? String(product.MauSac).split(',')[0].trim() : '',
                dungLuong: product.DungLuong ? String(product.DungLuong).split(',')[0].trim() : '',
                giaBan: product.Gia ? String(product.Gia) : '',
                tonKho: Number(product.TonKho) || 0
              }
            ]);
          }

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

  // ─── SKU Variants Operations ───────────────────────────────────────────────
  const handleAddVariant = () => {
    setVariants((prev) => [...prev, createEmptyVariant()]);
    setErrors((prev) => ({ ...prev, variants: null }));
    markDirty();
  };

  const handleRemoveVariant = (localId) => {
    const target = variants.find((v) => v.localId === localId);
    if (!target) return;

    if (variants.length <= 1) {
      toast.error('Sản phẩm phải có ít nhất 1 biến thể.');
      return;
    }

    if (Number(target.tonKho) > 0) {
      toast.error(`Không thể xóa biến thể đang còn tồn kho (${target.tonKho}).`);
      return;
    }

    setVariants((prev) => prev.filter((v) => v.localId !== localId));
    setVariantErrors((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });
    markDirty();
  };

  const handleVariantChange = (localId, field, value) => {
    setVariants((prev) =>
      prev.map((v) => (v.localId === localId ? { ...v, [field]: value } : v))
    );
    setVariantErrors((prev) => {
      if (!prev[localId]) return prev;
      const nextRow = { ...prev[localId] };
      delete nextRow[field];
      if (field === 'mauSac' || field === 'dungLuong') {
        delete nextRow.pair;
      }
      const next = { ...prev };
      if (Object.keys(nextRow).length === 0) {
        delete next[localId];
      } else {
        next[localId] = nextRow;
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, variants: null }));
    markDirty();
  };

  // ─── Image Handling & Tab Switch ───────────────────────────────────────────
  const handleTabSwitch = (mode) => {
    setImageMode(mode);
    setImageLoadError(false);
    setErrors((prev) => ({ ...prev, anh: null }));

    if (mode === 'file') {
      setImageUrlInput('');
      if (imageFile) {
        setImagePreview(URL.createObjectURL(imageFile));
      } else {
        setImagePreview('');
      }
    } else {
      setImageFile(null);
      if (imageUrlInput.trim()) {
        setImagePreview(imageUrlInput.trim());
      } else if (initialImage && (initialImage.startsWith('http') || initialImage.startsWith('data:'))) {
        setImageUrlInput(initialImage);
        setImagePreview(initialImage);
      } else {
        setImagePreview('');
      }
    }
    markDirty();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        anh: 'Chỉ chấp nhận định dạng ảnh: .png, .jpg, .jpeg, .webp'
      }));
      e.target.value = '';
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setErrors((prev) => ({
        ...prev,
        anh: `File ảnh quá lớn (${fileSizeMB}MB). Dung lượng tối đa cho phép là 5MB`
      }));
      e.target.value = '';
      return;
    }

    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageLoadError(false);
    setErrors((prev) => ({ ...prev, anh: null }));
    markDirty();
  };

  const handleUrlInputChange = (e) => {
    const url = e.target.value;
    setImageUrlInput(url);
    setImagePreview(url);
    setImageLoadError(false);
    setErrors((prev) => ({ ...prev, anh: null }));
    markDirty();
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImageUrlInput('');
    setInitialImage('');
    setImageLoadError(false);
    setErrors((prev) => ({ ...prev, anh: null }));
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
    const newVariantErrors = {};

    if (!tenSanPham.trim()) {
      newErrors.tenSanPham = 'Tên sản phẩm không được để trống';
    }

    // Validate danh sách biến thể SKU
    if (!Array.isArray(variants) || variants.length === 0) {
      newErrors.variants = 'Vui lòng cấu hình ít nhất 1 biến thể sản phẩm';
    } else {
      const pairMap = new Map();
      variants.forEach((v) => {
        const rowErr = {};
        const mauSac = String(v.mauSac || '').trim();
        const dungLuong = String(v.dungLuong || '').trim();
        const giaBanNum = Number(v.giaBan);

        if (!mauSac && !dungLuong) {
          rowErr.pair = 'Cần nhập ít nhất Màu sắc hoặc Dung lượng';
        } else {
          const pairKey = `${mauSac.toLowerCase()}__${dungLuong.toLowerCase()}`;
          if (pairMap.has(pairKey)) {
            rowErr.pair = 'Cặp Màu sắc & Dung lượng bị trùng lặp';
          } else {
            pairMap.set(pairKey, v.localId);
          }
        }

        if (!v.giaBan || !Number.isFinite(giaBanNum) || giaBanNum <= 0) {
          rowErr.giaBan = 'Giá bán phải lớn hơn 0';
        }

        if (Object.keys(rowErr).length > 0) {
          newVariantErrors[v.localId] = rowErr;
        }
      });

      if (Object.keys(newVariantErrors).length > 0) {
        newErrors.variants = 'Vui lòng kiểm tra lại thông tin các biến thể bên dưới';
      }
    }

    // Validate ảnh sản phẩm
    if (imageMode === 'file') {
      if (!imageFile && !imagePreview) {
        newErrors.anh = 'Vui lòng chọn file ảnh hoặc nhập URL ảnh';
      }
    } else if (imageMode === 'url') {
      if (!imageUrlInput.trim() && !imagePreview) {
        newErrors.anh = 'Vui lòng chọn file ảnh hoặc nhập URL ảnh';
      } else if (imageLoadError) {
        newErrors.anh = 'Đường dẫn ảnh không hợp lệ hoặc không tải được';
      }
    }

    setErrors(newErrors);
    setVariantErrors(newVariantErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Dynamic Specs Filtering
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

      // Chuẩn hóa danh sách biến thể gửi lên backend
      const variantsPayload = variants.map((v) => ({
        maBienThe: v.maBienThe || null,
        mauSac: String(v.mauSac || '').trim() || null,
        dungLuong: String(v.dungLuong || '').trim() || null,
        giaBan: Number(v.giaBan)
      }));

      const minVariantGia = Math.min(...variantsPayload.map((v) => v.giaBan));

      // Đóng gói FormData (không gửi TonKho thủ công ở sản phẩm cha)
      const formData = new FormData();
      formData.append('TenSanPham', tenSanPham.trim());
      formData.append('Gia', String(minVariantGia));
      formData.append('MoTa', moTa);
      if (maLoaiSanPham) formData.append('MaLoaiSanPham', maLoaiSanPham);
      if (maNhaSanXuat) formData.append('MaNhaSanXuat', maNhaSanXuat);
      formData.append('variants', JSON.stringify(variantsPayload));

      if (imageFile) {
        formData.append('Anh', imageFile);
      } else if (imageMode === 'url' && imageUrlInput.trim()) {
        formData.append('Anh', imageUrlInput.trim());
      } else if (initialImage) {
        formData.append('Anh', initialImage);
      }

      formData.append('thongsokythuat', JSON.stringify(flatSpecs));

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

      const successMsg = isEditMode
        ? `Cập nhật sản phẩm "${tenSanPham.trim()}" thành công!`
        : `Thêm sản phẩm mới "${tenSanPham.trim()}" thành công!`;
      toast.success(successMsg, { id: 'product-save-toast', duration: 3000 });

      setIsDirty(false);
      navigate('/admin/products');
    } catch (err) {
      console.error('Lỗi khi lưu sản phẩm:', err);
      const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu sản phẩm.';
      setSubmitError(msg);
      toast.error(msg, { id: 'product-save-toast' });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-200 transition-all flex items-center gap-2 text-sm font-medium shadow-sm cursor-pointer"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Quay lại danh sách</span>
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
              {isEditMode ? (
                <>
                  <FileText className="w-7 h-7 text-sky-600" />
                  Chỉnh sửa sản phẩm #{id}
                </>
              ) : (
                <>
                  <Plus className="w-7 h-7 text-sky-600" />
                  Thêm sản phẩm mới
                </>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditMode
                ? 'Cập nhật thông tin chung, cấu hình biến thể SKU và thông số kỹ thuật của sản phẩm'
                : 'Điền thông tin cơ bản, cấu hình các biến thể SKU (mặc định tồn kho bằng 0) và thông số kỹ thuật'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackNavigation}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-sm font-medium">{submitError}</p>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="ml-auto text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Main Form ── */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── ROW 1: Thông tin chung (7 cols) & Ảnh đại diện (5 cols) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Block 1: Thông tin cơ bản */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Package className="w-4 h-4 text-sky-600" />
              Thông tin chung
            </h2>

            {/* Tên sản phẩm */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tên sản phẩm <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={tenSanPham}
                onChange={(e) => {
                  setTenSanPham(e.target.value);
                  setErrors((prev) => ({ ...prev, tenSanPham: null }));
                  markDirty();
                }}
                placeholder="iPhone 15 Pro Max"
                className={`w-full px-3.5 py-2.5 bg-white border ${
                  errors.tenSanPham
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                } rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 transition-all`}
              />
              {errors.tenSanPham && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{errors.tenSanPham}</p>
              )}
            </div>

            {/* Loại sản phẩm & Nhà sản xuất (2 cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Loại sản phẩm
                </label>
                <select
                  value={maLoaiSanPham}
                  onChange={(e) => {
                    setMaLoaiSanPham(e.target.value);
                    markDirty();
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-sky-500 focus:ring-sky-500/20 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Chọn loại sản phẩm --</option>
                  {categories.map((cat) => (
                    <option key={cat.MaLoaiSanPham} value={String(cat.MaLoaiSanPham)}>
                      {cat.TenLoaiSanPham}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nhà sản xuất
                </label>
                <select
                  value={maNhaSanXuat}
                  onChange={(e) => {
                    setMaNhaSanXuat(e.target.value);
                    markDirty();
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-sky-500 focus:ring-sky-500/20 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Chọn nhà sản xuất --</option>
                  {manufacturers.map((mf) => (
                    <option key={mf.MaNhaSanXuat} value={String(mf.MaNhaSanXuat)}>
                      {mf.TenNhaSanXuat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tóm tắt tự động từ biến thể SKU */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <span className="block text-[11px] font-medium text-slate-500">
                  Giá hiển thị (tự động từ biến thể)
                </span>
                <p className="text-sm font-bold text-sky-600 mt-0.5">
                  {variantSummary.minPrice > 0
                    ? variantSummary.minPrice === variantSummary.maxPrice
                      ? formatVND(variantSummary.minPrice)
                      : `${formatVND(variantSummary.minPrice)} - ${formatVND(variantSummary.maxPrice)}`
                    : 'Chưa cấu hình giá bán'}
                </p>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-slate-500">
                  Tổng tồn kho (cộng dồn biến thể)
                </span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {variantSummary.totalStock} cái{' '}
                  <span className="text-[11px] font-normal text-slate-500">
                    ({variants.length} biến thể)
                  </span>
                </p>
              </div>
            </div>

            {/* Mô tả sản phẩm */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mô tả sản phẩm
              </label>
              <textarea
                value={moTa}
                onChange={(e) => {
                  setMoTa(e.target.value);
                  markDirty();
                }}
                placeholder="Mô tả chi tiết về sản phẩm, tính năng nổi bật..."
                rows={4}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-sky-500 focus:ring-sky-500/20 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 transition-all resize-y"
              />
            </div>
          </div>

          {/* Block 2: Ảnh Đại Diện Sản Phẩm */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-violet-500" />
                Ảnh đại diện sản phẩm <span className="text-rose-500">*</span>
              </h2>
              {imagePreview && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {imageMode === 'file' ? 'Tệp từ máy' : 'URL trực tiếp'}
                </span>
              )}
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleTabSwitch('file')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  imageMode === 'file'
                    ? 'bg-white text-sky-600 border border-slate-200 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải ảnh từ máy</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('url')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  imageMode === 'url'
                    ? 'bg-white text-sky-600 border border-slate-200 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                <Link className="w-3.5 h-3.5" />
                <span>Dán URL ảnh</span>
              </button>
            </div>

            {/* Input & Preview Section */}
            <div className="space-y-4">
              {imageMode === 'file' ? (
                <label
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed ${
                    errors.anh
                      ? 'border-rose-400 bg-rose-50/50'
                      : 'border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/30'
                  } rounded-xl cursor-pointer transition-all group`}
                >
                  <div className="flex flex-col items-center justify-center py-3 text-center px-4">
                    <Upload className="w-7 h-7 text-slate-400 group-hover:text-sky-500 transition-colors mb-1.5" />
                    <p className="text-xs text-slate-600">
                      <span className="font-semibold text-sky-600">Bấm để chọn file ảnh</span> hoặc kéo thả vào đây
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Định dạng: .png, .jpg, .jpeg, .webp (Tối đa 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Nhập/Dán URL hình ảnh công khai
                  </label>
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={handleUrlInputChange}
                    placeholder="https://images.unsplash.com/photo-..."
                    className={`w-full px-3.5 py-2.5 bg-white border ${
                      errors.anh || imageLoadError
                        ? 'border-rose-400 focus:ring-rose-500/20'
                        : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                    } rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 transition-all`}
                  />
                </div>
              )}

              {errors.anh && (
                <p className="text-xs text-rose-500 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span>{errors.anh}</span>
                </p>
              )}

              {imageMode === 'url' && imageLoadError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Đường dẫn ảnh không khả dụng hoặc bị chặn (vui lòng kiểm tra lại link).</span>
                </div>
              )}

              {/* Preview Thumbnail Container */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Xem trước hình ảnh (Preview)
                </label>
                {imagePreview ? (
                  <div className="relative group w-40 h-40 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm flex items-center justify-center mx-auto sm:mx-0">
                    <img
                      src={imagePreview}
                      alt="Xem trước ảnh sản phẩm"
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        imageLoadError ? 'opacity-30 blur-[2px]' : 'group-hover:scale-105'
                      }`}
                      onError={() => setImageLoadError(true)}
                      onLoad={() => setImageLoadError(false)}
                    />
                    {imageLoadError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-slate-900/60 text-amber-300">
                        <AlertTriangle className="w-7 h-7 mb-1 text-amber-400 animate-bounce" />
                        <span className="text-[11px] font-bold">Lỗi tải ảnh</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute top-2 right-2 w-7 h-7 bg-slate-800/80 hover:bg-rose-600 rounded-full flex items-center justify-center text-white transition-all shadow-md backdrop-blur-sm z-10 cursor-pointer"
                      title="Xóa ảnh"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-40 h-40 rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 mx-auto sm:mx-0 space-y-1">
                    <ImageIcon className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                    <span className="text-xs font-medium text-slate-400">Chưa có ảnh</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 2: Cấu hình Biến thể (Màu sắc & Dung lượng) ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Boxes className="w-4 h-4 text-sky-600" />
                Cấu hình Biến thể (Màu sắc &amp; Dung lượng) <span className="text-rose-500">*</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Khai báo các phiên bản SKU theo màu sắc và dung lượng. Tồn kho và giá nhập từng biến thể được đồng bộ tự động sau khi duyệt phiếu nhập kho.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddVariant}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl text-xs font-semibold text-sky-700 transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm biến thể</span>
            </button>
          </div>

          {errors.variants && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errors.variants}</span>
            </div>
          )}

          {variantSummary.lowPriceCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
              <span>
                Có <strong>{variantSummary.lowPriceCount}</strong> biến thể có giá bán đang thấp hơn hoặc bằng giá nhập gần nhất. Vui lòng kiểm tra lại định giá.
              </span>
            </div>
          )}

          <div className="w-full overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-[21%]">Màu sắc</th>
                  <th className="py-3 px-4 w-[18%]">Dung lượng</th>
                  <th className="py-3 px-4 w-[17%] text-right">Giá nhập gần nhất</th>
                  <th className="py-3 px-4 w-[23%]">Giá bán (VNĐ) <span className="text-rose-500">*</span></th>
                  <th className="py-3 px-4 w-[15%] text-center">Tồn kho hiện tại</th>
                  <th className="py-3 px-3 w-[6%] text-center">Xóa</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {variants.map((variant) => {
                  const rowErr = variantErrors[variant.localId] || {};
                  const giaBanNum = Number(variant.giaBan);
                  const giaNhapNum = Number(variant.giaNhapGanNhat) || 0;
                  const isPriceBelowOrEqualImport =
                    Number.isFinite(giaBanNum) && giaBanNum > 0 && giaBanNum <= giaNhapNum;
                  const tonKhoNum = Number(variant.tonKho) || 0;
                  const cannotDelete = variants.length <= 1 || tonKhoNum > 0;

                  return (
                    <tr key={variant.localId} className="align-top hover:bg-slate-50/60 transition-colors">
                      {/* Cột 1: Màu sắc */}
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={variant.mauSac}
                          onChange={(e) => handleVariantChange(variant.localId, 'mauSac', e.target.value)}
                          placeholder="VD: Titan Đen"
                          className={`w-full px-3 py-2 bg-white border ${
                            rowErr.pair
                              ? 'border-rose-400 focus:ring-rose-500/20'
                              : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                          } rounded-lg text-slate-800 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 transition-all`}
                        />
                        {variant.maSKU && (
                          <p className="mt-1 text-[11px] font-mono text-slate-400">
                            SKU: {variant.maSKU}
                          </p>
                        )}
                        {rowErr.pair && (
                          <p className="mt-1 text-[11px] text-rose-500 font-medium">{rowErr.pair}</p>
                        )}
                      </td>

                      {/* Cột 2: Dung lượng */}
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={variant.dungLuong}
                          onChange={(e) => handleVariantChange(variant.localId, 'dungLuong', e.target.value)}
                          placeholder="VD: 128GB, 256GB"
                          className={`w-full px-3 py-2 bg-white border ${
                            rowErr.pair
                              ? 'border-rose-400 focus:ring-rose-500/20'
                              : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                          } rounded-lg text-slate-800 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 transition-all`}
                        />
                      </td>

                      {/* Cột 3: Giá nhập gần nhất (chỉ đọc) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 select-all">
                          {formatVND(giaNhapNum)}
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {giaNhapNum > 0 ? 'Từ lô nhập gần nhất' : 'Chưa có phiếu nhập duyệt'}
                        </p>
                      </td>

                      {/* Cột 4: Giá bán (input số VNĐ + cảnh báo cam) */}
                      <td className="py-3.5 px-4">
                        <div className="relative">
                          <input
                            type="number"
                            value={variant.giaBan}
                            onChange={(e) => handleVariantChange(variant.localId, 'giaBan', e.target.value)}
                            placeholder="VD: 29990000"
                            min="0"
                            step="1000"
                            className={`w-full px-3 py-2 pr-10 bg-white border ${
                              rowErr.giaBan
                                ? 'border-rose-400 focus:ring-rose-500/20'
                                : isPriceBelowOrEqualImport
                                ? 'border-orange-400 focus:border-orange-500 focus:ring-orange-500/20'
                                : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                            } rounded-lg text-slate-800 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 transition-all`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">
                            ₫
                          </span>
                        </div>

                        {rowErr.giaBan && (
                          <p className="mt-1 text-[11px] text-rose-500 font-medium">{rowErr.giaBan}</p>
                        )}

                        {isPriceBelowOrEqualImport && (
                          <p className="mt-1.5 flex items-start gap-1 text-[11px] font-medium text-orange-600">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-orange-500 mt-0.5" />
                            <span>Giá bán đang thấp hơn hoặc bằng giá nhập</span>
                          </p>
                        )}
                      </td>

                      {/* Cột 5: Tồn kho hiện tại (chỉ đọc) */}
                      <td className="py-3.5 px-4 text-center">
                        <div
                          className={`inline-flex items-center justify-center min-w-[64px] px-3 py-1.5 rounded-lg border text-xs font-bold ${
                            tonKhoNum > 10
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : tonKhoNum > 0
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {tonKhoNum}
                        </div>
                        <p className="mt-1 text-[10px] leading-tight text-slate-400">
                          Chỉ cập nhật qua phiếu nhập kho
                        </p>
                      </td>

                      {/* Cột 6: Hành động Xóa */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(variant.localId)}
                          disabled={cannotDelete}
                          className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title={
                            variants.length <= 1
                              ? 'Sản phẩm phải có ít nhất 1 biến thể'
                              : tonKhoNum > 0
                              ? 'Không thể xóa biến thể đang còn tồn kho'
                              : 'Xóa biến thể này'
                          }
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
        </div>

        {/* ── ROW 3: Thông số kỹ thuật động (Dynamic Specs) ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-500" />
                Thông số kỹ thuật động (Dynamic Specs)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Phân loại thông số theo từng Nhóm (Màn hình, Hiệu năng, Pin &amp; Sạc, Camera...)
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddGroup}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl text-sm font-semibold text-violet-700 transition-all duration-200 shadow-sm shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm nhóm thông số
            </button>
          </div>

          {specGroups.length === 0 ? (
            <div className="text-center py-14 border-2 border-dashed border-slate-200 rounded-2xl space-y-4">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500">Chưa có nhóm thông số nào được tạo.</p>
              <button
                type="button"
                onClick={handleAddGroup}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-sky-600 text-sm font-semibold rounded-xl border border-slate-200 transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tạo nhóm thông số đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {specGroups.map((group, gIdx) => (
                <div
                  key={group.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 transition-all duration-200 hover:border-slate-300 shadow-sm"
                >
                  {/* Header Nhóm */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex-1 flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-violet-100 border border-violet-200 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {gIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) => handleGroupChange(group.id, e.target.value)}
                        placeholder="Màn hình, Pin & Sạc, Camera..."
                        className="flex-1 min-w-0 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all placeholder-slate-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(group.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all duration-200 shrink-0 cursor-pointer"
                      title="Xóa nhóm thông số này"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Danh sách dòng thông số */}
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                      >
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(group.id, item.id, 'name', e.target.value)}
                          placeholder="Kích thước, RAM..."
                          className="sm:col-span-4 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all"
                        />

                        <textarea
                          value={item.value}
                          onChange={(e) => handleItemChange(group.id, item.id, 'value', e.target.value)}
                          placeholder="6.7 inch Super Retina XDR"
                          rows={2}
                          className="sm:col-span-7 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all resize-none"
                        />

                        <div className="sm:col-span-1 flex justify-center sm:justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(group.id, item.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all duration-200 shrink-0 cursor-pointer"
                            title="Xóa dòng thông số này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Nút Thêm dòng */}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleAddItem(group.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 py-1.5 px-3 rounded-lg hover:bg-sky-50 transition-all duration-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm dòng thông số
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* ── Modal Confirmation: Unsaved Changes Guard ── */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Xác nhận rời khỏi trang</h3>
                <p className="text-xs text-slate-500">Dữ liệu vừa nhập chưa được lưu</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-700">
              Bạn có chắc chắn muốn rời khỏi trang không? Mọi thay đổi chưa lưu sẽ bị mất hoàn toàn.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
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
