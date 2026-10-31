/**
 * ============================================================================
 * Controller Xử Lý Trò Chuyện AI Chatbot Gemini (Function Calling)
 * Project: Phone Store E-commerce
 * File: backend/src/controllers/user/chatbotController.js
 * ============================================================================
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config();

const jwt = require('jsonwebtoken');
const { pool } = require('../../../config/db');
const { GoogleGenAI } = require('@google/genai');
const { geminiTools, executeChatbotTool } = require('../../utils/chatbotTools');

// 1. Đọc API Key & Cấu hình Model từ biến môi trường
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];

if (!GEMINI_API_KEY) {
  console.warn('[chatbotController] CẢNH BÁO: Chưa tìm thấy GEMINI_API_KEY trong .env');
}

// Khởi tạo instance Google Gen AI SDK
let aiClient = null;
const getAIClient = () => {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trong file .env');
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
};

// 2. Thiết lập System Instruction định hình nhân cách Chuyên gia SmartZone
const SYSTEM_INSTRUCTION = `
Bạn là "Chuyên gia tư vấn SmartZone 24/7" - Trợ lý AI thông minh đại diện cho Hệ thống bán lẻ điện thoại & thiết bị công nghệ chính hãng SmartZone.

Phong cách & Quy tắc giao tiếp:
1. Giọng điệu: Thân thiện, chu đáo, lịch sự, nhiệt tình và luôn hỗ trợ khách hàng hết mình (xưng "Em", gọi khách là "Quý khách" hoặc "Anh/Chị").
2. Sử dụng Function Calling (Tools) tự động theo ngữ cảnh:
   - Khi khách muốn tìm điện thoại, hỏi giá bán, tư vấn sản phẩm theo ngân sách hoặc hãng (Apple, Samsung...): Hãy gọi hàm \`searchProducts\`.
   - Khi khách muốn so sánh 2-3 sản phẩm hoặc phân vân giữa các model: Hãy gọi hàm \`compareProducts\`.
   - Khi khách tra cứu trạng thái đơn hàng, kiểm tra đơn hàng bằng mã đơn hoặc số điện thoại: Hãy gọi hàm \`getOrderStatus\`.
   - Khi khách hỏi mã giảm giá, săn voucher, khuyến mãi hiện có: Hãy gọi hàm \`getVouchers\`.
   - Khi khách hỏi về quy trình hoặc cách thanh toán (COD, VNPay, ZaloPay): Hãy gọi hàm \`getPaymentGuide\`.
3. Trả lời dựa trên kết quả trả về từ Tools:
   - Sử dụng định dạng tiền tệ Việt Nam (VNĐ), nhấn mạnh thông số nổi bật (Chip, RAM/ROM, Màn hình, Camera, Dung lượng pin).
   - Nếu không có sản phẩm hoặc đơn hàng tương ứng trong DB, hãy trả lời nhã nhặn và gợi ý giải pháp thay thế.
   - Luôn mời khách hàng đặt câu hỏi thêm nếu cần tư vấn sâu hơn.
`;

/**
 * Chuẩn hóa lịch sử hội thoại (conversationHistory) từ Frontend sang cấu trúc contents của Gemini SDK
 * @param {Array} history
 * @param {string} currentMessage
 * @returns {Array} mảng contents chuẩn
 */
const formatContents = (history = [], currentMessage = '') => {
  const contents = [];

  if (Array.isArray(history)) {
    for (const item of history) {
      if (!item) continue;

      let role = 'user';
      if (
        item.role === 'model' ||
        item.role === 'assistant' ||
        item.sender === 'bot' ||
        item.sender === 'assistant'
      ) {
        role = 'model';
      }

      let text = '';
      if (typeof item.parts === 'string') {
        text = item.parts;
      } else if (Array.isArray(item.parts) && item.parts.length > 0) {
        text = item.parts.map((p) => p.text || '').filter(Boolean).join('\n');
      } else if (typeof item.content === 'string') {
        text = item.content;
      } else if (typeof item.text === 'string') {
        text = item.text;
      } else if (typeof item.message === 'string') {
        text = item.message;
      }

      if (text && text.trim()) {
        contents.push({
          role,
          parts: [{ text: text.trim() }]
        });
      }
    }
  }

  // Bổ sung tin nhắn hiện tại của người dùng
  if (currentMessage && String(currentMessage).trim()) {
    contents.push({
      role: 'user',
      parts: [{ text: String(currentMessage).trim() }]
    });
  }

  return contents;
};

let cachedActiveModel = null;

/**
 * Gọi Gemini generateContent với cơ chế tự động chuyển model dự phòng nếu runtime model gặp lỗi phiên bản
 * @param {Object} ai
 * @param {Array} contents
 * @param {Array} tools
 * @returns {Promise<Object>}
 */
