import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  Boxes,
  Package,
  PackagePlus,
  ClipboardCheck,
  AlertTriangle,
  AlertCircle,
  Search,
  RefreshCw,
  Building2,
  Smartphone,
  HardDrive,
  Palette,
  Barcode,
  Calculator,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Loader2,
  ArrowRight,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import api from '../../services/api';
import Pagination from '../../components/common/Pagination';
import { useAuth } from '../../context/AuthContext';
import { formatVND, formatDateTime } from '../../utils/formatters';

const STOCK_FILTERS = [
  { id: 'all', label: 'Tất cả biến thể' },
  { id: 'in_stock', label: 'Còn hàng (≥ 5)' },
  { id: 'low_stock', label: 'Sắp hết (1 – 4)' },
  { id: 'out_of_stock', label: 'Hết hàng (0)' },
];

const QUICK_ADJUST_REASONS = [
  'Kiểm kê định kỳ phát hiện chênh lệch thực tế trên kệ theo biến thể SKU',
  'Hàng bị trầy xước / móp hộp chuyển khu vực kiểm định',
  'Nhập bổ sung kiểm đếm thừa khi đối soát lô hàng biến thể',
];

const formatImageUrl = (url) => {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const base =
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '')
      : 'http://localhost:5000');
  return `${base}${cleanPath}`;
};

const getColorDotClass = (colorName) => {
  if (!colorName) return 'bg-slate-400';
  const c = String(colorName).toLowerCase();
  if (c.includes('đen') || c.includes('black') || c.includes('midnight') || c.includes('obsidian')) {
    return 'bg-slate-900';
  }
  if (c.includes('trắng') || c.includes('white') || c.includes('starlight') || c.includes('bạc') || c.includes('silver')) {
    return 'bg-slate-100 ring-1 ring-slate-300';
  }
  if (c.includes('titan tự nhiên') || c.includes('natural') || c.includes('xám') || c.includes('gray') || c.includes('grey')) {
    return 'bg-stone-400';
  }
  if (c.includes('xanh dương') || c.includes('xanh biển') || c.includes('blue') || c.includes('navy')) {
    return 'bg-blue-600';
  }
  if (c.includes('xanh lá') || c.includes('green') || c.includes('mint') || c.includes('emerald')) {
    return 'bg-emerald-500';
  }
  if (c.includes('tím') || c.includes('purple') || c.includes('violet')) {
    return 'bg-purple-500';
  }
  if (c.includes('hồng') || c.includes('pink') || c.includes('rose')) {
    return 'bg-pink-400';
  }
  if (c.includes('đỏ') || c.includes('red')) {
    return 'bg-rose-600';
  }
  if (c.includes('vàng') || c.includes('gold') || c.includes('yellow') || c.includes('sa mạc') || c.includes('desert')) {
    return 'bg-amber-400';
  }
  if (c.includes('cam') || c.includes('orange')) {
    return 'bg-orange-500';
  }
  return 'bg-purple-500';
};

/**
 * Định dạng nhãn dropdown biến thể chuẩn: TenSanPham (DungLuong - MauSac)
 */
const formatVariantDropdownLabel = (variant) => {
  if (!variant) return '';
  const name = variant.TenSanPham || `Sản phẩm #${variant.MaSanPham || ''}`;
  const dungLuong = variant.DungLuong ? String(variant.DungLuong).trim() : '';
  const mauSac = variant.MauSac ? String(variant.MauSac).trim() : '';
  const attrs = [dungLuong || 'Tiêu chuẩn', mauSac || 'Mặc định'].join(' - ');
  return `${name} (${attrs})`;
};

const getStockBadge = (tonKho, variantStatus) => {
  const qty = Number(tonKho) || 0;
  if (variantStatus === 'NgungBan') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        Ngừng bán ({qty})
      </span>
    );
  }
  if (qty >= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Còn hàng
      </span>
    );
  }
  if (qty > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Sắp hết
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      Hết hàng
    </span>
  );
};

const getAdjustStatusBadge = (status) => {
  if (status === 'DaDuyet') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Admin đã duyệt
      </span>
    );
  }
  if (status === 'TuChoi') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        Từ chối
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3.5 h-3.5 text-amber-600" />
      Chờ Admin duyệt
    </span>
  );
};

