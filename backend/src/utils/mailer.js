const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { formatOrderCode } = require('./formatters');
const { pool } = require('../../config/db');

dotenv.config();

const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);

let transporter = null;

if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
}

/**
 * Gửi email OTP
 * @param {string} toEmail - Email người nhận
 * @param {string} otpCode - Mã OTP 5 chữ số
 * @param {string} type - 'register' hoặc 'forgot_password'
 */
const sendOtpEmail = async (toEmail, otpCode, type = 'register') => {
  const subject = type === 'forgot_password' 
    ? '[SmartZone] Mã OTP khôi phục mật khẩu' 
    : '[SmartZone] Mã OTP xác nhận đăng ký tài khoản';

  const title = type === 'forgot_password'
    ? 'Yêu cầu khôi phục mật khẩu'
    : 'Xác thực đăng ký tài khoản';

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2563eb; text-align: center;">SmartZone E-Commerce</h2>
      <h3 style="color: #333;">${title}</h3>
      <p>Mã xác thực OTP của bạn là:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #dc2626; text-align: center; margin: 20px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
        ${otpCode}
      </div>
      <p>Mã OTP này có hiệu lực trong <b>5 phút</b> (300 giây). Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;" />
      <p style="font-size: 12px; color: #888;">Đây là email tự động, vui lòng không phản hồi.</p>
    </div>
  `;

  console.log(`[OTP DEBUG] OTP for ${toEmail} (${type}): ${otpCode}`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SmartZone" <${smtpUser}>`,
        to: toEmail,
        subject,
        html
      });
      console.log(`Email OTP sent successfully to ${toEmail}`);
      return true;
    } catch (error) {
      console.error(`Failed to send OTP email to ${toEmail}:`, error.message);
      // Giữ cho luồng API không bị sập nếu SMTP chập chờn, log OTP ở console
      return false;
    }
  } else {
    console.log(`[MAIL CONFIG MISSING] SMTP credentials not set in .env. Logged OTP: ${otpCode}`);
    return true;
  }
};

/**
 * Gửi email Hóa đơn đặt hàng HTML tự động
 * @param {string} toEmail - Email khách nhận hóa đơn
 * @param {object} orderData - Thông tin chi tiết đơn hàng
 */
