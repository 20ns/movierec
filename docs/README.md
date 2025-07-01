# MovieRec Documentation

This directory contains comprehensive documentation for the MovieRec platform - a personalized movie and TV show recommendation system built with React and AWS serverless architecture.

## Documentation Structure

### Core Architecture
- **[01-architecture-overview.md](01-architecture-overview.md)** - High-level system architecture and design patterns
- **[02-tech-stack.md](02-tech-stack.md)** - Complete technology stack with versions and purposes

### Frontend Documentation
- **[03-frontend-architecture.md](03-frontend-architecture.md)** - React app structure and component organization
- **[04-components-guide.md](04-components-guide.md)** - Detailed component documentation with props and usage
- **[05-hooks-and-state.md](05-hooks-and-state.md)** - Custom hooks and state management patterns

### Backend Documentation
- **[06-lambda-functions.md](06-lambda-functions.md)** - AWS Lambda functions and their responsibilities
- **[07-api-endpoints.md](07-api-endpoints.md)** - REST API endpoints with request/response schemas
- **[08-database-schema.md](08-database-schema.md)** - DynamoDB table structures and data models

### Infrastructure & Deployment
- **[09-infrastructure.md](09-infrastructure.md)** - AWS CDK infrastructure as code
- **[10-deployment-guide.md](10-deployment-guide.md)** - Deployment procedures and environment setup

### Development & Testing
- **[11-development-setup.md](11-development-setup.md)** - Local development environment setup
- **[12-testing-guide.md](12-testing-guide.md)** - Testing strategies and test execution
- **[13-troubleshooting.md](13-troubleshooting.md)** - Common issues and solutions

### Additional Resources
- **[14-security-considerations.md](14-security-considerations.md)** - Security practices and configurations
- **[15-performance-optimization.md](15-performance-optimization.md)** - Performance tuning and monitoring

## Quick Reference

### Essential Commands
```bash
# Development
npm run dev                    # Start full development environment
npm run dev:frontend          # Frontend only
npm run dev:backend           # Backend only

# Testing  
npm run test                  # Run all tests
npm run test:api             # API tests only

# Deployment
npm run deploy:infrastructure # Deploy AWS infrastructure
```

### Key Files
- `package.json` - Main project dependencies and scripts
- `serverless.yml` - Lambda functions and DynamoDB configuration
- `webpack.config.js` - Frontend build configuration
- `infrastructure/` - AWS CDK infrastructure code
- `CLAUDE.md` - AI assistant instructions and project context

### Environment Variables
Required environment variables are documented in [11-development-setup.md](11-development-setup.md).

---

**Last Updated:** 2025-01-01  
**Documentation Version:** 1.0