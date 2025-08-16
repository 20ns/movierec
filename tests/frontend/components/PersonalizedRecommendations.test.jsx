import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { PersonalizedRecommendations } from '../../../src/components/PersonalizedRecommendations';

// Mock the mediaCache service
jest.mock('../../../src/services/mediaCache', () => ({
  fetchCachedMedia: jest.fn()
}));

// Mock the preferenceService
jest.mock('../../../src/services/preferenceService', () => ({
  loadPreferences: jest.fn(() => Promise.resolve({
    success: true,
    preferences: { genres: ['Action', 'Comedy'] },
    hasCompletedQuestionnaire: true
  }))
}));

// Mock authService
jest.mock('../../../src/services/authService', () => ({
  fetchUserPreferences: jest.fn(() => Promise.resolve({
    success: true,
    preferences: { genres: ['Action', 'Comedy'] },
    hasCompletedQuestionnaire: true
  })),
  getCurrentAccessToken: jest.fn(() => Promise.resolve('mock-token'))
}));

// Mock utilities
jest.mock('../../../src/utils/tokenUtils', () => ({
  getUserId: jest.fn(() => Promise.resolve('test-user-123'))
}));

jest.mock('../../../src/utils/userDataMigration', () => ({
  migrateUserPreferences: jest.fn(),
  getUserEmailForMigration: jest.fn(),
  needsMigration: jest.fn(() => false)
}));

jest.mock('../../../src/utils/userDataValidator', () => ({
  validateUserPreferences: jest.fn(() => ({
    isValid: true,
    canGenerateRecommendations: true,
    missingEssential: [],
    userGuidance: 'Your profile is complete!'
  })),
  getUserGuidance: jest.fn(),
  shouldAttemptRecommendations: jest.fn(() => true)
}));

const mockUser = {
  userId: 'test-user-123',
  username: 'testuser'
};

const mockRecommendations = [
  {
    id: 1,
    title: 'Test Movie',
    poster_path: '/test-poster.jpg',
    vote_average: 8.5,
    overview: 'A test movie'
  }
];

describe('PersonalizedRecommendations', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock fetch for API calls
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          recommendations: mockRecommendations,
          totalCount: 1
        })
      })
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders loading state initially', async () => {
    await act(async () => {
      render(
        <PersonalizedRecommendations
          currentUser={mockUser}
          isAuthenticated={true}
          propUserPreferences={null}
          propHasCompletedQuestionnaire={true}
          initialAppLoadComplete={true}
        />
      );
    });

    // Component should render the recommendations section
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
  });

  test('displays error message when API fails', async () => {
    // Mock API failure
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      })
    );

    await act(async () => {
      render(
        <PersonalizedRecommendations
          currentUser={mockUser}
          isAuthenticated={true}
          propUserPreferences={null}
          propHasCompletedQuestionnaire={true}
          initialAppLoadComplete={true}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
    });
  });

  test('renders recommendations when loaded successfully', async () => {
    await act(async () => {
      render(
        <PersonalizedRecommendations
          currentUser={mockUser}
          isAuthenticated={true}
          propUserPreferences={{ genres: ['Action'] }}
          propHasCompletedQuestionnaire={true}
          initialAppLoadComplete={true}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
    });
  });

  test('handles content type filter changes', async () => {
    await act(async () => {
      render(
        <PersonalizedRecommendations
          currentUser={mockUser}
          isAuthenticated={true}
          propUserPreferences={{ genres: ['Action'] }}
          propHasCompletedQuestionnaire={true}
          initialAppLoadComplete={true}
        />
      );
    });

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
    });
  });

  test('displays authentication prompt when not authenticated', async () => {
    await act(async () => {
      render(
        <PersonalizedRecommendations
          currentUser={null}
          isAuthenticated={false}
          propUserPreferences={null}
          propHasCompletedQuestionnaire={false}
          initialAppLoadComplete={true}
        />
      );
    });

    // Component should not render anything when not authenticated
    expect(screen.queryByText('Recommendations')).not.toBeInTheDocument();
  });
});
