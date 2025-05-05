import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarIcon, ArrowRightIcon, NewspaperIcon } from '@heroicons/react/24/outline';

const posts = [
  {
    slug: 'highest-grossing-movies',
    title: 'Box Office Kings: Unveiling the Highest-Grossing Movies Ever Made',
    date: 'May 6, 2025',
    excerpt: 'Dive into the list of the highest-grossing films of all time, exploring the magic behind their monumental success...',
    readTime: '5 min read',
    category: 'Analysis'
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