import { DynamoDB } from 'aws-sdk';
const dynamoDB = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE;

export const handler = async (event) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://account.d1akezqpdr5wgr.amplifyapp.com',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }

    try {
        // Verify authorization
        const authContext = event.requestContext?.authorizer?.claims;
        if (!authContext?.sub) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Missing authentication credentials" })
            };
        }

        // Query DynamoDB
        const params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': authContext.sub }
        };

        const result = await dynamoDB.query(params).promise();
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                count: result.Count,
                items: result.Items.map(item => ({
                    mediaId: item.mediaId,
                    title: item.title,
                    mediaType: item.mediaType,
                    posterPath: item.posterPath,
                    addedAt: item.addedAt
                }))
            })
        };

    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "Internal server error",
                message: error.message
            })
        };
    }
};
