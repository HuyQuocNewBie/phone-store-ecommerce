import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  Trash2,
  Edit3,
  X,
  UploadCloud,
  Link2,
  ArrowUpDown,
  CheckCircle2,
  EyeOff,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import Pagination from '../../components/common/Pagination';

const ITEMS_PER_PAGE = 6;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const INITIAL_FORM = {
  TieuDe: '',
  MoTaNgan: '',
  LienKetDich: '',
  ThuTuHienThi: '1',
  TrangThai: 1,
};

/**
 * Trang Quản lý Banner quảng cáo (Admin)
 * Hỗ trợ: Danh sách, tìm kiếm, bật/tắt nhanh, thêm/sửa bằng modal createPortal, xóa banner.
 */
const AdminBannersPage = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | ACTIVE | INACTIVE
  const [currentPage, setCurrentPage] = useState(1);

  // Toggle / Delete states
  const [togglingId, setTogglingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Add / Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const objectUrlRef = useRef('');

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
  }, []);

  useEffect(() => {
    return () => revokeObjectUrl();
  }, [revokeObjectUrl]);

  // Fetch danh sách banner từ Admin API
  const fetchBanners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/banners');
      setBanners(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách banner');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Lock body scroll & Escape listener khi modal đang mở
  useEffect(() => {
    const hasModal = isModalOpen || Boolean(deleteTarget);
    if (hasModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (deleteTarget && !deleting) {
          setDeleteTarget(null);
        } else if (isModalOpen && !submitting) {
          handleCloseModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, deleteTarget, submitting, deleting]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = banners.length;
    const active = banners.filter((b) => Number(b.TrangThai) === 1).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [banners]);

  // Lọc & tìm kiếm
  const filteredBanners = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return banners.filter((b) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && Number(b.TrangThai) === 1) ||
        (statusFilter === 'INACTIVE' && Number(b.TrangThai) !== 1);

      if (!matchesStatus) return false;
      if (!q) return true;

      return (
        (b.TieuDe || '').toLowerCase().includes(q) ||
        (b.MoTaNgan || '').toLowerCase().includes(q) ||
        (b.LienKetDich || '').toLowerCase().includes(q)
      );
    });
  }, [banners, searchTerm, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredBanners.length / ITEMS_PER_PAGE) || 1;
  const paginatedBanners = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBanners.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBanners, currentPage]);

  // Đóng Modal Thêm/Sửa
  const handleCloseModal = () => {
    if (submitting) return;
    revokeObjectUrl();
    setIsModalOpen(false);
    setEditingBanner(null);
    setFormData(INITIAL_FORM);
    setImageFile(null);
    setImagePreviewUrl('');
    setFormErrors({});
    setIsDragging(false);
  };

  // Mở Modal Thêm mới
  const handleOpenCreateModal = () => {
    revokeObjectUrl();
    const nextOrder =
      banners.length > 0
        ? Math.max(...banners.map((b) => Number(b.ThuTuHienThi) || 0)) + 1
        : 1;
    setEditingBanner(null);
    setFormData({
      ...INITIAL_FORM,
      ThuTuHienThi: String(nextOrder),
    });
    setImageFile(null);
    setImagePreviewUrl('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Mở Modal Chỉnh sửa
  const handleOpenEditModal = (banner) => {
    revokeObjectUrl();
    setEditingBanner(banner);
    setFormData({
      TieuDe: banner.TieuDe || '',
      MoTaNgan: banner.MoTaNgan || '',
      LienKetDich: banner.LienKetDich || '',
      ThuTuHienThi: String(banner.ThuTuHienThi ?? 1),
      TrangThai: Number(banner.TrangThai) === 1 ? 1 : 0,
    });
    setImageFile(null);
    setImagePreviewUrl(banner.HinhAnh || '');
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Xử lý chọn file ảnh
  const handleSelectImageFile = (file) => {
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      setFormErrors((prev) => ({
        ...prev,
        HinhAnh: 'Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP...)',
      }));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFormErrors((prev) => ({
        ...prev,
        HinhAnh: `Dung lượng ảnh tối đa ${MAX_FILE_SIZE_MB}MB`,
      }));
      return;
    }

    revokeObjectUrl();
    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setImageFile(file);
    setImagePreviewUrl(previewUrl);
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.HinhAnh;
      return next;
    });
  };

  const handleClearSelectedFile = () => {
    revokeObjectUrl();
    setImageFile(null);
    setImagePreviewUrl(editingBanner?.HinhAnh || '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate Form
  const validateForm = () => {
    const nextErrors = {};

    if (!formData.TieuDe.trim()) {
      nextErrors.TieuDe = 'Tiêu đề banner không được để trống';
    }

    const orderVal = Number(formData.ThuTuHienThi);
    if (
      formData.ThuTuHienThi === '' ||
      !Number.isInteger(orderVal) ||
      orderVal < 0
    ) {
      nextErrors.ThuTuHienThi = 'Thứ tự hiển thị phải là số nguyên >= 0';
    }

    if (!editingBanner && !imageFile) {
      nextErrors.HinhAnh = 'Vui lòng tải lên hình ảnh banner';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Submit Thêm / Sửa Banner
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = new FormData();
    payload.append('TieuDe', formData.TieuDe.trim());
    payload.append('MoTaNgan', formData.MoTaNgan.trim());
    payload.append('LienKetDich', formData.LienKetDich.trim());
    payload.append('ThuTuHienThi', String(Number(formData.ThuTuHienThi)));
    payload.append('TrangThai', String(formData.TrangThai));
    if (imageFile) {
      payload.append('HinhAnh', imageFile);
    }

    setSubmitting(true);
    try {
      if (editingBanner) {
        const res = await api.put(
          `/admin/banners/${editingBanner.MaBanner}`,
          payload,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          }
        );
        toast.success(res.data?.message || 'Cập nhật banner thành công', {
          id: `banner-save-${editingBanner.MaBanner}`,
        });
      } else {
        const res = await api.post('/admin/banners', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        });
        toast.success(res.data?.message || 'Thêm banner mới thành công', {
          id: 'banner-save-new',
        });
      }

      revokeObjectUrl();
      setIsModalOpen(false);
      setEditingBanner(null);
      setFormData(INITIAL_FORM);
      setImageFile(null);
      setImagePreviewUrl('');
      await fetchBanners();
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể lưu banner. Vui lòng thử lại.';
      toast.error(msg, { id: 'banner-save-err' });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle nhanh trạng thái Bật/Tắt
  const handleToggleStatus = async (banner) => {
    setTogglingId(banner.MaBanner);
    try {
      const res = await api.patch(`/admin/banners/${banner.MaBanner}/toggle`);
      const updated = res.data?.data;
      const newStatus =
        updated?.TrangThai !== undefined
          ? Number(updated.TrangThai)
          : Number(banner.TrangThai) === 1
            ? 0
            : 1;

      setBanners((prev) =>
        prev.map((item) =>
          item.MaBanner === banner.MaBanner
            ? { ...item, TrangThai: newStatus }
            : item
        )
      );

      toast.success(
        res.data?.message ||
          (newStatus === 1 ? 'Đã bật hiển thị banner' : 'Đã ẩn banner'),
        { id: `banner-toggle-${banner.MaBanner}` }
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Không thể cập nhật trạng thái banner',
        { id: `banner-toggle-err-${banner.MaBanner}` }
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Xóa banner
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/admin/banners/${deleteTarget.MaBanner}`);
      toast.success(res.data?.message || 'Xóa banner thành công', {
        id: `banner-delete-${deleteTarget.MaBanner}`,
      });
      setBanners((prev) =>
        prev.filter((item) => item.MaBanner !== deleteTarget.MaBanner)
      );
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Không thể xóa banner này',
        { id: `banner-delete-err-${deleteTarget.MaBanner}` }
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* ── Top Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <ImageIcon className="w-7 h-7 text-blue-600" />
            Quản lý Banner Quảng Cáo
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý hình ảnh slider trang chủ, liên kết điều hướng và thứ tự hiển thị
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchBanners}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm banner mới</span>
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng số Banner</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Tất cả banner đã tải lên</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <ImageIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang hiển thị</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</h3>
            <span className="text-[11px] text-emerald-500 font-medium mt-0.5 block">Hiển thị trên Slider trang chủ</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang tạm ẩn</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.inactive}</h3>
            <span className="text-[11px] text-amber-500 font-medium mt-0.5 block">Không hiển thị với khách hàng</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <EyeOff className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Search & Status Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề, mô tả hoặc liên kết đích..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none text-slate-800 text-sm focus:outline-none placeholder-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              Xóa
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm shrink-0">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'ACTIVE', label: 'Đang bật' },
            { id: 'INACTIVE', label: 'Đang ẩn' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Banner Table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <div className="p-10 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-slate-700 font-medium">{error}</p>
            <button
              type="button"
              onClick={fetchBanners}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 w-14 text-center">STT</th>
                  <th className="px-5 py-4 w-60">Ảnh Banner (16:5)</th>
                  <th className="px-5 py-4 min-w-[220px]">Tiêu đề</th>
                  <th className="px-5 py-4 min-w-[160px]">Liên kết đích</th>
                  <th className="px-5 py-4 w-32 text-center">Thứ tự</th>
                  <th className="px-5 py-4 w-36 text-center">Hiển thị</th>
                  <th className="px-5 py-4 w-28 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4 text-center">
                        <div className="h-4 bg-slate-200 rounded w-6 mx-auto" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-48 aspect-[16/5] bg-slate-200 rounded-xl" />
                      </td>
                      <td className="px-5 py-4 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-44" />
                        <div className="h-3 bg-slate-100 rounded w-32" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-6 bg-slate-200 rounded-lg w-28" />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="h-6 bg-slate-200 rounded-lg w-10 mx-auto" />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="h-6 bg-slate-200 rounded-full w-11 mx-auto" />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="h-8 bg-slate-200 rounded-lg w-16 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredBanners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                      <p className="text-slate-600 font-semibold">
                        {searchTerm || statusFilter !== 'ALL'
                          ? 'Không tìm thấy banner phù hợp bộ lọc'
                          : 'Chưa có banner nào trong hệ thống'}
                      </p>
                      {!searchTerm && statusFilter === 'ALL' && (
                        <button
                          type="button"
                          onClick={handleOpenCreateModal}
                          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Thêm banner đầu tiên</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedBanners.map((banner, index) => {
                    const isActive = Number(banner.TrangThai) === 1;
                    const isToggling = togglingId === banner.MaBanner;

                    return (
                      <tr key={banner.MaBanner} className="hover:bg-slate-50/80 transition-colors">
                        {/* STT */}
                        <td className="px-5 py-4 text-center font-medium text-slate-400 text-xs">
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </td>

                        {/* Ảnh preview ngang 16:5 */}
                        <td className="px-5 py-3.5">
                          <div className="w-48 sm:w-52 aspect-[16/5] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs relative group">
                            {banner.HinhAnh ? (
                              <img
                                src={banner.HinhAnh}
                                alt={banner.TieuDe}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextSibling) {
                                    e.currentTarget.nextSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div
                              className="w-full h-full items-center justify-center text-slate-400 bg-slate-100"
                              style={{ display: banner.HinhAnh ? 'none' : 'flex' }}
                            >
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          </div>
                        </td>

                        {/* Tiêu đề & Mô tả ngắn */}
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 line-clamp-1">
                            {banner.TieuDe}
                          </div>
                          {banner.MoTaNgan ? (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 max-w-md">
                              {banner.MoTaNgan}
                            </p>
                          ) : (
                            <span className="text-[11px] italic text-slate-400 mt-0.5 block">
                              Không có mô tả ngắn
                            </span>
                          )}
                        </td>

                        {/* Liên kết đích */}
                        <td className="px-5 py-4">
                          {banner.LienKetDich ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs max-w-[210px] truncate">
                              <Link2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate">{banner.LienKetDich}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Không gắn liên kết</span>
                          )}
                        </td>

                        {/* Thứ tự hiển thị */}
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 font-bold text-xs">
                            <ArrowUpDown className="w-3 h-3" />
                            {banner.ThuTuHienThi}
                          </span>
                        </td>

                        {/* Công tắc gạt Bật/Tắt nhanh */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleToggleStatus(banner)}
                              aria-label={isActive ? 'Ẩn banner' : 'Bật hiển thị banner'}
                              title={isActive ? 'Đang bật — bấm để ẩn' : 'Đang ẩn — bấm để bật'}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                                isActive ? 'bg-blue-600' : 'bg-slate-300'
                              } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  isActive ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span
                              className={`text-[10px] font-semibold ${
                                isActive ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            >
                              {isActive ? 'Đang bật' : 'Đang ẩn'}
                            </span>
                          </div>
                        </td>

                        {/* Thao tác */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(banner)}
                              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa banner"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(banner)}
                              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa banner"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {filteredBanners.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredBanners.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            className="border-t border-slate-200"
          />
        )}
      </div>

      {/* ── MODAL THÊM / SỬA BANNER (createPortal phủ kín màn hình) ── */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseModal();
            }}
          >
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {editingBanner ? 'Chỉnh sửa Banner' : 'Thêm Banner Mới'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Khuyến nghị ảnh ngang tỷ lệ 16:5 (VD: 1600×500px) để hiển thị sắc nét trên Trang chủ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  aria-label="Đóng modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
                {/* Upload & Preview ảnh tỷ lệ 16:5 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Hình ảnh Banner {!editingBanner && <span className="text-rose-500">*</span>}
                    </label>
                    {imageFile && (
                      <button
                        type="button"
                        onClick={handleClearSelectedFile}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        Bỏ ảnh mới chọn
                      </button>
                    )}
                  </div>

                  {/* Preview Box (16:5) */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const droppedFile = e.dataTransfer.files?.[0];
                      if (droppedFile) handleSelectImageFile(droppedFile);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative w-full aspect-[16/5] rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-all group ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : formErrors.HinhAnh
                          ? 'border-rose-400 bg-rose-50/40'
                          : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30'
                    }`}
                  >
                    {imagePreviewUrl ? (
                      <>
                        <img
                          src={imagePreviewUrl}
                          alt="Xem trước banner"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1.5">
                          <UploadCloud className="w-7 h-7" />
                          <span className="text-xs font-semibold">
                            Bấm hoặc kéo thả ảnh khác để thay thế
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 px-4 text-center">
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-blue-600 mb-2">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          Bấm để chọn hoặc kéo thả ảnh banner vào đây
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Hỗ trợ JPG, PNG, WEBP — Tối đa {MAX_FILE_SIZE_MB}MB (Tỷ lệ khuyến nghị 16:5)
                        </p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSelectImageFile(file);
                      }}
                    />
                  </div>

                  {imageFile && (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      Đã chọn: {imageFile.name} ({(imageFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}

                  {formErrors.HinhAnh && (
                    <p className="text-xs text-rose-600 font-medium">{formErrors.HinhAnh}</p>
                  )}
                </div>

                {/* Tiêu đề */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tiêu đề Banner <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.TieuDe}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, TieuDe: e.target.value }));
                      if (formErrors.TieuDe) {
                        setFormErrors((prev) => ({ ...prev, TieuDe: undefined }));
                      }
                    }}
                    placeholder="VD: Siêu Sale iPhone 16 Pro Max — Giảm đến 5 triệu"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                      formErrors.TieuDe
                        ? 'border-rose-400 focus:ring-rose-500/20'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  />
                  {formErrors.TieuDe && (
                    <p className="text-xs text-rose-600 font-medium">{formErrors.TieuDe}</p>
                  )}
                </div>

                {/* Mô tả ngắn */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mô tả ngắn
                  </label>
                  <textarea
                    rows={2}
                    value={formData.MoTaNgan}
                    onChange={(e) => setFormData((prev) => ({ ...prev, MoTaNgan: e.target.value }))}
                    placeholder="VD: Trợ giá thu cũ đổi mới đến 2.500.000đ, trả góp 0% lãi suất..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>

                {/* Liên kết đích & Thứ tự hiển thị */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Liên kết đích
                    </label>
                    <div className="relative">
                      <ExternalLink className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.LienKetDich}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, LienKetDich: e.target.value }))
                        }
                        placeholder="VD: /vouchers, /products"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['/products', '/vouchers', '/products?search=iPhone'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, LienKetDich: preset }))
                          }
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 text-[11px] font-mono text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Thứ tự hiển thị
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={formData.ThuTuHienThi}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, ThuTuHienThi: e.target.value }));
                        if (formErrors.ThuTuHienThi) {
                          setFormErrors((prev) => ({ ...prev, ThuTuHienThi: undefined }));
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 transition-all ${
                        formErrors.ThuTuHienThi
                          ? 'border-rose-400 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
                      }`}
                    />
                    {formErrors.ThuTuHienThi && (
                      <p className="text-xs text-rose-600 font-medium">
                        {formErrors.ThuTuHienThi}
                      </p>
                    )}
                  </div>
                </div>

                {/* Trạng thái hiển thị */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Trạng thái hiển thị ngay trên Trang chủ
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Bật để banner xuất hiện trong Slider trang chủ ngay sau khi lưu
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        TrangThai: prev.TrangThai === 1 ? 0 : 1,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      formData.TrangThai === 1 ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        formData.TrangThai === 1 ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Modal Footer */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang lưu banner...</span>
                      </>
                    ) : (
                      <span>{editingBanner ? 'Lưu thay đổi' : 'Tạo Banner'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ── MODAL XÁC NHẬN XÓA BANNER (createPortal) ── */}
      {deleteTarget &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !deleting) setDeleteTarget(null);
            }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Xác nhận xóa Banner</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Bạn có chắc chắn muốn xóa banner{' '}
                      <strong className="text-slate-800">"{deleteTarget.TieuDe}"</strong>? Hành động này không thể hoàn tác.
                    </p>
                  </div>
                </div>

                {deleteTarget.HinhAnh && (
                  <div className="w-full aspect-[16/5] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={deleteTarget.HinhAnh}
                      alt={deleteTarget.TieuDe}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Xóa banner</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminBannersPage;
