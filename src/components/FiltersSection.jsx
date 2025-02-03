import React from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, ClockIcon, FilmIcon, TvIcon } from '@heroicons/react/24/solid';
import { FilterPill } from './FilterPill';

export const FiltersSection = ({ activeFilters, setActiveFilters }) => {
  const timePeriodOptions = [
    { value: 'any', label: 'Any Time', icon: <ClockIcon /> },
    { value: 'recent', label: 'Recent', icon: <SparklesIcon /> },
    { value: 'classic', label: 'Classic', icon: <FilmIcon /> },
    { value: '90s00s', label: '90s/00s', icon: <TvIcon /> }
  ];

  const genreOptions = [
    { value: 'diverse', label: 'Diverse Genres', icon: <SparklesIcon /> },
    { value: 'specific', label: 'Specific Genre', icon: <FilmIcon /> }
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types', icon: <TvIcon /> },
    { value: 'movie', label: 'Movies', icon: <FilmIcon /> },
    { value: 'tv', label: 'TV Shows', icon: <TvIcon /> }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
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