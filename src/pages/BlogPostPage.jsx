import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { visit } from 'unist-util-visit';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import AdUnit from '../components/AdUnit';
import SafeHelmet from '../components/SafeHelmet';
import Breadcrumb from '../components/Breadcrumb';
import ErrorBoundary from '../components/ErrorBoundary';

const placeholderImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const CustomImage = ({ src, alt, title, className, ...props }) => {
  console.log('[CustomImage Props Received]', { src, alt, title, className });
  const [imgSrc, setImgSrc] = useState(placeholderImage);

  useEffect(() => {
    const fetchImage = async () => {
      // --- Stage 1: Attempt with Explicit ID ---
      let explicitId = null;
      let explicitIsMovie = null;
      let isBackdropRequest = false;

      if (src) {
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
      }

      if (explicitId) {
        console.log(`[CustomImage] Attempting fetch for explicit ID: ${explicitId}, Type: ${explicitIsMovie ? 'Movie' : 'TV'}, Backdrop: ${isBackdropRequest}, Alt: ${alt}`);
        try {
          // 1a. Fanart with explicit ID
          const fanartUrl = `https://webservice.fanart.tv/v3/${explicitIsMovie ? 'movies' : 'tv'}/${explicitId}?api_key=${process.env.REACT_APP_FANART_TV_API_KEY}`;
          console.log(`[CustomImage] Fetching Fanart: ${fanartUrl}`);
          const fanartRes = await fetch(fanartUrl);
          if (fanartRes.ok) {
            const fanartData = await fanartRes.json();
            console.log(`[CustomImage] Fanart response OK for ID ${explicitId}. Data:`, fanartData);
            let fanartImage = null;
            if (isBackdropRequest) {
              fanartImage = explicitIsMovie
                ? fanartData.moviebackground?.[0]?.url
                : fanartData.showbackground?.[0]?.url || fanartData.tvbackground?.[0]?.url;
              console.log(`[CustomImage] Fanart backdrop check: ${fanartImage || 'not found'}`);
            } else { // Poster request
              fanartImage = explicitIsMovie
                ? fanartData.movieposter?.[0]?.url
                : fanartData.tvposter?.[0]?.url || fanartData.tvthumb?.[0]?.url;
              console.log(`[CustomImage] Fanart poster check: ${fanartImage || 'not found'}`);
            }

            if (fanartImage) {
              console.log(`[CustomImage] Using Fanart image: ${fanartImage}`);
              setImgSrc(fanartImage);
              return;
            } else {
              console.log(`[CustomImage] No suitable image from Fanart for ID ${explicitId}, backdrop: ${isBackdropRequest}.`);
            }
          } else {
            console.warn(`[CustomImage] Fanart.tv (ID: ${explicitId}, type: ${explicitIsMovie ? 'movie' : 'tv'}, backdrop: ${isBackdropRequest}) failed: ${fanartRes.status} - ${fanartRes.statusText}. URL: ${fanartUrl}`);
          }

          // 1b. TMDB Image with explicit ID (if Fanart failed or didn't have the specific type)
          const tmdbApiUrl = `https://api.themoviedb.org/3/${explicitIsMovie ? 'movie' : 'tv'}/${explicitId}?api_key=${process.env.REACT_APP_TMDB_API_KEY}`;
          console.log(`[CustomImage] Fetching TMDB: ${tmdbApiUrl}`);
          const tmdbRes = await fetch(tmdbApiUrl);
          if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            console.log(`[CustomImage] TMDB response OK for ID ${explicitId}. Data:`, tmdbData);
            const imagePath = isBackdropRequest ? tmdbData.backdrop_path : tmdbData.poster_path;
            if (imagePath) {
              const fullTmdbUrl = `https://image.tmdb.org/t/p/original${imagePath}`;
              console.log(`[CustomImage] Using TMDB image: ${fullTmdbUrl}`);
              setImgSrc(fullTmdbUrl);
              return;
            } else {
              console.log(`[CustomImage] No suitable image path from TMDB for ID ${explicitId} (backdrop: ${isBackdropRequest}, path was: ${imagePath === null ? 'null' : imagePath === undefined ? 'undefined' : imagePath}).`);
            }
          } else {
            console.warn(`[CustomImage] TMDB API (ID: ${explicitId}, type: ${explicitIsMovie ? 'movie' : 'tv'}, backdrop: ${isBackdropRequest}) failed: ${tmdbRes.status} - ${tmdbRes.statusText}. URL: ${tmdbApiUrl}`);
          }
        } catch (err) {
          console.warn(`[CustomImage] Error fetching with explicit ID ${explicitId} (type: ${explicitIsMovie ? 'movie' : 'tv'}, backdrop: ${isBackdropRequest}):`, err);
        }
        // If explicit ID was provided but all attempts failed, fall back to placeholder.
        console.log(`[CustomImage] Explicit ID path for ${explicitId} (backdrop: ${isBackdropRequest}) exhausted. Setting placeholder.`);
        setImgSrc(placeholderImage);
        return;
      }

      // --- Stage 2: Attempt with Text-Based Search (if no explicit ID was provided) ---
      let derivedId = null;
      let derivedIsMovie = true; // Default to movie for text search
      let derivedTmdbPosterUrl = null;

      try {
        const rawText = (alt || title || '').replace(/\b(Scene|Poster|Movie Poster|TV Show Poster|thumbnail)\b/gi, '').trim();
        if (!rawText) {
          // If no alt/title text, and no explicit ID, try original src or placeholder
          if (src && (src.startsWith('http:') || src.startsWith('https:') || src.startsWith('data:'))) {
            setImgSrc(src);
          } else {
            console.log(`[CustomImage] No rawText for text search, no explicit ID. Setting placeholder.`);
            setImgSrc(placeholderImage);
          }
          return;
        }
        const query = encodeURIComponent(rawText);

        // 2a. TMDB Search (Movie then TV) to get an ID and potential poster URL
        const movieSearchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=${query}`;
        const movieRes = await fetch(movieSearchUrl);
        if (movieRes.ok) {
          const movieData = await movieRes.json();
          if (movieData.results?.[0]) {
            derivedId = movieData.results[0].id;
            derivedIsMovie = true;
            if (movieData.results[0].poster_path) {
              derivedTmdbPosterUrl = `https://image.tmdb.org/t/p/original${movieData.results[0].poster_path}`;
            }
          }
        } else {
          console.warn(`TMDB movie search (query: "${rawText}") failed: ${movieRes.status}`);
        }

        if (!derivedId) {
          const tvSearchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=${query}`;
          const tvRes = await fetch(tvSearchUrl);
          if (tvRes.ok) {
            const tvData = await tvRes.json();
            if (tvData.results?.[0]) {
              derivedId = tvData.results[0].id;
              derivedIsMovie = false;
              if (tvData.results[0].poster_path) {
                derivedTmdbPosterUrl = `https://image.tmdb.org/t/p/original${tvData.results[0].poster_path}`;
              }
            }
          } else {
            console.warn(`TMDB TV search (query: "${rawText}") failed: ${tvRes.status}`);
          }
        }

        // 2b. Fanart with derived ID
        if (derivedId) {
          const fanartUrl = `https://webservice.fanart.tv/v3/${derivedIsMovie ? 'movies' : 'tv'}/${derivedId}?api_key=${process.env.REACT_APP_FANART_TV_API_KEY}`;
          const fanartRes = await fetch(fanartUrl);
          if (fanartRes.ok) {
            const fanartData = await fanartRes.json();
            const fanartImage = derivedIsMovie
              ? fanartData.movieposter?.[0]?.url || fanartData.moviebackground?.[0]?.url
              : fanartData.tvposter?.[0]?.url || fanartData.tvthumb?.[0]?.url;
            if (fanartImage) {
              setImgSrc(fanartImage);
              return;
            }
          } else {
            console.warn(`Fanart.tv (derived ID: ${derivedId}, type: ${derivedIsMovie ? 'movie' : 'tv'}) failed: ${fanartRes.status}`);
          }
        }
      } catch (err) {
        console.warn('Error during text-based image search:', err);
      }

      // --- Stage 3: Final Fallbacks (for text-search path) ---
      if (derivedTmdbPosterUrl) { // Poster from text search
        setImgSrc(derivedTmdbPosterUrl);
        return;
      }
      
      // If src is a valid URL (and not an ID string we've processed)
      if (src && (src.startsWith('http:') || src.startsWith('https:') || src.startsWith('data:'))) {
        setImgSrc(src);
        return;
      }

      console.log(`[CustomImage] All fallbacks exhausted for text-search path (alt: ${alt}). Setting placeholder.`);
      setImgSrc(placeholderImage);
    };
    fetchImage();
  }, [src, alt, title]);

  const handleError = (e) => {
    e.currentTarget.onerror = null;
    // If original src error, fall back to placeholder
    setImgSrc(placeholderImage);
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      title={title}
      className={className}
      loading="lazy"
      onError={handleError}
      {...props}
    />
  );
};

