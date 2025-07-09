const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const axios = require('axios');
const { createApiResponse } = require("./shared/response");

// Initialize DynamoDB
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createApiResponse(204, null, event);
  }

  if (event.httpMethod === 'GET') {
    try {
      // This is a public endpoint for media data
      // Extract query parameters
      const queryParams = event.queryStringParameters || {};
      const mediaType = queryParams.mediaType || 'both';
      const page = parseInt(queryParams.page) || 1;
      const limit = Math.min(parseInt(queryParams.limit) || 20, 50); // Max 50 items

      // For now, return a simple response - you can enhance this with actual TMDB API calls
      const mediaData = {
        results: [],
        page: page,
        total_pages: 1,
        total_results: 0,
        message: "Media cache feature coming soon"
      };

      return createApiResponse(200, mediaData, event);
    } catch (error) {
      console.error("Error getting media cache:", error);
      return createApiResponse(500, { error: "Internal server error" }, event);
    }
  } else {
    return createApiResponse(405, { error: "Method not allowed" }, event);
  }
};
