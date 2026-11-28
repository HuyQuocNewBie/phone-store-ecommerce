const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/common/notificationController');

// GET /api/v1/notifications - Lấy danh sách thông báo theo MaVaiTro (tối đa 50 bản ghi) kèm unreadCount
router.get('/', notificationController.getNotifications);

// PATCH /api/v1/notifications/read-all - Đánh dấu tất cả thông báo thuộc MaVaiTro là đã đọc
router.patch('/read-all', notificationController.markAllNotificationsAsRead);

// PATCH /api/v1/notifications/:id/read - Đánh dấu 1 thông báo cụ thể là đã đọc
router.patch('/:id/read', notificationController.markNotificationAsRead);

// DELETE /api/v1/notifications/:id - Xóa 1 thông báo cụ thể
router.delete('/:id', notificationController.deleteNotificationById);

// DELETE /api/v1/notifications - Xóa tất cả thông báo thuộc MaVaiTro
router.delete('/', notificationController.deleteAllNotifications);

module.exports = router;
