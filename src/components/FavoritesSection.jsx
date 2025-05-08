import React from 'react';
import { HeartIcon, XMarkIcon, ArrowPathIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import MediaListSection from './MediaListSection';

const mapFavoritesItem = item => {
  if (!item?.mediaId) return null;
  return {
    id: item.mediaId,
    media_type: item.mediaType || 'movie',
    title: item.title,
    name: item.title,
    poster_path: item.posterPath || item.poster_path || null,
    backdrop_path: item.backdropPath || item.backdrop_path || null,
    release_date: item.releaseDate || item.firstAirDate || item.release_date || null,
    first_air_date: item.firstAirDate || item.releaseDate || item.first_air_date || item.release_date || null,
    vote_average: parseFloat(item.voteAverage || item.vote_average || 0),
    popularity: item.popularity || 0,
    genre_ids: Array.isArray(item.genreIds) ? item.genreIds : []
  };
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
      endpoint="/favourite"
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