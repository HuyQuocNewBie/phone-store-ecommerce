const cron = require('node-cron');
const { pool } = require('../../config/db');

/**
 * Tự động hủy các đơn hàng ở trạng thái 'Chờ thanh toán' quá hạn 30 phút.
 * - Cập nhật TrangThaiDonHang = 'Đã hủy'
 * - Cập nhật lichsumuahang = 'Đã hủy' (nếu có)
 * - Hoàn trả tồn kho cho sản phẩm (TonKho = TonKho + SoLuong)
 * - Nếu sản phẩm trước đó có TrangThai = 'HetHang' mà TonKho > 0 -> chuyển về 'DangBan'
 * - Ghi log vào lichsutonkho với LoaiBienDong = 'HuyDon'
 * - Hoàn lại lượt sử dụng voucher (nếu có)
 */
const cancelExpiredOrders = async () => {
  try {
    // 1. Tìm các đơn hàng 'Chờ thanh toán' đã quá 30 phút
    const [expiredOrders] = await pool.query(
      `SELECT MaDonHang, MaVoucher, NgayMuaHang 
       FROM donhang 
       WHERE TrangThaiDonHang = 'Chờ thanh toán' 
         AND NgayMuaHang < NOW() - INTERVAL 30 MINUTE`
    );

    if (!expiredOrders || expiredOrders.length === 0) {
      return;
    }

    console.log(`[CronJob] Phát hiện ${expiredOrders.length} đơn hàng quá hạn thanh toán (> 30 phút). Bắt đầu xử lý...`);

    // 2. Xử lý từng đơn hàng quá hạn trong transaction riêng biệt
    for (const order of expiredOrders) {
      let connection;
      try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Cập nhật trạng thái đơn hàng thành 'Đã hủy'
        await connection.query(
          `UPDATE donhang SET TrangThaiDonHang = 'Đã hủy' WHERE MaDonHang = ?`,
          [order.MaDonHang]
        );

        // Cập nhật bảng lichsumuahang nếu có
        await connection.query(
          `UPDATE lichsumuahang SET TrangThai = 'Đã hủy' WHERE MaDonHang = ?`,
          [order.MaDonHang]
        );

        // Lấy chi tiết các sản phẩm của đơn hàng để hoàn trả kho
        const [items] = await connection.query(
          `SELECT MaSanPham, SoLuong FROM chitietdonhang WHERE MaDonHang = ?`,
          [order.MaDonHang]
        );

        for (const item of items) {
          const soLuong = Number(item.SoLuong) || 0;
          const maSanPham = item.MaSanPham;

          if (soLuong > 0) {
            // Hoàn trả số lượng tồn kho
            await connection.query(
              `UPDATE sanpham SET TonKho = TonKho + ? WHERE MaSanPham = ?`,
              [soLuong, maSanPham]
            );

            // Kiểm tra số lượng tồn kho và trạng thái hiện tại của sản phẩm
            const [prodRows] = await connection.query(
              `SELECT TonKho, TrangThai FROM sanpham WHERE MaSanPham = ?`,
              [maSanPham]
            );

            if (prodRows.length > 0) {
              const newTonKho = Number(prodRows[0].TonKho);
              const currentTrangThai = prodRows[0].TrangThai;

              // Nếu sản phẩm trước đó có TrangThai = 'HetHang' mà TonKho > 0 -> Cập nhật lại TrangThai = 'DangBan'
              if (currentTrangThai === 'HetHang' && newTonKho > 0) {
                await connection.query(
                  `UPDATE sanpham SET TrangThai = 'DangBan' WHERE MaSanPham = ?`,
                  [maSanPham]
                );
              }

              // Ghi log vào lichsutonkho với LoaiBienDong = 'HuyDon'
              await connection.query(
                `INSERT INTO lichsutonkho 
                  (MaSanPham, LoaiBienDong, SoLuongThayDoi, TonThucTeSauDoi, MaThamChieu, NgayThucHien, GhiChu)
                 VALUES (?, 'HuyDon', ?, ?, ?, NOW(), ?)`,
                [
                  maSanPham,
                  soLuong,
                  newTonKho,
                  order.MaDonHang,
                  `Tự động hủy đơn hàng quá hạn thanh toán #${order.MaDonHang}`
                ]
              );
            }
          }
        }

        // Hoàn trả voucher nếu có áp dụng
        if (order.MaVoucher) {
          await connection.query(
            `UPDATE voucher SET SoLuong = SoLuong + 1 WHERE MaVoucher = ?`,
            [order.MaVoucher]
          );
        }

        await connection.commit();
        console.log(`[CronJob] Đã hủy thành công đơn hàng #${order.MaDonHang} và hoàn tồn kho.`);
      } catch (orderError) {
        if (connection) {
          await connection.rollback();
        }
        console.error(`[CronJob] Lỗi khi xử lý hủy đơn hàng #${order.MaDonHang}:`, orderError.message);
      } finally {
        if (connection) {
          connection.release();
        }
      }
    }
  } catch (error) {
    console.error('[CronJob] Lỗi khi truy vấn đơn hàng hết hạn:', error.message);
  }
};

/**
 * Khởi tạo Cron Job chạy định kỳ mỗi 15 phút
 */
const initCronJobs = () => {
  cron.schedule('*/15 * * * *', async () => {
    console.log('[CronJob] Bắt đầu quét đơn hàng quá hạn thanh toán...');
    await cancelExpiredOrders();
  });

  console.log('[CronJob] Đã đăng ký cron job tự động hủy đơn hàng treo (chạy mỗi 15 phút: */15 * * * *)');
};

module.exports = {
  initCronJobs,
  cancelExpiredOrders
};

