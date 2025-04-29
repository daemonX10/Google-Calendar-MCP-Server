import { calendar_v3, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

// Import custom types instead of from the SDK
import {
  Tools,
  RequestContext,
  ToolResponse,
  ToolResponseValue,
  ToolResponseError,
  ToolDefinition,
} from './types';

// Load environment variables
dotenv.config();

export class GoogleCalendarProvider {
  private auth: OAuth2Client | null = null;
  private calendar: calendar_v3.Calendar | null = null;

  /**
   * Initialize the Google Calendar client
   */
  async initialize(): Promise<void> {
    try {
      // Set up OAuth2 client
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials if they exist
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        try {
          this.auth.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          });

          // Initialize the calendar client
          this.calendar = google.calendar({ version: 'v3', auth: this.auth });
          
          // Test the connection
          await this.calendar.calendarList.list();
          console.error('Successfully authenticated with Google Calendar API');
        } catch (error) {
          console.error('Error authenticating with refresh token:', error);
          this.calendar = null;
          this.auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
          );
          
          // Show auth URL since refresh token is invalid
          console.error('\n⚠️ Invalid refresh token. Please re-authorize the application.');
          this.showAuthUrl();
        }
      } else {
        // If no refresh token, prepare for authorization
        console.error('\n⚠️ No refresh token found. Please authorize the application.');
        this.showAuthUrl();
      }
    } catch (error) {
      console.error('Error initializing Google Calendar client:', error);
      throw error;
    }
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  private getAuthUrl(): string {
    if (!this.auth) {
      throw new Error('Auth client not initialized');
    }
    
    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      prompt: 'consent', // Always show consent screen to ensure we get a refresh token
      include_granted_scopes: true
    });
  }

  /**
   * Set authorization code from OAuth2 flow
   */
  async setAuthCode(code: string): Promise<void> {
    if (!this.auth) {
      throw new Error('Auth client not initialized');
    }
    
    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);
    
    // Initialize the calendar client
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    
    console.error('Successfully authenticated with Google Calendar API');
    console.error('Refresh token:', tokens.refresh_token);
    console.error('Add this refresh token to your .env file as GOOGLE_REFRESH_TOKEN');
  }

  /**
   * Get the tool definitions
   */
  getToolDefinitions(): Record<string, ToolDefinition> {
    return {
      'list_calendars': {
        description: 'List all available calendars',
        parameters: {},
      },
      'list_events': {
        description: 'List events in a calendar',
        parameters: {
          calendarId: {
            type: 'string',
            description: 'Calendar ID (default: primary)',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of events to return',
          },
          timeMin: {
            type: 'string',
            description: 'Start time in ISO format (default: now)',
          },
          timeMax: {
            type: 'string',
            description: 'End time in ISO format',
          },
          q: {
            type: 'string',
            description: 'Search term to find events',
          },
        },
      },
      'create_event': {
        description: 'Create a new event in a calendar',
        parameters: {
          calendarId: {
            type: 'string',
            description: 'Calendar ID (default: primary)',
          },
          summary: {
            type: 'string',
            description: 'Event title',
          },
          description: {
            type: 'string',
            description: 'Event description',
          },
          location: {
            type: 'string',
            description: 'Event location',
          },
          start: {
            type: 'string',
            description: 'Start time in ISO format',
          },
          end: {
            type: 'string',
            description: 'End time in ISO format',
          },
          attendees: {
            type: 'array',
            description: 'List of email addresses of attendees',
            items: {
              type: 'string',
            },
          },
          reminders: {
            type: 'object',
            description: 'Event reminders configuration',
          },
          recurrence: {
            type: 'array',
            description: 'Recurrence rules (RRULE) for recurring events',
            items: {
              type: 'string',
            },
          },
        },
      },
      'get_event': {
        description: 'Get details for a specific event',
        parameters: {
          calendarId: {
            type: 'string',
            description: 'Calendar ID (default: primary)',
          },
          eventId: {
            type: 'string',
            description: 'Event ID',
          },
        },
      },
      'update_event': {
        description: 'Update an existing event in a calendar',
        parameters: {
          calendarId: {
            type: 'string',
            description: 'Calendar ID (default: primary)',
          },
          eventId: {
            type: 'string',
            description: 'Event ID',
          },
          summary: {
            type: 'string',
            description: 'Event title',
          },
          description: {
            type: 'string',
            description: 'Event description',
          },
          location: {
            type: 'string',
            description: 'Event location',
          },
          start: {
            type: 'string',
            description: 'Start time in ISO format',
          },
          end: {
            type: 'string',
            description: 'End time in ISO format',
          },
          attendees: {
            type: 'array',
            description: 'List of email addresses of attendees',
            items: {
              type: 'string',
            },
          },
          reminders: {
            type: 'object',
            description: 'Event reminders configuration',
          },
        },
      },
      'delete_event': {
        description: 'Delete an event from a calendar',
        parameters: {
          calendarId: {
            type: 'string',
            description: 'Calendar ID (default: primary)',
          },
          eventId: {
            type: 'string',
            description: 'Event ID',
          },
        },
      },
      'find_available_slots': {
        description: 'Find available time slots in a calendar',
        parameters: {
          calendarId: {
            type: 'string',
            description: 'Calendar ID (default: primary)',
          },
          timeMin: {
            type: 'string',
            description: 'Start time in ISO format (default: now)',
          },
          timeMax: {
            type: 'string',
            description: 'End time in ISO format',
          },
          duration: {
            type: 'number',
            description: 'Duration in minutes',
          },
          workingHoursStart: {
            type: 'string',
            description: 'Working hours start time (e.g., "09:00")',
          },
          workingHoursEnd: {
            type: 'string',
            description: 'Working hours end time (e.g., "17:00")',
          },
        },
      },
      'set_auth_code': {
        description: 'Set the authorization code from OAuth2 flow',
        parameters: {
          code: {
            type: 'string',
            description: 'Authorization code from OAuth2 callback',
          },
        },
      },
      'get_upcoming_meetings': {
        description: 'Get upcoming meetings for today or a specific day',
        parameters: {
          calendarId: {
            type: 'string',
            description: 'Calendar ID (default: primary)',
          },
          date: {
            type: 'string',
            description: 'Date in ISO format (default: today)',
          },
        },
      },
    };
  }

  /**
   * Handle MCP tool request
   */
  async handleRequest(
    requestContext: RequestContext,
    tools: Tools,
  ): Promise<ToolResponse> {
    const { name, parameters } = requestContext.request;
    
    try {
      switch (name) {
        case 'list_calendars':
          return this.listCalendars();
        
        case 'list_events':
          return this.listEvents(parameters);
        
        case 'create_event':
          return this.createEvent(parameters);
        
        case 'get_event':
          return this.getEvent(parameters);
        
        case 'update_event':
          return this.updateEvent(parameters);
        
        case 'delete_event':
          return this.deleteEvent(parameters);
        
        case 'find_available_slots':
          return this.findAvailableSlots(parameters);
        
        case 'set_auth_code':
          await this.setAuthCode(parameters.code);
          return { value: { success: true, message: 'Authorization successful' } };
        
        case 'get_upcoming_meetings':
          return this.getUpcomingMeetings(parameters);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error handling request for tool ${name}:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'INTERNAL_ERROR',
        },
      };
    }
  }

  /**
   * List all available calendars
   */
  private async listCalendars(): Promise<ToolResponse> {
    if (!this.calendar) {
      return { error: { message: 'Calendar client not initialized', code: 'AUTH_ERROR' } };
    }

    try {
      const response = await this.calendar.calendarList.list();
      return {
        value: {
          calendars: response.data.items?.map(calendar => ({
            id: calendar.id,
            summary: calendar.summary,
            description: calendar.description,
            primary: calendar.primary,
            timezone: calendar.timeZone,
          })),
        },
      };
    } catch (error) {
      console.error('Error listing calendars:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'CALENDAR_ERROR',
        },
      };
    }
  }

  /**
   * List events in a calendar
   */
  private async listEvents(parameters: any): Promise<ToolResponse> {
    if (!this.calendar) {
      return { error: { message: 'Calendar client not initialized', code: 'AUTH_ERROR' } };
    }

    try {
      const calendarId = parameters.calendarId || 'primary';
      const timeMin = parameters.timeMin || new Date().toISOString();
      
      const response = await this.calendar.events.list({
        calendarId,
        timeMin,
        timeMax: parameters.timeMax,
        maxResults: parameters.maxResults || 10,
        singleEvents: true,
        orderBy: 'startTime',
        q: parameters.q,
      });
      
      return {
        value: {
          events: response.data.items?.map(event => ({
            id: event.id,
            summary: event.summary,
            description: event.description,
            location: event.location,
            start: event.start,
            end: event.end,
            creator: event.creator,
            attendees: event.attendees,
            status: event.status,
            htmlLink: event.htmlLink,
          })),
        },
      };
    } catch (error) {
      console.error('Error listing events:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'CALENDAR_ERROR',
        },
      };
    }
  }

  /**
   * Create a new event in a calendar
   */
  private async createEvent(parameters: any): Promise<ToolResponse> {
    if (!this.calendar) {
      return { error: { message: 'Calendar client not initialized', code: 'AUTH_ERROR' } };
    }

    try {
      const calendarId = parameters.calendarId || 'primary';
      
      // Prepare event object
      const eventData: calendar_v3.Schema$Event = {
        summary: parameters.summary,
        description: parameters.description,
        location: parameters.location,
        start: {
          dateTime: parameters.start,
          timeZone: 'UTC',
        },
        end: {
          dateTime: parameters.end,
          timeZone: 'UTC',
        },
      };
      
      // Add attendees if provided
      if (parameters.attendees) {
        eventData.attendees = parameters.attendees.map((email: string) => ({ email }));
      }
      
      // Add reminders if provided
      if (parameters.reminders) {
        eventData.reminders = parameters.reminders;
      }
      
      // Add recurrence if provided
      if (parameters.recurrence) {
        eventData.recurrence = parameters.recurrence;
      }
      
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: eventData,
        sendUpdates: 'all',
      });
      
      return {
        value: {
          event: {
            id: response.data.id,
            summary: response.data.summary,
            description: response.data.description,
            location: response.data.location,
            start: response.data.start,
            end: response.data.end,
            creator: response.data.creator,
            attendees: response.data.attendees,
            status: response.data.status,
            htmlLink: response.data.htmlLink,
          },
        },
      };
    } catch (error) {
      console.error('Error creating event:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'CALENDAR_ERROR',
        },
      };
    }
  }

  /**
   * Get details for a specific event
   */
  private async getEvent(parameters: any): Promise<ToolResponse> {
    if (!this.calendar) {
      return { error: { message: 'Calendar client not initialized', code: 'AUTH_ERROR' } };
    }

    try {
      const calendarId = parameters.calendarId || 'primary';
      const eventId = parameters.eventId;
      
      if (!eventId) {
        return {
          error: {
            message: 'Event ID is required',
            code: 'INVALID_PARAMS',
          },
        };
      }
      
      const response = await this.calendar.events.get({
        calendarId,
        eventId,
      });
      
      return {
        value: {
          event: {
            id: response.data.id,
            summary: response.data.summary,
            description: response.data.description,
            location: response.data.location,
            start: response.data.start,
            end: response.data.end,
            creator: response.data.creator,
            attendees: response.data.attendees,
            status: response.data.status,
            htmlLink: response.data.htmlLink,
            recurrence: response.data.recurrence,
            recurringEventId: response.data.recurringEventId,
          },
        },
      };
    } catch (error) {
      console.error('Error getting event:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'CALENDAR_ERROR',
        },
      };
    }
  }

  /**
   * Update an existing event
   */
  private async updateEvent(parameters: any): Promise<ToolResponse> {
    if (!this.calendar) {
      return { error: { message: 'Calendar client not initialized', code: 'AUTH_ERROR' } };
    }

    try {
      const calendarId = parameters.calendarId || 'primary';
      const eventId = parameters.eventId;
      
      if (!eventId) {
        return {
          error: {
            message: 'Event ID is required',
            code: 'INVALID_PARAMS',
          },
        };
      }
      
      // Get the existing event first
      const existingEvent = await this.calendar.events.get({
        calendarId,
        eventId,
      });
      
      // Prepare updated event object
      const eventData: calendar_v3.Schema$Event = {
        ...existingEvent.data,
        summary: parameters.summary !== undefined ? parameters.summary : existingEvent.data.summary,
        description: parameters.description !== undefined ? parameters.description : existingEvent.data.description,
        location: parameters.location !== undefined ? parameters.location : existingEvent.data.location,
      };
      
      // Update start and end times if provided
      if (parameters.start) {
        eventData.start = {
          dateTime: parameters.start,
          timeZone: 'UTC',
        };
      }
      
      if (parameters.end) {
        eventData.end = {
          dateTime: parameters.end,
          timeZone: 'UTC',
        };
      }
      
      // Update attendees if provided
      if (parameters.attendees) {
        eventData.attendees = parameters.attendees.map((email: string) => ({ email }));
      }
      
      // Update reminders if provided
      if (parameters.reminders) {
        eventData.reminders = parameters.reminders;
      }
      
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: eventData,
        sendUpdates: 'all',
      });
      
      return {
        value: {
          event: {
            id: response.data.id,
            summary: response.data.summary,
            description: response.data.description,
            location: response.data.location,
            start: response.data.start,
            end: response.data.end,
            creator: response.data.creator,
            attendees: response.data.attendees,
            status: response.data.status,
            htmlLink: response.data.htmlLink,
          },
        },
      };
    } catch (error) {
      console.error('Error updating event:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'CALENDAR_ERROR',
        },
      };
    }
  }

  /**
   * Delete an event from a calendar
   */
  private async deleteEvent(parameters: any): Promise<ToolResponse> {
    if (!this.calendar) {
      return { error: { message: 'Calendar client not initialized', code: 'AUTH_ERROR' } };
    }

    try {
      const calendarId = parameters.calendarId || 'primary';
      const eventId = parameters.eventId;
      
      if (!eventId) {
        return {
          error: {
            message: 'Event ID is required',
            code: 'INVALID_PARAMS',
          },
        };
      }
      
      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all',
      });
      
      return {
        value: {
          success: true,
          message: `Event ${eventId} deleted successfully`,
        },
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'CALENDAR_ERROR',
        },
      };
    }
  }

  /**
   * Find available time slots in a calendar
   */
  private async findAvailableSlots(parameters: any): Promise<ToolResponse> {
    if (!this.calendar) {
      return { error: { message: 'Calendar client not initialized', code: 'AUTH_ERROR' } };
    }

    try {
      const calendarId = parameters.calendarId || 'primary';
      const timeMin = parameters.timeMin || new Date().toISOString();
      const timeMax = parameters.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const duration = parameters.duration || 30; // in minutes
      
      // Get working hours
      const workingHoursStart = parameters.workingHoursStart || '09:00';
      const workingHoursEnd = parameters.workingHoursEnd || '17:00';
      
      // Get all events in the date range
      const response = await this.calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      const events = response.data.items || [];
      const availableSlots = [];
      
      // Convert dates to Date objects for easier manipulation
      const startDate = new Date(timeMin);
      const endDate = new Date(timeMax);
      
      // Loop through each day in the range
      const currentDate = new Date(startDate);
      currentDate.setHours(0, 0, 0, 0);
      
      while (currentDate <= endDate) {
        // Skip weekends (Saturday = 6, Sunday = 0)
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          // Set working hours for the current day
          const dayStart = new Date(currentDate);
          const [startHour, startMinute] = workingHoursStart.split(':').map(Number);
          dayStart.setHours(startHour, startMinute, 0, 0);
          
          const dayEnd = new Date(currentDate);
          const [endHour, endMinute] = workingHoursEnd.split(':').map(Number);
          dayEnd.setHours(endHour, endMinute, 0, 0);
          
          // Adjust if dayStart is before startDate
          const effectiveStart = dayStart < startDate ? startDate : dayStart;
          
          // Adjust if dayEnd is after endDate
          const effectiveEnd = dayEnd > endDate ? endDate : dayEnd;
          
          // Find busy slots for this day
          const busySlots = events
            .filter(event => {
              const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
              const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
              
              return (
                eventStart < effectiveEnd && 
                eventEnd > effectiveStart && 
                event.status !== 'cancelled'
              );
            })
            .map(event => ({
              start: new Date(event.start?.dateTime || event.start?.date || ''),
              end: new Date(event.end?.dateTime || event.end?.date || ''),
            }))
            .sort((a, b) => a.start.getTime() - b.start.getTime());
          
          // Find available slots between busy slots
          let currentSlotStart = new Date(effectiveStart);
          
          for (const busySlot of busySlots) {
            // If there's time before this busy slot, it's an available slot
            if (busySlot.start > currentSlotStart) {
              const availableDuration = (busySlot.start.getTime() - currentSlotStart.getTime()) / (60 * 1000);
              
              // Only consider slots with at least the requested duration
              if (availableDuration >= duration) {
                availableSlots.push({
                  start: currentSlotStart.toISOString(),
                  end: busySlot.start.toISOString(),
                  durationMinutes: availableDuration,
                });
              }
            }
            
            // Move current slot start to the end of this busy slot
            currentSlotStart = new Date(Math.max(currentSlotStart.getTime(), busySlot.end.getTime()));
          }
          
          // Check if there's time after the last busy slot
          if (currentSlotStart < effectiveEnd) {
            const availableDuration = (effectiveEnd.getTime() - currentSlotStart.getTime()) / (60 * 1000);
            
            // Only consider slots with at least the requested duration
            if (availableDuration >= duration) {
              availableSlots.push({
                start: currentSlotStart.toISOString(),
                end: effectiveEnd.toISOString(),
                durationMinutes: availableDuration,
              });
            }
          }
        }
        
        // Move to the next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Return available slots
      return {
        value: {
          availableSlots,
        },
      };
    } catch (error) {
      console.error('Error finding available slots:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'CALENDAR_ERROR',
        },
      };
    }
  }

  /**
   * Get upcoming meetings for today or a specific day
   */
  private async getUpcomingMeetings(parameters: any): Promise<ToolResponse> {
    if (!this.calendar) {
      return { error: { message: 'Calendar client not initialized', code: 'AUTH_ERROR' } };
    }

    try {
      const calendarId = parameters.calendarId || 'primary';
      
      // Default to today
      let date = new Date();
      if (parameters.date) {
        date = new Date(parameters.date);
      }
      
      // Set start of day and end of day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      // Format the response with additional context
      const events = response.data.items || [];
      const now = new Date();
      
      const formattedEvents = events.map(event => {
        const startTime = new Date(event.start?.dateTime || event.start?.date || '');
        const endTime = new Date(event.end?.dateTime || event.end?.date || '');
        const isOngoing = startTime <= now && endTime >= now;
        const isUpcoming = startTime > now;
        const isPast = endTime < now;
        
        return {
          id: event.id,
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          status: isOngoing ? 'ongoing' : isUpcoming ? 'upcoming' : 'past',
          attendees: event.attendees,
          organizer: event.organizer,
          htmlLink: event.htmlLink,
          meetLink: event.hangoutLink,
        };
      });
      
      return {
        value: {
          date: date.toISOString().split('T')[0],
          events: formattedEvents,
          summary: {
            total: formattedEvents.length,
            ongoing: formattedEvents.filter(e => e.status === 'ongoing').length,
            upcoming: formattedEvents.filter(e => e.status === 'upcoming').length,
            past: formattedEvents.filter(e => e.status === 'past').length,
          }
        },
      };
    } catch (error) {
      console.error('Error getting upcoming meetings:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'CALENDAR_ERROR',
        },
      };
    }
  }

  /**
   * Check if the provider is authenticated with Google Calendar
   */
  isAuthenticated(): boolean {
    return this.calendar !== null;
  }

  /**
   * Display authorization URL to the user
   */
  private showAuthUrl(): void {
    const authUrl = this.getAuthUrl();
    console.error('\n🔑 Authorization Required');
    console.error('-------------------');
    console.error('1. Visit this URL to authorize the application:');
    console.error(authUrl);
    console.error('\n2. After approval, you will be redirected to a URL. Copy the "code" parameter from that URL.');
    console.error('\n3. Use the set_auth_code tool or run this command:');
    console.error(`   npx ts-node src/auth-helper.js "PASTE_AUTH_CODE_HERE"\n`);
  }
}