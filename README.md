# Google Calendar MCP Server

This is a Model Context Protocol (MCP) server that integrates with Google Calendar API, allowing AI assistants to manage calendars, create and update events, find available time slots, and more.

## Features

- List all available calendars
- List events with filtering options
- Create, update, and delete events
- Get detailed information about specific events
- Find available time slots in a calendar
- Get upcoming meetings with status (ongoing, upcoming, past)
- Support for recurring events
- Meeting attendees management

## Setup

### Prerequisites

- Node.js 16+
- A Google Cloud project with Calendar API enabled
- OAuth 2.0 client credentials

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Google API credentials:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
   ```

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API in the API Library
4. Create OAuth 2.0 credentials:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type
   - Add `http://localhost:3000/auth/callback` as an authorized redirect URI
   - Copy the Client ID and Client Secret to your `.env` file
5. Set up the OAuth consent screen:
   - Go to APIs & Services > OAuth consent screen
   - Fill in the required information (app name, user support email, etc.)
   - Add the necessary scopes (`https://www.googleapis.com/auth/calendar` and `https://www.googleapis.com/auth/calendar.events`)
   - Add your email address as a test user

## Authentication

### First-time Authentication

1. Start the server:
   ```bash
   npx ts-node src/index.ts
   ```
2. You'll see a URL in the console output. Open this URL in your browser to authorize the application.
3. After authorization, you'll be redirected to a URL with a code parameter. Copy this code.
4. Use the authentication helper to save your refresh token:
   ```bash
   npx ts-node src/auth-helper.ts "YOUR_AUTH_CODE"
   ```
   This will automatically save the refresh token to your `.env` file and test the connection.
5. You're now ready to use the MCP server!

### Troubleshooting Authentication

If you encounter authentication issues:

1. Make sure your Google Cloud OAuth credentials are set up correctly with the exact redirect URI
2. If you're getting "invalid_grant" errors, the authorization code has likely expired - they only last a few minutes
3. If you've previously authorized the app, you might need to revoke access from [Google Account Permissions](https://myaccount.google.com/permissions) and try again
4. Ensure you've added your email as a test user in the Google Cloud Console OAuth consent screen

## Running the Server

### Development Mode

```bash
npx ts-node src/index.ts
```

### Production Mode

1. Build the server:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   npm start
   ```

## Integration with AI Assistants

### VS Code Integration

Add this to your VS Code settings.json:

```json
"mcp": {
  "servers": {
    "google-calendar": {
      "command": "npx",
      "args": ["ts-node", "/absolute/path/to/mcp-google-calendar/src/index.ts"]
    }
  }
}
```

Replace `/absolute/path/to` with the absolute path to your project directory (e.g., `E:/test/mcp-google-calendar`).

### Cursor Integration

Add this to your Cursor settings.json:

```json
"mcp": {
  "servers": {
    "google-calendar": {
      "command": "npx",
      "args": ["ts-node", "/absolute/path/to/mcp-google-calendar/src/index.ts"]
    }
  }
}
```

### Claude Desktop Integration

Create or update your `claude_desktop_config.json` file (typically located in your user home directory):

```json
{
  "mcp": {
    "servers": {
      "google-calendar": {
        "command": "node",
        "args": ["/absolute/path/to/mcp-google-calendar/dist/index.js"],
        "env": {
          "GOOGLE_CLIENT_ID": "your_client_id",
          "GOOGLE_CLIENT_SECRET": "your_client_secret",
          "GOOGLE_REDIRECT_URI": "http://localhost:3000/auth/callback",
          "GOOGLE_REFRESH_TOKEN": "your_refresh_token"
        }
      }
    }
  }
}
```

For Claude Desktop, you'll need to build the project first with `npm run build`.

### Claude.ai Web Integration

For Claude.ai web, you'll need to:

1. Keep the server running locally on your machine 
2. Use a solution like [Claude MCP Browser Extension](https://github.com/anthropics/claude-mcp-browser-extension) that connects Claude.ai to local MCP servers

### Other AI Assistants

For other AI assistants that support the Model Context Protocol:

1. Keep the server running on port 3000
2. Configure the assistant to connect to `http://localhost:3000` for the Google Calendar MCP server
3. Consult your assistant's documentation for specific MCP integration steps

