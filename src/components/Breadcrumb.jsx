import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const Breadcrumb = ({ 
  customPath = null, 
  pageTitle = null,
  showHome = true,
  className = ""
}) => {
  const location = useLocation();
  const pathname = customPath || location.pathname;
  
  // Parse the path into breadcrumb segments
  const pathSegments = pathname.split('/').filter(segment => segment !== '');
  
  // Build breadcrumb items
  const breadcrumbItems = [];
  
  // Add home if requested
  if (showHome) {
    breadcrumbItems.push({
      label: 'Home',
      path: '/',
      isCurrent: pathname === '/'
    });
  }
  
  // Build path segments
  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    const label = formatSegmentLabel(segment, pathname, pageTitle);
    
    breadcrumbItems.push({
      label,
      path: currentPath,
      isCurrent: isLast
    });
  });
  
  // Don't render breadcrumbs for home page only
  if (breadcrumbItems.length <= 1) {
    return null;
  }
  
  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": `${window.location.origin}${item.path}`
    }))
  };
  
  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      
      <nav 
        aria-label="Breadcrumb" 
        className={`mb-4 ${className}`}
        role="navigation"
      >
        <ol className="flex items-center space-x-2 text-sm text-gray-400">
          {breadcrumbItems.map((item, index) => (
            <li key={item.path} className="flex items-center">
              {index > 0 && (
                <svg 
                  className="w-4 h-4 mx-2 text-gray-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
              )}
              
              {item.isCurrent ? (
                <span 
                  className="text-gray-300 font-medium"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                  itemProp="item"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

// Helper function to format segment labels
function formatSegmentLabel(segment, fullPath, pageTitle) {
  // Use custom page title if provided and this is the last segment
  if (pageTitle && fullPath.endsWith(segment)) {
    return pageTitle;
  }
  
  // Special cases for known routes
  const specialCases = {
    'blog': 'Blog',
    'movies': 'Movies',
    'recommendations': 'Recommendations',
    'search': 'Search',
    'favorites': 'Favorites',
    'watchlist': 'Watchlist',
    'auth': 'Authentication',
    'signin': 'Sign In',
    'signup': 'Sign Up',
    'onboarding': 'Getting Started',
    'about': 'About',
    'contact': 'Contact',
    'privacy': 'Privacy Policy',
    'terms': 'Terms of Service'
  };
  
  // Check for special cases first
  if (specialCases[segment.toLowerCase()]) {
    return specialCases[segment.toLowerCase()];
  }
  
  // Handle blog post slugs (convert dashes to spaces and title case)
  if (fullPath.includes('/blog/') && segment !== 'blog') {
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Handle movie/show IDs (keep as is for now, could be enhanced with API lookup)
  if (segment.match(/^\d+$/) || segment.match(/^[a-zA-Z0-9-_]+$/)) {
    // For numeric IDs or alphanumeric slugs, keep as is
    return segment;
  }
  
  // Default: capitalize first letter and replace dashes/underscores with spaces
  return segment
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default Breadcrumb;
