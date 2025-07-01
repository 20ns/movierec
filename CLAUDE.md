# CLAUDE Instructions for MovieRec Project

# CLAUDE.md - Codebase Analysis & Documentation Assistant

## Core Mission
You are a codebase analysis and documentation specialist. Your primary objectives:
1. **Analyze and understand** the entire codebase architecture and patterns
2. **Generate comprehensive documentation** that serves as living context
3. **Use documentation as reference** for issue detection and resolution
4. **Maintain consistency** across different technologies and modules

## Thinking Process Framework

### Initial Analysis Workflow
Before any task, use your thinking capabilities to:
understand the project and make detailed docs on everything. So that when I ask u fixes to do u know exactly what to do and how to do it.



## Project Overview
MovieRec is a personalized movie and TV show recommendation platform built with React frontend and AWS serverless backend. It provides AI-driven content discovery with user authentication, preferences management, and personalized recommendations.

**Live Site:** https://www.movierec.net/  
**Current Branch:** CORS (working on CORS-related fixes)  
**Main Branch:** main

## Tech Stack

### Frontend
- **React 18.2.0** with functional components and hooks
- **React Router DOM 6.23.1** for routing
- **TailwindCSS 3.4.3** for styling
- **Framer Motion 12.10.0** for animations
- **Axios 1.8.4** for API calls
- **AWS Amplify 5.3.10** for authentication
- **Webpack 5.98.0** for bundling

### Backend (AWS Serverless)
- **AWS Lambda** (Node.js 18.x runtime)
- **AWS API Gateway** for REST endpoints
- **AWS Cognito** for user authentication
- **DynamoDB** for data storage
- **AWS CDK** for Infrastructure as Code
- **Serverless Framework** for local development

### External APIs
- **TMDB API** for movie/TV data

## Project Structure

```
movierec/
├── src/                          # React frontend
│   ├── components/               # Reusable UI components
│   ├── hooks/                    # Custom React hooks
│   ├── pages/                    # Page components
│   ├── services/                 # API service functions
│   ├── auth/                     # Authentication components
│   ├── utils/                    # Utility functions
│   └── config/                   # Configuration files
├── lambda-functions/             # AWS Lambda source code
│   ├── signin/                   # User authentication
│   ├── SignupHandler/            # User registration
│   ├── UserPreferencesFunction/  # Preferences management
│   ├── FavouritesFunction/       # Favorites management
│   ├── watchlist/                # Watchlist management
│   ├── MovieRecPersonalizedApiHandler/ # Recommendation engine
│   ├── MediaCache/               # TMDB API caching
│   └── RefreshTokenLambda/       # Token refresh
├── infrastructure/               # AWS CDK Infrastructure as Code
├── lambda-layers/                # Shared Lambda dependencies
├── tests/                        # Test suites
├── scripts/                      # Utility scripts
└── public/                       # Static assets and blog content
```

## Development Commands

### Primary Commands
- `npm run start` - Start webpack dev server (port 3000)
- `npm run dev` - Start both frontend and backend
- `npm run dev:frontend` - Frontend only
- `npm run dev:backend` - Backend only (serverless offline)
- `npm run dev:status` - Check server status
- `npm run build` - Production build
- `npm run test` - Run all tests

### Helper Commands
- `npm run dev:install` - Install all dependencies
- `npm run dev:clean` - Clean and reinstall dependencies
- `npm run dev:cleanup` - Clean up project structure

### Infrastructure Commands
- `cd infrastructure && cdk deploy` - Deploy AWS infrastructure
- `cd infrastructure && cdk diff` - Show infrastructure changes
- `cd infrastructure && cdk destroy` - Delete infrastructure

### Testing Commands
- `npm run test:api` - API endpoint tests
- `npm run test:aws` - AWS service tests
- `npm run test:coverage` - Test coverage report

## Key Files & Configuration

### Core Configuration
- `package.json` - Main dependencies and scripts
- `webpack.config.js` - Build configuration with optimization
- `serverless.yml` - Backend Lambda functions and DynamoDB tables
- `tailwind.config.js` - CSS framework configuration
- `postcss.config.js` - CSS processing

### Environment Files (NOT in repo)
```env
REACT_APP_API_GATEWAY_INVOKE_URL=https://your-api-gateway-url.amazonaws.com/prod/
REACT_APP_TMDB_API_KEY=your_tmdb_api_key
REACT_APP_COGNITO_USER_POOL_ID=your_user_pool_id
REACT_APP_COGNITO_CLIENT_ID=your_client_id
```

## API Endpoints (Serverless Functions)

