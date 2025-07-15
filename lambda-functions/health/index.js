const { DynamoDBClient, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { createApiResponse } = require("./shared/response");

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' });

// Health check endpoint for monitoring deployment success
exports.handler = async (event) => {
  // Handle CORS preflight OPTIONS method
  if (event.httpMethod === 'OPTIONS') {
    return createApiResponse(204, null, event);
  }

  try {
    const startTime = Date.now();
    const healthChecks = {};

    // Check DynamoDB tables
    const tables = ['UserPreferences', 'MovieRecCache', 'Favourites', 'Watchlist'];
    
    for (const tableName of tables) {
      try {
        const command = new DescribeTableCommand({ TableName: tableName });
        const result = await dynamoClient.send(command);
        
        healthChecks[`dynamodb_${tableName.toLowerCase()}`] = {
          status: result.Table.TableStatus === 'ACTIVE' ? 'healthy' : 'unhealthy',
          tableStatus: result.Table.TableStatus,
          itemCount: result.Table.ItemCount || 0
        };
      } catch (error) {
        healthChecks[`dynamodb_${tableName.toLowerCase()}`] = {
          status: 'unhealthy',
          error: error.message
        };
      }
    }

    // Check environment variables with proper validation
    const requiredEnvVars = ['AWS_REGION', 'TMDB_API_KEY'];
    healthChecks.environment = {
      status: requiredEnvVars.every(envVar => process.env[envVar]) ? 'healthy' : 'unhealthy',
      missing: requiredEnvVars.filter(envVar => !process.env[envVar])
    };
    
    // Handle missing environment variables with 400 error
    if (healthChecks.environment.missing.length > 0) {
      return createApiResponse(400, {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Missing required environment variables',
        missing: healthChecks.environment.missing
      }, event);
    }

    // Lambda function health
    healthChecks.lambda = {
      status: 'healthy',
      memory: `${process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE}MB`,
      timeout: `${process.env.AWS_LAMBDA_FUNCTION_TIMEOUT}s`,
      runtime: process.version,
      region: process.env.AWS_REGION
    };

    // Overall health status
    const allHealthy = Object.values(healthChecks).every(check => 
      check.status === 'healthy'
    );

    const responseTime = Date.now() - startTime;

    const response = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      version: process.env.AWS_LAMBDA_FUNCTION_VERSION || 'unknown',
      environment: process.env.ENVIRONMENT || 'production',
      checks: healthChecks,
      summary: {
        total_checks: Object.keys(healthChecks).length,
        healthy_checks: Object.values(healthChecks).filter(c => c.status === 'healthy').length,
        unhealthy_checks: Object.values(healthChecks).filter(c => c.status === 'unhealthy').length
      }
    };

    return createApiResponse(allHealthy ? 200 : 503, response, event);

  } catch (error) {
    console.error('Health check failed:', error);

    return createApiResponse(500, {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }, event);
  }
};

