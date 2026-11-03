import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
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
  CheckCheck,
  Mic
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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
 *  - Floating FAB hình tròn cố định ở `fixed bottom-6 right-6 z-50` gradient xanh công nghệ kèm icon dập nổi và hiệu ứng Glow Pulse.
 *  - Cửa sổ Chat Drawer (380px x 580px, bo góc rounded-[28px], viền border-slate-100, shadow-2xl).
 *  - Header: Gradient sang trọng blue-600 via indigo-600 to blue-700, Avatar AI viền trắng mờ tích xanh Online 24/7 phát sáng, nút kính mờ.
 *  - Body: Danh sách tin nhắn bong bóng (User xanh bên phải, AI xám nhạt bên trái).
 *  - Footer: Input câu hỏi + Nút gửi + phím tắt Enter.
 *  - Hỗ trợ hiển thị rich cards (sản phẩm, voucher, so sánh) trả về từ Gemini AI.
 */
const ChatbotWidget = ({ user: propUser, token: propToken }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Tích hợp AuthContext: ưu tiên props truyền vào, nếu không có thì lấy trực tiếp từ Context
  const authContext = useAuth();
  const user = propUser !== undefined ? propUser : authContext?.user;
  const token =
    propToken !== undefined
      ? propToken
      : authContext?.token || localStorage.getItem('token') || localStorage.getItem('accessToken');

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedVoucher, setCopiedVoucher] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);

  // Lời chào cá nhân hóa theo thông tin tài khoản đăng nhập
  const createWelcomeMessage = () => {
    const customerName = user?.HoTen || user?.TaiKhoan;
    return {
      id: 'welcome-msg',
      role: 'assistant',
      content: customerName
        ? `Xin chào ${customerName}! 👋 Em là Trợ lý AI SmartZone 24/7. Em có thể hỗ trợ tra cứu đơn hàng, tư vấn chọn mua điện thoại hoặc tìm voucher giảm giá cho anh/chị. Em có thể hỗ trợ gì ạ?`
        : DEFAULT_WELCOME_MESSAGE.content,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'TEXT',
    };
  };

  // Khởi tạo tin nhắn từ sessionStorage nếu có
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [createWelcomeMessage()];
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Lưu lịch sử tin nhắn vào sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('[ChatbotWidget] Không thể lưu lịch sử chat:', e);
    }
  }, [messages]);

  // Cuộn mượt xuống cuối danh sách tin nhắn
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Dọn dẹp nhận diện giọng nói khi unmount hoặc khi đóng cửa sổ chat
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Bỏ qua lỗi dọn dẹp
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen && isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Bỏ qua lỗi
        }
      }
      setIsListening(false);
    }
  }, [isOpen, isListening]);

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
    setMessages([createWelcomeMessage()]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
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

      // Chuẩn bị Header Authorization và Payload gửi lên API
      const headers = {};
      const authToken =
        token || localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await api.post(
        '/chatbot/message',
        {
          message: text,
          conversationHistory,
          user: user
            ? {
                MaNguoiDung: user.MaNguoiDung,
                HoTen: user.HoTen,
                SoDienThoai: user.SoDienThoai,
                Email: user.Email,
              }
            : undefined,
        },
        {
          headers,
          timeout: 25000,
        }
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
      // Khi hết quota Gemini API Key, mất mạng hoặc server lỗi:
      const errorMsg =
        error.response?.data?.reply ||
        'Hệ thống AI đang bảo trì, vui lòng quay lại sau!';

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

  // Nhận diện giọng nói Tiếng Việt bằng Web Speech API
  const handleToggleVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Trình duyệt không hỗ trợ nhận diện giọng nói');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.warn('[SpeechRecognition] Lỗi khi dừng:', err);
        }
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          // Chèn nối tiếp vào value của ô input (TUYỆT ĐỐI KHÔNG TỰ ĐỘNG GỬI)
          setInputValue((prev) => {
            const trimmedPrev = (prev || '').trim();
            const trimmedTranscript = transcript.trim();
            return trimmedPrev ? `${trimmedPrev} ${trimmedTranscript}` : trimmedTranscript;
          });
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
      };

      recognition.onerror = (event) => {
        console.error('[SpeechRecognition] Lỗi:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast.error('Quyền truy cập micro bị từ chối. Vui lòng cấp quyền trong trình duyệt!');
        } else if (event.error === 'no-speech') {
          toast('Không nhận diện được giọng nói, vui lòng thử lại!', { icon: '🎙️' });
        } else {
          toast.error(`Lỗi nhận diện giọng nói: ${event.error || 'Vui lòng thử lại'}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[SpeechRecognition] Lỗi khởi động:', err);
      setIsListening(false);
      toast.error('Không thể kích hoạt nhận diện giọng nói.');
    }
  };

  // Ẩn chatbot khi đang ở các trang quản trị admin
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* ─── 1. CỬA SỔ CHAT DRAWER (Rộng 380px, Cao 580px, bo góc rounded-[28px]) ─── */}
      <div
        role="dialog"
        aria-label="Cửa sổ trò chuyện SmartZone AI"
        aria-hidden={!isOpen}
        className={`fixed bottom-24 right-4 sm:right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-7.5rem)]
          flex flex-col bg-white rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden
          transition-all duration-300 ease-out origin-bottom-right transform
          ${
            isOpen
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-95 translate-y-6 pointer-events-none'
          }
        `}
      >
        {/* ── Header: Avatar AI tích xanh Online 24/7 + Nút xóa lịch sử & Thu gọn kính mờ ── */}
        <div className="relative px-4 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between shadow-md select-none border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar AI: Viền trắng mờ, tích xanh trạng thái "Online 24/7" phát sáng nhẹ */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 ring-2 ring-white/20 flex items-center justify-center shadow-inner">
                <Bot className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] animate-pulse" />
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-[0_0_8px_rgba(16,185,129,0.85)] ring-1 ring-emerald-300/50"
                title="Online 24/7"
              >
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-white truncate tracking-tight drop-shadow-xs">
                  SmartZone AI Assistant
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/20 text-white backdrop-blur-xs border border-white/20 shadow-xs">
                  24/7
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-blue-100/90 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                </span>
                <span className="font-medium text-emerald-300 drop-shadow-xs">Online 24/7</span>
                <span className="text-white/40">•</span>
                <span className="font-normal text-blue-100/90">Sẵn sàng hỗ trợ</span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Xóa lịch sử, Thu gọn): Icon dạng Button kính mờ */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClearHistory}
              title="Xóa lịch sử trò chuyện"
              aria-label="Xóa lịch sử trò chuyện"
              className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all active:scale-90 flex items-center justify-center backdrop-blur-sm"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title="Thu gọn"
              aria-label="Thu gọn"
              className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all active:scale-90 flex items-center justify-center backdrop-blur-sm"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body: Danh sách tin nhắn dạng bong bóng ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden chat-scrollbar p-3.5 space-y-3.5 bg-slate-50/70 text-slate-800 text-[13px] scroll-smooth">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const hasRichContent =
              !isUser &&
              msg.type &&
              msg.type !== 'TEXT' &&
              (msg.data !== undefined && msg.data !== null ? true : msg.type === 'PRODUCT_LIST' || msg.type === 'PRODUCTS');

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-opacity duration-200 w-full`}
              >
                <div
                  className={`flex items-end gap-2 min-w-0 ${
                    hasRichContent ? 'w-full max-w-full' : 'max-w-[88%]'
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
                    className={`px-3.5 py-2.5 text-[13px] leading-relaxed break-words min-w-0 ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-xs shadow-sm'
                        : 'bg-slate-100 text-slate-800 rounded-2xl rounded-bl-xs shadow-xs'
                    } ${hasRichContent ? 'flex-1 w-full min-w-0 overflow-hidden' : ''}`}
                  >
                    {msg.content &&
                      (isUser ? (
                        <p className="whitespace-pre-line font-normal leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="text-[13px] text-slate-800 font-normal leading-relaxed break-words">
                          <ReactMarkdown
                            components={{
                              p: ({ node, ...props }) => (
                                <p className="mb-2 last:mb-0 leading-relaxed text-slate-800" {...props} />
                              ),
                              ul: ({ node, ...props }) => (
                                <ul className="list-disc pl-4 space-y-1 my-1.5 leading-relaxed" {...props} />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol className="list-decimal pl-4 space-y-1 my-1.5 leading-relaxed" {...props} />
                              ),
                              li: ({ node, ...props }) => (
                                <li className="leading-relaxed" {...props} />
                              ),
                              strong: ({ node, ...props }) => (
                                <strong className="font-semibold text-slate-900" {...props} />
                              ),
                              em: ({ node, ...props }) => <em className="italic" {...props} />,
                              code: ({ node, inline, ...props }) => (
                                <code
                                  className="bg-white/90 border border-slate-200 text-pink-600 px-1 py-0.5 rounded text-[12px] font-mono"
                                  {...props}
                                />
                              ),
                              a: ({ node, ...props }) => (
                                <a
                                  className="text-blue-600 underline font-medium hover:text-blue-800"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  {...props}
                                />
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ))}

                    {/* Rich Content Cards: ProductList, CompareMatrix, OrderStatus, VoucherList */}
                    {hasRichContent && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80 w-full min-w-0 overflow-hidden">
                        <ChatbotRichCards
                          type={msg.type}
                          data={msg.data}
                          onNavigate={navigate}
                          onCopyVoucher={handleCopyVoucher}
                          onSelectPrompt={handleSendMessage}
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
              <div className="px-4 py-3 bg-slate-100 text-slate-800 rounded-2xl rounded-bl-xs shadow-xs flex items-center gap-1.5">
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
                <span className="text-[11px] text-slate-500 font-medium ml-1.5">
                  SmartZone AI đang soạn trả lời...
                </span>
              </div>
            </div>
          )}

          {/* Gợi ý câu hỏi nhanh (Chỉ hiển thị khi ít hơn hoặc bằng 2 tin nhắn) */}
          {messages.length <= 2 && !isLoading && (
            <div className="pt-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                💡 Gợi ý câu hỏi:
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="rounded-full border border-blue-100 bg-blue-50/50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-200 text-xs font-medium text-blue-700 px-3.5 py-2 cursor-pointer shadow-xs active:scale-95 text-left inline-flex items-center"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Footer: Input nhập câu hỏi + Nút Micro + Nút gửi ── */}
        <div className="p-3 bg-white border-t border-slate-100 flex flex-col gap-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="bg-slate-50 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 rounded-full pl-3.5 pr-1.5 py-1.5 transition-all flex items-center gap-1.5"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={isListening ? 'Đang lắng nghe bạn nói...' : 'Nhập câu hỏi cho SmartZone AI...'}
              className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder:text-slate-400 text-slate-700 disabled:opacity-60 min-w-0"
            />
            {/* Nút Micro tròn nhận diện giọng nói Tiếng Việt */}
            <button
              type="button"
              onClick={handleToggleVoice}
              disabled={isLoading}
              aria-label={isListening ? 'Dừng thu âm' : 'Nhập bằng giọng nói'}
              title={isListening ? 'Đang lắng nghe... Bấm để dừng' : 'Nói vào Micro (Tiếng Việt)'}
              className={`p-2 rounded-full transition-all flex items-center justify-center flex-shrink-0 active:scale-95 ${
                isListening
                  ? 'animate-pulse bg-red-100 text-red-600'
                  : 'text-slate-500 hover:text-blue-600 hover:bg-slate-200/60'
              }`}
            >
              <Mic className="w-4 h-4 stroke-[2.2]" />
            </button>
            {/* Nút Gửi câu hỏi */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              aria-label="Gửi tin nhắn"
              title="Gửi câu hỏi"
              className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <SendHorizontal className="w-4 h-4 stroke-[2.2]" />
            </button>
          </form>

          {/* Micro Footer Attribution */}
          <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 select-none">
            <span className="flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
              {isListening ? (
                <span className="text-red-500 font-medium animate-pulse">Đang thu âm giọng nói...</span>
              ) : (
                'Trợ lý AI SmartZone 24/7'
              )}
            </span>
            <span>Nhấn Enter để gửi</span>
          </div>
        </div>
      </div>

      {/* ─── 2. FLOATING ACTION BUTTON (Nút Nổi Mở Chatbot: Gradient xanh công nghệ, Glow Pulse) ─── */}
      <button
        type="button"
        id="btn-chatbot-widget-fab"
        aria-label={isOpen ? 'Thu nhỏ SmartZone AI' : 'Mở SmartZone AI Assistant'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
          bg-gradient-to-r from-blue-600 to-indigo-600 text-white
          flex items-center justify-center shadow-2xl shadow-blue-600/40
          hover:shadow-indigo-600/50 hover:scale-105 active:scale-95
          transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-400/30 group
        `}
      >
        {/* Vòng phát sáng xung quanh (Glow Pulse) khi đóng */}
        {!isOpen && (
          <>
            <span className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-70 blur-md animate-pulse pointer-events-none" />
            <span className="absolute -inset-2.5 rounded-full bg-blue-500/25 animate-ping pointer-events-none" />
          </>
        )}

        {/* Chấm xanh trạng thái trực tuyến 24/7 */}
        {!isOpen && (
          <span
            className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-[0_0_8px_rgba(16,185,129,0.9)]"
            title="Online 24/7"
          />
        )}

        {/* Icon Sparkles/Robot dập nổi chuyển đổi mượt mà */}
        <div className="relative w-7 h-7 flex items-center justify-center transition-transform duration-300">
          {isOpen ? (
            <ChevronDown className="w-7 h-7 stroke-[2.5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] transform transition-transform duration-200 group-hover:translate-y-0.5" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Bot className="w-7 h-7 stroke-[2.2] drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
              <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 drop-shadow-[0_0_8px_rgba(252,211,77,0.9)] animate-pulse" />
            </div>
          )}
        </div>
      </button>
    </>
  );
};

export default ChatbotWidget;
