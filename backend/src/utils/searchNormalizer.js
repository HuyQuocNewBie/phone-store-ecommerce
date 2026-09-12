/**
 * Danh sách từ viết tắt cố định và các từ mở rộng tương ứng
 */
const ABBREVIATION_MAP = {
  ip: 'iphone',
  prm: 'pro max',
  pm: 'pro max',
  ss: 'samsung'
};

/**
 * Chuẩn hóa chuỗi tìm kiếm:
 * - Chuyển chữ thường, xóa dấu tiếng Việt, loại bỏ ký tự đặc biệt.
 * - Chuẩn hóa từ viết tắt (ip -> iphone, prm -> pro max, s24u -> samsung galaxy s24 ultra, s25u -> samsung galaxy s25 ultra,...).
 * - Tách từ viết liền (iphone16promax -> iphone 16 pro max).
 *
 * @param {string} rawQuery
 * @returns {string} Normalized search query string
 */
const normalizeSearchQuery = (rawQuery) => {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return '';
  }

  // 1. Chuyển chữ thường
  let str = rawQuery.toLowerCase();

  // 2. Xóa dấu tiếng Việt
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replace(/đ/g, 'd').replace(/Đ/g, 'd');

  // 3. Loại bỏ ký tự đặc biệt (chỉ giữ chữ cái, số và khoảng trắng)
  str = str.replace(/[^a-z0-9\s]/g, ' ');

  // 4. Mở rộng từ viết tắt quy luật Samsung Galaxy Ultra: s24u, s25u, s23u... -> samsung galaxy s24 ultra
  str = str.replace(/\bs(\d+)u\b/g, 'samsung galaxy s$1 ultra');

  // 5. Xử lý các cụm dính liền phổ biến (e.g. promax -> pro max)
  str = str.replace(/\bpromax\b/g, 'pro max');
  str = str.replace(/\bpromx\b/g, 'pro max');

  // 6. Tokenize và xử lý từ viết tắt & tách ranh giới chữ - số
  const initialTokens = str.trim().split(/\s+/).filter(Boolean);
  const expandedTokens = [];

  for (const token of initialTokens) {
    // Nếu token trùng khớp từ viết tắt cố định (e.g. ip, prm, ss, pm)
    if (ABBREVIATION_MAP[token]) {
      expandedTokens.push(ABBREVIATION_MAP[token]);
    } else {
      // Tách ranh giới chữ và số (e.g. iphone16 -> iphone 16, 16pro -> 16 pro, 16promax -> 16 pro max)
      const separated = token
        .replace(/promax/g, ' pro max ')
        .replace(/([a-z]+)(\d+)/g, '$1 $2')
        .replace(/(\d+)([a-z]+)/g, '$1 $2');

      const subTokens = separated.trim().split(/\s+/).filter(Boolean);
      for (const sub of subTokens) {
        if (ABBREVIATION_MAP[sub]) {
          expandedTokens.push(ABBREVIATION_MAP[sub]);
        } else {
          expandedTokens.push(sub);
        }
      }
    }
  }

  // 7. Ghép lại và xóa các từ bị lặp trùng kề nhau (e.g. samsung samsung galaxy s24 ultra -> samsung galaxy s24 ultra)
  const joinedStr = expandedTokens.join(' ');
  const finalTokens = joinedStr.split(/\s+/).filter(Boolean);
  const cleanedTokens = [];

  for (let i = 0; i < finalTokens.length; i++) {
    if (i === 0 || finalTokens[i] !== finalTokens[i - 1]) {
      cleanedTokens.push(finalTokens[i]);
    }
  }

  return cleanedTokens.join(' ');
};

module.exports = {
  normalizeSearchQuery
};
