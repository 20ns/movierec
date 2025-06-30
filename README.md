# MovieRec - Personalized Movie & TV Show Recommendations

<p align="center">
  <img src="./public/logo.png" alt="MovieRec Logo" width="300">
</p>

**Live Site:** [https://www.movierec.net/](https://www.movierec.net/)

## 🎯 Project Overview

MovieRec is an intelligent movie and TV show recommendation platform that provides personalized content discovery. The application leverages user preferences, viewing history, and trending data to deliver tailored recommendations, making it effortless to find your next favorite content.

## ✨ Key Features

*   **🎯 Personalized Recommendations**: AI-driven suggestions based on viewing habits and preferences
*   **📝 Onboarding Questionnaire**: Setup your taste profile during signup or anytime later
*   **⚙️ Preference Center**: Update your taste profile via the diamond icon in the header
*   **🔍 Advanced Search**: Filter by genre, time period, media type, and more
*   **👤 User Accounts**: Secure authentication powered by AWS Cognito
*   **❤️ Favorites & Watchlist**: Save titles you love or want to watch later
*   **📈 Trending Content**: Discover what's popular now or this week
*   **🎭 Genre Exploration**: Browse dedicated pages for different genres
*   **📱 Responsive Design**: Seamless experience across all devices
*   **🎨 Smooth UI**: Engaging animations using Framer Motion

## 🏗️ Architecture

This project uses **Infrastructure as Code (IaC)** with AWS CDK, ensuring reproducible and maintainable cloud infrastructure.

### Frontend Stack
*   **React** - UI library with modern hooks and components
*   **React Router DOM** - Client-side routing
*   **TailwindCSS** - Utility-first CSS framework
*   **Framer Motion** - Animation library
*   **Axios** - HTTP client for API calls

### Backend Stack (AWS)
*   **AWS CDK** - Infrastructure as Code
*   **AWS Lambda** - Serverless compute functions
*   **AWS API Gateway** - RESTful API endpoints
*   **AWS Cognito** - User authentication and authorization
*   **DynamoDB** - NoSQL database for user data
*   **AWS Amplify** - Frontend hosting and CI/CD

### External APIs
*   **TMDB API** - Movie and TV show data

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or later)
- **npm** or **yarn**
- **AWS CLI** configured with appropriate permissions
- **AWS CDK** installed globally (`npm install -g aws-cdk`)
- **TMDB API Key** (get one from [TMDB](https://www.themoviedb.org/documentation/api))

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone <repository-url>
cd movierec
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install CDK infrastructure dependencies
cd infrastructure
npm install
cd ..
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
REACT_APP_API_GATEWAY_INVOKE_URL=https://your-api-gateway-url.amazonaws.com/prod/
TMDB_API_KEY=your_tmdb_api_key_here
```

### 4. Deploy Infrastructure (First Time Setup)
```bash
# Bootstrap CDK (first time only)
cd infrastructure
cdk bootstrap

# Deploy the infrastructure
cdk deploy

# Note the API Gateway URL from the output and update your .env file
cd ..
```

### 5. Start Development Server
```bash
npm run start
```

The application will be available at `http://localhost:3000`

### Development Commands

The project includes a helpful development script (`dev.js`) that provides easy commands:

```bash
npm run dev           # Start both frontend and backend
npm run dev:frontend  # Start only frontend
npm run dev:backend   # Start only backend
npm run dev:test      # Run tests
npm run dev:install   # Install all dependencies
npm run dev:clean     # Clean and reinstall dependencies
npm run dev:cleanup   # Clean up project structure
npm run dev:status    # Check server status
```

## 📁 Project Structure

```
movierec/
├── src/                          # Frontend React application
│   ├── components/               # Reusable UI components
│   ├── hooks/                    # Custom React hooks
│   ├── pages/                    # Page components
│   ├── services/                 # API service functions
│   ├── auth/                     # Authentication components
│   └── utils/                    # Utility functions
├── infrastructure/               # AWS CDK Infrastructure as Code
│   ├── lib/                      # CDK stack definitions
│   ├── bin/                      # CDK app entry point
│   └── test/                     # Infrastructure tests
├── lambda-functions/             # AWS Lambda function source code
│   ├── signin/                   # User authentication
│   ├── SignupHandler/            # User registration
│   ├── UserPreferencesFunction/  # User preferences management
│   ├── FavouritesFunction/       # Favorites management
│   ├── watchlist/                # Watchlist management
│   ├── MovieRecPersonalizedApiHandler/ # Recommendation engine
│   ├── MediaCache/               # TMDB API caching
│   └── RefreshTokenLambda/       # Token refresh
├── lambda-layers/                # Shared Lambda layers
├── public/                       # Static assets
└── package.json                  # Project dependencies
```

## 🔧 Available Scripts

### Frontend
- `npm run start` - Start development server
- `npm run build` - Build for production
- `npm run generate-sitemap` - Generate sitemap for SEO

### Infrastructure
- `cd infrastructure && cdk deploy` - Deploy infrastructure
- `cd infrastructure && cdk diff` - Show infrastructure changes
- `cd infrastructure && cdk destroy` - Delete infrastructure

## 🚀 Deployment

### Production Deployment
1. **Infrastructure**: Deploy using CDK
   ```bash
   cd infrastructure
   cdk deploy --profile production
   ```

2. **Frontend**: Deployed automatically via AWS Amplify on git push

### Environment Configuration
- **Development**: `http://localhost:3000`
- **Production**: `https://www.movierec.net/`

## 🔐 Security Features

- **AWS Cognito** for secure user authentication
- **JWT tokens** for API authorization
- **CORS** properly configured for all endpoints
- **Environment variables** for sensitive configuration
- **IAM roles** with least privilege principles

## 📊 Performance

- **CDN delivery** via AWS CloudFront
- **Lambda function** cold start optimization
- **DynamoDB** single-digit millisecond latency
- **Responsive images** and lazy loading
- **Code splitting** for optimal bundle sizes

See [PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md) for detailed performance metrics and optimization strategies.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for providing comprehensive movie and TV data
- [AWS](https://aws.amazon.com/) for robust cloud infrastructure
- The open-source community for excellent tools and libraries

Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v14.x or higher recommended)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
*   An [AWS Account](https://aws.amazon.com/) (for deploying your own instance)
*   A [TMDB API Key](https://www.themoviedb.org/settings/api)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- AWS Account (for deployment)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd movierec
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or use the development helper
    npm run dev:install
    ```

3.  **Set up environment variables:**
    ```bash
    # Copy the example environment file
    cp .env.example .env
    
    # Edit .env and fill in your actual values
    # Get these from AWS Console and TMDB
    ```

4.  **Clean up and organize project (optional):**
    ```bash
    npm run dev:cleanup
    ```

5.  **Run the development server:**
    ```bash
    # Start both frontend and backend
    npm run dev
    
    # Or start individually
    npm run dev:frontend  # Frontend only
    npm run dev:backend   # Backend only
    ```

    The application will be available at `http://localhost:3000`
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
