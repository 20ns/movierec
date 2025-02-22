import React, { useEffect } from 'react';
import { Amplify, Auth } from 'aws-amplify'; // Import Amplify as well

function PrintAccessToken() {
  useEffect(() => {
    async function fetchToken() {
      try {
        const session = await Auth.currentSession();
        const accessToken = session.getAccessToken().getJwtToken();
        console.log("Access Token:", accessToken);
      } catch (error) {
        console.error("Error fetching access token:", error);
        if (error === "No current user") {
          console.log("User is not logged in.  Please log in to obtain a token.");
        }
      }
    }
    fetchToken();
  }, []);

  return <div>Check your browser's console (F12) for the access token.</div>;
}

export default PrintAccessToken;