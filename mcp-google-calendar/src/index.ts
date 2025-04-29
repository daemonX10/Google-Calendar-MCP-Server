#!/usr/bin/env node

import * as http from 'http';
import { GoogleCalendarProvider } from './googleCalendarProvider';

// Simple server implementation that doesn't rely on MCP SDK
async function main() {
  try {
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
      
      // Health check endpoint
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          status: 'ok',
          server: 'google-calendar-mcp',
          tools: Object.keys(provider.getToolDefinitions()),
          authenticated: provider.isAuthenticated()
        }));
        return;
      }
      
      // Handle POST requests for tool execution
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
    
    const PORT = process.env.PORT || 3000;
    
    // Start the server
    server.listen(PORT, () => {
      console.error(`\n🚀 Server running at http://localhost:${PORT}/`);
      console.error('✅ Available tools:');
      Object.entries(provider.getToolDefinitions()).forEach(([name, def]) => {
        console.error(`  - ${name}: ${def.description}`);
      });
      
      if (!provider.isAuthenticated()) {
        console.error('\n⚠️ WARNING: Not authenticated with Google Calendar.');
        console.error('Follow the authentication instructions above to connect to your Google Calendar.');
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();