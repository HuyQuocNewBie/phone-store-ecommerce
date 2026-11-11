import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Loader2, MapPin, Tag, Check, AlertCircle, Building2, Home } from 'lucide-react';
import addressService from '../../services/addressService';
import toast from 'react-hot-toast';

/**
 * AddressModal — Modal / Drawer popup thêm mới và chỉnh sửa địa chỉ giao hàng.
 * Hỗ trợ chọn 3 cấp hành chính chuẩn Việt Nam:
 * Tỉnh / Thành phố -> Quận / Huyện -> Phường / Xã
 *
 * Props:
 *  - isOpen        {boolean}   : Trạng thái hiển thị modal
 *  - onClose       {function}  : Callback khi đóng modal
 *  - onSubmit      {function}  : Callback khi submit form (payload, editId)
 *  - initialData   {Object}    : Dữ liệu địa chỉ đang chỉnh sửa (null nếu thêm mới)
 *  - isSubmitting  {boolean}   : Trạng thái đang lưu dữ liệu
 */
const AddressModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animating, setAnimating] = useState(false);

  // Danh sách 3 cấp hành chính từ Open API
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  // Trạng thái tải dữ liệu
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // Form State: 3 cấp hành chính
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedProvinceName, setSelectedProvinceName] = useState('');

  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
  const [selectedDistrictName, setSelectedDistrictName] = useState('');

  const [selectedWardCode, setSelectedWardCode] = useState('');
  const [selectedWardName, setSelectedWardName] = useState('');

  // Form State: Thông tin khác
  const [specificAddress, setSpecificAddress] = useState('');
  const [addressType, setAddressType] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState({});

  const isEdit = Boolean(initialData && initialData.MaDiaChi);

  // Gợi ý nhanh cho Loại địa chỉ
  const QUICK_TAGS = ['Nhà riêng', 'Cơ quan', 'Văn phòng', 'Chung cư'];

  // Helper chuẩn hóa so sánh chuỗi tên địa danh
  const normalizeLocationName = (str) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^(tinh|thanh pho|tp\.|tp|quan|huyen|thi xa|tx|phuong|xa|thi tran|tt)\s+/i, '')
      .trim();

  // 1. Quản lý Animation trượt mượt và khóa cuộn body
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => setAnimating(true), 20);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      setAnimating(false);
      document.body.style.overflow = '';
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Đóng modal bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  // 2. Tải danh sách Tỉnh/Thành phố khi mở Modal
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setLoadingProvinces(true);
      addressService
        .getProvinces()
        .then((data) => {
          if (isMounted) {
            setProvinces(data || []);
          }
        })
        .catch((err) => {
          console.error('Lỗi khi tải danh sách tỉnh thành:', err);
          toast.error('Không thể tải danh sách Tỉnh/Thành phố. Vui lòng thử lại!');
        })
        .finally(() => {
          if (isMounted) setLoadingProvinces(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // 3. Khởi tạo dữ liệu form khi mở Modal (Thêm mới hoặc Chỉnh sửa)
  useEffect(() => {
    if (!isOpen) return;

    setErrors({});

    if (initialData) {
      setSpecificAddress(initialData.DiaChiNha || '');
      setAddressType(initialData.TenGoiNho || 'Nhà riêng');
      setIsDefault(Boolean(initialData.LaMacDinh));

      const targetProvinceName = initialData.TinhThanh || '';
      const targetDistrictName = initialData.QuanHuyen || '';
      const targetWardName = initialData.PhuongXa || '';

      if (targetProvinceName && provinces.length > 0) {
        const normTargetProv = normalizeLocationName(targetProvinceName);
        const foundProv = provinces.find(
          (p) =>
            p.name.trim().toLowerCase() === targetProvinceName.trim().toLowerCase() ||
            normalizeLocationName(p.name) === normTargetProv
        );

        if (foundProv) {
          setSelectedProvinceCode(String(foundProv.code));
          setSelectedProvinceName(foundProv.name);

          // Tải danh sách Quận/Huyện
          setLoadingDistricts(true);
          addressService
            .getDistrictsByProvince(foundProv.code)
            .then(async (districtList) => {
              const dList = districtList || [];
              setDistricts(dList);

              if (targetDistrictName && dList.length > 0) {
                const normTargetDist = normalizeLocationName(targetDistrictName);
                const foundDist = dList.find(
                  (d) =>
                    d.name.trim().toLowerCase() === targetDistrictName.trim().toLowerCase() ||
                    normalizeLocationName(d.name) === normTargetDist
                );

                if (foundDist) {
                  setSelectedDistrictCode(String(foundDist.code));
                  setSelectedDistrictName(foundDist.name);

                  // Tải danh sách Phường/Xã
                  setLoadingWards(true);
                  try {
                    const wardList = await addressService.getWardsByDistrict(foundDist.code);
                    const wList = wardList || [];
                    setWards(wList);

                    if (targetWardName && wList.length > 0) {
                      const normTargetWard = normalizeLocationName(targetWardName);
                      const foundWard = wList.find(
                        (w) =>
                          w.name.trim().toLowerCase() === targetWardName.trim().toLowerCase() ||
                          normalizeLocationName(w.name) === normTargetWard
                      );
                      if (foundWard) {
                        setSelectedWardCode(String(foundWard.code));
                        setSelectedWardName(foundWard.name);
                      } else {
                        setSelectedWardName(targetWardName);
                      }
                    } else {
                      setSelectedWardName(targetWardName);
                    }
                  } catch (err) {
                    console.error('Lỗi khi tải phường xã ban đầu:', err);
                    setSelectedWardName(targetWardName);
                  } finally {
                    setLoadingWards(false);
                  }
                } else {
                  setSelectedDistrictName(targetDistrictName);
                  setSelectedWardName(targetWardName);
                }
              } else {
                setSelectedDistrictName(targetDistrictName);
                setSelectedWardName(targetWardName);
              }
            })
            .catch((err) => {
              console.error('Lỗi khi tải quận huyện ban đầu:', err);
              setSelectedDistrictName(targetDistrictName);
              setSelectedWardName(targetWardName);
            })
            .finally(() => {
              setLoadingDistricts(false);
            });
        } else {
          setSelectedProvinceName(targetProvinceName);
          setSelectedDistrictName(targetDistrictName);
          setSelectedWardName(targetWardName);
        }
      } else {
        setSelectedProvinceName(targetProvinceName);
        setSelectedDistrictName(targetDistrictName);
        setSelectedWardName(targetWardName);
      }
    } else {
      // Chế độ thêm mới -> Reset toàn bộ form
      setSelectedProvinceCode('');
      setSelectedProvinceName('');
      setSelectedDistrictCode('');
      setSelectedDistrictName('');
      setSelectedWardCode('');
      setSelectedWardName('');
      setSpecificAddress('');
      setAddressType('Nhà riêng');
      setIsDefault(false);
      setDistricts([]);
      setWards([]);
    }
  }, [isOpen, initialData, provinces]);

  // 4. Xử lý khi người dùng chọn Tỉnh / Thành phố
  const handleProvinceChange = async (e) => {
    const code = e.target.value;
    setSelectedProvinceCode(code);
    setSelectedDistrictCode('');
    setSelectedDistrictName('');
    setSelectedWardCode('');
    setSelectedWardName('');
    setDistricts([]);
    setWards([]);
    setErrors((prev) => ({ ...prev, province: null, district: null, ward: null }));

    if (!code) {
      setSelectedProvinceName('');
      return;
    }

    const found = provinces.find((p) => String(p.code) === String(code));
    const provName = found ? found.name : '';
    setSelectedProvinceName(provName);

    setLoadingDistricts(true);
    try {
      const data = await addressService.getDistrictsByProvince(code);
      setDistricts(data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách Quận / Huyện:', err);
      toast.error('Không thể tải danh sách Quận/Huyện cho khu vực này');
      setDistricts([]);
    } finally {
      setLoadingDistricts(false);
    }
  };

  // 5. Xử lý khi người dùng chọn Quận / Huyện
  const handleDistrictChange = async (e) => {
    const code = e.target.value;
    setSelectedDistrictCode(code);
    setSelectedWardCode('');
    setSelectedWardName('');
    setWards([]);
    setErrors((prev) => ({ ...prev, district: null, ward: null }));

    if (!code) {
      setSelectedDistrictName('');
      return;
    }

    const found = districts.find((d) => String(d.code) === String(code));
    const distName = found ? found.name : '';
    setSelectedDistrictName(distName);

    setLoadingWards(true);
    try {
      const data = await addressService.getWardsByDistrict(code);
      setWards(data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách Phường / Xã:', err);
      toast.error('Không thể tải danh sách Phường/Xã cho khu vực này');
      setWards([]);
    } finally {
      setLoadingWards(false);
    }
  };

  // 6. Xử lý khi người dùng chọn Phường / Xã
  const handleWardChange = (e) => {
    const val = e.target.value;
    const found = wards.find((w) => String(w.code) === String(val) || w.name === val);
    setSelectedWardCode(found ? String(found.code) : val);
    setSelectedWardName(found ? found.name : val);
    setErrors((prev) => ({ ...prev, ward: null }));
  };

  // 7. Xử lý submit form
  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!selectedProvinceName.trim()) {
      newErrors.province = 'Vui lòng chọn Tỉnh / Thành phố';
    }
    if (!selectedDistrictName.trim()) {
      newErrors.district = 'Vui lòng chọn Quận / Huyện';
    }
    if (!selectedWardName.trim()) {
      newErrors.ward = 'Vui lòng chọn Phường / Xã';
    }
    if (!specificAddress.trim()) {
      newErrors.specificAddress = 'Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường)';
    } else if (specificAddress.trim().length < 5) {
      newErrors.specificAddress = 'Địa chỉ cụ thể quá ngắn (tối thiểu 5 ký tự)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Vui lòng kiểm tra lại các trường thông tin bắt buộc!');
      return;
    }

    const payload = {
      TenGoiNho: addressType.trim() || 'Nhà riêng',
      TinhThanh: selectedProvinceName.trim(),
      QuanHuyen: selectedDistrictName.trim(),
      PhuongXa: selectedWardName.trim(),
      DiaChiNha: specificAddress.trim(),
      LaMacDinh: isDefault ? 1 : 0,
    };

    if (onSubmit) {
      onSubmit(payload, isEdit ? initialData.MaDiaChi : null);
    }
  };

  if (!shouldRender) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="address-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* ── Backdrop mờ trượt mượt 300ms ── */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          animating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      {/* ── Container Modal / Drawer Slide-in từ Phải sang Trái ── */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <div
          className={`w-screen max-w-md bg-white shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 ease-in-out ${
            animating ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* ── Header: Tiêu đề + Nút Đóng (X) ── */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <h2
                id="address-modal-title"
                className="text-lg font-bold text-slate-800 tracking-tight"
              >
                {isEdit ? 'Chỉnh sửa địa chỉ' : 'Thêm mới địa chỉ'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Form Body (Cuộn nội dung độc lập) ── */}
          <form
            id="address-modal-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
          >
            {/* ── KHỐI 1: Cụm 3 cấp hành chính chuẩn MySQL sodiachi ── */}
            <div className="space-y-4 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Khu vực giao hàng (3 cấp hành chính)
                </h3>
              </div>

              {/* Cấp 1: Dropdown Tỉnh / Thành phố */}
              <div className="space-y-1.5">
                <label
                  htmlFor="modal-province"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Tỉnh / Thành phố <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="modal-province"
                    value={selectedProvinceCode}
                    onChange={handleProvinceChange}
                    disabled={loadingProvinces || isSubmitting}
                    className={`w-full appearance-none bg-white border rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 transition-all ${
                      errors.province
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                    } disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer`}
                  >
                    <option value="">
                      {loadingProvinces
                        ? 'Đang tải danh sách tỉnh thành...'
                        : '-- Chọn Tỉnh / Thành phố --'}
                    </option>
                    {provinces.map((prov) => (
                      <option key={prov.code} value={prov.code}>
                        {prov.name}
                      </option>
                    ))}
                    {selectedProvinceName &&
                      !provinces.some((p) => String(p.code) === String(selectedProvinceCode)) && (
                        <option value={selectedProvinceCode || 'custom'}>
                          {selectedProvinceName}
                        </option>
                      )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    {loadingProvinces ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
                {errors.province && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.province}
                  </p>
                )}
              </div>

              {/* Cấp 2: Dropdown Quận / Huyện (nằm giữa Tỉnh/Thành phố và Phường/Xã) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="modal-district"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Quận / Huyện <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="modal-district"
                    value={selectedDistrictCode}
                    onChange={handleDistrictChange}
                    disabled={!selectedProvinceName || loadingDistricts || isSubmitting}
                    className={`w-full appearance-none bg-white border rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 transition-all ${
                      errors.district
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                    } disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer`}
                  >
                    <option value="">
                      {!selectedProvinceName
                        ? 'Vui lòng chọn Tỉnh / Thành phố trước'
                        : loadingDistricts
                        ? 'Đang tải danh sách Quận / Huyện...'
                        : '-- Chọn Quận / Huyện --'}
                    </option>
                    {districts.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                    {selectedDistrictName &&
                      !districts.some((d) => String(d.code) === String(selectedDistrictCode)) && (
                        <option value={selectedDistrictCode || 'custom'}>
                          {selectedDistrictName}
                        </option>
                      )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    {loadingDistricts ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
                {errors.district && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.district}
                  </p>
                )}
              </div>

              {/* Cấp 3: Dropdown Phường / Xã */}
              <div className="space-y-1.5">
                <label
                  htmlFor="modal-ward"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Phường / Xã <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="modal-ward"
                    value={selectedWardCode || selectedWardName}
                    onChange={handleWardChange}
                    disabled={!selectedDistrictName || loadingWards || isSubmitting}
                    className={`w-full appearance-none bg-white border rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 transition-all ${
                      errors.ward
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                    } disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer`}
                  >
                    <option value="">
                      {!selectedDistrictName
                        ? 'Vui lòng chọn Quận / Huyện trước'
                        : loadingWards
                        ? 'Đang tải danh sách Phường / Xã...'
                        : '-- Chọn Phường / Xã --'}
                    </option>
                    {wards.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.name}
                      </option>
                    ))}
                    {selectedWardName &&
                      !wards.some(
                        (w) =>
                          String(w.code) === String(selectedWardCode) || w.name === selectedWardName
                      ) && (
                        <option value={selectedWardCode || selectedWardName}>
                          {selectedWardName}
                        </option>
                      )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    {loadingWards ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
                {errors.ward && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.ward}
                  </p>
                )}
              </div>

              {/* Input "Địa chỉ cụ thể" (Số nhà, tên đường) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="modal-specific-address"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Địa chỉ cụ thể (Số nhà, tên đường) <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal-specific-address"
                  type="text"
                  value={specificAddress}
                  onChange={(e) => {
                    setSpecificAddress(e.target.value);
                    if (errors.specificAddress) {
                      setErrors((prev) => ({ ...prev, specificAddress: null }));
                    }
                  }}
                  disabled={isSubmitting}
                  placeholder="Ví dụ: 123 Đường Lê Lợi, Tòa nhà Bitexco..."
                  className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.specificAddress
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                  } disabled:bg-slate-50 disabled:text-slate-400`}
                />
                {errors.specificAddress && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.specificAddress}
                  </p>
                )}
              </div>
            </div>

            {/* ── KHỐI 2: Loại địa chỉ & Thiết lập mặc định ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Thông tin gợi nhớ
                </h3>
              </div>

              {/* Loại địa chỉ với Chip nhanh */}
              <div className="space-y-2">
                <label
                  htmlFor="modal-address-type"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Tên gợi nhớ / Loại địa chỉ
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TAGS.map((tag) => {
                    const isSelected = addressType.trim().toLowerCase() === tag.toLowerCase();
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setAddressType(tag)}
                        disabled={isSubmitting}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 active:bg-slate-300'
                        } disabled:opacity-50`}
                      >
                        {tag === 'Nhà riêng' && <Home className="w-3.5 h-3.5" />}
                        {tag === 'Cơ quan' && <Building2 className="w-3.5 h-3.5" />}
                        {tag === 'Văn phòng' && <Building2 className="w-3.5 h-3.5" />}
                        {tag === 'Chung cư' && <Home className="w-3.5 h-3.5" />}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
                <input
                  id="modal-address-type"
                  type="text"
                  value={addressType}
                  onChange={(e) => setAddressType(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Hoặc tự nhập tên (VD: Quê nội, Cửa hàng 2...)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-50 mt-1"
                />
              </div>

              {/* Checkbox Đặt làm mặc định */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors select-none">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  disabled={isSubmitting || (isEdit && initialData?.LaMacDinh)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block">
                    Đặt làm địa chỉ nhận hàng mặc định
                  </span>
                  <span className="text-slate-500 mt-0.5 block">
                    {isEdit && initialData?.LaMacDinh
                      ? 'Đây đang là địa chỉ mặc định của bạn'
                      : 'Hệ thống sẽ tự động ưu tiên địa chỉ này khi bạn đặt hàng'}
                  </span>
                </div>
              </label>
            </div>
          </form>

          {/* ── Footer Nút Bấm Thao tác (kèm border-t) ── */}
          <div className="p-5 sm:p-6 border-t border-slate-200 bg-slate-50/60 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="address-modal-form"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEdit ? 'Lưu thay đổi' : 'Thêm địa chỉ'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddressModal;

