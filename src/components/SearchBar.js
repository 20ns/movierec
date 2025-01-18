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
          api_key: process.env.REACT_APP_TMDB_API_KEY,
          query: query,
        },
      });

      // Filter and sort results based on genre, characters, ratings, reviews, and publication date
      const filteredResults = response.data.results
        .filter(result => result.genre_ids && result.genre_ids.length > 0 && (result.title || result.name).toLowerCase() !== query.toLowerCase())
        .sort((a, b) => {
          const aScore = (a.vote_average || 0) + (a.popularity || 0);
          const bScore = (b.vote_average || 0) + (b.popularity || 0);
          return bScore - aScore;
        })
        .slice(0, 3);

      setResults(filteredResults);
    } catch (error) {
      console.error('Error fetching search results:', error);
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSearch} className="w-full max-w-2xl mx-4">
        <div className="flex w-full bg-white rounded-full shadow-lg">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for movies or TV shows..."
            className="flex-grow px-6 py-3 rounded-l-full focus:outline-none bg-transparent text-gray-800"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full focus:outline-none transition-colors duration-300"
          >
            Search
          </button>
        </div>
      </form>
      <div className="search-results">
        {results.map((result) => (
          <div key={result.id} className="result-item small-card">
            <img src={`https://image.tmdb.org/t/p/w500${result.poster_path}`} alt={result.title || result.name} className="w-full h-auto rounded-lg" />
            <h2 className="text-xl font-bold mt-2">{result.title || result.name}</h2>
            <p className="text-gray-600">Rating: {result.vote_average}</p>
            <p className="text-gray-600">Release Date: {new Date(result.release_date || result.first_air_date).getFullYear()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;
