const { CognitoIdentityProviderClient, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");
const CryptoJS = require("crypto-js");

const client = new CognitoIdentityProviderClient({ region: "eu-north-1" });

const generateSecretHash = (username) => {
  const clientId = process.env.COGNITO_CLIENT_ID;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET;
  return CryptoJS.enc.Base64.stringify(
    CryptoJS.HmacSHA256(username + clientId, clientSecret)
  );
};

exports.handler = async (event) => {
  const { refreshToken, username } = JSON.parse(event.body);

  if (!username) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN,
        "Access-Control-Allow-Credentials": "true"
      },
      body: JSON.stringify({ error: "Username is required" })
    };
  }

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
        SECRET_HASH: generateSecretHash(username),
        USERNAME: username  // <-- Added USERNAME parameter
      }
    });

    const response = await client.send(command);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN,
        "Access-Control-Allow-Credentials": "true"
      },
      body: JSON.stringify({
        accessToken: response.AuthenticationResult.AccessToken,
        expiresIn: response.AuthenticationResult.ExpiresIn
      })
    };
  } catch (error) {
    console.error("Refresh error:", error);
    return {
      statusCode: 401,
      headers: {
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "Content-Type, Authorization" // Add this
      },
      body: JSON.stringify({ error: "Invalid refresh token" })
    };
  }
};
