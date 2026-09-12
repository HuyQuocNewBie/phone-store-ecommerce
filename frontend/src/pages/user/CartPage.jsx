import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
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

/* ─────────────────────────────────────────────
   Dữ liệu giỏ hàng giả lập (Mock) — Thay bằng
   API thực khi backend hoàn thiện
───────────────────────────────────────────── */
const MOCK_CART = [
  {
    id: 'cart-1',
    MaSanPham: 1,
    TenSanPham: 'iPhone 15 Pro Max 256GB – Titan Tự Nhiên',
    MauSac: 'Titan Tự Nhiên',
    DungLuong: '256GB',
    Gia: 29990000,
    SoLuong: 1,
    TonKho: 10,
    Anh: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'cart-2',
    MaSanPham: 2,
    TenSanPham: 'Samsung Galaxy S24 Ultra 512GB',
    MauSac: 'Titanium Black',
    DungLuong: '512GB',
    Gia: 26990000,
    SoLuong: 2,
    TonKho: 5,
    Anh: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'cart-3',
    MaSanPham: 3,
    TenSanPham: 'Xiaomi 14 Ultra Leica 512GB',
    MauSac: 'Trắng',
    DungLuong: '512GB',
    Gia: 24490000,
    SoLuong: 1,
    TonKho: 3,
    Anh: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&auto=format&fit=crop&q=80',
  },
];

/* ─────────────────────────────────────────────
   Helper: Định dạng giá VNĐ
───────────────────────────────────────────── */
const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

