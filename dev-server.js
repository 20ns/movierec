const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Enable CORS for localhost:3000
app.use(cors({
  origin: ['http://localhost:3000', 'https://movierec.net', 'https://www.movierec.net'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token', 'Accept', 'Origin', 'X-Requested-With']
}));

app.use(express.json());

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  // For development, just set a mock user
  req.user = { sub: 'dev-user-123', email: 'dev@example.com' };
  next();
};

// Mock recommendations endpoint
app.get('/dev/recommendations', mockAuth, (req, res) => {
  console.log('Mock recommendations endpoint called');
  res.json({
    items: [
      {
        mediaId: "299534",
        mediaType: "movie",
        title: "Avengers: Endgame",
        overview: "After the devastating events of Avengers: Infinity War, the universe is in ruins.",
        posterPath: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
        backdropPath: "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
        voteAverage: 8.3,
        releaseDate: "2019-04-24",
        popularity: 200.35,
        genres: "Action|Adventure|Science Fiction",
        genre: "Action",
        recommendationScore: 100,
        matchReason: "Popular blockbuster"
      }
    ],
    source: 'dev_mock'
  });
});

// Mock other endpoints
app.get('/dev/user/preferences', mockAuth, (req, res) => {
  res.json({ preferences: {} });
});

app.post('/dev/user/preferences', mockAuth, (req, res) => {
  res.json({ success: true });
});

app.get('/dev/user/favourites', mockAuth, (req, res) => {
  res.json({ items: [] });
});

app.post('/dev/user/favourites', mockAuth, (req, res) => {
  res.json({ success: true });
});

app.get('/dev/user/watchlist', mockAuth, (req, res) => {
  res.json({ items: [] });
});

app.post('/dev/user/watchlist', mockAuth, (req, res) => {
  res.json({ success: true });
});

app.get('/dev/media', mockAuth, (req, res) => {
  res.json({ items: [] });
});

// Auth endpoints
app.post('/dev/auth/signin', (req, res) => {
  res.json({ token: 'mock-token', user: { sub: 'dev-user-123' } });
});

app.post('/dev/auth/signup', (req, res) => {
  res.json({ success: true });
});

app.post('/dev/auth/refresh', (req, res) => {
  res.json({ token: 'mock-refreshed-token' });
});

// Handle preflight requests
app.options('*', (req, res) => {
  res.sendStatus(204);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Development API server running on http://localhost:${PORT}`);
  console.log(`📝 Serving mock endpoints for local development`);
});