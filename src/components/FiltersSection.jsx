import React from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, ClockIcon, FilmIcon, TvIcon } from '@heroicons/react/24/solid';
import { FilterPill } from './FilterPill';

export const FiltersSection = ({ activeFilters, setActiveFilters }) => {
  const timePeriodOptions = [
    { value: 'any', label: 'Any Time', icon: <ClockIcon className="w-4 h-4" /> },
    { value: 'recent', label: 'Recent', icon: <SparklesIcon className="w-4 h-4" /> },
    { value: 'classic', label: 'Classic', icon: <FilmIcon className="w-4 h-4" /> },
    { value: '90s00s', label: '90s/00s', icon: <TvIcon className="w-4 h-4" /> }
  ];

  const genreOptions = [
    { value: 'diverse', label: 'Diverse Genres', icon: <SparklesIcon className="w-4 h-4" /> },
    { value: 'specific', label: 'Specific Genre', icon: <FilmIcon className="w-4 h-4" /> }
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types', icon: <TvIcon className="w-4 h-4" /> },
    { value: 'movie', label: 'Movies', icon: <FilmIcon className="w-4 h-4" /> },
    { value: 'tv', label: 'TV Shows', icon: <TvIcon className="w-4 h-4" /> }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scaleY: 0.9 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={{ opacity: 0, y: -20, scaleY: 0.9 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-4xl mb-6 space-y-4"
    >
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 shadow-lg border border-indigo-100">
        <div className="space-y-4">
          <FilterGroup 
            title="Filter Results" 
            icon={<SparklesIcon className="w-4 h-4 mr-2" />}
            options={genreOptions}
            filterKey="genre"
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
          />

          <FilterGroup
            title="Time Period"
            icon={<ClockIcon className="w-4 h-4 mr-2" />}
            options={timePeriodOptions}
            filterKey="time"
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
          />

          <FilterGroup
            title="Media Type"
            icon={<TvIcon className="w-4 h-4 mr-2" />}
            options={typeOptions}
            filterKey="type"
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
          />
        </div>
      </div>
    </motion.div>
  );
};

const FilterGroup = ({ title, icon, options, filterKey, activeFilters, setActiveFilters }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-semibold text-indigo-500 mb-2 flex items-center">
      {icon}
      {title}
    </h3>
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <FilterPill
          key={option.value}
          active={activeFilters[filterKey] === option.value}
          onClick={() => setActiveFilters(prev => ({ ...prev, [filterKey]: option.value }))}
          icon={option.icon}
        >
          {option.label}
        </FilterPill>
      ))}
    </div>
  </div>
);