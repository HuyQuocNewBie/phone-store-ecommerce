import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);

  // Tổng số lượng tất cả sản phẩm trong giỏ
  const totalCartCount = cartItems.reduce((total, item) => total + (item.SoLuong || 0), 0);

  /**
   * Lấy danh sách giỏ hàng từ API
   */
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      return;
    }
    try {
      setCartLoading(true);
      const res = await api.get('/cart');
      if (res.data?.success) {
        const raw = res.data.data;
        // API trả về mảng trực tiếp hoặc trong items
        const items = Array.isArray(raw) ? raw : (raw?.items || []);
        setCartItems(items.map(item => ({ ...item, id: item.MaGioHang })));
      }
    } catch (err) {
      console.error('CartContext: fetchCart error', err);
    } finally {
      setCartLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Thêm sản phẩm vào giỏ hàng
   * @param {number} maSanPham - Mã sản phẩm
   * @param {number} soLuong   - Số lượng muốn thêm
   * @returns {{ success: boolean, message?: string }}
   */
  const addToCart = useCallback(async (maSanPham, soLuong = 1) => {
    try {
      const res = await api.post('/cart/items', { MaSanPham: maSanPham, SoLuong: soLuong });
      if (res.data?.success) {
        // Refetch để đồng bộ state chính xác (gộp số lượng nếu đã tồn tại)
        await fetchCart();
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Thêm thất bại' };
    } catch (err) {
      const message = err.response?.data?.message || 'Không thể thêm vào giỏ hàng.';
      return { success: false, message };
    }
  }, [fetchCart]);

  /**
   * Cập nhật số lượng một item trong giỏ
   * @param {number} maGioHang - MaGioHang (ID của cart item)
   * @param {number} soLuong   - Số lượng mới
   * @returns {{ success: boolean, message?: string }}
   */
  const updateQuantity = useCallback(async (maGioHang, soLuong) => {
    try {
      const res = await api.put('/cart/items', { MaGioHang: maGioHang, SoLuong: soLuong });
      if (res.data?.success) {
        // Cập nhật local state ngay lập tức (optimistic)
        setCartItems(prev =>
          prev.map(item =>
            item.MaGioHang === maGioHang ? { ...item, SoLuong: soLuong } : item
          )
        );
        return { success: true };
      }
      return { success: false, message: res.data?.message };
    } catch (err) {
      const message = err.response?.data?.message || 'Không thể cập nhật số lượng.';
      return { success: false, message };
    }
  }, []);

  /**
   * Xóa một hoặc nhiều item khỏi giỏ hàng
   * @param {number | number[]} cartIds - Một ID hoặc mảng IDs (MaGioHang)
   * @returns {{ success: boolean, message?: string }}
   */
  const removeFromCart = useCallback(async (cartIds) => {
    const ids = Array.isArray(cartIds) ? cartIds : [cartIds];
    try {
      const res = await api.post('/cart/items/batch-delete', { cart_item_ids: ids });
      if (res.data?.success) {
        // Cập nhật local state ngay lập tức (optimistic)
        setCartItems(prev => prev.filter(item => !ids.includes(item.MaGioHang)));
        return { success: true };
      }
      return { success: false, message: res.data?.message };
    } catch (err) {
      const message = err.response?.data?.message || 'Xóa sản phẩm thất bại.';
      return { success: false, message };
    }
  }, []);

  /**
   * Xóa toàn bộ sản phẩm khỏi giỏ hàng (reset local state về [])
   */
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Tự động fetch giỏ hàng khi auth state thay đổi
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const value = {
    cartItems,
    setCartItems,
    cartLoading,
    totalCartCount,
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

/**
 * Custom hook để truy cập CartContext từ bất kỳ component nào
 */
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart phải được sử dụng bên trong CartProvider');
  }
  return context;
};

export default CartContext;
