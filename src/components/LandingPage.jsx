import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRightIcon,
  ClockIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  CheckCircleIcon,
  UserIcon,
  BoltIcon,
  AcademicCapIcon, // Example for "Mood"
  ArchiveBoxIcon,  // Example for "Genre"
  SparklesIcon     // Example for "Curated"
} from '@heroicons/react/24/solid';

// Placeholder data - Adjusted for DARK THEME
const howItWorksSteps = [
  {
    id: 1,
    icon: AdjustmentsHorizontalIcon,
    title: "Share Your Taste",
    description: "Tell us a bit about movies you enjoy.",
    iconColor: "text-indigo-300", // Brighter for dark bg
    bgColor: "bg-gray-700", // Darker section bg
    gradient: "from-indigo-500 to-blue-500", // Icon container gradient
  },
  {
    id: 2,
    icon: EyeIcon,
    title: "Explore Visually",
    description: "Browse genres, moods, and curated picks.",
    iconColor: "text-purple-300",
    bgColor: "bg-gray-700",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: 3,
    icon: CheckCircleIcon,
    title: "Get Matched",
    description: "Receive recommendations you'll actually love.",
    iconColor: "text-rose-300",
    bgColor: "bg-gray-700",
    gradient: "from-rose-500 to-red-500",
  },
];

const visualExplorationItems = [
  { id: 1, name: "By Mood", description: "Find films that fit your current vibe.", icon: AcademicCapIcon, iconColor: "text-sky-300", cardBg: "bg-gray-800", placeholderBg: "bg-sky-700/30" },
  { id: 2, name: "Popular Genres", description: "Explore top categories and classics.", icon: ArchiveBoxIcon, iconColor: "text-amber-300", cardBg: "bg-gray-800", placeholderBg: "bg-amber-700/30" },
  { id: 3, name: "Curated For You", description: "Picks based on similar tastes.", icon: SparklesIcon, iconColor: "text-emerald-300", cardBg: "bg-gray-800", placeholderBg: "bg-emerald-700/30" },
];

const benefits = [
  { icon: ClockIcon, text: "Save Time Searching", iconColor: "text-indigo-300" },
  { icon: UserIcon, text: "Truly Personalized Picks", iconColor: "text-purple-300" },
  { icon: BoltIcon, text: "Easy 2-Minute Setup", iconColor: "text-rose-300" },
  { icon: ShieldCheckIcon, text: "No Credit Card Required", iconColor: "text-teal-300" },
];

const LandingPage = ({ onSignInClick, onSignUpClick }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
      variants={containerVariants}
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 text-white" // Removed explicit dark background
    >
      {/* 1. Hero Section */}
      <motion.section
        variants={itemVariants}
        className="text-center py-16 md:py-24 relative"
      >
        <div className="absolute -z-10 top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl">
          {/* Adjusted gradient for dark theme */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-purple-900/40 to-gray-900/30 rounded-full blur-3xl opacity-60 animate-pulse-slow"></div>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Discover Your Next Great Movie, Simply
        </h1>
        <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          Visually explore a world of films or let our smart recommendations guide you. Finding a movie you'll enjoy is now effortless.
        </p>
        <motion.button
          onClick={onSignUpClick}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg transform transition-all duration-300 hover:scale-105"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          Get Started Free
        </motion.button>
        <p className="text-sm text-gray-400 mt-4">
          Already have an account?{' '}
          <button onClick={onSignInClick} className="text-indigo-400 hover:text-indigo-300 underline font-medium">
            Sign In
          </button>
        </p>
      </motion.section>

      {/* 2. "How It Works" / "Start Your Journey" */}
      <motion.section variants={itemVariants} className="py-16 md:py-24">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Start Your Movie Journey
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto text-base md:text-lg">
            Three simple steps to personalized movie recommendations.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {howItWorksSteps.map((step) => (
            <motion.div
              key={step.id}
              variants={itemVariants}
              className={`${step.bgColor} p-6 rounded-xl shadow-xl border border-gray-700/80 text-center hover:border-indigo-500/70 transition-colors duration-300`}
            >
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center mx-auto mb-6 shadow-md`}>
                <step.icon className={`h-8 w-8 text-white`} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-gray-400 text-sm">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 3. Visual Exploration Section */}
      <motion.section variants={itemVariants} className="py-16 md:py-24">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Explore Visually
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto text-base md:text-lg">
            Browse movies in a way that feels intuitive and fun.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {visualExplorationItems.map((item) => (
            <motion.div
              key={item.id}
              variants={itemVariants}
              className={`${item.cardBg} rounded-xl shadow-xl border border-gray-700/80 overflow-hidden group hover:shadow-indigo-500/40 transition-all duration-300`}
            >
              <div className={`w-full h-48 ${item.placeholderBg} flex items-center justify-center`}>
                <item.icon className={`h-16 w-16 ${item.iconColor} opacity-70`} />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-2">{item.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{item.description}</p>
                <button className="text-indigo-400 hover:text-indigo-300 font-medium text-sm flex items-center group-hover:text-indigo-200">
                  Explore Now <ArrowRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 4. Key Benefits / Trust Builders */}
      <motion.section variants={itemVariants} className="py-16 md:py-24 bg-gray-800/70 rounded-xl my-12">
        <div className="text-center mb-12 md:mb-16 px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Why You'll Love It
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto text-base md:text-lg">
            We focus on making movie discovery easy and enjoyable.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 px-6">
          {benefits.map((benefit, index) => (
            <motion.div key={index} variants={itemVariants} className="text-center">
              <div className={`w-14 h-14 bg-gradient-to-br ${howItWorksSteps[index % 3].gradient} rounded-full flex items-center justify-center mx-auto mb-4 shadow-md`}>
                <benefit.icon className={`h-7 w-7 text-white`} />
              </div>
              <p className="text-gray-200 font-medium">{benefit.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 5. Testimonials (Optional) - Placeholder for dark theme */}
      {/* 
      <motion.section variants={itemVariants} className="py-16 md:py-24">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Loved by Movie Watchers
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2].map(i => (
            <motion.div key={i} variants={itemVariants} className="bg-gray-800/70 p-6 rounded-xl shadow-xl border border-gray-700/80">
              <p className="text-gray-300 mb-4">"This made finding a movie so much easier! Highly recommend."</p>
              <p className="text-indigo-400 font-semibold">- Casual User {i}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>
      */}

      {/* 6. Final Call to Action */}
      <motion.section
        variants={itemVariants}
        className="py-16 md:py-24 text-center bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-700 rounded-2xl my-12 shadow-2xl"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Ready to Find Your Next Favorite Movie?
        </h2>
        <p className="text-lg text-indigo-100 mb-10 max-w-xl mx-auto">
          Join free today and transform your movie nights. Simple, fast, and personalized.
        </p>
        <motion.button
          onClick={onSignUpClick}
          className="bg-white text-indigo-700 px-10 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-50 transition-colors shadow-xl transform hover:scale-105"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          Create Your Free Profile
        </motion.button>
        <p className="text-sm text-indigo-200 mt-4">
          Takes just 2 minutes. No credit card required.
        </p>
      </motion.section>

    </motion.div>
  );
};

export default LandingPage;
