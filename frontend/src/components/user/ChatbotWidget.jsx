import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bot,
  Sparkles,
  SendHorizontal,
  Trash2,
  X,
  Check,
  Tag,
  ExternalLink,
  ChevronDown,
  ShoppingBag,
  RotateCcw,
  Copy,
  CheckCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ChatbotRichCards from './ChatbotRichCards';

/**
 * Tin nhắn chào mừng mặc định từ SmartZone AI
 */
const DEFAULT_WELCOME_MESSAGE = {
  id: 'welcome-msg',
  role: 'assistant',
  content:
    'Xin chào Quý khách! 👋 Em là Trợ lý AI SmartZone 24/7. Em có thể hỗ trợ tư vấn chọn mua điện thoại, so sánh cấu hình, tra cứu đơn hàng hoặc săn voucher giảm giá. Quý khách cần hỗ trợ gì hôm nay ạ?',
  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  type: 'TEXT',
};

/**
 * Gợi ý câu hỏi nhanh (Quick Prompts)
 */
const QUICK_PROMPTS = [
  '📱 Tư vấn iPhone dưới 20 triệu',
  '⚡ So sánh iPhone 15 vs Galaxy S24',
  '🎟️ Mã giảm giá hot hôm nay',
  '📦 Tra cứu đơn hàng gần đây',
];

const STORAGE_KEY = 'smartzone_chatbot_history';

/**
 * ChatbotWidget — Floating Chatbot Widget trượt mượt góc phải màn hình
 *
 * Tính năng chính:
 *  - Floating FAB hình tròn cố định ở `fixed bottom-6 right-6 z-50` kèm hiệu ứng gợn sóng (Pulse).
 *  - Cửa sổ Chat Drawer (380px x 580px, bo góc rounded-3xl, shadow lớn) trượt mượt mà.
 *  - Header: Avatar AI tích xanh "SmartZone AI Assistant 24/7" + Nút xóa lịch sử + Nút X đóng.
 *  - Body: Danh sách tin nhắn bong bóng (User xanh bên phải, AI xám nhạt bên trái).
 *  - Footer: Input câu hỏi + Nút gửi + phím tắt Enter.
 *  - Hỗ trợ hiển thị rich cards (sản phẩm, voucher, so sánh) trả về từ Gemini AI.
 */
const ChatbotWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedVoucher, setCopiedVoucher] = useState(null);

  // Khởi tạo tin nhắn từ localStorage nếu có
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [DEFAULT_WELCOME_MESSAGE];
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Lưu lịch sử tin nhắn vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('[ChatbotWidget] Không thể lưu lịch sử chat:', e);
    }
  }, [messages]);

  // Cuộn mượt xuống cuối danh sách tin nhắn
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom('auto');
      // Focus vào ô input khi mở chatbot
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom('smooth');
    }
  }, [messages, isLoading]);

  // Xóa toàn bộ lịch sử trò chuyện
  const handleClearHistory = () => {
    setMessages([
      {
        ...DEFAULT_WELCOME_MESSAGE,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    toast.success('Đã làm mới cuộc trò chuyện!');
  };

  // Sao chép mã voucher
  const handleCopyVoucher = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucher(code);
    toast.success(`Đã sao chép mã: ${code}`);
    setTimeout(() => {
      setCopiedVoucher(null);
    }, 2000);
  };

  // Điều hướng đến sản phẩm
  const handleGoToProduct = (productId) => {
    if (!productId) return;
    navigate(`/products/${productId}`);
  };

  // Gửi tin nhắn đến backend AI
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Chuẩn hóa conversationHistory gửi lên Backend theo định dạng Gemini SDK
      const conversationHistory = messages
        .filter((m) => m.id !== 'welcome-msg')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content,
        }));

      const response = await api.post(
        '/chatbot/message',
        {
          message: text,
          conversationHistory,
        },
        { timeout: 25000 }
      );

      const resData = response.data || {};
      const aiReply =
        resData.reply ||
        'Dạ SmartZone đã ghi nhận thông tin và đang xử lý yêu cầu của Quý khách ạ.';

      const aiMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        type: resData.type || 'TEXT',
        data: resData.data || null,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('[ChatbotWidget] Gửi tin nhắn lỗi:', error);
      const errorMsg =
        error.response?.data?.reply ||
        error.response?.data?.message ||
        'Dạ hiện tại hệ thống AI SmartZone đang nâng cấp hoặc bận trong giây lát. Quý khách vui lòng thử lại sau ít phút hoặc liên hệ hotline để được hỗ trợ nhé!';

      const fallbackAiMessage = {
        id: `ai-error-${Date.now()}`,
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        type: 'TEXT',
      };

      setMessages((prev) => [...prev, fallbackAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Ẩn chatbot khi đang ở các trang quản trị admin
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* ─── 1. CỬA SỔ CHAT DRAWER (Rộng 380px, Cao 580px, bo góc rounded-3xl) ─── */}
      <div
        role="dialog"
        aria-label="Cửa sổ trò chuyện SmartZone AI"
        aria-hidden={!isOpen}
        className={`fixed bottom-24 right-4 sm:right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-7.5rem)]
          flex flex-col bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-slate-200/90 overflow-hidden
          transition-all duration-300 ease-out origin-bottom-right transform
          ${
            isOpen
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-95 translate-y-6 pointer-events-none'
          }
        `}
      >
        {/* ── Header: Avatar AI tích xanh + Nút xóa lịch sử + Nút X đóng ── */}
        <div className="relative px-4 py-3.5 bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white flex items-center justify-between shadow-sm select-none">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar AI tích xanh */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
                <Bot className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-xs"
                title="Đã xác thực 24/7"
              >
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-white truncate tracking-tight">
                  SmartZone AI Assistant
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-white/20 text-white backdrop-blur-xs">
                  24/7
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-blue-100/90 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span className="font-medium">Sẵn sàng phản hồi tức thì</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Nút xóa lịch sử + Nút X đóng */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearHistory}
              title="Xóa lịch sử trò chuyện"
              aria-label="Xóa lịch sử trò chuyện"
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-all duration-200 active:scale-90"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title="Đóng cửa sổ chat"
              aria-label="Đóng cửa sổ chat"
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-all duration-200 active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body: Danh sách tin nhắn dạng bong bóng ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70 text-slate-800 text-[13px] scroll-smooth">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const hasRichContent = !isUser && msg.type && msg.type !== 'TEXT' && msg.data;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-opacity duration-200`}
              >
                <div
                  className={`flex items-end gap-2 ${
                    hasRichContent ? 'max-w-[96%]' : 'max-w-[88%]'
                  } ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar cạnh tin nhắn AI */}
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mb-1">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Bong bóng tin nhắn */}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-xs break-words ${
                      isUser
                        ? 'bg-primary text-white rounded-br-xs shadow-blue-600/10'
                        : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200/70 shadow-slate-200/50'
                    } ${hasRichContent ? 'w-full' : ''}`}
                  >
                    {msg.content && <p className="whitespace-pre-line font-normal">{msg.content}</p>}

                    {/* Rich Content Cards: ProductList, CompareMatrix, OrderStatus, VoucherList */}
                    {hasRichContent && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100">
                        <ChatbotRichCards
                          type={msg.type}
                          data={msg.data}
                          onNavigate={navigate}
                          onCopyVoucher={handleCopyVoucher}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <span
                  className={`text-[10px] text-slate-400 mt-1 px-1 select-none ${
                    isUser ? 'mr-1' : 'ml-9'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            );
          })}

          {/* Typing Indicator khi AI đang phản hồi */}
          {isLoading && (
            <div className="flex items-end gap-2 max-w-[85%]">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mb-1">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="px-4 py-3 bg-white border border-slate-200/80 rounded-2xl rounded-bl-xs shadow-xs flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
                <span className="text-[11px] text-slate-400 font-medium ml-1.5">
                  SmartZone AI đang soạn trả lời...
                </span>
              </div>
            </div>
          )}

          {/* Gợi ý câu hỏi nhanh (Chỉ hiển thị khi ít hơn hoặc bằng 2 tin nhắn) */}
          {messages.length <= 2 && !isLoading && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Câu hỏi thường gặp:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="text-left text-[11px] bg-white hover:bg-blue-50 hover:text-primary text-slate-600 px-2.5 py-1.5 rounded-xl border border-slate-200/80 hover:border-blue-200 transition-all shadow-2xs active:scale-95"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Footer: Input nhập câu hỏi + Nút gửi ── */}
        <div className="p-3 bg-white border-t border-slate-100 flex flex-col gap-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Nhập câu hỏi cho SmartZone AI..."
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              aria-label="Gửi tin nhắn"
              title="Gửi câu hỏi"
              className="p-2.5 rounded-2xl bg-primary hover:bg-[#003ea8] active:scale-95 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-blue-600/20 flex-shrink-0"
            >
              <SendHorizontal className="w-4 h-4 stroke-[2.2]" />
            </button>
          </form>

          {/* Micro Footer Attribution */}
          <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 select-none">
            <span className="flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
              Trợ lý AI SmartZone 24/7
            </span>
            <span>Nhấn Enter để gửi</span>
          </div>
        </div>
      </div>

      {/* ─── 2. FLOATING ACTION BUTTON (Hình tròn cố định `fixed bottom-6 right-6 z-50`) ─── */}
      <button
        type="button"
        id="btn-chatbot-widget-fab"
        aria-label={isOpen ? 'Thu nhỏ SmartZone AI' : 'Mở SmartZone AI Assistant'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
          bg-gradient-to-tr from-blue-700 via-primary to-indigo-600 text-white
          flex items-center justify-center shadow-xl shadow-blue-600/35
          hover:shadow-2xl hover:shadow-blue-600/50 hover:scale-105 active:scale-95
          transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-400/30 group
        `}
      >
        {/* Hiệu ứng gợn sóng (Pulse / Ping) khi cửa sổ đang đóng */}
        {!isOpen && (
          <>
            <span className="absolute -inset-1.5 rounded-full bg-blue-500/35 animate-ping opacity-75 pointer-events-none" />
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-pulse pointer-events-none" />
          </>
        )}

        {/* Chấm xanh trạng thái trực tuyến 24/7 */}
        {!isOpen && (
          <span
            className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs"
            title="Sẵn sàng 24/7"
          />
        )}

        {/* Icon chuyển đổi mượt mà giữa Bot/Sparkles và ChevronDown/X khi mở */}
        <div className="relative w-7 h-7 flex items-center justify-center transition-transform duration-300">
          {isOpen ? (
            <ChevronDown className="w-7 h-7 stroke-[2.5] transform transition-transform duration-200 group-hover:translate-y-0.5" />
          ) : (
            <div className="relative">
              <Bot className="w-7 h-7 stroke-[2.2]" />
              <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
            </div>
          )}
        </div>
      </button>
    </>
  );
};

export default ChatbotWidget;
