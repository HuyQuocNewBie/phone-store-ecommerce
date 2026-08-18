const ExcelJS = require('exceljs');
const { pool } = require('../../../config/db');

/**
 * Helper to format Date object to YYYY-MM-DD
 */
const formatDateStr = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper to generate all dates between startDateStr and endDateStr (inclusive)
 */
const getDateArrayInRange = (startDateStr, endDateStr) => {
  const dateArray = [];
  const currentDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  while (currentDate <= endDate) {
    dateArray.push(formatDateStr(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateArray;
};

/**
 * 1. GET /api/v1/admin/analytics/revenue?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 * Thống kê doanh thu theo ngày & Danh sách đơn hàng trong khoảng thời gian
 */
const getRevenueAnalytics = async (req, res, next) => {
  try {
    let { fromDate, toDate } = req.query;

    // Default dates if omitted: current month to today
    if (!fromDate || !toDate) {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      if (!fromDate) fromDate = formatDateStr(startOfMonth);
      if (!toDate) toDate = formatDateStr(today);
    }

    // Validate: fromDate > toDate
    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({
        success: false,
        message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc'
      });
    }

    const startDateTime = `${fromDate} 00:00:00`;
    const endDateTime = `${toDate} 23:59:59`;

    // 1. Thống kê tổng doanh thu theo từng ngày (chỉ tính đơn 'Đã hoàn thành')
    const [dailyRevenueRows] = await pool.query(
      `SELECT 
         DATE_FORMAT(NgayMuaHang, '%Y-%m-%d') AS ngay,
         COALESCE(SUM(TongTien), 0) AS doanhThu
       FROM donhang
       WHERE TrangThaiDonHang = 'Đã hoàn thành'
         AND NgayMuaHang >= ? AND NgayMuaHang <= ?
       GROUP BY DATE_FORMAT(NgayMuaHang, '%Y-%m-%d')
       ORDER BY ngay ASC`,
      [startDateTime, endDateTime]
    );

    const revenueMap = {};
    dailyRevenueRows.forEach((row) => {
      revenueMap[row.ngay] = Number(row.doanhThu);
    });

    const allDates = getDateArrayInRange(fromDate, toDate);
    const chartData = allDates.map((dateStr) => ({
      ngay: dateStr,
      doanhThu: revenueMap[dateStr] || 0
    }));

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
      NgayMuaHang: row.NgayMuaHang,
      KhachHang: row.KhachHang,
      TrangThaiDonHang: row.TrangThaiDonHang,
      TongTien: Number(row.TongTien)
    }));

    const tongDoanhThu = chartData.reduce((sum, item) => sum + item.doanhThu, 0);
    const tongDonHang = orders.length;

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu thống kê doanh thu thành công',
      data: {
        fromDate,
        toDate,
        chart: chartData,
        orders: orders,
        summary: {
          tongDoanhThu,
          tongDonHang
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
    if (new Date(fromDate) > new Date(toDate)) {
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
