import React, { useState, useEffect, createContext, useContext } from 'react';
import Toast from './Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    message: '',
    visible: false,
    type: 'success'
  });

  const showToast = (message, type = 'success') => {
    setToast({
      message,
      visible: true,
      type
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast 
        message={toast.message}
        isVisible={toast.visible}
        type={toast.type}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
};

export default ToastProvider;
