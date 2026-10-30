import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Home,
  Building2,
  Phone,
  User,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import addressService from '../../services/addressService';
import AddressDrawer from '../../components/user/AddressDrawer';
import DeleteConfirmModal from '../../components/user/DeleteConfirmModal';

/**
 * AddressPage — Trang Sổ Địa Chỉ người dùng, tích hợp trong AccountLayout (/user/addresses).
 *
 * Cấu trúc:
 * 1. UI TRANG DANH SÁCH:
 *   - Header: Dòng chữ "Sổ địa chỉ" + Nút "+ Thêm địa chỉ mới".
 *   - Lưới/Danh sách Card địa chỉ:
 *     * Hàng 1: Loại địa chỉ (TenGoiNho) + Tag "Mặc định" (nếu LaMacDinh === 1/true).
 *     * Hàng 2: Tên người nhận | Số điện thoại (phân cách bởi dấu gạch đứng |).
 *     * Hàng 3: Địa chỉ cụ thể, Phường/Xã, Tỉnh/Thành phố.
 *     * Thao tác:
 *       - MẶC ĐỊNH: CHỈ HIỆN 1 NÚT [Sửa].
 *       - KHÔNG MẶC ĐỊNH: HIỆN CẢ 2 NÚT [Sửa] VÀ [Xóa].
 * 2. TÍCH HỢP DRAWER:
 *   - AddressDrawer trượt 300ms từ phải sang trái.
 */
