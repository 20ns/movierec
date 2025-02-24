export const authFetch = async (url, options = {}, authContext) => {
    let accessToken = authContext.currentUser?.tokens?.accessToken;
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`
      }
    });
  
    // Handle token expiration
    if (response.status === 401) {
      const newAccessToken = await authContext.refreshAuthToken();
      if (!newAccessToken) throw new Error('Session expired');
  
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newAccessToken}`
        }
      });
    }
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }
  
    return response;
  };