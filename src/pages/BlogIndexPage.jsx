import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarIcon, ArrowRightIcon, NewspaperIcon, PhotoIcon } from '@heroicons/react/24/outline';

const initialPosts = [
  {
    slug: 'indie-sci-fi-gems-2020s',
    title: 'Beyond the Blockbusters: Indie Sci-Fi Gems You Missed in the 2020s',
    date: 'May 11, 2025',
    excerpt: "The 2020s have already offered a fascinating landscape for science fiction, and it's not all about the big-budget spectacles. Independent filmmakers are consistently delivering thought-provoking, unique, and often mind-bending sci-fi stories that deserve your attention.",
    readTime: '6 min read',
    category: 'Indie Films',
    imageUrl: 'backdrop_tmdbid:893030',
    altText: 'Something in the Dirt Still'
  },
  {
    slug: 'new-wave-international-horror',
    title: 'The New Wave of International Horror: 5 Must-See Foreign Films Redefining Scary',
    date: 'May 11, 2025',
    excerpt: "Horror knows no borders, and some of the most innovative, terrifying, and thought-provoking scary movies are coming from outside the English-speaking world. International filmmakers are pushing the genre in bold new directions...",
    readTime: '7 min read',
    category: 'Horror',
    imageUrl: 'backdrop_tmdbid:866529',
    altText: 'Incantation Still'
  },
  {
    slug: 'video-game-adaptations-got-good',
    title: 'From Pixels to Prestige: How Video Game Adaptations Finally Got Good',
    date: 'May 11, 2025',
    excerpt: "For decades, 'video game movie' was almost a punchline... A new era of video game adaptations is upon us, with creators finally cracking the code to translate beloved interactive experiences into compelling television and film.",
    readTime: '6 min read',
    category: 'Adaptations',
    imageUrl: 'backdrop_tmdbid:100088',
    altText: 'The Last of Us Still'
  },
  {
    slug: 'tv-anti-heroes-we-love',
    title: "The Rise of the Anti-Hero: Why We Love TV's Most Complicated Characters",
    date: 'May 11, 2025',
    excerpt: "Gone are the days when television protagonists were purely virtuous. Today, some of the most compelling and popular characters on TV are anti-heroes: flawed individuals who often operate in morally grey areas...",
    readTime: '7 min read',
    category: 'TV Shows',
    imageUrl: 'backdrop_tmdbid:1398',
    altText: 'The Sopranos Still'
  },
  {
    slug: 'anthology-series-comeback',
    title: 'Short & Sweet: Anthology Series Making a Big Comeback',
    date: 'May 11, 2025',
    excerpt: "In an age of sprawling cinematic universes and multi-season character arcs, there's a refreshing appeal to the anthology series. Offering self-contained stories within each episode or season...",
    readTime: '6 min read',
    category: 'TV Shows',
    imageUrl: 'backdrop_tmdbid:42009',
    altText: 'Black Mirror Still'
  },
  {
    slug: 'highest-grossing-movies',
    title: 'Box Office Kings: Unveiling the Highest-Grossing Movies Ever Made',
    date: 'May 6, 2025',
    excerpt: 'Dive into the list of the highest-grossing films of all time, exploring the magic behind their monumental success...',
    readTime: '5 min read',
    category: 'Analysis',
    imageUrl: 'backdrop_tmdbid:19995',
    altText: 'Avatar movie poster'
  },
  {
    slug: 'top-5-sci-fi-movies-last-decade',
    title: 'Top 5 Sci-Fi Movies of the Last Decade (2015-2024)',
    date: 'May 6, 2025',
    excerpt: 'Explore the best science fiction films from 2015-2024, featuring mind-bending concepts and stunning visuals.',
    readTime: '6 min read',
    category: 'Top Lists',
    imageUrl: 'backdrop_tmdbid:438631',
    altText: 'Sci-Fi Collage'
  },
  {
    slug: 'animated-movies-for-adults',
    title: 'Beyond Cartoons: Animated Movies That Adults Will Love',
    date: 'May 6, 2025',
    excerpt: 'Discover animated films with complex themes and sophisticated storytelling that captivate adult audiences.',
    readTime: '7 min read',
    category: 'Recommendations',
    imageUrl: 'backdrop_tmdbid:129',
    altText: 'Spirited Away Scene'
  },
  {
    slug: 'hidden-gem-tv-shows',
    title: 'Binge-Worthy Finds: Hidden Gem TV Shows You Might Have Missed',
    date: 'May 6, 2025',
    excerpt: 'Explore brilliant but underrated TV series that slipped under the radar, offering fresh and unique viewing experiences.',
    readTime: '8 min read',
    category: 'Recommendations',
    imageUrl: 'backdrop_tmdbtvid:63174',
    altText: 'Person watching TV in a cozy room'
  }
  // Add more posts as they are created
];

const placeholderImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

// Simplified Image Component for Blog Index
const BlogCardImage = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(placeholderImage);

  useEffect(() => {
    const fetchImage = async () => {
      if (!src) {
        setImgSrc(placeholderImage);
        return;
      }

      let explicitId = null;
      let explicitIsMovie = null;
      let isBackdropRequest = false;

      if (src.startsWith('backdrop_tmdbid:')) {
        explicitId = src.substring('backdrop_tmdbid:'.length);
        explicitIsMovie = true;
        isBackdropRequest = true;
      } else if (src.startsWith('backdrop_tmdbtvid:')) {
        explicitId = src.substring('backdrop_tmdbtvid:'.length);
        explicitIsMovie = false;
        isBackdropRequest = true;
      } else if (src.startsWith('tmdbid:')) { // Though primarily for backdrops, good to have
        explicitId = src.substring('tmdbid:'.length);
        explicitIsMovie = true;
      } else if (src.startsWith('tmdbtvid:')) {
        explicitId = src.substring('tmdbtvid:'.length);
        explicitIsMovie = false;
      }


      if (explicitId) {
        try {
          // Attempt Fanart first (optional, could simplify to TMDB only for index page)
          // For simplicity on index page, we'll prioritize TMDB directly for backdrops
          const tmdbApiUrl = `https://api.themoviedb.org/3/${explicitIsMovie ? 'movie' : 'tv'}/${explicitId}?api_key=${process.env.REACT_APP_TMDB_API_KEY}`;
          const tmdbRes = await fetch(tmdbApiUrl);
          if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            const imagePath = isBackdropRequest ? tmdbData.backdrop_path : tmdbData.poster_path;
            if (imagePath) {
              // Using a smaller image size for index page cards, e.g., w780
              const fullTmdbUrl = `https://image.tmdb.org/t/p/w780${imagePath}`;
              setImgSrc(fullTmdbUrl);
              return;
            }
          }
        } catch (err) {
          console.warn(`[BlogCardImage] Error fetching image for ${src}:`, err);
        }
      }
      // Fallback if all else fails or if src is not a special ID format
      if (src && (src.startsWith('http:') || src.startsWith('https:'))) {
        setImgSrc(src);
      } else {
        setImgSrc(placeholderImage);
      }
    };

    fetchImage();
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderImage; }}
    />
  );
};


