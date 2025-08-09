import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PersonalizedRecommendations } from '../../../src/components/PersonalizedRecommendations';

// Mock the mediaCache service
jest.mock('../../../src/services/mediaCache', () => ({
  fetchCachedMedia: jest.fn()
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

  test('renders loading state initially', () => {
    render(
      <PersonalizedRecommendations
        currentUser={mockUser}
        isAuthenticated={true}
        propUserPreferences={null}
        propHasCompletedQuestionnaire={true}
        initialAppLoadComplete={true}
      />
    );

    expect(screen.getByText(/getting your personalized recommendations/i)).toBeInTheDocument();
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

    render(
      <PersonalizedRecommendations
        currentUser={mockUser}
        isAuthenticated={true}
        propUserPreferences={null}
        propHasCompletedQuestionnaire={true}
        initialAppLoadComplete={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  test('renders recommendations when loaded successfully', async () => {
    render(
      <PersonalizedRecommendations
        currentUser={mockUser}
        isAuthenticated={true}
        propUserPreferences={null}
        propHasCompletedQuestionnaire={true}
        initialAppLoadComplete={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });
  });

  test('handles content type filter changes', async () => {
    render(
      <PersonalizedRecommendations
        currentUser={mockUser}
        isAuthenticated={true}
        propUserPreferences={null}
        propHasCompletedQuestionnaire={true}
        initialAppLoadComplete={true}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });

    // Find and click a filter button (assuming there are filter buttons)
    const filterButtons = screen.queryAllByRole('button');
    if (filterButtons.length > 0) {
      fireEvent.click(filterButtons[0]);
      // Should trigger a new API call
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }
  });

  test('displays authentication prompt when not authenticated', () => {
    render(
      <PersonalizedRecommendations
        currentUser={null}
        isAuthenticated={false}
        propUserPreferences={null}
        propHasCompletedQuestionnaire={false}
        initialAppLoadComplete={true}
      />
    );

    expect(screen.getByText(/sign in to get personalized recommendations/i)).toBeInTheDocument();
  });
});