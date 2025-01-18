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
    <div className="search-bar">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for movies or TV shows..."
        />
        <button type="submit">Search</button>
      </form>
<div className="search-results grid grid-cols-3 gap-4">
  {results.slice(0, 3).map((result) => (
    <div key={result.id} className="search-result p-4 border rounded-lg shadow-md">
      <img
        src={`https://image.tmdb.org/t/p/w500${result.poster_path}`}
        alt={result.title || result.name}
        className="w-full h-64 object-cover rounded-t-lg"
      />
      <h3 className="mt-2 text-lg font-semibold">{result.title || result.name}</h3>
      <p className="mt-1 text-gray-600">{result.overview}</p>
    </div>
  ))}
</div>
    </div>
  );
};

export default SearchBar;
