import React, { useState } from 'react';
import axios from 'axios';
import './styles.css';

const MovieAndTVRecommendation = () => {
    const [genre, setGenre] = useState('');
    const [recommendations, setRecommendations] = useState([]);
    const [movieTitle, setMovieTitle] = useState('');
    const [tvShowTitle, setTvShowTitle] = useState('');
    const [movieRecommendations, setMovieRecommendations] = useState([]);
    const [tvRecommendations, setTvRecommendations] = useState([]);
    const [error, setError] = useState('');
    const [activeSlide, setActiveSlide] = useState(0);

    const genreMap = {
        Action: 28,
        Adventure: 12,
        Animation: 16,
        Comedy: 35,
        Crime: 80,
        Documentary: 99,
        Drama: 18,
        Family: 10751,
        Fantasy: 14,
        History: 36,
        Horror: 27,
        Music: 10402,
        Mystery: 9648,
        Romance: 10749,
        Science: 878,
        TV: 10770,
        Thriller: 53,
        War: 10752,
        Western: 37
    };

    // Declare the fetch functions first
    const fetchRecommendations = async () => {
        setError('');
        try {
            const genreId = genreMap[genre];
            if (!genreId) {
                setError('Invalid genre. Please enter a valid genre name.');
                return;
            }
            const response = await axios.get(`http://localhost:5000/recommend/${genreId}`);
            console.log("Response data:", response.data);
            setRecommendations(response.data);
        } catch (error) {
            console.error("Error fetching recommendations:", error);
            setError('Failed to fetch recommendations. Please try again.');
        }
    };

    const fetchMovieRecommendations = async () => {
        try {
            const response = await axios.post('http://localhost:5000/recommend/movie', { movie_title: movieTitle });
            setMovieRecommendations(response.data);
            setError('');
        } catch (error) {
            console.error("Error fetching movie recommendations:", error);
            setError('Failed to fetch movie recommendations. Please try again.');
        }
    };

    const fetchTVRecommendations = async () => {
        try {
            const response = await axios.post('http://localhost:5000/recommend/tv', { tv_show_title: tvShowTitle });
            setTvRecommendations(response.data);
            setError('');
        } catch (error) {
            console.error("Error fetching TV show recommendations:", error);
            setError('Failed to fetch TV show recommendations. Please try again.');
        }
    };

    const slides = [
        {
            title: 'Find Similar Movies',
            inputPlaceholder: 'Enter movie title',
            onClick: fetchMovieRecommendations,
            recommendations: movieRecommendations
        },
        {
            title: 'Find Similar TV Shows',
            inputPlaceholder: 'Enter TV show title',
            onClick: fetchTVRecommendations,
            recommendations: tvRecommendations
        },
        {
            title: 'Find Movies by Genre',
            inputPlaceholder: 'Enter movie genre',
            onClick: fetchRecommendations,
            recommendations: recommendations
        }
    ];

    const handleNextSlide = () => {
        setActiveSlide((prevSlide) => (prevSlide + 1) % slides.length);
    };

    const handlePrevSlide = () => {
        setActiveSlide((prevSlide) => (prevSlide - 1 + slides.length) % slides.length);
    };

    return (
        <div>
            <h1>Movie and TV Show Recommendations</h1>
            <div className="slideshowcontainer">
                <div className="middle">
                    <h2>{slides[activeSlide].title}</h2>
                    <input
                        type="text"
                        value={
                            activeSlide === 0 ? movieTitle :
                            activeSlide === 1 ? tvShowTitle : genre
                        }
                        onChange={(e) => {
                            if (activeSlide === 0) setMovieTitle(e.target.value);
                            else if (activeSlide === 1) setTvShowTitle(e.target.value);
                            else setGenre(e.target.value);
                        }}
                        placeholder={slides[activeSlide].inputPlaceholder}
                    />
                    <button onClick={slides[activeSlide].onClick}>
                        Get Recommendations
                    </button>
                    {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display error message */}
                    <ul>
                        {slides[activeSlide].recommendations.map((item) => (
                            <li key={item.id}>
                                {item.title || item.name} - Rating: {item.vote_average}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="navigation">
                    <button className="prev" onClick={handlePrevSlide}>Previous</button>
                    <button className="next" onClick={handleNextSlide}>Next</button>
                </div>
            </div>
        </div>
    );
};

export default MovieAndTVRecommendation;
