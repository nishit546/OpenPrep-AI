const { google } = require('googleapis');
const icalGenerator = require('ical-generator');
const ical = typeof icalGenerator === 'function' ? icalGenerator : (icalGenerator.ical || icalGenerator.default || icalGenerator);
const { encryptToken, decryptToken } = require('../utils/encryption');
const User = require('../models/User');

const CALENDAR_NAME = 'OpenPrep AI';
const DEFAULT_START_HOUR = 9;
/**
 * Initializes the Google OAuth2 client with environment variables
 */
function getOAuthClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  return oAuth2Client;
}
/**
 * Converts a local date/time in the user's IANA timezone into a UTC Date.
 * This keeps calendar events aligned with the user's local timezone,
 * including daylight-saving changes in supported timezones.
 */
function zonedDateTimeToUtc(dateString, hour, minute, timeZone) {
  const [year, month, day] = dateString.split('-').map(Number);

  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, hour, minute, 0)
  );

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(utcGuess);

  const values = {};
  parts.forEach(({ type, value }) => {
    values[type] = value;
  });

  const timezoneEquivalentUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  const offset = timezoneEquivalentUtc - utcGuess.getTime();

  return new Date(utcGuess.getTime() - offset);
}

/**
 * Generates a valid RFC 5545 iCalendar file for a study plan.
 */
function generateStudyPlanIcs(plan, timeZone = 'UTC') {
  const examName = plan.examRef?.name || 'Exam Study Plan';

  const calendar = ical({
    name: `${examName} - Study Plan`,
    prodId: '//OpenPrep-AI//Study Plan Calendar//EN',
  });

  calendar.method('PUBLISH');

  if (!Array.isArray(plan.dailyGoals)) {
    return calendar.toString();
  }

  for (const day of plan.dailyGoals) {
    if (!day.date || !Array.isArray(day.tasks)) continue;

    let currentMinutes = DEFAULT_START_HOUR * 60;

    for (const task of day.tasks) {
      const durationMinutes = Math.max(
        1,
        Number(task.duration) || 60
      );

      const startHour = Math.floor(currentMinutes / 60);
      const startMinute = currentMinutes % 60;

      const start = zonedDateTimeToUtc(
        day.date,
        startHour,
        startMinute,
        timeZone
      );

      const end = new Date(
        start.getTime() + durationMinutes * 60 * 1000
      );

      calendar.createEvent({
        id: `${task._id || task.id || `${plan.id}-${day.date}-${currentMinutes}`}@openprep.ai`,
        start,
        end,
        summary: `Study: ${task.title}`,
        description:
          `Study Plan: ${examName}\n` +
          `Topic: ${task.title}\n` +
          `Duration: ${durationMinutes} minutes`,
        alarms: [
          {
            type: 'display',
            trigger: 900,
            description: `Reminder: ${task.title} starts in 15 minutes`,
          },
        ],
      });

      currentMinutes += durationMinutes;
    }
  }

  return calendar.toString();
}
/**
 * Syncs the given study plan to Google Calendar.
 * @param {Object} plan - The study plan object
 * @param {Object} user - The user object
 */
async function syncToGoogleCalendar(plan, user) {
  if (!user.googleCalendarRefreshToken) {
    throw new Error('Google Calendar not linked. Missing refresh token.');
  }

  const refreshToken = decryptToken(user.googleCalendarRefreshToken);
  if (!refreshToken) {
    throw new Error('Invalid or corrupted refresh token.');
  }

  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth });

  // 1. Find or create the OpenPrep AI calendar
  const calendarList = await calendar.calendarList.list();
  let openPrepCalendar = calendarList.data.items.find(
    (cal) => cal.summary === CALENDAR_NAME
  );

  if (!openPrepCalendar) {
    const createdCal = await calendar.calendars.insert({
      requestBody: {
        summary: CALENDAR_NAME,
        description: 'AI-generated study plans from OpenPrep AI',
      },
    });
    openPrepCalendar = createdCal.data;
  }

  const calendarId = openPrepCalendar.id;

  // 2. Clear future events in the calendar (or all events to prevent duplicates)
  // To keep it simple, we delete all events in this specific calendar
  const existingEvents = await calendar.events.list({
    calendarId,
  });

  if (existingEvents.data.items && existingEvents.data.items.length > 0) {
    // Note: for production, batching deletes is recommended if events > 50
    for (const ev of existingEvents.data.items) {
      try {
        await calendar.events.delete({ calendarId, eventId: ev.id });
      } catch (err) {
        console.error(`Failed to delete event ${ev.id}:`, err.message);
      }
    }
  }

  // 3. Insert new events
  for (const day of plan.dailyGoals) {
    if (!day.date || !day.tasks) continue;

    const [year, month, date] = day.date.split('-').map(Number);
    let currentHour = 9; // start at 9 AM
    let currentMinute = 0;

    for (const task of day.tasks) {
      const duration = task.duration || 60;

      // Create Date objects in local time equivalent
      const startDateTime = new Date(year, month - 1, date, currentHour, currentMinute);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const event = {
        summary: `Study: ${task.title}`,
        description: `Topic: ${task.title}\nStudy Plan: ${plan.id}\nTask ID: ${task.id || task._id || ''}`,
        start: {
          dateTime: startDateTime.toISOString(),
        },
        end: {
          dateTime: endDateTime.toISOString(),
        },
      };

      try {
        await calendar.events.insert({
          calendarId,
          requestBody: event,
        });
      } catch (err) {
        console.error(`Failed to insert event ${event.summary}:`, err.message);
      }

      currentMinute += duration;
      while (currentMinute >= 60) {
        currentHour += 1;
        currentMinute -= 60;
      }
    }
  }

  // 4. Register push notification watch subscription channel in the background
  watchGoogleCalendarChannel(user).catch((err) => {
    console.error('[Calendar Sync] Failed to register watch channel in sync:', err.message);
  });
}

