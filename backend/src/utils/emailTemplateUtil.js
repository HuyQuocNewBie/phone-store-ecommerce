/**
 * Email Template Utility - Xây dựng HTML Template và Helper gửi Mail OTP SmartZone
 * Sử dụng Nodemailer với giao diện thương hiệu SmartZone sang trọng, hiện đại, hiển thị mã 6 số nổi bật
 */

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Cấu hình thông tin SMTP
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);

let transporter = null;

/**
 * Khởi tạo hoặc lấy Transporter Nodemailer (Singleton)
 * @returns {nodemailer.Transporter|null}
 */
const getTransporter = () => {
  if (transporter) return transporter;

  if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  return transporter;
};

/**
 * Sinh chuỗi HTML email OTP SmartZone sang trọng, responsive
 * @param {string|number} otp - Mã OTP 6 chữ số
 * @param {object} [options] - Các tùy chọn bổ sung
 * @param {string} [options.title='Yêu cầu khôi phục mật khẩu'] - Tiêu đề nội dung
 * @param {string} [options.recipientName='Quý khách'] - Tên người nhận
 * @param {number} [options.expiresInMinutes=5] - Thời gian hết hạn (phút)
 * @param {string} [options.purpose='khôi phục mật khẩu tài khoản'] - Mục đích nhận OTP
 * @returns {string} Chuỗi HTML hoàn chỉnh
 */
const generateOtpEmailTemplate = (otp, options = {}) => {
  const {
    title = 'Yêu cầu khôi phục mật khẩu',
    recipientName = 'Quý khách',
    expiresInMinutes = 5,
    purpose = 'khôi phục mật khẩu tài khoản'
  } = options;

  const rawOtp = String(otp || '').trim();
  // Tách từng chữ số để hiển thị vào từng ô sang trọng
  const digits = rawOtp.padEnd(6, '-').slice(0, 6).split('');

  // Sinh các ô ký tự OTP dạng bảng HTML tương thích tuyệt đối mọi email client (Gmail, Outlook, iOS Mail)
  const digitCells = digits
    .map(
      (d) => `
        <td style="padding: 0 4px; text-align: center;">
          <div style="width: 46px; height: 58px; line-height: 58px; background: #ffffff; border: 2px solid #2563eb; border-radius: 10px; font-size: 28px; font-weight: 800; color: #1e3a8a; font-family: 'SF Pro Display', Consolas, Monaco, monospace; text-align: center; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.12);">
            ${d}
          </div>
        </td>
      `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title} - SmartZone</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
  
  <!-- Outer Table Wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        
        <!-- Main Container Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #090d16 0%, #1e293b 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #2563eb;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-transform: uppercase;">
                      SMART<span style="color: #3b82f6;">ZONE</span>
                    </div>
                    <div style="font-size: 11px; letter-spacing: 1.5px; color: #94a3b8; text-transform: uppercase; margin-top: 4px; font-weight: 600;">
                      Hệ Thống Thiết Bị Công Nghệ Chính Hãng
                    </div>
                  </td>
                </tr>
              </table>
              <div style="display: inline-block; margin-top: 16px; padding: 4px 14px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 999px; font-size: 12px; font-weight: 600; color: #60a5fa; letter-spacing: 0.5px;">
                🔒 XÁC THỰC BẢO MẬT 2 LỚP
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center;">
                ${title}
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #475569; text-align: center;">
                Xin chào <strong>${recipientName}</strong>, chúng tôi đã nhận được yêu cầu ${purpose} tại <strong>SmartZone</strong>. Vui lòng sử dụng mã xác thực bên dưới để tiếp tục:
              </p>

              <!-- Prominent 6-Digit OTP Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0; background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px 16px;">
                <tr>
                  <td align="center">
                    <div style="font-size: 12px; font-weight: 700; color: #64748b; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                      MÃ XÁC THỰC MỘT LẦN (OTP)
                    </div>

                    <!-- 6 Digits Container -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        ${digitCells}
                      </tr>
                    </table>

                    <!-- Fallback / Easy-to-Copy line -->
                    <div style="margin-top: 14px; font-size: 13px; color: #64748b;">
                      Hoặc sao chép mã: <span style="font-family: Consolas, Monaco, monospace; font-size: 15px; font-weight: 700; color: #1e40af; background: #e0e7ff; padding: 2px 8px; border-radius: 4px; letter-spacing: 2px;">${rawOtp}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry & Timing Info Badges -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
                    <p style="margin: 0; font-size: 13px; line-height: 20px; color: #1e40af;">
                      ⏱️ <strong>Thời hạn hiệu lực:</strong> Mã có giá trị trong vòng <strong>${expiresInMinutes} phút</strong> (300 giây).<br>
                      🔄 <strong>Lưu ý:</strong> Quý khách có thể yêu cầu gửi lại mã sau <strong>60 giây</strong> kể từ lần yêu cầu trước.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Warning Box -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 6px; display: flex; align-items: center;">
                  🛡️ CẢNH BÁO BẢO MẬT QUAN TRỌNG:
                </div>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 18px; color: #78350f;">
                  <li style="margin-bottom: 4px;">Tuyệt đối <strong>KHÔNG</strong> chia sẻ mã OTP này cho bất kỳ ai, kể cả nhân viên chăm sóc khách hàng của SmartZone.</li>
                  <li>Nếu Quý khách <strong>không thực hiện</strong> yêu cầu này, vui lòng bỏ qua email hoặc liên hệ ngay bộ phận CSKH để bảo vệ tài khoản kịp thời.</li>
                </ul>
              </div>

              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #64748b; text-align: center;">
                Cảm ơn Quý khách đã tin tưởng và đồng hành cùng SmartZone!
              </p>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; line-height: 18px; color: #94a3b8;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #64748b;">
                SMARTZONE STORE - THẾ GIỚI CÔNG NGHỆ ĐẲNG CẤP
              </p>
              <p style="margin: 0 0 10px 0;">
                Hotline hỗ trợ: <strong style="color: #2563eb;">1900 8888</strong> | Email: <strong style="color: #2563eb;">support@smartzone.vn</strong>
              </p>
              <div style="margin: 12px 0; border-top: 1px dashed #cbd5e1;"></div>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} SmartZone Inc. Mọi quyền được bảo lưu.<br>
                Đây là thư điện tử được gửi tự động từ hệ thống SmartZone. Vui lòng không trả lời thư này.
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
};

