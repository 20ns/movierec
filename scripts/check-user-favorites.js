#!/usr/bin/env node

/**
 * Check User Favorites Script
 * This script checks if a user exists and their favorites in DynamoDB
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { CognitoIdentityProviderClient, ListUsersCommand } = require("@aws-sdk/client-cognito-identity-provider");

// Load environment variables
require('dotenv').config();

const client = new DynamoDBClient({ region: 'eu-north-1' });
const docClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({ region: 'eu-north-1' });

async function checkUserInCognito(email) {
  console.log(`🔍 Checking Cognito for user with email: ${email}`);
  
  try {
    const command = new ListUsersCommand({
      UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
      Filter: `email = "${email}"`
    });
    
    const response = await cognitoClient.send(command);
    
    if (response.Users && response.Users.length > 0) {
      const user = response.Users[0];
      console.log(`✅ User found in Cognito:`);
      console.log(`   Username: ${user.Username}`);
      console.log(`   Email: ${user.Attributes.find(attr => attr.Name === 'email')?.Value || 'N/A'}`);
      console.log(`   User Status: ${user.UserStatus}`);
      console.log(`   Created: ${user.UserCreateDate}`);
      return user.Username;
    } else {
      console.log(`❌ No user found with email: ${email}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error checking Cognito:`, error.message);
    return null;
  }
}

async function checkUserFavorites(userId) {
  console.log(`\n🔍 Checking favorites for user: ${userId}`);
  
  try {
    const command = new QueryCommand({
      TableName: 'Favourites',
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      }
    });
    
    const response = await docClient.send(command);
    
    if (response.Items && response.Items.length > 0) {
      console.log(`✅ Found ${response.Items.length} favorites:`);
      response.Items.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title || 'No title'} (ID: ${item.movieId})`);
        console.log(`      Added: ${item.addedAt || 'N/A'}`);
      });
      return response.Items;
    } else {
      console.log(`❌ No favorites found for user: ${userId}`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error checking favorites:`, error.message);
    return [];
  }
}

async function scanAllFavorites() {
  console.log(`\n🔍 Scanning all favorites in the table...`);
  
  try {
    const command = new ScanCommand({
      TableName: 'Favourites',
      Limit: 10 // Limit to first 10 items
    });
    
    const response = await docClient.send(command);
    
    if (response.Items && response.Items.length > 0) {
      console.log(`✅ Found ${response.Items.length} total favorites (showing first 10):`);
      response.Items.forEach((item, index) => {
        console.log(`   ${index + 1}. User: ${item.userId}, Movie: ${item.title || 'No title'} (ID: ${item.movieId})`);
      });
      return response.Items;
    } else {
      console.log(`❌ No favorites found in the table`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error scanning favorites:`, error.message);
    return [];
  }
}

async function main() {
  const email = 'ns.2004@outlook.com';
  
  console.log('🎬 MovieRec User & Favorites Checker\n');
  console.log('Environment check:');
  console.log(`- User Pool ID: ${process.env.REACT_APP_COGNITO_USER_POOL_ID}`);
  console.log(`- Region: eu-north-1`);
  console.log(`- Favorites Table: Favourites\n`);
  
  // Check if user exists in Cognito
  const userId = await checkUserInCognito(email);
  
  if (userId) {
    // Check user's favorites
    await checkUserFavorites(userId);
  }
  
  // Also scan all favorites to see if there's any data
  await scanAllFavorites();
  
  console.log('\n✅ Check complete!');
}

main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
