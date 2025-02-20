// auth.js
import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // Check for token presence (and ideally, expiry)
      if (user?.token) {
        setIsAuthenticated(true);
        setCurrentUser(user);
      }
    }
  }, []);

  const handleSigninSuccess = (tokens, email) => {
    const user = { token: tokens.accessToken, email, tokens }; // Store ALL tokens
    localStorage.setItem('currentUser', JSON.stringify(user));
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handleSignout = () => {
    localStorage.removeItem('currentUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

    // No changes to handleSignupSuccess in this example.
    const handleSignupSuccess = (tokens, email, sub) => {
      const user = { token: tokens.accessToken, email, sub, tokens };
      localStorage.setItem('currentUser', JSON.stringify(user));
      setIsAuthenticated(true);
      setCurrentUser(user);
    };


  const authContextValue = {
    isAuthenticated,
    currentUser,
    onSigninSuccess: handleSigninSuccess, // Use consistent naming (on...)
    onSignout: handleSignout,
    onSignupSuccess: handleSignupSuccess,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);