function BlogIndexPage() {
  const [posts, setPosts] = useState(initialPosts); // Manage posts in state if they might change
  const [hoveredCard, setHoveredCard] = useState(null);

  const featuredPost = posts.length > 0 ? posts[0] : null;
  const remainingPosts = posts.length > 0 ? posts.slice(1) : [];

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
      className="min-h-screen py-12 md:py-16 px-4 relative z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16 md:mb-20"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-5 shadow-lg">
            <NewspaperIcon className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-4">
            MovieRec Blog
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto">
            Discover insights about our platform, upcoming features, and movie recommendation tips.
          </p>
        </motion.div>
  
        {/* Featured Post */}
        {featuredPost && (
          <motion.section
            className="mb-16 md:mb-20"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold text-white mb-8 text-center sm:text-left">Latest Insights</h2>
            <Link
              to={`/blog/${featuredPost.slug}`}
              className="block group"
              onMouseEnter={() => setHoveredCard(featuredPost.slug)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <motion.div
                className="bg-gray-800 rounded-xl border border-gray-700/80 shadow-xl hover:shadow-indigo-500/50 transition-all duration-300 overflow-hidden flex flex-col md:flex-row"
                whileHover={{ y: -5, borderColor: 'rgba(129, 140, 248, 0.7)' }} // indigo-300 with opacity
              >
                <div className="md:w-1/2 lg:w-3/5 h-64 md:h-auto bg-gray-700 flex items-center justify-center rounded-t-xl md:rounded-l-xl md:rounded-tr-none overflow-hidden">
                  {featuredPost.imageUrl ? (
                    <BlogCardImage
                      src={featuredPost.imageUrl}
                      alt={featuredPost.altText || featuredPost.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <PhotoIcon className="w-24 h-24 text-gray-500" />
                  )}
                </div>
                <div className="p-6 md:p-8 flex flex-col justify-between md:w-1/2 lg:w-2/5">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 text-xs font-medium bg-indigo-600/80 text-indigo-100 rounded-full">
                        {featuredPost.category}
                      </span>
                      <div className="flex items-center text-gray-400 text-xs">
                        <CalendarIcon className="h-4 w-4 mr-1.5" />
                        <span>{featuredPost.date}</span>
                      </div>
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-3 line-clamp-3 group-hover:text-indigo-300 transition-colors">
                      {featuredPost.title}
                    </h3>
                    <p className="text-gray-300 mb-5 line-clamp-4">
                      {featuredPost.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-gray-400">{featuredPost.readTime}</span>
                    <span className="inline-flex items-center text-sm text-indigo-400 group-hover:text-indigo-300 font-semibold">
                      Read more
                      <motion.span
                        animate={{ x: hoveredCard === featuredPost.slug ? 5 : 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <ArrowRightIcon className="h-4.5 w-4.5 ml-2" />
                      </motion.span>
                    </span>
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.section>
        )}
  
        {/* Remaining Blog Posts Grid */}
        {remainingPosts.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-white mb-8 text-center sm:text-left">
              {featuredPost ? 'More Articles' : 'All Articles'}
            </h2>
            <motion.div
              className="grid gap-8 md:grid-cols-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: featuredPost ? 0.3 : 0.2 }}
            >
              {remainingPosts.map((post) => (
                <motion.div
                  key={post.slug}
                  variants={itemVariants}
                  onMouseEnter={() => setHoveredCard(post.slug)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <Link to={`/blog/${post.slug}`} className="block h-full group">
                    <motion.div
                      className="bg-gray-800 rounded-xl border border-gray-700/80 shadow-lg hover:shadow-indigo-500/40 transition-all duration-300 flex flex-col h-full overflow-hidden"
                      whileHover={{ y: -5, borderColor: 'rgba(165, 180, 252, 0.7)' }} // indigo-300 with opacity
                    >
                      <div className="h-48 bg-gray-700 flex items-center justify-center rounded-t-xl overflow-hidden">
                        {post.imageUrl ? (
                          <BlogCardImage
                            src={post.imageUrl}
                            alt={post.altText || post.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <PhotoIcon className="w-16 h-16 text-gray-500" />
                        )}
                      </div>
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-3 py-1 text-xs font-medium bg-indigo-700/70 text-indigo-200 rounded-full">
                            {post.category}
                          </span>
                          <div className="flex items-center text-gray-400 text-xs">
                            <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                            <span>{post.date}</span>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-indigo-300 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-gray-400 mb-4 line-clamp-3 flex-grow">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-xs text-gray-400">{post.readTime}</span>
                          <span className="inline-flex items-center text-sm text-indigo-400 group-hover:text-indigo-300 font-medium">
                            Read more
                            <motion.span
                              animate={{ x: hoveredCard === post.slug ? 4 : 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
          </section>
        )}
  
        {/* No Posts Message */}
        {posts.length === 0 && (
          <motion.div
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