const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

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

module.exports = {
  sendOtpEmail
};
