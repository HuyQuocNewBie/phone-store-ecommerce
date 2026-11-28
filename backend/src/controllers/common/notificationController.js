const { pool } = require('../../../config/db');

/**
 * Helper trích xuất và chuẩn hóa MaVaiTro từ req.user
 */
const resolveUserRole = (req) => {
  const rawRole = req.user?.MaVaiTro;
  const roleId = Number(rawRole);
  if (!Number.isNaN(roleId) && [1, 3].includes(roleId)) {
    return roleId;
  }
  const roleStr = String(rawRole || '').trim().toLowerCase();
  if (roleStr === 'admin') return 1;
  if (['warehouse', 'warehouse staff', 'nhân viên kho', 'nhan vien kho', 'kho'].includes(roleStr)) {
    return 3;
  }
  return null;
};

/**
 * Helper format bản ghi thông báo
 */
const formatNotification = (row) => ({
  MaThongBao: Number(row.MaThongBao),
  VaiTroNhan: Number(row.VaiTroNhan),
  TieuDe: row.TieuDe,
  NoiDung: row.NoiDung || null,
  LoaiThongBao: row.LoaiThongBao,
  LienKet: row.LienKet || null,
  DaDoc: Number(row.DaDoc) === 1 ? 1 : 0,
  NgayTao: row.NgayTao
});

/**
 * 1. GET /api/v1/notifications
 * Lấy danh sách thông báo theo req.user.MaVaiTro (sắp xếp mới nhất trước, giới hạn 50 bản ghi)
 * kèm biến unreadCount (số thông báo có DaDoc = 0).
 */
const getNotifications = async (req, res, next) => {
  try {
    const vaiTroNhan = resolveUserRole(req);
    if (!vaiTroNhan) {
      return res.status(403).json({
        success: false,
        message: 'Vai trò người dùng không hợp lệ để xem thông báo nội bộ'
      });
    }

    const [[rows], [unreadRows]] = await Promise.all([
      pool.query(
        `SELECT
           MaThongBao,
           VaiTroNhan,
           TieuDe,
           NoiDung,
           LoaiThongBao,
           LienKet,
           DaDoc,
           NgayTao
         FROM thongbao
         WHERE VaiTroNhan = ?
         ORDER BY NgayTao DESC, MaThongBao DESC
         LIMIT 50`,
        [vaiTroNhan]
      ),
      pool.query(
        `SELECT COUNT(*) AS unreadCount
         FROM thongbao
         WHERE VaiTroNhan = ? AND DaDoc = 0`,
        [vaiTroNhan]
      )
    ]);

    const notifications = rows.map(formatNotification);
    const unreadCount = Number(unreadRows[0]?.unreadCount || 0);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách thông báo thành công',
      unreadCount,
      data: notifications,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. PATCH /api/v1/notifications/:id/read
 * Cập nhật DaDoc = 1 cho 1 thông báo cụ thể thuộc req.user.MaVaiTro.
 */
const markNotificationAsRead = async (req, res, next) => {
  try {
    const vaiTroNhan = resolveUserRole(req);
    if (!vaiTroNhan) {
      return res.status(403).json({
        success: false,
        message: 'Vai trò người dùng không hợp lệ'
      });
    }

    const notificationId = Number(req.params.id);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã thông báo không hợp lệ'
      });
    }

    const [existingRows] = await pool.query(
      `SELECT MaThongBao, VaiTroNhan, TieuDe, NoiDung, LoaiThongBao, LienKet, DaDoc, NgayTao
       FROM thongbao
       WHERE MaThongBao = ? AND VaiTroNhan = ?`,
      [notificationId, vaiTroNhan]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo hoặc thông báo không thuộc vai trò của bạn'
      });
    }

    await pool.query(
      `UPDATE thongbao
       SET DaDoc = 1
       WHERE MaThongBao = ? AND VaiTroNhan = ?`,
      [notificationId, vaiTroNhan]
    );

    const [unreadRows] = await pool.query(
      `SELECT COUNT(*) AS unreadCount
       FROM thongbao
       WHERE VaiTroNhan = ? AND DaDoc = 0`,
      [vaiTroNhan]
    );

    const updatedNotification = formatNotification({
      ...existingRows[0],
      DaDoc: 1
    });

    return res.status(200).json({
      success: true,
      message: 'Đánh dấu đã đọc thông báo thành công',
      unreadCount: Number(unreadRows[0]?.unreadCount || 0),
      data: updatedNotification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. PATCH /api/v1/notifications/read-all
 * Cập nhật DaDoc = 1 cho tất cả thông báo thuộc req.user.MaVaiTro.
 */
const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const vaiTroNhan = resolveUserRole(req);
    if (!vaiTroNhan) {
      return res.status(403).json({
        success: false,
        message: 'Vai trò người dùng không hợp lệ'
      });
    }

    const [result] = await pool.query(
      `UPDATE thongbao
       SET DaDoc = 1
       WHERE VaiTroNhan = ? AND DaDoc = 0`,
      [vaiTroNhan]
    );

    return res.status(200).json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc',
      unreadCount: 0,
      data: {
        updatedCount: result.affectedRows || 0,
        unreadCount: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. DELETE /api/v1/notifications/:id
 * Xóa 1 thông báo cụ thể thuộc req.user.MaVaiTro.
 */
const deleteNotificationById = async (req, res, next) => {
  try {
    const vaiTroNhan = resolveUserRole(req);
    if (!vaiTroNhan) {
      return res.status(403).json({
        success: false,
        message: 'Vai trò người dùng không hợp lệ'
      });
    }

    const notificationId = Number(req.params.id);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã thông báo không hợp lệ'
      });
    }

    const [result] = await pool.query(
      `DELETE FROM thongbao
       WHERE MaThongBao = ? AND VaiTroNhan = ?`,
      [notificationId, vaiTroNhan]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo hoặc thông báo không thuộc vai trò của bạn'
      });
    }

    const [unreadRows] = await pool.query(
      `SELECT COUNT(*) AS unreadCount
       FROM thongbao
       WHERE VaiTroNhan = ? AND DaDoc = 0`,
      [vaiTroNhan]
    );

    return res.status(200).json({
      success: true,
      message: 'Xóa thông báo thành công',
      unreadCount: Number(unreadRows[0]?.unreadCount || 0),
      data: {
        MaThongBao: notificationId,
        deleted: true
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. DELETE /api/v1/notifications
 * Xóa tất cả thông báo thuộc req.user.MaVaiTro.
 */
const deleteAllNotifications = async (req, res, next) => {
  try {
    const vaiTroNhan = resolveUserRole(req);
    if (!vaiTroNhan) {
      return res.status(403).json({
        success: false,
        message: 'Vai trò người dùng không hợp lệ'
      });
    }

    const [result] = await pool.query(
      `DELETE FROM thongbao
       WHERE VaiTroNhan = ?`,
      [vaiTroNhan]
    );

    return res.status(200).json({
      success: true,
      message: 'Đã xóa tất cả thông báo thành công',
      unreadCount: 0,
      data: {
        deletedCount: result.affectedRows || 0,
        unreadCount: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationById,
  deleteAllNotifications
};
