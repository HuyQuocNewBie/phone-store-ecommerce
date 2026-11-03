/**
 * OTP Store Utility - Quản lý lưu trữ và xác thực OTP tạm thời
 * Hỗ trợ Redis Cache và tự động Fallback sang Memory Cache an toàn
 * Bao gồm: Mã hóa OTP (HMAC-SHA256), Giới hạn số lần thử (Max 5 attempts), Đếm ngược Cooldown (60s), Reset Token (TTL 600s)
 */

const crypto = require('crypto');
const redis = require('../config/redis');

// In-Memory Storage Cache phòng trường hợp Redis không khả dụng hoặc môi trường test
const memoryStore = {
  otps: new Map(),        // key: email -> { hashedOtp, createdAt, expiresAt, attempts, ttlSeconds }
  cooldowns: new Map(),   // key: email -> expiresAt (timestamp ms)
  resetTokens: new Map()  // key: token -> { email, createdAt, expiresAt }
};

// Dọn dẹp định kỳ các bản ghi bộ nhớ đã hết hạn (chạy ngầm mỗi 60s)
const cleanupMemoryTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryStore.otps.entries()) {
    if (item.expiresAt <= now) {
      memoryStore.otps.delete(key);
    }
  }
  for (const [key, expiresAt] of memoryStore.cooldowns.entries()) {
    if (expiresAt <= now) {
      memoryStore.cooldowns.delete(key);
    }
  }
  for (const [key, item] of memoryStore.resetTokens.entries()) {
    if (item.expiresAt <= now) {
      memoryStore.resetTokens.delete(key);
    }
  }
}, 60000);

if (cleanupMemoryTimer.unref) {
  cleanupMemoryTimer.unref();
}

/**
 * Kiểm tra xem Redis có sẵn sàng nhận lệnh hay không
 * @returns {boolean}
 */
const isRedisReady = () => {
  return Boolean(redis && (redis.status === 'ready' || redis.status === 'connect'));
};

/**
 * Chuẩn hóa email người dùng
 * @param {string} email 
 * @returns {string}
 */
const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

/**
 * Băm mã OTP bằng HMAC-SHA256 với secret salt để chống lộ OTP dạng plaintext
 * @param {string|number} otp 
 * @returns {string}
 */
const hashOtp = (otp) => {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || 'smartzone_otp_secure_salt_2026';
  return crypto.createHmac('sha256', secret).update(String(otp).trim()).digest('hex');
};

/**
 * 1. Lưu mã OTP tạm thời kèm mã hóa/hash và timestamp
 * @param {string} email - Email người dùng nhận OTP
 * @param {string|number} otp - Mã OTP (thường là 6 chữ số)
 * @param {number} [ttlSeconds=300] - Thời gian sống của OTP (mặc định 300s = 5 phút)
 * @param {number} [cooldownSeconds=60] - Thời gian chờ gửi lại (mặc định 60s)
 * @returns {Promise<{success: boolean, expiresAt: number, ttlSeconds: number}>}
 */
const setOtp = async (email, otp, ttlSeconds = 300, cooldownSeconds = 60) => {
  const targetEmail = normalizeEmail(email);
  if (!targetEmail) {
    throw new Error('Email không hợp lệ để lưu OTP');
  }

  const strOtp = String(otp).trim();
  if (!strOtp) {
    throw new Error('Mã OTP không hợp lệ');
  }

  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;
  const cooldownExpiresAt = now + cooldownSeconds * 1000;
  const hashedOtp = hashOtp(strOtp);

  const otpPayload = {
    email: targetEmail,
    hashedOtp,
    createdAt: now,
    expiresAt,
    attempts: 0,
    ttlSeconds
  };

  // 1. Lưu đồng thời vào Memory Cache
  memoryStore.otps.set(targetEmail, otpPayload);
  memoryStore.cooldowns.set(targetEmail, cooldownExpiresAt);

  // 2. Lưu vào Redis nếu khả dụng
  if (isRedisReady()) {
    try {
      const redisKey = `otp:data:${targetEmail}`;
      const cooldownKey = `otp:cooldown:${targetEmail}`;

      const multi = redis.multi();
      multi.setex(redisKey, ttlSeconds, JSON.stringify(otpPayload));
      multi.setex(cooldownKey, cooldownSeconds, now.toString());
      await multi.exec();
    } catch (err) {
      console.warn('[OTPStore] Lỗi lưu Redis, chuyển qua sử dụng Memory Cache:', err.message);
    }
  }

  return {
    success: true,
    email: targetEmail,
    expiresAt,
    ttlSeconds,
    cooldownSeconds
  };
};

