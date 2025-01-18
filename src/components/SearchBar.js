import React, { useState } from 'react';
import axios from 'axios';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.trim() === '') return;

    setIsSearching(true);

    try {
      const response = await axios.get('https://api.themoviedb.org/3/search/multi', {
        params: {
          api_key: process.env.REACT_APP_TMDB_API_KEY,
          query: query,
        },
      });
      const searchResults = response.data.results.filter(result => result.poster_path);

      if (searchResults.length > 0) {
        const recommendations = await getRecommendations(searchResults[0]);
        setRecommendations(recommendations);
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
    }
  };

  const getRecommendations = async (item) => {
    try {
      const response = await axios.get(`https://api.themoviedb.org/3/${item.media_type}/${item.id}/recommendations`, {
        params: {
          api_key: process.env.REACT_APP_TMDB_API_KEY,
        },
      });
      return response.data.results.slice(0, 3);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className={`search-bar ${isSearching ? 'fixed top-0 left-0 w-full bg-white shadow-md z-10' : 'flex items-center justify-center mb-8'}`}>
        <form onSubmit={handleSearch} className="flex w-full max-w-2xl mx-auto p-4 bg-white rounded-full shadow-lg overflow-hidden transform transition-transform duration-300 hover:scale-105">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for movies or TV shows..."
            className="flex-1 px-6 py-4 border-none focus:outline-none bg-gray-100 text-gray-800"
          />
          <button
            type="submit"
            className="px-8 py-4 bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
          >
            Search
          </button>
        </form>
      </div>
      {recommendations.length > 0 && (
        <div className="recommendations mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 p-4">
            {recommendations.map((recommendation) => (
              <div key={recommendation.id} className="recommendation p-4 bg-white rounded-2xl shadow-xl overflow-hidden transform transition-transform duration-300 hover:scale-105">
                <img
                  src={`https://image.tmdb.org/t/p/w500${recommendation.poster_path}`}
                  alt={recommendation.title || recommendation.name}
                  className="w-full h-96 object-cover rounded-t-2xl transition-transform duration-300 transform hover:scale-110"
                />
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900">{recommendation.title || recommendation.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
