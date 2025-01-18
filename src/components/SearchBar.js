import React, { useState } from 'react';
import axios from 'axios';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.trim() === '') return;

    setIsSearching(true);

    try {
      const response = await axios.get('https://api.themoviedb.org/3/search/multi', {
        params: {
          api_key: 'b484a8d608caf759d5d575db3ec03bbc',
          query: query,
        },
      });
      setResults(response.data.results);
    } catch (error) {
      console.error('Error fetching search results:', error);
    }
  };

  return (
    <div>
      <div className={`search-bar ${isSearching ? 'fixed top-0 left-0 w-full bg-white shadow-md z-10' : 'flex items-center justify-center mb-8'}`}>
        <form onSubmit={handleSearch} className="flex w-full max-w-2xl mx-auto p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for movies or TV shows..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Search
          </button>
        </form>
      </div>
      <div className={`search-results ${isSearching ? 'mt-24' : 'mt-8'} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-4`}>
        {results.slice(0, 3).map((result) => (
          <div key={result.id} className="search-result p-4 border rounded-lg shadow-md bg-white transform transition-transform duration-300 hover:scale-105">
            <img
              src={`https://image.tmdb.org/t/p/w500${result.poster_path}`}
              alt={result.title || result.name}
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;
