# 06: Testing Strategy

## 1. Overview

The project has a comprehensive testing strategy that covers various levels of the application, from individual backend components to end-to-end flows. The tests are designed to ensure the correctness, reliability, and performance of the application.

## 2. Testing Scripts

The testing scripts are located in the `tests/aws` and `scripts` directories. The `package.json` file contains a set of npm scripts for running these tests.

### 2.1. Main Test Runner (`tests/aws/aws-test-runner.js`)

*   **Purpose**: This is the master script for running the entire AWS-related test suite.
*   **Command**: `npm test` or `npm run test:aws`
*   **Functionality**:
    *   It orchestrates the execution of the other test suites: endpoint tests, Lambda tests, and DynamoDB tests.
    *   It can run the suites sequentially or in parallel.
    *   It generates a comprehensive report at the end, summarizing the results of all tests.

### 2.2. API Endpoint Tests (`tests/aws/endpoint-tests.js`)

*   **Purpose**: This suite focuses on testing the API Gateway endpoints.
*   **Command**: `npm run test:aws:endpoints`
*   **Functionality**:
    *   **Authentication**: It tests the sign-up, sign-in, and token refresh endpoints.
    *   **Authorization**: It verifies that protected endpoints return a `401 Unauthorized` error when no authentication token is provided.
    *   **Public Endpoints**: It checks that the public-facing endpoints (like `/media`) are accessible without authentication.
    *   **CORS**: It tests the CORS preflight `OPTIONS` requests to ensure that the API allows requests from the frontend.
    *   **Error Handling**: It checks how the API handles invalid requests and malformed data.

### 2.3. Lambda Function Tests (`tests/aws/lambda-tests.js`)

*   **Purpose**: This suite tests the individual Lambda functions.
*   **Command**: `npm run test:aws:lambda`
*   **Functionality**:
    *   It makes requests to the API Gateway endpoints that trigger the corresponding Lambda functions.
    *   It checks the response status code, response time, and the structure of the returned data.
    *   It includes tests for the authentication flow, data access functions, and public functions.
    *   It also includes a basic cold start performance test.

### 2.4. DynamoDB Integration Tests (`tests/aws/dynamodb-tests.js`)

*   **Purpose**: This suite tests the integration between the Lambda functions and the DynamoDB tables.
*   **Command**: `npm run test:aws:dynamodb`
*   **Functionality**:
    *   It makes requests to the endpoints that perform CRUD (Create, Read, Update, Delete) operations on the DynamoDB tables.
    *   It verifies that the endpoints are protected by authentication.
    *   It tests the data validation by sending invalid data to the endpoints.
    *   It checks the database connectivity and response times.

### 2.5. Comprehensive End-to-End Test (`scripts/test-comprehensive.js`)

*   **Purpose**: This script provides a full end-to-end test of the user authentication and data access flow.
*   **Functionality**:
    1.  It tests the public media endpoint.
    2.  It attempts to sign up a new user.
    3.  It signs in with the test user's credentials to obtain an auth token.
    4.  It uses the auth token to access a protected endpoint (user preferences).
    5.  It provides a summary of the test results.

## 3. How to Run the Tests

The tests can be run using the npm scripts defined in `package.json`:

*   `npm test`: Runs the main test runner, which executes all AWS-related tests sequentially.
*   `npm run test:aws:parallel`: Runs all AWS-related tests in parallel.
*   `npm run test:aws:endpoints`: Runs only the API endpoint tests.
*   `npm run test:aws:lambda`: Runs only the Lambda function tests.
*   `npm run test:aws:dynamodb`: Runs only the DynamoDB integration tests.