const WarehouseInventoryPage = () => {
  const { user } = useAuth();

  // Core data state (danh sách Biến thể SKU từ sanpham_bienthe)
  const [products, setProducts] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [adjustRequests, setAdjustRequests] = useState([]);
  const [importReceipts, setImportReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Page view & filter state
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'import_receipts' | 'adjust_requests'
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [highlightedVariantId, setHighlightedVariantId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Modal 1: Nhập kho hàng mới (theo MaBienThe)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importForm, setImportForm] = useState({
    MaNhaSanXuat: '',
    MaBienThe: '',
    SoLuongNhap: '1',
    DonGiaNhap: '',
    GhiChu: '',
  });
  const [importError, setImportError] = useState(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);

  // Modal 2: Báo lệch kho (theo MaBienThe)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    maBienThe: '',
    soLuongThucTe: '',
    lyDoGiaiTrinh: '',
  });
  const [adjustError, setAdjustError] = useState(null);
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Fetch danh sách Biến thể SKU (TonKho từ bảng sanpham_bienthe), NSX, phiếu lệch kho & phiếu nhập kho
  const fetchInventoryData = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const fetchStockPromise = api
        .get('/warehouse/inventory/stock-list')
        .catch(async (err) => {
          if (err.response?.status === 404) {
            return api.get('/warehouse/variants');
          }
          throw err;
        });

      const fetchManufacturersPromise = api
        .get('/manufacturers')
        .catch(() => ({ data: { data: [] } }));

      const fetchAdjustmentsPromise = api
        .get('/warehouse/inventory/adjust-requests')
        .catch((err) => {
          if (err.response?.status === 404) {
            return { data: { data: null } };
          }
          throw err;
        });

      const fetchImportsPromise = api
        .get('/warehouse/inventory/import-receipts')
        .catch((err) => {
          if (err.response?.status === 404) {
            return { data: { data: null } };
          }
          throw err;
        });

      const [stockRes, manuRes, adjRes, importsRes] = await Promise.all([
        fetchStockPromise,
        fetchManufacturersPromise,
        fetchAdjustmentsPromise,
        fetchImportsPromise,
      ]);

      const rawVariants = Array.isArray(stockRes.data?.data) ? stockRes.data.data : [];
      const manuList = Array.isArray(manuRes.data?.data) ? manuRes.data.data : [];
      const manuMap = new Map(manuList.map((m) => [Number(m.MaNhaSanXuat), m.TenNhaSanXuat]));

      const normalizedVariants = rawVariants.map((item, idx) => {
        const maBienThe = Number(item.MaBienThe || item.MaSanPham || idx + 1);
        const maSanPham = Number(item.MaSanPham || maBienThe);
        const giaBan = Number(item.GiaBan ?? item.Gia) || 0;
        const giaNhapGanNhat = Number(item.GiaNhapGanNhat) || 0;
        const tonKho = Number(item.TonKho) || 0;
        const mauSac =
          item.MauSac && String(item.MauSac).trim() !== ''
            ? String(item.MauSac).trim()
            : 'Mặc định';
        const dungLuong =
          item.DungLuong && String(item.DungLuong).trim() !== ''
            ? String(item.DungLuong).trim()
            : 'Tiêu chuẩn';

        return {
          ...item,
          MaBienThe: maBienThe,
          MaSanPham: maSanPham,
          MaSKU:
            item.MaSKU ||
            `SP${String(maSanPham).padStart(4, '0')}-${String(maBienThe).padStart(2, '0')}`,
          TenSanPham: item.TenSanPham || `Sản phẩm #${maSanPham}`,
          MauSac: mauSac,
          DungLuong: dungLuong,
          GiaBan: giaBan,
          Gia: giaBan,
          GiaNhapGanNhat: giaNhapGanNhat,
          TonKho: tonKho,
          TrangThai: item.TrangThaiBienThe || item.TrangThai || 'DangBan',
          MaNhaSanXuat: item.MaNhaSanXuat ? Number(item.MaNhaSanXuat) : null,
          TenNhaSanXuat:
            item.TenNhaSanXuat ||
            (item.MaNhaSanXuat ? manuMap.get(Number(item.MaNhaSanXuat)) || null : null),
        };
      });

      setProducts(normalizedVariants);
      setManufacturers(manuList);

      if (Array.isArray(adjRes.data?.data)) {
        setAdjustRequests(adjRes.data.data);
      }

      if (Array.isArray(importsRes.data?.data)) {
        setImportReceipts(importsRes.data.data);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể tải dữ liệu tồn kho biến thể từ hệ thống. Vui lòng thử lại.';
      setError(msg);
      if (silent) {
        toast.error(msg, { id: 'warehouse-inv-fetch-err' });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  // Escape key to close active modal (when not submitting)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (isImportModalOpen && !isSubmittingImport) {
        setIsImportModalOpen(false);
      } else if (isAdjustModalOpen && !isSubmittingAdjust) {
        setIsAdjustModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImportModalOpen, isSubmittingImport, isAdjustModalOpen, isSubmittingAdjust]);

  // Lookup map theo MaBienThe
  const variantMap = useMemo(() => {
    const map = new Map();
    products.forEach((v) => map.set(String(v.MaBienThe), v));
    return map;
  }, [products]);

  // Summary metrics trên toàn bộ Biến thể SKU
  const summaryStats = useMemo(() => {
    const totalVariants = products.length;
    const totalUnits = products.reduce((sum, v) => sum + (Number(v.TonKho) || 0), 0);
    const outOfStockCount = products.filter((v) => Number(v.TonKho) <= 0).length;
    const lowStockCount = products.filter((v) => {
      const qty = Number(v.TonKho);
      return qty > 0 && qty < 5;
    }).length;
    const pendingAdjustCount = adjustRequests.filter(
      (req) => req.TrangThai === 'ChoDuyet'
    ).length;
    const pendingImportCount = importReceipts.filter(
      (req) => req.TrangThai === 'ChoDuyet'
    ).length;

    return {
      totalVariants,
      totalUnits,
      outOfStockCount,
      lowStockCount,
      attentionCount: outOfStockCount + lowStockCount,
      pendingAdjustCount,
      pendingImportCount,
    };
  }, [products, adjustRequests, importReceipts]);

  // Filtered SKU variants
  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return products.filter((v) => {
      const qty = Number(v.TonKho) || 0;
      if (stockFilter === 'in_stock' && qty < 5) return false;
      if (stockFilter === 'low_stock' && (qty <= 0 || qty >= 5)) return false;
      if (stockFilter === 'out_of_stock' && qty > 0) return false;

      if (!keyword) return true;

      const name = String(v.TenSanPham || '').toLowerCase();
      const variantLabel = formatVariantDropdownLabel(v).toLowerCase();
      const btIdStr = String(v.MaBienThe || '');
      const spIdStr = String(v.MaSanPham || '');
      const sku = String(v.MaSKU || '').toLowerCase();
      const color = String(v.MauSac || '').toLowerCase();
      const storage = String(v.DungLuong || '').toLowerCase();
      const manu = String(v.TenNhaSanXuat || '').toLowerCase();

      return (
        name.includes(keyword) ||
        variantLabel.includes(keyword) ||
        sku.includes(keyword) ||
        btIdStr.includes(keyword) ||
        spIdStr.includes(keyword) ||
        `#${btIdStr}`.includes(keyword) ||
        color.includes(keyword) ||
        storage.includes(keyword) ||
        manu.includes(keyword)
      );
    });
  }, [products, searchTerm, stockFilter]);

  // Filtered import receipts
  const filteredImportReceipts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return importReceipts;

    return importReceipts.filter((item) => {
      const idStr = String(item.MaPhieuNhap || '');
      const codeStr = `#pn${String(item.MaPhieuNhap || '').padStart(4, '0')}`.toLowerCase();
      const manu = String(item.TenNhaSanXuat || '').toLowerCase();
      const note = String(item.GhiChu || '').toLowerCase();
      const creator = String(item.TaiKhoanKho || '').toLowerCase();
      const matchProduct = (item.ChiTiet || []).some(
        (ct) =>
          String(ct.TenSanPham || '').toLowerCase().includes(keyword) ||
          String(ct.MauSac || '').toLowerCase().includes(keyword) ||
          String(ct.DungLuong || '').toLowerCase().includes(keyword) ||
          String(ct.MaSKU || '').toLowerCase().includes(keyword) ||
          String(ct.MaBienThe || '').includes(keyword) ||
          String(ct.MaSanPham || '').includes(keyword)
      );

      return (
        idStr.includes(keyword) ||
        codeStr.includes(keyword) ||
        manu.includes(keyword) ||
        note.includes(keyword) ||
        creator.includes(keyword) ||
        matchProduct
      );
    });
  }, [importReceipts, searchTerm]);

  // Filtered adjustment requests
  const filteredAdjustRequests = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return adjustRequests;

    return adjustRequests.filter((item) => {
      const name = String(item.TenSanPham || '').toLowerCase();
      const color = String(item.MauSac || '').toLowerCase();
      const storage = String(item.DungLuong || '').toLowerCase();
      const sku = String(item.MaSKU || '').toLowerCase();
      const idStr = String(item.MaPhieuAdjust || '');
      const btIdStr = String(item.MaBienThe || '');
      const prodIdStr = String(item.MaSanPham || '');
      const reason = String(item.LyDoGiaiTrinh || '').toLowerCase();
      const creator = String(item.NguoiTaoKho || '').toLowerCase();

      return (
        name.includes(keyword) ||
        color.includes(keyword) ||
        storage.includes(keyword) ||
        sku.includes(keyword) ||
        idStr.includes(keyword) ||
        btIdStr.includes(keyword) ||
        prodIdStr.includes(keyword) ||
        reason.includes(keyword) ||
        creator.includes(keyword)
      );
    });
  }, [adjustRequests, searchTerm]);

  // Reset trang về 1 khi đổi tab, bộ lọc hoặc từ khóa tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, stockFilter]);

  const totalProductPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const totalReceiptPages = Math.ceil(filteredImportReceipts.length / ITEMS_PER_PAGE) || 1;
  const paginatedImportReceipts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredImportReceipts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredImportReceipts, currentPage]);

  const totalAdjustPages = Math.ceil(filteredAdjustRequests.length / ITEMS_PER_PAGE) || 1;
  const paginatedAdjustRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAdjustRequests.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAdjustRequests, currentPage]);

  // ── Open Modal 1: Nhập kho hàng mới (theo Biến thể SKU - MaBienThe) ──
  const openImportModal = (preselectedVariant = null) => {
    const targetVariant = preselectedVariant || products[0] || null;
    const defaultVariantId = targetVariant ? String(targetVariant.MaBienThe) : '';
    const defaultManuId = targetVariant?.MaNhaSanXuat
      ? String(targetVariant.MaNhaSanXuat)
      : manufacturers[0]?.MaNhaSanXuat
      ? String(manufacturers[0].MaNhaSanXuat)
      : '';

    setImportForm({
      MaNhaSanXuat: defaultManuId,
      MaBienThe: defaultVariantId,
      SoLuongNhap: '1',
      DonGiaNhap: '',
      GhiChu: '',
    });
    setImportError(null);
    setIsImportModalOpen(true);
  };

  const handleImportVariantChange = (newVariantId) => {
    const selected = variantMap.get(String(newVariantId));
    setImportForm((prev) => ({
      ...prev,
      MaBienThe: newVariantId,
      MaNhaSanXuat: selected?.MaNhaSanXuat
        ? String(selected.MaNhaSanXuat)
        : prev.MaNhaSanXuat,
    }));
    if (importError) setImportError(null);
  };

  const selectedImportVariant = variantMap.get(String(importForm.MaBienThe)) || null;
  const parsedImportQty = Number(importForm.SoLuongNhap);
  const parsedImportPrice = Number(importForm.DonGiaNhap);
  const importTotalAmount =
    Number.isFinite(parsedImportQty) &&
    parsedImportQty > 0 &&
    Number.isFinite(parsedImportPrice) &&
    parsedImportPrice > 0
      ? parsedImportQty * parsedImportPrice
      : 0;

  // Submit Nhập kho hàng mới -> POST /api/v1/warehouse/inventory/import
  const handleSubmitImport = async (e) => {
    e.preventDefault();
    if (isSubmittingImport) return;
    setImportError(null);

    if (!importForm.MaNhaSanXuat && manufacturers.length > 0) {
      setImportError('Vui lòng chọn Nhà sản xuất');
      return;
    }

    if (!importForm.MaBienThe) {
      setImportError('Vui lòng chọn Biến thể SKU cần nhập kho');
      return;
    }

    const qty = Number(importForm.SoLuongNhap);
    if (!Number.isInteger(qty) || qty <= 0) {
      setImportError('Số lượng nhập phải là số nguyên dương lớn hơn 0');
      return;
    }

    const price = Number(importForm.DonGiaNhap);
    if (!Number.isFinite(price) || price < 1000000) {
      setImportError('Đơn giá nhập tối thiểu là 1.000.000đ');
      return;
    }

    const currentSellPrice = Number(selectedImportVariant?.GiaBan ?? selectedImportVariant?.Gia) || 0;
    if (selectedImportVariant && currentSellPrice > 0 && price >= currentSellPrice) {
      setImportError(
        `Đơn giá nhập (${formatVND(price)}) phải thấp hơn giá bán hiện tại (${formatVND(
          currentSellPrice
        )}) của biến thể "${formatVariantDropdownLabel(selectedImportVariant)}"`
      );
      return;
    }

    const payload = {
      MaNhaSanXuat: importForm.MaNhaSanXuat ? Number(importForm.MaNhaSanXuat) : null,
      GhiChu: importForm.GhiChu.trim() || null,
      ChiTietPhieuNhap: [
        {
          MaBienThe: Number(importForm.MaBienThe),
          MaSanPham: Number(selectedImportVariant?.MaSanPham || 0),
          SoLuongNhap: qty,
          DonGiaNhap: price,
        },
      ],
    };

    setIsSubmittingImport(true);
    try {
      await api.post('/warehouse/inventory/import', payload);

      toast.success(
        `Đã gửi phiếu nhập kho biến thể "${formatVariantDropdownLabel(
          selectedImportVariant
        )}" chờ Admin duyệt`
      );

      setHighlightedVariantId(Number(importForm.MaBienThe));
      setIsImportModalOpen(false);
      setActiveTab('import_receipts');
      fetchInventoryData({ silent: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể lập phiếu nhập kho. Vui lòng kiểm tra lại dữ liệu.';
      setImportError(msg);
      toast.error(msg, { id: 'import-err' });
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // ── Open Modal 2: Báo lệch kho (theo Biến thể SKU - MaBienThe) ──
  const openAdjustModal = (preselectedVariant = null) => {
    const targetVariant = preselectedVariant || products[0] || null;
    setAdjustForm({
      maBienThe: targetVariant ? String(targetVariant.MaBienThe) : '',
      soLuongThucTe: targetVariant ? String(targetVariant.TonKho ?? 0) : '',
      lyDoGiaiTrinh: '',
    });
    setAdjustError(null);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustVariantChange = (newVariantId) => {
    const selected = variantMap.get(String(newVariantId));
    setAdjustForm((prev) => ({
      ...prev,
      maBienThe: newVariantId,
      soLuongThucTe: selected ? String(selected.TonKho ?? 0) : '',
    }));
    if (adjustError) setAdjustError(null);
  };

  const selectedAdjustVariant = variantMap.get(String(adjustForm.maBienThe)) || null;
  const systemTonKho = selectedAdjustVariant ? Number(selectedAdjustVariant.TonKho) || 0 : 0;
  const hasActualQtyInput =
    adjustForm.soLuongThucTe !== '' &&
    adjustForm.soLuongThucTe !== null &&
    adjustForm.soLuongThucTe !== undefined;
  const parsedActualQty = hasActualQtyInput ? Number(adjustForm.soLuongThucTe) : NaN;
  const isActualQtyValid = Number.isInteger(parsedActualQty) && parsedActualQty >= 0;
  const discrepancyQty = isActualQtyValid ? parsedActualQty - systemTonKho : null;

  // Submit Báo lệch kho -> POST /api/v1/warehouse/inventory/adjust-request
  const handleSubmitAdjust = async (e) => {
    e.preventDefault();
    if (isSubmittingAdjust) return;
    setAdjustError(null);

    if (!adjustForm.maBienThe) {
      setAdjustError('Vui lòng chọn Biến thể SKU cần báo lệch kho');
      return;
    }

    if (!hasActualQtyInput || !Number.isInteger(parsedActualQty) || parsedActualQty < 0) {
      setAdjustError('Số lượng đếm thực tế phải là số nguyên không âm (≥ 0)');
      return;
    }

    const reason = adjustForm.lyDoGiaiTrinh.trim();
    if (!reason) {
      setAdjustError('Vui lòng nhập lý do giải trình chênh lệch kho');
      return;
    }

    const payload = {
      MaBienThe: Number(adjustForm.maBienThe),
      maBienThe: Number(adjustForm.maBienThe),
      maSanPham: Number(selectedAdjustVariant?.MaSanPham || 0),
      soLuongThucTe: parsedActualQty,
      soLuongChechLech: parsedActualQty - systemTonKho,
      lyDoGiaiTrinh: reason,
    };

    setIsSubmittingAdjust(true);
    try {
      const res = await api.post('/warehouse/inventory/adjust-request', payload);
      const createdTicket = res.data?.data;

      if (createdTicket) {
        const enrichedTicket = {
          ...createdTicket,
          MaBienThe: createdTicket.MaBienThe || payload.MaBienThe,
          MaSKU: createdTicket.MaSKU || selectedAdjustVariant?.MaSKU || null,
          TenSanPham:
            createdTicket.TenSanPham ||
            selectedAdjustVariant?.TenSanPham ||
            `Sản phẩm #${payload.maSanPham}`,
          AnhSanPham: createdTicket.AnhSanPham || selectedAdjustVariant?.Anh || null,
          DungLuong: createdTicket.DungLuong || selectedAdjustVariant?.DungLuong || null,
          MauSac: createdTicket.MauSac || selectedAdjustVariant?.MauSac || null,
          NguoiTaoKho:
            createdTicket.NguoiTaoKho || user?.TaiKhoan || user?.HoTen || 'Nhân viên Kho',
        };
        setAdjustRequests((prev) => [enrichedTicket, ...prev]);
      }

      toast.success(
        `Đã gửi phiếu báo lệch kho cho biến thể "${formatVariantDropdownLabel(
          selectedAdjustVariant
        )}" tới Admin`
      );

      setIsAdjustModalOpen(false);
      setActiveTab('adjust_requests');
      fetchInventoryData({ silent: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Không thể gửi phiếu đề nghị điều chỉnh lệch kho. Vui lòng thử lại.';
      setAdjustError(msg);
      toast.error(msg, { id: 'adjust-err' });
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
      {/* ── Action Banner ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Quản lý Tồn kho theo Biến thể SKU &amp; Đề nghị Điều chỉnh Lệch kho
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Mỗi dòng tương ứng với một biến thể SKU độc lập (<strong>Dung lượng</strong> &amp;{' '}
            <strong>Màu sắc</strong>) có số lượng tồn kho riêng biệt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchInventoryData({ silent: true })}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-all shadow-2xs disabled:opacity-60 cursor-pointer"
            title="Tải lại tồn kho biến thể thực tế"
          >
            <RefreshCw
              className={`w-4 h-4 text-blue-600 ${
                loading || refreshing ? 'animate-spin' : ''
              }`}
            />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            id="btn-warehouse-import"
            onClick={() => openImportModal()}
            disabled={loading || products.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-md shadow-blue-600/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Nhập kho hàng mới</span>
          </button>

          <button
            type="button"
            id="btn-warehouse-adjust"
            onClick={() => openAdjustModal()}
            disabled={loading || products.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Báo lệch kho</span>
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab('inventory');
            setStockFilter('all');
          }}
          className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'inventory' && stockFilter === 'all'
              ? 'border-blue-400 ring-2 ring-blue-500/15 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng Biến thể SKU
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-blue-600">
                {summaryStats.totalVariants}
              </span>
              <span className="text-xs font-medium text-slate-500">biến thể SKU</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Tổng tồn:{' '}
              <strong className="text-slate-800">
                {summaryStats.totalUnits.toLocaleString('vi-VN')}
              </strong>{' '}
              máy
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('inventory');
            setStockFilter(
              summaryStats.outOfStockCount > 0 ? 'out_of_stock' : 'low_stock'
            );
          }}
          className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'inventory' &&
            (stockFilter === 'low_stock' || stockFilter === 'out_of_stock')
              ? 'border-rose-400 ring-2 ring-rose-500/15 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Biến thể sắp hết / Hết
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-rose-600">
                {summaryStats.attentionCount}
              </span>
              <span className="text-xs font-medium text-slate-500">biến thể</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Hết: <strong className="text-rose-600">{summaryStats.outOfStockCount}</strong> · Sắp
              hết: <strong className="text-amber-600">{summaryStats.lowStockCount}</strong>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('import_receipts')}
          className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'import_receipts'
              ? 'border-indigo-400 ring-2 ring-indigo-500/15 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Phiếu nhập chờ duyệt
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-indigo-600">
                {summaryStats.pendingImportCount}
              </span>
              <span className="text-xs font-medium text-slate-500">phiếu</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Tổng đã tạo: <strong className="text-slate-700">{importReceipts.length}</strong> phiếu
              nhập
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <PackagePlus className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('adjust_requests')}
          className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'adjust_requests'
              ? 'border-amber-400 ring-2 ring-amber-500/15 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Phiếu lệch kho chờ duyệt
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-600">
                {summaryStats.pendingAdjustCount}
              </span>
              <span className="text-xs font-medium text-slate-500">phiếu</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Tổng đã lập: <strong className="text-slate-700">{adjustRequests.length}</strong> phiếu
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* ── Tabs + Search & Filter Bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-slate-200">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'inventory'}
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center justify-center gap-2.5 px-4 py-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-blue-600 text-blue-700 bg-blue-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Danh sách Tồn kho (SKU)</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'inventory'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {products.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'import_receipts'}
            onClick={() => setActiveTab('import_receipts')}
            className={`flex items-center justify-center gap-2.5 px-4 py-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'import_receipts'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <PackagePlus className="w-4 h-4 shrink-0" />
            <span>Phiếu nhập kho hàng</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'import_receipts'
                  ? 'bg-indigo-600 text-white'
                  : summaryStats.pendingImportCount > 0
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 font-extrabold'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {importReceipts.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'adjust_requests'}
            onClick={() => setActiveTab('adjust_requests')}
            className={`flex items-center justify-center gap-2.5 px-4 py-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'adjust_requests'
                ? 'border-amber-500 text-amber-700 bg-amber-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <span>Phiếu báo lệch kho</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'adjust_requests'
                  ? 'bg-amber-500 text-white'
                  : summaryStats.pendingAdjustCount > 0
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 font-extrabold'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {adjustRequests.length}
            </span>
          </button>
        </div>

        <div className="p-3.5 sm:p-4 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {activeTab === 'inventory' ? (
            <div className="flex flex-wrap items-center gap-2">
              {STOCK_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStockFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    stockFilter === f.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ) : activeTab === 'import_receipts' ? (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                Phiếu nhập kho gắn với từng <strong>Biến thể SKU</strong> và chỉ cộng{' '}
                <strong>TonKho</strong> sau khi Admin đối chiếu giá nhập và phê duyệt.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Phiếu báo lệch gắn với đúng <strong>Biến thể SKU (Màu sắc &amp; Dung lượng)</strong>{' '}
                — chỉ cập nhật tồn kho sau khi Admin phê duyệt.
              </span>
            </div>
          )}

          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'inventory'
                  ? 'Tìm tên SP, mã SKU, màu sắc, dung lượng, NSX...'
                  : 'Tìm mã phiếu, tên sản phẩm, màu sắc, dung lượng...'
              }
              className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Content Area ── */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-56 bg-slate-200 rounded" />
                <div className="h-3 w-36 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-200 rounded-lg" />
              <div className="h-8 w-28 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white border border-rose-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
          <AlertCircle className="w-11 h-11 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            Không tải được dữ liệu tồn kho biến thể
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => fetchInventoryData()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Thử lại
          </button>
        </div>
      ) : activeTab === 'inventory' ? (
        /* ── Tab 1: SKU Variant Inventory Table ── */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                {searchTerm || stockFilter !== 'all'
                  ? 'Không có biến thể SKU phù hợp với bộ lọc'
                  : 'Chưa có biến thể SKU nào trong kho'}
              </h3>
              {(searchTerm || stockFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setStockFilter('all');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Đặt lại bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 min-w-[320px]">
                      Biến thể Sản phẩm (Màu sắc &amp; Dung lượng)
                    </th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Nhà sản xuất</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Giá bán / Giá nhập</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">
                      Tồn kho biến thể
                    </th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Thao tác nhanh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedProducts.map((variant) => {
                    const isHighlighted = highlightedVariantId === variant.MaBienThe;
                    return (
                      <tr
                        key={variant.MaBienThe}
                        className={`transition-colors ${
                          isHighlighted ? 'bg-emerald-50/70' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                              {variant.Anh ? (
                                <img
                                  src={formatImageUrl(variant.Anh)}
                                  alt={variant.TenSanPham}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextSibling) {
                                      e.currentTarget.nextSibling.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-full h-full items-center justify-center text-slate-300 ${
                                  variant.Anh ? 'hidden' : 'flex'
                                }`}
                              >
                                <Smartphone className="w-5 h-5" />
                              </div>
                            </div>

                            <div className="min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-slate-900 leading-snug">
                                  {variant.TenSanPham}
                                </p>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold text-slate-700">
                                  <Barcode className="w-3 h-3 text-slate-500" />
                                  {variant.MaSKU}
                                </span>
                              </div>

                              {/* Pills DungLuong & MauSac riêng của từng Biến thể SKU */}
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${getColorDotClass(
                                      variant.MauSac
                                    )}`}
                                  />
                                  <Palette className="w-3 h-3" />
                                  <span>Màu: {variant.MauSac || 'Mặc định'}</span>
                                </span>

                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                                  <HardDrive className="w-3 h-3" />
                                  <span>Dung lượng: {variant.DungLuong || 'Tiêu chuẩn'}</span>
                                </span>

                                {variant.TenLoaiSanPham && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                                    {variant.TenLoaiSanPham}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 hidden md:table-cell">
                          {variant.TenNhaSanXuat ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {variant.TenNhaSanXuat}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="font-bold text-slate-800">
                            {formatVND(variant.GiaBan)}
                          </div>
                          {variant.GiaNhapGanNhat > 0 && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Giá nhập gần nhất:{' '}
                              <span className="font-semibold text-emerald-600">
                                {formatVND(variant.GiaNhapGanNhat)}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[68px] px-3 py-1 rounded-xl font-extrabold text-sm border ${
                              variant.TonKho >= 5
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : variant.TonKho > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {variant.TonKho.toLocaleString('vi-VN')}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {getStockBadge(variant.TonKho, variant.TrangThai)}
                        </td>

                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openImportModal(variant)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors cursor-pointer"
                              title={`Nhập kho thêm cho ${formatVariantDropdownLabel(variant)}`}
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              <span>Nhập kho</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openAdjustModal(variant)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold transition-colors cursor-pointer"
                              title={`Báo lệch kho cho ${formatVariantDropdownLabel(variant)}`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Báo lệch</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredProducts.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalProductPages}
              totalItems={filteredProducts.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              className="border-t border-slate-200"
            />
          )}
        </div>
      ) : activeTab === 'import_receipts' ? (
        /* ── Tab 2: Submitted Import Receipts History ── */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {filteredImportReceipts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <PackagePlus className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                {searchTerm
                  ? 'Không tìm thấy phiếu nhập kho phù hợp'
                  : 'Chưa có phiếu nhập kho nào'}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Tất cả các phiếu nhập kho theo biến thể SKU đều hiển thị tại đây để theo dõi tiến độ phê duyệt từ Admin.
              </p>
              {!searchTerm && (
                <button
                  type="button"
                  onClick={() => openImportModal()}
                  disabled={products.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  Lập phiếu nhập kho mới
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-28 text-center">Mã phiếu</th>
                    <th className="py-3.5 px-4 min-w-[170px]">Nhà sản xuất</th>
                    <th className="py-3.5 px-4 min-w-[320px]">Biến thể SKU nhập &amp; Giá nhập</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Tổng tiền nhập</th>
                    <th className="py-3.5 px-4 whitespace-nowrap hidden md:table-cell">
                      Thời gian lập
                    </th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Trạng thái</th>
                    <th className="py-3.5 px-4 whitespace-nowrap hidden lg:table-cell">
                      Admin duyệt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedImportReceipts.map((receipt) => {
                    const items = Array.isArray(receipt.ChiTiet) ? receipt.ChiTiet : [];

                    return (
                      <tr key={receipt.MaPhieuNhap} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 text-center align-top">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 font-mono text-xs font-bold text-indigo-700">
                            #PN{String(receipt.MaPhieuNhap).padStart(4, '0')}
                          </span>
                        </td>

                        <td className="py-4 px-4 align-top">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900">
                              {receipt.TenNhaSanXuat || 'Nhà sản xuất đối tác'}
                            </p>
                            {receipt.GhiChu && (
                              <p className="text-xs text-slate-500 line-clamp-2 italic">
                                &ldquo;{receipt.GhiChu}&rdquo;
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 align-top">
                          {items.length > 0 ? (
                            <div className="space-y-2">
                              {items.map((ct, idx) => {
                                const sellPrice = Number(ct.GiaBan ?? ct.Gia) || 0;
                                return (
                                  <div
                                    key={ct.MaChiTietNhap || `${ct.MaBienThe || ct.MaSanPham}-${idx}`}
                                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span className="font-bold text-slate-900">
                                        {ct.TenSanPham}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-bold">
                                        +{ct.SoLuongNhap} máy
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                      {ct.MauSac && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                                          <Palette className="w-3 h-3" />
                                          Màu: {ct.MauSac}
                                        </span>
                                      )}
                                      {ct.DungLuong && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                                          <HardDrive className="w-3 h-3" />
                                          Dung lượng: {ct.DungLuong}
                                        </span>
                                      )}
                                      {ct.MaSKU && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] text-slate-600">
                                          {ct.MaSKU}
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-1 border-t border-slate-200/60">
                                      <span>
                                        Giá nhập lô mới:{' '}
                                        <strong className="text-emerald-600">
                                          {formatVND(ct.DonGiaNhap)}
                                        </strong>
                                      </span>
                                      {sellPrice > 0 && (
                                        <span className="text-slate-500">
                                          Giá bán hiện tại:{' '}
                                          <strong className="text-blue-700">
                                            {formatVND(sellPrice)}
                                          </strong>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Không có chi tiết</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right font-bold text-emerald-600 whitespace-nowrap align-top">
                          {formatVND(receipt.TongTienNhap)}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500 hidden md:table-cell align-top">
                          {formatDateTime(receipt.NgayNhap)}
                        </td>

                        <td className="py-4 px-4 text-center whitespace-nowrap align-top">
                          {getAdjustStatusBadge(receipt.TrangThai)}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500 hidden lg:table-cell align-top">
                          {receipt.TaiKhoanAdmin ? (
                            <div>
                              <span className="font-semibold text-slate-700">
                                {receipt.TaiKhoanAdmin}
                              </span>
                              {receipt.NgayDuyet && (
                                <p className="text-[11px] text-slate-400">
                                  {formatDateTime(receipt.NgayDuyet)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredImportReceipts.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalReceiptPages}
              totalItems={filteredImportReceipts.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              className="border-t border-slate-200"
            />
          )}
        </div>
      ) : (
        /* ── Tab 3: Submitted Adjust Requests History ── */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {filteredAdjustRequests.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                {searchTerm
                  ? 'Không tìm thấy phiếu báo lệch phù hợp'
                  : 'Chưa có phiếu đề nghị điều chỉnh lệch kho nào'}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Khi kiểm kê phát hiện số lượng thực tế của biến thể SKU khác tồn kho hệ thống, bấm nút &quot;Báo lệch kho&quot; để lập phiếu gửi Admin phê duyệt.
              </p>
              {!searchTerm && (
                <button
                  type="button"
                  onClick={() => openAdjustModal()}
                  disabled={products.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Lập phiếu báo lệch kho
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-24 text-center">Mã phiếu</th>
                    <th className="py-3.5 px-4 min-w-[260px]">Biến thể SKU</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Đếm thực tế</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Chênh lệch</th>
                    <th className="py-3.5 px-4 min-w-[240px]">Lý do giải trình</th>
                    <th className="py-3.5 px-4 whitespace-nowrap hidden md:table-cell">
                      Thời gian lập
                    </th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedAdjustRequests.map((req) => {
                    const diff = Number(req.SoLuongChechLech) || 0;
                    return (
                      <tr key={req.MaPhieuAdjust} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-700">
                            #ADJ{String(req.MaPhieuAdjust).padStart(4, '0')}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-900">
                              {req.TenSanPham || 'Sản phẩm'}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              {req.MauSac && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                                  <Palette className="w-3 h-3" />
                                  Màu: {req.MauSac}
                                </span>
                              )}
                              {req.DungLuong && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                                  <HardDrive className="w-3 h-3" />
                                  Dung lượng: {req.DungLuong}
                                </span>
                              )}
                              {req.MaSKU && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-600">
                                  {req.MaSKU}
                                </span>
                              )}
                            </div>
                            {req.TonKhoHeThong !== undefined && (
                              <p className="text-xs text-slate-500">
                                Tồn HT của biến thể: <strong className="text-slate-700">{req.TonKhoHeThong}</strong> máy
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center font-extrabold text-slate-800">
                          {Number(req.SoLuongThucTe).toLocaleString('vi-VN')}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs font-bold border ${
                              diff < 0
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : diff > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {diff < 0 ? (
                              <TrendingDown className="w-3.5 h-3.5" />
                            ) : diff > 0 ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-700 leading-relaxed max-w-xs">
                          {req.LyDoGiaiTrinh}
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap hidden md:table-cell">
                          <div>{formatDateTime(req.NgayTao)}</div>
                          {req.NguoiTaoKho && (
                            <div className="text-[11px] text-slate-400">
                              bởi {req.NguoiTaoKho}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {getAdjustStatusBadge(req.TrangThai)}
                          {req.TrangThai === 'TuChoi' && req.LyDoTuChoi && (
                            <div
                              className="text-[11px] text-rose-600 mt-1 max-w-[160px] truncate mx-auto font-medium"
                              title={`Lý do từ chối: ${req.LyDoTuChoi}`}
                            >
                              Lý do: {req.LyDoTuChoi}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredAdjustRequests.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalAdjustPages}
              totalItems={filteredAdjustRequests.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              className="border-t border-slate-200"
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: NHẬP KHO HÀNG MỚI (POST /api/v1/warehouse/inventory/import) ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {isImportModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => !isSubmittingImport && setIsImportModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="import-modal-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/20 shrink-0">
                    <PackagePlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="import-modal-title" className="text-base font-bold text-slate-900">
                      Nhập kho hàng mới (Theo Biến thể SKU)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Chọn chính xác biến thể <strong>Dung lượng - Màu sắc</strong> cần nhập lô mới
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => !isSubmittingImport && setIsImportModalOpen(false)}
                  disabled={isSubmittingImport}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="Đóng modal nhập kho"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmitImport} className="p-6 space-y-4">
                {importError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{importError}</span>
                  </div>
                )}

                {/* 1. Nhà sản xuất */}
                <div>
                  <label
                    htmlFor="import-manufacturer"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Nhà sản xuất <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="import-manufacturer"
                      value={importForm.MaNhaSanXuat}
                      onChange={(e) => {
                        setImportForm((prev) => ({ ...prev, MaNhaSanXuat: e.target.value }));
                        if (importError) setImportError(null);
                      }}
                      disabled={isSubmittingImport}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="">-- Chọn Nhà sản xuất --</option>
                      {manufacturers.map((m) => (
                        <option key={m.MaNhaSanXuat} value={m.MaNhaSanXuat}>
                          {m.TenNhaSanXuat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Biến thể SKU: TenSanPham (DungLuong - MauSac) */}
                <div>
                  <label
                    htmlFor="import-product"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Biến thể SKU nhập kho <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="import-product"
                    value={importForm.MaBienThe}
                    onChange={(e) => handleImportVariantChange(e.target.value)}
                    disabled={isSubmittingImport}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="">-- Chọn Biến thể: Tên sản phẩm (Dung lượng - Màu sắc) --</option>
                    {products.map((v) => (
                      <option key={v.MaBienThe} value={v.MaBienThe}>
                        {formatVariantDropdownLabel(v)}
                      </option>
                    ))}
                  </select>

                  {selectedImportVariant && (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-600">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                          <HardDrive className="w-3 h-3" />
                          {selectedImportVariant.DungLuong}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                          <Palette className="w-3 h-3" />
                          {selectedImportVariant.MauSac}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] font-bold text-slate-700">
                          SKU: {selectedImportVariant.MaSKU}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/70">
                        <span>
                          Tồn kho biến thể:{' '}
                          <strong className="text-slate-900">
                            {selectedImportVariant.TonKho} máy
                          </strong>
                        </span>
                        <span>
                          Giá bán hiện tại:{' '}
                          <strong className="text-blue-600">
                            {formatVND(selectedImportVariant.GiaBan)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Số lượng + 4. Giá nhập */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="import-qty"
                      className="block text-xs font-bold text-slate-700 mb-1.5"
                    >
                      Số lượng nhập <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="import-qty"
                      type="number"
                      min="1"
                      step="1"
                      value={importForm.SoLuongNhap}
                      onChange={(e) => {
                        setImportForm((prev) => ({ ...prev, SoLuongNhap: e.target.value }));
                        if (importError) setImportError(null);
                      }}
                      disabled={isSubmittingImport}
                      placeholder="Ví dụ: 10"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="import-price"
                      className="block text-xs font-bold text-slate-700 mb-1.5"
                    >
                      Giá nhập lô mới / máy (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="import-price"
                      type="number"
                      min="1000000"
                      step="10000"
                      value={importForm.DonGiaNhap}
                      onChange={(e) => {
                        setImportForm((prev) => ({ ...prev, DonGiaNhap: e.target.value }));
                        if (importError) setImportError(null);
                      }}
                      disabled={isSubmittingImport}
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-semibold text-slate-800 focus:outline-none transition-all ${
                        parsedImportPrice > 0 &&
                        (parsedImportPrice < 1000000 ||
                          (selectedImportVariant &&
                            parsedImportPrice >= Number(selectedImportVariant.GiaBan)))
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      }`}
                    />
                    {parsedImportPrice > 0 && parsedImportPrice < 1000000 && (
                      <p className="mt-1.5 text-xs text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Đơn giá nhập tối thiểu là 1.000.000đ
                      </p>
                    )}
                    {selectedImportVariant &&
                      parsedImportPrice >= Number(selectedImportVariant.GiaBan) && (
                        <p className="mt-1.5 text-xs text-rose-600 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          Giá nhập phải nhỏ hơn giá bán hiện tại ({formatVND(selectedImportVariant.GiaBan)})
                        </p>
                      )}
                    {selectedImportVariant &&
                      parsedImportPrice >= 1000000 &&
                      parsedImportPrice < Number(selectedImportVariant.GiaBan) && (
                        <p className="mt-1.5 text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          Hợp lệ ({Math.round((parsedImportPrice / Number(selectedImportVariant.GiaBan)) * 100)}% giá bán hiện tại)
                        </p>
                      )}
                    {importTotalAmount > 0 && (
                      <div className="mt-1 text-xs text-emerald-600 font-semibold flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Tổng tiền:</span>
                        <span>{formatVND(importTotalAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Ghi chú */}
                <div>
                  <label
                    htmlFor="import-note"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Ghi chú phiếu nhập <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      id="import-note"
                      type="text"
                      value={importForm.GhiChu}
                      onChange={(e) =>
                        setImportForm((prev) => ({ ...prev, GhiChu: e.target.value }))
                      }
                      disabled={isSubmittingImport}
                      placeholder="Ví dụ: Nhập bổ sung lô hàng chính hãng..."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                      <Boxes className="w-3.5 h-3.5 text-blue-600" />
                      Dự kiến tồn biến thể sau khi Admin duyệt:
                    </span>
                    <span className="font-bold text-blue-700 flex items-center gap-1.5">
                      <span>{selectedImportVariant?.TonKho ?? 0}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>
                        {(selectedImportVariant?.TonKho ?? 0) +
                          (Number.isInteger(parsedImportQty) && parsedImportQty > 0
                            ? parsedImportQty
                            : 0)}{' '}
                        máy
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-blue-200/60">
                    <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                      <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                      Tổng tiền (Đơn giá × Số lượng):
                    </span>
                    <span className="text-sm font-extrabold text-emerald-600">
                      {formatVND(importTotalAmount)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <span>
                      <strong>Quy trình phê duyệt:</strong> Phiếu nhập sẽ lưu ở trạng thái{' '}
                      <strong>Chờ duyệt</strong>. Tồn kho thực tế của biến thể chỉ tăng sau khi
                      Admin đối chiếu giá nhập với giá bán hiện tại và phê duyệt.
                    </span>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    disabled={isSubmittingImport}
                    className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingImport}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/20 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmittingImport ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang tạo phiếu...</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="w-4 h-4" />
                        <span>Gửi phiếu chờ Admin duyệt</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: BÁO LỆCH KHO (POST /api/v1/warehouse/inventory/adjust-request) ── */}
      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {isAdjustModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => !isSubmittingAdjust && setIsAdjustModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjust-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-amber-50/70 border-b border-amber-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/20 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="adjust-modal-title" className="text-base font-bold text-slate-900">
                    Báo lệch kho theo Biến thể SKU
                  </h3>
                  <p className="text-xs text-slate-600">
                    Chọn đúng biến thể <strong>Dung lượng - Màu sắc</strong> để ghi nhận số đếm thực tế
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmittingAdjust && setIsAdjustModalOpen(false)}
                disabled={isSubmittingAdjust}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-amber-100/70 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Đóng modal báo lệch kho"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitAdjust} className="p-6 space-y-4">
              {adjustError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{adjustError}</span>
                </div>
              )}

              {/* 1. Chọn Biến thể SKU: TenSanPham (DungLuong - MauSac) */}
              <div>
                <label
                  htmlFor="adjust-product"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Biến thể SKU kiểm kê <span className="text-rose-500">*</span>
                </label>
                <select
                  id="adjust-product"
                  value={adjustForm.maBienThe}
                  onChange={(e) => handleAdjustVariantChange(e.target.value)}
                  disabled={isSubmittingAdjust}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                >
                  <option value="">-- Chọn Biến thể: Tên sản phẩm (Dung lượng - Màu sắc) --</option>
                  {products.map((v) => (
                    <option key={v.MaBienThe} value={v.MaBienThe}>
                      {formatVariantDropdownLabel(v)}
                    </option>
                  ))}
                </select>

                {selectedAdjustVariant && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                      <HardDrive className="w-3 h-3" />
                      {selectedAdjustVariant.DungLuong}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                      <Palette className="w-3 h-3" />
                      {selectedAdjustVariant.MauSac}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold text-slate-700">
                      SKU: {selectedAdjustVariant.MaSKU}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Số lượng đếm thực tế & Chênh lệch tự động */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tồn kho biến thể trên hệ thống
                  </label>
                  <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-700">
                    {selectedAdjustVariant ? `${systemTonKho} máy` : '—'}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="adjust-actual-qty"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Số lượng đếm thực tế <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="adjust-actual-qty"
                    type="number"
                    min="0"
                    step="1"
                    value={adjustForm.soLuongThucTe}
                    onChange={(e) => {
                      setAdjustForm((prev) => ({ ...prev, soLuongThucTe: e.target.value }));
                      if (adjustError) setAdjustError(null);
                    }}
                    disabled={isSubmittingAdjust}
                    placeholder="Nhập số đếm thực tế..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Live Discrepancy Summary */}
              {selectedAdjustVariant && discrepancyQty !== null && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                    discrepancyQty < 0
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : discrepancyQty > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <span className="font-semibold">
                    Chênh lệch dự kiến (Thực tế − Hệ thống):
                  </span>
                  <span className="font-mono text-sm font-extrabold">
                    {discrepancyQty > 0
                      ? `+${discrepancyQty} máy (Thừa)`
                      : discrepancyQty < 0
                      ? `-${Math.abs(discrepancyQty)} máy (Thiếu)`
                      : '0 máy (Khớp kho)'}
                  </span>
                </div>
              )}

              {/* 3. Lý do giải trình */}
              <div>
                <label
                  htmlFor="adjust-reason"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Lý do giải trình <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="adjust-reason"
                  rows={3}
                  value={adjustForm.lyDoGiaiTrinh}
                  onChange={(e) => {
                    setAdjustForm((prev) => ({ ...prev, lyDoGiaiTrinh: e.target.value }));
                    if (adjustError) setAdjustError(null);
                  }}
                  disabled={isSubmittingAdjust}
                  placeholder="Mô tả chi tiết nguyên nhân lệch kho của biến thể SKU này..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
                />

                {/* Quick Reason Chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_ADJUST_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setAdjustForm((prev) => ({ ...prev, lyDoGiaiTrinh: preset }))
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 hover:border-amber-200 text-[11px] text-slate-600 font-medium transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={isSubmittingAdjust}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm shadow-amber-500/20 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSubmittingAdjust ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang gửi phiếu...</span>
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Gửi phiếu báo lệch kho</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseInventoryPage;