/**
 * Helper gửi Email OTP qua Nodemailer với HTML Template SmartZone sang trọng
 * @param {string} email - Địa chỉ email người nhận
 * @param {string|number} otp - Mã OTP 6 chữ số
 * @param {object} [options={}] - Các tùy chỉnh (title, purpose, recipientName, subject, etc.)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendOtpEmail = async (email, otp, options = {}) => {
  const targetEmail = String(email || '').trim().toLowerCase();
  const strOtp = String(otp || '').trim();

  if (!targetEmail || !strOtp) {
    console.error('[sendOtpEmail] Email hoặc mã OTP không hợp lệ:', { email, otp });
    return {
      success: false,
      error: 'Email hoặc mã OTP không hợp lệ'
    };
  }

  const {
    title = 'Yêu cầu khôi phục mật khẩu',
    subject = `[SmartZone] Mã OTP xác thực khôi phục mật khẩu: ${strOtp}`,
    recipientName = 'Quý khách',
    expiresInMinutes = 5,
    purpose = 'khôi phục mật khẩu tài khoản'
  } = options;

  const htmlContent = generateOtpEmailTemplate(strOtp, {
    title,
    recipientName,
    expiresInMinutes,
    purpose
  });

  console.log(`[SmartZone Mailer] Chuẩn bị gửi OTP email tới ${targetEmail} | OTP: ${strOtp}`);

  const activeTransporter = getTransporter();

  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail({
        from: `"SmartZone Store" <${smtpUser}>`,
        to: targetEmail,
        subject,
        html: htmlContent
      });

      console.log(`[SmartZone Mailer] Gửi OTP email thành công tới ${targetEmail} (MessageId: ${info.messageId})`);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error(`[SmartZone Mailer] Lỗi gửi email tới ${targetEmail}:`, error.message);
      // Giữ cho luồng API không bị sập nếu SMTP chập chờn, log OTP để hỗ trợ debug
      return {
        success: false,
        error: error.message,
        fallbackOtp: strOtp
      };
    }
  } else {
    console.warn(`[SmartZone Mailer] Chưa cấu hình SMTP credentials trong .env. Log mã OTP phục vụ kiểm thử: ${strOtp}`);
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`
    };
  }
};

module.exports = {
  getTransporter,
  generateOtpEmailTemplate,
  sendOtpEmail
};

