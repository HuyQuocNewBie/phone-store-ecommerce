import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  X,
  Ticket,
  Truck,
  Tag,
  Check,
  Clock,
  Sparkles,
  AlertCircle,
  Percent
} from 'lucide-react';
import api from '../../services/api';

const formatVND = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price) || 0);

const formatCompactVND = (amount) => {
  const num = Number(amount) || 0;
  if (num >= 1000000) {
    const m = num / 1000000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}TR`;
  }
  if (num >= 1000) {
    const k = num / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(0)}K`;
  }
  return `${num}đ`;
};

const isFreeShipVoucher = (v) =>
  Boolean(v && (v.NhomVoucher === 'FreeShip' || String(v.LoaiGiam || '').toLowerCase() === 'freeship'));

const getVoucherHeadline = (v) => {
  const isShip = isFreeShipVoucher(v);
  const loai = String(v.LoaiGiam || '').toLowerCase();
  const val = Number(v.GiaTriGiam) || 0;
  const cap = Number(v.GiamToiDa) || 0;

  if (isShip) {
    if (loai === 'phantram') {
      return `Giảm ${val}% phí vận chuyển${cap > 0 ? ` (tối đa ${formatVND(cap)})` : ''}`;
    }
    if (val > 0) {
      return `Giảm ${formatVND(val)} phí vận chuyển${cap > 0 ? ` (tối đa ${formatVND(cap)})` : ''}`;
    }
    return `Miễn phí vận chuyển${cap > 0 ? ` (tối đa ${formatVND(cap)})` : ''}`;
  }

  if (loai === 'phantram') {
    return `Giảm ${val}% đơn hàng${cap > 0 ? ` (tối đa ${formatVND(cap)})` : ''}`;
  }
  return `Giảm ${formatVND(val)}`;
};

const getVoucherShortBadge = (v) => {
  const isShip = isFreeShipVoucher(v);
  const loai = String(v.LoaiGiam || '').toLowerCase();
  const val = Number(v.GiaTriGiam) || 0;

  if (loai === 'phantram') return `-${val}%`;
  if (isShip && val <= 0) return 'FREE';
  return formatCompactVND(val);
};

/**
 * MultiVoucherDrawer
 * Modal/Drawer phủ kín màn hình chia 2 nhóm chọn độc lập:
 *   - Nhóm 1: Mã Giảm Giá Đơn Hàng (Chọn tối đa 1 mã)
 *   - Nhóm 2: Mã Miễn Phí Vận Chuyển (Chọn tối đa 1 mã)
 * Gọi POST /api/v1/vouchers/apply-multi khi xác nhận.
 */
