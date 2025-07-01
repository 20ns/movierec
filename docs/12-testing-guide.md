# Testing Guide

## Overview

MovieRec implements a comprehensive testing strategy covering API integration tests, AWS service tests, and component testing. The test suite is designed to validate both local development and production environments.

## Test Architecture

### Test Structure
```
tests/
├── package.json              # Test-specific dependencies
├── jest.config.js            # Jest configuration
├── setup.js                 # Test environment setup
├── api.test.js              # Full API integration tests
├── api-simple.test.js       # Basic API connectivity tests
└── aws/                     # AWS-specific test suites
    ├── aws-test-runner.js   # Test orchestration
    ├── endpoint-tests.js    # API Gateway endpoint tests
    ├── lambda-tests.js      # Lambda function tests
    └── dynamodb-tests.js    # Database integration tests
```

### Test Categories

#### 1. API Integration Tests
- **Purpose**: End-to-end API testing
- **Scope**: Authentication, user data, recommendations
- **Environment**: Local and production

#### 2. AWS Service Tests
- **Purpose**: Direct AWS service validation
- **Scope**: Lambda functions, DynamoDB, API Gateway
- **Environment**: Production AWS environment

#### 3. Component Tests
- **Purpose**: Frontend component validation
- **Scope**: React components, hooks, utilities
- **Environment**: Jest test environment

## Running Tests

### Quick Commands

```bash
# Run basic API tests
node dev.js test

# Run tests in watch mode
node dev.js test:watch

# Run with coverage report
node dev.js test:coverage

# Run all test suites
cd tests && npm run test:all

# Run AWS integration tests
cd tests && npm run test:aws
```

### Detailed Test Commands

#### Standard Jest Tests
```bash
cd tests

# Basic API connectivity test
npm run test:simple

# Full API integration tests
npm run test:api

# All Jest tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

#### AWS Service Tests
```bash
cd tests

# All AWS tests (orchestrated)
npm run test:aws

# Individual test suites
npm run test:endpoints    # API Gateway tests
npm run test:lambda      # Lambda function tests
npm run test:dynamodb    # Database tests

