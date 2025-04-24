import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FilmIcon, SparklesIcon, ArrowRightIcon, UserGroupIcon, LightBulbIcon, ShieldCheckIcon, AdjustmentsHorizontalIcon, HeartIcon, ClockIcon, RocketLaunchIcon } from '@heroicons/react/24/solid';
import { StarIcon, FilmIcon as FilmOutlineIcon } from '@heroicons/react/24/outline';

const LandingPage = ({ onSignInClick }) => {
  // Track current testimonial for mobile slider
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const testimonials = [
    {
      name: "Early Access",
      avatar: "1",
      role: "What You Can Expect",
      color: "bg-gradient-to-br from-pink-600 to-rose-500",
      text: "Discover amazing films you would've never found scrolling endlessly through streaming services."
    },
    {
      name: "Personalized",
      avatar: "2",
      role: "How It Will Feel",
      color: "bg-gradient-to-br from-indigo-600 to-blue-500",
      text: "Like having a friend who knows your taste perfectly and only suggests movies you'll love."
    },
    {
      name: "Time-Saving",
      avatar: "3",
      role: "The Difference",
      color: "bg-gradient-to-br from-teal-600 to-emerald-500",
      text: "Spend less time choosing what to watch and more time enjoying great films that match your taste."
    }
  ];

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

  const nextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12"
    >
      {/* Hero Section */}
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 mb-16 md:mb-24">
        {/* Decorative background elements */}
        <div className="absolute -z-10 top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute -z-10 bottom-0 left-10 w-72 h-72 bg-gradient-to-tr from-blue-900/30 to-cyan-900/30 rounded-full blur-3xl opacity-60"></div>
        
        <motion.div
          className="flex-1 text-center md:text-left z-10" 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="inline-block px-3 py-1.5 mb-4 md:mb-6 text-xs font-semibold text-indigo-100 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-full shadow-sm">
            <span className="animate-pulse inline-block h-2 w-2 rounded-full bg-indigo-400 mr-2"></span>
            Coming Soon - Early Access Available
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Stop Watching <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">Disappointing Films</span> Forever
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 mb-6 max-w-lg mx-auto md:mx-0"> 
            Our AI learns your specific taste to recommend only movies you'll genuinely enjoy — save time and never waste an evening on the wrong film again.
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start space-x-1 sm:space-x-2 mb-8">
            <div className="flex items-center">
              <RocketLaunchIcon className="h-5 w-5 text-indigo-400 mr-2" />
              <p className="text-sm md:text-base"><span className="font-semibold text-indigo-300">Be among the first</span> <span className="text-gray-400">to experience personalized movie recommendations</span></p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 mb-2">
            <motion.button
              onClick={onSignInClick}
              className="group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3.5 rounded-lg font-medium text-lg flex items-center justify-center space-x-2 transform transition-all duration-300 shadow-lg shadow-indigo-900/30 w-full sm:w-auto" 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Join Early Access</span>
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-4 w-4 text-indigo-400" />
              <p className="text-xs text-gray-400">2-minute setup • No credit card</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center md:justify-start mt-6 text-xs">
            <div className="px-2 py-1 bg-indigo-900/40 rounded-md text-indigo-300">
              <span className="font-medium">Limited Early Access</span> - Sign up now to reserve your spot
            </div>
          </div>
        </motion.div>
        
        <motion.div
          className="flex-1 flex justify-center mt-10 md:mt-0 z-10"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="relative h-72 w-72 md:h-96 md:w-96">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 opacity-20 blur-2xl"
            />
            
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="relative"
                initial={{ scale: 0.9 }}
                animate={{ 
                  scale: [0.9, 1, 0.9],
                  rotateY: [0, 10, 0, -10, 0],
                }}
                transition={{ 
                  duration: 12, 
                  repeat: Infinity, 
                  ease: "easeInOut"
                }}
              >
                {/* Movie cards floating effect */}
                <div className="relative h-64 w-64 md:h-80 md:w-80">
                  {/* Movie posters */}
                  <motion.div 
                    className="absolute -top-4 -left-8 rounded-lg overflow-hidden shadow-2xl"
                    animate={{ 
                      y: [0, -8, 0], 
                      rotate: [-2, 0, -2],
                      z: [0, 20, 0]
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="w-32 h-48 bg-gradient-to-b from-blue-600 to-indigo-800 rounded-lg flex items-center justify-center">
                      <FilmOutlineIcon className="h-12 w-12 text-white opacity-70" />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="absolute -bottom-4 -right-8 rounded-lg overflow-hidden shadow-2xl"
                    animate={{ 
                      y: [0, 8, 0], 
                      rotate: [3, 0, 3],
                      z: [0, 10, 0] 
                    }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  >
                    <div className="w-32 h-48 bg-gradient-to-b from-purple-600 to-pink-800 rounded-lg flex items-center justify-center">
                      <FilmOutlineIcon className="h-12 w-12 text-white opacity-70" />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="absolute top-12 right-0 rounded-lg overflow-hidden shadow-2xl z-20"
                    animate={{ 
                      y: [0, 5, 0], 
                      rotate: [0, 2, 0],
                      z: [0, 15, 0]
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  >
                    <div className="w-32 h-48 bg-gradient-to-b from-rose-600 to-red-800 rounded-lg flex items-center justify-center">
                      <FilmOutlineIcon className="h-12 w-12 text-white opacity-70" />
                    </div>
                  </motion.div>
                  
                  {/* Central icon */}
                  <motion.div 
                    className="absolute h-full w-full flex items-center justify-center"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="h-24 w-24 bg-indigo-900/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl">
                      <SparklesIcon className="h-12 w-12 text-indigo-300" />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Enhanced Value Proposition Bar (replaced social proof) */}
      <motion.div
        className="flex flex-col sm:flex-row flex-wrap justify-between items-center gap-4 sm:gap-8 mb-16 md:mb-24 py-6 px-6 md:px-8 bg-gradient-to-r from-gray-900/80 to-gray-800/80 rounded-xl text-center sm:text-left backdrop-blur-sm shadow-xl border border-gray-700/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-3">
          <SparklesIcon className="h-6 w-6 text-indigo-400" />
          <p className="text-sm sm:text-base text-white font-medium">
            Revolutionary AI-powered movie recommendation platform
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center sm:justify-end gap-4 md:gap-6">
          {[
            { label: "Movie Database", value: "Extensive", icon: <FilmIcon className="h-4 w-4 text-indigo-400 mr-1" /> },
            { label: "Time Saving", value: "Significant", icon: <ClockIcon className="h-4 w-4 text-purple-400 mr-1" /> },
            { label: "Personalization", value: "Advanced", icon: <AdjustmentsHorizontalIcon className="h-4 w-4 text-blue-400 mr-1" /> }
          ].map((feature, index) => (
            <div key={index} className="text-center">
              <p className="text-sm sm:text-base font-bold text-white flex items-center justify-center">
                {feature.icon} {feature.value}
              </p>
              <p className="text-xs text-gray-400">{feature.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* How It Works - Enhanced with more visual appeal */}
      <motion.div
        className="mb-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={containerVariants}
      >
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">How</span> It Works
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto text-base md:text-lg">
            Three simple steps to transform your watching experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {[

            {
              icon: <AdjustmentsHorizontalIcon className="h-8 w-8 text-white" />,
              color: "from-blue-600 to-cyan-600",
              title: "1. Share Your Taste",
              description: "Quick questions about what you love, hate, and want to discover."
            },
            {
              icon: <LightBulbIcon className="h-8 w-8 text-white" />,
              color: "from-purple-600 to-pink-600",
              title: "2. AI Works Its Magic",
              description: "Our algorithm finds perfect matches based on your unique taste profile."
            },
            {
              icon: <HeartIcon className="h-8 w-8 text-white" />,
              color: "from-rose-600 to-red-600",
              title: "3. Love What You Watch",
              description: "Discover films that resonate with you personally, not just what's trending."
            }
          ].map((step, index) => (
            <motion.div
              key={index}
              className="relative rounded-xl overflow-hidden h-full group"
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-90 group-hover:opacity-100 transition-opacity duration-300`}></div>
              <div className="relative p-8 text-center h-full flex flex-col">
                <div className="bg-white/20 rounded-xl p-4 inline-flex mx-auto mb-6 transform group-hover:scale-110 transition-transform duration-300">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:scale-105 transition-transform duration-300">
                  {step.title}
                </h3>
                <p className="text-white/90 flex-grow">
                  {step.description}
                </p>
                <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium text-white flex justify-center">
                  <span className="flex items-center">
                    Learn more <ArrowRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Expanded Preferences Guide - More visual */}
      <motion.div
        className="mb-24 rounded-2xl overflow-hidden relative"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={containerVariants}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-indigo-900/50 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54062.jpg')] opacity-20 mix-blend-overlay"></div>
        
        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col lg:flex-row gap-8 md:gap-12 items-center">
            <div className="flex-1">
              <motion.h2 variants={itemVariants} className="text-2xl md:text-3xl font-bold text-white mb-6">
                Get Perfect Recommendations <span className="block text-sm font-normal text-indigo-300 mt-1">The More We Know, The Better We Match</span>
              </motion.h2>
              
              <motion.p variants={itemVariants} className="text-gray-300 mb-8 text-base md:text-lg">
                Our AI needs your honest preferences to work its magic. Here's how to get recommendations that feel hand-picked just for you:
              </motion.p>

              <motion.ul
                variants={containerVariants}
                className="space-y-4"
              >
                {[

                  { 
                    icon: "🎯", 
                    title: "Be Authentic", 
                    text: "Tell us what you truly enjoy, not what you think sounds impressive" 
                  },
                  { 
                    icon: "🔎", 
                    title: "Be Specific", 
                    text: "The details matter - include eras, moods and storytelling styles you love" 
                  },
                  { 
                    icon: "⚖️", 
                    title: "Include Variety", 
                    text: "Mix mainstream favorites with guilty pleasures for balanced results" 
                  },
                  { 
                    icon: "🔄", 
                    title: "Keep Updating", 
                    text: "Rate what you watch to continuously improve your recommendations" 
                  },
                ].map((tip, index) => (
                  <motion.li key={index} variants={itemVariants} className="flex items-start">
                    <span className="text-xl mt-1 mr-3">{tip.icon}</span>
                    <div>
                      <h4 className="font-semibold text-white">{tip.title}</h4>
                      <p className="text-gray-300 text-sm md:text-base">{tip.text}</p>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
              
              <motion.div 
                variants={itemVariants}
                className="mt-8 inline-block"
              >
                <button 
                  onClick={onSignInClick}
                  className="text-indigo-300 hover:text-indigo-200 font-medium flex items-center space-x-2 group"
                >
                  <span>Create your taste profile now</span>
                  <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            </div>
            
            <motion.div
              variants={itemVariants}
              className="lg:w-2/5 w-full"
            >
              <div className="bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-indigo-900/50 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Your Taste Profile</h3>
                  <span className="text-xs font-medium px-2 py-1 bg-indigo-900/50 rounded-full text-indigo-300">Premium</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-xs uppercase tracking-wider text-gray-400">Genres You Love</h4>
                      <span className="text-xs text-indigo-400">85% Match</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["Sci-Fi", "Psychological Thriller", "Dark Comedy", "Neo-Noir"].map(genre => (
                        <span key={genre} className="px-2.5 py-1 bg-indigo-900/70 rounded-full text-xs text-indigo-200 font-medium">{genre}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-xs uppercase tracking-wider text-gray-400">Vibes & Moods</h4>
                      <span className="text-xs text-purple-400">92% Match</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["Mind-bending", "Atmospheric", "Thought-provoking", "Tense"].map(mood => (
                        <span key={mood} className="px-2.5 py-1 bg-purple-900/70 rounded-full text-xs text-purple-200 font-medium">{mood}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-xs uppercase tracking-wider text-gray-400">Storytelling Preferences</h4>
                      <span className="text-xs text-blue-400">78% Match</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 bg-blue-900/70 rounded-full text-xs text-blue-200 font-medium">Complex Narratives</span>
                      <span className="px-2.5 py-1 bg-blue-900/70 rounded-full text-xs text-blue-200 font-medium">Moral Ambiguity</span>
                      <span className="px-2.5 py-1 bg-blue-900/70 rounded-full text-xs text-blue-200 font-medium">Strong Character Arcs</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 mt-3 border-t border-gray-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Your Taste Compatibility:</span>
                      <span className="text-indigo-300 font-medium">97%</span>
                    </div>
                    <div className="w-full bg-gray-700/30 h-1.5 rounded-full mt-2">
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full" style={{width: '97%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Features Section - More benefit-focused */}
      <motion.div
        className="mb-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={containerVariants}
      >
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Why</span> You'll Love Us
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto text-base md:text-lg">
            Discover what sets our recommendations apart from the rest
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <motion.div 
            className="bg-gray-800/80 backdrop-blur-sm p-6 md:p-8 rounded-xl shadow-lg border border-gray-700/50 hover:border-indigo-700/50 transition-colors group" 
            variants={itemVariants} 
            whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.5), 0 8px 10px -6px rgba(99, 102, 241, 0.2)' }}
          >
            <div className="bg-gradient-to-br from-indigo-600 to-blue-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <SparklesIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">Beyond Algorithms</h3>
            <p className="text-gray-300 text-sm md:text-base group-hover:text-gray-200 transition-colors">
              Our AI understands the <span className="font-medium text-indigo-300">emotional impact</span> you're looking for, not just basic genre matching. It's like having a film expert who knows you personally.
            </p>
          </motion.div>

          <motion.div 
            className="bg-gray-800/80 backdrop-blur-sm p-6 md:p-8 rounded-xl shadow-lg border border-gray-700/50 hover:border-purple-700/50 transition-colors group" 
            variants={itemVariants} 
            whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(168, 85, 247, 0.5), 0 8px 10px -6px rgba(168, 85, 247, 0.2)' }}
          >
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FilmIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">Discover Hidden Gems</h3>
            <p className="text-gray-300 text-sm md:text-base group-hover:text-gray-200 transition-colors">
              Unearth <span className="font-medium text-purple-300">exceptional films</span> that perfectly match your taste but never made it to the mainstream algorithms. No more scrolling past the same recommendations.
            </p>
          </motion.div>

          <motion.div 
            className="bg-gray-800/80 backdrop-blur-sm p-6 md:p-8 rounded-xl shadow-lg border border-gray-700/50 hover:border-blue-700/50 transition-colors group" 
            variants={itemVariants} 
            whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5), 0 8px 10px -6px rgba(59, 130, 246, 0.2)' }}
          >
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheckIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">Private & Transparent</h3>
            <p className="text-gray-300 text-sm md:text-base group-hover:text-gray-200 transition-colors">
              Your data is <span className="font-medium text-blue-300">never sold</span> or shared. We clearly explain why each film is recommended, so you understand the match—not a black box algorithm.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Modified Testimonials - Now Early Access Preview */}
      <motion.div
        className="mb-24 relative"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={containerVariants}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-3xl transform scale-95 blur-3xl -z-10"></div>
        
        <motion.div variants={itemVariants} className="text-center mb-12">
          <span className="block text-sm font-medium text-indigo-400 mb-2">WHAT TO EXPECT</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            The Experience
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto text-base">
            Here's what you can look forward to as an early user
          </p>
        </motion.div>

        {/* Desktop Experience Cards */}
        <div className="hidden md:grid grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 flex flex-col h-full"
              variants={itemVariants}
              whileHover={{ y: -5, backgroundColor: 'rgba(31, 41, 55, 0.9)' }}
            >
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 rounded-xl ${testimonial.color} flex items-center justify-center text-white font-bold text-lg mr-4 shadow-lg`}>
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-xs text-gray-400">{testimonial.role}</div>
                </div>
              </div>
              
              <div className="mb-4">
                <StarIcon className="inline-block h-5 w-5 text-indigo-400" />
                <StarIcon className="inline-block h-5 w-5 text-indigo-400" />
                <StarIcon className="inline-block h-5 w-5 text-indigo-400" />
                <StarIcon className="inline-block h-5 w-5 text-indigo-400" />
                <StarIcon className="inline-block h-5 w-5 text-indigo-400" />
              </div>
              
              <p className="text-gray-300 text-sm md:text-base flex-grow">"{testimonial.text}"</p>
              
              <div className="mt-4 pt-4 border-t border-gray-700/50 text-xs text-indigo-300">
                Get early access today
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile Experience Slider */}
        <div className="md:hidden relative">
          <div className="overflow-hidden px-4">
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTestimonial}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 flex flex-col"
                >
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-xl ${testimonials[activeTestimonial].color} flex items-center justify-center text-white font-bold text-lg mr-4 shadow-lg`}>
                      {testimonials[activeTestimonial].avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{testimonials[activeTestimonial].name}</div>
                      <div className="text-xs text-gray-400">{testimonials[activeTestimonial].role}</div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <StarIcon className="inline-block h-5 w-5 text-indigo-400" />
                    <StarIcon className="inline-block h-5 w-5 text-indigo-400" />
                    <StarIcon className="inline-block h-5 w-5 text-indigo-400" />
                    <StarIcon className="inline-block h-5 w-5 text-indigo-400" />
                    <StarIcon className="inline-block h-5 w-5 text-indigo-400" />
                  </div>
                  
                  <p className="text-gray-300 text-base">{testimonials[activeTestimonial].text}</p>
                </motion.div>
              </AnimatePresence>
              
              <div className="flex justify-center space-x-2 mt-6">
                {testimonials.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTestimonial(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${idx === activeTestimonial ? 'bg-indigo-500' : 'bg-gray-600'}`}
                    aria-label={`View experience ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced CTA Section - Modified for early access */}
      <motion.div
        className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden shadow-2xl border border-indigo-800/50"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl"
            animate={{
              x: [0, 30, -20, 0],
              y: [0, -30, 20, 0],
              scale: [1, 1.2, 0.8, 1]
            }}
            transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl"
            animate={{
              x: [0, -30, 20, 0],
              y: [0, 30, -20, 0],
              scale: [1, 1.2, 0.8, 1]
            }}
            transition={{ repeat: Infinity, duration: 15, ease: "easeInOut", delay: 5 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.1, 1]
            }}
            transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
          />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="inline-block px-3 py-1 text-xs font-semibold text-white bg-white/10 rounded-full mb-4">
              <RocketLaunchIcon className="h-4 w-4 inline mr-1" /> Early Access Launch
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Your Perfect Movie Night is <span className="text-indigo-300">Waiting</span>
            </h2>
            <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
              No more wasted evenings on disappointing films. Be one of the first to experience our personalized recommendation engine.
            </p>
          </motion.div>
          
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              onClick={onSignInClick}
              className="bg-white text-indigo-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-50 transition-colors shadow-xl group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Early Access
              <span className="block text-xs font-normal text-indigo-600 mt-1">2-minute setup • Priority access</span>
            </motion.button>
            
            <div className="px-4 py-2 bg-white/10 rounded-lg">
              <div className="flex items-center justify-center">
                <LightBulbIcon className="h-5 w-5 text-yellow-400 mr-2" />
                <div className="text-sm text-white">
                  <span className="font-medium">Limited spots available</span> for beta testers
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.p 
            className="mt-6 text-sm text-indigo-200/80"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Early users will receive exclusive features and priority support
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LandingPage;
