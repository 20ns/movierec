// src/AppRoutes.js
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AuthPage from './auth/authPage.jsx';
import OnboardingQuestionnaire from './components/OnboardingQuestionnaire';
import LandingPage from './components/LandingPage';

// This component defines the application's routes.
// It receives necessary state and handlers as props from AppContent.
function AppRoutes({
  isAuthenticated,
  initialAppLoadComplete,
  currentUser,
  handleCustomSigninSuccess,
  handleQuestionnaireComplete,
  handleSignInClick, // For LandingPage
  handleSignUpClick, // For LandingPage
  renderMainContent, // Function to render the main dashboard/home content
  userPreferences, // Pass for Onboarding
  handlePreferencesUpdated, // Pass for Onboarding
  hasBasicPreferencesOnly, // Pass for Onboarding
}) {
  const location = useLocation(); // Needed for redirect state

  // Render loading state or null until initial auth check is complete
  if (!initialAppLoadComplete) {
    // Optional: Could render a full-page spinner here instead of null
    return null;
  }

  return (
    <Routes>
      {/* Authentication Routes */}
      <Route
        path="/auth"
        element={
          !isAuthenticated ? (
            <AuthPage onSignupSuccess={handleCustomSigninSuccess} onSigninSuccess={handleCustomSigninSuccess} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/signup"
        element={
          !isAuthenticated ? (
            <AuthPage onSignupSuccess={handleCustomSigninSuccess} onSigninSuccess={handleCustomSigninSuccess} initialMode="signup" />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/signin"
        element={
          !isAuthenticated ? (
            <AuthPage onSignupSuccess={handleCustomSigninSuccess} onSigninSuccess={handleCustomSigninSuccess} initialMode="signin" />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Onboarding Route */}
      <Route
        path="/onboarding"
        element={
          isAuthenticated ? (
            <div className="min-h-screen flex items-center justify-center p-4">
              {/* Pass necessary props to OnboardingQuestionnaire */}
              <OnboardingQuestionnaire
                currentUser={currentUser}
                onComplete={handleQuestionnaireComplete}
                existingPreferences={userPreferences}
                onPreferencesUpdated={handlePreferencesUpdated}
                skipBasicQuestions={hasBasicPreferencesOnly}
              />
            </div>
          ) : (
            // Redirect to signin if trying to access onboarding while logged out
            <Navigate to="/signin" replace state={{ from: location }} />
          )
        }
      />

      {/* Main Application Route (Home/Dashboard) */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            // Render the authenticated main content (passed as a function prop)
            <div className="container mx-auto px-4 pb-16">{renderMainContent()}</div>
          ) : (
            // Render the landing page if not authenticated
            <LandingPage onSignInClick={handleSignInClick} onSignUpClick={handleSignUpClick} />
          )
        }
      />

      {/* Catch-all Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;