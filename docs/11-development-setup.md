# Development Setup Guide

## Prerequisites

### Required Software
- **Node.js 18+** - JavaScript runtime environment
- **npm 8+** - Package manager (comes with Node.js)
- **Git** - Version control system
- **AWS CLI** - AWS command line interface
- **Code Editor** - VS Code recommended

### AWS Account Requirements
- AWS account with appropriate permissions
- AWS CLI configured with access keys
- CDK CLI installed globally: `npm install -g aws-cdk`

### External API Keys
- **TMDB API Key** - Required for movie/TV data (free account at themoviedb.org)
- **FanArt.tv API Key** - Optional for additional media assets

## Initial Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/movierec.git
cd movierec
```

### 2. Environment Configuration

Create `.env` file in project root:
```bash
# Required: TMDB API for movie data
REACT_APP_TMDB_API_KEY=your_tmdb_api_key_here

# Optional: FanArt.tv API for additional assets
REACT_APP_FANART_TV_API_KEY=your_fanart_api_key

# Local development URLs (default values)
REACT_APP_API_GATEWAY_INVOKE_URL=http://localhost:3001
REACT_APP_REDIRECT_SIGN_IN=http://localhost:3000/
REACT_APP_REDIRECT_SIGN_OUT=http://localhost:3000/

# AWS Cognito (will be configured during infrastructure setup)
REACT_APP_COGNITO_USER_POOL_ID=
REACT_APP_COGNITO_CLIENT_ID=
```

### 3. Install Dependencies

Use the development helper script for easy setup:
```bash
# Install all dependencies (main + tests)
node dev.js install

# Or install manually
npm install
cd tests && npm install && cd ..
```

### 4. AWS Configuration

Configure AWS CLI with your credentials:
```bash
aws configure
```

Provide the following information:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `eu-north-1`
- Default output format: `json`

## Development Environment Options

### Option 1: Full Local Development (Recommended)

This setup runs both frontend and backend locally using Serverless Offline.

#### Start Development Environment
```bash
# Start both frontend (port 3000) and backend (port 3001)
node dev.js start

# Or start individually
node dev.js frontend    # Frontend only
node dev.js backend     # Backend only
```

#### Check Server Status
```bash
node dev.js status
```

Expected output:
```
🔍 Checking server status...

✅ Frontend: Running on http://localhost:3000
✅ Backend: Running on http://localhost:3001 (expected auth error)
```

### Option 2: Frontend + Cloud Backend

Run frontend locally while using deployed AWS infrastructure.

#### Setup Steps
1. Deploy infrastructure (see Infrastructure Setup section)
2. Update `.env` with deployed API Gateway URL
3. Start frontend only:
```bash
node dev.js frontend
```

## Infrastructure Setup

### Local Infrastructure (Serverless Offline)

For complete local development including database simulation:

```bash
# Start serverless offline (includes DynamoDB Local)
npm run start:offline

# Deploy only DynamoDB tables locally
serverless deploy --config tables-only.yml --stage dev
```

### Cloud Infrastructure Deployment

Deploy AWS infrastructure for development/testing:

```bash
# Review infrastructure changes
npm run deploy:diff

# Deploy infrastructure
npm run deploy:infrastructure
```

After deployment, update `.env` with the output values:
```bash
# From CDK deployment output
REACT_APP_COGNITO_USER_POOL_ID=eu-north-1_xxxxxxxxx
REACT_APP_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_API_GATEWAY_INVOKE_URL=https://xxxxxxxxxx.execute-api.eu-north-1.amazonaws.com/prod/
```

## Development Workflow

### Daily Development
```bash
# Start development environment
node dev.js start

# In another terminal - run tests during development
node dev.js test:watch

# Check server status if issues
node dev.js status
```

### Making Changes

#### Frontend Changes
- Edit files in `src/` directory
- Hot module replacement provides instant feedback
- No restart required for most changes

#### Backend Changes
- Edit files in `lambda-functions/` directory
- Restart backend server:
```bash
# Stop with Ctrl+C and restart
node dev.js backend
```

#### Infrastructure Changes
- Edit files in `infrastructure/` directory
- Deploy changes:
```bash
npm run deploy:diff    # Review changes
npm run deploy:infrastructure    # Deploy
```

### Code Quality

#### Linting and Formatting
```bash
# Run linting checks
node dev.js lint

# Run full audit
npm run audit
```

#### Building for Production
```bash
# Build optimized frontend
node dev.js build

# Test production build locally
cd dist && python -m http.server 8080
```

## Development Helper Script

The `dev.js` script provides convenient commands for development:

### Available Commands
```bash
node dev.js <command>

Commands:
  start         Start both frontend and backend servers
  frontend      Start only the frontend server
  backend       Start only the backend server
  test          Run API tests
  test:watch    Run API tests in watch mode
  test:coverage Run API tests with coverage
  install       Install all dependencies
  clean         Clean all node_modules and reinstall
  cleanup       Clean up project structure
  lint          Run linting checks
  build         Build the frontend for production
  deploy        Deploy infrastructure
  status        Check server status
  help          Show help message
