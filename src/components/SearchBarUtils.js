import axios from 'axios';
import { cacheAdapterEnhancer } from 'axios-extensions';

export const hexToRgb = (hex) => {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
};

export const getGenreColor = (genreIds = []) => {
    const genreColors = {
        28: '#7f1d1d',   12: '#14532d',   16: '#713f12',
        35: '#4c1d95',   80: '#1e293b',   18: '#1e3a8a',
        10751: '#134e4a', 14: '#581c87',  27: '#3c1513',
        9648: '#312e81', 10749: '#831843', 878: '#0c4a6e',
        default: '#1e1b4b'
    };
    
    const firstGenre = genreIds[0] || 'default';
    const hexColor = genreColors[firstGenre] || genreColors.default;
    return hexToRgb(hexColor);
};

export const getSocialProof = (item) => {
    const MOCK_SOCIAL_DATA = {
        603: { friendsWatched: 12, friendsLiked: 11 },
        238: { friendsWatched: 8, friendsLiked: 7 },
    };
    return MOCK_SOCIAL_DATA[item.id] || { friendsWatched: 0, friendsLiked: 0 };
};

export const axiosInstance = axios.create({
  headers: { 'Cache-Control': 'no-cache' },
  adapter: cacheAdapterEnhancer(axios.defaults.adapter, { enabledByDefault: true, cacheFlag: 'useCache' })
});


export const fetchWithRetry = async (url, params, retries = 2) => {
  try {
    return await axiosInstance.get(url, { params, useCache: true });
  } catch (error) {
    if (retries > 0) return fetchWithRetry(url, params, retries - 1);
    throw error;
  }
};

export const fetchEnhancedRecommendations = async (primaryResult) => {
  if (!primaryResult?.media_type || !primaryResult?.id) {
    console.error('Invalid primary result:', primaryResult);
    return [];
  }

  try {
    if (!primaryResult || !primaryResult.media_type) {
      console.error('Error: primaryResult or primaryResult.media_type is missing:', primaryResult);
      return [];
    }

    const mediaType = primaryResult.media_type;
    const mediaId = primaryResult.id;
    const apiKey = process.env.REACT_APP_TMDB_API_KEY;

    if (!['movie', 'tv'].includes(mediaType)) {
      console.error('Error: Invalid mediaType:', mediaType);
      return [];
    }

    const detailsResponse = await fetchWithRetry(
      `https://api.themoviedb.org/3/${mediaType}/${mediaId}`,
      { api_key: apiKey, append_to_response: 'keywords,credits' }
    );

    const keywords = mediaType === 'movie'
      ? detailsResponse.data.keywords?.keywords?.map(k => k.id) || []
      : detailsResponse.data.keywords?.results?.map(k => k.id) || [];

    const targetDetails = {
      genres: detailsResponse.data.genres.map(g => g.id),
      keywords: keywords,
      director: detailsResponse.data.credits.crew.find(c => c.job === 'Director')?.id,
      cast: detailsResponse.data.credits.cast.slice(0, 5).map(c => c.id),
      analysis: { mood: 'neutral', themes: [] }
    };

    const similarMediaPromises = [];

    similarMediaPromises.push(
      fetchWithRetry(
        `https://api.themoviedb.org/3/${mediaType}/${mediaId}/similar`,
        { api_key: apiKey }
      )
    );

    const crossMediaType = mediaType === 'movie' ? 'tv' : 'movie';
    similarMediaPromises.push(
      fetchWithRetry(
        `https://api.themoviedb.org/3/discover/${crossMediaType}`,
        {
          api_key: apiKey,
          with_genres: targetDetails.genres.join(','),
          sort_by: 'popularity.desc',
          page: 1
        }
      )
    );

    const crossMediaResponses = await Promise.allSettled(similarMediaPromises);

    const combinedResults = crossMediaResponses.reduce((acc, response, index) => {
      if (response.status === 'fulfilled') {
        const resultsWithType = response.value.data.results.map(result => ({
          ...result,
          media_type: index === 0 ? mediaType : crossMediaType
        }));
        acc.push(...resultsWithType);
      }
      return acc;
    }, []);


    if (detailsResponse.data.similar?.results) {
      const similarWithType = detailsResponse.data.similar.results.map(result => ({
        ...result,
        media_type: mediaType
      }));
      combinedResults.push(...similarWithType);
    }

    const uniqueResults = combinedResults
      .filter((item) => item.id && item.media_type)
      .filter((item, index, self) =>
        self.findIndex(t => t.id === item.id) === index &&
        item.id !== mediaId
    );

    let scoredResults = uniqueResults
        .map(item => {
            const scoringResult = calculateMatchScore(item, targetDetails);
            return {
                ...item,
                score: scoringResult.score,
                scoreReasons: scoringResult.reasons
            };
        })
        .sort((a, b) => b.score - a.score);


    let finalResults = [];
    const seenGenres = new Set();
    for (const result of scoredResults) {
        const mainGenre = result.genre_ids[0];
        if (!seenGenres.has(mainGenre)) {
            finalResults.push(result);
            seenGenres.add(mainGenre);
        } else {
            finalResults.push(result);
        }
        if (finalResults.length >= 9) break;
    }

    return finalResults.slice(0, 9);

  } catch (error) {
    console.error('Recommendation engine error:', error);
    console.log('Error details in fetchEnhancedRecommendations:', error.message, error.response);
    return [];
  }
};

