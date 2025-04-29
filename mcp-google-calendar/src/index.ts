#!/usr/bin/env node

import * as http from 'http';
import * as net from 'net';
import { GoogleCalendarProvider } from './googleCalendarProvider';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Find an available port
async function getAvailablePort(startPort = 3000, maxAttempts = 10): Promise<number> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    try {
      await new Promise<void>((resolve, reject) => {
        const server = net.createServer();
        server.once('error', (err) => {
          server.close();
          reject(err);
        });
        server.once('listening', () => {
          server.close();
          resolve();
        });
        server.listen(port);
      });
      return port;
    } catch (err) {
      console.error(`Port ${port} is not available, trying next port...`);
    }
  }
  throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
}

// Ensure we have consistent refresh token access
function setupRefreshToken() {
  // Location of token storage file
  const tokenPath = path.join(__dirname, '..', '.google_refresh_token');
  
  // Check if we have a refresh token in environment variable (highest priority)
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    console.error('Using refresh token from environment variables');
    
    // Save it to file for future use
    fs.writeFileSync(tokenPath, process.env.GOOGLE_REFRESH_TOKEN);
    return true;
  }
  
  // If not in env vars, try loading from file
  if (fs.existsSync(tokenPath)) {
    const token = fs.readFileSync(tokenPath, 'utf8').trim();
    if (token) {
      process.env.GOOGLE_REFRESH_TOKEN = token;
      console.error('Loaded refresh token from stored file');
      return true;
    }
  }
  
  console.error('No refresh token found');
  return false;
}

// Simple server implementation
async function main() {
  try {
    // Setup refresh token first
    const hasToken = setupRefreshToken();
    
    // Get an available port
    const PORT = await getAvailablePort();
    console.error(`Found available port: ${PORT}`);

    // Initialize Google Calendar provider
    console.error('Initializing Google Calendar provider...');
    const provider = new GoogleCalendarProvider();
    await provider.initialize();
    
    // Create a simple HTTP server to handle requests
    const server = http.createServer(async (req, res) => {
      // Set CORS headers for all responses
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      
      // Handle auth callback
      const url = new URL(req.url || '/', `http://localhost:${PORT}`);
      if (url.pathname === '/auth/callback' && req.method === 'GET') {
        const code = url.searchParams.get('code');
        if (code) {
          try {
            console.error('Received authorization code, exchanging for token...');
            await provider.setAuthCode(code);
            
            // Save the refresh token to both environment and file
            if (process.env.GOOGLE_REFRESH_TOKEN) {
              const tokenPath = path.join(__dirname, '..', '.google_refresh_token');
              fs.writeFileSync(tokenPath, process.env.GOOGLE_REFRESH_TOKEN);
              console.error('Saved refresh token for future use');
            }

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <head>
                  <title>Authorization Successful</title>
                  <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                    h1 { color: #4285F4; }
                    .success { color: #0F9D58; font-weight: bold; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>Google Calendar Authorization Successful!</h1>
                    <p class="success">✅ Your Google Calendar MCP server is now authorized</p>
                    <p>The server has been authenticated and is ready to use with your AI assistant.</p>
                    <p>You can close this window and return to your application.</p>
                  </div>
                </body>
              </html>
            `);
          } catch (error) {
            console.error('Error processing authorization code:', error);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <head>
                  <title>Authorization Failed</title>
                  <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                    h1 { color: #DB4437; }
                    .error { color: #DB4437; font-weight: bold; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>Authorization Failed</h1>
                    <p class="error">Error: ${error instanceof Error ? error.message : String(error)}</p>
                    <p>Please try again or check your Google Cloud Console settings.</p>
                  </div>
                </body>
              </html>
            `);
          }
          return;
        }
      }
      
      // Health check endpoint
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          status: 'ok',
          server: 'google-calendar-mcp',
          port: PORT,
          tools: Object.keys(provider.getToolDefinitions()),
          authenticated: provider.isAuthenticated()
        }));
        return;
      }
      
      // Handle MCP protocol request
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            // Parse the request body
            const request = JSON.parse(body);
            console.error(`Received request for tool: ${request.name}`);
            
            // Process the request using our provider
            const response = await provider.handleRequest(
              { request: request },
              {}
            );
            
            // Send the response
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response));
            
          } catch (error) {
            console.error('Error processing request:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: {
                message: error instanceof Error ? error.message : String(error),
                code: 'INTERNAL_ERROR'
              }
            }));
          }
        });
      } else {
        res.statusCode = 405;
        res.end('Method Not Allowed');
      }
    });
    
    // Start the server
    server.listen(PORT, () => {
      // Update the redirect URI with the actual port
      if (PORT !== 3000) {
        process.env.GOOGLE_REDIRECT_URI = `http://localhost:${PORT}/auth/callback`;
        console.error(`⚠️ Updated redirect URI to: ${process.env.GOOGLE_REDIRECT_URI}`);
        console.error(`⚠️ Note: This URI should match your Google Cloud Console settings!`);
      }
      
      console.error(`\n🚀 Server running at http://localhost:${PORT}/`);
      console.error('✅ Available tools:');
      Object.entries(provider.getToolDefinitions()).forEach(([name, def]) => {
        console.error(`  - ${name}: ${def.description}`);
      });
      
      if (!provider.isAuthenticated()) {
        console.error('\n⚠️ WARNING: Not authenticated with Google Calendar.');
        console.error('Follow the authentication instructions above to connect to your Google Calendar.');
      } else {
        console.error('\n✅ Successfully authenticated with Google Calendar!');
        console.error('The server is ready to use with your AI assistant.');
      }
      
      // Send initialization success signal to VS Code
      console.log('{"jsonrpc":"2.0","id":1,"result":{"capabilities":{"mcp":{"version":"0.1.0"}}}}');
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();