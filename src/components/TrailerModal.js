import React from 'react';
import { motion } from 'framer-motion';

const TrailerModal = ({ trailerKey, onClose }) => {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } }}
      exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } }}
    >
      <motion.div
        className="bg-white p-4 rounded-lg shadow-lg relative"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1, transition: { duration: 0.3, ease: "easeInOut" } }}
        exit={{ scale: 0.8, transition: { duration: 0.3, ease: "easeInOut" } }}
      >
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
          onClick={onClose}
        >
          &times;
        </button>
        <iframe
          width="560"
          height="315"
          src={`https://www.youtube.com/embed/${trailerKey}`}
          title="Trailer"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </motion.div>
    </motion.div>
  );
};

export default TrailerModal;
