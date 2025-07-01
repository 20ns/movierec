import React from 'react';
import { HeartIcon, XMarkIcon, ArrowPathIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import MediaListSection from './MediaListSection';

const mapFavoritesItem = item => {
  console.log('🔍 [mapFavoritesItem] Processing item:', item);
  if (!item?.mediaId) {
    console.log('⚠️ [mapFavoritesItem] No mediaId found, skipping item');
    return null;
  }
  
  // Handle poster_path properly - treat empty string as missing data
  const posterPath = item.posterPath || item.poster_path;
  const hasPoster = posterPath && posterPath.trim() !== '';
  
  const mapped = {
    id: item.mediaId,
    media_type: item.mediaType || 'movie',
    title: item.title,
    name: item.title,
    poster_path: hasPoster ? posterPath : null,
    backdrop_path: item.backdropPath || item.backdrop_path || null,
    release_date: item.releaseDate || item.firstAirDate || item.release_date || null,
    first_air_date: item.firstAirDate || item.releaseDate || item.first_air_date || item.release_date || null,
    vote_average: parseFloat(item.voteAverage || item.vote_average || 0),
    popularity: item.popularity || 0,
    genre_ids: Array.isArray(item.genreIds) ? item.genreIds : [],
    // Flag to indicate this needs poster data fetched
    needsPosterFetch: !hasPoster
  };
  console.log('🔍 [mapFavoritesItem] Mapped result:', mapped);
  return mapped;
};

export default function FavoritesSection(props) {
  return (
    <MediaListSection
      title="Your Favorites"
      IconEmpty={<HeartIcon className="h-8 w-8 text-gray-400" />}
      inHeader={props.inHeader}
      isOpen={props.isOpen}
      currentUser={props.currentUser}
      isAuthenticated={props.isAuthenticated}
      cacheKey="user_favorites_cache"
      endpoint="/user/favourites"
      mapItem={mapFavoritesItem}
      eventKey="favorites-updated"
      cardPropsFactory={item => ({
        result: item,
        currentUser: props.currentUser,
        isMiniCard: props.inHeader,
        fromFavorites: true,
        initialIsFavorited: true,
        onFavoriteToggle: () => props.onClose && props.onClose(item.id),
        icons: {
          sort: <ArrowsUpDownIcon className="h-5 w-5" />,
          refresh: <ArrowPathIcon className="h-5 w-5" />,
          close: <XMarkIcon className="h-5 w-5" />
        },
        emptyText: 'Browse movies and shows and click the heart icon to add them to your favorites',
        onClose: props.onClose
      })}
    />
  );
}