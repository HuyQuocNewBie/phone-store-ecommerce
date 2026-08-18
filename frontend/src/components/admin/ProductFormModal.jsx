import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Layers, Image as ImageIcon, Upload, DollarSign, Package, FileText, Check } from 'lucide-react';

/**
 * ProductFormModal
 * Modal Thêm / Sửa Sản phẩm tích hợp Form Thông số kỹ thuật động (Dynamic Specs UI).
 */
const ProductFormModal = ({ isOpen, onClose, onSubmit, initialData = null, isSubmitting = false }) => {
  // ─── Form Fields State ────────────────────────────────────────────────────────
  const [tenSanPham, setTenSanPham] = useState('');
  const [gia, setGia] = useState('');
  const [tonKho, setTonKho] = useState('');
  const [imageMode, setImageMode] = useState('file'); // 'file' | 'url'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');

  // ─── Dynamic Specs Groups State ──────────────────────────────────────────────
  // Cấu trúc: [{ id: 'g_1', name: 'Màn hình', items: [{ id: 'i_1', name: 'Kích thước', value: '6.7 inch' }] }]
  const [specGroups, setSpecGroups] = useState([]);

  // ─── Form Validation Errors State ────────────────────────────────────────────
  const [errors, setErrors] = useState({});

  // ─── Helper: Un-flatten mảng thông số từ backend (Edit Mode) ────────────────
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

  // ─── Đồng bộ state khi mở modal hoặc thay đổi initialData ─────────────────────
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (initialData) {
        // Edit Mode
        setTenSanPham(initialData.TenSanPham || '');
        setGia(initialData.Gia !== undefined ? String(initialData.Gia) : '');
        setTonKho(initialData.TonKho !== undefined ? String(initialData.TonKho) : '0');

        const existingImg = initialData.Anh || '';
        setImagePreview(existingImg);
        setImageUrlInput(existingImg);
        setImageFile(null);
        setImageMode(existingImg.startsWith('data:') || existingImg.startsWith('blob:') || !existingImg.startsWith('http') ? 'file' : 'url');

        // Un-flatten thongsokythuat
        const parsedGroups = groupSpecsByNhom(initialData.thongsokythuat);
        setSpecGroups(parsedGroups);
      } else {
        // Create Mode
        setTenSanPham('');
        setGia('');
        setTonKho('0');
        setImageFile(null);
        setImagePreview('');
        setImageUrlInput('');
        setImageMode('file');
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
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // ─── Image Handling ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleUrlInputChange = (e) => {
    const url = e.target.value;
    setImageUrlInput(url);
    setImagePreview(url);
  };

  // ─── Dynamic Specs Operations ────────────────────────────────────────────────
  // 1. Thêm Nhóm thông số mới
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
  };

  // 2. Xóa toàn bộ 1 Nhóm thông số
  const handleRemoveGroup = (groupId) => {
    setSpecGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // 3. Cập nhật Tên Nhóm thông số
  const handleGroupChange = (groupId, newName) => {
    setSpecGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name: newName } : g))
    );
  };

  // 4. Thêm 1 dòng thông số mới vào Nhóm
  const handleAddItem = (groupId) => {
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: '',
      value: ''
    };
    setSpecGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, items: [...g.items, newItem] } : g))
    );
  };

  // 5. Xóa 1 dòng thông số khỏi Nhóm
  const handleRemoveItem = (groupId, itemId) => {
    setSpecGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return { ...g, items: g.items.filter((item) => item.id !== itemId) };
        }
        return g;
      })
    );
  };

  // 6. Cập nhật dòng thông số (TenThongSo hoặc GiaTri)
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
  };

  // ─── Form Validation & Submit ────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};

    if (!tenSanPham.trim()) {
      newErrors.tenSanPham = 'Tên sản phẩm không được để trống';
    }

    const numGia = Number(gia);
    if (!gia || isNaN(numGia) || numGia <= 0) {
      newErrors.gia = 'Giá sản phẩm phải là số và lớn hơn 0';
    }

    const numTonKho = Number(tonKho);
    if (tonKho === '' || isNaN(numTonKho) || numTonKho < 0) {
      newErrors.tonKho = 'Tồn kho phải là số và lớn hơn hoặc bằng 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Flatten mảng thông số để chuẩn bị gửi Backend
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
    formData.append('TonKho', tonKho);

    if (imageFile) {
      formData.append('file', imageFile);
      formData.append('Anh', imageFile); // fallback key
    } else if (imageMode === 'url' && imageUrlInput.trim()) {
      formData.append('Anh', imageUrlInput.trim());
    } else if (initialData?.Anh) {
      formData.append('Anh', initialData.Anh);
    }

    formData.append('thongsokythuat', JSON.stringify(flatSpecs));

    onSubmit(formData, {
      TenSanPham: tenSanPham.trim(),
      Gia: Number(gia),
      TonKho: Number(tonKho),
      Anh: imageFile ? imagePreview : (imageUrlInput || initialData?.Anh || null),
      thongsokythuat: flatSpecs
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              {initialData ? <FileText className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {initialData ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
              <p className="text-xs text-slate-400">
                {initialData ? `Mã SP: #${initialData.MaSanPham}` : 'Nhập thông tin sản phẩm và thông số kỹ thuật'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Form Body (Scrollable) ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Thông tin cơ bản */}
          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-sky-400" />
              Thông tin chung
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tên sản phẩm */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tên sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={tenSanPham}
                  onChange={(e) => setTenSanPham(e.target.value)}
                  placeholder="Nhập tên sản phẩm (VD: iPhone 15 Pro Max 256GB)"
                  className={`w-full px-3.5 py-2.5 bg-slate-900 border ${
                    errors.tenSanPham ? 'border-rose-500/70 focus:ring-rose-500/20' : 'border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'
                  } rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                />
                {errors.tenSanPham && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{errors.tenSanPham}</p>
                )}
              </div>

              {/* Giá */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Giá (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    value={gia}
                    onChange={(e) => setGia(e.target.value)}
                    placeholder="VD: 29990000"
                    min="0"
                    step="1000"
                    className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border ${
                      errors.gia ? 'border-rose-500/70 focus:ring-rose-500/20' : 'border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'
                    } rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                  />
                </div>
                {errors.gia && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{errors.gia}</p>
                )}
              </div>

              {/* Tồn kho */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Số lượng tồn kho <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={tonKho}
                  onChange={(e) => setTonKho(e.target.value)}
                  placeholder="VD: 50"
                  min="0"
                  className={`w-full px-3.5 py-2.5 bg-slate-900 border ${
                    errors.tonKho ? 'border-rose-500/70 focus:ring-rose-500/20' : 'border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'
                  } rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                />
                {errors.tonKho && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{errors.tonKho}</p>
                )}
              </div>
            </div>

            {/* Upload / Chọn Ảnh Đại Diện */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Ảnh đại diện sản phẩm
              </label>

              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setImageMode('file')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    imageMode === 'file'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-slate-200'
                  }`}
                >
                  Tải ảnh từ máy
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    imageMode === 'url'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-slate-200'
                  }`}
                >
                  Nhập Đường dẫn (URL)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="sm:col-span-2">
                  {imageMode === 'file' ? (
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-700 hover:border-sky-500/50 rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-all group">
                      <div className="flex flex-col items-center justify-center py-3 text-center px-4">
                        <Upload className="w-6 h-6 text-slate-500 group-hover:text-sky-400 transition-colors mb-1.5" />
                        <p className="text-xs text-slate-400">
                          <span className="font-semibold text-sky-400">Tải tệp lên</span> hoặc kéo thả vào đây
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">PNG, JPG, WEBP hoặc GIF</p>
                      </div>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  ) : (
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={handleUrlInputChange}
                      placeholder="https://example.com/images/iphone15.jpg"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                    />
                  )}
                </div>

                {/* Preview Thumbnail */}
                <div className="flex items-center justify-center sm:justify-start">
                  {imagePreview ? (
                    <div className="relative group w-24 h-24 rounded-xl border border-slate-700 bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://via.placeholder.com/150?text=Error';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview('');
                          setImageUrlInput('');
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-slate-950/80 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Xóa ảnh"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center text-slate-600">
                      <ImageIcon className="w-7 h-7 mb-1" />
                      <span className="text-[10px]">Chưa có ảnh</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Khu vực Thông số kỹ thuật động (Dynamic Specs UI) */}
          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-400" />
                  Thông số kỹ thuật động (Dynamic Specs)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tổ chức thông số theo các nhóm như Màn hình, Hiệu năng, Camera, Pin...
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddGroup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 rounded-xl text-xs font-semibold text-violet-300 hover:text-violet-200 transition-all shadow-sm shadow-violet-500/10"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm nhóm thông số
              </button>
            </div>

            {/* List các Nhóm thông số */}
            {specGroups.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">Chưa có nhóm thông số nào.</p>
                <button
                  type="button"
                  onClick={handleAddGroup}
                  className="mt-2 text-xs text-sky-400 font-medium hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Bấm vào đây để thêm nhóm mới
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {specGroups.map((group, gIdx) => (
                  <div
                    key={group.id}
                    className="relative bg-slate-900/90 border border-slate-700/60 rounded-xl p-4 space-y-3 transition-all hover:border-slate-600/80 shadow-lg shadow-slate-950/20"
                  >
                    {/* Header Nhóm */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center shrink-0">
                          {gIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => handleGroupChange(group.id, e.target.value)}
                          placeholder="Tên nhóm thông số (VD: Màn hình, Pin & Sạc...)"
                          className="w-full max-w-sm px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 font-semibold text-sm focus:outline-none focus:border-sky-500 transition-all placeholder-slate-500"
                        />
                      </div>

                      {/* Icon Close (x) ở góc nhóm để xóa cả nhóm */}
                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(group.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                        title="Xóa nhóm thông số này"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Danh sách các dòng cặp Tên thông số - Giá trị */}
                    <div className="space-y-2 pt-1">
                      {group.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 group/row">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(group.id, item.id, 'name', e.target.value)}
                            placeholder="Tên thông số (VD: Kích thước)"
                            className="flex-1 px-3 py-1.5 bg-slate-800/50 border border-slate-700/80 rounded-lg text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                          />

                          <span className="text-slate-600 text-xs font-bold">:</span>

                          <input
                            type="text"
                            value={item.value}
                            onChange={(e) => handleItemChange(group.id, item.id, 'value', e.target.value)}
                            placeholder="Giá trị (VD: 6.7 inch)"
                            className="flex-1 px-3 py-1.5 bg-slate-800/50 border border-slate-700/80 rounded-lg text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                          />

                          {/* Icon Trash ở cuối dòng để xóa 1 thông số */}
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
                        className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium py-1 px-2 rounded-lg hover:bg-sky-500/10 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm dòng
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Footer Action Buttons ── */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-slate-900/90 backdrop-blur py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{initialData ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm'}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default ProductFormModal;
