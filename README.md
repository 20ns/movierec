# MovieRec - Personalized Movie & TV Show Recommendations

<p align="center">
  <img src="./public/logo.png" alt="MovieRec Logo" width="300">
</p>

**Live Site:** [https://www.movierec.net/](https://www.movierec.net/)

## 🎯 Project Aim

MovieRec aims to be an intelligent and intuitive platform for discovering movies and TV shows perfectly tailored to individual user tastes. By leveraging user viewing history, explicit preferences (collected via an onboarding questionnaire and preference center), and trending data, MovieRec provides a personalized discovery experience, making it effortless to find your next favorite thing to watch.

## ✨ Key Features

*   **Personalized Recommendations**: AI-driven suggestions based on your viewing habits and stated preferences.
*   **Onboarding Questionnaire**: Answer a few questions upon signup (or later) to kickstart and refine your recommendations.
*   **Preference Center**: Update your taste profile anytime via the diamond icon in the header.
*   **Advanced Search**: Filter content by genre, time period, media type (movie/TV), and more.
*   **User Accounts**: Secure sign-up/sign-in (powered by AWS Cognito) to save preferences, favorites, and watchlist.
*   **Favorites & Watchlist**: Easily save titles you love or want to watch later.
*   **Trending Content**: Discover what's popular right now or this week.
*   **Genre Exploration**: Browse dedicated pages for different genres.
*   **Responsive Design**: Seamless experience on desktops, tablets, and mobile devices.
*   **Smooth UI**: Engaging animations and transitions using Framer Motion.

## 🛠️ Tech Stack

**Frontend:**
*   **UI Library:** [React](https://reactjs.org/)
*   **Routing:** [React Router DOM](https://reactrouter.com/)
*   **Styling:** [TailwindCSS](https://tailwindcss.com/)
*   **Animations:** [Framer Motion](https://www.framer.com/motion/)
*   **HTTP Client:** [Axios](https://axios-http.com/)
*   **UI Components/Icons:** [Headless UI](https://headlessui.dev/), [Heroicons](https://heroicons.com/), [Lucide React](https://lucide.dev/)

**Backend & Infrastructure (AWS):**
*   **Hosting & CI/CD:** [AWS Amplify](https://aws.amazon.com/amplify/)
*   **Authentication:** [AWS Cognito](https://aws.amazon.com/cognito/)
*   **Database:** [DynamoDB](https://aws.amazon.com/dynamodb/) (for user preferences, favorites, etc.)
*   **Serverless Functions:** [AWS Lambda](https://aws.amazon.com/lambda/)
*   **API Layer:** [AWS API Gateway](https://aws.amazon.com/api-gateway/)

**External APIs:**
*   **Movie/TV Data:** [The Movie Database (TMDB) API](https://www.themoviedb.org/documentation/api)

**Build Tools:**
*   **Bundler:** [Webpack](https://webpack.js.org/)
*   **Transpiler:** [Babel](https://babeljs.io/)
*   **CSS Processing:** [PostCSS](https://postcss.org/)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v14.x or higher recommended)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
*   An [AWS Account](https://aws.amazon.com/) (for deploying your own instance)
*   A [TMDB API Key](https://www.themoviedb.org/settings/api)

## 🚀 Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd movierec
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add your AWS Cognito, API Gateway, and TMDB API keys:
    ```plaintext
    REACT_APP_COGNITO_USER_POOL_ID=your_user_pool_id
    REACT_APP_COGNITO_CLIENT_ID=your_client_id
    REACT_APP_API_GATEWAY_INVOKE_URL=your_api_gateway_url
    REACT_APP_TMDB_API_KEY=your_tmdb_api_key
    REACT_APP_REDIRECT_SIGN_IN=http://localhost:8080/ # Or your dev URL
    REACT_APP_REDIRECT_SIGN_OUT=http://localhost:8080/ # Or your dev URL
    ```
    *(Note: You might need to configure AWS Amplify CLI and set up the backend resources if deploying from scratch)*

4.  **Run the development server:**
    ```bash
    npm start
    # or
    yarn start
    ```
    The application should now be running on `http://localhost:8080` (or the port specified by Webpack Dev Server).

## 📦 Build for Production

```bash
npm run build
# or
yarn build
```
This will create an optimized production build in the `dist/` folder.

## ☁️ Deployment

This project is configured for deployment via [AWS Amplify](https://aws.amazon.com/amplify/). Connect your repository to Amplify for automated builds and hosting. The `netlify.toml` file might be legacy or for an alternative deployment setup.

## 🙏 Acknowledgments

*   Data provided by [The Movie Database (TMDB)](https://www.themoviedb.org/).
*   Built with [React](https://reactjs.org/) and [AWS Amplify](https://aws.amazon.com/amplify/).
*   Icons from [Heroicons](https://heroicons.com/) and [Lucide React](https://lucide.dev/).
