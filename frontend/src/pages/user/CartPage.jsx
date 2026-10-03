import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  PackageCheck,
  Tag,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  ChevronRight,
  X,
} from 'lucide-react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/user/Footer';
import DeleteConfirmModal from '../../components/user/DeleteConfirmModal';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';

const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

const CartPage = () => {
  const navigate = useNavigate();
  const { cartItems, setCartItems, cartLoading, fetchCart, updateQuantity, removeFromCart } = useCart();

  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [isLoading, setIsLoading]             = useState(true);
  const [selectedIds, setSelectedIds]         = useState([]);
  const [voucherCode, setVoucherCode]         = useState('');
  const [appliedVoucher, setAppliedVoucher]   = useState(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [modalOpen, setModalOpen]             = useState(false);
  const [modalTarget, setModalTarget]         = useState(null);

  useEffect(() => {
    // fetchCart() được CartContext tự gọi, chỉ cần fetch vouchers ở đây
    fetchVouchers();
    // Khi cartLoading hoàn tất (dữ liệu đã sẵn sàng), ẩn spinner
    if (!cartLoading) setIsLoading(false);
  }, [cartLoading]);

  // Đồng bộ selectedIds khi cartItems thay đổi
  useEffect(() => {
    if (cartItems.length > 0) {
      setSelectedIds((prev) => prev.filter((id) => cartItems.some((item) => item.id === id)));
    } else {
      setSelectedIds([]);
    }
  }, [cartItems]);

  const fetchVouchers = async () => {
    try {
      const res = await api.get('/vouchers/active');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAvailableVouchers(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách voucher:', err);
    }
  };

  const isEmpty = cartItems.length === 0;
  const isAllSelected = cartItems.length > 0 && cartItems.every((item) => selectedIds.includes(item.id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map((item) => item.id));
    }
  };
  const handleToggleItem = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleQtyChange = async (id, delta) => {
    const item = cartItems.find((x) => x.id === id);
    if (!item) return;
    const newQty = Math.max(1, Math.min(item.TonKho, item.SoLuong + delta));
    if (newQty === item.SoLuong) return;
    const result = await updateQuantity(item.MaGioHang, newQty);
    if (!result.success) {
      toast.error(result.message || 'Không thể cập nhật số lượng');
    }
  };

  const openDeleteModal = (itemId = null) => { setModalTarget(itemId); setModalOpen(true); };

  const handleConfirmDelete = async () => {
    try {
      if (modalTarget) {
        const result = await removeFromCart(modalTarget);
        if (result.success) {
          setSelectedIds((prev) => prev.filter((x) => x !== modalTarget));
          toast.success('Đã xóa sản phẩm khỏi giỏ hàng.');
        } else {
          toast.error(result.message || 'Xóa sản phẩm thất bại.');
        }
      } else {
        const result = await removeFromCart(selectedIds);
        if (result.success) {
          const count = selectedIds.length;
          setSelectedIds([]);
          toast.success(`Đã xóa ${count} sản phẩm khỏi giỏ hàng.`);
        } else {
          toast.error(result.message || 'Xóa sản phẩm thất bại.');
        }
      }
    } catch { toast.error('Xóa sản phẩm thất bại.'); }
    finally { setModalTarget(null); setModalOpen(false); }
  };

  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.id));
  const subtotal = selectedItems.reduce((sum, item) => sum + Number(item.Gia) * Number(item.SoLuong), 0);
  const SHIPPING_FEE = selectedItems.length === 0 ? null : (subtotal > 0 && subtotal < 5000000 ? 30000 : 0);

  // Tính tiền giảm dựa trên appliedVoucher và subtotal
  const discount = appliedVoucher
    ? (appliedVoucher.LoaiGiam === 'phantram' || appliedVoucher.LoaiGiamGia === 'PhanTram'
        ? Math.round(subtotal * (Number(appliedVoucher.GiaTriGiam) / 100))
        : Number(appliedVoucher.GiaTriGiam))
    : 0;
  const actualDiscount = Math.min(discount, subtotal);
  const total = Math.max(0, subtotal + (SHIPPING_FEE || 0) - actualDiscount);

  // Tự động kiểm tra giá trị tối thiểu của voucher khi subtotal thay đổi
  useEffect(() => {
    if (appliedVoucher) {
      const minRequired = Number(appliedVoucher.GiaTriToiThieu || appliedVoucher.DonToiThieu || 0);
      if (subtotal > 0 && subtotal < minRequired) {
        setAppliedVoucher(null);
        toast(`Mã ${appliedVoucher.Code || appliedVoucher.MaCode} đã được gỡ vì đơn hàng chưa đạt giá trị tối thiểu ${formatVND(minRequired)}`, {
          icon: '⚠️'
        });
      }
    }
  }, [subtotal, appliedVoucher]);

  const handleApplyVoucher = async (codeToApply = null) => {
    const rawCode = (typeof codeToApply === 'string' ? codeToApply : voucherCode);
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      toast.error('Vui lòng nhập mã giảm giá');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Vui lòng chọn sản phẩm trong giỏ hàng trước khi áp dụng mã');
      return;
    }

    setApplyingVoucher(true);
    try {
      const res = await api.post('/vouchers/apply', {
        code,
        orderSubtotal: subtotal
      });

      if (res.data?.success) {
        const { voucher, discountAmount } = res.data.data;
        const voucherData = {
          ...voucher,
          discountAmount,
          MaCode: voucher.Code,
          code: voucher.Code,
          Code: voucher.Code,
          GiaTriGiam: Number(voucher.GiaTriGiam),
          LoaiGiam: voucher.LoaiGiam,
          LoaiGiamGia: voucher.LoaiGiam === 'phantram' ? 'PhanTram' : 'Tien',
          DonToiThieu: Number(voucher.GiaTriToiThieu),
          GiaTriToiThieu: Number(voucher.GiaTriToiThieu)
        };
        setAppliedVoucher(voucherData);
        setVoucherCode(voucher.Code);
        toast.success(res.data.message || 'Áp dụng mã giảm giá thành công!');
      } else {
        toast.error(res.data?.message || 'Không thể áp dụng mã giảm giá');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện';
      toast.error(msg);
    } finally {
      setApplyingVoucher(false);
    }
  };

  const handleSelectAndApplyVoucher = (voucher) => {
    setVoucherCode(voucher.Code);
    handleApplyVoucher(voucher.Code);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    toast.success('Đã gỡ mã giảm giá.');
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    navigate('/checkout', { state: { items: selectedItems, voucher: appliedVoucher } });
  };

  const bulkDeleteEnabled = selectedIds.length >= 2;
  const isItemTrashEnabled = (id) => selectedIds.includes(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
          <div className="w-24 h-24 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-6">
            <ShoppingCart className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3 tracking-tight">
            Giỏ hàng trống
          </h1>
          <p className="text-slate-500 text-sm sm:text-base mb-8 text-center max-w-xs leading-relaxed">
            Hãy khám phá và chọn ngay sản phẩm bạn thích!
          </p>
          <button
            id="empty-cart-cta-btn"
            type="button"
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all hover:shadow-blue-500/30 active:scale-[0.97]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tiếp tục mua sắm</span>
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <DeleteConfirmModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setModalTarget(null); }}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa"
        itemCount={modalTarget ? 1 : selectedIds.length}
        message={
          modalTarget
            ? 'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không?'
            : `Bạn có chắc chắn muốn xóa ${selectedIds.length} sản phẩm đã chọn không?`
        }
      />

      <main className="flex-1 py-8 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Giỏ hàng của bạn</h1>
                <p className="text-xs text-slate-500">{cartItems.length} sản phẩm trong giỏ</p>
              </div>
            </div>
            <Link
              to="/products"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Tiếp tục mua sắm
            </Link>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* ── Danh sách sản phẩm (2/3) ── */}
            <div className="xl:col-span-2 space-y-4">
              {/* Select All bar */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <label id="select-all-label" htmlFor="select-all-checkbox" className="flex items-center gap-3 cursor-pointer group select-none">
                  <div className="relative">
                    <input
                      id="select-all-checkbox"
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                      onChange={handleToggleAll}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        isAllSelected ? 'bg-blue-600 border-blue-600'
                        : isIndeterminate ? 'bg-blue-100 border-blue-400'
                        : 'border-slate-300 group-hover:border-blue-400'
                      }`}
                    >
                      {isAllSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isIndeterminate && <div className="w-2.5 h-0.5 bg-blue-600 rounded-full" />}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 select-none">
                    Chọn tất cả
                    {selectedIds.length > 0 && (
                      <span className="ml-2 text-xs text-blue-600 font-bold">
                        ({selectedIds.length}/{cartItems.length})
                      </span>
                    )}
                  </span>
                </label>

                <button
                  id="bulk-delete-btn"
                  type="button"
                  disabled={!bulkDeleteEnabled}
                  onClick={() => openDeleteModal(null)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                    bulkDeleteEnabled
                      ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer'
                      : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa đã chọn
                  {bulkDeleteEnabled && (
                    <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-md font-bold">{selectedIds.length}</span>
                  )}
                </button>
              </div>

              {/* Cart Items */}
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const trashEnabled = isItemTrashEnabled(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                          : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="pt-1 shrink-0">
                        <div
                          onClick={() => handleToggleItem(item.id)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 hover:border-blue-400'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Product Image */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
                        {item.Anh ? (
                          <img src={item.Anh} alt={item.TenSanPham} className="w-full h-full object-contain p-1"
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <PackageCheck className="w-8 h-8 text-slate-300" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <h3
                          className="text-sm font-semibold text-slate-800 hover:text-blue-600 cursor-pointer transition-colors line-clamp-2 leading-snug"
                          onClick={() => navigate(`/products/${item.MaSanPham}`)}
                        >
                          {item.TenSanPham}
                        </h3>

                        <div className="flex flex-wrap gap-1.5">
                          {item.MauSac && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {item.MauSac}
                            </span>
                          )}
                          {item.DungLuong && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {item.DungLuong}
                            </span>
                          )}
                        </div>

                        <p className="font-bold text-blue-600 text-base">{formatVND(item.Gia)}</p>

                        <div className="flex items-center justify-between pt-1 gap-2">
                          {/* Qty Stepper */}
                          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, -1)}
                              disabled={item.SoLuong <= 1}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-slate-800 select-none">{item.SoLuong}</span>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, +1)}
                              disabled={item.SoLuong >= item.TonKho}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Trash */}
                          <button
                            id={`trash-btn-${item.id}`}
                            type="button"
                            disabled={!trashEnabled}
                            onClick={() => openDeleteModal(item.id)}
                            className={`p-2 flex items-center justify-center rounded-xl border transition-all ${
                              trashEnabled
                                ? 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 cursor-pointer'
                                : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-50'
                            }`}
                            title={trashEnabled ? 'Xóa sản phẩm này' : 'Hãy tích chọn sản phẩm để xóa'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {item.TonKho <= 3 && (
                          <p className="text-[10px] font-medium text-amber-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                            Chỉ còn {item.TonKho} sản phẩm
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Order Summary (1/3) Sticky ── */}
            <div className="xl:col-span-1">
              <div className="sticky top-24 space-y-4">
                {/* Voucher Section */}
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-semibold text-slate-700">Mã giảm giá</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {availableVouchers.length > 0 ? `${availableVouchers.length} mã khả dụng` : 'Nhập hoặc chọn mã'}
                    </span>
                  </div>

                  {appliedVoucher ? (
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md tracking-wider">
                          {appliedVoucher.Code || appliedVoucher.MaCode}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-emerald-700 font-bold truncate">
                            Giảm {appliedVoucher.LoaiGiam === 'phantram' || appliedVoucher.LoaiGiamGia === 'PhanTram' ? `${appliedVoucher.GiaTriGiam}%` : formatVND(appliedVoucher.GiaTriGiam)}
                          </p>
                          <p className="text-[10px] text-emerald-600">Đã áp dụng mã thành công</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-white"
                        title="Gỡ mã giảm giá"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        id="voucher-input"
                        type="text"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                        placeholder="Nhập mã voucher..."
                        className="flex-1 px-3 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all tracking-wider font-semibold uppercase"
                      />
                      <button
                        id="apply-voucher-btn"
                        type="button"
                        onClick={() => handleApplyVoucher()}
                        disabled={!voucherCode.trim() || applyingVoucher}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[75px]"
                      >
                        {applyingVoucher ? (
                          <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : 'Áp dụng'}
                      </button>
                    </div>
                  )}

                  {/* Available Vouchers List */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700">Mã giảm giá khả dụng</span>
                      {availableVouchers.length > 0 && (
                        <span className="text-[10px] text-blue-600 font-medium">Nhấp để áp dụng ngay</span>
                      )}
                    </div>

                    {availableVouchers.length === 0 ? (
                      <div className="py-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Chưa có mã giảm giá nào
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                        {availableVouchers.map((v) => {
                          const isEligible = subtotal >= Number(v.GiaTriToiThieu);
                          const isCurrentlyApplied = appliedVoucher && (appliedVoucher.Code === v.Code || appliedVoucher.MaCode === v.Code);

                          return (
                            <div
                              key={v.MaVoucher || v.Code}
                              onClick={() => handleSelectAndApplyVoucher(v)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer relative group ${
                                isCurrentlyApplied
                                  ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300'
                                  : isEligible
                                  ? 'bg-blue-50/40 border-blue-200 hover:border-blue-400 hover:bg-blue-50/70 hover:shadow-xs'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold tracking-wider text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-100 shadow-2xs">
                                      {v.Code}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800">
                                      Giảm {v.LoaiGiam === 'phantram' ? `${v.GiaTriGiam}%` : formatVND(v.GiaTriGiam)}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-1">
                                    Đơn tối thiểu: <span className="font-semibold text-slate-600">{formatVND(v.GiaTriToiThieu)}</span>
                                  </p>
                                  {!isEligible && (
                                    <p className="text-[10px] text-amber-600 mt-0.5 font-medium">
                                      Cần mua thêm {formatVND(Number(v.GiaTriToiThieu) - subtotal)}
                                    </p>
                                  )}
                                </div>

                                <div className="shrink-0 flex flex-col items-end gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectAndApplyVoucher(v);
                                    }}
                                    disabled={isCurrentlyApplied || applyingVoucher}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                      isCurrentlyApplied
                                        ? 'bg-emerald-600 text-white cursor-default'
                                        : isEligible
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                    }`}
                                  >
                                    {isCurrentlyApplied ? 'Đang dùng' : 'Áp dụng'}
                                  </button>
                                  {v.NgayHetHan && (
                                    <span className="text-[9px] text-slate-400">
                                      HSD: {new Date(v.NgayHetHan).toLocaleDateString('vi-VN')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Total Summary */}
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                  <h2 className="text-sm font-bold text-slate-800">Tóm tắt đơn hàng</h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Tạm tính ({selectedItems.length} sản phẩm)</span>
                      <span className="font-medium text-slate-700">{formatVND(subtotal)}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-blue-500" />
                        Phí vận chuyển
                      </span>
                      <span className={`font-medium ${SHIPPING_FEE === 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {SHIPPING_FEE === null ? '-- đ' : SHIPPING_FEE === 0 ? 'Miễn phí' : formatVND(SHIPPING_FEE)}
                      </span>
                    </div>

                    {appliedVoucher && (
                      <div className="flex items-center justify-between text-emerald-600">
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5" />
                          Giảm giá ({appliedVoucher.MaCode})
                        </span>
                        <span className="font-semibold">- {formatVND(actualDiscount)}</span>
                      </div>
                    )}

                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                      <span className="font-bold text-slate-800">Tổng thanh toán</span>
                      <span className="text-xl font-black text-blue-600">{formatVND(total)}</span>
                    </div>
                  </div>

                  <button
                    id="checkout-btn"
                    type="button"
                    disabled={selectedItems.length === 0}
                    onClick={handleCheckout}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      selectedItems.length > 0
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98]'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {selectedItems.length === 0 ? (
                      <span>Chọn sản phẩm để đặt hàng</span>
                    ) : (
                      <>
                        <span>Tiến hành đặt hàng</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Trust badges */}
                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2.5">
                  {[
                    { icon: ShieldCheck, label: 'Bảo hành chính hãng 1 đổi 1 trong 30 ngày', color: 'text-blue-500' },
                    { icon: Truck,       label: 'Giao hàng 2H nội thành, miễn phí > 5 triệu', color: 'text-indigo-500' },
                    { icon: CreditCard,  label: 'Kiểm tra hàng trước khi nhận và thanh toán COD', color: 'text-emerald-500' },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex items-center gap-2.5 text-xs text-slate-500">
                      <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: Back to products */}
          <div className="sm:hidden pt-2">
            <Link to="/products" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CartPage;