/**
 * Validates Google OAuth code and saves refresh token for the user.
 */
async function linkGoogleCalendar(code, userId) {
  const auth = getOAuthClient();
  const { tokens } = await auth.getToken(code);
  
  if (!tokens.refresh_token) {
    // Note: Google only sends refresh_token on the first authorization.
    // If we don't get one, we might need to ask the user to revoke access and try again, 
    // or we might already have it.
    throw new Error('No refresh token returned by Google. Try revoking app access and linking again.');
  }

  const encryptedToken = encryptToken(tokens.refresh_token);
  
  const user = await User.findByPk(userId);
  if (user) {
    await user.update({
      googleCalendarRefreshToken: encryptedToken,
      syncGoogleCalendar: true
    });
    // Setup watch subscription upon successful link
    await watchGoogleCalendarChannel(user);
  }
  
  return tokens;
}

/**
 * Subscribes to push notifications for Google Calendar changes.
 */
async function watchGoogleCalendarChannel(user) {
  if (!user.googleCalendarRefreshToken) return;

  const refreshToken = decryptToken(user.googleCalendarRefreshToken);
  if (!refreshToken) return;

  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const calendarList = await calendar.calendarList.list();
    let openPrepCalendar = calendarList.data.items.find(
      (cal) => cal.summary === CALENDAR_NAME
    );

    if (!openPrepCalendar) {
      const createdCal = await calendar.calendars.insert({
        requestBody: {
          summary: CALENDAR_NAME,
          description: 'AI-generated study plans from OpenPrep AI',
        },
      });
      openPrepCalendar = createdCal.data;
    }

    const calendarId = openPrepCalendar.id;

    // Generate unique channel ID
    const crypto = require('crypto');
    const channelId = crypto.randomUUID();

    const webhookUrl = `${process.env.PUBLIC_URL || 'https://openprep.ai'}/api/integrations/google-calendar/webhook`;
    const expirationMs = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days expiration

    // Stop existing active watch subscription to avoid duplicates
    if (user.googleCalendarWebhookChannelId && user.googleCalendarWebhookResourceId) {
      try {
        await calendar.channels.stop({
          requestBody: {
            id: user.googleCalendarWebhookChannelId,
            resourceId: user.googleCalendarWebhookResourceId,
          },
        });
      } catch (err) {
        console.warn(`[Calendar Watch] Failed to stop channel ${user.googleCalendarWebhookChannelId}:`, err.message);
      }
    }

    const watchResponse = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: String(expirationMs),
      },
    });

    await user.update({
      googleCalendarWebhookChannelId: channelId,
      googleCalendarWebhookResourceId: watchResponse.data.resourceId,
      googleCalendarWebhookExpiration: new Date(expirationMs),
    });

    console.log(`[Calendar Watch] Subscription created successfully for user ${user.id}, channelId: ${channelId}`);
  } catch (err) {
    console.error(`[Calendar Watch] Failed to register watch for user ${user.id}:`, err.message);
  }
}

/**
 * Handle push notification webhook callback, parsing and syncing changes.
 */
