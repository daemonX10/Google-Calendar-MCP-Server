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
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    console.error('Error: Missing required environment variables');
    console.error('Make sure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are set in your .env file');
    process.exit(1);
  }

  try {
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Get tokens from authorization code
    const { tokens } = await oauth2Client.getToken(authCode);
    
    if (!tokens.refresh_token) {
      console.error('Error: No refresh token received. Try revoking access and authorizing again with prompt=consent');
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
    process.exit(1);
  }
}

getRefreshToken();