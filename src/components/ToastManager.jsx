import React, { useState, createContext, useContext } from 'react';
import Toast from './Toast';

// Create a context with a default value that includes the expected function shape
const ToastContext = createContext({
  showToast: () => {}
});

export const useToast = () => {
  return useContext(ToastContext);
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