```

### Examples
```bash
# Start development environment
node dev.js start

# Clean install all dependencies
node dev.js clean

# Run tests with coverage
node dev.js test:coverage

# Check if servers are running
node dev.js status
```

## Testing During Development

### Running Tests

```bash
# Quick API tests
node dev.js test

# Watch mode for continuous testing
node dev.js test:watch

# Full test coverage
node dev.js test:coverage

# AWS integration tests
cd tests && npm run test:aws
```

### Test Categories

#### API Tests (`tests/api.test.js`)
- Integration tests for all API endpoints
- Authentication flow testing
- User data management testing

#### AWS Tests (`tests/aws/`)
- Direct AWS service testing
- Lambda function testing
- DynamoDB operations testing

### Test Configuration

Tests use environment-specific configuration:
```javascript
// tests/api.test.js
const BASE_URL = process.env.REACT_APP_API_GATEWAY_INVOKE_URL || 'http://localhost:3001';
```

## Debugging Guide

### Frontend Debugging

#### Browser Developer Tools
- Open Chrome/Firefox DevTools
- Check Console tab for errors
- Network tab for API call inspection
- Application tab for localStorage/sessionStorage

#### React DevTools
Install React Developer Tools browser extension for component inspection.

#### Common Issues
```bash
# Module not found errors
node dev.js clean    # Clean reinstall

# Port already in use
lsof -ti:3000 | xargs kill -9    # Kill process on port 3000

# Environment variables not loading
cat .env    # Verify file contents and location
```

### Backend Debugging

#### Lambda Function Logs
```bash
# Local development logs appear in terminal
node dev.js backend

# AWS CloudWatch logs for deployed functions
aws logs tail /aws/lambda/movierec-signin --follow
```

#### API Testing
```bash
# Test specific endpoint
curl -X GET http://localhost:3001/dev/recommendations

# Test with authentication
curl -X GET http://localhost:3001/dev/user/preferences \
  -H "Authorization: Bearer your-jwt-token"
```

#### Database Debugging
```bash
# Test DynamoDB connections
cd tests && npm run test:dynamodb

# Check DynamoDB Local (if using serverless-offline)
# Tables available at http://localhost:8000
```

## Environment Troubleshooting

### Common Setup Issues

#### AWS CLI Not Configured
```bash
aws sts get-caller-identity    # Should return your AWS account info
```

#### Node.js Version Issues
```bash
node --version    # Should be 18+
npm --version     # Should be 8+
```

#### Port Conflicts
```bash
# Check what's running on development ports
lsof -i :3000    # Frontend port
lsof -i :3001    # Backend port

# Kill processes if needed
kill -9 <process-id>
```

#### Dependency Issues
```bash
# Clean install
node dev.js clean

# Clear npm cache
npm cache clean --force

# Delete package-lock.json and reinstall
rm package-lock.json
npm install
```

### Performance Issues

#### Slow Development Server
```bash
# Check system resources
top

# Reduce webpack polling
export CHOKIDAR_USEPOLLING=false

# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### Slow API Responses
- Check AWS region configuration (should be eu-north-1)
- Verify network connectivity
- Monitor Lambda cold start times

## VS Code Configuration

### Recommended Extensions
- ES7+ React/Redux/React-Native snippets
- AWS Toolkit
- Jest
- Prettier - Code formatter
- ESLint
- Auto Rename Tag
- Bracket Pair Colorizer

### Workspace Settings (`.vscode/settings.json`)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  }
}
```

### Debug Configuration (`.vscode/launch.json`)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "cwd": "${workspaceFolder}/tests",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Git Workflow

### Branch Strategy
```bash
# Feature development
git checkout -b feature/your-feature-name
git commit -m "Add feature description"
git push origin feature/your-feature-name

# Create PR for review
```

### Pre-commit Checks
```bash
# Before committing, run:
node dev.js lint          # Check code quality
node dev.js test          # Run tests
node dev.js build         # Verify build works
```

### Commit Message Format
```
type(scope): description

feat(auth): add user registration flow
fix(api): resolve CORS issues for production
docs(readme): update installation instructions
```

## Productivity Tips

### Keyboard Shortcuts
- `Ctrl+C` - Stop development server
- `Ctrl+Shift+R` - Hard refresh browser (clear cache)
- `F12` - Open browser developer tools

### Development Scripts
```bash
# Create an alias for quick access
echo 'alias mdev="node dev.js"' >> ~/.bashrc
source ~/.bashrc

# Now you can use:
mdev start
mdev test
mdev status
```

### Multiple Terminal Setup
1. **Terminal 1**: Development servers (`node dev.js start`)
2. **Terminal 2**: Testing (`node dev.js test:watch`)
3. **Terminal 3**: Git operations and general commands

This development setup guide provides everything needed to get up and running with the MovieRec application efficiently and effectively.