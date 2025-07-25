import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarIcon, ArrowRightIcon, NewspaperIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import SafeHelmet from '../components/SafeHelmet';
import Breadcrumb from '../components/Breadcrumb';
import ErrorBoundary from '../components/ErrorBoundary';

const initialPosts = [
  {
    slug: 'sound-design-horror-thrillers',
    title: 'Soundscapes of Suspense: The Unsung Hero of Horror and Thrillers - Modern Sound Design',
    date: 'May 21, 2025',
    excerpt: "Delving into how innovative sound design creates terror and tension in modern cinema.",
    readTime: '6 min read',
    category: 'Film Craft',
    imageUrl: 'backdrop_tmdbid:49018', // A Quiet Place
    altText: 'Abstract image representing sound waves and suspense',
    isHero: true,
  },
  {
    slug: 'second-screen-tv-viewing',
    title: "The 'Second Screen' Phenomenon: How Companion Apps and Live Chats Are Changing TV Viewing",
    date: 'May 21, 2025',
    excerpt: 'How using smartphones and tablets while watching TV is transforming audience engagement.',
    readTime: '5 min read',
    category: 'Media Habits',
    imageUrl: 'backdrop_tmdbtvid:85271', // The Witcher
    altText: 'Person watching TV while engaging with a phone/tablet',
    isFeatured: true,
  },
  {
    slug: 'social-media-shapes-hollywood',
    title: 'From TikTok Trends to Tentpole Releases: How Social Media is Actively Shaping Hollywood',
    date: 'May 21, 2025',
    excerpt: 'Investigating the profound influence of social media on the film and TV industry.',
    readTime: '6 min read',
    category: 'Industry Trends',
    imageUrl: 'backdrop_tmdbid:615656', // Meg 2
    altText: 'Social media icons merging with Hollywood imagery',
    isFeatured: true,
  },
  {
    slug: 'art-of-tv-title-sequences',
    title: 'More Than Just an Intro: The Art and Evolution of the Modern TV Title Sequence',
    date: 'May 21, 2025',
    excerpt: 'Explore how TV opening credits have evolved into powerful, artistic statements.',
    readTime: '7 min read',
    category: 'TV Analysis',
    imageUrl: 'backdrop_tmdbtvid:1399', // Game of Thrones
    altText: 'Abstract image representing TV title sequence art'
  },
  {
    slug: 'niche-streaming-gems',
    title: 'Beyond the Algorithm: Unearthing Must-See Films on Niche Streaming Services',
    date: 'May 21, 2025',
    excerpt: 'Discover curated cinematic treasures on specialized streaming platforms beyond the mainstream.',
    readTime: '6 min read',
    category: 'Streaming',
    imageUrl: 'backdrop_tmdbid:94952', // Everything Everywhere All at Once
    altText: 'Collage of niche streaming service logos'
  },
  {
    slug: 'mind-bending-movies-question-reality',
    title: 'Mind-Bendeeeers: 7 Movies That Will Make You Question Reality Long After the Credits Roll',
    date: 'May 19, 2025',
    excerpt: "Some films don't just entertain; they burrow into your mind, twisting your perception of reality and leaving you pondering their mysteries for days.",
    readTime: '5 min read',
    category: 'Psychological Thrillers',
    imageUrl: 'backdrop_tmdbid:157336', // Inception backdrop
    altText: 'Abstract Reality Concept'
  },
  {
    slug: 'scene-stealing-character-actors',
    title: 'Beyond the Lead: 7 Scene-Stealing Character Actors Who Deserve the Spotlight',
    date: 'May 19, 2025',
    excerpt: 'Highlighting versatile performers who consistently deliver unforgettable performances and elevate every film they are in, even without top billing.',
    readTime: '6 min read',
    category: 'Actor Spotlight',
    imageUrl: 'backdrop_tmdbid:13', // Forrest Gump backdrop as a placeholder for a collage
    altText: 'Collage of Character Actors'
  },
  {
    slug: 'practical-effects-comeback',
    title: 'The Tactile Touch: How Practical Effects Are Making a Stunning Comeback in Modern Blockbusters',
    date: 'May 19, 2025',
    excerpt: 'Exploring the resurgence of practical effects in an era of CGI, and how they create a unique sense of realism and immersion in film.',
    readTime: '6 min read',
    category: 'Film Techniques',
    imageUrl: 'backdrop_tmdbid:76341', // Mad Max: Fury Road
    altText: 'Mad Max Fury Road Practical Effects'
  },
  {
    slug: 'cinematic-comfort-feel-good-flicks',
    title: 'Cinematic Comfort: 10 Feel-Good Flicks for a Perfect Cozy Night In',
    date: 'May 19, 2025',
    excerpt: 'A list of heartwarming, funny, and uplifting movies perfect for unwinding and lifting your spirits on a cozy night in.',
    readTime: '7 min read',
    category: 'Feel-Good',
    imageUrl: 'backdrop_tmdbid:10195', // Paddington backdrop
    altText: 'Person cozy on couch watching movie'
  },
  {
    slug: 'tv-masterpieces-cancelled-too-soon',
    title: 'Gone Too Soon: 6 TV Masterpieces That Were Cancelled Before Their Time',
    date: 'May 19, 2025',
    excerpt: 'A look at brilliant TV series that were cut short, leaving storylines unresolved and fans heartbroken, exploring what made them special.',
    readTime: '6 min read',
    category: 'Retrospectives',
    imageUrl: 'backdrop_tmdbtvid:1396', // Breaking Bad backdrop as a placeholder
    altText: 'Cancelled TV Show Concept'
  },
  {
    slug: 'indie-sci-fi-gems-2020s',
    title: 'Beyond the Blockbusters: Indie Sci-Fi Gems You Missed in the 2020s',
    date: 'May 11, 2025',
    excerpt: "The 2020s have already offered a fascinating landscape for science fiction, and it's not all about the big-budget spectacles. Independent filmmakers are consistently delivering thought-provoking, unique, and often mind-bending sci-fi stories that deserve your attention.",
    readTime: '6 min read',
    category: 'Indie Films',
    imageUrl: 'backdrop_tmdbid:893030',
    altText: 'Something in the Dirt Still',
    isFeatured: true,
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
  },
  {
    slug: 'ai-deepfakes-entertainment-future',
    title: 'Digital Resurrection: How AI and Deepfakes Are Revolutionizing (and Threatening) Entertainment',
    date: 'May 22, 2025',
    excerpt: 'From bringing dead actors back to screen to creating entirely synthetic performers, AI is reshaping Hollywood in ways that are both amazing and terrifying.',
    readTime: '8 min read',
    category: 'Future Tech',
    imageUrl: 'backdrop_tmdbid:406759', // Blade Runner 2049
    altText: 'AI and digital technology in entertainment',
    isFeatured: true,
  },
  {
    slug: 'celebrity-scandals-box-office-impact',
    title: 'Cancel Culture vs. Box Office: How Celebrity Scandals Actually Affect Movie Success',
    date: 'May 22, 2025',
    excerpt: 'Analyzing real data on whether scandals actually hurt films financially, and which controversies audiences care about versus which they ignore.',
    readTime: '7 min read',
    category: 'Industry Analysis',
    imageUrl: 'backdrop_tmdbid:324857', // Fantastic Beasts
    altText: 'Hollywood controversy and box office impact'
  },
  {
    slug: 'streaming-wars-2025-winners-losers',
    title: 'The Streaming Wars Heat Up: Who\'s Winning and Who\'s Getting Cancelled in 2025',
    date: 'May 22, 2025',
    excerpt: 'With new players entering and established services struggling, the streaming landscape is more brutal than ever. Here\'s who\'s actually making money.',
    readTime: '6 min read',
    category: 'Streaming Wars',
    imageUrl: 'backdrop_tmdbid:496243', // Parasite
    altText: 'Streaming service logos and competition'
  },
  {
    slug: 'tiktok-micro-movies-new-cinema',
    title: 'Movies in Minutes: How TikTok\'s Micro-Cinema is Creating a New Generation of Filmmakers',
    date: 'May 22, 2025',
    excerpt: 'Vertical videos, 60-second stories, and viral film techniques - how TikTok creators are reinventing cinematic language and getting Hollywood\'s attention.',
    readTime: '5 min read',
    category: 'Digital Trends',
    imageUrl: 'backdrop_tmdbid:354912', // Coco
    altText: 'TikTok and modern filmmaking'
  },
  {
    slug: 'reality-tv-psychological-manipulation',
    title: 'Behind the Drama: The Shocking Psychology Tricks Reality TV Uses to Manipulate Contestants',
    date: 'May 22, 2025',
    excerpt: 'Former reality TV producers reveal the dark psychological tactics used to create drama, from sleep deprivation to emotional manipulation.',
    readTime: '9 min read',
    category: 'Reality TV Exposed',
    imageUrl: 'backdrop_tmdbid:646207', // The Power of the Dog
    altText: 'Reality TV production behind the scenes'
  },
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
      )}      <img
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
        width="780"
        height="440"
        decoding="async"
      />
    </div>
  );
};


