import api from './api';

// Cache in-memory để tránh gọi lại API nhiều lần khi đóng/mở Drawer
let provincesCache = null;
const districtCache = new Map();

export const addressService = {
  /**
   * Lấy danh sách địa chỉ của người dùng đang đăng nhập
   */
  getAddresses: async () => {
    const response = await api.get('/addresses');
    return response.data;
  },

  /**
   * Thêm địa chỉ mới
   * @param {Object} data { TenGoiNho, TinhThanh, QuanHuyen, PhuongXa, DiaChiNha, LaMacDinh }
   */
  createAddress: async (data) => {
    const response = await api.post('/addresses', data);
    return response.data;
  },

  /**
   * Cập nhật địa chỉ theo MaDiaChi
   * @param {number|string} id
   * @param {Object} data
   */
  updateAddress: async (id, data) => {
    const response = await api.put(`/addresses/${id}`, data);
    return response.data;
  },

  /**
   * Xóa địa chỉ theo MaDiaChi
   * @param {number|string} id
   */
  deleteAddress: async (id) => {
    const response = await api.delete(`/addresses/${id}`);
    return response.data;
  },

  /**
   * Lấy danh sách Tỉnh/Thành phố từ Open API: https://provinces.open-api.vn/api/p/
   */
  getProvinces: async () => {
    if (provincesCache && provincesCache.length > 0) {
      return provincesCache;
    }
    const response = await fetch('https://provinces.open-api.vn/api/p/');
    if (!response.ok) {
      throw new Error('Không thể tải danh sách Tỉnh/Thành phố');
    }
    const data = await response.json();
    provincesCache = data;
    return data;
  },

  /**
   * Lấy danh sách Phường/Xã / Quận/Huyện tương ứng theo mã Tỉnh/Thành phố
   * URL: https://provinces.open-api.vn/api/p/{code}?depth=2
   */
  getDistrictsByProvince: async (provinceCode) => {
    if (!provinceCode) return [];
    const codeKey = String(provinceCode);
    if (districtCache.has(codeKey)) {
      return districtCache.get(codeKey);
    }
    const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
    if (!response.ok) {
      throw new Error('Không thể tải danh sách Phường/Xã');
    }
    const data = await response.json();
    const districts = data.districts || [];
    districtCache.set(codeKey, districts);
    return districts;
  },
};

export default addressService;

