import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   SpecDrawer – Drawer trượt từ phải hiển thị thông số kỹ thuật đầy đủ
   - Rộng 600px trên Desktop, full màn hình trên Mobile
   - Hiệu ứng backdrop blur nhẹ
   - Header Sticky: Tiêu đề "Thông số nổi bật" + Nút đóng X
   - Ảnh sản phẩm xem trước ở đầu
   - Header sản phẩm nhỏ Sticky (Ảnh 52x52 + Tên SP): Tự động xuất hiện khi cuộn > 150px
   - Thanh Tab Danh Mục Thông Số (NhomThongSo): Cuộn ngang bằng chuột/vuốt,
     tab active gạch chân đỏ #DD2627, click tab cuộn mượt tới nhóm đó
   - Danh sách chi tiết thông số: Bảng 2 cột (TenThongSo 50% xám, GiaTri 50% tối)
───────────────────────────────────────────────────────────────────────────── */
const SpecDrawer = ({ isOpen, onClose, specGroups = [], productName, productImage }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animating, setAnimating] = useState(false);

  const scrollAreaRef = useRef(null);
  const mainProductRef = useRef(null);
  const tabsContainerRef = useRef(null);
  const groupRefs = useRef([]);
  const tabButtonRefs = useRef([]);
  const isClickScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Điều khiển animation mở / đóng drawer
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = "hidden";
      setActiveTab(0);
      setStickyVisible(false);
      isClickScrollingRef.current = false;
      const timer = setTimeout(() => setAnimating(true), 15);
      return () => clearTimeout(timer);
    } else {
      setAnimating(false);
      document.body.style.overflow = "";
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Phím Escape để đóng
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Logic cuộn: tự động xuất hiện mini header CHỈ KHI cuộn qua hết thumbnail & cập nhật active tab
  const handleScrollActiveTab = useCallback(() => {
    const area = scrollAreaRef.current;
    if (!area) return;

    // Chiều cao thumbnail sản phẩm chính ở đầu
    const mainHeight = mainProductRef.current?.offsetHeight || 280;
    // CHỈ hiện mini sticky header khi người dùng đã cuộn qua toàn bộ thumbnail ảnh chính
    const scrolled = area.scrollTop >= mainHeight - 10;
    setStickyVisible(scrolled);

    // Nếu đang cuộn do người dùng bấm tab thì không can thiệp đổi activeTab
    if (isClickScrollingRef.current) return;

    // Xác định tab đang xem dựa trên toạ độ tương đối
    const stickyHeight = scrolled ? 118 : 45;
    const threshold = stickyHeight + 35;
    let currentIdx = 0;
    groupRefs.current.forEach((ref, idx) => {
      if (ref) {
        const areaRect = area.getBoundingClientRect();
        const refRect = ref.getBoundingClientRect();
        if (refRect.top - areaRect.top <= threshold) {
          currentIdx = idx;
        }
      }
    });

    setActiveTab((prev) => {
      if (prev !== currentIdx) {
        // Cuộn ngang thanh tabs để đưa tab active vào vùng nhìn (CHỈ cuộn tabsContainer, không ảnh hưởng cuộn dọc)
        if (tabsContainerRef.current && tabButtonRefs.current[currentIdx]) {
          const container = tabsContainerRef.current;
          const button = tabButtonRefs.current[currentIdx];
          const scrollLeft = button.offsetLeft - container.offsetWidth / 2 + button.offsetWidth / 2;
          container.scrollTo({ left: scrollLeft, behavior: "smooth" });
        }
        return currentIdx;
      }
      return prev;
    });
  }, []);

  // Cuộn mượt tới nhóm thông số khi bấm tab
  const handleTabClick = useCallback((idx) => {
    setActiveTab(idx);
    isClickScrollingRef.current = true;

    // Cuộn ngang thanh tabs để đưa tab được click vào trung tâm (CHỈ cuộn tabsContainer ngang)
    if (tabsContainerRef.current && tabButtonRefs.current[idx]) {
      const container = tabsContainerRef.current;
      const button = tabButtonRefs.current[idx];
      const scrollLeft = button.offsetLeft - container.offsetWidth / 2 + button.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }

    const area = scrollAreaRef.current;
    if (!area) return;

    if (idx === 0) {
      // Nhóm đầu tiên: cuộn lên đầu drawer để thấy cả thumbnail và nhóm đầu
      area.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      const target = groupRefs.current[idx];
      if (target) {
        const areaRect = area.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const targetAbsoluteTop = targetRect.top - areaRect.top + area.scrollTop;
        // Chiều cao sticky header gồm mini header (73px) + tab bar (45px) = 118px
        // Thêm khoảng đệm 16px để tiêu đề mục thông số cách thoáng dưới thanh tab, không bị dính sát sạt
        const headerExpandDiff = !stickyVisible ? 73 : 0;
        const stickyHeight = 118;
        const breathingRoom = 20;
        const targetScrollTop = targetAbsoluteTop + headerExpandDiff - stickyHeight - breathingRoom;

        area.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth",
        });
      }
    }

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 800);
  }, [stickyVisible]);

  // Cuộn ngang tab bằng con lăn chuột
  const handleTabWheel = useCallback((e) => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  if (!shouldRender) return null;

  return createPortal(
    <>
      {/* Backdrop mờ nhẹ */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          animating ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel slide-in từ lề phải (Rộng 600px trên Desktop, full màn hình trên Mobile) */}
      <div
        id="specDrawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="specDrawerTitle"
        className={`fixed top-0 right-0 z-[9999] h-full w-full md:w-[600px]
                   bg-white shadow-2xl flex flex-col
                   transition-transform duration-300 ease-out ${
                     animating ? "translate-x-0" : "translate-x-full"
                   }`}
      >
        {/* ── 1. Header Sticky: Tiêu đề "Thông số nổi bật" + Nút đóng X ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white shrink-0 z-20">
          <h2 id="specDrawerTitle" className="text-base font-bold text-slate-800">
            Thông số nổi bật
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100
                       hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
            aria-label="Đóng bảng thông số kỹ thuật"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Khu vực cuộn nội dung thông số ── */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto relative"
          onScroll={handleScrollActiveTab}
        >
          {/* ── 2. Ảnh sản phẩm xem trước ở đầu ── */}
          <div
            ref={mainProductRef}
            id="specMainProduct"
            className="flex flex-col items-center justify-center py-7 px-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100"
          >
            {productImage ? (
              <img
                src={productImage}
                alt={productName}
                className="w-48 h-48 object-contain transition-transform duration-300 hover:scale-105"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="w-48 h-48 bg-slate-100 rounded-2xl flex items-center justify-center">
                <span className="text-slate-400 text-sm">Không có hình ảnh</span>
              </div>
            )}
            <p className="mt-3.5 text-sm font-semibold text-slate-800 text-center line-clamp-2 max-w-sm leading-snug">
              {productName}
            </p>
          </div>

          {/* ── Khối Sticky Wrapper: Header sản phẩm nhỏ + Thanh Tab ── */}
          <div className="sticky top-0 z-10 bg-white">
            {/* ── 3. Header sản phẩm nhỏ Sticky (Ảnh 52x52 + Tên SP): Xuất hiện khi cuộn > 150px ── */}
            <div
              id="specStickyProduct"
              className="border-b border-slate-100 px-5 overflow-hidden transition-all duration-300 bg-white"
              style={{
                maxHeight: stickyVisible ? "75px" : "0px",
                opacity: stickyVisible ? 1 : 0,
                paddingTop: stickyVisible ? "10px" : "0px",
                paddingBottom: stickyVisible ? "10px" : "0px",
              }}
            >
              <div className="flex items-center gap-3">
                {productImage && (
                  <img
                    src={productImage}
                    alt={productName}
                    className="w-[52px] h-[52px] object-contain rounded-xl bg-slate-50 border border-slate-100 shrink-0 p-1"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
                <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">
                  {productName}
                </p>
              </div>
            </div>

            {/* ── 4. Thanh Tab Danh Mục Thông Số (NhomThongSo): Cuộn ngang chuột/vuốt, active có gạch chân #DD2627 ── */}
            {specGroups.length > 0 && (
              <div className="border-b border-slate-100 shadow-xs bg-white">
                <div
                  id="specTabsContainer"
                  ref={tabsContainerRef}
                  className="flex gap-0 overflow-x-auto px-4 scrollbar-hide select-none"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  onWheel={handleTabWheel}
                >
                  {specGroups.map(([groupName], idx) => (
                    <button
                      key={groupName}
                      ref={(el) => (tabButtonRefs.current[idx] = el)}
                      type="button"
                      onClick={() => handleTabClick(idx)}
                      className={`shrink-0 px-4 py-3 text-[13px] font-medium whitespace-nowrap
                                  transition-all duration-200 border-b-2 cursor-pointer
                                  ${activeTab === idx
                                    ? "border-[#DD2627] text-[#DD2627] font-bold"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                                  }`}
                    >
                      {groupName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 5. Danh sách chi tiết thông số: Bảng 2 cột (TenThongSo 50% xám, GiaTri 50% tối) ── */}
          <div className="px-5 pb-12 mt-4 space-y-6">
            {specGroups.length > 0 ? (
              specGroups.map(([groupName, specs], idx) => (
                <div
                  key={groupName}
                  ref={(el) => (groupRefs.current[idx] = el)}
                  className="scroll-mt-32"
                >
                  <h3 className="text-sm font-bold text-slate-800 mb-2.5 pb-2 border-b border-slate-200">
                    {groupName}
                  </h3>
                  <div className="rounded-xl border border-slate-100 overflow-hidden shadow-xs">
                    {specs.map((spec, sIdx) => (
                      <div
                        key={spec.MaThongSo || sIdx}
                        className={`flex items-start gap-2 px-4 py-3 border-b border-slate-100 last:border-b-0
                                    ${sIdx % 2 === 0 ? "bg-slate-50/60" : "bg-white"}`}
                      >
                        <span className="w-1/2 text-[13px] text-slate-500 leading-snug shrink-0">
                          {spec.TenThongSo}
                        </span>
                        <span className="w-1/2 text-[13px] font-medium text-slate-900 leading-snug break-words">
                          {spec.GiaTri}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-slate-400 text-sm">
                Thông số kỹ thuật đang được cập nhật...
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default SpecDrawer;
