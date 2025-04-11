import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  FilmIcon,
  TagIcon,
  CalendarIcon,
  FireIcon,
  ViewfinderCircleIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import {
  ClockIcon as ClockIconSolid,
  FilmIcon as FilmIconSolid,
  TagIcon as TagIconSolid,
  CalendarIcon as CalendarIconSolid,
  FireIcon as FireIconSolid,
  ViewfinderCircleIcon as ViewfinderCircleIconSolid
} from '@heroicons/react/24/solid';

export const FiltersSection = ({ activeFilters, setActiveFilters }) => {
  const [openFilter, setOpenFilter] = useState(null);
  
  const toggleFilter = (filterKey) => {
    setOpenFilter(openFilter === filterKey ? null : filterKey);
  };
  
  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.filter-dropdown') && !e.target.closest('.filter-button')) {
        setOpenFilter(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Determine if filter is active (has non-default value)
  const isFilterActive = (filterKey) => {
    switch (filterKey) {
      case 'genre':
        return activeFilters[filterKey] !== 'diverse';
      case 'type':
        return activeFilters[filterKey] !== 'all';
      case 'releaseYear':
      case 'time':
      case 'popularity':
      case 'contentType':
        return activeFilters[filterKey] !== 'any';
      default:
        return false;
    }
  };
  
  // Get proper icon based on whether filter is active
  const getFilterIcon = (filterKey) => {
    const isActive = isFilterActive(filterKey);
    
    switch (filterKey) {
      case 'time':
        return isActive ? <ClockIconSolid className="w-3.5 h-3.5" /> : <ClockIcon className="w-3.5 h-3.5" />;
      case 'type':
        return isActive ? <FilmIconSolid className="w-3.5 h-3.5" /> : <FilmIcon className="w-3.5 h-3.5" />;
      case 'genre':
        return isActive ? <TagIconSolid className="w-3.5 h-3.5" /> : <TagIcon className="w-3.5 h-3.5" />;
      case 'releaseYear':
        return isActive ? <CalendarIconSolid className="w-3.5 h-3.5" /> : <CalendarIcon className="w-3.5 h-3.5" />;
      case 'popularity':
        return isActive ? <FireIconSolid className="w-3.5 h-3.5" /> : <FireIcon className="w-3.5 h-3.5" />;
      case 'contentType':
        return isActive ? <ViewfinderCircleIconSolid className="w-3.5 h-3.5" /> : <ViewfinderCircleIcon className="w-3.5 h-3.5" />;
      default:
        return <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />;
    }
  };
  
  // Get active filter label for display
  const getActiveFilterLabel = (filterKey) => {
    switch (filterKey) {
      case 'time':
        switch (activeFilters.time) {
          case 'any': return 'Any Era';
          case 'recent': return 'Recent';
          case '90s00s': return '90s-00s';
          case 'classic': return 'Classics';
          default: return 'Time';
        }
      case 'type':
        switch (activeFilters.type) {
          case 'all': return 'All';
          case 'movie': return 'Movies';
          case 'tv': return 'TV Shows';
          default: return 'Type';
        }
      case 'genre':
        if (activeFilters.genre === 'diverse') return 'Genres';
        return activeFilters.genre.charAt(0).toUpperCase() + activeFilters.genre.slice(1);
      case 'releaseYear':
        if (activeFilters.releaseYear === 'any') return 'Year';
        return activeFilters.releaseYear;
      case 'popularity':
        switch (activeFilters.popularity) {
          case 'any': return 'Popularity';
          case 'high': return 'Popular';
          case 'medium': return 'Moderate';
          case 'low': return 'Hidden Gems';
          default: return 'Popularity';
        }
      case 'contentType':
        if (activeFilters.contentType === 'any') return 'Content';
        return activeFilters.contentType.charAt(0).toUpperCase() + activeFilters.contentType.slice(1);
      default:
        return 'Filter';
    }
  };
  
  const renderFilterButton = (filterKey, label, icon) => {
    const isActive = isFilterActive(filterKey);
    const buttonIcon = getFilterIcon(filterKey);
    const activeLabel = getActiveFilterLabel(filterKey);
    
    return (
      <div className="relative">
        <motion.button
          className={`filter-button flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs transition-all
            ${openFilter === filterKey 
              ? 'bg-indigo-600 text-white' 
              : isActive
                ? 'bg-indigo-600/40 text-white border border-indigo-500/50'
                : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600/50'
            }`}
          onClick={() => toggleFilter(filterKey)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {buttonIcon}
          <span>{isActive ? activeLabel : label}</span>
        </motion.button>
        
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
          { label: 'Romance', value: 'romance', icon: <TagIcon className="w-4 h-4" /> },
          { label: 'Animation', value: 'animation', icon: <TagIcon className="w-4 h-4" /> },
          { label: 'Fantasy', value: 'fantasy', icon: <TagIcon className="w-4 h-4" /> },
          { label: 'Thriller', value: 'thriller', icon: <TagIcon className="w-4 h-4" /> }
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
          { label: 'Foreign Language', value: 'foreign', icon: <ViewfinderCircleIcon className="w-4 h-4" /> },
          { label: 'Family Friendly', value: 'family', icon: <ViewfinderCircleIcon className="w-4 h-4" /> }
        ];
        break;
      default:
        break;
    }
    
    // Get position class based on filter key to prevent dropdown from going off-screen
    const getPositionClass = () => {
      if (window.innerWidth < 640) { // Mobile screens
        return 'left-0 right-0';
      }
      
      // For desktop, position dropdown to avoid overflow
      const index = ['time', 'type', 'genre', 'releaseYear', 'popularity', 'contentType'].indexOf(filterKey);
      if (index < 3) {
        return 'left-0'; // First row - align left
      } else {
        return 'right-0'; // Second row - align right
      }
    };
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className={`filter-dropdown absolute mt-2 z-50 w-auto min-w-[180px] ${getPositionClass()}`}
      >
        <div className="bg-gray-800/95 backdrop-blur-lg border border-gray-600/60 rounded-lg shadow-xl p-1.5">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {options.map((option) => (
              <motion.button
                key={option.value}
                onClick={() => {
                  setActiveFilters(prev => ({ ...prev, [filterKey]: option.value }));
                  setOpenFilter(null);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-indigo-600/40 rounded-md transition-colors ${
                  activeFilters[filterKey] === option.value 
                  ? 'bg-indigo-600/70 text-white font-medium' 
                  : ''
                }`}
                whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.2)' }}
                whileTap={{ scale: 0.98 }}
              >
                {option.icon}
                <span className="ml-2">{option.label}</span>
              </motion.button>
            ))}
          </div>
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
  
  // Reset all filters
  const handleResetFilters = () => {
    setActiveFilters({
      searchMode: activeFilters.searchMode, // Preserve search mode
      genre: 'diverse',
      type: 'all',
      time: 'any',
      releaseYear: 'any',
      popularity: 'any',
      contentType: 'any'
    });
  };

  return (
    <motion.div 
      className="w-full rounded-xl bg-gray-800/80 backdrop-blur-md p-3 sm:p-4 border border-gray-700/60 shadow-lg"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      {/* Search Mode Selection */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-300">Search Mode</h3>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleResetFilters}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-md hover:bg-indigo-900/30 transition-colors"
          >
            Reset Filters
          </motion.button>
        </div>
        
        <div className="flex p-1 rounded-lg bg-gray-900/50 border border-gray-700/50 shadow-inner">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleFilterChange('searchMode', 'smart')}
            className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium flex-1 transition-all ${
              activeFilters.searchMode === 'smart'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700/70'
            }`}
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Smart Search</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleFilterChange('searchMode', 'direct')}
            className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium flex-1 transition-all ${
              activeFilters.searchMode === 'direct'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700/70'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>Direct Title Search</span>
          </motion.button>
        </div>
        
        <p className="text-xs text-gray-400 mt-1.5">
          {activeFilters.searchMode === 'direct' 
            ? "Search by exact title to find specific movies and shows" 
            : "AI-powered search that understands what you're looking for"}
        </p>
      </div>
      
      {/* Filter Buttons */}
      <div className="mb-2">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Filters</h3>
        <div className="flex flex-wrap gap-2">
          {renderFilterButton('type', 'Type', <FilmIcon className="w-3.5 h-3.5" />)}
          {renderFilterButton('genre', 'Genre', <TagIcon className="w-3.5 h-3.5" />)}
          {renderFilterButton('time', 'Time', <ClockIcon className="w-3.5 h-3.5" />)}
          {renderFilterButton('releaseYear', 'Year', <CalendarIcon className="w-3.5 h-3.5" />)}
          {renderFilterButton('popularity', 'Popularity', <FireIcon className="w-3.5 h-3.5" />)}
          {renderFilterButton('contentType', 'Content', <ViewfinderCircleIcon className="w-3.5 h-3.5" />)}
        </div>
      </div>
      
      {/* Active Filters Summary */}
      {Object.entries(activeFilters).some(([key, value]) => 
        key !== 'searchMode' && 
        (
          (key === 'genre' && value !== 'diverse') || 
          (key === 'type' && value !== 'all') || 
          (key !== 'genre' && key !== 'type' && value !== 'any')
        )
      ) && (
        <div className="mt-3 bg-indigo-900/20 rounded-lg p-2 border border-indigo-800/30">
          <div className="flex items-center text-xs text-indigo-300">
            <AdjustmentsHorizontalIcon className="w-3.5 h-3.5 mr-1.5" />
            <span className="font-medium">Active filters:</span>
            <div className="flex-1 flex flex-wrap gap-1 ml-2">
              {Object.entries(activeFilters).map(([key, value]) => {
                if (key === 'searchMode') return null;
                if ((key === 'genre' && value === 'diverse') || 
                    (key === 'type' && value === 'all') || 
                    (key !== 'genre' && key !== 'type' && value === 'any')) {
                  return null;
                }
                
                return (
                  <span key={key} className="inline-flex items-center bg-indigo-800/70 text-indigo-200 rounded-full px-2 py-0.5">
                    {getActiveFilterLabel(key)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default FiltersSection;