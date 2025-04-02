import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  FilmIcon,
  TagIcon,
  CalendarIcon,
  FireIcon,
  ViewfinderCircleIcon
} from '@heroicons/react/24/outline';

export const FiltersSection = ({ activeFilters, setActiveFilters }) => {
  const [openFilter, setOpenFilter] = useState(null);
  
  const toggleFilter = (filterKey) => {
    setOpenFilter(openFilter === filterKey ? null : filterKey);
  };
  
  const renderFilterButton = (filterKey, label, icon) => {
    return (
      <div className="relative">
        <button
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
            openFilter === filterKey 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
          } ${
            activeFilters[filterKey] !== 'any' && activeFilters[filterKey] !== 'all' && activeFilters[filterKey] !== 'diverse'
              ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-gray-900' 
              : ''
          }`}
          onClick={() => toggleFilter(filterKey)}
        >
          {icon}
          <span>{label}</span>
        </button>
        
        <AnimatePresence>
          {openFilter === filterKey && renderFilterOptions(filterKey)}
        </AnimatePresence>
      </div>
    );
  };
  
  const renderFilterOptions = (filterKey) => {
    let options = [];
    
    switch (filterKey) {
      case 'time':
        options = [
          { label: 'Any Era', value: 'any', icon: <ClockIcon className="w-4 h-4" /> },
          { label: 'Recent (Last 5 Years)', value: 'recent', icon: <ClockIcon className="w-4 h-4" /> },
          { label: '90s & 00s', value: '90s00s', icon: <ClockIcon className="w-4 h-4" /> },
          { label: 'Classics (20+ Years)', value: 'classic', icon: <ClockIcon className="w-4 h-4" /> }
        ];
        break;
      case 'type':
        options = [
          { label: 'All Types', value: 'all', icon: <FilmIcon className="w-4 h-4" /> },
          { label: 'Movies Only', value: 'movie', icon: <FilmIcon className="w-4 h-4" /> },
          { label: 'TV Shows Only', value: 'tv', icon: <FilmIcon className="w-4 h-4" /> }
        ];
        break;
      case 'genre':
        options = [
          { label: 'Diverse Genres', value: 'diverse', icon: <TagIcon className="w-4 h-4" /> },
          { label: 'Action', value: 'action', icon: <TagIcon className="w-4 h-4" /> },
          { label: 'Comedy', value: 'comedy', icon: <TagIcon className="w-4 h-4" /> },
          { label: 'Drama', value: 'drama', icon: <TagIcon className="w-4 h-4" /> },
          { label: 'Sci-Fi', value: 'scifi', icon: <TagIcon className="w-4 h-4" /> },
          { label: 'Horror', value: 'horror', icon: <TagIcon className="w-4 h-4" /> },
          { label: 'Romance', value: 'romance', icon: <TagIcon className="w-4 h-4" /> }
        ];
        break;
      case 'releaseYear':
        const currentYear = new Date().getFullYear();
        options = [
          { label: 'Any Year', value: 'any', icon: <CalendarIcon className="w-4 h-4" /> },
          ...Array.from({ length: 10 }, (_, i) => currentYear - i).map(year => ({
            label: year.toString(), 
            value: year.toString(), 
            icon: <CalendarIcon className="w-4 h-4" />
          })),
          { label: '2010s', value: '2010s', icon: <CalendarIcon className="w-4 h-4" /> },
          { label: '2000s', value: '2000s', icon: <CalendarIcon className="w-4 h-4" /> },
          { label: '1990s', value: '1990s', icon: <CalendarIcon className="w-4 h-4" /> },
          { label: 'Before 1990', value: 'pre1990', icon: <CalendarIcon className="w-4 h-4" /> }
        ];
        break;
      case 'popularity':
        options = [
          { label: 'Any Popularity', value: 'any', icon: <FireIcon className="w-4 h-4" /> },
          { label: 'Very Popular', value: 'high', icon: <FireIcon className="w-4 h-4" /> },
          { label: 'Moderately Popular', value: 'medium', icon: <FireIcon className="w-4 h-4" /> },
          { label: 'Hidden Gems', value: 'low', icon: <FireIcon className="w-4 h-4" /> }
        ];
        break;
      case 'contentType':
        options = [
          { label: 'Any Content', value: 'any', icon: <ViewfinderCircleIcon className="w-4 h-4" /> },
          { label: 'Animation', value: 'animation', icon: <ViewfinderCircleIcon className="w-4 h-4" /> },
          { label: 'Documentary', value: 'documentary', icon: <ViewfinderCircleIcon className="w-4 h-4" /> },
          { label: 'Reality TV', value: 'reality', icon: <ViewfinderCircleIcon className="w-4 h-4" /> },
        ];
        break;
      default:
        break;
    }
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className="absolute mt-2 z-50 min-w-[160px]"
      >
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => setActiveFilters(prev => ({ ...prev, [filterKey]: option.value }))}
              className={`w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 rounded-md ${
                activeFilters[filterKey] === option.value 
                ? 'bg-gray-700 text-white font-medium' 
                : ''
              }`}
            >
              {option.icon}
              <span className="ml-2">{option.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    );
  };

  // Filter update handler
  const handleFilterChange = (filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
  };

  return (
    <motion.div 
      className="w-full rounded-xl bg-gray-800/95 backdrop-blur-sm p-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Mode Filter - NEW */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Search Mode</label>
          <div className="flex bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => handleFilterChange('searchMode', 'smart')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex-1 transition-colors ${
                activeFilters.searchMode === 'smart'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              Smart Search
            </button>
            <button
              onClick={() => handleFilterChange('searchMode', 'direct')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex-1 transition-colors ${
                activeFilters.searchMode === 'direct'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              Direct Title Search
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {activeFilters.searchMode === 'direct' 
              ? "Find exact titles to add to favorites" 
              : "Intelligent search with recommendations"}
          </p>
        </div>

        {/* Media Type */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Media Type</label>
          <div className="flex bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => handleFilterChange('type', 'all')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex-1 transition-colors ${
                activeFilters.type === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('type', 'movie')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex-1 transition-colors ${
                activeFilters.type === 'movie'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => handleFilterChange('type', 'tv')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex-1 transition-colors ${
                activeFilters.type === 'tv'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              TV Shows
            </button>
          </div>
        </div>

        {/* Time Period */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Time Period</label>
          <select
            value={activeFilters.time}
            onChange={(e) => handleFilterChange('time', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-gray-700 border border-gray-600 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="any">Any Time</option>
            <option value="recent">Recent (Last 5 years)</option>
            <option value="90s00s">90s & 00s</option>
            <option value="classic">Classic (20+ years old)</option>
          </select>
        </div>

        {/* Release Year */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Release Year</label>
          <select
            value={activeFilters.releaseYear}
            onChange={(e) => handleFilterChange('releaseYear', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-gray-700 border border-gray-600 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="any">Any Year</option>
            {Array.from({ length: 24 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
        </div>

        {/* Popularity */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Popularity</label>
          <select
            value={activeFilters.popularity}
            onChange={(e) => handleFilterChange('popularity', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-gray-700 border border-gray-600 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="any">Any Popularity</option>
            <option value="high">Highly Popular</option>
            <option value="medium">Moderately Popular</option>
            <option value="low">Hidden Gems</option>
          </select>
        </div>

        {/* Content Type */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Content Type</label>
          <select
            value={activeFilters.contentType}
            onChange={(e) => handleFilterChange('contentType', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-gray-700 border border-gray-600 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="any">All Content Types</option>
            <option value="documentary">Documentaries</option>
            <option value="animation">Animation</option>
            {activeFilters.type === 'tv' && <option value="reality">Reality TV</option>}
          </select>
        </div>
      </div>
    </motion.div>
  );
};

export default FiltersSection;