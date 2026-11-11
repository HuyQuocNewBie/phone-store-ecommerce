const ExcelJS = require('exceljs');
const { pool } = require('../../../config/db');
const { formatOrderCode } = require('../../utils/formatters');

const COMPLETED_STATUSES = ['Đã hoàn thành', 'DaGiao', 'Đã giao', 'HoanTat'];
const RETURN_ORDER_STATUSES = ['YeuCauDoiTra', 'DaHoanTien', 'Yêu cầu đổi trả', 'Đã hoàn tiền'];

/**
 * Helper to format Date object to YYYY-MM-DD in local time
 */
const formatDateStr = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper to parse YYYY-MM-DD string into local midnight Date
 */
const parseLocalDate = (dateStr) => {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatDisplayDate = (dateStr) => {
  const [y, m, d] = String(dateStr).split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
};

/**
 * Helper to generate all dates between startDateStr and endDateStr (inclusive)
 */
const getDateArrayInRange = (startDateStr, endDateStr) => {
  const dateArray = [];
  const currentDate = parseLocalDate(startDateStr);
  const endDate = parseLocalDate(endDateStr);

  while (currentDate <= endDate) {
    dateArray.push(formatDateStr(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateArray;
};

/**
 * Helper to generate all YYYY-MM months between startDateStr and endDateStr (inclusive)
 */
const getMonthArrayInRange = (startDateStr, endDateStr) => {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  const months = [];

  while (cursor <= endMonth && months.length < 120) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    months.push({
      key: `${y}-${String(m).padStart(2, '0')}`,
      nam: y,
      thang: m
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
};

/**
 * 1. GET /api/v1/admin/analytics/revenue?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&groupBy=day|month|year
 * Thống kê doanh thu theo Ngày / Tháng / Năm, Top 5 sản phẩm bán chạy, thẻ KPI & Danh sách đơn hàng
 */
const getRevenueAnalytics = async (req, res, next) => {
  try {
    let { fromDate, toDate } = req.query;
    const rawGroupBy = String(req.query.groupBy || req.query.period || 'day').toLowerCase();
    const groupBy = ['day', 'month', 'year'].includes(rawGroupBy) ? rawGroupBy : 'day';

    // Default dates if omitted: current month to today
    if (!fromDate || !toDate) {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      if (!fromDate) fromDate = formatDateStr(startOfMonth);
      if (!toDate) toDate = formatDateStr(today);
    }

    // Validate: fromDate > toDate
    if (parseLocalDate(fromDate) > parseLocalDate(toDate)) {
      return res.status(400).json({
        success: false,
        message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc'
      });
    }

    const startDateTime = `${fromDate} 00:00:00`;
    const endDateTime = `${toDate} 23:59:59`;
    const completedPlaceholders = COMPLETED_STATUSES.map(() => '?').join(', ');
    const returnPlaceholders = RETURN_ORDER_STATUSES.map(() => '?').join(', ');

    // 1. Build Chart Data theo groupBy (day | month | year)
    let chartData = [];

    if (groupBy === 'month') {
      const [monthlyRows] = await pool.query(
        `SELECT
           DATE_FORMAT(NgayMuaHang, '%Y-%m') AS thangKey,
           COALESCE(SUM(TongTien), 0) AS doanhThu,
           COUNT(*) AS soDon
         FROM donhang
         WHERE TrangThaiDonHang IN (${completedPlaceholders})
           AND NgayMuaHang >= ? AND NgayMuaHang <= ?
         GROUP BY DATE_FORMAT(NgayMuaHang, '%Y-%m')
         ORDER BY thangKey ASC`,
        [...COMPLETED_STATUSES, startDateTime, endDateTime]
      );

      const monthMap = new Map();
      monthlyRows.forEach((r) => {
        monthMap.set(r.thangKey, {
          doanhThu: Number(r.doanhThu) || 0,
          soDon: Number(r.soDon) || 0
        });
      });

      const allMonths = getMonthArrayInRange(fromDate, toDate);
      const multiYear = allMonths.length > 0 && allMonths[0].nam !== allMonths[allMonths.length - 1].nam;
      chartData = allMonths.map(({ key, nam, thang }) => {
        const matched = monthMap.get(key);
        return {
          key,
          ngay: key,
          thang,
          nam,
          label: multiYear ? `T${thang}/${String(nam).slice(-2)}` : `T${thang}`,
          fullLabel: `Tháng ${String(thang).padStart(2, '0')}/${nam}`,
          doanhThu: matched ? matched.doanhThu : 0,
          soDon: matched ? matched.soDon : 0
        };
      });
    } else if (groupBy === 'year') {
      const [yearlyRows] = await pool.query(
        `SELECT
           YEAR(NgayMuaHang) AS nam,
           COALESCE(SUM(TongTien), 0) AS doanhThu,
           COUNT(*) AS soDon
         FROM donhang
         WHERE TrangThaiDonHang IN (${completedPlaceholders})
           AND NgayMuaHang >= ? AND NgayMuaHang <= ?
         GROUP BY YEAR(NgayMuaHang)
         ORDER BY nam ASC`,
        [...COMPLETED_STATUSES, startDateTime, endDateTime]
      );

      const yearMap = new Map();
      yearlyRows.forEach((r) => {
        yearMap.set(Number(r.nam), {
          doanhThu: Number(r.doanhThu) || 0,
          soDon: Number(r.soDon) || 0
        });
      });

      const startYear = parseLocalDate(fromDate).getFullYear();
      const endYear = parseLocalDate(toDate).getFullYear();
      for (let y = startYear; y <= endYear; y++) {
        const matched = yearMap.get(y);
        chartData.push({
          key: String(y),
          ngay: String(y),
          nam: y,
          label: String(y),
          fullLabel: `Năm ${y}`,
          doanhThu: matched ? matched.doanhThu : 0,
          soDon: matched ? matched.soDon : 0
        });
      }
    } else {
      // groupBy === 'day'
      const [dailyRevenueRows] = await pool.query(
        `SELECT
           DATE_FORMAT(NgayMuaHang, '%Y-%m-%d') AS ngay,
           COALESCE(SUM(TongTien), 0) AS doanhThu,
           COUNT(*) AS soDon
         FROM donhang
         WHERE TrangThaiDonHang IN (${completedPlaceholders})
           AND NgayMuaHang >= ? AND NgayMuaHang <= ?
         GROUP BY DATE_FORMAT(NgayMuaHang, '%Y-%m-%d')
         ORDER BY ngay ASC`,
        [...COMPLETED_STATUSES, startDateTime, endDateTime]
      );

      const revenueMap = new Map();
      dailyRevenueRows.forEach((row) => {
        revenueMap.set(row.ngay, {
          doanhThu: Number(row.doanhThu) || 0,
          soDon: Number(row.soDon) || 0
        });
      });

      const diffDays =
        Math.round((parseLocalDate(toDate) - parseLocalDate(fromDate)) / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays <= 366) {
        const allDates = getDateArrayInRange(fromDate, toDate);
        chartData = allDates.map((dateStr) => {
          const [, m, d] = dateStr.split('-');
          const matched = revenueMap.get(dateStr);
          return {
            key: dateStr,
            ngay: dateStr,
            label: `${d}/${m}`,
            fullLabel: `Ngày ${formatDisplayDate(dateStr)}`,
            doanhThu: matched ? matched.doanhThu : 0,
            soDon: matched ? matched.soDon : 0
          };
        });
      } else {
        chartData = dailyRevenueRows.map((row) => {
          const [, m, d] = row.ngay.split('-');
          return {
            key: row.ngay,
            ngay: row.ngay,
            label: `${d}/${m}`,
            fullLabel: `Ngày ${formatDisplayDate(row.ngay)}`,
            doanhThu: Number(row.doanhThu) || 0,
            soDon: Number(row.soDon) || 0
          };
        });
      }
    }

    // 2. Danh sách đơn hàng trong khoảng thời gian
    const [orderRows] = await pool.query(
      `SELECT
         d.MaDonHang,
         d.NgayMuaHang,
         COALESCE(d.TenNguoiNhan, u.TaiKhoan, 'Khách hàng') AS KhachHang,
         d.TongTien,
         d.TrangThaiDonHang
       FROM donhang d
       LEFT JOIN nguoidung u ON d.MaNguoiDung = u.MaNguoiDung
       WHERE d.NgayMuaHang >= ? AND d.NgayMuaHang <= ?
       ORDER BY d.NgayMuaHang DESC, d.MaDonHang DESC`,
      [startDateTime, endDateTime]
    );

    const orders = orderRows.map((row) => ({
      MaDonHang: row.MaDonHang,
      CodeDonHang: formatOrderCode(row.MaDonHang, row.NgayMuaHang),
      NgayMuaHang: row.NgayMuaHang,
      KhachHang: row.KhachHang,
      TrangThaiDonHang: row.TrangThaiDonHang,
      TongTien: Number(row.TongTien) || 0
    }));

    // 3. Thống kê KPI phụ trợ (sắp hết hàng + đơn đổi trả trong kỳ & toàn hệ thống)
    const [stockRows] = await pool.query(
      `SELECT
         SUM(CASE WHEN COALESCE(TonKho, 0) > 0 AND COALESCE(TonKho, 0) < 5 THEN 1 ELSE 0 END) AS sanPhamSapHetHang,
         SUM(CASE WHEN COALESCE(TonKho, 0) <= 0 THEN 1 ELSE 0 END) AS sanPhamHetHang
       FROM sanpham`
    );

    const [returnRangeRows] = await pool.query(
      `SELECT COUNT(DISTINCT MaDonHang) AS tongDonDoiTra
       FROM (
         SELECT MaDonHang FROM phieudoitra WHERE NgayTao >= ? AND NgayTao <= ?
         UNION
         SELECT MaDonHang FROM donhang WHERE TrangThaiDonHang IN (${returnPlaceholders}) AND NgayMuaHang >= ? AND NgayMuaHang <= ?
       ) AS r_range`,
      [startDateTime, endDateTime, ...RETURN_ORDER_STATUSES, startDateTime, endDateTime]
    );

    const [returnAllRows] = await pool.query(
      `SELECT COUNT(DISTINCT MaDonHang) AS tongDonDoiTraHeThong
       FROM (
         SELECT MaDonHang FROM phieudoitra
         UNION
         SELECT MaDonHang FROM donhang WHERE TrangThaiDonHang IN (${returnPlaceholders})
       ) AS r_all`,
      RETURN_ORDER_STATUSES
    );

    // 4. Top 5 Sản phẩm bán chạy nhất trong khoảng thời gian chọn
    const [topProductRows] = await pool.query(
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
         AND d.NgayMuaHang >= ? AND d.NgayMuaHang <= ?
       GROUP BY sp.MaSanPham, sp.TenSanPham, sp.Anh, sp.Gia, sp.TonKho, nsx.TenNhaSanXuat
       ORDER BY SoLuongDaBan DESC, TongDoanhThu DESC
       LIMIT 5`,
      [...COMPLETED_STATUSES, startDateTime, endDateTime]
    );

    const topProducts = topProductRows.map((row) => ({
      MaSanPham: row.MaSanPham,
      TenSanPham: row.TenSanPham,
      Anh: row.Anh,
      Gia: Number(row.Gia) || 0,
      TonKho: Number(row.TonKho) || 0,
      TenNhaSanXuat: row.TenNhaSanXuat || null,
      SoLuongDaBan: Number(row.SoLuongDaBan) || 0,
      TongDoanhThu: Number(row.TongDoanhThu) || 0
    }));

    const tongDoanhThu = chartData.reduce((sum, item) => sum + item.doanhThu, 0);
    const donHangThanhCong = chartData.reduce((sum, item) => sum + item.soDon, 0);
    const tongDonHang = orders.length;
    const sanPhamSapHetHang = Number(stockRows[0]?.sanPhamSapHetHang) || 0;
    const sanPhamHetHang = Number(stockRows[0]?.sanPhamHetHang) || 0;
    const tongDonDoiTra = Number(returnRangeRows[0]?.tongDonDoiTra) || 0;
    const tongDonDoiTraHeThong = Number(returnAllRows[0]?.tongDonDoiTraHeThong) || 0;

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu thống kê doanh thu thành công',
      data: {
        fromDate,
        toDate,
        groupBy,
        chart: chartData,
        orders,
        topProducts,
        summary: {
          tongDoanhThu,
          donHangThanhCong,
          tongDonHang,
          sanPhamSapHetHang,
          sanPhamHetHang,
          tongDonDoiTra,
          tongDonDoiTraHeThong
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/v1/admin/analytics/export-excel?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 * Xuất báo cáo doanh thu ra file Excel (.xlsx)
 */
const exportRevenueExcel = async (req, res, next) => {
  try {
    let { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      if (!fromDate) fromDate = formatDateStr(startOfMonth);
      if (!toDate) toDate = formatDateStr(today);
    }

    // Validate: fromDate > toDate
    if (parseLocalDate(fromDate) > parseLocalDate(toDate)) {
      return res.status(400).json({
        success: false,
        message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc'
      });
    }

    const startDateTime = `${fromDate} 00:00:00`;
    const endDateTime = `${toDate} 23:59:59`;

    // Truy vấn danh sách đơn hàng
    const [orderRows] = await pool.query(
      `SELECT
         d.MaDonHang,
         d.NgayMuaHang,
         COALESCE(d.TenNguoiNhan, u.TaiKhoan, 'Khách hàng') AS KhachHang,
         d.TongTien,
         d.TrangThaiDonHang
       FROM donhang d
       LEFT JOIN nguoidung u ON d.MaNguoiDung = u.MaNguoiDung
       WHERE d.NgayMuaHang >= ? AND d.NgayMuaHang <= ?
       ORDER BY d.NgayMuaHang ASC, d.MaDonHang ASC`,
      [startDateTime, endDateTime]
    );

    // Tạo Workbook bằng ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Phone Store Admin';
    workbook.lastModifiedBy = 'Phone Store Admin';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Báo cáo doanh thu', {
      views: [{ showGridLines: true }]
    });

    // Cấu hình độ rộng các cột: STT, Mã đơn hàng, Ngày mua, Khách hàng, Trạng thái, Tổng tiền
    worksheet.getColumn(1).width = 8;
    worksheet.getColumn(2).width = 16;
    worksheet.getColumn(3).width = 22;
    worksheet.getColumn(4).width = 28;
    worksheet.getColumn(5).width = 20;
    worksheet.getColumn(6).width = 22;

    // Dòng 1: Tiêu đề báo cáo
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'BÁO CÁO THỐNG KÊ DOANH THU';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: '1E3A8A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 32;

    // Dòng 2: Khoảng thời gian
    worksheet.mergeCells('A2:F2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `Từ ngày: ${fromDate}   Đến ngày: ${toDate}`;
    subtitleCell.font = { name: 'Arial', size: 11, italic: true, color: { argb: '475569' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    // Dòng 3: Trống
    worksheet.getRow(3).height = 10;

    // Dòng 4: Header của bảng
    const headers = ['STT', 'Mã đơn hàng', 'Ngày mua', 'Khách hàng', 'Trạng thái', 'Tổng tiền'];
    const headerRow = worksheet.getRow(4);
    headerRow.height = 28;

    headers.forEach((headerText, colIndex) => {
      const cell = headerRow.getCell(colIndex + 1);
      cell.value = headerText;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1F4E78' }
      };
      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFF' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'D9D9D9' } },
        left: { style: 'thin', color: { argb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'D9D9D9' } },
        right: { style: 'thin', color: { argb: 'D9D9D9' } }
      };
    });

    // Dòng 5 trở đi: Dữ liệu đơn hàng
    let totalRevenue = 0;
    let currentRowIndex = 5;

    orderRows.forEach((order, index) => {
      const row = worksheet.getRow(currentRowIndex);
      row.height = 22;

      const orderDate = order.NgayMuaHang ? new Date(order.NgayMuaHang) : null;
      const formattedDateStr = orderDate
        ? `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()} ${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`
        : '';
      const orderTotal = Number(order.TongTien) || 0;
      totalRevenue += orderTotal;

      row.getCell(1).value = index + 1;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(2).value = `#${order.MaDonHang}`;
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(3).value = formattedDateStr;
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(4).value = order.KhachHang || 'Khách hàng';
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };

      row.getCell(5).value = order.TrangThaiDonHang || '';
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

      const tongTienCell = row.getCell(6);
      tongTienCell.value = orderTotal;
      tongTienCell.alignment = { horizontal: 'right', vertical: 'middle' };
      tongTienCell.numFmt = '#,##0 "VNĐ"';

      for (let c = 1; c <= 6; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } }
        };
      }

      currentRowIndex++;
    });

    // Dòng tổng cộng
    const summaryRow = worksheet.getRow(currentRowIndex);
    summaryRow.height = 26;

    worksheet.mergeCells(`A${currentRowIndex}:E${currentRowIndex}`);
    const labelCell = worksheet.getCell(`A${currentRowIndex}`);
    labelCell.value = 'TỔNG CỘNG';
    labelCell.font = { name: 'Arial', size: 11, bold: true };
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const totalCell = worksheet.getCell(`F${currentRowIndex}`);
    totalCell.value = totalRevenue;
    totalCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: '1E3A8A' } };
    totalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalCell.numFmt = '#,##0 "VNĐ"';

    for (let c = 1; c <= 6; c++) {
      const cell = summaryRow.getCell(c);
      cell.border = {
        top: { style: 'thin', color: { argb: '1F4E78' } },
        bottom: { style: 'double', color: { argb: '1F4E78' } }
      };
    }

    // Tạo buffer ExcelJS
    const buffer = await workbook.xlsx.writeBuffer();

    // Set Response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=bao-cao-doanh-thu-${fromDate}-den-${toDate}.xlsx`
    );

    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRevenueAnalytics,
  exportRevenueExcel
};
