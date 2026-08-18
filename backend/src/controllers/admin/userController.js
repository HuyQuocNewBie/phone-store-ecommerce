const { pool } = require('../../../config/db');

/**
 * 1. GET /api/v1/admin/users
 * Lấy danh sách toàn bộ người dùng (STT, MaNguoiDung, TaiKhoan, Email, MaVaiTro, TenVaiTro)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         n.MaNguoiDung,
         n.TaiKhoan,
         n.Email,
         n.MaVaiTro,
         v.TenVaiTro
       FROM nguoidung n
       JOIN vaitro v ON n.MaVaiTro = v.MaVaiTro
       ORDER BY n.MaNguoiDung DESC`
    );

    const users = rows.map((item, index) => ({
      STT: index + 1,
      MaNguoiDung: item.MaNguoiDung,
      TaiKhoan: item.TaiKhoan,
      Email: item.Email,
      MaVaiTro: item.MaVaiTro,
      TenVaiTro: item.TenVaiTro
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách người dùng thành công',
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/users/:id (Bổ trợ lấy chi tiết người dùng)
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = Number(id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã người dùng không hợp lệ'
      });
    }

    const [rows] = await pool.query(
      `SELECT 
         n.MaNguoiDung,
         n.TaiKhoan,
         n.Email,
         n.AnhDaiDien,
         n.GioiTinh,
         n.NgaySinh,
         n.SoDienThoai,
         n.DiaChi,
         n.MaVaiTro,
         v.TenVaiTro
       FROM nguoidung n
       JOIN vaitro v ON n.MaVaiTro = v.MaVaiTro
       WHERE n.MaNguoiDung = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết người dùng thành công',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. PUT /api/v1/admin/users/:id
 * Sửa thông tin email, tài khoản/họ tên, phân quyền MaVaiTro
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = Number(id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã người dùng không hợp lệ'
      });
    }

    // Kiểm tra người dùng có tồn tại không
    const [existing] = await pool.query(
      `SELECT * FROM nguoidung WHERE MaNguoiDung = ?`,
      [userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    const currentUser = existing[0];
    const { TaiKhoan, Email, MaVaiTro, SoDienThoai, DiaChi, GioiTinh, NgaySinh } = req.body;

    const newTaiKhoan = TaiKhoan !== undefined ? String(TaiKhoan).trim() : currentUser.TaiKhoan;
    const newEmail = Email !== undefined ? String(Email).trim() : currentUser.Email;
    const newMaVaiTro = MaVaiTro !== undefined ? Number(MaVaiTro) : currentUser.MaVaiTro;

    if (!newTaiKhoan) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản không được để trống'
      });
    }

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email không được để trống'
      });
    }

    // Email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Email không đúng định dạng'
      });
    }

    if (isNaN(newMaVaiTro)) {
      return res.status(400).json({
        success: false,
        message: 'Mã vai trò không hợp lệ'
      });
    }

    // Kiểm tra trùng lặp TaiKhoan hoặc Email với người dùng khác
    const [duplicates] = await pool.query(
      `SELECT MaNguoiDung, TaiKhoan, Email 
       FROM nguoidung 
       WHERE (TaiKhoan = ? OR Email = ?) AND MaNguoiDung != ?`,
      [newTaiKhoan, newEmail, userId]
    );

    if (duplicates.length > 0) {
      const dup = duplicates[0];
      if (dup.TaiKhoan.toLowerCase() === newTaiKhoan.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Tên tài khoản này đã được sử dụng bởi người dùng khác'
        });
      }
      if (dup.Email.toLowerCase() === newEmail.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được sử dụng bởi người dùng khác'
        });
      }
    }

    // Kiểm tra MaVaiTro có tồn tại trong bảng vaitro không
    const [roleRows] = await pool.query(
      `SELECT MaVaiTro FROM vaitro WHERE MaVaiTro = ?`,
      [newMaVaiTro]
    );

    if (roleRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã vai trò không tồn tại trong hệ thống'
      });
    }

    // Tiến hành cập nhật
    await pool.query(
      `UPDATE nguoidung SET
         TaiKhoan = ?,
         Email = ?,
         MaVaiTro = ?,
         SoDienThoai = ?,
         DiaChi = ?,
         GioiTinh = ?,
         NgaySinh = ?
       WHERE MaNguoiDung = ?`,
      [
        newTaiKhoan,
        newEmail,
        newMaVaiTro,
        SoDienThoai !== undefined ? SoDienThoai : currentUser.SoDienThoai,
        DiaChi !== undefined ? DiaChi : currentUser.DiaChi,
        GioiTinh !== undefined ? GioiTinh : currentUser.GioiTinh,
        NgaySinh !== undefined ? NgaySinh : currentUser.NgaySinh,
        userId
      ]
    );

    // Lấy tên vai trò mới
    const [vaitroInfo] = await pool.query(
      `SELECT TenVaiTro FROM vaitro WHERE MaVaiTro = ?`,
      [newMaVaiTro]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin người dùng thành công',
      data: {
        MaNguoiDung: userId,
        TaiKhoan: newTaiKhoan,
        Email: newEmail,
        MaVaiTro: newMaVaiTro,
        TenVaiTro: vaitroInfo[0]?.TenVaiTro || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. DELETE /api/v1/admin/users/:id
 * Hard Delete tài khoản khỏi CSDL. Bắt lỗi không cho phép Admin tự xóa chính mình.
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const targetUserId = Number(id);

    if (isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã người dùng không hợp lệ'
      });
    }

    // Bắt lỗi không cho phép Admin tự xóa chính mình
    if (req.user && Number(req.user.MaNguoiDung) === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Không thể tự xóa tài khoản Admin đang đăng nhập'
      });
    }

    // Kiểm tra người dùng có tồn tại không
    const [existing] = await pool.query(
      `SELECT MaNguoiDung FROM nguoidung WHERE MaNguoiDung = ?`,
      [targetUserId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    await pool.query(`DELETE FROM nguoidung WHERE MaNguoiDung = ?`, [targetUserId]);

    return res.status(200).json({
      success: true,
      message: 'Xóa tài khoản người dùng thành công'
    });
  } catch (error) {
    // Bắt lỗi ràng buộc khóa ngoại (ví dụ: người dùng đã có đơn hàng/phiếu nhập/giao dịch)
    if (
      error.code === 'ER_ROW_IS_REFERENCED_2' ||
      error.errno === 1451 ||
      (error.message && error.message.includes('foreign key constraint'))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa người dùng này do đã có dữ liệu giao dịch liên kết trong hệ thống'
      });
    }
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
