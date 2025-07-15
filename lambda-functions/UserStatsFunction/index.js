const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const { createApiResponse } = require("/opt/nodejs/shared/response");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.USER_PREFERENCES_TABLE || 'UserPreferences';

let verifier;
try {
  verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    tokenUse: "access",
    clientId: process.env.COGNITO_CLIENT_ID,
  });
} catch (error) {
  console.error("Failed to create Cognito JWT verifier:", error);
}

/**
 * Default user stats structure
 */
const getDefaultUserStats = () => ({
  totalXP: 0,
  userLevel: 1,
  moviesWatched: 0,
  showsWatched: 0,
  dailyStreak: 0,
  lastActiveDate: new Date().toISOString(),
  challengeProgress: {},
  completedChallenges: [],
  activeChallenges: [],
  achievements: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

/**
 * Get user dashboard data
 */
async function getUserStats(userId) {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { userId }
    };

    const result = await docClient.send(new GetCommand(params));
    
    if (!result.Item) {
      // Return default stats for new users
      return getDefaultUserStats();
    }

    // Extract dashboard data from user preferences, with defaults
    const userStats = {
      totalXP: result.Item.dashboardData?.totalXP || 0,
      userLevel: result.Item.dashboardData?.userLevel || 1,
      moviesWatched: result.Item.dashboardData?.moviesWatched || 0,
      showsWatched: result.Item.dashboardData?.showsWatched || 0,
      dailyStreak: result.Item.dashboardData?.dailyStreak || 0,
      lastActiveDate: result.Item.dashboardData?.lastActiveDate || new Date().toISOString(),
      challengeProgress: result.Item.dashboardData?.challengeProgress || {},
      completedChallenges: result.Item.dashboardData?.completedChallenges || [],
      activeChallenges: result.Item.dashboardData?.activeChallenges || [],
      achievements: result.Item.dashboardData?.achievements || [],
      createdAt: result.Item.dashboardData?.createdAt || new Date().toISOString(),
      updatedAt: result.Item.dashboardData?.updatedAt || new Date().toISOString()
    };

    return userStats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw new Error('Failed to get user stats');
  }
}

/**
 * Update user dashboard data
 */
async function updateUserStats(userId, statsUpdate) {
  try {
    const currentTime = new Date().toISOString();
    
    // Calculate level from XP
    if (statsUpdate.totalXP !== undefined) {
      statsUpdate.userLevel = Math.floor(statsUpdate.totalXP / 1000) + 1;
    }
    
    statsUpdate.updatedAt = currentTime;

    const params = {
      TableName: TABLE_NAME,
      Key: { userId },
      UpdateExpression: 'SET dashboardData = if_not_exists(dashboardData, :defaultData)',
      ExpressionAttributeValues: {
        ':defaultData': getDefaultUserStats()
      },
      ReturnValues: 'ALL_NEW'
    };

    // First ensure dashboardData exists
    await docClient.send(new UpdateCommand(params));

    // Now update specific fields
    const updateFields = [];
    const attributeValues = {};
    
    Object.keys(statsUpdate).forEach(key => {
      updateFields.push(`dashboardData.#${key} = :${key}`);
      attributeValues[`:${key}`] = statsUpdate[key];
    });

    const updateParams = {
      TableName: TABLE_NAME,
      Key: { userId },
      UpdateExpression: `SET ${updateFields.join(', ')}`,
      ExpressionAttributeNames: Object.keys(statsUpdate).reduce((acc, key) => {
        acc[`#${key}`] = key;
        return acc;
      }, {}),
      ExpressionAttributeValues: attributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await docClient.send(new UpdateCommand(updateParams));
    return result.Attributes.dashboardData;
    
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw new Error('Failed to update user stats');
  }
}

/**
 * Award XP and update achievements
 */
async function awardXP(userId, xpAmount, reason = 'General activity') {
  try {
    const currentStats = await getUserStats(userId);
    const newXP = currentStats.totalXP + xpAmount;
    const newLevel = Math.floor(newXP / 1000) + 1;
    
    const updateData = {
      totalXP: newXP,
      userLevel: newLevel,
      lastActiveDate: new Date().toISOString()
    };

    // Check for level up achievement
    if (newLevel > currentStats.userLevel) {
      updateData.achievements = [
        ...currentStats.achievements,
        {
          id: `level_${newLevel}`,
          name: `Level ${newLevel}`,
          description: `Reached level ${newLevel}`,
          unlockedAt: new Date().toISOString(),
          xpReward: 0
        }
      ];
    }

    return await updateUserStats(userId, updateData);
  } catch (error) {
    console.error('Error awarding XP:', error);
    throw new Error('Failed to award XP');
  }
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  console.log('UserStats Request:', JSON.stringify(event, null, 2));

  // Handle CORS preflight OPTIONS method
  if (event.httpMethod === 'OPTIONS') {
    return createApiResponse(204, null, event);
  }

  try {
    // Extract and verify JWT token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createApiResponse(401, { error: "Unauthorized" }, event);
    }

    const token = authHeader.substring(7);
    
    // Validate token format before processing
    if (!token || token.trim() === '') {
      console.error('Empty token after Bearer prefix');
      return createApiResponse(401, { error: "Token is empty" }, event);
    }
    
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('Invalid token format: expected 3 parts, got', tokenParts.length, 'token:', token.substring(0, 50));
      return createApiResponse(401, { 
        error: "Invalid JWT token format",
        details: `Expected 3 parts separated by dots, got ${tokenParts.length} parts`
      }, event);
    }
    
    let payload;
    
    if (process.env.IS_OFFLINE === 'true') {
      // Bypass JWT verification in offline mode
      payload = { sub: 'offline-user-id', email: 'offline@example.com' };
    } else {
      if (!verifier) {
        console.error("JWT verifier not available");
        return createApiResponse(500, { error: "JWT verifier configuration error" }, event);
      }
      try {
        payload = await verifier.verify(token);
      } catch (error) { // JWT token verification error
        console.error("Token verification error:", error);
        console.error("Token verification failed:", error);
        return createApiResponse(401, { error: "Authentication failed", details: "Invalid or expired token" }, event);
      }
    }

    const userId = payload.sub;
    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};

    switch (method) {
      case 'GET':
        if (pathParameters.action === 'stats') {
          const stats = await getUserStats(userId);
          return createApiResponse(200, { 
            success: true,
            data: stats 
          }, event);
        }
        break;

      case 'POST':
        let body;
        try {
          body = JSON.parse(event.body || '{}');
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          return createApiResponse(400, { error: "Invalid JSON in request body" }, event);
        }
        
        if (pathParameters.action === 'award-xp') {
          const { xpAmount, reason } = body;
          const updatedStats = await awardXP(userId, xpAmount, reason);
          return createApiResponse(200, { 
            success: true,
            data: updatedStats 
          }, event);
        }
        
        if (pathParameters.action === 'update') {
          const updatedStats = await updateUserStats(userId, body);
          return createApiResponse(200, { 
            success: true,
            data: updatedStats 
          }, event);
        }
        break;

      default:
        return createApiResponse(405, { error: `Method ${method} not supported` }, event);
    }

    return createApiResponse(404, { error: 'Endpoint not found' }, event);

  } catch (error) {
    console.error('UserStats Error:', error);
    return createApiResponse(500, { error: error.message }, event);
  }
};
