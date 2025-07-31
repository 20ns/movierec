/**
 * Comprehensive tests for userDataPreComputer
 * Tests all edge cases to ensure no UI flicker occurs
 */

import {
  preComputeUserDataState,
  createTransitionState,
  isValidTransition,
  hasSignificantDataChange,
  UI_STATES,
  USER_DATA_STATES
} from '../userDataPreComputer';

describe('userDataPreComputer', () => {
  const mockUserId = 'test-user-123';

  const mockMinimalPreferences = {
    questionnaireCompleted: true,
    contentType: 'both',
    genreRatings: {
      '28': 8,  // Action
      '35': 7,  // Comedy  
      '18': 9   // Drama
    }
  };

  const mockExcellentPreferences = {
    ...mockMinimalPreferences,
    favoriteContent: 'The Matrix, Inception, Interstellar',
    moodPreferences: ['energetic', 'thoughtful'],
    dealBreakers: ['violence'],
    internationalContentPreference: 'veryOpen'
  };

  const mockInsufficientPreferences = {
    contentType: 'both',
    genreRatings: {
      '28': 8  // Only 1 genre rating (need 3+)
    }
  };

  describe('preComputeUserDataState', () => {
    test('should return INITIALIZING state when not authenticated', () => {
      const result = preComputeUserDataState(
        mockExcellentPreferences,
        true,
        false, // not authenticated
        true,
        mockUserId
      );

      expect(result.initialUIState).toBe(UI_STATES.SHOW_BANNER);
      expect(result.shouldFetchRecommendations).toBe(false);
      expect(result.reasoning).toContain('not authenticated');
    });

    test('should return INITIALIZING state when app not loaded', () => {
      const result = preComputeUserDataState(
        mockExcellentPreferences,
        true,
        true,
        false, // app not loaded
        mockUserId
      );

      expect(result.initialUIState).toBe(UI_STATES.INITIALIZING);
      expect(result.reasoning).toContain('still loading');
    });

    test('should return SHOW_LOADING for sufficient data', () => {
      const result = preComputeUserDataState(
        mockMinimalPreferences,
        true,
        true,
        true,
        mockUserId
      );

      expect(result.initialUIState).toBe(UI_STATES.SHOW_LOADING);
      expect(result.shouldFetchRecommendations).toBe(true);
      expect(result.shouldShowLoading).toBe(true);
      expect(result.canGenerateRecommendations).toBe(true);
      expect(result.userDataState).toBe(USER_DATA_STATES.SUFFICIENT);
    });

    test('should return SHOW_LOADING for excellent data', () => {
      const result = preComputeUserDataState(
        mockExcellentPreferences,
        true,
        true,
        true,
        mockUserId
      );

      expect(result.initialUIState).toBe(UI_STATES.SHOW_LOADING);
      expect(result.shouldFetchRecommendations).toBe(true);
      expect(result.userDataState).toBe(USER_DATA_STATES.EXCELLENT);
      expect(result.confidence).toBeGreaterThan(90);
    });

    test('should return SHOW_BANNER for insufficient data', () => {
      const result = preComputeUserDataState(
        mockInsufficientPreferences,
        false,
        true,
        true,
        mockUserId
      );

      expect(result.initialUIState).toBe(UI_STATES.SHOW_BANNER);
      expect(result.shouldFetchRecommendations).toBe(false);
      expect(result.shouldShowBanner).toBe(true);
      expect(result.canGenerateRecommendations).toBe(false);
      expect(result.userDataState).toBe(USER_DATA_STATES.INSUFFICIENT);
    });

    test('should handle empty preferences gracefully', () => {
      const result = preComputeUserDataState(
        {},
        false,
        true,
        true,
        mockUserId
      );

      expect(result.initialUIState).toBe(UI_STATES.SHOW_BANNER);
      expect(result.shouldFetchRecommendations).toBe(false);
      expect(result.userDataState).toBe(USER_DATA_STATES.INSUFFICIENT);
    });

    test('should handle null preferences gracefully', () => {
      const result = preComputeUserDataState(
        null,
        false,
        true,
        true,
        mockUserId
      );

      expect(result.initialUIState).toBe(UI_STATES.SHOW_BANNER);
      expect(result.shouldFetchRecommendations).toBe(false);
    });

    test('should use localStorage as fallback when props empty', () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: jest.fn(() => JSON.stringify(mockMinimalPreferences))
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      });

      const result = preComputeUserDataState(
        null, // no prop preferences
        true,
        true,
        true,
        mockUserId
      );

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(`userPrefs_${mockUserId}`);
      expect(result.initialUIState).toBe(UI_STATES.SHOW_LOADING);
      expect(result.shouldFetchRecommendations).toBe(true);
    });
  });

  describe('UI state transitions', () => {
    test('should allow valid transitions', () => {
      expect(isValidTransition(UI_STATES.INITIALIZING, UI_STATES.SHOW_LOADING)).toBe(true);
      expect(isValidTransition(UI_STATES.INITIALIZING, UI_STATES.SHOW_BANNER)).toBe(true);
      expect(isValidTransition(UI_STATES.SHOW_LOADING, UI_STATES.SHOW_RECOMMENDATIONS)).toBe(true);
      expect(isValidTransition(UI_STATES.SHOW_LOADING, UI_STATES.SHOW_ERROR)).toBe(true);
    });

    test('should reject invalid transitions', () => {
      expect(isValidTransition(UI_STATES.SHOW_RECOMMENDATIONS, UI_STATES.INITIALIZING)).toBe(false);
      expect(isValidTransition(UI_STATES.SHOW_BANNER, UI_STATES.SHOW_RECOMMENDATIONS)).toBe(false);
    });

    test('should create transition state objects', () => {
      const transition = createTransitionState(
        UI_STATES.INITIALIZING,
        UI_STATES.SHOW_LOADING,
        'User data sufficient'
      );

      expect(transition.from).toBe(UI_STATES.INITIALIZING);
      expect(transition.to).toBe(UI_STATES.SHOW_LOADING);
      expect(transition.reason).toBe('User data sufficient');
      expect(transition.isTransitioning).toBe(true);
      expect(typeof transition.timestamp).toBe('number');
    });
  });

  describe('Data change detection', () => {
    test('should detect significant changes in questionnaire completion', () => {
      const previous = { ...mockInsufficientPreferences, questionnaireCompleted: false };
      const current = { ...mockInsufficientPreferences, questionnaireCompleted: true };

      expect(hasSignificantDataChange(previous, current)).toBe(true);
    });

    test('should detect significant changes in genre ratings count', () => {
      const previous = { genreRatings: { '28': 8 } };
      const current = { genreRatings: { '28': 8, '35': 7, '18': 9, '80': 6 } };

      expect(hasSignificantDataChange(previous, current)).toBe(true);
    });

    test('should not detect minor changes', () => {
      const previous = { ...mockMinimalPreferences };
      const current = { ...mockMinimalPreferences, someOtherField: 'changed' };

      expect(hasSignificantDataChange(previous, current)).toBe(false);
    });

    test('should handle null/undefined comparisons', () => {
      expect(hasSignificantDataChange(null, mockMinimalPreferences)).toBe(true);
      expect(hasSignificantDataChange(mockMinimalPreferences, null)).toBe(true);
      expect(hasSignificantDataChange(null, null)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    test('should handle nested preferences structure', () => {
      const nestedPrefs = {
        preferences: mockMinimalPreferences,
        someOtherData: 'value'
      };

      const result = preComputeUserDataState(
        nestedPrefs,
        true,
        true,
        true,
        mockUserId
      );

      expect(result.shouldFetchRecommendations).toBe(true);
      expect(result.initialUIState).toBe(UI_STATES.SHOW_LOADING);
    });

    test('should handle corrupted localStorage gracefully', () => {
      const mockLocalStorage = {
        getItem: jest.fn(() => 'invalid json')
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      });

      const result = preComputeUserDataState(
        null,
        false,
        true,
        true,
        mockUserId
      );

      expect(result.initialUIState).toBe(UI_STATES.SHOW_BANNER);
      expect(result.shouldFetchRecommendations).toBe(false);
    });

    test('should prioritize props over localStorage', () => {
      const mockLocalStorage = {
        getItem: jest.fn(() => JSON.stringify(mockInsufficientPreferences))
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      });

      const result = preComputeUserDataState(
        mockExcellentPreferences, // props should win
        true,
        true,
        true,
        mockUserId
      );

      expect(result.userDataState).toBe(USER_DATA_STATES.EXCELLENT);
      expect(result.shouldFetchRecommendations).toBe(true);
    });
  });
});