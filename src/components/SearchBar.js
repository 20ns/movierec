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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className={`transition-all duration-500 ${isSearching ? 'fixed top-0 left-0 w-full bg-white shadow-md z-10' : 'mb-8'}`}>
        <form onSubmit={handleSearch} className="flex max-w-2xl mx-auto p-2 rounded-full shadow-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 bg-white">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for movies or TV shows..."
            className="flex-grow px-4 py-2 focus:outline-none bg-transparent text-gray-800"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none transition-colors duration-300"
          >
            Search
          </button>
        </form>
      </div>
      {recommendations.length > 0 && (
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
            {recommendations.map((recommendation) => (
              <div key={recommendation.id} className="bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-300 hover:scale-105">
                <img
                  src={`https://image.tmdb.org/t/p/w500${recommendation.poster_path}`}
                  alt={recommendation.title || recommendation.name}
                  className="w-full h-80 object-cover rounded-t-lg transition-transform duration-300 transform hover:scale-110"
                />
                <div className="p-4">
                  <h3 className="font-bold text-xl mb-2">{recommendation.title || recommendation.name}</h3>
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