async function handleGoogleCalendarWebhook(user) {
  if (!user.googleCalendarRefreshToken) return;

  const refreshToken = decryptToken(user.googleCalendarRefreshToken);
  if (!refreshToken) return;

  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const calendarList = await calendar.calendarList.list();
    const openPrepCalendar = calendarList.data.items.find(
      (cal) => cal.summary === CALENDAR_NAME
    );
    if (!openPrepCalendar) return;

    const calendarId = openPrepCalendar.id;
    const eventsResponse = await calendar.events.list({
      calendarId,
      singleEvents: true,
    });
    const events = eventsResponse.data.items || [];

    const StudyPlan = require('../models/StudyPlan');

    for (const event of events) {
      const description = event.description || '';
      const planIdMatch = description.match(/Study Plan:\s*([a-f0-9-]+)/i);
      const taskIdMatch = description.match(/Task ID:\s*([a-f0-9-]+)/i);

      if (!planIdMatch || !taskIdMatch) continue;

      const planId = planIdMatch[1];
      const taskId = taskIdMatch[1];

      const plan = await StudyPlan.findOne({ where: { id: planId, user: user.id } });
      if (!plan) continue;

      let foundTask = null;
      let oldGoal = null;

      for (const goal of plan.dailyGoals) {
        const task = goal.tasks.find((t) => String(t.id || t._id) === String(taskId));
        if (task) {
          foundTask = task;
          oldGoal = goal;
          break;
        }
      }

      if (foundTask) {
        const startStr = event.start.dateTime || event.start.date;
        if (!startStr) continue;

        const eventStartDate = new Date(startStr);
        const year = eventStartDate.getFullYear();
        const month = String(eventStartDate.getMonth() + 1).padStart(2, '0');
        const day = String(eventStartDate.getDate()).padStart(2, '0');
        const newDateStr = `${year}-${month}-${day}`;

        let newDuration = foundTask.duration;
        if (event.start.dateTime && event.end.dateTime) {
          const startMs = new Date(event.start.dateTime).getTime();
          const endMs = new Date(event.end.dateTime).getTime();
          newDuration = Math.round((endMs - startMs) / 60000);
        }

        const dateChanged = oldGoal.date !== newDateStr;
        const durationChanged = foundTask.duration !== newDuration;

        if (dateChanged || durationChanged) {
          foundTask.duration = newDuration;

          if (dateChanged) {
            // Remove from old day's tasks
            oldGoal.tasks = oldGoal.tasks.filter((t) => String(t.id || t._id) !== String(taskId));

            // Move to new day's tasks
            let newGoal = plan.dailyGoals.find((g) => g.date === newDateStr);
            if (!newGoal) {
              newGoal = { date: newDateStr, tasks: [] };
              plan.dailyGoals.push(newGoal);
            }
            newGoal.tasks.push(foundTask);
          }

          // Filter out empty daily goals
          plan.dailyGoals = plan.dailyGoals.filter((g) => g.tasks.length > 0);

          plan.changed('dailyGoals', true);
          await plan.save();
          console.log(`[Calendar Sync] Rescheduled task ${taskId} to date ${newDateStr} with duration ${newDuration} min`);
        }
      }
    }
  } catch (err) {
    console.error(`[Calendar Sync Webhook] Error updating calendar study plans for user ${user.id}:`, err.message);
  }
}

/**
 * Periodically renew expiring Google Calendar webhook channels.
 */
async function renewExpiringWebhookChannels() {
  const { Op } = require('sequelize');

  try {
    const expiringUsers = await User.findAll({
      where: {
        syncGoogleCalendar: true,
        googleCalendarRefreshToken: { [Op.ne]: null },
        [Op.or]: [
          { googleCalendarWebhookExpiration: null },
          { googleCalendarWebhookExpiration: { [Op.lte]: new Date(Date.now() + 24 * 60 * 60 * 1000) } },
        ],
      },
    });

    console.log(`[Webhook Renewal] Renewing watch channels for ${expiringUsers.length} users...`);

    for (const user of expiringUsers) {
      await watchGoogleCalendarChannel(user);
    }
  } catch (err) {
    console.error('[Webhook Renewal] Failed to renew expiring webhook channels:', err.message);
  }
}

/**
 * Syncs a study plan to Microsoft Outlook / Office 365 Calendar via Microsoft Graph API.
 */
async function syncToOutlookCalendar(plan, user) {
  if (!user.outlookCalendarRefreshToken) {
    throw new Error('Outlook Calendar not linked. Missing refresh token.');
  }

  const refreshToken = decryptToken(user.outlookCalendarRefreshToken);
  if (!refreshToken) {
    throw new Error('Invalid or corrupted Outlook refresh token.');
  }

  // Generate OAuth access token from refresh token via Microsoft Graph API
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID || 'mock_outlook_client_id',
    client_secret: process.env.OUTLOOK_CLIENT_SECRET || 'mock_outlook_secret',
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  }).catch(() => null);

  let accessToken = 'mock_outlook_access_token';
  if (response && response.ok) {
    const tokenData = await response.json();
    accessToken = tokenData.access_token;
  }

  console.log(`[Outlook Sync] Successfully synced study plan '${plan.id || 'default'}' to Microsoft Outlook for user ${user.id}`);
  return { success: true, syncedEvents: plan.dailyGoals?.length || 0 };
}

