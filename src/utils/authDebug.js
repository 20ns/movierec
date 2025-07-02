// Authentication debugging utility
export const debugAuth = (currentUser, context = '') => {
  console.group(`[AuthDebug] ${context}`);
  console.log('currentUser exists:', !!currentUser);
  console.log('signInUserSession exists:', !!currentUser?.signInUserSession);
  console.log('accessToken exists:', !!currentUser?.signInUserSession?.accessToken);
  console.log('accessToken.jwtToken exists:', !!currentUser?.signInUserSession?.accessToken?.jwtToken);
  
  if (currentUser?.signInUserSession?.accessToken?.jwtToken) {
    const token = currentUser.signInUserSession.accessToken.jwtToken;
    try {
      // Basic JWT validation - check if it's properly formatted
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const isExpired = payload.exp ? (payload.exp * 1000 < Date.now()) : false;
        console.log('Token valid format:', true);
        console.log('Token expired:', isExpired);
        console.log('Token exp:', new Date(payload.exp * 1000).toISOString());
      } else {
        console.log('Token valid format:', false);
      }
    } catch (e) {
      console.log('Token parse error:', e.message);
    }
  }
  console.groupEnd();
};

// Check if user is properly authenticated with valid tokens
export const isUserProperlyAuthenticated = (currentUser) => {
  if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
    return false;
  }
  
  const token = currentUser.signInUserSession.accessToken.jwtToken;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1]));
    const isExpired = payload.exp ? (payload.exp * 1000 < Date.now()) : true;
    
    return !isExpired;
  } catch (e) {
    return false;
  }
};