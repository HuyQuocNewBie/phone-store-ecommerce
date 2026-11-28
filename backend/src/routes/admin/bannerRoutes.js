const express = require('express');
const router = express.Router();
const bannerController = require('../../controllers/admin/bannerController');
const { verifyRole } = require('../../middlewares/authMiddleware');

// Bọc toàn bộ route quản trị Banner bằng quyền Admin (MaVaiTro = 1)
router.use(verifyRole([1]));

// GET /api/v1/admin/banners - Lấy toàn bộ banner
router.get('/', bannerController.getAllBanners);

// POST /api/v1/admin/banners - Thêm banner mới (upload ảnh lên Cloudinary qua Multer)
router.post('/', bannerController.uploadBannerImage, bannerController.createBanner);

// PUT /api/v1/admin/banners/:id - Cập nhật thông tin và ảnh banner (nếu có file mới)
router.put('/:id', bannerController.uploadBannerImage, bannerController.updateBanner);

// PATCH /api/v1/admin/banners/:id/toggle - Đảo trạng thái TrangThai (1 <-> 0)
router.patch('/:id/toggle', bannerController.toggleBannerStatus);

// DELETE /api/v1/admin/banners/:id - Xóa banner
router.delete('/:id', bannerController.deleteBanner);

module.exports = router;