function BlogIndexPage() {
  const [posts, setPosts] = useState(initialPosts.map(p => ({...p, isHero: p.isHero || false, isFeatured: p.isFeatured || false })));
  const [hoveredCard, setHoveredCard] = useState(null);

  const heroPost = posts.find(p => p.isHero) || (posts.length > 0 ? posts[0] : null);
  const regularPosts = heroPost ? posts.filter(p => p.slug !== heroPost.slug) : posts;

  // Generate structured data for the blog index
  const generateBlogSchema = () => {
    return {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "MovieRec Blog",
      "description": "Insights, reviews, and analysis about movies, TV shows, and entertainment industry trends",
      "url": "https://www.movierec.net/blog",
      "publisher": {
        "@type": "Organization",
        "name": "MovieRec",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.movierec.net/logo.png"
        }
      },
      "blogPost": posts.slice(0, 10).map(post => ({
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.excerpt,
        "url": `https://www.movierec.net/blog/${post.slug}`,
        "datePublished": new Date(post.date).toISOString(),
        "author": {
          "@type": "Organization",
          "name": "MovieRec"
        },
        "publisher": {
          "@type": "Organization",
          "name": "MovieRec"
        }
      }))
    };
  };

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
    <>
      <SafeHelmet>
        <title>MovieRec Blog - Movie & TV Show Insights, Reviews & Analysis</title>
        <meta name="description" content="Explore our comprehensive blog with movie reviews, TV show analysis, industry insights, and entertainment trends. Discover hidden gems, box office analysis, and streaming recommendations." />
        <meta name="keywords" content="movie blog, TV show reviews, film analysis, entertainment news, streaming guides, cinema insights, movie recommendations blog" />
        <link rel="canonical" href="https://www.movierec.net/blog" />
        
        {/* Open Graph tags */}
        <meta property="og:title" content="MovieRec Blog - Movie & TV Show Insights, Reviews & Analysis" />
        <meta property="og:description" content="Explore our comprehensive blog with movie reviews, TV show analysis, industry insights, and entertainment trends." />
        <meta property="og:url" content="https://www.movierec.net/blog" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.movierec.net/logo.png" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MovieRec Blog - Movie & TV Show Insights" />
        <meta name="twitter:description" content="Explore our comprehensive blog with movie reviews, TV show analysis, and entertainment trends." />
        
        {/* Structured Data */}        <script type="application/ld+json">
          {JSON.stringify(generateBlogSchema())}
        </script>
      </SafeHelmet>
        <motion.div
      className="min-h-screen text-gray-100 py-16 md:py-24 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto">
        <ErrorBoundary minimal>
          <Breadcrumb pageTitle="Blog" />
        </ErrorBoundary>
        
        {/* Hero Post Section */}
        {heroPost && (
          <motion.section
            className="mb-20 md:mb-28" // Increased bottom margin
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
          >
            <div className="flex items-center mb-10">
              <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mr-4">
                Spotlight
              </h2>
              <StarIcon className="w-8 h-8 md:w-10 md:h-10 text-yellow-400" />
            </div>
            <Link
              to={`/blog/${heroPost.slug}`}
              className="block group"
              onMouseEnter={() => setHoveredCard(heroPost.slug)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <motion.div
                className="bg-gradient-to-br from-gray-800 via-gray-800/90 to-indigo-900/60 rounded-xl border border-indigo-700/50 shadow-2xl shadow-indigo-500/20 hover:shadow-indigo-400/40 transition-all duration-300 ease-out overflow-hidden flex flex-col lg:flex-row group"
                whileHover={{ y: -8, borderColor: 'rgba(129, 140, 248, 0.8)' }} // indigo-400 equivalent
              >
                <BlogCardImage
                  src={heroPost.imageUrl}
                  alt={heroPost.altText || heroPost.title}
                  className="lg:w-3/5 h-72 md:h-80 lg:h-auto relative rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none overflow-hidden"
                  imageClassName="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                >
                  {!heroPost.imageUrl && <PhotoIcon className="w-24 h-24 text-gray-500" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 lg:bg-gradient-to-r lg:from-black/60 lg:via-transparent"></div>
                </BlogCardImage>
                
                <div className="p-6 md:p-10 flex flex-col justify-center lg:w-2/5 relative z-10">
                  <div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                      <span className="px-3.5 py-1.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-md">
                        {heroPost.category}
                      </span>
                      <div className="flex items-center text-gray-300 text-sm">
                        <CalendarIcon className="h-5 w-5 mr-2 text-indigo-400" />
                        <span>{heroPost.date}</span>
                      </div>
                    </div>
                    <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4 line-clamp-3 group-hover:text-indigo-300 transition-colors duration-300">
                      {heroPost.title}
                    </h3>
                    <p className="text-gray-300 mb-6 line-clamp-4 leading-relaxed text-base">
                      {heroPost.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-700/60">
                    <span className="text-sm text-gray-400">{heroPost.readTime}</span>
                    <div className="inline-flex items-center text-lg text-indigo-300 group-hover:text-indigo-200 font-semibold transition-colors duration-300">
                      Read Article
                      <motion.span
                        animate={{ x: hoveredCard === heroPost.slug ? 6 : 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <ArrowRightIcon className="h-5 w-5 ml-2.5" />
                      </motion.span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.section>
        )}
  
        {/* Regular Blog Posts Grid */}
        {regularPosts.length > 0 && (
          <section>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-100 mb-10 text-center sm:text-left">
              {heroPost ? 'More Articles' : 'All Articles'}
            </h2>
            <motion.div
              className="grid gap-10 md:grid-cols-2 lg:grid-cols-3" // Increased gap
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: heroPost ? 0.3 : 0.2, staggerChildren: 0.07 }}
            >
              {regularPosts.map((post) => (
                <motion.div
                  key={post.slug}
                  variants={itemVariants}
                  className="flex flex-col group relative" // Added relative for badge positioning
                  onMouseEnter={() => setHoveredCard(post.slug)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <Link to={`/blog/${post.slug}`} className="block h-full">
                    <motion.div
                      className="bg-gray-800/80 rounded-xl border border-gray-700/70 shadow-lg hover:shadow-indigo-500/40 transition-all duration-300 ease-out flex flex-col h-full overflow-hidden"
                      whileHover={{ y: -6, borderColor: 'rgba(165, 180, 252, 0.75)' }} // indigo-300 equivalent, slightly more pronounced
                    >
                      {post.isFeatured && (
                        <div className="absolute top-3 right-3 z-10 p-1 bg-yellow-400 rounded-full shadow-lg">
                           <StarIcon className="w-5 h-5 text-gray-900" />
                        </div>
                      )}
                      <BlogCardImage
                        src={post.imageUrl}
                        alt={post.altText || post.title}
                        className="h-52 relative overflow-hidden rounded-t-xl" // Slightly increased height
                        imageClassName="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                      >
                        {!post.imageUrl && <PhotoIcon className="w-16 h-16 text-gray-500" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10"></div>
                      </BlogCardImage>
                      <div className="p-5 md:p-6 flex flex-col flex-grow">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-3">
                          <span className={`px-2.5 py-1 text-xs font-medium ${post.isFeatured ? 'bg-yellow-500 text-yellow-900' : 'bg-indigo-700 text-indigo-200'} rounded-full shadow-sm`}>
                            {post.category}
                          </span>
                          <div className="flex items-center text-gray-400 text-xs">
                            <CalendarIcon className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                            <span>{post.date}</span>
                          </div>
                        </div>
                        <h3 className="text-lg lg:text-xl font-semibold text-white mb-3 line-clamp-2 group-hover:text-indigo-300 transition-colors duration-300">
                          {post.title}
                        </h3>
                        <p className="text-gray-300/90 text-sm mb-4 line-clamp-3 flex-grow leading-relaxed">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-700/50">
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
          </motion.div>        )}
      </div>
    </motion.div>
    </>
  );
}

export default BlogIndexPage;