const sendOrderInvoiceEmail = async (toEmail, orderData) => {
  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0) + 'đ';

  const {
    MaDonHang,
    NgayMuaHang,
    TenNguoiNhan,
    SoDienThoai,
    DiaChiGiaoHang,
    GhiChu,
    items = [],
    subtotal = 0,
    PhiShip = 0,
    SoTienGiam = 0,
    TongTien = 0
  } = orderData;

  const orderSN = formatOrderCode(MaDonHang, NgayMuaHang);
  const orderDateStr = NgayMuaHang ? new Date(NgayMuaHang).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');

  const itemsTableRows = items.map((item, index) => `
    <tr style="border-bottom: 1px solid #f3f4f6;">
      <td style="padding: 10px; text-align: center; color: #6b7280;">${index + 1}</td>
      <td style="padding: 10px;">
        <strong style="color: #1f2937;">${item.TenSanPham}</strong>
        ${item.DungLuong || item.MauSac ? `<br><small style="color: #6b7280;">${[item.DungLuong, item.MauSac].filter(Boolean).join(' - ')}</small>` : ''}
      </td>
      <td style="padding: 10px; text-align: center;">${item.SoLuong}</td>
      <td style="padding: 10px; text-align: right;">${formatCurrency(item.DonGia)}</td>
      <td style="padding: 10px; text-align: right; font-weight: bold; color: #111827;">${formatCurrency(item.TongGia || (item.SoLuong * item.DonGia))}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; background-color: #f9fafb; padding: 20px;">
      <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
        
        <!-- Header -->
        <div style="background-color: #2563eb; color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">SMARTZONE STORE</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Cảm ơn bạn đã đặt hàng tại SmartZone!</p>
        </div>

        <!-- Order Summary Notice -->
        <div style="padding: 24px;">
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
            <h3 style="margin: 0; color: #065f46; font-size: 16px;">Xác nhận đơn hàng thành công!</h3>
            <p style="margin: 4px 0 0 0; color: #047857; font-size: 13px;">Mã đơn hàng của bạn là <strong style="color: #065f46;">${orderSN}</strong>. Trạng thái hiện tại: <span style="background-color: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${orderData.TrangThaiDonHang || 'Chờ xác nhận'}</span></p>
          </div>

          <!-- Customer Info -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr>
              <td style="vertical-align: top; width: 50%; padding-right: 12px;">
                <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Thông tin khách hàng</h4>
                <p style="margin: 2px 0; color: #4b5563;"><strong>Người nhận:</strong> ${TenNguoiNhan || 'Khách hàng'}</p>
                <p style="margin: 2px 0; color: #4b5563;"><strong>Số điện thoại:</strong> ${SoDienThoai || 'N/A'}</p>
                <p style="margin: 2px 0; color: #4b5563;"><strong>Email:</strong> ${toEmail}</p>
              </td>
              <td style="vertical-align: top; width: 50%; padding-left: 12px;">
                <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Thông tin giao hàng</h4>
                <p style="margin: 2px 0; color: #4b5563;"><strong>Địa chỉ:</strong> ${DiaChiGiaoHang || 'N/A'}</p>
                <p style="margin: 2px 0; color: #4b5563;"><strong>Ngày đặt:</strong> ${orderDateStr}</p>
                ${GhiChu ? `<p style="margin: 2px 0; color: #4b5563;"><strong>Ghi chú:</strong> ${GhiChu}</p>` : ''}
              </td>
            </tr>
          </table>

          <!-- Items Table -->
          <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Chi tiết sản phẩm</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #f3f4f6; color: #374151; text-align: left;">
                <th style="padding: 10px; text-align: center; border-radius: 6px 0 0 6px;">#</th>
                <th style="padding: 10px;">Sản phẩm</th>
                <th style="padding: 10px; text-align: center;">SL</th>
                <th style="padding: 10px; text-align: right;">Đơn giá</th>
                <th style="padding: 10px; text-align: right; border-radius: 0 6px 6px 0;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTableRows}
            </tbody>
          </table>

          <!-- Pricing Breakdown -->
          <div style="width: 280px; margin-left: auto; font-size: 14px; background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #f3f4f6;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #4b5563;">
              <span>Tạm tính:</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #4b5563;">
              <span>Phí vận chuyển:</span>
              <span>${PhiShip === 0 ? '<strong style="color: #16a34a;">Miễn phí</strong>' : formatCurrency(PhiShip)}</span>
            </div>
            ${SoTienGiam > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #dc2626;">
                <span>Giảm giá Voucher:</span>
                <span>-${formatCurrency(SoTienGiam)}</span>
              </div>
            ` : ''}
            <hr style="border: none; border-top: 1px dashed #d1d5db; margin: 10px 0;" />
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #111827;">
              <span>Tổng thanh toán:</span>
              <span style="color: #2563eb;">${formatCurrency(TongTien)}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f3f4f6; color: #6b7280; padding: 16px; text-align: center; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 4px 0;">SmartZone E-Commerce - Hệ thống bán lẻ thiết bị di động chính hãng</p>
          <p style="margin: 0;">Mọi thắc mắc xin vui lòng liên hệ hotline 1900 xxxx hoặc phản hồi email này.</p>
        </div>

      </div>
    </div>
  `;

  console.log(`[INVOICE DEBUG] Order invoice email prepared for order ${orderSN} -> ${toEmail}`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SmartZone Store" <${smtpUser}>`,
        to: toEmail,
        subject: `[SmartZone] Hóa đơn xác nhận đơn hàng ${orderSN}`,
        html
      });
      console.log(`Invoice email for order ${orderSN} sent successfully to ${toEmail}`);
      return true;
    } catch (error) {
      console.error(`Failed to send order invoice email to ${toEmail}:`, error.message);
      return false;
    }
  } else {
    console.log(`[MAIL CONFIG MISSING] SMTP credentials not set in .env. Logged invoice for order ${orderSN}`);
    return true;
  }
};

