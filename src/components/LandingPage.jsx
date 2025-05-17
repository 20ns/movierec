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
  AcademicCapIcon,
  ArchiveBoxIcon,
  SparklesIcon,
  FilmIcon,
  NewspaperIcon,
  HeartIcon
} from '@heroicons/react/24/solid';

// Placeholder data - Adjusted for DARK THEME
const howItWorksSteps = [
  {
    id: 1,
    icon: AdjustmentsHorizontalIcon,
    title: "Share Your Taste",
    description: "Tell us a bit about movies you enjoy.",
    iconColor: "text-indigo-300",
    bgColor: "bg-gray-700",
    gradient: "from-indigo-500 to-blue-500", 
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
  { icon: BoltIcon, text: "Easy 30-Second Setup", iconColor: "text-rose-300" },
  { icon: ShieldCheckIcon, text: "No Credit Card Required", iconColor: "text-teal-300" },
];

const featuredMovies = [
  { id: 1, title: "Inception", year: "2010", genre: "Sci-Fi, Thriller", posterUrl: "https://www.themoviedb.org/t/p/w342/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg", description: "A mind-bending thriller about dream invasion that will leave you questioning reality." },
  { id: 2, title: "Parasite", year: "2019", genre: "Thriller, Drama", posterUrl: "https://www.themoviedb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", description: "A darkly comic masterpiece about class struggle and deception." },
  { id: 3, title: "Spirited Away", year: "2001", genre: "Animation, Fantasy", posterUrl: "https://www.themoviedb.org/t/p/w342/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg", description: "A breathtaking animated journey into a mysterious world of spirits." },
];

const latestBlogPosts = [
  { id: 1, title: "Top 5 Sci-Fi Movies of the Last Decade", date: "May 6, 2025", snippet: "The 2015-2024 period saw sci-fi cinema grapple with humanity's evolving relationship with technology, time, and consciousness...", link: "/blog/top-5-sci-fi-movies-last-decade", image: "https://www.themoviedb.org/t/p/w780/xJHokMbljvjADYdit5fK5VQsXEG.jpg" },
  { id: 2, title: "Hidden Gem TV Shows You Might Have Missed", date: "April 28, 2025", snippet: "Beyond the mainstream hits, a treasure trove of unique and compelling TV series awaits discovery...", link: "/blog/hidden-gem-tv-shows", image: "https://www.themoviedb.org/t/p/w780/56v2KjBlU4XaOv9rVYEQypROD7P.jpg" },
  { id: 3, title: "Animated Movies Aren't Just For Kids", date: "May 10, 2025", snippet: "Discover a world of sophisticated storytelling and stunning visuals in animation geared towards adult audiences...", link: "/blog/animated-movies-for-adults", image: "https://www.themoviedb.org/t/p/w780/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg", imagePosition: "object-bottom" },
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
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 text-white"
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

      {/* New: Our Mission Section */}
      <motion.section variants={itemVariants} className="py-16 md:py-24 text-center">
        <HeartIcon className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Mission</h2>
        <p className="text-gray-300 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
          At Movierec, we believe finding your next favorite film shouldn't feel like a chore. Our mission is to cut through the noise of endless streaming libraries and algorithm fatigue. We combine smart technology with a genuine passion for cinema to deliver personalized, insightful recommendations that connect you with movies and shows you'll truly love, making every movie night an adventure.
        </p>
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
                <button onClick={onSignUpClick} className="text-indigo-400 hover:text-indigo-300 font-medium text-sm flex items-center group-hover:text-indigo-200">
                  Explore Now <ArrowRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* New: Featured Recommendations Section */}
      <motion.section variants={itemVariants} className="py-16 md:py-24">
        <div className="text-center mb-12 md:mb-16">
          <FilmIcon className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Featured Recommendations
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto text-base md:text-lg">
            A glimpse into the diverse world of movies we help you discover.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {featuredMovies.map((movie) => (
            <motion.div
              key={movie.id}
              variants={itemVariants}
              className="bg-gray-800 p-5 rounded-xl shadow-xl border border-gray-700/80 group hover:border-purple-500/70 transition-all duration-300 flex flex-col"
            >
              <img src={movie.posterUrl} alt={movie.title} className="w-full h-72 object-cover rounded-lg mb-4 shadow-md" />
              <h3 className="text-xl font-semibold text-white mb-2">{movie.title} ({movie.year})</h3>
              <p className="text-purple-300 text-sm mb-2">{movie.genre}</p>
              <p className="text-gray-400 text-sm mb-4 flex-grow">{movie.description}</p>
              <button
                onClick={onSignUpClick} // Or a link to the movie details if available for guests
                className="mt-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm shadow-md hover:scale-105 transform transition-transform duration-300"
              >
                Learn More
              </button>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* New: Latest From The Blog Section */}
      <motion.section variants={itemVariants} className="py-16 md:py-24">
        <div className="text-center mb-12 md:mb-16">
          <NewspaperIcon className="w-10 h-10 text-teal-400 mx-auto mb-3" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Latest From Our Blog
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto text-base md:text-lg">
            Deeper dives, curated lists, and cinematic explorations.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {latestBlogPosts.map((post) => (
            <motion.div
              key={post.id}
              variants={itemVariants}
              className="bg-gray-800 rounded-xl shadow-xl border border-gray-700/80 group hover:border-teal-500/70 transition-all duration-300 flex flex-col overflow-hidden"
            >
              {post.image && <img src={post.image} alt={post.title} className={`w-full h-48 object-cover ${post.imagePosition || 'object-center'}`} />}
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-teal-300 transition-colors">{post.title}</h3>
                <p className="text-gray-500 text-xs mb-2">{post.date}</p>
                <p className="text-gray-400 text-sm mb-4 flex-grow">{post.snippet}</p>
                <a
                  href={post.link} // Assuming you have routing for blog posts
                  target="_blank" // Open in new tab if it's an external link or for now
                  rel="noopener noreferrer"
                  className="mt-auto text-teal-400 hover:text-teal-300 font-medium text-sm flex items-center group-hover:text-teal-200"
                >
                  Read More <ArrowRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </a>
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

      {/* 5. Final Call to Action */}
      <motion.section
        variants={itemVariants}
        className="py-20 md:py-28 text-center bg-gradient-to-br from-indigo-800 via-purple-800 to-pink-800 rounded-3xl my-16 shadow-2xl relative overflow-hidden"
      >
        {/* Optional: Add subtle decorative elements if desired */}
        <SparklesIcon className="w-16 h-16 text-yellow-300/80 mx-auto mb-4 opacity-75" />
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
          Stop Searching, Start Watching.
        </h2>
        <p className="text-lg text-indigo-200 mb-10 max-w-xl mx-auto">
          Say goodbye to endless scrolling. Get movie recommendations you'll actually love, in minutes.
        </p>
        <motion.button
          onClick={onSignUpClick}
          className="bg-white text-indigo-700 px-8 sm:px-12 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-indigo-100 transition-all duration-300 ease-in-out shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-opacity-50 w-full sm:w-auto max-w-xs sm:max-w-none"
          whileHover={{ scale: 1.05, boxShadow: "0px 10px 20px rgba(255, 255, 255, 0.2)" }}
          whileTap={{ scale: 0.98 }}
        >
          Find Your Next Favorite Movie
        </motion.button>
      </motion.section>

    </motion.div>
  );
};

export default LandingPage;
