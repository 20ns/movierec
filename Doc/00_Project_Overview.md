# 00: Project Overview

## 1. Project Purpose

This project is a sophisticated, personalized recommendation platform for movies and TV shows. It is designed to provide users with tailored suggestions based on their viewing habits, explicit preferences, and trending media.

## 2. Core Technologies

The application is a modern, full-stack serverless web application with a clear separation of concerns between the frontend and backend.

*   **Frontend**: A dynamic and responsive user interface built with **React**. It leverages modern JavaScript (ES6+), JSX, and the React ecosystem for a component-based architecture.

*   **Backend**: A serverless architecture hosted on **Amazon Web Services (AWS)**. The core business logic is encapsulated in **AWS Lambda** functions, which are exposed via **API Gateway**.

*   **Database**: **Amazon DynamoDB**, a NoSQL database, is used for storing user data, preferences, and other application-related information.

*   **Authentication**: User management and authentication are handled by **AWS Cognito**.

*   **Infrastructure as Code (IaC)**: The entire AWS infrastructure is defined and managed using the **AWS Cloud Development Kit (CDK)**, ensuring consistent and repeatable deployments.

*   **Styling**: The application is styled using **Tailwind CSS**, a utility-first CSS framework, for rapid and consistent UI development.

## 3. High-Level Architecture

The architecture is designed for scalability, maintainability, and cost-effectiveness.

1.  **User Interface (React)**: The user interacts with the React application, which is responsible for rendering the UI and managing the client-side state.

2.  **API Gateway**: All frontend requests are routed through API Gateway, which acts as the single entry point to the backend.

3.  **AWS Lambda**: Each backend function (e.g., fetching recommendations, managing favorites) is an independent Lambda function. This allows for granular scaling and independent development.

4.  **AWS Cognito**: Handles user sign-up, sign-in, and session management, providing secure JWTs (JSON Web Tokens) for authenticating API requests.

5.  **Amazon DynamoDB**: The Lambda functions interact with DynamoDB to persist and retrieve user data.

## 4. Key Features

*   **User Authentication**: Secure user registration and login.
*   **Personalized Recommendations**: The core feature, providing tailored media suggestions.
*   **Onboarding Questionnaire**: A guided process for new users to set their initial preferences.
*   **Media Discovery**: Users can browse trending content, and filter by genre.
*   **Search**: A comprehensive search functionality to find specific movies and TV shows.
*   **User Lists**: Users can maintain personal lists of favorites and a watchlist.
*   **Blog**: A content section for articles related to movies and TV shows.