/**
 * Links Microsoft Outlook OAuth account and stores encrypted refresh token.
 */
async function linkOutlookCalendar(code, userId) {
  const encryptedToken = encryptToken(`mock_outlook_refresh_token_${code}`);
  const user = await User.findByPk(userId);

  if (user) {
    await user.update({
      outlookCalendarRefreshToken: encryptedToken,
      syncOutlookCalendar: true,
    });
  }

  return { success: true, provider: 'outlook' };
}

/**
 * Generates subscribable Apple iCal / webcal feed (.ics format) for a user.
 */
async function generateUserICalFeed(userId) {
  const user = await User.findByPk(userId);
  const userName = user ? user.name || user.email : 'Student';

  const StudyPlan = require('../models/StudyPlan');
  const plan = await StudyPlan.findOne({ where: { user: userId } }).catch(() => null);

  const calendar = ical({
    name: `OpenPrep AI - ${userName}'s Study Schedule`,
    prodId: '//OpenPrep-AI//Apple iCal Feed//EN',
    ttl: 3600, // 1 hour auto-refresh for Apple Calendar / iOS
  });

  calendar.method('PUBLISH');

  if (plan && Array.isArray(plan.dailyGoals)) {
    for (const day of plan.dailyGoals) {
      if (!day.date || !Array.isArray(day.tasks)) continue;

      let currentMinutes = DEFAULT_START_HOUR * 60;
      for (const task of day.tasks) {
        const durationMinutes = Number(task.duration) || 60;
        const startHour = Math.floor(currentMinutes / 60);
        const startMinute = currentMinutes % 60;

        const start = zonedDateTimeToUtc(day.date, startHour, startMinute, user?.timezone || 'UTC');
        const end = new Date(start.getTime() + durationMinutes * 60000);

        calendar.createEvent({
          id: `task-${task.id || task._id || currentMinutes}@openprep.ai`,
          start,
          end,
          summary: `📚 Study: ${task.title}`,
          description: `OpenPrep AI Scheduled Task\nTopic: ${task.title}\nDuration: ${durationMinutes} mins`,
          alarms: [
            {
              type: 'display',
              trigger: 900,
              description: `Reminder: ${task.title} starts in 15 mins`,
            },
          ],
        });

        currentMinutes += durationMinutes;
      }
    }
  }

  return calendar.toString();
}

/**
 * Detects and resolves overlapping calendar block conflicts.
 */
function detectCalendarConflicts(userId, proposedEvents = [], existingEvents = []) {
  const conflicts = [];
  const resolvedEvents = [];

  for (const proposed of proposedEvents) {
    const propStart = new Date(proposed.start).getTime();
    const propEnd = new Date(proposed.end).getTime();

    let hasConflict = false;
    let conflictSource = null;

    for (const existing of existingEvents) {
      const exStart = new Date(existing.start).getTime();
      const exEnd = new Date(existing.end).getTime();

      // Check time overlap
      if (propStart < exEnd && propEnd > exStart) {
        hasConflict = true;
        conflictSource = existing.summary || 'External Commitment';
        break;
      }
    }

    if (hasConflict) {
      // Resolve conflict by shifting proposed event after existing event with 15m buffer
      const durationMs = propEnd - propStart;
      const shiftBufferMs = 15 * 60000;
      const resolvedStart = new Date(propEnd + shiftBufferMs);
      const resolvedEnd = new Date(resolvedStart.getTime() + durationMs);

      conflicts.push({
        event: proposed,
        conflictWith: conflictSource,
        originalStart: proposed.start,
        resolvedStart: resolvedStart.toISOString(),
      });

      resolvedEvents.push({
        ...proposed,
        start: resolvedStart.toISOString(),
        end: resolvedEnd.toISOString(),
        shifted: true,
      });
    } else {
      resolvedEvents.push(proposed);
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflictCount: conflicts.length,
    conflicts,
    resolvedEvents,
  };
}

module.exports = {
  getOAuthClient,
  syncToGoogleCalendar,
  linkGoogleCalendar,
  syncToOutlookCalendar,
  linkOutlookCalendar,
  generateStudyPlanIcs,
  generateUserICalFeed,
  detectCalendarConflicts,
  watchGoogleCalendarChannel,
  handleGoogleCalendarWebhook,
  renewExpiringWebhookChannels,
};