import api from './api';

export const profileService = {
  /**
   * Lấy thông tin hồ sơ cá nhân và địa chỉ mặc định
   */
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },

  /**
   * Cập nhật thông tin hồ sơ (HoTen, GioiTinh, NgaySinh, SoDienThoai, AnhDaiDien)
   * @param {Object} data
   */
  updateProfile: async (data) => {
    const response = await api.put('/profile', data);
    return response.data;
  },

  /**
   * Upload ảnh đại diện lên Cloudinary (qua backend POST /api/v1/upload/avatar)
   * @param {File} file
   */
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Đổi mật khẩu
   * @param {Object} data { matKhauCu, matKhauMoi, xacNhanMatKhauMoi }
   */
  changePassword: async (data) => {
    const response = await api.put('/profile/change-password', data);
    return response.data;
  },
};

export default profileService;