/**
 * 2. Kiểm tra nếu request trước đó dưới 60s (hoặc cooldownSeconds) thì trả về số giây chờ còn lại
 * @param {string} email - Email cần kiểm tra
 * @param {number} [cooldownSeconds=60] - Thời gian cooldown cấu hình
 * @returns {Promise<number>} Trả về số giây còn lại cần chờ (> 0 nếu đang cooldown, 0 nếu đã hết cooldown)
 */
const checkCooldown = async (email, cooldownSeconds = 60) => {
  const targetEmail = normalizeEmail(email);
  if (!targetEmail) return 0;

  // 1. Kiểm tra từ Redis trước nếu sẵn sàng
  if (isRedisReady()) {
    try {
      const cooldownKey = `otp:cooldown:${targetEmail}`;
      const remainingTtl = await redis.ttl(cooldownKey);
      if (remainingTtl > 0) {
        return remainingTtl;
      }
    } catch (err) {
      console.warn('[OTPStore] Lỗi kiểm tra cooldown Redis, kiểm tra Memory Cache:', err.message);
    }
  }

  // 2. Kiểm tra từ Memory Cache
  const memCooldown = memoryStore.cooldowns.get(targetEmail);
  if (memCooldown) {
    const remainingMs = memCooldown - Date.now();
    if (remainingMs > 0) {
      return Math.ceil(remainingMs / 1000);
    }
    // Đã hết hạn thì dọn dẹp
    memoryStore.cooldowns.delete(targetEmail);
  }

  return 0;
};

/**
 * 3. Tăng đếm số lần thử xác thực OTP sai.
 * Nếu > 5 lần thì xóa OTP ngay lập tức để phòng chống tấn công brute-force.
 * @param {string} email - Email người dùng
 * @param {number} [maxAttempts=5] - Giới hạn số lần thử sai tối đa
 * @returns {Promise<{locked: boolean, attempts: number, maxAttempts: number, remainingAttempts: number, message?: string}>}
 */