const MultiVoucherDrawer = ({
  isOpen,
  onClose,
  availableVouchers = [],
  orderSubtotal = 0,
  shippingFee = 0,
  initialGiamGiaDon = null,
  initialFreeShip = null,
  onApplySuccess
}) => {
  const [selectedOrderCode, setSelectedOrderCode] = useState('');
  const [selectedShipCode, setSelectedShipCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [checkingManual, setCheckingManual] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customVouchers, setCustomVouchers] = useState([]);

  // Sync draft selections when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSelectedOrderCode(initialGiamGiaDon?.Code || '');
      setSelectedShipCode(initialFreeShip?.Code || '');
      setManualCode('');
      // Keep any currently applied custom vouchers visible if not in public list
      const extras = [initialGiamGiaDon, initialFreeShip].filter(
        (v) => v && v.Code && !availableVouchers.some((av) => av.Code === v.Code)
      );
      setCustomVouchers(extras);
    }
  }, [isOpen, initialGiamGiaDon, initialFreeShip, availableVouchers]);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const mergedVouchers = useMemo(() => {
    const map = new Map();
    [...availableVouchers, ...customVouchers].forEach((v) => {
      if (v && v.Code) map.set(v.Code.toUpperCase(), v);
    });
    return Array.from(map.values());
  }, [availableVouchers, customVouchers]);

  const orderVouchers = useMemo(() => {
    const list = mergedVouchers.filter((v) => !isFreeShipVoucher(v));
    // Sort eligible first, then higher value
    return list.sort((a, b) => {
      const aElig = orderSubtotal >= Number(a.GiaTriToiThieu || 0) ? 1 : 0;
      const bElig = orderSubtotal >= Number(b.GiaTriToiThieu || 0) ? 1 : 0;
      if (bElig !== aElig) return bElig - aElig;
      return Number(b.GiaTriGiam || 0) - Number(a.GiaTriGiam || 0);
    });
  }, [mergedVouchers, orderSubtotal]);

  const freeShipVouchers = useMemo(() => {
    const list = mergedVouchers.filter((v) => isFreeShipVoucher(v));
    return list.sort((a, b) => {
      const aElig = orderSubtotal >= Number(a.GiaTriToiThieu || 0) ? 1 : 0;
      const bElig = orderSubtotal >= Number(b.GiaTriToiThieu || 0) ? 1 : 0;
      if (bElig !== aElig) return bElig - aElig;
      return Number(b.GiaTriGiam || 0) - Number(a.GiaTriGiam || 0);
    });
  }, [mergedVouchers, orderSubtotal]);

  const selectedCount = (selectedOrderCode ? 1 : 0) + (selectedShipCode ? 1 : 0);

  // Nhập mã thủ công trong drawer
  const handleManualAdd = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) {
      toast.error('Vui lòng nhập mã giảm giá');
      return;
    }

    // Kiểm tra nhanh trong danh sách có sẵn
    const localMatch = mergedVouchers.find((v) => String(v.Code).toUpperCase() === code);
    if (localMatch) {
      const minReq = Number(localMatch.GiaTriToiThieu || 0);
      if (orderSubtotal < minReq) {
        toast.error(
          `Mua thêm ${formatVND(minReq - orderSubtotal)} để sử dụng mã ${localMatch.Code}`
        );
        return;
      }
      if (isFreeShipVoucher(localMatch)) {
        setSelectedShipCode(localMatch.Code);
      } else {
        setSelectedOrderCode(localMatch.Code);
      }
      setManualCode('');
      toast.success(`Đã chọn mã ${localMatch.Code}. Bấm "Áp dụng" để xác nhận!`);
      return;
    }

    // Nếu mã không có trong danh sách public -> xác thực trực tiếp qua API
    setCheckingManual(true);
    try {
      const res = await api.post('/vouchers/apply-multi', {
        codes: [code],
        tongTienHang: orderSubtotal,
        phiShip: Number(shippingFee) || 0
      });

      if (res.data?.success && res.data.data) {
        const applied = res.data.data.appliedVouchers?.[0];
        if (applied) {
          setCustomVouchers((prev) =>
            prev.some((v) => v.Code === applied.Code) ? prev : [applied, ...prev]
          );
          if (isFreeShipVoucher(applied)) {
            setSelectedShipCode(applied.Code);
          } else {
            setSelectedOrderCode(applied.Code);
          }
          setManualCode('');
          toast.success(`Đã tìm thấy và chọn mã ${applied.Code}!`);
        }
      } else {
        toast.error(res.data?.message || 'Mã giảm giá không hợp lệ');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mã giảm giá không tồn tại hoặc không đủ điều kiện');
    } finally {
      setCheckingManual(false);
    }
  };

  // Xác nhận gọi POST /api/v1/vouchers/apply-multi
  const handleConfirmApply = async () => {
    const codes = [selectedOrderCode, selectedShipCode].filter(Boolean);

    if (codes.length === 0) {
      onApplySuccess({
        soTienGiamDon: 0,
        soTienGiamShip: 0,
        tongTienGiam: 0,
        vouchers: { giamGiaDon: null, freeShip: null },
        appliedVouchers: []
      });
      toast.success('Đã gỡ tất cả mã giảm giá.');
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/vouchers/apply-multi', {
        codes,
        tongTienHang: orderSubtotal,
        phiShip: Number(shippingFee) || 0
      });

      if (res.data?.success && res.data.data) {
        onApplySuccess(res.data.data);
        toast.success(
          codes.length === 2
            ? `Đã áp dụng đồng thời 2 mã (${codes.join(' + ')})!`
            : `Áp dụng mã ${codes[0]} thành công!`
        );
        onClose();
      } else {
        toast.error(res.data?.message || 'Không thể áp dụng mã giảm giá');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể áp dụng mã giảm giá đã chọn');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const renderVoucherTicket = (voucher, group) => {
    const isShip = group === 'FreeShip';
    const minReq = Number(voucher.GiaTriToiThieu || 0);
    const isEligible = orderSubtotal >= minReq;
    const shortfall = Math.max(0, minReq - orderSubtotal);
    const isSelected = isShip
      ? selectedShipCode === voucher.Code
      : selectedOrderCode === voucher.Code;

    const handleToggle = () => {
      if (!isEligible) return;
      if (isShip) {
        setSelectedShipCode((prev) => (prev === voucher.Code ? '' : voucher.Code));
      } else {
        setSelectedOrderCode((prev) => (prev === voucher.Code ? '' : voucher.Code));
      }
    };

    return (
      <div
        key={voucher.MaVoucher || voucher.Code}
        role="button"
        tabIndex={isEligible ? 0 : -1}
        aria-disabled={!isEligible}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (isEligible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleToggle();
          }
        }}
        className={`relative flex rounded-2xl border overflow-hidden transition-all select-none ${
          !isEligible
            ? 'opacity-55 grayscale-[35%] bg-slate-50 border-slate-200 cursor-not-allowed'
            : isSelected
            ? isShip
              ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-200 shadow-sm cursor-pointer'
              : 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-200 shadow-sm cursor-pointer'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer'
        }`}
      >
        {/* Ticket Left Stub */}
        <div
          className={`w-24 sm:w-28 shrink-0 flex flex-col items-center justify-center px-2 py-3 text-white text-center relative ${
            !isEligible
              ? 'bg-slate-400'
              : isShip
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
              : 'bg-gradient-to-br from-blue-600 to-indigo-600'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mb-1">
            {isShip ? (
              <Truck className="w-4 h-4 text-white" />
            ) : String(voucher.LoaiGiam).toLowerCase() === 'phantram' ? (
              <Percent className="w-4 h-4 text-white" />
            ) : (
              <Tag className="w-4 h-4 text-white" />
            )}
          </div>
          <span className="text-base sm:text-lg font-black leading-none tracking-tight">
            {getVoucherShortBadge(voucher)}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded bg-white/20">
            {isShip ? 'Freeship' : 'Giảm đơn'}
          </span>
        </div>

        {/* Dashed divider */}
        <div className="w-0 border-l-2 border-dashed border-slate-200 my-2.5 shrink-0" />

        {/* Ticket Body */}
        <div className="flex-1 p-3 sm:p-3.5 flex items-center justify-between gap-3 min-w-0">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-md border ${
                  isShip
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {voucher.Code}
              </span>
              {voucher.SoLuong !== undefined && (
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  Còn {voucher.SoLuong}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              {getVoucherHeadline(voucher)}
            </p>

            <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
              <span>
                Đơn tối thiểu:{' '}
                <strong className="text-slate-700">
                  {minReq > 0 ? formatVND(minReq) : '0 ₫'}
                </strong>
              </span>
              {voucher.NgayHetHan && (
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  HSD: {new Date(voucher.NgayHetHan).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>

            {!isEligible && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md w-fit">
                <AlertCircle className="w-3 h-3 shrink-0 text-amber-600" />
                <span>Mua thêm {formatVND(shortfall)} để sử dụng mã này</span>
              </p>
            )}
          </div>

          {/* Radio-style Circle Indicator */}
          <div className="shrink-0">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                !isEligible
                  ? 'border-slate-300 bg-slate-100'
                  : isSelected
                  ? isShip
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-blue-600 bg-blue-600 text-white shadow-xs'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      id="multi-voucher-drawer-overlay"
      className="fixed inset-0 z-[100] flex justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      {/* Full-height Side Drawer (Full-screen on mobile, spacious panel on desktop) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="multi-voucher-drawer-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl h-full bg-slate-50 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="multi-voucher-drawer-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight"
              >
                Chọn SmartZone Voucher
              </h2>
              <p className="text-xs text-slate-500">
                Chọn đồng thời tối đa 1 mã Giảm giá đơn + 1 mã Freeship
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng ngăn kéo voucher"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Manual Voucher Code Bar ── */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2">
            <input
              id="drawer-voucher-input"
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleManualAdd();
                }
              }}
              placeholder="Nhập mã giảm giá hoặc mã Freeship..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold uppercase tracking-wider text-slate-800 placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            <button
              id="drawer-apply-manual-btn"
              type="button"
              onClick={handleManualAdd}
              disabled={!manualCode.trim() || checkingManual}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold transition-colors disabled:opacity-45 disabled:cursor-not-allowed shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              {checkingManual ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                'Tìm mã'
              )}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Giá trị đơn hàng hiện tại:{' '}
              <strong className="text-slate-800">{formatVND(orderSubtotal)}</strong>
            </span>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderCode('');
                  setSelectedShipCode('');
                }}
                className="text-rose-600 hover:underline font-semibold cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            )}
          </div>
        </div>

        {/* ── Scrollable 2-Group Voucher List ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* NHÓM 1: MÃ GIẢM GIÁ ĐƠN HÀNG */}
          <section className="space-y-3" aria-labelledby="drawer-group-order">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </span>
                <h3 id="drawer-group-order" className="text-sm font-extrabold text-slate-800">
                  Mã Giảm Giá Đơn Hàng
                </h3>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                Chọn tối đa 1 mã {selectedOrderCode ? '(Đã chọn 1)' : ''}
              </span>
            </div>

            {orderVouchers.length > 0 ? (
              <div className="space-y-2.5">
                {orderVouchers.map((v) => renderVoucherTicket(v, 'GiamGiaDon'))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                Hiện chưa có mã giảm giá đơn hàng khả dụng
              </div>
            )}
          </section>

          {/* NHÓM 2: MÃ MIỄN PHÍ VẬN CHUYỂN */}
          <section className="space-y-3" aria-labelledby="drawer-group-ship">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </span>
                <h3 id="drawer-group-ship" className="text-sm font-extrabold text-slate-800">
                  Mã Miễn Phí Vận Chuyển
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Chọn tối đa 1 mã {selectedShipCode ? '(Đã chọn 1)' : ''}
              </span>
            </div>

            {freeShipVouchers.length > 0 ? (
              <div className="space-y-2.5">
                {freeShipVouchers.map((v) => renderVoucherTicket(v, 'FreeShip'))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                Hiện chưa có mã miễn phí vận chuyển khả dụng
              </div>
            )}
          </section>
        </div>

        {/* ── Sticky Footer Actions ── */}
        <div className="bg-white border-t border-slate-200 px-5 py-4 space-y-3 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              {selectedCount > 0 ? (
                <span className="truncate">
                  Đã chọn <strong className="text-slate-900">{selectedCount} mã</strong>:{' '}
                  <strong className="text-blue-600 font-mono">
                    {[selectedOrderCode, selectedShipCode].filter(Boolean).join(' + ')}
                  </strong>
                </span>
              ) : (
                <span>Chưa chọn mã giảm giá nào</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-colors cursor-pointer"
            >
              Trở lại
            </button>
            <button
              id="drawer-confirm-vouchers-btn"
              type="button"
              onClick={handleConfirmApply}
              disabled={submitting}
              className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-extrabold shadow-md shadow-blue-500/25 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Đang áp dụng...</span>
                </>
              ) : (
                <span>
                  {selectedCount > 0
                    ? `Áp dụng (${selectedCount} mã)`
                    : 'Xác nhận (Không dùng mã)'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiVoucherDrawer;
