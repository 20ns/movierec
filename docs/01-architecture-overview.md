# Architecture Overview

## System Architecture

MovieRec is a modern web application built using a serverless architecture pattern with clear separation between frontend and backend concerns.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│   React SPA     │◄──►│   API Gateway    │◄──►│  Lambda Functions│
│  (Frontend)     │    │                  │    │   (Backend)     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│   AWS Amplify   │    │  AWS Cognito     │    │   DynamoDB      │
│  (Hosting)      │    │ (Authentication) │    │  (Database)     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Core Design Principles

### 1. Serverless-First Architecture
- **No server management**: All backend logic runs on AWS Lambda
- **Pay-per-use**: Cost optimization through serverless pricing model
- **Auto-scaling**: Handles traffic spikes automatically
- **High availability**: Built-in redundancy and failover

### 2. Event-Driven Architecture
- **Loose coupling**: Components communicate through events and APIs
- **Scalability**: Each service can scale independently
- **Maintainability**: Clear separation of concerns

### 3. JAMstack Principles
- **JavaScript**: React for dynamic functionality
- **APIs**: Serverless functions for backend logic
- **Markup**: Pre-built markup served from CDN

## Data Flow Architecture

### User Authentication Flow
```
User ──► React App ──► AWS Cognito ──► JWT Token ──► API Gateway ──► Lambda
```

### Content Recommendation Flow
```
User Request ──► API Gateway ──► Lambda Function ──► DynamoDB (User Preferences)
                                       │
                                       ▼
TMDB API ◄── Lambda Function ◄── DynamoDB (Cache) ──► Recommendation Engine
                                       │
                                       ▼
User ◄── React App ◄── API Gateway ◄── Personalized Results
```

### Data Persistence Flow
```
User Action ──► React App ──► API Gateway ──► Lambda Function ──► DynamoDB
                                                     │
                                                     ▼
                                             Event Processing ──► Cache Update
```

## Component Architecture

### Frontend (React SPA)
- **Presentation Layer**: React components for UI
- **State Management**: React hooks and context
- **Routing**: React Router for navigation
- **API Layer**: Axios for HTTP requests
- **Authentication**: AWS Amplify Auth

### Backend (AWS Lambda)
- **API Layer**: Lambda functions handling HTTP requests
- **Business Logic**: Core recommendation algorithms
- **Data Access**: DynamoDB operations
- **External APIs**: TMDB integration
- **Authentication**: JWT token validation

### Infrastructure (AWS CDK)
- **Infrastructure as Code**: TypeScript CDK stacks
- **Resource Management**: Automated AWS resource provisioning
- **Environment Configuration**: Multi-environment support

## Security Architecture

### Authentication & Authorization
- **AWS Cognito**: User pool for authentication
- **JWT Tokens**: Stateless authentication
- **API Gateway**: Request validation and rate limiting
- **CORS**: Configured for secure cross-origin requests

### Data Security
- **Encryption**: Data encrypted at rest and in transit
- **IAM Roles**: Least privilege access control
- **Environment Variables**: Secure configuration management
- **API Keys**: Secure external API integration

## Scalability Considerations

### Horizontal Scaling
- **Lambda Concurrency**: Auto-scaling based on demand
- **DynamoDB**: On-demand scaling for read/write capacity
- **CDN**: Global content distribution via AWS CloudFront

### Performance Optimization
- **Caching**: Multi-layer caching strategy
  - Browser cache for static assets
  - DynamoDB cache for TMDB data
  - Lambda response caching
- **Code Splitting**: Webpack code splitting for optimal loading
- **Image Optimization**: Optimized image delivery

## Monitoring & Observability

### Metrics Collection
- **CloudWatch**: AWS service metrics
- **Custom Metrics**: Application-specific metrics
- **Error Tracking**: Centralized error logging

### Performance Monitoring
- **Web Vitals**: Frontend performance metrics
- **Lambda Metrics**: Function execution metrics
- **Database Metrics**: DynamoDB performance tracking

## Development Architecture

### Local Development
- **Serverless Offline**: Local Lambda simulation
- **Webpack Dev Server**: Hot reloading for frontend
- **Mock APIs**: Development testing without AWS

### CI/CD Pipeline
- **AWS Amplify**: Automated frontend deployment
- **CDK**: Infrastructure deployment
- **Testing**: Automated test execution

## Technology Stack Integration

### Frontend Stack
```
React 18.2.0
├── React Router DOM 6.23.1 (Routing)
├── TailwindCSS 3.4.3 (Styling)
├── Framer Motion 12.10.0 (Animations)
├── Axios 1.8.4 (HTTP Client)
└── AWS Amplify 5.3.10 (Auth Integration)
```

### Backend Stack
```
AWS Lambda (Node.js 18.x)
├── AWS SDK v3 (AWS Services)
├── DynamoDB (Database)
├── API Gateway (HTTP API)
└── Cognito (Authentication)
```

### Build & Deployment
```
Webpack 5.98.0
├── Babel (Transpilation)
├── TailwindCSS (CSS Processing)
├── Image Optimization
└── Code Splitting
```

## File Organization Strategy

### Frontend Structure
```
src/
├── components/     # Reusable UI components
├── pages/         # Route-specific page components
├── hooks/         # Custom React hooks
├── services/      # API service functions
├── utils/         # Utility functions
├── auth/          # Authentication logic
└── config/        # Configuration files
```

### Backend Structure
```
lambda-functions/
├── signin/                           # Authentication
├── UserPreferencesFunction/          # User data
├── MovieRecPersonalizedApiHandler/   # Recommendations
├── FavouritesFunction/              # User favorites
├── watchlist/                       # User watchlist
└── MediaCache/                      # TMDB caching
```

This architecture provides a robust, scalable, and maintainable foundation for the MovieRec platform while leveraging modern cloud-native patterns and best practices.