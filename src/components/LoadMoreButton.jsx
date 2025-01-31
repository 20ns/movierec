import React from 'react'; // Add this import
import { motion, AnimatePresence } from 'framer-motion';

export const LoadMoreButton = ({ show, onClick }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex justify-center pb-8"
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="px-6 py-2 text-base bg-indigo-500 text-white font-semibold rounded-full hover:bg-indigo-600 transition-colors duration-300 shadow-md"
          onClick={onClick}
        >
          Show More
        </motion.button>
      </motion.div>
    )}
  </AnimatePresence>
);