# Execution modes
npm run test:parallel    # Faster execution
npm run test:sequential  # Safer execution
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '../src/**/*.{js,jsx}',
    '../lambda-functions/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  testTimeout: 30000,
  verbose: true
};
```

### Test Dependencies (`package.json`)

```json
{
  "dependencies": {
    "axios": "^1.8.4",
    "https": "^1.0.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

### Environment Setup (`setup.js`)

The setup file configures:
- Test environment variables
- Global test utilities
- Timeout configurations
- Mock configurations

## API Integration Tests

### Basic Connectivity Tests (`api-simple.test.js`)

**Purpose**: Verify basic API connectivity and server health.

```javascript
describe('API Health Check', () => {
  test('should connect to the API server', async () => {
    const response = await axios.get(`${BASE_URL}/dev/recommendations`);
    expect(response.status).toBeLessThan(500);
  });
});
```

### Comprehensive API Tests (`api.test.js`)

**Test Suites**:

#### 1. Authentication Tests
```javascript
describe('Authentication Endpoints', () => {
  test('should handle user signin', async () => {
    const response = await axios.post(`${BASE_URL}/dev/auth/signin`, {
      email: 'test@example.com',
      password: 'TestPassword123!'
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('AccessToken');
  });
  
  test('should handle user signup', async () => {
    // Registration test
  });
  
  test('should handle invalid credentials', async () => {
    // Error handling test
  });
});
```

#### 2. User Data Tests
```javascript
describe('User Preferences', () => {
  test('should retrieve user preferences', async () => {
    const response = await axios.get(`${BASE_URL}/dev/user/preferences`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(response.status).toBe(200);
  });
  
  test('should update user preferences', async () => {
    // Preference update test
  });
});

describe('Favorites Management', () => {
  test('should add item to favorites', async () => {
    // Add favorite test
  });
  
  test('should remove item from favorites', async () => {
    // Remove favorite test
  });
});
```

#### 3. Content Tests
```javascript
describe('Recommendations', () => {
  test('should return personalized recommendations', async () => {
    const response = await axios.get(`${BASE_URL}/dev/recommendations`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { mediaType: 'movie' }
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('recommendations');
  });
});

describe('Media Content', () => {
  test('should return trending content', async () => {
    const response = await axios.get(`${BASE_URL}/dev/media`, {
      params: { listType: 'trending', mediaType: 'movie' }
    });
    expect(response.status).toBe(200);
  });
});
```

## AWS Service Tests

### Test Runner (`aws-test-runner.js`)

**Features**:
- Orchestrates multiple test suites
- Supports parallel and sequential execution
- Provides comprehensive reporting
- Handles test suite dependencies

```javascript
const CONFIG = {
  API_BASE_URL: 'https://your-api-id.execute-api.eu-north-1.amazonaws.com/prod',
  TEST_SUITES: {
    endpoints: { name: 'API Gateway Endpoints', enabled: true },
    lambda: { name: 'Lambda Functions', enabled: true },
    dynamodb: { name: 'DynamoDB Integration', enabled: true }
  },
  PARALLEL_EXECUTION: false
};
```

### Endpoint Tests (`endpoint-tests.js`)

**Coverage**:
- API Gateway configuration validation
- CORS policy verification
- Authentication middleware testing
- Rate limiting validation

```javascript
const tests = [
  {
    name: 'Auth - Signin Endpoint',
    method: 'POST',
    path: '/auth/signin',
    expectedStatus: [200, 400, 401],
    requiresAuth: false
  },
  {
    name: 'User - Preferences',
    method: 'GET',
    path: '/user/preferences',
    expectedStatus: [200, 401],
    requiresAuth: true
  },
  {
    name: 'Content - Recommendations',
    method: 'GET',
    path: '/recommendations',
    expectedStatus: [200, 401],
    requiresAuth: true
  }
];
```

### Lambda Function Tests (`lambda-tests.js`)

**Coverage**:
- Function invocation testing
- Error handling validation
- Performance metrics collection
- Memory and timeout validation

```javascript
const lambdaTests = [
  {
    functionName: 'movierec-signin',
    testPayload: {
      email: 'test@example.com',
      password: 'TestPassword123!'
    },
    expectedResponse: 'success'
  },
  {
    functionName: 'movierec-recommendations',
    testPayload: {
      userId: 'test-user-id',
      mediaType: 'movie'
    },
    expectedResponse: 'recommendations'
  }
];
```

### DynamoDB Tests (`dynamodb-tests.js`)

**Coverage**:
- Table existence verification
- Read/write operation testing
- Index functionality validation
- Performance metrics collection

```javascript
const dynamoTests = [
  {
    tableName: 'UserPreferences',
    operations: ['read', 'write', 'update', 'delete'],
    indexes: []
  },
  {
    tableName: 'MovieRecCache',
    operations: ['read', 'write', 'query'],
    indexes: ['genre-index']
  },
  {
    tableName: 'Favourites',
    operations: ['read', 'write', 'delete'],
    indexes: []
  },
  {
    tableName: 'Watchlist',
    operations: ['read', 'write', 'delete'],
    indexes: []
  }
];
```

## Test Environment Configuration

### Environment Variables

Tests use the following environment configuration:

```bash
# API Gateway URL (auto-detected or configured)
REACT_APP_API_GATEWAY_INVOKE_URL=https://your-api-id.execute-api.eu-north-1.amazonaws.com/prod

# Test user credentials (for integration tests)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

# AWS region
AWS_DEFAULT_REGION=eu-north-1

# Test configuration
TEST_TIMEOUT=30000
TEST_PARALLEL=false
```

### Test Data Management

#### Mock Data
```javascript
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  preferences: {
    genres: ['Action', 'Comedy'],
    platforms: ['Netflix', 'Amazon Prime']
  }
};

const testMovie = {
  movieId: '12345',
  title: 'Test Movie',
  genre: 'Action'
};
```

#### Test Database State
- Tests use isolated test data
- Database operations are tested with temporary records
- Cleanup procedures remove test data after execution

## Testing Best Practices

### Test Organization

#### Descriptive Test Names
```javascript
// Good
test('should return 401 when accessing preferences without authentication')

// Poor
test('preferences test')
```

#### Logical Test Grouping
```javascript
describe('User Authentication', () => {
  describe('Valid Credentials', () => {
    test('should return JWT token for valid email/password');
    test('should include user information in response');
  });
  
  describe('Invalid Credentials', () => {
    test('should return 401 for wrong password');
    test('should return 400 for malformed email');
  });
});
```

### Error Handling Tests

```javascript
describe('Error Scenarios', () => {
  test('should handle network timeouts gracefully', async () => {
    const axiosInstance = axios.create({ timeout: 1 });
    await expect(
      axiosInstance.get(`${BASE_URL}/dev/recommendations`)
    ).rejects.toThrow('timeout');
  });
  
  test('should return appropriate error for invalid JSON', async () => {
    // Test malformed request handling
  });
});
```

### Performance Testing

```javascript
describe('Performance Tests', () => {
  test('recommendation endpoint should respond within 5 seconds', async () => {
    const startTime = Date.now();
    await axios.get(`${BASE_URL}/dev/recommendations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(5000);
  });
});
```

## Continuous Integration

### GitHub Actions Integration

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: cd tests && npm install
      - run: cd tests && npm run test:all
      - run: cd tests && npm run test:aws
```

