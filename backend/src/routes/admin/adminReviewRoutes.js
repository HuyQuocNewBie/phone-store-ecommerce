const express = require('express');
const router = express.Router();
const adminReviewController = require('../../controllers/admin/adminReviewController');
const { verifyRole } = require('../../middlewares/authMiddleware');

// Bọc toàn bộ route quản trị Đánh giá bằng quyền Admin (MaVaiTro = 1)
router.use(verifyRole([1]));

// GET /api/v1/admin/reviews - Lấy danh sách đánh giá kèm filter soSao, replyStatus và từ khóa
router.get('/', adminReviewController.getAdminReviews);

// POST /api/v1/admin/reviews/:id/reply - Admin gửi câu trả lời đánh giá
router.post('/:id/reply', adminReviewController.replyToReview);

// DELETE /api/v1/admin/reviews/:id - Xóa đánh giá vi phạm
router.delete('/:id', adminReviewController.deleteReview);

module.exports = router;
