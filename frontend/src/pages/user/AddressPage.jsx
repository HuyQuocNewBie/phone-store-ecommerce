import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Home,
  Building,
  Phone,
  User,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const AddressPage = () => {
  const { user } = useAuth();

  const [addresses, setAddresses] = useState([
    {
      id: 1,
      name: user?.HoTen || user?.TaiKhoan || 'Nguyễn Văn A',
      phone: user?.SoDienThoai || '0987654321',
      address: user?.DiaChi || '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      isDefault: true,
      type: 'home', // 'home' | 'office'
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    type: 'home',
    isDefault: false,
  });

  const handleOpenModal = (addr = null) => {
    if (addr) {
      setEditingAddress(addr);
      setFormData({
        name: addr.name,
        phone: addr.phone,
        address: addr.address,
        type: addr.type,
        isDefault: addr.isDefault,
      });
    } else {
      setEditingAddress(null);
      setFormData({
        name: user?.HoTen || '',
        phone: user?.SoDienThoai || '',
        address: '',
        type: 'home',
        isDefault: addresses.length === 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAddress(null);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc!');
      return;
    }

    if (editingAddress) {
      setAddresses((prev) =>
        prev.map((item) => {
          if (item.id === editingAddress.id) {
            return {
              ...item,
              ...formData,
            };
          }
          if (formData.isDefault) {
            return { ...item, isDefault: false };
          }
          return item;
        })
      );
      toast.success('Cập nhật địa chỉ thành công!');
    } else {
      const newAddr = {
        id: Date.now(),
        ...formData,
      };
      setAddresses((prev) => {
        if (formData.isDefault) {
          return [...prev.map((a) => ({ ...a, isDefault: false })), newAddr];
        }
        return [...prev, newAddr];
      });
      toast.success('Thêm địa chỉ mới thành công!');
    }
    handleCloseModal();
  };

  const handleSetDefault = (id) => {
    setAddresses((prev) =>
      prev.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
      }))
    );
    toast.success('Đã đặt làm địa chỉ mặc định!');
  };

  const handleDelete = (id) => {
    const target = addresses.find((a) => a.id === id);
    if (target?.isDefault && addresses.length > 1) {
      toast.error('Vui lòng đặt địa chỉ khác làm mặc định trước khi xóa địa chỉ này!');
      return;
    }
    setAddresses((prev) => prev.filter((addr) => addr.id !== id));
    toast.success('Đã xóa địa chỉ!');
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="bg-white rounded-2xl border border-surface-container/60 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Sổ địa chỉ nhận hàng</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Quản lý danh sách địa chỉ giao nhận hàng của bạn để thanh toán nhanh hơn
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={16} />
          <span>Thêm địa chỉ mới</span>
        </button>
      </div>

      {/* ── Address List ── */}
      <div className="space-y-4">
        {addresses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-container/60 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <MapPin size={32} />
            </div>
            <h3 className="text-base font-semibold text-on-surface">Chưa có địa chỉ nào</h3>
            <p className="text-sm text-on-surface-variant mt-1 mb-6 max-w-sm mx-auto">
              Thêm địa chỉ nhận hàng để việc đặt hàng và giao nhận diễn ra nhanh chóng, chính xác.
            </p>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Plus size={16} />
              <span>Thêm địa chỉ ngay</span>
            </button>
          </div>
        ) : (
          addresses.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 transition-all shadow-sm ${
                item.isDefault
                  ? 'border-primary ring-1 ring-primary/20 bg-primary/[0.01]'
                  : 'border-surface-container/60 hover:border-outline/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center flex-wrap gap-2.5">
                    <span className="font-semibold text-on-surface text-base">{item.name}</span>
                    <span className="text-outline text-xs">•</span>
                    <span className="text-sm text-on-surface-variant flex items-center gap-1">
                      <Phone size={13} className="text-on-surface-variant/70" />
                      {item.phone}
                    </span>

                    {/* Tag Loại địa chỉ */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                        item.type === 'home'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.type === 'home' ? <Home size={11} /> : <Building size={11} />}
                      {item.type === 'home' ? 'Nhà riêng' : 'Văn phòng'}
                    </span>

                    {/* Badge Mặc định */}
                    {item.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle size={11} />
                        Mặc định
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-on-surface leading-relaxed flex items-start gap-1.5 pt-1">
                    <MapPin size={15} className="text-primary shrink-0 mt-0.5" />
                    <span>{item.address}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(item)}
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors"
                    title="Chỉnh sửa địa chỉ"
                  >
                    <Edit2 size={16} />
                  </button>

                  {!item.isDefault && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSetDefault(item.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-outline/30 text-on-surface-variant hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        Thiết lập mặc định
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors"
                        title="Xóa địa chỉ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Modal Thêm / Chỉnh sửa địa chỉ ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-surface-container/60 shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-on-surface">
              {editingAddress ? 'Cập nhật địa chỉ nhận hàng' : 'Thêm địa chỉ mới'}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Họ và tên người nhận <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none"
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Số điện thoại liên hệ <span className="text-error">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none"
                    placeholder="0912345678"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Địa chỉ chi tiết <span className="text-error">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-outline/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none resize-none"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Loại địa chỉ
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="home"
                      checked={formData.type === 'home'}
                      onChange={() => setFormData({ ...formData, type: 'home' })}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Nhà riêng</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="office"
                      checked={formData.type === 'office'}
                      onChange={() => setFormData({ ...formData, type: 'office' })}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Văn phòng / Công ty</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Đặt làm địa chỉ nhận hàng mặc định</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container/60">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl border border-outline/30 text-on-surface hover:bg-surface-container-low text-sm font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {editingAddress ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressPage;