## Using the MCP Server

Once integrated with your AI assistant of choice, you can interact with your Google Calendar using natural language commands. For example:

- "Show me my calendar for today"
- "Create a meeting with John tomorrow at 2pm about project planning"
- "Find available 30-minute slots in my calendar this week"
- "Reschedule my 3pm meeting to 4pm"
- "Cancel my meeting with Sarah"

## Available Tools

### list_calendars
List all available calendars.

### list_events
List events in a calendar with filtering options.
Parameters:
- `calendarId` (optional): Calendar ID (default: 'primary')
- `maxResults` (optional): Maximum number of events to return
- `timeMin` (optional): Start time in ISO format (default: now)
- `timeMax` (optional): End time in ISO format
- `q` (optional): Search term to find events

### create_event
Create a new event in a calendar.
Parameters:
- `calendarId` (optional): Calendar ID (default: 'primary')
- `summary`: Event title
- `description` (optional): Event description
- `location` (optional): Event location
- `start`: Start time in ISO format
- `end`: End time in ISO format
- `attendees` (optional): List of email addresses of attendees
- `reminders` (optional): Event reminders configuration
- `recurrence` (optional): Recurrence rules for recurring events

### get_event
Get details for a specific event.
Parameters:
- `calendarId` (optional): Calendar ID (default: 'primary')
- `eventId`: Event ID

### update_event
Update an existing event in a calendar.
Parameters:
- `calendarId` (optional): Calendar ID (default: 'primary')
- `eventId`: Event ID
- `summary` (optional): Event title
- `description` (optional): Event description
- `location` (optional): Event location
- `start` (optional): Start time in ISO format
- `end` (optional): End time in ISO format
- `attendees` (optional): List of email addresses of attendees
- `reminders` (optional): Event reminders configuration

### delete_event
Delete an event from a calendar.
Parameters:
- `calendarId` (optional): Calendar ID (default: 'primary')
- `eventId`: Event ID

### find_available_slots
Find available time slots in a calendar.
Parameters:
- `calendarId` (optional): Calendar ID (default: 'primary')
- `timeMin` (optional): Start time in ISO format (default: now)
- `timeMax` (optional): End time in ISO format
- `duration` (optional): Duration in minutes
- `workingHoursStart` (optional): Working hours start time (e.g., "09:00")
- `workingHoursEnd` (optional): Working hours end time (e.g., "17:00")

### get_upcoming_meetings
Get upcoming meetings for today or a specific day.
Parameters:
- `calendarId` (optional): Calendar ID (default: 'primary')
- `date` (optional): Date in ISO format (default: today)

## Security Considerations

- This MCP server runs locally on your machine, so your calendar data never passes through external servers
- OAuth refresh tokens are stored in your .env file - keep this secure
- The server uses HTTPS when communicating with Google's APIs
- Be careful when exposing this server to external networks

## Troubleshooting

### Server Won't Start

- Check if Node.js is installed and up to date
- Verify that all dependencies are installed with `npm install`
- Make sure your .env file has the correct credentials
- Check for TypeScript errors with `npx tsc --noEmit`

### Authentication Issues

- Ensure your Google Cloud OAuth credentials match what's in your .env file
- Revoke app access from [Google Account Permissions](https://myaccount.google.com/permissions) and try again
- Make sure your email is added as a test user in the Google Cloud Console
- Check that your redirect URI exactly matches what's in the Google Cloud Console

### Integration Issues

- Verify that the paths in your configuration files are absolute and correct
- Make sure the server is running before attempting to use it with an AI assistant
- Check the assistant's logs for connection errors
- For Claude Desktop, ensure you've built the project with `npm run build`

## License

MIT