### Pre-deployment Testing

```bash
# Pre-deployment test sequence
npm run test:all              # All Jest tests
npm run test:aws:endpoints    # API Gateway validation
npm run test:aws:lambda       # Lambda function validation
npm run test:aws:dynamodb     # Database validation
```

## Debugging Test Failures

### Common Issues

#### Test Timeouts
```javascript
// Increase timeout for slow operations
jest.setTimeout(60000);

// Or configure per test
test('slow operation', async () => {
  // test implementation
}, 60000);
```

#### Authentication Failures
```bash
# Verify environment variables
echo $REACT_APP_API_GATEWAY_INVOKE_URL

# Check AWS credentials
aws sts get-caller-identity

# Verify Cognito configuration
aws cognito-idp describe-user-pool --user-pool-id your-pool-id
```

#### Network Issues
```javascript
// Add retry logic for flaky network tests
const retryRequest = async (requestFn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### Test Debugging Tools

#### Verbose Output
```bash
# Run tests with detailed output
cd tests && npm run test:all -- --verbose

# Debug specific test file
cd tests && npx jest api.test.js --verbose
```

#### Test Coverage Analysis
```bash
# Generate coverage report
cd tests && npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Test Reporting

### Coverage Reports
- **Lines**: Percentage of code lines executed
- **Functions**: Percentage of functions called
- **Branches**: Percentage of conditional branches taken
- **Statements**: Percentage of statements executed

### Performance Metrics
- Response times for each endpoint
- Lambda function execution durations
- Database query performance
- Overall test suite execution time

### Test Results Summary
```
🎯 Starting API Gateway Endpoints
======================================================================
✅ Auth - Signin Endpoint: 248ms
✅ Auth - Signup Endpoint: 156ms
✅ User - Preferences: 89ms
✅ User - Favourites: 134ms
✅ Content - Recommendations: 1,234ms
✅ Content - Media: 267ms

📊 Results: 6 passed, 0 failed (Total: 2.13s)
```

This comprehensive testing guide ensures reliable validation of all MovieRec application components and provides the foundation for maintaining high code quality and system reliability.