import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

/**
 * Helper script to get a refresh token from an authorization code
 * 
 * Usage:
 * npx ts-node src/auth-helper.ts "YOUR_AUTH_CODE"
 */
async function getRefreshToken() {
  // Get the authorization code from command line arguments
  const authCode = process.argv[2];
  
  if (!authCode) {
    console.error('Error: No authorization code provided');
    console.error('Usage: npx ts-node src/auth-helper.ts "YOUR_AUTH_CODE"');
    process.exit(1);
  }

  // Check required environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET; 
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Error: Missing required environment variables');
    console.error('Make sure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are set in your .env file');
    console.error(`Current values:`);
    console.error(`- GOOGLE_CLIENT_ID: ${clientId ? '✅ Set' : '❌ Missing'}`);
    console.error(`- GOOGLE_CLIENT_SECRET: ${clientSecret ? '✅ Set' : '❌ Missing'}`);
    console.error(`- GOOGLE_REDIRECT_URI: ${redirectUri || '❌ Missing'}`);
    process.exit(1);
  }

  // Debugging info
  console.log('Attempting to get refresh token with:');
  console.log(`- Auth Code: ${authCode.substring(0, 5)}...`);
  console.log(`- Redirect URI: ${redirectUri}`);

  try {
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Get tokens from authorization code
    console.log('Exchanging auth code for tokens...');
    const { tokens } = await oauth2Client.getToken(authCode);
    
    if (!tokens.refresh_token) {
      console.error('Error: No refresh token received. This typically happens when:');
      console.error('1. You\'ve previously authorized this application (tokens are only issued on first approval)');
      console.error('2. The authorization didn\'t include the "prompt=consent" parameter');
      console.error('\nTry these steps:');
      console.error('1. Go to https://myaccount.google.com/permissions');
      console.error('2. Revoke access for your app');
      console.error('3. Restart the server and try authentication again');
      process.exit(1);
    }

    // Success - display the refresh token
    console.log('\n✅ Successfully obtained refresh token!');
    console.log('\n🔑 Refresh Token:');
    console.log(tokens.refresh_token);
    
    // Update .env file with the refresh token
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
      // Replace existing refresh token
      envContent = envContent.replace(
        /GOOGLE_REFRESH_TOKEN=.*(\r?\n|$)/,
        `GOOGLE_REFRESH_TOKEN='${tokens.refresh_token}'$1`
      );
    } else {
      // Add refresh token
      envContent += `\nGOOGLE_REFRESH_TOKEN='${tokens.refresh_token}'\n`;
    }
    
    // Write updated content back to .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Added refresh token to .env file');
    console.log('\nYou can now start the MCP server with:');
    console.log('npx ts-node src/index.ts');
    
    // Set up calendar client to verify it works
    oauth2Client.setCredentials({ refresh_token: tokens.refresh_token });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    console.log('\n🔍 Testing connection to Google Calendar API...');
    const calendarList = await calendar.calendarList.list();
    console.log(`✅ Connection successful! Found ${calendarList.data.items?.length || 0} calendars.`);
    
  } catch (error) {
    console.error('Error getting refresh token:', error);
    
    // Provide more helpful error information
    if (error.message && error.message.includes('invalid_grant')) {
      console.error('\n❌ The authorization code is invalid or expired. Auth codes typically expire after a few minutes.');
      console.error('\nTry these steps:');
      console.error('1. Run the server again: npx ts-node src/index.ts');
      console.error('2. Open the authentication URL in your browser');
      console.error('3. Complete the authentication flow');
      console.error('4. Immediately copy the new code and use it with this helper');
      
      // Check if redirect URI matches
      if (redirectUri.includes('localhost')) {
        console.error('\n⚠️ Redirect URI Tips:');
        console.error('- Ensure your Google Cloud OAuth credentials have EXACTLY this redirect URI:');
        console.error(`  ${redirectUri}`);
        console.error('- The URI is case-sensitive and must match exactly');
      }
    }
    
    process.exit(1);
  }
}

getRefreshToken();