export const calculateMatchScore = (item, targetDetails) => {
  let score = 0;
  const reasons = [];

  const genreMatches = item.genre_ids.filter(id =>
    targetDetails.genres.includes(id)
  ).length;
  if (genreMatches > 0) {
    reasons.push(`Matched ${genreMatches} genres`);
  }
  score += genreMatches * 5;

  const keywordMatches = item.keywords?.filter(keyword =>
    targetDetails.keywords.includes(keyword)
  ).length || 0;
  if (keywordMatches > 0) {
    reasons.push(`Matched ${keywordMatches} keywords`);
  }
  score += keywordMatches * 3;

  const castMatches = item.cast?.filter(actorId =>
    targetDetails.cast.includes(actorId)
  ).length || 0;
  if (castMatches > 0) {
    reasons.push(`Matched cast`);
  }
  score += castMatches * 2;

  if (targetDetails.director && item.crew?.some(c => c.id === targetDetails.director)) {
    if (targetDetails.director) reasons.push(`Directed by target director`);
    score += 4;
  }

  const currentYear = new Date().getFullYear();
  const releaseYear = new Date(
    item.release_date || item.first_air_date || currentYear
  ).getFullYear();
  if (currentYear - releaseYear <= 5) {
    reasons.push(`Recent release (${releaseYear})`);
  }
  score += (currentYear - releaseYear <= 5) ? 3 : 0;

  score += Math.min(Math.floor((item.popularity || 0) / 20), 5);
  if (Math.floor((item.popularity || 0) / 20) > 0) reasons.push(`Popularity boost`);
  score += (item.vote_average || 0) * 2.5;
  if ((item.vote_average || 0) > 3) reasons.push(`High vote average`);

  const uniqueGenres = new Set(item.genre_ids).size;
  score += Math.min(uniqueGenres, 3);
  if (uniqueGenres > 1) reasons.push(`Genre diversity`);

  const viewingHistory = JSON.parse(localStorage.getItem('viewingHistory') || '[]');
  const similarTastes = viewingHistory.filter(h =>
    h.genre_ids?.some(g => item.genre_ids.includes(g))
  ).length;
  score += similarTastes * 2;
  if (similarTastes > 0) reasons.push(`Similar tastes boost`);

  const CREW_WEIGHTS = {
    Director: 5,
    'Original Music Composer': 3,
    'Director of Photography': 2
  };

  const creativeTeamScore = item.credits?.crew?.reduce((crewScore, member) => {
    return crewScore + (CREW_WEIGHTS[member.job] || 0);
  }, 0) || 0;
  score += creativeTeamScore;
  if (creativeTeamScore > 0) reasons.push(`Creative team boost`);

  const getSeasonalBoost = () => {
    const month = new Date().getMonth();
    const seasonalGenres = {
      11: [10751, 18],
      0: [18, 9648],
      9: [27, 53],
      6: [12, 14]
    };
    return seasonalGenres[month] || [];
  };

  if (item.genre_ids.some(g => getSeasonalBoost().includes(g))) {
    reasons.push(`Seasonal recommendation`);
  }
  score += item.genre_ids.some(g => getSeasonalBoost().includes(g)) ? 3 : 0;

  const isClassic = (releaseYear) => {
    const currentYear = new Date().getFullYear();
    const anniversaries = [5, 10, 15, 20, 25, 30, 40, 50];
    return anniversaries.some(y => (currentYear - releaseYear) % y === 0);
  };

  if (isClassic(releaseYear)) {
    reasons.push(`Classic film anniversary`);
  }
  score += isClassic(releaseYear) ? 2 : 0;

  return { score: Math.min(Math.round(score), 100), reasons };
};

export const analyzeContent = async (text) => {
  try {
    const response = await axios.post('/api/analyze', { text });
    return {
      mood: response.data.mood,
      themes: response.data.themes
    };
  } catch (error) {
    return { mood: 'neutral', themes: [] };
  }
};

export const getWildcardRecommendation = async () => {
  const { data } = await axios.get(
    'https://api.themoviedb.org/3/discover/movie',
    {
      params: {
        api_key: process.env.REACT_APP_TMDB_API_KEY,
        sort_by: 'vote_average.desc',
        'vote_count.gte': 5000,
        with_original_language: 'en',
        page: Math.floor(Math.random() * 100) + 1
      }
    }
  );
  return data.results[Math.floor(Math.random() * data.results.length)];
};