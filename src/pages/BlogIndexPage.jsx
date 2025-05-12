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

// Enhanced Image Component for Blog Index
const BlogCardImage = ({ src, alt, className, imageClassName }) => {
  const [imgSrc, setImgSrc] = useState(placeholderImage);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false); // Reset on src change
    const fetchImage = async () => {
      if (!src) {
        setImgSrc(placeholderImage);
        setIsLoaded(true);
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
      } else if (src.startsWith('tmdbid:')) {
        explicitId = src.substring('tmdbid:'.length);
        explicitIsMovie = true;
      } else if (src.startsWith('tmdbtvid:')) {
        explicitId = src.substring('tmdbtvid:'.length);
        explicitIsMovie = false;
      }

      if (explicitId) {
        try {
          const tmdbApiKey = process.env.REACT_APP_TMDB_API_KEY;
          if (!tmdbApiKey) {
            console.warn("[BlogCardImage] TMDB API Key is not configured.");
            setImgSrc(placeholderImage);
            setIsLoaded(true);
            return;
          }
          const tmdbApiUrl = `https://api.themoviedb.org/3/${explicitIsMovie ? 'movie' : 'tv'}/${explicitId}?api_key=${tmdbApiKey}`;
          const tmdbRes = await fetch(tmdbApiUrl);
          if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            const imagePath = isBackdropRequest ? tmdbData.backdrop_path : tmdbData.poster_path;
            if (imagePath) {
              const fullTmdbUrl = `https://image.tmdb.org/t/p/w780${imagePath}`;
              setImgSrc(fullTmdbUrl);
              // setIsLoaded will be handled by onLoad of the img tag
              return;
            }
          }
        } catch (err) {
          console.warn(`[BlogCardImage] Error fetching TMDB image for ${src}:`, err);
        }
      }
      
      if (src && (src.startsWith('http:') || src.startsWith('https:'))) {
        setImgSrc(src);
         // setIsLoaded will be handled by onLoad of the img tag
      } else {
        setImgSrc(placeholderImage);
        setIsLoaded(true);
      }
    };

    fetchImage();
  }, [src]);

  return (
    <div className={`relative ${className || ''}`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-700/50">
          <PhotoIcon className="w-12 h-12 text-slate-500 animate-pulse" />
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${imageClassName || ''}`}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = placeholderImage;
          setIsLoaded(true); // Ensure loading state is cleared even on error
        }}
      />
    </div>
  );
};


function BlogIndexPage() {
  const [posts, setPosts] = useState(initialPosts);
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
      className="min-h-screen text-gray-100 py-16 md:py-24 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Featured Post */}
        {featuredPost && (
          <motion.section
            className="mb-16 md:mb-24"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          >
            <h2 className="text-3xl font-semibold text-gray-100 mb-8 text-center sm:text-left">
              Featured Article
            </h2>
            <Link
              to={`/blog/${featuredPost.slug}`}
              className="block group"
              onMouseEnter={() => setHoveredCard(featuredPost.slug)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <motion.div
                className="bg-gray-800/80 rounded-xl border border-gray-700/70 shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 ease-out overflow-hidden flex flex-col lg:flex-row group"
                whileHover={{ y: -5, borderColor: 'rgba(129, 140, 248, 0.6)' }} // indigo-400 equivalent
              >
                <BlogCardImage
                  src={featuredPost.imageUrl}
                  alt={featuredPost.altText || featuredPost.title}
                  className="lg:w-3/5 h-64 md:h-72 lg:h-auto relative rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none overflow-hidden"
                  imageClassName="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                >
                  {!featuredPost.imageUrl && <PhotoIcon className="w-24 h-24 text-gray-500" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 lg:bg-gradient-to-r lg:from-black/50 lg:via-transparent"></div>
                </BlogCardImage>
                
                <div className="p-6 md:p-8 flex flex-col justify-center lg:w-2/5 relative z-10">
                  <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3">
                      <span className="px-3 py-1 text-xs font-medium bg-indigo-600 text-indigo-100 rounded-full shadow-sm">
                        {featuredPost.category}
                      </span>
                      <div className="flex items-center text-gray-400 text-sm">
                        <CalendarIcon className="h-4 w-4 mr-1.5 text-indigo-400" />
                        <span>{featuredPost.date}</span>
                      </div>
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-3 line-clamp-3 group-hover:text-indigo-300 transition-colors duration-300">
                      {featuredPost.title}
                    </h3>
                    <p className="text-gray-300 mb-5 line-clamp-3 leading-relaxed">
                      {featuredPost.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-700/50">
                    <span className="text-sm text-gray-400">{featuredPost.readTime}</span>
                    <div className="inline-flex items-center text-md text-indigo-400 group-hover:text-indigo-300 font-semibold transition-colors duration-300">
                      Read More
                      <motion.span
                        animate={{ x: hoveredCard === featuredPost.slug ? 5 : 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <ArrowRightIcon className="h-4.5 w-4.5 ml-2" />
                      </motion.span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.section>
        )}
  
        {/* Remaining Blog Posts Grid */}
        {remainingPosts.length > 0 && (
          <section>
            <h2 className="text-3xl font-semibold text-gray-100 mb-8 text-center sm:text-left">
              {featuredPost ? 'More Articles' : 'All Articles'}
            </h2>
            <motion.div
              className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: featuredPost ? 0.3 : 0.2, staggerChildren: 0.07 }}
            >
              {remainingPosts.map((post) => (
                <motion.div
                  key={post.slug}
                  variants={itemVariants}
                  className="flex flex-col group"
                  onMouseEnter={() => setHoveredCard(post.slug)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <Link to={`/blog/${post.slug}`} className="block h-full">
                    <motion.div
                      className="bg-gray-800/70 rounded-xl border border-gray-700/60 shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 ease-out flex flex-col h-full overflow-hidden"
                      whileHover={{ y: -5, borderColor: 'rgba(165, 180, 252, 0.7)' }} // indigo-300 equivalent
                    >
                      <BlogCardImage
                        src={post.imageUrl}
                        alt={post.altText || post.title}
                        className="h-48 relative overflow-hidden rounded-t-xl"
                        imageClassName="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                      >
                        {!post.imageUrl && <PhotoIcon className="w-16 h-16 text-gray-500" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/5"></div>
                      </BlogCardImage>
                      <div className="p-5 md:p-6 flex flex-col flex-grow">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-2.5">
                          <span className="px-2.5 py-1 text-xs font-medium bg-indigo-700 text-indigo-200 rounded-full shadow-sm">
                            {post.category}
                          </span>
                          <div className="flex items-center text-gray-400 text-xs">
                            <CalendarIcon className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                            <span>{post.date}</span>
                          </div>
                        </div>
                        <h3 className="text-lg lg:text-xl font-semibold text-white mb-2.5 line-clamp-2 group-hover:text-indigo-300 transition-colors duration-300">
                          {post.title}
                        </h3>
                        <p className="text-gray-300/90 text-sm mb-4 line-clamp-3 flex-grow leading-relaxed">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-gray-700/40">
                          <span className="text-xs text-gray-400">{post.readTime}</span>
                          <div className="inline-flex items-center text-sm text-indigo-400 group-hover:text-indigo-300 font-medium transition-colors duration-300">
                            Read More
                            <motion.span
                              animate={{ x: hoveredCard === post.slug ? 4 : 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                              <ArrowRightIcon className="h-4 w-4 ml-1.5" />
                            </motion.span>
                          </div>
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
            className="mt-16 bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-700/60 p-8 md:p-12 text-center shadow-xl shadow-indigo-500/20"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
              <NewspaperIcon className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 mb-3">
              Content Coming Soon
            </h3>
            <p className="text-gray-400 text-md max-w-md mx-auto leading-relaxed">
              We're busy crafting insightful articles and news. Please check back later for exciting updates!
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default BlogIndexPage;