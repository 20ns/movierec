const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };

    try {
        // Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ message: 'CORS preflight' })
            };
        }

        // Get user ID from Cognito token
        const userId = event.requestContext?.authorizer?.claims?.sub;
        if (!userId) {
            return {
                statusCode: 401,
                headers: headers,
                body: JSON.stringify({ error: 'Unauthorized - User ID not found' })
            };
        }

        const method = event.httpMethod;
        
        switch (method) {
            case 'GET':
                return await getPreferences(userId, headers);
            case 'POST':
                return await savePreferences(userId, JSON.parse(event.body), headers);
            case 'PUT':
                return await updatePreferences(userId, JSON.parse(event.body), headers);
            default:
                return {
                    statusCode: 405,
                    headers: headers,
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message 
            })
        };
    }
};

async function getPreferences(userId, headers) {
    try {
        const params = {
            TableName: process.env.USER_PREFERENCES_TABLE,
            Key: { userId: userId }
        };

        const result = await dynamodb.get(params).promise();
        
        if (result.Item) {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify(result.Item)
            };
        } else {
            return {
                statusCode: 404,
                headers: headers,
                body: JSON.stringify({ message: 'Preferences not found' })
            };
        }
    } catch (error) {
        console.error('Get preferences error:', error);
        throw error;
    }
}

async function savePreferences(userId, preferences, headers) {
    try {
        const item = {
            userId: userId,
            ...preferences,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        const params = {
            TableName: process.env.USER_PREFERENCES_TABLE,
            Item: item
        };

        await dynamodb.put(params).promise();

        return {
            statusCode: 201,
            headers: headers,
            body: JSON.stringify({ 
                message: 'Preferences saved successfully',
                data: item 
            })
        };
    } catch (error) {
        console.error('Save preferences error:', error);
        throw error;
    }
}

async function updatePreferences(userId, preferences, headers) {
    try {
        const item = {
            userId: userId,
            ...preferences,
            updatedAt: new Date().toISOString()
        };

        const params = {
            TableName: process.env.USER_PREFERENCES_TABLE,
            Item: item
        };

        await dynamodb.put(params).promise();

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ 
                message: 'Preferences updated successfully',
                data: item 
            })
        };
    } catch (error) {
        console.error('Update preferences error:', error);
        throw error;
    }
}
