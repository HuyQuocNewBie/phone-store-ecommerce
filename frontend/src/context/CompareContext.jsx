import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CompareContext = createContext();

export const STORAGE_KEY = 'smartzone_compare';

export const CompareProvider = ({ children }) => {
  const navigate = useNavigate();
  const [compareItems, setCompareItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  // Sync state if localStorage changes from another tab/window
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          const items = e.newValue ? JSON.parse(e.newValue) : [];
          setCompareItems(items);
        } catch {
          setCompareItems([]);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveItems = useCallback((items) => {
    setCompareItems(items);
    try {
      if (items.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error saving compare items to localStorage:', e);
    }
  }, []);

  const isInCompare = useCallback(
    (id) => {
      const numericId = Number(id);
      return compareItems.some((item) => Number(item.id) === numericId);
    },
    [compareItems]
  );

  const addToCompare = useCallback(
    (product) => {
      if (!product) return false;
      const id = Number(product.MaSanPham ?? product.id);
      const name = product.TenSanPham ?? product.name ?? 'Sản phẩm';
      const img = product.Anh ?? product.img ?? '/assets/images/placeholder.jpg';
      const price = Number(product.Gia ?? product.price ?? 0);

      if (compareItems.some((item) => Number(item.id) === id)) {
        toast('Sản phẩm đã có trong danh sách so sánh', { icon: 'ℹ️' });
        return false;
      }

      if (compareItems.length >= 3) {
        toast.error('Chỉ có thể so sánh tối đa 3 sản phẩm!');
        return false;
      }

      const updated = [...compareItems, { id, name, img, price }];
      saveItems(updated);
      setIsDockCollapsed(false); // Uncollapse dock when a product is added
      toast.success('Đã thêm sản phẩm vào danh sách so sánh');
      return true;
    },
    [compareItems, saveItems]
  );

  const removeFromCompare = useCallback(
    (id) => {
      const numericId = Number(id);
      const updated = compareItems.filter((item) => Number(item.id) !== numericId);
      saveItems(updated);
      if (updated.length === 0) {
        setIsDockCollapsed(false);
      }
      toast.success('Đã bỏ sản phẩm khỏi danh sách so sánh');
    },
    [compareItems, saveItems]
  );

  const toggleCompare = useCallback(
    (product) => {
      if (!product) return;
      const id = Number(product.MaSanPham ?? product.id);
      if (isInCompare(id)) {
        removeFromCompare(id);
      } else {
        addToCompare(product);
      }
    },
    [isInCompare, removeFromCompare, addToCompare]
  );

  const clearCompare = useCallback(() => {
    saveItems([]);
    setIsDockCollapsed(false);
  }, [saveItems]);

  const syncCompare = useCallback(
    (items) => {
      saveItems(items);
    },
    [saveItems]
  );

  const goToCompare = useCallback(() => {
    if (compareItems.length < 2) {
      toast.error('Vui lòng chọn ít nhất 2 sản phẩm!');
      return;
    }
    const ids = compareItems.map((i) => i.id).join(',');
    navigate(`/compare?ids=${ids}`);
  }, [compareItems, navigate]);

  return (
    <CompareContext.Provider
      value={{
        compareItems,
        isDockCollapsed,
        setIsDockCollapsed,
        isInCompare,
        addToCompare,
        removeFromCompare,
        toggleCompare,
        clearCompare,
        syncCompare,
        goToCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
};

export default CompareContext;
