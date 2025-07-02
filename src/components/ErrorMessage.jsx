import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const ErrorMessage = ({ error, isVisible }) => (
  <AnimatePresence>
    {isVisible && error && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-red-500 text-center text-lg bg-red-50 px-4 py-2 rounded-full shadow-sm z-50"
      >
        {error}
      </motion.div>
    )}
  </AnimatePresence>
);