const AddressPage = () => {
  const { user } = useAuth();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trạng thái Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  // Trạng thái Modal xác nhận xóa
  const [deletingAddress, setDeletingAddress] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Tải danh sách địa chỉ từ backend
  const fetchAddressList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await addressService.getAddresses();
      if (res && res.success) {
        setAddresses(res.data || []);
      } else {
        setAddresses([]);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách địa chỉ:', error);
      toast.error('Không thể tải sổ địa chỉ. Vui lòng thử lại sau!');
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddressList();
  }, [fetchAddressList]);

  // Mở Drawer thêm mới
  const handleOpenAddDrawer = () => {
    setEditingAddress(null);
    setIsDrawerOpen(true);
  };

  // Mở Drawer chỉnh sửa
  const handleOpenEditDrawer = (addr) => {
    setEditingAddress(addr);
    setIsDrawerOpen(true);
  };

  // Đóng Drawer
  const handleCloseDrawer = () => {
    if (!isSubmitting) {
      setIsDrawerOpen(false);
      setEditingAddress(null);
    }
  };

  // Xử lý submit thêm mới / cập nhật địa chỉ từ Drawer
  const handleDrawerSubmit = async (payload, editId) => {
    try {
      setIsSubmitting(true);
      if (editId) {
        // Cập nhật
        const res = await addressService.updateAddress(editId, payload);
        if (res && res.success) {
          toast.success('Cập nhật địa chỉ thành công!');
        } else {
          toast.success('Đã cập nhật địa chỉ');
        }
      } else {
        // Thêm mới
        const res = await addressService.createAddress(payload);
        if (res && res.success) {
          toast.success('Thêm mới địa chỉ thành công!');
        } else {
          toast.success('Đã thêm mới địa chỉ');
        }
      }
      setIsDrawerOpen(false);
      setEditingAddress(null);
      await fetchAddressList();
    } catch (error) {
      console.error('Lỗi khi lưu địa chỉ:', error);
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi lưu địa chỉ';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nhấn nút [Xóa] trên Card -> Mở modal xác nhận
  const handleDeleteClick = (addr) => {
    if (addr.LaMacDinh === 1 || addr.LaMacDinh === true) {
      toast.error('Không thể xóa địa chỉ mặc định!');
      return;
    }
    setDeletingAddress(addr);
    setIsDeleteModalOpen(true);
  };

  // Xác nhận xóa địa chỉ
  const handleConfirmDelete = async () => {
    if (!deletingAddress) return;
    try {
      const res = await addressService.deleteAddress(deletingAddress.MaDiaChi);
      if (res && res.success) {
        toast.success('Đã xóa địa chỉ thành công!');
      } else {
        toast.success('Xóa địa chỉ thành công');
      }
      setIsDeleteModalOpen(false);
      setDeletingAddress(null);
      await fetchAddressList();
    } catch (error) {
      console.error('Lỗi khi xóa địa chỉ:', error);
      const msg = error.response?.data?.message || 'Không thể xóa địa chỉ này';
      toast.error(msg);
    }
  };

  // Helper render icon cho loại địa chỉ
  const renderAddressTypeIcon = (typeName = '') => {
    const lower = typeName.toLowerCase();
    if (lower.includes('nhà') || lower.includes('home')) {
      return <Home className="w-4 h-4 text-blue-600" />;
    }
    if (lower.includes('cơ quan') || lower.includes('văn phòng') || lower.includes('công ty')) {
      return <Building2 className="w-4 h-4 text-indigo-600" />;
    }
    return <MapPin className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER TRANG: Dòng chữ "Sổ địa chỉ" + Nút "+ Thêm địa chỉ mới" ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Sổ địa chỉ</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {addresses.length} địa chỉ
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý danh sách địa chỉ nhận hàng để việc đặt hàng và thanh toán nhanh chóng hơn
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddDrawer}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm địa chỉ mới</span>
        </button>
      </div>

      {/* ── 2. DANH SÁCH / LƯỚI CARD ĐỊA CHỈ ── */}
      {loading ? (
        // Loading Skeleton
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-28 bg-slate-200 rounded-md" />
                <div className="h-6 w-14 bg-slate-200 rounded-md" />
              </div>
              <div className="h-4 w-48 bg-slate-200 rounded-md" />
              <div className="h-4 w-3/4 bg-slate-100 rounded-md" />
            </div>
          ))}
        </div>
      ) : addresses.length === 0 ? (
        // Empty State
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner">
            <MapPin className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Chưa có địa chỉ nào</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
            Thêm địa chỉ giao nhận hàng đầu tiên để dễ dàng chọn nơi nhận khi mua sắm tại SmartZone.
          </p>
          <button
            type="button"
            onClick={handleOpenAddDrawer}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm địa chỉ mới</span>
          </button>
        </div>
      ) : (
        // Lưới / Bảng danh sách Card địa chỉ
        <div className="space-y-4">
          {addresses.map((item) => {
            const isDefault = item.LaMacDinh === 1 || item.LaMacDinh === true;
            const recipientName =
              item.TenNguoiNhan || user?.HoTen || user?.TaiKhoan || 'Người nhận';
            const recipientPhone =
              item.SoDienThoai || user?.SoDienThoai || 'Chưa cập nhật SĐT';
            const addressParts = [item.DiaChiNha, item.PhuongXa, item.TinhThanh].filter(Boolean);
            const fullAddress = addressParts.join(', ') || 'Chưa cập nhật địa chỉ chi tiết';

            return (
              <div
                key={item.MaDiaChi}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs ${
                  isDefault
                    ? 'border-blue-300 ring-1 ring-blue-500/20 bg-blue-50/15'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Nội dung Card địa chỉ theo 3 Hàng yêu cầu */}
                  <div className="space-y-2.5 flex-1 min-w-0">
                    {/* ── Hàng 1: Loại địa chỉ (TenGoiNho) + Tag "Mặc định" (nếu LaMacDinh === 1) ── */}
                    <div className="flex items-center flex-wrap gap-2.5">
                      <div className="inline-flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                        {renderAddressTypeIcon(item.TenGoiNho)}
                        <span>{item.TenGoiNho || 'Nhà riêng'}</span>
                      </div>

                      {/* Tag "Mặc định" */}
                      {isDefault && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Mặc định</span>
                        </span>
                      )}
                    </div>

                    {/* ── Hàng 2: Tên người nhận | Số điện thoại (phân cách bởi dấu gạch đứng) ── */}
                    <div className="text-sm flex items-center flex-wrap gap-2 text-slate-800">
                      <span className="font-semibold text-slate-900 tracking-tight">
                        {recipientName}
                      </span>
                      <span className="text-slate-300 font-light select-none">|</span>
                      <span className="text-slate-600 font-medium flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {recipientPhone}
                      </span>
                    </div>

                    {/* ── Hàng 3: Địa chỉ cụ thể, Phường/Xã, Tỉnh/Thành phố ── */}
                    <div className="text-sm text-slate-600 flex items-start gap-1.5 pt-0.5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed text-slate-700 break-words">
                        {fullAddress}
                      </span>
                    </div>
                  </div>

                  {/* ── Thao tác:
                      Nếu MẶC ĐỊNH -> CHỈ HIỆN 1 NÚT [Sửa].
                      Nếu KHÔNG MẶC ĐỊNH -> HIỆN CẢ 2 NÚT [Sửa] VÀ [Xóa]. ── */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                    {/* Nút [Sửa] */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditDrawer(item)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 active:bg-blue-100 transition-all cursor-pointer"
                      title="Chỉnh sửa địa chỉ này"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>

                    {/* Nút [Xóa] (Chỉ hiển thị khi KHÔNG MẶC ĐỊNH) */}
                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(item)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300 active:bg-rose-100 transition-all cursor-pointer"
                        title="Xóa địa chỉ này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DRAWER SLIDE-IN THÊM / SỬA ĐỊA CHỈ (300ms) ── */}
      <AddressDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleDrawerSubmit}
        initialData={editingAddress}
        isSubmitting={isSubmitting}
      />

      {/* ── MODAL XÁC NHẬN XÓA ĐỊA CHỈ ── */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingAddress(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa địa chỉ"
        message={
          deletingAddress
            ? `Bạn có chắc chắn muốn xóa địa chỉ "${deletingAddress.TenGoiNho || 'này'}" (${[deletingAddress.DiaChiNha, deletingAddress.PhuongXa, deletingAddress.TinhThanh].filter(Boolean).join(', ')}) không?`
            : 'Bạn có chắc chắn muốn xóa địa chỉ này không?'
        }
      />
    </div>
  );
};

export default AddressPage;
