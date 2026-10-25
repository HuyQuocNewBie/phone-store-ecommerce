const express = require('express');
const router = express.Router();
const reviewController = require('../../controllers/user/reviewController');
const { verifyToken } = require('../../middlewares/authMiddleware');
const { uploadCloudinary } = require('../../../utils/cloudinary');

// 1. GET /api/v1/reviews/summary/:productId -> Thống kê sao & tiêu chí
router.get('/summary/:productId', reviewController.getReviewSummary);

// 2. GET /api/v1/reviews/eligibility/:productId -> Kiểm tra quyền đánh giá của user
router.get('/eligibility/:productId', verifyToken, reviewController.checkEligibility);

// 3. GET /api/v1/reviews/:productId -> Danh sách đánh giá (phân trang + lọc)
router.get('/:productId', reviewController.getReviews);

// 3. POST /api/v1/reviews -> Gửi đánh giá mới (kèm upload tối đa 5 ảnh)
router.post(
  '/',
  verifyToken,
  uploadCloudinary.array('review_images[]', 5),
  reviewController.createReview
);

// 4. POST /api/v1/reviews/:reviewId/replies -> Gửi câu trả lời
router.post('/:reviewId/replies', verifyToken, reviewController.createReply);

// 5. POST /api/v1/reviews/like -> Thích đánh giá hoặc phản hồi
router.post('/like', verifyToken, reviewController.toggleLike);

module.exports = router;
