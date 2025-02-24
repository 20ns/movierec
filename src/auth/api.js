export const authFetch = async (url, options = {}, authContext) => {
    let response;
    try {
      // Initial request
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${authContext.currentUser?.tokens?.accessToken}`
        }
      });
  
      // Handle token expiration
      if (response.status === 401) {
        const newAccessToken = await authContext.refreshAuthToken();
        if (!newAccessToken) throw new Error('Session expired');
        
        // Retry with new token
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
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  };