/**
 * Gửi email hóa đơn tự động theo orderId
 * Tự động truy vấn thông tin đơn hàng, chi tiết sản phẩm và email khách hàng từ database
 * @param {number|string} orderId - ID đơn hàng (hoặc mã đơn SZ...)
 * @returns {Promise<boolean>} Kết quả gửi email (true/false)
 */
const sendInvoiceEmail = async (orderId) => {
  try {
    let numericId = Number(orderId);
    if (isNaN(numericId) && typeof orderId === 'string' && orderId.startsWith('SZ')) {
      const match = orderId.match(/^SZ\d{8}(\d+)$/);
      if (match) {
        numericId = parseInt(match[1], 10);
      }
    }

    if (!numericId || isNaN(numericId) || numericId <= 0) {
      console.warn(`[sendInvoiceEmail] Mã đơn hàng không hợp lệ: ${orderId}`);
      return false;
    }

    // 1. Truy vấn thông tin đơn hàng và email khách hàng
    const [orderRows] = await pool.query(
      `SELECT d.*, u.Email AS UserEmail, u.TaiKhoan
       FROM donhang d
       LEFT JOIN nguoidung u ON d.MaNguoiDung = u.MaNguoiDung
       WHERE d.MaDonHang = ?
       LIMIT 1`,
      [numericId]
    );

    if (!orderRows || orderRows.length === 0) {
      console.warn(`[sendInvoiceEmail] Không tìm thấy đơn hàng #${numericId}`);
      return false;
    }

    const order = orderRows[0];
    const targetEmail = order.UserEmail;

    if (!targetEmail) {
      console.warn(`[sendInvoiceEmail] Không tìm thấy email của khách hàng cho đơn hàng #${numericId}`);
      return false;
    }

    // 2. Truy vấn danh sách chi tiết sản phẩm
    const [itemRows] = await pool.query(
      `SELECT ct.*, sp.TenSanPham, sp.Anh
       FROM chitietdonhang ct
       LEFT JOIN sanpham sp ON ct.MaSanPham = sp.MaSanPham
       WHERE ct.MaDonHang = ?
       ORDER BY ct.MaChiTietDonHang ASC`,
      [numericId]
    );

    const items = itemRows.map((it) => ({
      MaSanPham: it.MaSanPham,
      TenSanPham: it.TenSanPham || `Sản phẩm #${it.MaSanPham}`,
      DungLuong: it.DungLuong,
      MauSac: it.MauSac,
      SoLuong: Number(it.SoLuong) || 1,
      DonGia: Number(it.DonGia) || 0,
      TongGia: Number(it.TongGia) || (Number(it.SoLuong) * Number(it.DonGia))
    }));

    const calculatedSubtotal = items.reduce((sum, it) => sum + it.TongGia, 0);

    const invoiceData = {
      MaDonHang: order.MaDonHang,
      NgayMuaHang: order.NgayMuaHang || new Date(),
      TrangThaiDonHang: order.TrangThaiDonHang || 'Chờ xác nhận',
      TenNguoiNhan: order.TenNguoiNhan,
      SoDienThoai: order.SoDienThoai,
      DiaChiGiaoHang: order.DiaChiGiaoHang,
      GhiChu: order.GhiChu,
      items,
      subtotal: calculatedSubtotal,
      orderSubtotal: calculatedSubtotal,
      PhiShip: Number(order.PhiShip || 0),
      shippingFee: Number(order.PhiShip || 0),
      SoTienGiam: Number(order.SoTienGiam || 0),
      voucherDiscount: Number(order.SoTienGiam || 0),
      TongTien: Number(order.TongTien)
    };

    console.log(`[sendInvoiceEmail] Bắt đầu gửi email hóa đơn đơn hàng #${order.MaDonHang} tới ${targetEmail} (Trạng thái: ${invoiceData.TrangThaiDonHang})...`);
    return await sendOrderInvoiceEmail(targetEmail, invoiceData);
  } catch (error) {
    console.error(`[sendInvoiceEmail] Lỗi khi gửi hóa đơn đơn hàng #${orderId}:`, error.message);
    return false;
  }
};

module.exports = {
  sendOtpEmail,
  sendOrderInvoiceEmail,
  sendInvoiceEmail
};

