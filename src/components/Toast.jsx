import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, HeartIcon } from '@heroicons/react/24/solid';

const Toast = ({ message, isVisible, type = 'success', onClose }) => {
  useEffect(() => {
    // Add debug logging when visibility changes
    // console.log('Toast visibility changed:', isVisible, 'Message:', message); // Removed log
    
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto-dismiss after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, message, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-6 right-6 z-[100]"
        >
          <div className="flex items-center gap-3 bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg border-l-4 border-indigo-500 max-w-xs">
            {type === 'favorite' && (
              <HeartIcon className="w-5 h-5 text-red-400 flex-shrink-0 animate-pulse" />
            )}
            {type === 'success' && (
              <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{message}</p>
            <button 
              onClick={onClose} 
              className="ml-auto text-gray-400 hover:text-white"
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