/* ─────────────────────────────────────────────
   CartPage Component
───────────────────────────────────────────── */
const CartPage = () => {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────
  const [cartItems, setCartItems]           = useState(MOCK_CART);
  const [selectedIds, setSelectedIds]       = useState([]);   // Danh sách id đã tích checkbox
  const [voucherCode, setVoucherCode]       = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen]           = useState(false);
  const [modalTarget, setModalTarget]       = useState(null); // null = xóa các mục đã chọn; id string = xóa 1 item

  const isEmpty = cartItems.length === 0;

  /* ── Checkbox Logic ─────────────────────── */
  const isAllSelected = cartItems.length > 0 && selectedIds.length === cartItems.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < cartItems.length;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map((item) => item.id));
    }
  };

  const handleToggleItem = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /* ── Cập nhật số lượng ──────────────────── */
  const handleQtyChange = (id, delta) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newQty = Math.max(1, Math.min(item.TonKho, item.SoLuong + delta));
        return { ...item, SoLuong: newQty };
      })
    );
  };

  /* ── Xóa sản phẩm ───────────────────────── */
  /**
   * Mở modal xóa.
   * @param {string|null} itemId - null = xóa các mục đã chọn; string = xóa 1 item cụ thể
   */
  const openDeleteModal = (itemId = null) => {
    setModalTarget(itemId);
    setModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (modalTarget) {
      // Xóa 1 item theo id
      setCartItems((prev) => prev.filter((item) => item.id !== modalTarget));
      setSelectedIds((prev) => prev.filter((x) => x !== modalTarget));
      toast.success('Đã xóa sản phẩm khỏi giỏ hàng.');
    } else {
      // Xóa các mục đã chọn
      setCartItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      const count = selectedIds.length;
      setSelectedIds([]);
      toast.success(`Đã xóa ${count} sản phẩm khỏi giỏ hàng.`);
    }
    setModalTarget(null);
  };

  /* ── Tính toán Đơn hàng ─────────────────── */
  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.id));
  const subtotal = selectedItems.reduce((sum, item) => sum + item.Gia * item.SoLuong, 0);
  const SHIPPING_FEE = subtotal > 0 && subtotal < 5000000 ? 30000 : 0;
  const discount = appliedVoucher ? Math.min(appliedVoucher.value, subtotal) : 0;
  const total = Math.max(0, subtotal + SHIPPING_FEE - discount);

  /* ── Voucher ────────────────────────────── */
  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;

    setApplyingVoucher(true);
    try {
      // Giả lập API call — thay bằng api.post('/vouchers/apply', { code }) khi có backend
      await new Promise((res) => setTimeout(res, 600));
      if (code === 'SMART50K') {
        setAppliedVoucher({ code, value: 50000, label: 'Giảm 50.000đ' });
        toast.success('Áp dụng mã giảm giá thành công!');
      } else {
        toast.error('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
      }
    } catch {
      toast.error('Không thể áp dụng mã giảm giá. Vui lòng thử lại.');
    } finally {
      setApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    toast.success('Đã gỡ mã giảm giá.');
  };

  /* ── Đặt hàng ───────────────────────────── */
  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    navigate('/checkout');
  };

  /* ── Trạng thái Nút Xóa ─────────────────── */
  // Nút "Xóa các mục đã chọn" enabled khi >= 2 items được chọn
  const bulkDeleteEnabled = selectedIds.length >= 2;
  // Icon trash tại từng dòng enabled khi item đó được chọn
  const isItemTrashEnabled = (id) => selectedIds.includes(id);

  /* ──────────────────────────────────────────
     Render: Giỏ hàng trống
  ─────────────────────────────────────────── */
  if (isEmpty) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
        <Navbar />

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
          {/* Illustration */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-sky-500/10 blur-3xl scale-150 pointer-events-none" />
            <img
              src="/assets/empty-cart.png"
              alt="Giỏ hàng trống"
              className="relative w-48 h-48 object-contain drop-shadow-2xl select-none"
              draggable={false}
            />
          </div>

          {/* Title & Content */}
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 mb-3 tracking-tight">
            Giỏ hàng trống
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mb-8 text-center max-w-xs leading-relaxed">
            Hãy chọn ngay sản phẩm bạn thích!
          </p>

          {/* CTA */}
          <button
            id="empty-cart-cta-btn"
            type="button"
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 transition-all hover:scale-[1.03] active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tiếp tục mua sắm</span>
          </button>
        </main>

        <Footer />
      </div>
    );
  }

  /* ──────────────────────────────────────────
     Render: Giỏ hàng có sản phẩm
  ─────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <Navbar />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setModalTarget(null); }}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa"
        itemCount={modalTarget ? 1 : selectedIds.length}
        message={
          modalTarget
            ? 'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không? Hành động này không thể hoàn tác.'
            : `Bạn có chắc chắn muốn xóa ${selectedIds.length} sản phẩm đã chọn khỏi giỏ hàng không? Hành động này không thể hoàn tác.`
        }
      />

      <main className="flex-1 py-8 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* ── Page Header ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                  Giỏ hàng của bạn
                </h1>
                <p className="text-xs text-slate-400">{cartItems.length} sản phẩm trong giỏ</p>
              </div>
            </div>
            <Link
              to="/products"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Tiếp tục mua sắm
            </Link>
          </div>

          {/* ── Main Grid: Cart Items (Left) + Summary (Right) ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* ── LEFT: Danh sách sản phẩm ── */}
            <div className="xl:col-span-2 space-y-4">

              {/* Select All + Bulk Delete Bar */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
                {/* Checkbox Chọn tất cả */}
                <label
                  id="select-all-label"
                  htmlFor="select-all-checkbox"
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="relative">
                    <input
                      id="select-all-checkbox"
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={handleToggleAll}
                      className="sr-only"
                    />
                    {/* Custom checkbox */}
                    <div
                      onClick={handleToggleAll}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                        isAllSelected
                          ? 'bg-sky-500 border-sky-500'
                          : isIndeterminate
                          ? 'bg-sky-500/30 border-sky-500'
                          : 'border-slate-600 group-hover:border-slate-400'
                      }`}
                    >
                      {isAllSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isIndeterminate && (
                        <div className="w-2.5 h-0.5 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-300 group-hover:text-slate-100 transition-colors select-none">
                    Chọn tất cả
                    {selectedIds.length > 0 && (
                      <span className="ml-2 text-xs text-sky-400 font-bold">
                        ({selectedIds.length}/{cartItems.length})
                      </span>
                    )}
                  </span>
                </label>

                {/* Nút "Xóa các mục đã chọn" */}
                <button
                  id="bulk-delete-btn"
                  type="button"
                  disabled={!bulkDeleteEnabled}
                  onClick={() => openDeleteModal(null)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    bulkDeleteEnabled
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 hover:text-rose-300 cursor-pointer'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                  title={
                    !bulkDeleteEnabled
                      ? selectedIds.length === 0
                        ? 'Chưa chọn sản phẩm nào'
                        : 'Cần chọn ít nhất 2 sản phẩm'
                      : `Xóa ${selectedIds.length} sản phẩm đã chọn`
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa các mục đã chọn</span>
                  {bulkDeleteEnabled && (
                    <span className="px-1.5 py-0.5 bg-rose-500/20 rounded-md font-bold text-rose-300">
                      {selectedIds.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Cart Item List */}
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const trashEnabled = isItemTrashEnabled(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`group flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? 'bg-slate-900 border-sky-500/40 shadow-lg shadow-sky-500/5'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="pt-1 shrink-0">
                        <div
                          onClick={() => handleToggleItem(item.id)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-sky-500 border-sky-500'
                              : 'border-slate-600 hover:border-slate-400'
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
                      <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                        {item.Anh ? (
                          <img
                            src={item.Anh}
                            alt={item.TenSanPham}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <PackageCheck className="w-8 h-8 text-slate-700" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <h3
                          className="text-sm font-bold text-slate-100 hover:text-sky-400 cursor-pointer transition-colors line-clamp-2 leading-snug"
                          onClick={() => navigate(`/products/${item.MaSanPham}`)}
                        >
                          {item.TenSanPham}
                        </h3>

                        {/* Biến thể */}
                        <div className="flex flex-wrap gap-2">
                          {item.MauSac && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                              {item.MauSac}
                            </span>
                          )}
                          {item.DungLuong && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                              {item.DungLuong}
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <p className="text-base font-black text-sky-400">
                          {formatVND(item.Gia)}
                        </p>

                        {/* Quantity + Trash Row */}
                        <div className="flex items-center justify-between pt-1 gap-2">
                          {/* Bộ điều chỉnh số lượng */}
                          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-0.5">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, -1)}
                              disabled={item.SoLuong <= 1}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-slate-100 select-none">
                              {item.SoLuong}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, +1)}
                              disabled={item.SoLuong >= item.TonKho}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Subtotal item */}
                          <span className="text-xs font-bold text-slate-300 hidden sm:inline">
                            = {formatVND(item.Gia * item.SoLuong)}
                          </span>

                          {/* Icon Trash — Enabled khi item được chọn */}
                          <button
                            id={`trash-btn-${item.id}`}
                            type="button"
                            disabled={!trashEnabled}
                            onClick={() => openDeleteModal(item.id)}
                            className={`p-2 rounded-xl border transition-all ${
                              trashEnabled
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 cursor-pointer'
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-600 cursor-not-allowed opacity-40'
                            }`}
                            title={
                              trashEnabled
                                ? 'Xóa sản phẩm này'
                                : 'Hãy tích chọn sản phẩm để xóa'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Cảnh báo tồn kho thấp */}
                        {item.TonKho <= 3 && (
                          <p className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
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

            {/* ── RIGHT: Tóm tắt đơn hàng ── */}
            <div className="xl:col-span-1">
              <div className="sticky top-24 space-y-4">

                {/* Voucher Box */}
                <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    <Tag className="w-4 h-4 text-violet-400" />
                    <span>Mã giảm giá</span>
                  </div>

                  {appliedVoucher ? (
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md tracking-wider">
                          {appliedVoucher.code}
                        </span>
                        <span className="text-xs text-emerald-300 font-semibold">{appliedVoucher.label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
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
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all tracking-wider"
                      />
                      <button
                        id="apply-voucher-btn"
                        type="button"
                        onClick={handleApplyVoucher}
                        disabled={!voucherCode.trim() || applyingVoucher}
                        className="px-3.5 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-400 text-xs font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {applyingVoucher ? (
                          <span className="inline-block w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                        ) : (
                          'Áp dụng'
                        )}
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500">Thử mã: <strong className="text-slate-400">SMART50K</strong></p>
                </div>

                {/* Order Summary Box */}
                <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
                  <h2 className="text-sm font-bold text-slate-200">Tóm tắt đơn hàng</h2>

                  {/* Lines */}
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Tạm tính ({selectedItems.length} sản phẩm)</span>
                      <span className="font-semibold text-slate-300">{formatVND(subtotal)}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-sky-400" />
                        Phí vận chuyển
                      </span>
                      <span className={`font-semibold ${SHIPPING_FEE === 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {SHIPPING_FEE === 0 ? 'Miễn phí' : formatVND(SHIPPING_FEE)}
                      </span>
                    </div>

                    {appliedVoucher && (
                      <div className="flex items-center justify-between text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          Giảm giá ({appliedVoucher.code})
                        </span>
                        <span className="font-semibold">- {formatVND(discount)}</span>
                      </div>
                    )}

                    {subtotal > 0 && SHIPPING_FEE === 0 && (
                      <p className="text-[10px] text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-1.5">
                        🎉 Miễn phí vận chuyển cho đơn hàng từ 5.000.000đ
                      </p>
                    )}

                    <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                      <span className="font-bold text-slate-100">Tổng cộng</span>
                      <span className="text-xl font-black text-sky-400">{formatVND(total)}</span>
                    </div>
                  </div>

                  {/* CTA — Enabled khi có ít nhất 1 item được chọn */}
                  <button
                    id="checkout-btn"
                    type="button"
                    disabled={selectedItems.length === 0}
                    onClick={handleCheckout}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      selectedItems.length > 0
                        ? 'bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
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

                  {selectedItems.length > 0 && (
                    <p className="text-center text-[10px] text-slate-500">
                      Đã chọn <strong className="text-sky-400">{selectedItems.length}</strong> sản phẩm
                    </p>
                  )}
                </div>

                {/* Cam kết dịch vụ */}
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-2.5">
                  {[
                    { icon: ShieldCheck, label: '100% Chính hãng', color: 'text-sky-400' },
                    { icon: Truck,       label: 'Giao hàng 2H nội thành', color: 'text-indigo-400' },
                    { icon: RotateCcw,   label: 'Đổi trả 30 ngày', color: 'text-violet-400' },
                    { icon: CreditCard,  label: 'Trả góp 0% lãi suất', color: 'text-emerald-400' },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex items-center gap-2.5 text-xs text-slate-400">
                      <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: Tiếp tục mua sắm */}
          <div className="sm:hidden pt-2">
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
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
