import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none'
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              backgroundColor: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#3b82f6',
              color: 'white',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontWeight: '600',
              fontSize: '14px',
              minWidth: '220px',
              pointerEvents: 'auto'
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
