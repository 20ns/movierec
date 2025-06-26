# 03: Infrastructure (AWS CDK)

## 1. Overview

The entire cloud infrastructure for this project is managed using the **AWS Cloud Development Kit (CDK)**. This approach, known as Infrastructure as Code (IaC), allows for the definition, provisioning, and management of the AWS resources in a declarative way, using a high-level programming language (TypeScript in this case).

## 2. Core Components

The infrastructure is defined in the `infrastructure` directory and is composed of the following key components:

*   **`InfrastructureStack`**: This is the main CDK stack that defines all the AWS resources required for the application.
*   **`bin/infrastructure.ts`**: The entry point for the CDK application, which instantiates the `InfrastructureStack`.
*   **`lib/infrastructure-stack.ts`**: The core file where all the AWS resources are defined and configured.

## 3. Provisioned Resources

The `InfrastructureStack` provisions the following AWS resources:

### 3.1. AWS Lambda Functions

*   The stack defines all the Lambda functions for the backend, as detailed in the `02_Backend_Lambda_Functions.md` document.
*   Each function is configured with its runtime (Node.js), handler, code location, and an IAM role with the necessary permissions.

### 3.2. Amazon API Gateway

*   A single REST API is created to serve as the entry point for all backend services.
*   The API is configured with a default CORS policy to allow requests from the frontend application.
*   It has a `prod` deployment stage with tracing and logging enabled.

### 3.3. API Gateway Routes

The stack defines the following API routes and integrates them with the corresponding Lambda functions:

*   **`/auth/signin` (POST)**: Integrates with the `SigninFunction`.
*   **`/auth/signup` (POST)**: Integrates with the `SignupFunction`.
*   **`/auth/refresh` (POST)**: Integrates with the `RefreshTokenFunction`.
*   **`/user/preferences` (GET, POST)**: Integrates with the `UserPreferencesFunction` and is protected by the Cognito authorizer.
*   **`/user/favourites` (GET, POST, DELETE)**: Integrates with the `FavouritesFunction` and is protected by the Cognito authorizer.
*   **`/user/watchlist` (GET, POST, DELETE)**: Integrates with the `WatchlistFunction` and is protected by the Cognito authorizer.
*   **`/recommendations` (GET)**: Integrates with the `MovieRecFunction` and is protected by the Cognito authorizer.
*   **`/media` (GET)**: Integrates with the `MediaCacheFunction` and is a public endpoint.

### 3.4. Amazon Cognito

*   The stack **imports an existing Cognito User Pool and User Pool Client**. It does not create new ones. This is a critical point, as it means the user authentication system is managed outside of this specific CDK stack.
*   A **Cognito Authorizer** is created for API Gateway, which is used to protect the private API routes.

### 3.5. Amazon DynamoDB

*   The stack **imports existing DynamoDB tables**. It does not create new ones. The tables are:
    *   `UserPreferences`
    *   `MovieRecCache`
    *   `Favourites`
    *   `Watchlist`

### 3.6. IAM Roles and Policies

*   A single **Lambda Execution Role** is created and shared by all Lambda functions.
*   This role is granted the necessary permissions to:
    *   Write logs to CloudWatch.
    *   Access the DynamoDB tables (read, write, query).
    *   Interact with the Cognito User Pool.

### 3.7. Lambda Layers

*   A **JWT Lambda Layer** is created to share the `aws-jwt-verify` library among the Lambda functions that require JWT validation. This reduces the size of each individual function package.

## 4. Deployment

The infrastructure can be deployed to AWS using the following CDK commands:

*   `cdk deploy`: Deploys the stack to the configured AWS account and region.
*   `cdk diff`: Compares the deployed stack with the current state of the code.
*   `cdk destroy`: Destroys the stack and all its resources.
