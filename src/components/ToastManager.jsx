import React, { useState, createContext, useContext } from 'react';
import Toast from './Toast';

// Create a context with a default value that includes the expected function shape
const ToastContext = createContext({
  showToast: () => {
    console.warn('Toast provider not found!');
  }
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

  // Log when toast provider is mounted
  console.log('Toast provider mounted');

  // This function now handles both string messages and object-style toasts
  const showToast = (messageOrOptions, type = 'success') => {
    console.log('showToast called with:', messageOrOptions, type);
    
    if (typeof messageOrOptions === 'string') {
      // Handle simple string messages with type as second parameter
      setToast({
        message: messageOrOptions,
        visible: true,
        type
      });
    } else if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
      // Handle object-style calls with title, message, type, etc.
      const message = messageOrOptions.title 
        ? `${messageOrOptions.title}: ${messageOrOptions.message}`
        : messageOrOptions.message;
      
      setToast({
        message,
        visible: true,
        type: messageOrOptions.type || 'success'
      });
      
      // If duration is provided, set custom timeout
      if (messageOrOptions.duration && messageOrOptions.duration > 0) {
        setTimeout(() => {
          setToast(prev => ({ ...prev, visible: false }));
        }, messageOrOptions.duration);
      }
    }
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
