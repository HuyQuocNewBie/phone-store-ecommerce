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
  const [cartItems, setCartItems]           = useState([]);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [selectedIds, setSelectedIds]       = useState([]);   // Danh sách id đã tích checkbox
  const [voucherCode, setVoucherCode]       = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen]           = useState(false);
  const [modalTarget, setModalTarget]       = useState(null); // null = xóa các mục đã chọn; id string = xóa 1 item

  useEffect(() => {
    fetchCart();
    fetchVouchers();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await api.get('/cart');
      if (res.data.success) {
        setCartItems(res.data.data.map(item => ({
          ...item,
          id: item.MaGioHang // map MaGioHang to id for existing logic
        })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVouchers = async () => {
    try {
      const res = await api.get('/admin/vouchers');
      if (res.data.success) {
        setAvailableVouchers(res.data.data.filter(v => v.TrangThai === 'HoatDong' || !v.TrangThai));
      }
    } catch (error) {
      console.error('Lỗi khi lấy voucher', error);
    }
  };

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
  const handleQtyChange = async (id, delta) => {
    const item = cartItems.find((x) => x.id === id);
    if (!item) return;

    const newQty = Math.max(1, Math.min(item.TonKho, item.SoLuong + delta));
    if (newQty === item.SoLuong) return;

    try {
      const res = await api.put('/cart/items', { MaGioHang: item.MaGioHang, SoLuong: newQty });
      if (res.data.success) {
        setCartItems((prev) =>
          prev.map((x) => (x.id === id ? { ...x, SoLuong: newQty } : x))
        );
      }
    } catch (error) {
      toast.error('Không thể cập nhật số lượng');
    }
  };

  /* ── Xóa sản phẩm ───────────────────────── */
  const openDeleteModal = (itemId = null) => {
    setModalTarget(itemId);
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (modalTarget) {
        await api.post('/cart/items/batch-delete', { cart_item_ids: [modalTarget] });
        setCartItems((prev) => prev.filter((item) => item.id !== modalTarget));
        setSelectedIds((prev) => prev.filter((x) => x !== modalTarget));
        toast.success('Đã xóa sản phẩm khỏi giỏ hàng.');
      } else {
        await api.post('/cart/items/batch-delete', { cart_item_ids: selectedIds });
        setCartItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
        const count = selectedIds.length;
        setSelectedIds([]);
        toast.success(`Đã xóa ${count} sản phẩm khỏi giỏ hàng.`);
      }
    } catch (error) {
      toast.error('Xóa sản phẩm thất bại.');
    } finally {
      setModalTarget(null);
      setModalOpen(false);
    }
  };

  /* ── Tính toán Đơn hàng ─────────────────── */
  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.id));
  const subtotal = selectedItems.reduce((sum, item) => sum + item.Gia * item.SoLuong, 0);
  const SHIPPING_FEE = selectedItems.length === 0 ? null : (subtotal > 0 && subtotal < 5000000 ? 30000 : 0);
  const discount = appliedVoucher ? (appliedVoucher.LoaiGiamGia === 'PhanTram' ? subtotal * (appliedVoucher.GiaTriGiam / 100) : appliedVoucher.GiaTriGiam) : 0;
  const actualDiscount = Math.min(discount, subtotal);
  const total = Math.max(0, subtotal + (SHIPPING_FEE || 0) - actualDiscount);

  /* ── Voucher ────────────────────────────── */
  const handleApplyVoucher = () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;

    setApplyingVoucher(true);
    setTimeout(() => {
      const voucher = availableVouchers.find(v => v.MaCode === code);
      if (voucher) {
        if (voucher.DonToiThieu && subtotal < voucher.DonToiThieu) {
          toast.error(`Đơn hàng chưa đạt mức tối thiểu ${formatVND(voucher.DonToiThieu)}`);
        } else {
          setAppliedVoucher(voucher);
          toast.success('Áp dụng mã giảm giá thành công!');
        }
      } else {
        toast.error('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
      }
      setApplyingVoucher(false);
    }, 400);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    toast.success('Đã gỡ mã giảm giá.');
  };

  /* ── Đặt hàng ───────────────────────────── */
  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    navigate('/checkout', {
      state: {
        items: selectedItems,
        voucher: appliedVoucher,
      },
    });
  };

  /* ── Trạng thái Nút Xóa ─────────────────── */
  const bulkDeleteEnabled = selectedIds.length >= 2;
  const isItemTrashEnabled = (id) => selectedIds.includes(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-sky-500/10 blur-3xl scale-150 pointer-events-none" />
            <img
              src="/assets/empty-cart.png"
              alt="Giỏ hàng trống"
              className="relative w-48 h-48 object-contain drop-shadow-2xl select-none"
              draggable={false}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 mb-3 tracking-tight">
            Giỏ hàng trống
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mb-8 text-center max-w-xs leading-relaxed">
            Hãy chọn ngay sản phẩm bạn thích!
          </p>
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

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <Navbar />

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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
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

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <h3
                          className="text-sm font-bold text-slate-100 hover:text-sky-400 cursor-pointer transition-colors line-clamp-2 leading-snug"
                          onClick={() => navigate(`/products/${item.MaSanPham}`)}
                        >
                          {item.TenSanPham}
                        </h3>

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

                        <p className="text-base font-black text-sky-400">
                          {formatVND(item.Gia)}
                        </p>

                        <div className="flex items-center justify-between pt-1 gap-2">
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

            <div className="xl:col-span-1">
              <div className="sticky top-24 space-y-4">
                <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-200">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-violet-400" />
                      <span>Mã giảm giá</span>
                    </div>
                    <span className="text-xs font-normal text-slate-400">Chọn hoặc nhập mã giảm giá</span>
                  </div>

                  {appliedVoucher ? (
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md tracking-wider">
                          {appliedVoucher.MaCode}
                        </span>
                        <span className="text-xs text-emerald-300 font-semibold">
                          Giảm {appliedVoucher.LoaiGiamGia === 'PhanTram' ? `${appliedVoucher.GiaTriGiam}%` : formatVND(appliedVoucher.GiaTriGiam)}
                        </span>
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

                  {!appliedVoucher && availableVouchers.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {availableVouchers.map(v => (
                          <div 
                            key={v.MaVoucher} 
                            onClick={() => {
                              setVoucherCode(v.MaCode);
                            }}
                            className="p-2 bg-slate-800 border border-slate-700 hover:border-sky-500 rounded-lg cursor-pointer transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-sky-400">{v.MaCode}</span>
                              <span className="text-[10px] text-slate-400">
                                Giảm {v.LoaiGiamGia === 'PhanTram' ? `${v.GiaTriGiam}%` : formatVND(v.GiaTriGiam)}
                              </span>
                            </div>
                            {v.DonToiThieu > 0 && (
                              <p className="text-[10px] text-slate-500 mt-1">Đơn tối thiểu {formatVND(v.DonToiThieu)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
                  <h2 className="text-sm font-bold text-slate-200">Tóm tắt đơn hàng</h2>

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
                        {SHIPPING_FEE === null ? '-- đ' : (SHIPPING_FEE === 0 ? 'Miễn phí' : formatVND(SHIPPING_FEE))}
                      </span>
                    </div>

                    {appliedVoucher && (
                      <div className="flex items-center justify-between text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          Giảm giá ({appliedVoucher.MaCode})
                        </span>
                        <span className="font-semibold">- {formatVND(actualDiscount)}</span>
                      </div>
                    )}

                    <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                      <span className="font-bold text-slate-100">Tổng thanh toán:</span>
                      <span className="text-xl font-black text-sky-400">{formatVND(total)}</span>
                    </div>
                  </div>

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
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-2.5">
                  {[
                    { icon: ShieldCheck, label: 'Bảo hành chính hãng 1 đổi 1 trong 30 ngày', color: 'text-sky-400' },
                    { icon: Truck,       label: 'Giao hàng 2H nội thành', color: 'text-indigo-400' },
                    { icon: CreditCard,  label: 'Kiểm tra hàng trước khi nhận và thanh toán COD', color: 'text-emerald-400' },
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
