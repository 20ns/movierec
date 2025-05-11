import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarIcon, ArrowRightIcon, NewspaperIcon } from '@heroicons/react/24/outline';

const posts = [
  {
    slug: 'indie-sci-fi-gems-2020s',
    title: 'Beyond the Blockbusters: Indie Sci-Fi Gems You Missed in the 2020s',
    date: 'May 11, 2025',
    excerpt: "The 2020s have already offered a fascinating landscape for science fiction, and it's not all about the big-budget spectacles. Independent filmmakers are consistently delivering thought-provoking, unique, and often mind-bending sci-fi stories that deserve your attention.",
    readTime: '6 min read',
    category: 'Indie Films'
  },
  {
    slug: 'new-wave-international-horror',
    title: 'The New Wave of International Horror: 5 Must-See Foreign Films Redefining Scary',
    date: 'May 11, 2025',
    excerpt: "Horror knows no borders, and some of the most innovative, terrifying, and thought-provoking scary movies are coming from outside the English-speaking world. International filmmakers are pushing the genre in bold new directions...",
    readTime: '7 min read',
    category: 'Horror'
  },
  {
    slug: 'video-game-adaptations-got-good',
    title: 'From Pixels to Prestige: How Video Game Adaptations Finally Got Good',
    date: 'May 11, 2025',
    excerpt: "For decades, 'video game movie' was almost a punchline... A new era of video game adaptations is upon us, with creators finally cracking the code to translate beloved interactive experiences into compelling television and film.",
    readTime: '6 min read',
    category: 'Adaptations'
  },
  {
    slug: 'tv-anti-heroes-we-love',
    title: "The Rise of the Anti-Hero: Why We Love TV's Most Complicated Characters",
    date: 'May 11, 2025',
    excerpt: "Gone are the days when television protagonists were purely virtuous. Today, some of the most compelling and popular characters on TV are anti-heroes: flawed individuals who often operate in morally grey areas...",
    readTime: '7 min read',
    category: 'TV Shows'
  },
  {
    slug: 'anthology-series-comeback',
    title: 'Short & Sweet: Anthology Series Making a Big Comeback',
    date: 'May 11, 2025',
    excerpt: "In an age of sprawling cinematic universes and multi-season character arcs, there's a refreshing appeal to the anthology series. Offering self-contained stories within each episode or season...",
    readTime: '6 min read',
    category: 'TV Shows'
  },
  {
    slug: 'highest-grossing-movies',
    title: 'Box Office Kings: Unveiling the Highest-Grossing Movies Ever Made',
    date: 'May 6, 2025',
    excerpt: 'Dive into the list of the highest-grossing films of all time, exploring the magic behind their monumental success...',
    readTime: '5 min read',
    category: 'Analysis'
  },
  {
    slug: 'top-5-sci-fi-movies-last-decade',
    title: 'Top 5 Sci-Fi Movies of the Last Decade (2015-2024)',
    date: 'May 6, 2025',
    excerpt: 'Explore the best science fiction films from 2015-2024, featuring mind-bending concepts and stunning visuals.',
    readTime: '6 min read',
    category: 'Top Lists'
  },
  {
    slug: 'animated-movies-for-adults',
    title: 'Beyond Cartoons: Animated Movies That Adults Will Love',
    date: 'May 6, 2025',
    excerpt: 'Discover animated films with complex themes and sophisticated storytelling that captivate adult audiences.',
    readTime: '7 min read',
    category: 'Recommendations'
  },
  {
    slug: 'hidden-gem-tv-shows',
    title: 'Binge-Worthy Finds: Hidden Gem TV Shows You Might Have Missed',
    date: 'May 6, 2025',
    excerpt: 'Explore brilliant but underrated TV series that slipped under the radar, offering fresh and unique viewing experiences.',
    readTime: '8 min read',
    category: 'Recommendations'
  }
  // Add more posts as they are created
];

function BlogIndexPage() {
  const [hoveredCard, setHoveredCard] = useState(null);

  // Animation variants
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
      className="min-h-screen py-12 px-4 relative z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center p-2 rounded-full bg-indigo-900/30 mb-4">
            <NewspaperIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">MovieRec Blog</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Discover insights about our platform, upcoming features, and movie recommendation tips
          </p>
        </motion.div>

        {/* Blog post grid */}
        {posts.length > 0 ? (
          <motion.div 
            className="grid gap-6 md:gap-8 md:grid-cols-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {posts.map((post) => (
              <motion.div 
                key={post.slug}
                variants={itemVariants}
                onMouseEnter={() => setHoveredCard(post.slug)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <Link
                  to={`/blog/${post.slug}`}
                  className="block h-full"
                >                  <motion.div 
                    className="bg-gray-800/70 backdrop-blur-md rounded-xl border border-gray-700/50 h-full overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
                    whileHover={{ y: -5, borderColor: 'rgba(129, 140, 248, 0.5)' }}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-3 py-1 text-xs font-medium bg-indigo-900/50 text-indigo-300 rounded-full">
                          {post.category}
                        </span>
                        <div className="flex items-center text-gray-400 text-xs">
                          <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                          <span>{post.date}</span>
                        </div>
                      </div>

                      <h2 className="text-xl md:text-2xl font-bold text-indigo-300 mb-3 line-clamp-2">
                        {post.title}
                      </h2>
                      
                      <p className="text-gray-300 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-xs text-gray-400">{post.readTime}</span>
                        <span className="inline-flex items-center text-sm text-indigo-400 font-medium group">
                          Read more 
                          <motion.span
                            animate={{ x: hoveredCard === post.slug ? 4 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ArrowRightIcon className="h-4 w-4 ml-1.5" />
                          </motion.span>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (          <motion.div 
            className="bg-gray-800/70 backdrop-blur-md rounded-xl border border-gray-700/50 p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-900/30 text-indigo-400">
              <NewspaperIcon className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
            <p className="text-gray-400">No blog posts yet, but we're working on some exciting content!</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default BlogIndexPage;