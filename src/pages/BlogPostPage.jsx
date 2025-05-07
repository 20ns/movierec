import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import AdUnit from '../components/AdUnit';
import SafeHelmet from '../components/SafeHelmet';

const placeholderImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const CustomImage = ({ src, alt, title, className, ...props }) => {
  const [imgSrc, setImgSrc] = useState(src);
  return (
    <img
      src={imgSrc}
      alt={alt}
      title={title}
      className={className}
      loading="lazy"
      onError={e => { e.currentTarget.onerror = null; setImgSrc(placeholderImage); }}
      {...props}
    />
  );
};

function BlogPostPage() {
  const { slug } = useParams();
  const [markdown, setMarkdown] = useState('');
  const firstH2Rendered = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState({ title: '', date: '', readTime: '' });

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
        const titleMatch = text.match(/^#\s+(.*)/m);
        const dateMatch = text.match(/^Date:\s*(.*)/m);
        const words = text.split(/\s+/).length;
        const minutes = Math.max(1, Math.ceil(words / 200));
        setMetadata({
          title: titleMatch ? titleMatch[1] : 'Blog Post',
          date: dateMatch ? dateMatch[1] : 'Recent',
          readTime: `${minutes} min read`
        });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

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
        <title>{metadata.title}</title>
        <meta name="description" content={`${metadata.title} – ${metadata.readTime}`} />
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={`Read time: ${metadata.readTime}`} />
      </SafeHelmet>
      <motion.div
        className="min-h-screen py-12 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-3xl mx-auto">
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
                               remarkPlugins={[remarkGfm]}
                               rehypePlugins={[rehypeSanitize]}
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