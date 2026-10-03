import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import ScrollToTop from './components/common/ScrollToTop';

/**
 * App — Entry point component.
 * Toàn bộ routing được quản lý tập trung trong AppRoutes.
 */
function App() {
  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3500,
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#2563eb',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
      <AppRoutes />
      <ScrollToTop />
    </>
  );
}

export default App;
