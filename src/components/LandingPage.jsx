import React from 'react';
import { motion } from 'framer-motion';
import { FilmIcon, SparklesIcon, ArrowRightIcon, UserGroupIcon, LightBulbIcon, ShieldCheckIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/solid';
import { StarIcon } from '@heroicons/react/24/outline';

const LandingPage = ({ onSignInClick }) => {
  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12"
    >
      {/* Hero Section - Enhanced with stronger headline and FOMO */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
        <motion.div 
          className="flex-1"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="inline-block px-3 py-1 mb-6 text-xs font-semibold text-indigo-100 bg-indigo-900 bg-opacity-60 rounded-full">
            Discover movies you'll actually love
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            Never Waste Time on <span className="text-indigo-400">Bad Movies</span> Again
          </h1>
          
          <p className="text-xl text-gray-300 mb-6 max-w-lg">
            Our AI analyzes your unique taste to recommend movies you'll love – not what everyone else is watching.
          </p>
          
          <div className="flex items-center space-x-2 mb-8 text-gray-400">
            <UserGroupIcon className="h-5 w-5 text-indigo-400" />
            <p className="text-sm"><span className="font-semibold text-indigo-300">5,000+</span> movie lovers already discovered their perfect match</p>
          </div>
          
          <motion.button
            onClick={onSignInClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium text-lg flex items-center space-x-2 transform transition-all duration-300 shadow-lg shadow-indigo-900/30"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Try It Free</span>
            <ArrowRightIcon className="w-5 h-5" />
          </motion.button>
          
          <p className="mt-3 text-xs text-gray-400">No credit card required • Setup takes less than 2 minutes</p>
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
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Movie posters collage effect */}
              <motion.div 
                className="relative"
                animate={{ rotateY: [0, 5, 0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 6 }}
              >
                <div className="absolute -top-24 -left-20 w-40 h-56 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-lg shadow-xl transform rotate-[-15deg]" />
                <div className="absolute -top-12 -right-16 w-40 h-56 bg-gradient-to-br from-purple-600 to-pink-700 rounded-lg shadow-xl transform rotate-[10deg]" />
                <div className="absolute top-8 -left-24 w-40 h-56 bg-gradient-to-br from-red-600 to-orange-700 rounded-lg shadow-xl transform rotate-[-8deg]" />
                <FilmIcon className="h-32 w-32 text-indigo-400 z-10 relative" />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Social Proof Bar */}
      <motion.div 
        className="flex flex-wrap justify-center items-center gap-8 mb-20 py-4 px-6 bg-gray-800 bg-opacity-60 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {[...Array(5)].map((_, i) => (
          <StarIcon key={i} className="h-6 w-6 text-yellow-400 fill-yellow-400" />
        ))}
        <p className="text-white font-medium">
          "Transformed how I find movies to watch" - <span className="italic text-gray-300">Michael T.</span>
        </p>
      </motion.div>

      {/* How It Works - New Section */}
      <motion.div
        className="mb-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">Three simple steps to never watch a disappointing movie again</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <AdjustmentsHorizontalIcon className="h-8 w-8 text-white" />,
              color: "from-blue-600 to-cyan-600",
              title: "Tell us your taste",
              description: "Answer a few quick questions about what you enjoy watching"
            },
            {
              icon: <LightBulbIcon className="h-8 w-8 text-white" />,
              color: "from-purple-600 to-pink-600",
              title: "Our AI finds your matches",
              description: "We analyze thousands of movies to find ones you'll love"
            },
            {
              icon: <FilmIcon className="h-8 w-8 text-white" />,
              color: "from-orange-500 to-red-600",
              title: "Discover hidden gems",
              description: "Get personalized recommendations you won't find elsewhere"
            }
          ].map((step, index) => (
            <motion.div 
              key={index}
              className="relative rounded-xl overflow-hidden"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + (index * 0.1) }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-90`}></div>
              <div className="relative p-8 text-center">
                <div className="bg-white bg-opacity-20 rounded-full p-4 inline-flex mb-4">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-white text-opacity-90">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Preferences Guide - New Section */}
      <motion.div 
        className="mb-20 bg-gray-800 rounded-2xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Get the Most From Your Preferences</h2>
            <p className="text-gray-300 mb-6">
              Setting up your preferences correctly is the key to discovering movies you'll truly enjoy. Here's how to get started:
            </p>
            
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {[
                "Be honest about what you really enjoy, not what you think you should like",
                "Include both recent favorites and timeless classics you love",
                "Consider mood and atmosphere, not just genres",
                "Don't worry about 'guilty pleasures' – they help us understand your taste"
              ].map((tip, index) => (
                <motion.li key={index} variants={itemVariants} className="flex items-start space-x-2">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm mt-0.5">
                    {index + 1}
                  </div>
                  <span className="text-gray-300">{tip}</span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
          
          <div className="flex-1 md:flex-none md:w-1/3">
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Example preference profile:</div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Favorite genres</div>
                  <div className="flex flex-wrap gap-2">
                    {["Sci-Fi", "Thriller", "Drama"].map(genre => (
                      <span key={genre} className="px-2 py-1 bg-indigo-900 bg-opacity-50 rounded-md text-xs text-indigo-300">{genre}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Mood preferences</div>
                  <div className="flex flex-wrap gap-2">
                    {["Thought-provoking", "Suspenseful"].map(mood => (
                      <span key={mood} className="px-2 py-1 bg-purple-900 bg-opacity-50 rounded-md text-xs text-purple-300">{mood}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Era preferences</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-900 bg-opacity-50 rounded-md text-xs text-blue-300">Modern (1980-2010)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Features Section - Enhanced */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.0, staggerChildren: 0.1 }}
      >
        <motion.div className="bg-gray-800 p-6 rounded-xl shadow-lg"
          whileHover={{ y: -5 }}
        >
          <div className="bg-indigo-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Personalized Just For You</h3>
          <p className="text-gray-400">Our algorithm learns your taste, not just popular trends, to find movies you'll actually enjoy.</p>
        </motion.div>
        
        <motion.div className="bg-gray-800 p-6 rounded-xl shadow-lg"
          whileHover={{ y: -5 }}
        >
          <div className="bg-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <FilmIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Discover Hidden Gems</h3>
          <p className="text-gray-400">Find excellent films that flew under the radar but match your unique taste perfectly.</p>
        </motion.div>
        
        <motion.div className="bg-gray-800 p-6 rounded-xl shadow-lg"
          whileHover={{ y: -5 }}
        >
          <div className="bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Privacy Respected</h3>
          <p className="text-gray-400">Your taste profile is yours alone. We never sell your data or preferences to third parties.</p>
        </motion.div>
      </motion.div>

      {/* Testimonials - New Section */}
      <motion.div 
        className="mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">What Movie Lovers Say</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              name: "Sarah J.",
              avatar: "S",
              color: "bg-pink-700",
              text: "I was skeptical at first, but the recommendations are spot on! Found movies I would have never discovered otherwise."
            },
            {
              name: "David K.",
              avatar: "D",
              color: "bg-indigo-700",
              text: "No more scrolling endlessly through streaming services. I just check my recommendations and start watching."
            },
            {
              name: "Ling C.",
              avatar: "L",
              color: "bg-purple-700",
              text: "The preference questionnaire is actually fun to fill out, and the more I rate movies, the better it gets!"
            }
          ].map((testimonial, index) => (
            <motion.div 
              key={index}
              className="bg-gray-800 bg-opacity-50 p-5 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + (index * 0.1) }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center mb-4">
                <div className={`w-10 h-10 rounded-full ${testimonial.color} flex items-center justify-center text-white font-bold mr-3`}>
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-300 italic">"{testimonial.text}"</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA Section - Enhanced with FOMO */}
      <motion.div 
        className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl p-8 text-center relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.3 }}
      >
        {/* Background animated elements */}
        <motion.div 
          className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full opacity-20 blur-3xl"
          animate={{ 
            x: [0, 30, 0], 
            y: [0, -30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
        />
        
        <motion.div 
          className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full opacity-20 blur-3xl"
          animate={{ 
            x: [0, -30, 0], 
            y: [0, 30, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 2 }}
        />
        
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to stop wasting time on disappointing movies?</h2>
          <p className="text-lg text-indigo-200 mb-6 max-w-2xl mx-auto">
            Join today and discover films you'll want to tell everyone about. Setup takes less than 2 minutes!
          </p>
          <motion.button
            onClick={onSignInClick}
            className="bg-white text-indigo-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-100 transition-colors shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Start Free • No Credit Card Required
          </motion.button>
          <p className="mt-4 text-sm text-indigo-200 opacity-80">Already helping thousands of movie lovers find their next favorite film</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LandingPage;
