import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';

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
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#0f172a',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#0f172a',
            },
          },
        }}
      />
      <AppRoutes />
    </>
  );
}

export default App;
