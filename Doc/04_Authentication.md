# 04: Authentication Flow

## 1. Overview

User authentication and authorization are managed by **AWS Cognito**. The frontend application interacts with Cognito via the **AWS Amplify** library, while the backend Lambda functions validate user sessions using JWTs.

## 2. Key Components

*   **AWS Cognito User Pool**: The user directory where user accounts are stored.
*   **AWS Cognito User Pool Client**: An entity within a User Pool that has permission to call unauthenticated API operations.
*   **`authPage.jsx`**: The React component that provides the UI for sign-up, sign-in, and password reset.
*   **`useAuth.js`**: A custom React hook that manages the user's authentication state throughout the application.
*   **`SigninHandler` Lambda**: The backend function that handles the sign-in process.
*   **`SignupHandler` Lambda**: The backend function that handles the sign-up process.
*   **JWT Authorizer**: An API Gateway authorizer that uses a Lambda function to validate the JWTs sent with protected requests.

## 3. Sign-Up Flow

1.  The user navigates to the `/signup` route, which renders the `authPage.jsx` component in sign-up mode.
2.  The user enters their email and password.
3.  The `handleSignUp` function in `authPage.jsx` calls `Auth.signUp` from the AWS Amplify library.
4.  Amplify sends a request to the `SignupHandler` Lambda function.
5.  The `SignupHandler` uses the AWS Cognito SDK to create a new user in the Cognito User Pool.
6.  Cognito sends a verification email to the user.
7.  The user enters the verification code, and the `handleVerification` function in `authPage.jsx` calls `Auth.confirmSignUp`.
8.  Upon successful verification, the user is automatically signed in.

## 4. Sign-In Flow

1.  The user navigates to the `/signin` route, which renders the `authPage.jsx` component in sign-in mode.
2.  The user enters their email and password.
3.  The `handleSignIn` function in `authPage.jsx` calls `Auth.signIn` from the AWS Amplify library.
4.  Amplify sends a request to the `SigninHandler` Lambda function.
5.  The `SigninHandler` uses the AWS Cognito SDK to authenticate the user against the Cognito User Pool.
6.  If the credentials are correct, Cognito returns a set of JWTs (ID token, access token, and refresh token) to the client.
7.  The `useAuth` hook stores these tokens and updates the application's authentication state.

## 5. Session Management & Authorization

1.  Once the user is signed in, the `useAuth` hook makes the user's session data available to the rest of the application.
2.  For any requests to protected backend endpoints, the frontend includes the **access token** in the `Authorization` header as a Bearer token.
3.  API Gateway receives the request and invokes the **Cognito Authorizer**.
4.  The authorizer validates the signature and expiration of the JWT. If the token is valid, the request is allowed to proceed to the target Lambda function.
5.  The Lambda function can then use the information in the JWT payload (such as the user's ID, or `sub`) to perform authorized actions on behalf of that user.

## 6. Token Refresh

The access and ID tokens have a limited lifetime. When they expire, the application can use the **refresh token** to obtain new tokens without requiring the user to sign in again. This process is handled by the `RefreshTokenLambda` function and is managed by the AWS Amplify library on the client-side.