const generateContentWithFallback = async (ai, contents, tools, systemInstruction = SYSTEM_INSTRUCTION) => {
  const modelsToTry = cachedActiveModel
    ? [cachedActiveModel, DEFAULT_MODEL, ...FALLBACK_MODELS]
    : [DEFAULT_MODEL, ...FALLBACK_MODELS.filter((m) => m !== DEFAULT_MODEL)];

  const uniqueModels = [...new Set(modelsToTry)];
  let lastError = null;

  for (const modelName of uniqueModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          tools
        }
      });
      cachedActiveModel = modelName;
      return { response, activeModel: modelName };
    } catch (err) {
      lastError = err;
      const errMsg = err?.message || '';
      // Nếu lỗi 404 (model retired hoặc not found trong phiên bản API hiện tại), thử model tiếp theo
      if (
        errMsg.includes('404') ||
        errMsg.includes('not found') ||
        errMsg.includes('no longer available')
      ) {
        console.warn(`[chatbotController] Model "${modelName}" không khả dụng, chuyển sang model dự phòng...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};

/**
 * Controller: POST /api/v1/chatbot/message
 * Xử lý tin nhắn trò chuyện với Gemini AI kết hợp Function Calling
 */
const sendMessage = async (req, res, next) => {
  try {
    const { message, conversationHistory = [], user: bodyUser } = req.body;

    // Kiểm tra tính hợp lệ của tin nhắn đầu vào
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung tin nhắn (message) không được để trống.'
      });
    }

    // 1. Trích xuất thông tin người dùng từ Header Authorization (JWT) hoặc body (nếu có)
    let currentUser = null;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        if (decoded && decoded.MaNguoiDung) {
          const [userRows] = await pool.query(
            'SELECT MaNguoiDung, TaiKhoan, HoTen, Email, SoDienThoai FROM nguoidung WHERE MaNguoiDung = ?',
            [decoded.MaNguoiDung]
          );
          if (userRows && userRows.length > 0) {
            currentUser = userRows[0];
          }
        }
      } catch (tokenErr) {
        console.warn('[chatbotController] Xác thực token thất bại hoặc token hết hạn:', tokenErr.message);
      }
    }

    // Fallback: Nếu JWT không giải mã được hoặc môi trường dev truyền thông tin user qua body
    if (!currentUser && bodyUser && bodyUser.MaNguoiDung) {
      currentUser = bodyUser;
    }

    // 2. Tạo System Instruction động kèm ngữ cảnh khách hàng đăng nhập
    let dynamicSystemInstruction = SYSTEM_INSTRUCTION;
    if (currentUser) {
      dynamicSystemInstruction += `

--- THÔNG TIN KHÁCH HÀNG ĐANG ĐĂNG NHẬP (USER CONTEXT) ---
- Mã người dùng (userId): ${currentUser.MaNguoiDung}
- Họ tên khách hàng: ${currentUser.HoTen || currentUser.TaiKhoan}
- Số điện thoại: ${currentUser.SoDienThoai || 'Chưa cập nhật'}
- Email: ${currentUser.Email || 'Chưa cập nhật'}

QUY TẮC CÁ NHÂN HÓA QUAN TRỌNG DÀNH CHO KHÁCH HÀNG NÀY:
1. Khách hàng đã đăng nhập tài khoản trên hệ thống. Hãy xưng "Em" và xưng hô thân mật với khách là "${currentUser.HoTen || currentUser.TaiKhoan}".
2. KHI KHÁCH HÀNG YÊU CẦU: "tra cứu đơn hàng", "đơn hàng của tôi", "kiểm tra đơn hàng", "tôi đã mua gì", "đơn hàng gần đây", "tiến độ giao hàng", v.v.:
   - TUYỆT ĐỐI KHÔNG HỎI LẠI số điện thoại hay bắt khách cung cấp lại mã/thông tin cá nhân!
   - HÃY TỰ ĐỘNG gọi tool \`getOrderStatus\` ngay lập tức với:
     + userId: ${currentUser.MaNguoiDung}
     + phoneNumber: "${currentUser.SoDienThoai || ''}"
3. Nếu khách hàng chủ động cung cấp một mã đơn hàng cụ thể (ví dụ: "SZ202609170002" hoặc "#2"), hãy ưu tiên truyền orderCode đó vào tool \`getOrderStatus\`.
`;
    }

    const ai = getAIClient();
    const contents = formatContents(conversationHistory, message);

    let toolType = 'TEXT';
    let toolData = null;
    let finalReply = '';
    let executedCall = null;

    // Vòng lặp Function Calling tối đa 3 lượt (tránh lặp vô hạn)
    let currentTurn = 0;
    const MAX_TURNS = 3;

    while (currentTurn < MAX_TURNS) {
      currentTurn++;

      const { response } = await generateContentWithFallback(ai, contents, geminiTools, dynamicSystemInstruction);

      // Kiểm tra nếu Gemini yêu cầu gọi Function (Tool Call)
      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        const functionName = call.name;
        const functionArgs = call.args || {};
        executedCall = call;

        console.log(`[chatbotController] Gemini yêu cầu Tool Call [${functionName}]:`, functionArgs);

        // 1. Thực thi hàm tương ứng trong registry chatbotTools.js
        const rawToolResult = await executeChatbotTool(functionName, functionArgs);

        // 2. Map tên tool sang phân loại Frontend (type) và dữ liệu đính kèm (data)
        switch (functionName) {
          case 'searchProducts':
            toolType = 'PRODUCT_LIST';
            toolData = rawToolResult.products || [];
            break;
          case 'compareProducts':
            toolType = 'COMPARE';
            toolData = rawToolResult.products || [];
            break;
          case 'getOrderStatus':
            toolType = 'ORDER_STATUS';
            toolData = rawToolResult.orders || [];
            break;
          case 'getVouchers':
            toolType = 'VOUCHER_LIST';
            toolData = rawToolResult.vouchers || [];
            break;
          case 'getPaymentGuide':
            toolType = 'PAYMENT_GUIDE';
            toolData = rawToolResult.supportedMethods || [];
            break;
          default:
            toolType = 'TEXT';
            toolData = rawToolResult;
        }

        // 3. Đưa lượt gọi hàm của model vào contents
        if (response.candidates && response.candidates[0]?.content) {
          contents.push(response.candidates[0].content);
        } else {
          contents.push({
            role: 'model',
            parts: [{ functionCall: call }]
          });
        }

        // 4. Gửi kết quả DB quay lại cho Gemini để nó tổng hợp câu trả lời tự nhiên
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: functionName,
                response: {
                  result: rawToolResult
                },
                id: call.id
              }
            }
          ]
        });

        // Tiếp tục vòng lặp để nhận lời giải thích/tổng hợp từ Gemini
        continue;
      }

      // Nếu không có tool call nữa, ta lấy câu trả lời text cuối cùng từ Gemini
      finalReply = response.text || '';
      break;
    }

    // Nếu vì lý do nào đó Gemini không trả về text (chỉ gọi tool), sinh câu phản hồi mặc định lịch sự
    if (!finalReply && toolType !== 'TEXT') {
      switch (toolType) {
        case 'PRODUCT_LIST':
          finalReply = 'Dạ SmartZone đã tìm kiếm các sản phẩm phù hợp với nhu cầu của quý khách bên dưới ạ:';
          break;
        case 'COMPARE':
          finalReply = 'Dạ đây là bảng so sánh chi tiết thông số kỹ thuật giữa các sản phẩm quý khách đang quan tâm ạ:';
          break;
        case 'ORDER_STATUS':
          finalReply = 'Dạ thông tin chi tiết và tiến độ đơn hàng của quý khách đã được cập nhật bên dưới ạ:';
          break;
        case 'VOUCHER_LIST':
          finalReply = 'Dạ đây là danh sách các mã giảm giá hấp dẫn đang còn lượt sử dụng tại SmartZone ạ:';
          break;
        case 'PAYMENT_GUIDE':
          finalReply = 'Dạ SmartZone xin gửi đến quý khách hướng dẫn chi tiết các hình thức thanh toán được hỗ trợ ạ:';
          break;
        default:
          finalReply = 'Dạ SmartZone đã tiếp nhận và xử lý yêu cầu của quý khách.';
      }
    }

    return res.status(200).json({
      success: true,
      reply: finalReply,
      type: toolType,
      data: toolData
    });
  } catch (error) {
    console.error('[chatbotController.sendMessage] Lỗi xử lý:', error);

    // Xử lý các mã lỗi phổ biến từ Gemini API / Kết nối mạng
    const errorMsg = error?.message || '';
    const errorStatus = error?.status || error?.statusCode || error?.response?.status;
    const errorCode = error?.code || '';

    // Khi hết quota, rate limit, mất mạng, timeout hoặc lỗi từ Gemini API:
    // Fallback chuẩn: "Hệ thống AI đang bảo trì, vui lòng quay lại sau!"
    const isQuotaOrLimit =
      errorMsg.includes('RESOURCE_EXHAUSTED') ||
      errorMsg.includes('429') ||
      errorStatus === 429 ||
      errorMsg.includes('quota') ||
      errorMsg.includes('Quota exceeded');

    const isNetworkOrTimeout =
      errorCode === 'ENOTFOUND' ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ECONNABORTED' ||
      errorCode === 'ETIMEDOUT' ||
      errorMsg.includes('fetch failed') ||
      errorMsg.includes('network') ||
      errorMsg.includes('timeout') ||
      errorMsg.includes('getaddrinfo');

    const isApiKeyIssue =
      errorMsg.includes('API_KEY_INVALID') ||
      errorMsg.includes('API key not valid') ||
      errorMsg.includes('API_KEY');

    let clientMessage = 'Hệ thống AI đang bảo trì, vui lòng quay lại sau!';

    if (!isQuotaOrLimit && !isNetworkOrTimeout && !isApiKeyIssue) {
      clientMessage = 'Hệ thống AI đang bảo trì, vui lòng quay lại sau!';
    }

    return res.status(200).json({
      success: false,
      reply: 'Hệ thống AI đang bảo trì, vui lòng quay lại sau!',
      type: 'TEXT',
      data: null,
      error: process.env.NODE_ENV === 'development' ? errorMsg : undefined
    });
  }
};

module.exports = {
  sendMessage
};