// Custom rehype plugin to log image properties before sanitization
const rehypeImageSrcLogger = () => {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'img') {
        console.log('[rehypeImageSrcLogger] Found <img> HAST node, properties:', node.properties);
      }
    });
  };
};

function BlogPostPage() {
  const { slug } = useParams();
  const [markdown, setMarkdown] = useState('');
  const firstH2Rendered = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState({ title: '', date: '', readTime: '', description: '', isoDate: '', firstImageMarkdownUrl: null });
  const [articleSchema, setArticleSchema] = useState(null);

  useEffect(() => {
    firstH2Rendered.current = false;
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      setError('Blog post slug is missing.');
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/blog/${slug}.md`)
      .then(res => {
        if (!res.ok) throw new Error('Post not found');
        return res.text();
      })
      .then(text => {
        setMarkdown(text);

        // Extract first image URL from markdown
        let firstImageSrc = null;
        const imageRegex = /!\[.*?\]\(([^)]+)\)/;
        const imageMatch = text.match(imageRegex);
        if (imageMatch && imageMatch[1]) {
          let rawSrc = imageMatch[1];
          if (rawSrc.startsWith('/')) { // Handle relative paths
            firstImageSrc = `${window.location.origin}${rawSrc}`;
          } else if (rawSrc.startsWith('http:') || rawSrc.startsWith('https:') || rawSrc.startsWith('data:')) { // Absolute or data URLs
            firstImageSrc = rawSrc;
          } else {
            // For custom schemes like 'tmdbid:', use as is.
            // Ideally, these should be resolved to full URLs for schema.org.
            firstImageSrc = rawSrc;
          }
        }

        const titleMatch = text.match(/^#\s+(.*)/m);
        const dateMatch = text.match(/^(\*\*Date:\*\*|Date:)\s*(.*)/m);
        const descriptionMatch = text.match(/^(\*\*Description:\*\*|Description:)\s*(.*)/m);

        let extractedDescription = '';
        if (descriptionMatch && descriptionMatch[2]) {
          extractedDescription = descriptionMatch[2].trim();
        } else {
          const contentStart = text.substring(text.indexOf('## ') > 0 ? text.indexOf('## ') : (titleMatch ? titleMatch[0].length : 0));
          const plainText = contentStart.replace(/!\[.*?\]\(.*?\)/g, '')
                                     .replace(/\[(.*?)\]\(.*?\)/g, '$1')
                                     .replace(/<\/?[^>]+(>|$)/g, "")
                                     .replace(/#+\s*/g, '')
                                     .replace(/[*_`~]/g, '')
                                     .replace(/\s\s+/g, ' ')
                                     .trim();
          extractedDescription = plainText.substring(0, 155);
          if (plainText.length > 155) extractedDescription += '...';
        }

        const finalDescription = extractedDescription || `Read more about ${titleMatch ? titleMatch[1] : 'this topic'}.`;
        const displayDate = dateMatch ? dateMatch[2] : 'Recent';
        
        let isoDate = '';
        if (dateMatch && dateMatch[2] && dateMatch[2] !== 'Recent') {
          try {
            const parsedDate = new Date(dateMatch[2]);
            if (!isNaN(parsedDate)) {
              isoDate = parsedDate.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn("Could not parse date for ISO conversion:", dateMatch[2]);
          }
        }

        const words = text.split(/\s+/).length;
        const minutes = Math.max(1, Math.ceil(words / 200));
        
        setMetadata({
          title: titleMatch ? titleMatch[1] : 'Blog Post',
          date: displayDate,
          readTime: `${minutes} min read`,
          description: finalDescription,
          isoDate: isoDate,
          firstImageMarkdownUrl: firstImageSrc
        });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (metadata.title && metadata.description && metadata.isoDate) {
      const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": metadata.title,
        "description": metadata.description,
        "datePublished": metadata.isoDate,
        "dateModified": metadata.isoDate, // Can be same as datePublished or updated if content changes
        "author": {
          "@type": "Organization",
          "name": "MovieRec"
        },
        "publisher": {
          "@type": "Organization",
          "name": "MovieRec",
          "logo": { // It's good practice to include a logo for the publisher
            "@type": "ImageObject",
            "url": "https://www.movierec.net/logo.png" // Assuming your logo is at this URL
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": window.location.href
        },
        // Add image property if available
        ...(metadata.firstImageMarkdownUrl && {
          "image": [metadata.firstImageMarkdownUrl]
          // TODO: The URL in schema.image should ideally be a fully resolved, absolute image URL.
          // If firstImageMarkdownUrl is a custom scheme (e.g., 'tmdbid:'), it's not standard for schema.org.
          // Consider resolving this to a full image URL before adding to the schema for best SEO results.
        })
      };
      setArticleSchema(schema);
    }
  }, [metadata]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-t-indigo-500 border-gray-700 rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-indigo-300">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg text-red-400 text-center">
          <p className="mb-4">{error}</p>
          <Link to="/blog" className="inline-flex items-center text-indigo-400 hover:underline">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Blog
          </Link>
        </div>
      </motion.div>
    );
  }
  return (
    <>
      <SafeHelmet>
        <title>{metadata.title} | MovieRec Blog</title>
        <meta name="description" content={metadata.description} />
        <meta name="keywords" content={`${metadata.title}, movie analysis, TV show review, entertainment, cinema, streaming`} />
        <link rel="canonical" href={`https://www.movierec.net/blog/${slug}`} />
        
        {/* Open Graph tags */}
        <meta property="og:title" content={`${metadata.title} | MovieRec Blog`} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://www.movierec.net/blog/${slug}`} />
        <meta property="og:site_name" content="MovieRec" />
        {metadata.isoDate && <meta property="article:published_time" content={metadata.isoDate} />}
        {metadata.firstImageMarkdownUrl && (
          <meta property="og:image" content={metadata.firstImageMarkdownUrl.startsWith('http') 
            ? metadata.firstImageMarkdownUrl 
            : `https://www.movierec.net${metadata.firstImageMarkdownUrl}`} />
        )}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${metadata.title} | MovieRec Blog`} />
        <meta name="twitter:description" content={metadata.description} />
        
        {/* Article schema */}
        {articleSchema && (
          <script type="application/ld+json">
            {JSON.stringify(articleSchema)}
          </script>
        )}
      </SafeHelmet>      <motion.div
        className="min-h-screen py-12 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-3xl mx-auto">
          <ErrorBoundary minimal>
            <Breadcrumb pageTitle={metadata.title} />
          </ErrorBoundary>
          
          <Link to="/blog" className="inline-flex items-center text-indigo-400 hover:underline mb-6">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to all posts
          </Link>
          <motion.article
            className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <header className="p-6 bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
              <h1 className="text-3xl font-bold">{metadata.title}</h1>
              <div className="flex space-x-4 mt-2 text-gray-300">
                <span className="flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  {metadata.date}
                </span>
                <span className="flex items-center">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  {metadata.readTime}
                </span>
              </div>
            </header>
            <div className="p-6 prose prose-invert prose-indigo max-w-none">
              <ReactMarkdown
urlTransform={uri => uri}
                               remarkPlugins={[remarkGfm]}
                               rehypePlugins={[
                                 rehypeImageSrcLogger, // Our custom logger plugin first
                                 // Temporarily commenting out rehypeSanitize for testing
                                 /*
                                 [rehypeSanitize, {
                                 schema: {
                                   ...defaultSchema,
                                   attributes: {
                                     ...defaultSchema.attributes,
                                     img: [
                                       'alt',
                                       'title',
                                       'class',
                                       (name, value) => {
                                         if (name === 'src') {
                                           const customProtocols = ['tmdbid:', 'tmdbtvid:', 'backdrop_tmdbid:', 'backdrop_tmdbtvid:'];
                                           const defaultProtocols = ['http:', 'https:', 'mailto:', 'data:'];
                                           const isCustom = customProtocols.some(protocol => String(value).startsWith(protocol));
                                           const isDefault = defaultProtocols.some(protocol => String(value).startsWith(protocol));
                                           if (isCustom || isDefault) return true;
                                           return false;
                                         }
                                         return false;
                                       }
                                     ],
                                     '*': defaultSchema.attributes['*'],
                                   },
                                   protocols: {
                                     ...defaultSchema.protocols,
                                     src: [
                                       ...(defaultSchema.protocols?.src || []),
                                       'tmdbid', 'tmdbtvid', 'backdrop_tmdbid', 'backdrop_tmdbtvid', 'data'
                                     ],
                                   },
                                 }
                               }]
                               */
                               ]}
                               components={{
                  img: ({ node, ...props }) => (
                    <CustomImage
                      {...props}
                      className="rounded-lg mx-auto shadow my-6 w-full max-w-sm object-contain"
                    />
                  ),
                  h2: ({ node, ...props }) => {
                    const heading = <h2 {...props} />;
                    let ad = null;
                    if (!firstH2Rendered.current) {
                      ad = <AdUnit className="my-8" />;
                      firstH2Rendered.current = true;
                    }
                    return (
                      <>
                        {heading}
                        {ad}
                      </>
                    );
                  }
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
            <footer className="p-6 bg-gray-900 text-gray-400 flex justify-between items-center">
              <Link to="/blog" className="inline-flex items-center text-indigo-400 hover:underline">
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                Back to all posts
              </Link>
            </footer>
          </motion.article>
        </div>
      </motion.div>
    </>
  );
}

export default BlogPostPage;