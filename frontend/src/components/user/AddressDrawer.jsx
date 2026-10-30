import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Loader2, MapPin, Tag, Check, AlertCircle } from 'lucide-react';
import addressService from '../../services/addressService';
import toast from 'react-hot-toast';

/**
 * AddressDrawer — Drawer trượt từ Phải sang Trái (300ms) kèm backdrop mờ.
 * Quản lý thêm mới và chỉnh sửa địa chỉ giao hàng.
 *
 * Props:
 *  - isOpen        {boolean}   : Trạng thái mở/đóng drawer
 *  - onClose       {function}  : Callback khi đóng drawer
 *  - onSubmit      {function}  : Callback khi submit form (nhận addressData, isEdit)
 *  - initialData   {Object}    : Dữ liệu địa chỉ đang chỉnh sửa (null nếu thêm mới)
 *  - isSubmitting  {boolean}   : Trạng thái đang lưu dữ liệu
 */
const AddressDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animating, setAnimating] = useState(false);

  // Danh sách Tỉnh/Thành và Phường/Xã từ Open API
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Form State
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedProvinceName, setSelectedProvinceName] = useState('');
  const [selectedWardName, setSelectedWardName] = useState('');
  const [specificAddress, setSpecificAddress] = useState('');
  const [addressType, setAddressType] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState({});

  const isEdit = Boolean(initialData && initialData.MaDiaChi);

  // Gợi ý nhanh cho Loại địa chỉ
  const QUICK_TAGS = ['Nhà riêng', 'Cơ quan', 'Văn phòng', 'Chung cư'];

  // 1. Quản lý Animation trượt 300ms và khóa cuộn body
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

  // Phím Escape để đóng Drawer
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

  // 2. Tải danh sách Tỉnh/Thành phố khi mở Drawer
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

  // 3. Khởi tạo dữ liệu form khi mở Drawer (Thêm mới hoặc Sửa)
  useEffect(() => {
    if (!isOpen) return;

    setErrors({});

    if (initialData) {
      setSpecificAddress(initialData.DiaChiNha || '');
      setAddressType(initialData.TenGoiNho || '');
      setIsDefault(Boolean(initialData.LaMacDinh));

      const targetProvinceName = initialData.TinhThanh || '';
      const targetWardName = initialData.PhuongXa || '';

      if (targetProvinceName && provinces.length > 0) {
        const found = provinces.find(
          (p) => p.name.trim().toLowerCase() === targetProvinceName.trim().toLowerCase()
        );
        if (found) {
          setSelectedProvinceCode(String(found.code));
          setSelectedProvinceName(found.name);

          // Tải danh sách phường xã cho tỉnh đó
          setLoadingDistricts(true);
          addressService
            .getDistrictsByProvince(found.code)
            .then((districtList) => {
              setDistricts(districtList || []);
              setSelectedWardName(targetWardName);
            })
            .catch((err) => {
              console.error('Lỗi khi tải quận huyện:', err);
            })
            .finally(() => {
              setLoadingDistricts(false);
            });
        } else {
          setSelectedProvinceName(targetProvinceName);
          setSelectedWardName(targetWardName);
        }
      } else {
        setSelectedProvinceName(targetProvinceName);
        setSelectedWardName(targetWardName);
      }
    } else {
      // Chế độ thêm mới -> Reset toàn bộ form
      setSelectedProvinceCode('');
      setSelectedProvinceName('');
      setSelectedWardName('');
      setSpecificAddress('');
      setAddressType('');
      setIsDefault(false);
      setDistricts([]);
    }
  }, [isOpen, initialData, provinces]);

  // 4. Xử lý khi người dùng chọn Tỉnh/Thành phố
  const handleProvinceChange = async (e) => {
    const code = e.target.value;
    setSelectedProvinceCode(code);
    setSelectedWardName(''); // Reset phường/xã khi đổi tỉnh
    setErrors((prev) => ({ ...prev, province: null, ward: null }));

    if (!code) {
      setSelectedProvinceName('');
      setDistricts([]);
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
      console.error('Lỗi tải danh sách phường xã:', err);
      toast.error('Không thể tải danh sách Phường/Xã cho khu vực này');
      setDistricts([]);
    } finally {
      setLoadingDistricts(false);
    }
  };

  // 5. Xử lý khi người dùng chọn Phường/Xã
  const handleWardChange = (e) => {
    setSelectedWardName(e.target.value);
    setErrors((prev) => ({ ...prev, ward: null }));
  };

  // 6. Xử lý submit form
  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!selectedProvinceName.trim()) {
      newErrors.province = 'Vui lòng chọn Tỉnh / Thành phố';
    }
    if (!selectedWardName.trim()) {
      newErrors.ward = 'Vui lòng chọn Phường / Xã';
    }
    if (!specificAddress.trim()) {
      newErrors.specificAddress = 'Vui lòng nhập địa chỉ cụ thể';
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
      QuanHuyen: '', // QuanHuyen nếu có thể để trống hoặc map từ open-api
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
      aria-labelledby="address-drawer-title"
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

      {/* ── Container Drawer Slide-in từ Phải sang Trái ── */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <div
          className={`w-screen max-w-md bg-white shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 ease-in-out ${
            animating ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* ── Header: h1 "Thêm mới địa chỉ" + Nút X (kèm border-b) ── */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 shrink-0 bg-white">
            <h1
              id="address-drawer-title"
              className="text-lg font-bold text-slate-800 tracking-tight"
            >
              {isEdit ? 'Chỉnh sửa địa chỉ' : 'Thêm mới địa chỉ'}
            </h1>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Đóng bảng địa chỉ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Form Body (Cuộn nội dung độc lập) ── */}
          <form
            id="address-drawer-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
          >
            {/* ── Form 1 - "Địa chỉ nhận hàng" (kèm border-b) ── */}
            <div className="space-y-4 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Địa chỉ nhận hàng
                </h2>
              </div>

              {/* Dropdown Tỉnh/Thành phố */}
              <div className="space-y-1.5">
                <label
                  htmlFor="drawer-province"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Tỉnh / Thành phố <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="drawer-province"
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

              {/* Dropdown Phường/Xã (Mặc định disabled) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="drawer-ward"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Phường / Xã <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="drawer-ward"
                    value={selectedWardName}
                    onChange={handleWardChange}
                    disabled={!selectedProvinceCode || loadingDistricts || isSubmitting}
                    className={`w-full appearance-none bg-white border rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 transition-all ${
                      errors.ward
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                    } disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer`}
                  >
                    <option value="">
                      {!selectedProvinceCode
                        ? 'Vui lòng chọn Tỉnh/Thành phố trước'
                        : loadingDistricts
                        ? 'Đang tải danh sách phường xã...'
                        : '-- Chọn Phường / Xã --'}
                    </option>
                    {districts.map((d) => (
                      <option key={d.code} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    {loadingDistricts ? (
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

              {/* Input "Địa chỉ cụ thể" */}
              <div className="space-y-1.5">
                <label
                  htmlFor="drawer-specific-address"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Địa chỉ cụ thể <span className="text-red-500">*</span>
                </label>
                <input
                  id="drawer-specific-address"
                  type="text"
                  value={specificAddress}
                  onChange={(e) => {
                    setSpecificAddress(e.target.value);
                    if (errors.specificAddress) {
                      setErrors((prev) => ({ ...prev, specificAddress: null }));
                    }
                  }}
                  disabled={isSubmitting}
                  placeholder="Số nhà, tên toà nhà, tên ngõ, tên đường..."
                  className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.specificAddress
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                  } disabled:bg-slate-50`}
                />
                {errors.specificAddress && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.specificAddress}
                  </p>
                )}
              </div>
            </div>

            {/* ── Form 2 - "Loại địa chỉ" (kèm border-b) ── */}
            <div className="space-y-3 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Loại địa chỉ
                </h2>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="drawer-address-type"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Tên gợi nhớ (VD: Nhà riêng, Cơ quan)
                </label>
                <input
                  id="drawer-address-type"
                  type="text"
                  value={addressType}
                  onChange={(e) => setAddressType(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="VD: Nhà riêng, Cơ quan, Văn phòng..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-50"
                />

                {/* Quick suggestion pills */}
                <div className="flex items-center flex-wrap gap-2 pt-1">
                  {QUICK_TAGS.map((tag) => {
                    const isSelected = addressType.trim().toLowerCase() === tag.toLowerCase();
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setAddressType(tag)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Div 3 - "Đặt làm địa chỉ mặc định" ── */}
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-sm font-semibold text-slate-800 block">
                  Đặt làm địa chỉ mặc định
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Ưu tiên sử dụng địa chỉ này cho các đơn hàng tiếp theo
                </span>
              </div>

              {/* Nút bật/tắt (Switch Toggle) bên phải (Mặc định OFF) */}
              <button
                type="button"
                role="switch"
                aria-checked={isDefault}
                onClick={() => setIsDefault(!isDefault)}
                disabled={isSubmitting}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 ${
                  isDefault ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span className="sr-only">Đặt làm địa chỉ mặc định</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isDefault ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </form>

          {/* ── Nút bấm "XÁC NHẬN" màu xanh full-width ở cuối ── */}
          <div className="p-5 border-t border-slate-200 bg-white shrink-0">
            <button
              type="submit"
              form="address-drawer-form"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ĐANG XỬ LÝ...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>XÁC NHẬN</span>
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

export default AddressDrawer;

