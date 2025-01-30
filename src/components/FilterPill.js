import React from 'react';
import { motion } from 'framer-motion';

export const FilterPill = ({ active, children, onClick, icon }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={`flex items-center px-4 py-2 rounded-full border transition-all duration-300 ${
      active
        ? 'bg-indigo-500 border-indigo-600 text-white shadow-lg'
        : 'bg-white/80 border-indigo-100 text-indigo-500 hover:bg-indigo-50'
    }`}
  >
    {icon && React.cloneElement(icon, { className: `w-5 h-5 mr-2 ${active ? 'text-white' : 'text-indigo-400'}` })}
    <span className="text-sm font-medium">{children}</span>
  </motion.button>
);