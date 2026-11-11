const { pool } = require('../../../config/db');

const COMPLETED_STATUSES = ['Đã hoàn thành', 'DaGiao', 'Đã giao', 'HoanTat'];
const RETURN_ORDER_STATUSES = ['YeuCauDoiTra', 'DaHoanTien', 'Yêu cầu đổi trả', 'Đã hoàn tiền'];
const PROCESSING_ORDER_STATUSES = [
  'ChoXacNhan',
  'Chờ xác nhận',
  'Chờ thanh toán',
  'ChoThanhToan',
  'ChoDuyet',
  'DaXacNhan',
  'Đã xác nhận',
  'Đang xử lý',
  'DangXuLy',
  'DangDongGoi',
  'Đang đóng gói',
  'DangGiao',
  'Đang giao',
  'Đang giao hàng'
];

const formatLocalDate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (yyyyMmDd) => {
  const [y, m, d] = yyyyMmDd.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * 1. GET /api/v1/admin/dashboard/cards
 * Trả về các thẻ thống kê cho Admin Dashboard:
 * - Doanh thu tổng (tất cả đơn giao thành công) + doanhThuThang + doanhThuNam
 * - Đơn hàng thành công + tổng số đơn hàng
 * - Sản phẩm sắp hết hàng (0 < TonKho < 5) + sản phẩm hết hàng (TonKho <= 0)
 * - Tổng đơn đổi trả (từ phieudoitra + donhang ở trạng thái đổi trả/hoàn tiền)
 */
const getDashboardCards = async (req, res, next) => {
  try {
    const completedPlaceholders = COMPLETED_STATUSES.map(() => '?').join(', ');
    const returnPlaceholders = RETURN_ORDER_STATUSES.map(() => '?').join(', ');
    const processingPlaceholders = PROCESSING_ORDER_STATUSES.map(() => '?').join(', ');

    // 1. Doanh thu tổng, tháng, năm & số đơn thành công
    const [revenueRows] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN TrangThaiDonHang IN (${completedPlaceholders}) THEN TongTien ELSE 0 END), 0) AS doanhThuTong,
         COALESCE(SUM(CASE WHEN TrangThaiDonHang IN (${completedPlaceholders})
                            AND YEAR(NgayMuaHang) = YEAR(CURRENT_DATE())
                            AND MONTH(NgayMuaHang) = MONTH(CURRENT_DATE())
                           THEN TongTien ELSE 0 END), 0) AS doanhThuThang,
         COALESCE(SUM(CASE WHEN TrangThaiDonHang IN (${completedPlaceholders})
                            AND YEAR(NgayMuaHang) = YEAR(CURRENT_DATE())
                           THEN TongTien ELSE 0 END), 0) AS doanhThuNam,
         SUM(CASE WHEN TrangThaiDonHang IN (${completedPlaceholders}) THEN 1 ELSE 0 END) AS donHangThanhCong,
         SUM(CASE WHEN TrangThaiDonHang IN (${processingPlaceholders}) THEN 1 ELSE 0 END) AS donHangDangXuLy,
         COUNT(*) AS tongDonHang
       FROM donhang`,
      [
        ...COMPLETED_STATUSES,
        ...COMPLETED_STATUSES,
        ...COMPLETED_STATUSES,
        ...COMPLETED_STATUSES,
        ...PROCESSING_ORDER_STATUSES
      ]
    );

    // 2. Giá vốn tháng hiện tại (giữ tương thích ngược trường loiNhuanThang)
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
       WHERE d.TrangThaiDonHang IN (${completedPlaceholders})
         AND YEAR(d.NgayMuaHang) = YEAR(CURRENT_DATE())
         AND MONTH(d.NgayMuaHang) = MONTH(CURRENT_DATE())`,
      COMPLETED_STATUSES
    );

    // 3. Thống kê tồn kho sản phẩm (sắp hết hàng: 0 < TonKho < 5, hết hàng: TonKho <= 0)
    const [stockRows] = await pool.query(
      `SELECT
         COUNT(*) AS tongSanPham,
         SUM(CASE WHEN COALESCE(TonKho, 0) > 0 AND COALESCE(TonKho, 0) < 5 THEN 1 ELSE 0 END) AS sanPhamSapHetHang,
         SUM(CASE WHEN COALESCE(TonKho, 0) <= 0 THEN 1 ELSE 0 END) AS sanPhamHetHang,
         SUM(CASE WHEN COALESCE(TonKho, 0) < 5 THEN 1 ELSE 0 END) AS sanPhamTonThap
       FROM sanpham`
    );

    // 4. Tổng đơn đổi trả (gộp từ phieudoitra và donhang trạng thái đổi trả để không sót hoặc trùng)
    const [returnUnionRows] = await pool.query(
      `SELECT COUNT(DISTINCT MaDonHang) AS tongDonDoiTra
       FROM (
         SELECT MaDonHang FROM phieudoitra
         UNION
         SELECT MaDonHang FROM donhang WHERE TrangThaiDonHang IN (${returnPlaceholders})
       ) AS return_orders`,
      RETURN_ORDER_STATUSES
    );

    const [returnStatsRows] = await pool.query(
      `SELECT
         COUNT(*) AS tongPhieuDoiTra,
         SUM(CASE WHEN TrangThaiHoanTien = 'ChoDuyet' THEN 1 ELSE 0 END) AS choXuLyDoiTra,
         SUM(CASE WHEN KetQuaKiemDinh = 'Dat' AND TrangThaiHoanTien = 'ChoDuyet' THEN 1 ELSE 0 END) AS choHoanTien,
         SUM(CASE WHEN TrangThaiHoanTien = 'DaHoanTien' THEN 1 ELSE 0 END) AS daHoanTienCount
       FROM phieudoitra`
    );

    const rev = revenueRows[0] || {};
    const stock = stockRows[0] || {};
    const retStats = returnStatsRows[0] || {};

    const doanhThuTong = Number(rev.doanhThuTong) || 0;
    const doanhThuThang = Number(rev.doanhThuThang) || 0;
    const doanhThuNam = Number(rev.doanhThuNam) || 0;
    const tongGiaVonThang = Number(cogsMonthRows[0]?.tongGiaVonThang) || 0;
    const loiNhuanThang = doanhThuThang - tongGiaVonThang;
    const donHangThanhCong = Number(rev.donHangThanhCong) || 0;
    const donHangDangXuLy = Number(rev.donHangDangXuLy) || 0;
    const tongDonHang = Number(rev.tongDonHang) || 0;

    const sanPhamSapHetHang = Number(stock.sanPhamSapHetHang) || 0;
    const sanPhamHetHang = Number(stock.sanPhamHetHang) || 0;
    const sanPhamTonThap = Number(stock.sanPhamTonThap) || 0;
    const tongSanPham = Number(stock.tongSanPham) || 0;

    const tongDonDoiTra = Number(returnUnionRows[0]?.tongDonDoiTra) || 0;
    const choXuLyDoiTra = Number(retStats.choXuLyDoiTra) || 0;
    const choHoanTien = Number(retStats.choHoanTien) || 0;
    const daHoanTienCount = Number(retStats.daHoanTienCount) || 0;

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu thẻ thống kê thành công',
      data: {
        doanhThuTong,
        doanhThuThang,
        doanhThuNam,
        loiNhuanThang,
        donHangThanhCong,
        donHangDangXuLy,
        tongDonHang,
        sanPhamSapHetHang,
        sanPhamHetHang,
        sanPhamTonThap,
        tongSanPham,
        tongDonDoiTra,
        choXuLyDoiTra,
        choHoanTien,
        daHoanTienCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper build dữ liệu biểu đồ doanh thu theo Ngày / Tháng / Năm
 */
const buildRevenueSeries = async ({ period = 'month', days = 30, year }) => {
  const completedPlaceholders = COMPLETED_STATUSES.map(() => '?').join(', ');
  const now = new Date();
  const targetYear = Number(year) || now.getFullYear();

  if (period === 'day') {
    const safeDays = Math.min(Math.max(Number(days) || 30, 7), 90);
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (safeDays - 1));
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startStr = `${formatLocalDate(startDate)} 00:00:00`;
    const endStr = `${formatLocalDate(endDate)} 23:59:59`;

    const [rows] = await pool.query(
      `SELECT
         DATE_FORMAT(NgayMuaHang, '%Y-%m-%d') AS ngay,
         COALESCE(SUM(TongTien), 0) AS doanhThu,
         COUNT(*) AS soDon
       FROM donhang
       WHERE TrangThaiDonHang IN (${completedPlaceholders})
         AND NgayMuaHang >= ? AND NgayMuaHang <= ?
       GROUP BY DATE_FORMAT(NgayMuaHang, '%Y-%m-%d')
       ORDER BY ngay ASC`,
      [...COMPLETED_STATUSES, startStr, endStr]
    );

    const rowMap = new Map();
    rows.forEach((r) => {
      rowMap.set(r.ngay, {
        doanhThu: Number(r.doanhThu) || 0,
        soDon: Number(r.soDon) || 0
      });
    });

    const series = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateStr = formatLocalDate(cursor);
      const [, m, d] = dateStr.split('-');
      const matched = rowMap.get(dateStr);
      series.push({
        key: dateStr,
        ngay: dateStr,
        label: `${d}/${m}`,
        fullLabel: `Ngày ${formatDisplayDate(dateStr)}`,
        doanhThu: matched ? matched.doanhThu : 0,
        soDon: matched ? matched.soDon : 0
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return series;
  }

  if (period === 'year') {
    const currentYear = now.getFullYear();
    const defaultStartYear = currentYear - 4;

    const [minYearRows] = await pool.query(
      `SELECT MIN(YEAR(NgayMuaHang)) AS minYear
       FROM donhang
       WHERE TrangThaiDonHang IN (${completedPlaceholders})`,
      COMPLETED_STATUSES
    );
    const earliestDataYear = minYearRows[0]?.minYear ? Number(minYearRows[0].minYear) : defaultStartYear;
    const startYear = Math.max(currentYear - 9, Math.min(defaultStartYear, earliestDataYear));

    const [rows] = await pool.query(
      `SELECT
         YEAR(NgayMuaHang) AS nam,
         COALESCE(SUM(TongTien), 0) AS doanhThu,
         COUNT(*) AS soDon
       FROM donhang
       WHERE TrangThaiDonHang IN (${completedPlaceholders})
         AND YEAR(NgayMuaHang) >= ?
       GROUP BY YEAR(NgayMuaHang)
       ORDER BY nam ASC`,
      [...COMPLETED_STATUSES, startYear]
    );

    const rowMap = new Map();
    rows.forEach((r) => {
      rowMap.set(Number(r.nam), {
        doanhThu: Number(r.doanhThu) || 0,
        soDon: Number(r.soDon) || 0
      });
    });

    const series = [];
    for (let y = startYear; y <= currentYear; y++) {
      const matched = rowMap.get(y);
      series.push({
        key: String(y),
        nam: y,
        tenNam: `Năm ${y}`,
        label: String(y),
        fullLabel: `Năm ${y}`,
        doanhThu: matched ? matched.doanhThu : 0,
        soDon: matched ? matched.soDon : 0
      });
    }

    return series;
  }

  // Default: period === 'month' (12 tháng trong năm targetYear)
  const [rows] = await pool.query(
    `SELECT
       MONTH(NgayMuaHang) AS thang,
       COALESCE(SUM(TongTien), 0) AS doanhThu,
       COUNT(*) AS soDon
     FROM donhang
     WHERE TrangThaiDonHang IN (${completedPlaceholders})
       AND YEAR(NgayMuaHang) = ?
     GROUP BY MONTH(NgayMuaHang)
     ORDER BY thang ASC`,
    [...COMPLETED_STATUSES, targetYear]
  );

  const rowMap = new Map();
  rows.forEach((r) => {
    rowMap.set(Number(r.thang), {
      doanhThu: Number(r.doanhThu) || 0,
      soDon: Number(r.soDon) || 0
    });
  });

  return Array.from({ length: 12 }, (_, index) => {
    const monthNum = index + 1;
    const matched = rowMap.get(monthNum);
    return {
      key: `${targetYear}-${String(monthNum).padStart(2, '0')}`,
      thang: monthNum,
      tenThang: `Tháng ${monthNum}`,
      label: `T${monthNum}`,
      fullLabel: `Tháng ${monthNum}/${targetYear}`,
      doanhThu: matched ? matched.doanhThu : 0,
      soDon: matched ? matched.soDon : 0
    };
  });
};

/**
 * 2. GET /api/v1/admin/dashboard/charts/revenue?period=day|month|year&days=30&year=2026
 * Endpoint thống nhất cho biểu đồ doanh thu theo Ngày / Tháng / Năm
 */
const getRevenueChart = async (req, res, next) => {
  try {
    const rawPeriod = String(req.query.period || req.query.groupBy || 'month').toLowerCase();
    const period = ['day', 'month', 'year'].includes(rawPeriod) ? rawPeriod : 'month';
    const days = Number(req.query.days) || 30;
    const year = Number(req.query.year) || new Date().getFullYear();

    const chartData = await buildRevenueSeries({ period, days, year });

    return res.status(200).json({
      success: true,
      message: 'Lấy biểu đồ doanh thu thành công',
      data: chartData,
      meta: { period, days, year }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2a. GET /api/v1/admin/dashboard/charts/revenue-monthly
 * Doanh thu 12 tháng trong năm (giữ tương thích ngược)
 */
const getMonthlyRevenueChart = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const chartData = await buildRevenueSeries({ period: 'month', year });

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
 * 2b. GET /api/v1/admin/dashboard/charts/revenue-yearly
 * Doanh thu theo các năm (giữ tương thích ngược)
 */
const getYearlyRevenueChart = async (req, res, next) => {
  try {
    const chartData = await buildRevenueSeries({ period: 'year' });

    return res.status(200).json({
      success: true,
      message: 'Lấy biểu đồ doanh thu theo năm thành công',
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
 * Top 5 sản phẩm bán chạy nhất (MaSanPham, TenSanPham, Anh, Gia, TonKho, TenNhaSanXuat, SoLuongDaBan, TongDoanhThu)
 */
const getTopProducts = async (req, res, next) => {
  try {
    const completedPlaceholders = COMPLETED_STATUSES.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT
         sp.MaSanPham,
         sp.TenSanPham,
         sp.Anh,
         sp.Gia,
         COALESCE(sp.TonKho, 0) AS TonKho,
         nsx.TenNhaSanXuat,
         COALESCE(SUM(ct.SoLuong), 0) AS SoLuongDaBan,
         COALESCE(SUM(COALESCE(ct.TongGia, ct.SoLuong * ct.DonGia)), 0) AS TongDoanhThu
       FROM sanpham sp
       LEFT JOIN nhasanxuat nsx ON sp.MaNhaSanXuat = nsx.MaNhaSanXuat
       JOIN chitietdonhang ct ON sp.MaSanPham = ct.MaSanPham
       JOIN donhang d ON ct.MaDonHang = d.MaDonHang
       WHERE d.TrangThaiDonHang IN (${completedPlaceholders})
       GROUP BY sp.MaSanPham, sp.TenSanPham, sp.Anh, sp.Gia, sp.TonKho, nsx.TenNhaSanXuat
       ORDER BY SoLuongDaBan DESC, TongDoanhThu DESC
       LIMIT 5`,
      COMPLETED_STATUSES
    );

    const topProducts = rows.map((row) => ({
      MaSanPham: row.MaSanPham,
      TenSanPham: row.TenSanPham,
      Anh: row.Anh,
      Gia: Number(row.Gia) || 0,
      TonKho: Number(row.TonKho) || 0,
      TenNhaSanXuat: row.TenNhaSanXuat || null,
      SoLuongDaBan: Number(row.SoLuongDaBan) || 0,
      TongDoanhThu: Number(row.TongDoanhThu) || 0
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

module.exports = {
  getDashboardCards,
  getRevenueChart,
  getMonthlyRevenueChart,
  getOrderStatusChart,
  getTopProducts,
  getYearlyRevenueChart
};
