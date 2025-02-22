import React, { useEffect } from 'react';
import { Auth } from 'aws-amplify';

function PrintAccessToken() {
  useEffect(() => {
    async function fetchToken() {
      try {
        const session = await Auth.currentSession();
        const accessToken = session.getAccessToken().getJwtToken();
        console.log("Access Token:", accessToken);
      } catch (error) {
        console.error("Error fetching access token:", error);
      }
    }
    fetchToken();
  }, []);

  return <div>Check your browser's console (F12) for the access token.</div>;
}

export default PrintAccessToken;