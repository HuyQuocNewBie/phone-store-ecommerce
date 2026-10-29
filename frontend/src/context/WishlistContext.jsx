import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

/**
 * Helper tạo Set các mã sản phẩm yêu thích (MaSanPham)
 * Hỗ trợ cả .has() (Set) và .includes() (Array-like) để kiểm tra nhanh.
 */
const createWishedSet = (ids = []) => {
  const set = new Set(ids.map(Number).filter((id) => !isNaN(id) && id > 0));
  const nativeHas = set.has.bind(set);
  set.has = (id) => nativeHas(Number(id));
  set.includes = (id) => nativeHas(Number(id));
  Object.defineProperty(set, 'length', {
    get() {
      return this.size;
    },
    configurable: true,
    enumerable: false,
  });
  set.map = (fn) => Array.from(set).map(fn);
  return set;
};

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // State danh sách các sản phẩm yêu thích (chi tiết sản phẩm)
  const [wishlistItems, setWishlistItems] = useState([]);

  // State Mảng/Set chứa các MaSanPham để kiểm tra isWished(productId) nhanh
  const [wishedIds, setWishedIds] = useState(() => createWishedSet([]));

  // State trạng thái tải dữ liệu
  const [loading, setLoading] = useState(false);

  /**
   * Kiểm tra xem sản phẩm có nằm trong danh sách yêu thích hay không
   * @param {number|string} productId - Mã sản phẩm
   * @returns {boolean}
   */
  const isWished = useCallback(
    (productId) => {
      if (productId === undefined || productId === null) return false;
      const id = Number(productId);
      if (isNaN(id)) return false;
      return wishedIds.has ? wishedIds.has(id) : wishedIds.includes(id);
    },
    [wishedIds]
  );

  /**
   * Đồng bộ danh sách yêu thích từ API GET /api/v1/wishlist
   */
  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistItems([]);
      setWishedIds(createWishedSet([]));
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/wishlist');
      if (res.data?.success) {
        const raw = res.data.data;
        const items = Array.isArray(raw) ? raw : (raw?.items || []);
        setWishlistItems(items);

        const ids = items
          .map((item) => Number(item.MaSanPham ?? item.id ?? item.product_id))
          .filter(Boolean);
        setWishedIds(createWishedSet(ids));
      }
    } catch (err) {
      console.error('WishlistContext: Lỗi khi tải danh sách yêu thích:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Tự động gọi API GET /api/v1/wishlist khi ứng dụng load hoặc user đăng nhập
   */
  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    } else {
      setWishlistItems([]);
      setWishedIds(createWishedSet([]));
    }
  }, [isAuthenticated, fetchWishlist]);

  /**
   * Hàm toggleWishlist(product):
   * 1. Kiểm tra nếu user chưa đăng nhập -> Hiển thị Toast thông báo "Vui lòng đăng nhập để lưu sản phẩm yêu thích!".
   * 2. Ngược lại -> Gọi API POST /api/v1/wishlist/toggle.
   * 3. Sử dụng Optimistic UI để cập nhật ngay lập tức trạng thái trái tim trên giao diện.
   *
   * @param {object|number|string} product - Object sản phẩm hoặc MaSanPham
   * @returns {Promise<{ success: boolean, isWished?: boolean, message?: string }>}
   */
  const toggleWishlist = useCallback(
    async (product) => {
      // 1. Kiểm tra đăng nhập
      if (!isAuthenticated) {
        toast.error('Vui lòng đăng nhập để lưu sản phẩm yêu thích!');
        return {
          success: false,
          message: 'Vui lòng đăng nhập để lưu sản phẩm yêu thích!',
        };
      }

      if (!product) {
        return { success: false, message: 'Thông tin sản phẩm không hợp lệ' };
      }

      // Xác định ID sản phẩm
      const productId =
        typeof product === 'object' && product !== null
          ? Number(product.MaSanPham ?? product.id ?? product.product_id)
          : Number(product);

      if (!productId || isNaN(productId)) {
        console.error('WishlistContext: Mã sản phẩm không hợp lệ', product);
        return { success: false, message: 'Mã sản phẩm không hợp lệ' };
      }

      // Kiểm tra trạng thái hiện tại
      const currentlyLiked = isWished(productId);

      // Lưu lại trạng thái trước khi thay đổi để rollback khi API gặp lỗi (Optimistic UI)
      const prevItems = wishlistItems;
      const prevIds = wishedIds;

      // 2. Optimistic UI: Tính toán và cập nhật state ngay lập tức
      let nextItems;
      let nextIdArray;

      if (currentlyLiked) {
        // Đang yêu thích -> Bỏ yêu thích
        nextItems = prevItems.filter(
          (item) => Number(item.MaSanPham ?? item.id ?? item.product_id) !== productId
        );
        nextIdArray = Array.from(prevIds).filter((id) => Number(id) !== productId);
      } else {
        // Chưa yêu thích -> Thêm vào yêu thích
        const productData =
          typeof product === 'object' && product !== null
            ? { ...product, MaSanPham: productId }
            : { MaSanPham: productId };

        nextItems = [productData, ...prevItems];
        nextIdArray = [...Array.from(prevIds), productId];
      }

      const nextIds = createWishedSet(nextIdArray);
      setWishlistItems(nextItems);
      setWishedIds(nextIds);

      // 3. Gọi API POST /api/v1/wishlist/toggle
      try {
        const res = await api.post('/wishlist/toggle', {
          MaSanPham: productId,
          product_id: productId,
        });

        if (res.data?.success) {
          const successMsg =
            res.data.message ||
            (currentlyLiked
              ? 'Đã xóa khỏi danh sách yêu thích!'
              : 'Đã lưu sản phẩm vào danh sách yêu thích!');
          toast.success(successMsg);
          return {
            success: true,
            isWished: !currentlyLiked,
            message: successMsg,
          };
        } else {
          // Rollback nếu backend phản hồi không thành công
          setWishlistItems(prevItems);
          setWishedIds(prevIds);
          toast.error(res.data?.message || 'Không thể cập nhật trạng thái yêu thích.');
          return { success: false, message: res.data?.message };
        }
      } catch (err) {
        // Rollback ngay khi gặp lỗi mạng / HTTP lỗi
        setWishlistItems(prevItems);
        setWishedIds(prevIds);
        const errorMsg =
          err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật yêu thích.';
        toast.error(errorMsg);
        return { success: false, error: err, message: errorMsg };
      }
    },
    [isAuthenticated, isWished, wishlistItems, wishedIds]
  );

  const value = useMemo(
    () => ({
      wishlistItems,
      wishedIds,
      isWished,
      toggleWishlist,
      fetchWishlist,
      loading,
      totalWishlistCount: wishlistItems.length,
    }),
    [wishlistItems, wishedIds, isWished, toggleWishlist, fetchWishlist, loading]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

/**
 * Custom hook sử dụng WishlistContext
 */
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist phải được sử dụng bên trong WishlistProvider');
  }
  return context;
};

export default WishlistContext;

