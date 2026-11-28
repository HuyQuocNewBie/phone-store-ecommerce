const { pool } = require('../../config/db');

const VALID_NOTIFICATION_TYPES = ['DonHang', 'KhoVan', 'DoiTra', 'DanhGia'];

/**
 * Helper tạo thông báo nội bộ cho Admin (Role 1) hoặc Nhân viên Kho (Role 3).
 *
 * @param {Object} params
 * @param {number} params.vaiTroNhan - Vai trò nhận thông báo (1: Admin, 3: Nhân viên Kho)
 * @param {string} params.tieuDe - Tiêu đề thông báo
 * @param {string} [params.noiDung] - Nội dung chi tiết thông báo
 * @param {'DonHang'|'KhoVan'|'DoiTra'|'DanhGia'} [params.loaiThongBao='DonHang'] - Loại thông báo
 * @param {string} [params.lienKet] - Đường dẫn điều hướng trên Frontend (VD: /admin/orders)
 * @returns {Promise<Object|null>} Bản ghi thông báo vừa tạo hoặc null nếu có lỗi
 */
const pushNotification = async ({
  vaiTroNhan,
  tieuDe,
  noiDung = null,
  loaiThongBao = 'DonHang',
  lienKet = null
} = {}) => {
  try {
    const roleId = Number(vaiTroNhan);
    if (!Number.isInteger(roleId) || ![1, 3].includes(roleId)) {
      console.warn(`[notificationHelper] vaiTroNhan không hợp lệ (${vaiTroNhan}). Chỉ hỗ trợ 1 (Admin) hoặc 3 (Kho).`);
      return null;
    }

    const title = tieuDe !== undefined && tieuDe !== null ? String(tieuDe).trim() : '';
    if (!title) {
      console.warn('[notificationHelper] tieuDe không được để trống.');
      return null;
    }

    const content =
      noiDung !== undefined && noiDung !== null && String(noiDung).trim() !== ''
        ? String(noiDung).trim()
        : null;

    const rawType = loaiThongBao !== undefined && loaiThongBao !== null ? String(loaiThongBao).trim() : 'DonHang';
    const type = VALID_NOTIFICATION_TYPES.includes(rawType) ? rawType : 'DonHang';

    const link =
      lienKet !== undefined && lienKet !== null && String(lienKet).trim() !== ''
        ? String(lienKet).trim()
        : null;

    const [result] = await pool.query(
      `INSERT INTO thongbao (VaiTroNhan, TieuDe, NoiDung, LoaiThongBao, LienKet, DaDoc, NgayTao)
       VALUES (?, ?, ?, ?, ?, 0, NOW())`,
      [roleId, title, content, type, link]
    );

    return {
      MaThongBao: result.insertId,
      VaiTroNhan: roleId,
      TieuDe: title,
      NoiDung: content,
      LoaiThongBao: type,
      LienKet: link,
      DaDoc: 0,
      NgayTao: new Date()
    };
  } catch (error) {
    console.error('[notificationHelper] Lỗi khi tạo thông báo:', error.message);
    return null;
  }
};

module.exports = {
  pushNotification,
  VALID_NOTIFICATION_TYPES
};
