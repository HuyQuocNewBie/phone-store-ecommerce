const { pool } = require('../../../config/db');

/**
 * 1. GET /api/v1/admin/dashboard/cards
 * Trả về 4 chỉ số:
 * - Doanh thu tháng này: Tổng TongTien đơn 'Đã hoàn thành' trong tháng hiện tại.
 * - Doanh thu năm nay: Tổng TongTien đơn 'Đã hoàn thành' trong năm hiện tại.
 * - Lợi nhuận tháng này: Tổng Doanh Thu Bán Tháng Này - Tổng Giá Vốn Nhập Kho của các sản phẩm đã bán thành công trong tháng đó (dùng DonGiaNhap từ chitietphieunhap/phieunhapkho gần nhất).
 * - Tổng số đơn hàng: Tổng số bản ghi trong bảng donhang.
 */
const getDashboardCards = async (req, res, next) => {
  try {
    // 1. Doanh thu tháng này
    const [revenueMonthRows] = await pool.query(
      `SELECT COALESCE(SUM(TongTien), 0) AS doanhThuThang
       FROM donhang
       WHERE TrangThaiDonHang = 'Đã hoàn thành'
         AND YEAR(NgayMuaHang) = YEAR(CURRENT_DATE())
         AND MONTH(NgayMuaHang) = MONTH(CURRENT_DATE())`
    );

    // 2. Doanh thu năm nay
    const [revenueYearRows] = await pool.query(
      `SELECT COALESCE(SUM(TongTien), 0) AS doanhThuNam
       FROM donhang
       WHERE TrangThaiDonHang = 'Đã hoàn thành'
         AND YEAR(NgayMuaHang) = YEAR(CURRENT_DATE())`
    );

    // 3. Tổng giá vốn nhập kho của các sản phẩm đã bán thành công trong tháng này
    // Xử lý lấy DonGiaNhap gần nhất của sản phẩm từ phieunhapkho/chitietphieunhap
    const [cogsMonthRows] = await pool.query(
      `SELECT COALESCE(SUM(
         ct.SoLuong * COALESCE(
           (
             SELECT ctp.DonGiaNhap
             FROM chitietphieunhap ctp
             JOIN phieunhapkho pnk ON ctp.MaPhieuNhap = pnk.MaPhieuNhap
             WHERE ctp.MaSanPham = ct.MaSanPham
             ORDER BY pnk.NgayNhap DESC, ctp.MaChiTietNhap DESC
             LIMIT 1
           ),
           0
         )
       ), 0) AS tongGiaVonThang
       FROM chitietdonhang ct
       JOIN donhang d ON ct.MaDonHang = d.MaDonHang
       WHERE d.TrangThaiDonHang = 'Đã hoàn thành'
         AND YEAR(d.NgayMuaHang) = YEAR(CURRENT_DATE())
         AND MONTH(d.NgayMuaHang) = MONTH(CURRENT_DATE())`
    );

    // 4. Tổng số đơn hàng
    const [totalOrdersRows] = await pool.query(
      `SELECT COUNT(*) AS tongDonHang FROM donhang`
    );

    const doanhThuThang = Number(revenueMonthRows[0].doanhThuThang);
    const doanhThuNam = Number(revenueYearRows[0].doanhThuNam);
    const tongGiaVonThang = Number(cogsMonthRows[0].tongGiaVonThang);
    const loiNhuanThang = doanhThuThang - tongGiaVonThang;
    const tongDonHang = Number(totalOrdersRows[0].tongDonHang);

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu 4 thẻ thống kê thành công',
      data: {
        doanhThuThang,
        doanhThuNam,
        loiNhuanThang,
        tongDonHang
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/v1/admin/dashboard/charts/revenue-monthly
 * Doanh thu 12 tháng trong năm hiện tại (mảng 12 phần tử)
 */
const getMonthlyRevenueChart = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         MONTH(NgayMuaHang) AS thang,
         COALESCE(SUM(TongTien), 0) AS doanhThu
       FROM donhang
       WHERE TrangThaiDonHang = 'Đã hoàn thành'
         AND YEAR(NgayMuaHang) = YEAR(CURRENT_DATE())
       GROUP BY MONTH(NgayMuaHang)
       ORDER BY thang ASC`
    );

    const chartData = Array.from({ length: 12 }, (_, index) => {
      const monthNum = index + 1;
      const found = rows.find((r) => Number(r.thang) === monthNum);
      return {
        thang: monthNum,
        tenThang: `Tháng ${monthNum}`,
        doanhThu: found ? Number(found.doanhThu) : 0
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy biểu đồ doanh thu 12 tháng năm hiện tại thành công',
      data: chartData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/v1/admin/dashboard/charts/order-status
 * Số lượng đơn hàng phân theo từng trạng thái
 */
const getOrderStatusChart = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         TrangThaiDonHang AS trangThai,
         COUNT(*) AS soLuong
       FROM donhang
       GROUP BY TrangThaiDonHang`
    );

    const chartData = rows.map((row) => ({
      trangThai: row.trangThai,
      soLuong: Number(row.soLuong)
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy thống kê trạng thái đơn hàng thành công',
      data: chartData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET /api/v1/admin/dashboard/top-products
 * Top 5 sản phẩm bán chạy nhất (TenSanPham, Anh, Gia, SoLuongDaBan)
 */
const getTopProducts = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         sp.MaSanPham,
         sp.TenSanPham,
         sp.Anh,
         sp.Gia,
         COALESCE(SUM(ct.SoLuong), 0) AS SoLuongDaBan
       FROM sanpham sp
       JOIN chitietdonhang ct ON sp.MaSanPham = ct.MaSanPham
       JOIN donhang d ON ct.MaDonHang = d.MaDonHang
       WHERE d.TrangThaiDonHang = 'Đã hoàn thành'
       GROUP BY sp.MaSanPham, sp.TenSanPham, sp.Anh, sp.Gia
       ORDER BY SoLuongDaBan DESC
       LIMIT 5`
    );

    const topProducts = rows.map((row) => ({
      MaSanPham: row.MaSanPham,
      TenSanPham: row.TenSanPham,
      Anh: row.Anh,
      Gia: Number(row.Gia),
      SoLuongDaBan: Number(row.SoLuongDaBan)
    }));

    return res.status(200).json({
      success: true,
      message: 'Lấy top 5 sản phẩm bán chạy nhất thành công',
      data: topProducts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. GET /api/v1/admin/dashboard/charts/revenue-yearly
 * Doanh thu theo các năm (ví dụ 4 năm từ currentYear - 3 tới currentYear)
 */
const getYearlyRevenueChart = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 3;
    const [rows] = await pool.query(
      `SELECT 
         YEAR(NgayMuaHang) AS nam,
         COALESCE(SUM(TongTien), 0) AS doanhThu
       FROM donhang
       WHERE TrangThaiDonHang = 'Đã hoàn thành'
         AND YEAR(NgayMuaHang) >= ?
       GROUP BY YEAR(NgayMuaHang)
       ORDER BY nam ASC`,
      [startYear]
    );

    const chartData = [];
    for (let y = startYear; y <= currentYear; y++) {
      const found = rows.find((r) => Number(r.nam) === y);
      chartData.push({
        nam: y,
        tenNam: `Năm ${y}`,
        doanhThu: found ? Number(found.doanhThu) : 0
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lấy biểu đồ doanh thu theo năm thành công',
      data: chartData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardCards,
  getMonthlyRevenueChart,
  getOrderStatusChart,
  getTopProducts,
  getYearlyRevenueChart
};

