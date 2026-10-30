const express = require('express');
const router = express.Router();
const addressController = require('../../controllers/user/addressController');
const { verifyToken } = require('../../middlewares/authMiddleware');

// Tất cả các route sổ địa chỉ đều yêu cầu JWT Token
router.use(verifyToken);

// 1. GET /api/v1/addresses -> Lấy danh sách địa chỉ của người dùng (LaMacDinh lên đầu)
router.get('/', addressController.getAddresses);

// 2. POST /api/v1/addresses -> Thêm địa chỉ mới (nếu LaMacDinh=1 thì reset các địa chỉ cũ)
router.post('/', addressController.createAddress);

// 3. PUT /api/v1/addresses/:id -> Cập nhật địa chỉ theo MaDiaChi (nếu LaMacDinh=1 thì reset các địa chỉ khác)
router.put('/:id', addressController.updateAddress);

// 4. DELETE /api/v1/addresses/:id -> Xóa địa chỉ (chặn nếu là địa chỉ mặc định)
router.delete('/:id', addressController.deleteAddress);

module.exports = router;