const incrementAttempts = async (email, maxAttempts = 5) => {
  const targetEmail = normalizeEmail(email);
  if (!targetEmail) {
    return { locked: false, attempts: 0, maxAttempts, remainingAttempts: maxAttempts };
  }

  let otpData = null;

  // Lấy dữ liệu hiện tại từ Redis hoặc Memory
  if (isRedisReady()) {
    try {
      const redisKey = `otp:data:${targetEmail}`;
      const raw = await redis.get(redisKey);
      if (raw) {
        otpData = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[OTPStore] Lỗi đọc Redis trong incrementAttempts:', err.message);
    }
  }

  if (!otpData) {
    otpData = memoryStore.otps.get(targetEmail);
  }

  if (!otpData) {
    return {
      locked: false,
      attempts: 0,
      maxAttempts,
      remainingAttempts: 0,
      message: 'Mã OTP không tồn tại hoặc đã hết hạn.'
    };
  }

  // Tăng số lần thử
  const currentAttempts = (otpData.attempts || 0) + 1;
  otpData.attempts = currentAttempts;

  // Nếu vượt quá giới hạn ( > 5 lần )
  if (currentAttempts > maxAttempts) {
    // Xóa OTP ngay lập tức
    await deleteOtp(targetEmail);

    return {
      locked: true,
      attempts: currentAttempts,
      maxAttempts,
      remainingAttempts: 0,
      message: `Bạn đã nhập sai mã OTP quá ${maxAttempts} lần. Mã OTP đã bị hủy để đảm bảo an toàn. Vui lòng yêu cầu mã mới.`
    };
  }

  // Cập nhật lại số lần thử vào bộ nhớ
  const now = Date.now();
  const remainingSeconds = Math.max(1, Math.ceil((otpData.expiresAt - now) / 1000));

  memoryStore.otps.set(targetEmail, otpData);

  if (isRedisReady()) {
    try {
      const redisKey = `otp:data:${targetEmail}`;
      await redis.setex(redisKey, remainingSeconds, JSON.stringify(otpData));
    } catch (err) {
      console.warn('[OTPStore] Lỗi cập nhật attempts lên Redis:', err.message);
    }
  }

  const remainingAttempts = Math.max(0, maxAttempts - currentAttempts);

  return {
    locked: false,
    attempts: currentAttempts,
    maxAttempts,
    remainingAttempts,
    message: `Mã OTP không chính xác. Bạn còn ${remainingAttempts} lần thử.`
  };
};

/**
 * 4. Lưu resetToken sử dụng 1 lần (TTL 600s = 10 phút) sau khi OTP đã xác thực thành công
 * @param {string} token - Chuỗi token đặt lại mật khẩu bí mật
 * @param {string} email - Email của người dùng
 * @param {number} [ttlSeconds=600] - Thời gian sống của token (mặc định 600s)
 * @returns {Promise<{success: boolean, token: string, email: string, ttlSeconds: number}>}
 */
const setResetToken = async (token, email, ttlSeconds = 600) => {
  const targetEmail = normalizeEmail(email);
  if (!token || !targetEmail) {
    throw new Error('Token và Email là bắt buộc để tạo Reset Token');
  }

  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;
  const tokenPayload = {
    email: targetEmail,
    createdAt: now,
    expiresAt,
    ttlSeconds
  };

  // 1. Lưu Memory Cache
  memoryStore.resetTokens.set(token, tokenPayload);

  // 2. Lưu Redis nếu có
  if (isRedisReady()) {
    try {
      const redisKey = `reset_token:${token}`;
      await redis.setex(redisKey, ttlSeconds, JSON.stringify(tokenPayload));
    } catch (err) {
      console.warn('[OTPStore] Lỗi lưu reset_token lên Redis, sử dụng Memory Cache:', err.message);
    }
  }

  return {
    success: true,
    token,
    email: targetEmail,
    ttlSeconds,
    expiresAt
  };
};

/**
 * Xác thực và sử dụng token đặt lại mật khẩu (Token dùng 1 lần duy nhất)
 * @param {string} token - Reset token do client gửi lên
 * @returns {Promise<{success: boolean, email?: string, message?: string}>}
 */
const consumeResetToken = async (token) => {
  if (!token) {
    return {
      success: false,
      message: 'Token đặt lại mật khẩu không hợp lệ.'
    };
  }

  let tokenData = null;

  // Đọc từ Redis
  if (isRedisReady()) {
    try {
      const redisKey = `reset_token:${token}`;
      const raw = await redis.get(redisKey);
      if (raw) {
        tokenData = JSON.parse(raw);
        // Xóa ngay lập tức khỏi Redis (1-time use)
        await redis.del(redisKey);
      }
    } catch (err) {
      console.warn('[OTPStore] Lỗi đọc/xóa reset_token từ Redis:', err.message);
    }
  }

  // Đọc từ Memory nếu Redis chưa có hoặc fallback
  if (!tokenData) {
    tokenData = memoryStore.resetTokens.get(token);
    if (tokenData) {
      memoryStore.resetTokens.delete(token);
    }
  }

  if (!tokenData) {
    return {
      success: false,
      message: 'Liên kết hoặc mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'
    };
  }

  // Kiểm tra thời gian hết hạn
  if (Date.now() > tokenData.expiresAt) {
    return {
      success: false,
      message: 'Mã đặt lại mật khẩu đã hết hạn (chỉ có hiệu lực trong 10 phút).'
    };
  }

  return {
    success: true,
    email: tokenData.email
  };
};

/**
 * Kiểm tra xem resetToken có còn hợp lệ hay không mà chưa hủy bỏ
 * @param {string} token 
 * @returns {Promise<{valid: boolean, email?: string, message?: string}>}
 */
const verifyResetToken = async (token) => {
  if (!token) {
    return { valid: false, message: 'Token không hợp lệ.' };
  }

  let tokenData = null;

  if (isRedisReady()) {
    try {
      const redisKey = `reset_token:${token}`;
      const raw = await redis.get(redisKey);
      if (raw) {
        tokenData = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[OTPStore] Lỗi kiểm tra reset_token trên Redis:', err.message);
    }
  }

  if (!tokenData) {
    tokenData = memoryStore.resetTokens.get(token);
  }

  if (!tokenData || Date.now() > tokenData.expiresAt) {
    return {
      valid: false,
      message: 'Mã đặt lại mật khẩu không tồn tại hoặc đã hết hạn.'
    };
  }

  return {
    valid: true,
    email: tokenData.email
  };
};

/**
 * Xác thực mã OTP người dùng nhập vào:
 * - So sánh mã băm an toàn
 * - Nếu sai: Tự động gọi incrementAttempts
 * - Nếu đúng: Xóa OTP và trả về thành công
 * @param {string} email 
 * @param {string|number} inputOtp 
 * @returns {Promise<{success: boolean, message: string, locked?: boolean, remainingAttempts?: number}>}
 */
const verifyOtp = async (email, inputOtp) => {
  const targetEmail = normalizeEmail(email);
  const strOtp = String(inputOtp || '').trim();

  if (!targetEmail || !strOtp) {
    return {
      success: false,
      message: 'Vui lòng cung cấp email và mã OTP.'
    };
  }

  let otpData = null;

  // Lấy dữ liệu từ Redis
  if (isRedisReady()) {
    try {
      const redisKey = `otp:data:${targetEmail}`;
      const raw = await redis.get(redisKey);
      if (raw) {
        otpData = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[OTPStore] Lỗi đọc OTP từ Redis trong verifyOtp:', err.message);
    }
  }

  // Lấy dữ liệu từ Memory Cache
  if (!otpData) {
    otpData = memoryStore.otps.get(targetEmail);
  }

  if (!otpData) {
    return {
      success: false,
      message: 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.'
    };
  }

  // Kiểm tra thời gian hết hạn
  if (Date.now() > otpData.expiresAt) {
    await deleteOtp(targetEmail);
    return {
      success: false,
      message: 'Mã OTP đã hết hiệu lực (quá 5 phút). Vui lòng yêu cầu mã mới.'
    };
  }

  const inputHashed = hashOtp(strOtp);

  // So sánh hash an toàn bằng crypto.timingSafeEqual
  const bufA = Buffer.from(inputHashed, 'hex');
  const bufB = Buffer.from(otpData.hashedOtp, 'hex');
  const isMatch = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

  if (!isMatch) {
    // Tăng số lần thử sai
    const attemptResult = await incrementAttempts(targetEmail);
    return {
      success: false,
      locked: attemptResult.locked,
      attempts: attemptResult.attempts,
      remainingAttempts: attemptResult.remainingAttempts,
      message: attemptResult.message || 'Mã OTP không chính xác.'
    };
  }

  // Xác thực thành công: Xóa OTP khỏi store để tránh tái sử dụng
  await deleteOtp(targetEmail);

  return {
    success: true,
    message: 'Xác thực mã OTP thành công.'
  };
};

/**
 * Xóa OTP của email khỏi cả Redis và Memory Cache
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
const deleteOtp = async (email) => {
  const targetEmail = normalizeEmail(email);
  if (!targetEmail) return false;

  memoryStore.otps.delete(targetEmail);

  if (isRedisReady()) {
    try {
      const redisKey = `otp:data:${targetEmail}`;
      await redis.del(redisKey);
    } catch (err) {
      console.warn('[OTPStore] Lỗi xóa OTP trên Redis:', err.message);
    }
  }

  return true;
};

/**
 * Lấy dữ liệu OTP hiện tại của email từ Redis hoặc Memory Cache
 * Tự động xóa và trả về null nếu đã hết hạn
 * @param {string} email
 * @returns {Promise<object|null>}
 */
const getOtp = async (email) => {
  const targetEmail = normalizeEmail(email);
  if (!targetEmail) return null;

  let otpData = null;

  // 1. Kiểm tra từ Redis
  if (isRedisReady()) {
    try {
      const redisKey = `otp:data:${targetEmail}`;
      const raw = await redis.get(redisKey);
      if (raw) {
        otpData = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[OTPStore] Lỗi đọc OTP từ Redis trong getOtp:', err.message);
    }
  }

  // 2. Fallback sang Memory Cache
  if (!otpData) {
    otpData = memoryStore.otps.get(targetEmail);
  }

  if (!otpData) return null;

  // 3. Kiểm tra thời gian hết hạn
  if (Date.now() > otpData.expiresAt) {
    await deleteOtp(targetEmail);
    return null;
  }

  return otpData;
};

/**
 * Sinh mã OTP số ngẫu nhiên an toàn bằng crypto.randomInt
 * @param {number} [length=6] 
 * @returns {string}
 */
const generateOtp = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length);
  const code = crypto.randomInt(min, max);
  return code.toString();
};

/**
 * Sinh Reset Token ngẫu nhiên có độ dài bảo mật 64 ký tự hex
 * @returns {string}
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  setOtp,
  checkCooldown,
  incrementAttempts,
  setResetToken,
  consumeResetToken,
  verifyResetToken,
  verifyOtp,
  deleteOtp,
  getOtp,
  generateOtp,
  generateResetToken,
  hashOtp,
  normalizeEmail
};

