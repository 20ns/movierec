import React from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, ClockIcon, FilmIcon, TvIcon } from '@heroicons/react/24/solid';
import { FilterPill } from './FilterPill';

export const FiltersSection = ({ activeFilters, setActiveFilters }) => {
  const timePeriodOptions = [
    { value: 'any', label: 'Any Time', icon: <ClockIcon className="w-4 h-4 text-gray-400" /> },
    { value: 'recent', label: 'Recent', icon: <SparklesIcon className="w-4 h-4 text-yellow-400" /> },
    { value: 'classic', label: 'Classic', icon: <FilmIcon className="w-4 h-4 text-red-500" /> },
    { value: '90s00s', label: '90s/00s', icon: <TvIcon className="w-4 h-4 text-blue-400" /> }
  ];

  const genreOptions = [
    { value: 'diverse', label: 'Diverse Genres', icon: <SparklesIcon className="w-4 h-4 text-yellow-400" /> },
    { value: 'specific', label: 'Specific Genre', icon: <FilmIcon className="w-4 h-4 text-red-500" /> }
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types', icon: <TvIcon className="w-4 h-4 text-blue-400" /> },
    { value: 'movie', label: 'Movies', icon: <FilmIcon className="w-4 h-4 text-red-500" /> },
    { value: 'tv', label: 'TV Shows', icon: <TvIcon className="w-4 h-4 text-blue-400" /> }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scaleY: 0.9 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={{ opacity: 0, y: -20, scaleY: 0.9 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-4xl mb-6 space-y-4"
    >
      <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-gray-700">
        <div className="space-y-6">
          <FilterGroup
            title="Filter Results"
            icon={<SparklesIcon className="w-5 h-5 mr-2 text-yellow-400" />}
            options={genreOptions}
            filterKey="genre"
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
          />

          <FilterGroup
            title="Time Period"
            icon={<ClockIcon className="w-5 h-5 mr-2 text-gray-400" />}
            options={timePeriodOptions}
            filterKey="time"
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
          />

          <FilterGroup
            title="Media Type"
            icon={<TvIcon className="w-5 h-5 mr-2 text-blue-400" />}
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
  <div className="space-y-3">
    <h3 className="text-lg font-semibold text-gray-300 flex items-center">
      {icon}
      {title}
    </h3>
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <FilterPill
          key={option.value}
          active={activeFilters[filterKey] === option.value}
          onClick={() => setActiveFilters((prev) => ({ ...prev, [filterKey]: option.value }))}
          icon={option.icon}
        >
          {option.label}
        </FilterPill>
      ))}
    </div>
  </div>
);