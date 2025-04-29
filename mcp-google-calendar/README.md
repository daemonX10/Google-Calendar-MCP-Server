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

## Usage

### First-time Authentication

1. Start the server:
   ```bash
   npm run dev
   ```
2. You'll see a URL in the console output. Open this URL in your browser to authorize the application.
3. After authorization, you'll get a code. Use this code with the `set_auth_code` tool.
4. The server will log a refresh token. Add this token to your `.env` file as `GOOGLE_REFRESH_TOKEN`.
5. Restart the server.

### Production Usage

1. Build the server:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   npm start
   ```

### Integration with Claude Desktop

Add this to your `claude_desktop_config.json` file:

```json
{
  "mcp": {
    "servers": {
      "google-calendar": {
        "command": "node",
        "args": ["/path/to/mcp-google-calendar/dist/index.js"],
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

## License

MIT