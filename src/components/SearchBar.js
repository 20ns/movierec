import React, { useState } from 'react';
import axios from 'axios';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.trim() === '') return;

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
<div className="search-bar flex items-center justify-center mb-8">
  <form onSubmit={handleSearch} className="flex w-full max-w-2xl shadow-lg rounded-full overflow-hidden transform transition-transform duration-300 hover:scale-105">
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search for movies or TV shows..."
      className="flex-1 px-8 py-4 border-none focus:outline-none bg-gray-100 text-gray-800"
    />
    <button
      type="submit"
      className="px-10 py-4 bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
    >
      Search
    </button>
  </form>
  <div className="search-results grid grid-cols-3 gap-4 mt-8">
    {results.slice(0, 3).map((result) => (
      <div key={result.id} className="search-result p-4 border rounded-lg shadow-md bg-white">
        <img
          src={`https://image.tmdb.org/t/p/w500${result.poster_path}`}
          alt={result.title || result.name}
          className="w-full h-64 object-cover rounded-t-lg"
        />
        <h3 className="mt-2 text-lg font-semibold text-gray-900">{result.title || result.name}</h3>
        <p className="mt-1 text-gray-600">{result.overview}</p>
      </div>
    ))}
  </div>
</div>
  );
};

export default SearchBar;
