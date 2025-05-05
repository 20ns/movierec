import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

// Custom renderer components for ReactMarkdown
const renderers = {
  img: ({ node, ...props }) => (
    // Return only the img tag directly to avoid invalid nesting within <p>
    <img
      {...props}
      // Apply styling directly, including margins previously on the div
      className="my-6 rounded-lg mx-auto shadow-lg max-w-full max-h-[600px] object-cover"
      loading="lazy"
    />
    // Caption logic removed temporarily to fix nesting
  ),
};

function BlogPostPage() {
  const { slug } = useParams();
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState({ title: '', date: '', readTime: '' });

  useEffect(() => {
    if (!slug) {
      setError('Blog post slug is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    // Fetch from the root, assuming 'public' is served there
    const filePath = `/blog/${slug}.md`;
fetch(filePath)
  .then(response => {
        if (!response.ok) {
          throw new Error(`Blog post not found at ${filePath}`);
        }
        return response.text();
      })
      .then(text => {
        setMarkdown(text);
        
        // Extract basic metadata from the markdown if available
        const titleMatch = text.match(/# (.*)/);
        const dateMatch = text.match(/Date: (.*)/);
        
        // Roughly estimate reading time (avg reading speed: 200 words/min)
        const wordCount = text.split(/\s+/).length;
        const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
        
        setMetadata({
          title: titleMatch ? titleMatch[1] : 'Blog Post',
          date: dateMatch ? dateMatch[1] : 'Recent',
          readTime: `${readTimeMinutes} min read`
        });
        
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching markdown:", err);
        setError(`Failed to load blog post: ${err.message}`);
        setLoading(false);
      });
  }, [slug]);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-t-indigo-500 border-gray-700 rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-indigo-300 font-medium">Loading post...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <motion.div 
        className="min-h-screen flex items-center justify-center relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-gray-800/70 backdrop-blur-md border border-red-800/50 rounded-xl p-8 shadow-xl max-w-md">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/30 text-red-400">
            <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white text-center mb-2">Error</h3>
          <p className="text-red-400 text-center">{error}</p>
          <div className="mt-6 text-center">
            <Link to="/blog" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center transition-colors">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div 
      className="min-h-screen py-12 px-4 relative z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link 
          to="/blog"
          className="inline-flex items-center text-indigo-400 hover:text-indigo-300 mb-6 group transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to all posts
        </Link>

        {/* Article container */}        <motion.article
          className="bg-gray-800/70 backdrop-blur-md rounded-xl shadow-xl border border-gray-700/50 overflow-hidden"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-gray-700/50 bg-gradient-to-r from-indigo-900/30 to-purple-900/30">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              {metadata.title}
            </h1>
            <div className="flex flex-wrap items-center text-sm text-gray-400 gap-4">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1.5 text-indigo-400" />
                <span>{metadata.date}</span>
              </div>
              <div className="flex items-center">
                <ClockIcon className="h-4 w-4 mr-1.5 text-indigo-400" />
                <span>{metadata.readTime}</span>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 sm:p-8">
            <div className="prose prose-invert prose-indigo max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderers}>
                {markdown}
              </ReactMarkdown>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-6 sm:p-8 border-t border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-800/30">
            <div className="flex justify-between items-center">
              <Link 
                to="/blog"
                className="inline-flex items-center text-indigo-400 hover:text-indigo-300 group transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to all posts
              </Link>
              
              <div className="flex items-center space-x-4">
                {/* You can add social sharing buttons here */}
              </div>
            </div>
          </div>
        </motion.article>
      </div>
    </motion.div>
  );
}

export default BlogPostPage;