### Authentication
- `POST /auth/signin` - User sign in
- `POST /auth/signup` - User registration
- `POST /auth/refresh` - Token refresh

### User Data
- `GET/POST /user/preferences` - User preferences
- `GET/POST/DELETE /user/favourites` - User favorites
- `GET/POST/DELETE /user/watchlist` - User watchlist

### Content
- `GET /recommendations` - Personalized recommendations
- `GET /media` - Media content with TMDB caching

## Database Schema (DynamoDB)

### Tables
1. **UserPreferences** - User taste profiles and settings
2. **MovieRecCache** - Cached TMDB data for performance
3. **Favourites** - User favorite movies/shows
4. **Watchlist** - User watch later list

## Common Issues & Solutions

### CORS Issues (Current Focus)
- Recent commits focus on CORS fixes
- Configured for localhost:3000, movierec.net, www.movierec.net
- Check serverless.yml CORS configuration if API calls fail

### Development Setup Issues
- Ensure AWS CLI is configured
- TMDB API key must be valid
- Node.js version should be 18+
- Run `npm run dev:install` for clean dependency setup

### Build Issues
- Run `npm run build` to check for compilation errors
- Check webpack.config.js for asset optimization issues
- Verify all environment variables are set

### Authentication Issues
- Check AWS Cognito configuration
- Verify JWT token handling in lambda functions
- Check auth.js and aws-amplify-overrides.js

## Testing Strategy

### Test Locations
- `tests/` - Main test directory with its own package.json
- `tests/aws/` - AWS service integration tests
- `infrastructure/test/` - Infrastructure tests

### Running Tests
Always run tests from test directory:
```bash
cd tests && npm test
```

## Performance Optimizations

### Frontend
- Code splitting with webpack
- Image optimization with image-webpack-loader
- CSS extraction in production
- Subresource integrity for security

### Backend
- Lambda layer for shared dependencies
- DynamoDB caching for TMDB data
- CORS configuration for optimal performance

## Debugging Tips

### Frontend Debug
- Check browser console for errors
- Verify API endpoint URLs in network tab
- Check localStorage for auth tokens

### Backend Debug
- Use `npm run dev:backend` for local serverless offline
- Check CloudWatch logs in AWS Console
- Verify DynamoDB table configurations

### Common Error Patterns
- Authentication failures: Check Cognito configuration
- CORS errors: Verify serverless.yml CORS settings
- Build failures: Check webpack.config.js and dependencies
- API timeouts: Check Lambda function timeout settings

## File Modification Guidelines

### When editing React components:
- Follow existing patterns in src/components/
- Use hooks (useState, useEffect, custom hooks)
- Maintain TailwindCSS class conventions
- Keep components functional and modular

### When editing Lambda functions:
- Follow Node.js 18.x patterns
- Use AWS SDK v3 syntax
- Include proper error handling
- Test locally with serverless offline

### When modifying infrastructure:
- Use CDK for infrastructure changes in infrastructure/
- Update serverless.yml for function configurations
- Test changes with `cdk diff` before deploying

## Recent Changes Context

### Current CORS Branch
- Working on fixing CORS-related issues
- Recent commits include CORS configuration updates
- Focus on API Gateway and frontend communication

### Modified Files (Current State)
- `.vscode/settings.json` - IDE configuration
- `movierec.code-workspace` - Workspace settings
- `postcss.config.js` - CSS processing updates
- `src/account/UserMenu.js` - User interface updates
- `src/aws-amplify-overrides.js` - AWS configuration
- `src/components/ErrorMessage.jsx` - Error handling
- `src/components/FilterPill.js` - UI component updates
- `src/components/LoadMoreButton.jsx` - Pagination component
- `src/events.js` - Event handling

## Deployment Process

### Development
1. `npm run dev` - Local development
2. Test all functionality locally
3. Run tests: `cd tests && npm test`
4. Commit changes to feature branch

### Production
1. Merge to main branch
2. AWS Amplify auto-deploys frontend
3. Deploy infrastructure: `cd infrastructure && cdk deploy`
4. Monitor CloudWatch for issues

## Security Considerations

- Never commit API keys or secrets
- Use environment variables for sensitive data
- AWS IAM roles follow least privilege principle
- JWT tokens for API authentication
- CORS properly configured for security

## Performance Monitoring

- Use AWS CloudWatch for backend metrics
- Monitor Lambda cold starts
- Track DynamoDB read/write capacity
- Frontend performance via browser dev tools

---

**Last Updated:** $(date)  
**Claude Instructions Version:** 1.0  

This file should be referenced for all development, debugging, and maintenance tasks on the MovieRec project.