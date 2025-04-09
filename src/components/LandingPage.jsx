import React from 'react';
import { motion } from 'framer-motion';
import { FilmIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

const LandingPage = ({ onSignInClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto px-4 py-12"
    >
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
        <motion.div 
          className="flex-1"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Discover Movies <span className="text-indigo-400">Tailored Just for You</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-lg">
            Get personalized movie recommendations based on your unique preferences and tastes.
          </p>
          <motion.button
            onClick={onSignInClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium text-lg flex items-center space-x-2 transform transition-all duration-300"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Sign In to Start</span>
            <ArrowRightIcon className="w-5 h-5" />
          </motion.button>
        </motion.div>
        <motion.div
          className="flex-1 flex justify-center"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="relative h-64 w-64 md:h-80 md:w-80">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 opacity-20 blur-2xl"
            />
            <motion.div className="absolute inset-0 flex items-center justify-center">
              <FilmIcon className="h-32 w-32 text-indigo-400" />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, staggerChildren: 0.1 }}
      >
        <motion.div className="bg-gray-800 p-6 rounded-xl"
          whileHover={{ y: -5 }}
        >
          <div className="bg-indigo-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Personalized Recommendations</h3>
          <p className="text-gray-400">Get movie suggestions based on your unique preferences and viewing history.</p>
        </motion.div>
        <motion.div className="bg-gray-800 p-6 rounded-xl"
          whileHover={{ y: -5 }}
        >
          <div className="bg-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <FilmIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Vast Movie Collection</h3>
          <p className="text-gray-400">Explore thousands of movies across different genres, languages, and time periods.</p>
        </motion.div>
        <motion.div className="bg-gray-800 p-6 rounded-xl"
          whileHover={{ y: -5 }}
        >
          <div className="bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Save Your Favorites</h3>
          <p className="text-gray-400">Build and manage a collection of your favorite movies and shows.</p>
        </motion.div>
      </motion.div>

      {/* CTA Section */}
      <motion.div 
        className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl p-8 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to discover your next favorite movie?</h2>
        <p className="text-lg text-indigo-200 mb-6">Sign in now to start exploring personalized recommendations.</p>
        <motion.button
          onClick={onSignInClick}
          className="bg-white text-indigo-900 px-6 py-3 rounded-lg font-medium text-lg hover:bg-indigo-100 transition-colors"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          Get Started
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default LandingPage;
