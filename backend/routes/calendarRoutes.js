/**
 * @fileoverview API routes for Calendar Integration and Syncing.
 */
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');

const calendarService = require('../services/calendarService');
const calendarSyncService = require('../services/calendarSyncService');
const StudyPlan = require('../models/StudyPlan');
const User = require('../models/User');

/**
 * Generates a Google Calendar event URL.
 */
router.post('/google-event-url', protect, async (req, res) => {
  try {
    const {
      title,
      description,
      start,
      end,
      timeZone,
    } = req.body;

    if (!title || !start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Title, start time, and end time are required',
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start or end time',
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        error: 'End time must be after start time',
      });
    }

    const formatGoogleDate = (date) => {
      return date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: description || '',
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    });

    if (timeZone) {
      params.set('ctz', timeZone);
    }

    const googleCalendarUrl =
      `https://calendar.google.com/calendar/render?${params.toString()}`;

    return res.json({
      success: true,
      data: {
        googleCalendarUrl,
      },
    });
  } catch (error) {
    console.error(
      'Google Calendar URL Error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to generate Google Calendar event link',
    });
  }
});

/**
 * The old Google OAuth routes are kept here for compatibility
 * with the existing application.
 */
router.post('/google-sync', protect, async (req, res) => {
  try {
    const { planId } = req.body;

    const user = await User.findByPk(req.user.id);

    if (!user.googleCalendarRefreshToken) {
      const auth = calendarService.getOAuthClient();

      const authUrl = auth.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar',
        ],
        state: planId,
      });

      return res.json({
        success: true,
        authUrl,
      });
    }

    const plan = await StudyPlan.findOne({
      where: {
        id: planId,
        user: req.user.id,
      },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Study plan not found',
      });
    }

    await calendarService.syncToGoogleCalendar(
      plan,
      user
    );

    return res.json({
      success: true,
      message:
        'Successfully synced to Google Calendar.',
    });
  } catch (error) {
    console.error(
      'Google Sync Error:',
      error
    );

    if (
      error.message.includes('refresh token') ||
      error.message.includes('invalid_grant')
    ) {
      await User.update(
        {
          googleCalendarRefreshToken: null,
          syncGoogleCalendar: false,
        },
        {
          where: {
            id: req.user.id,
          },
        }
      );

      return res.status(401).json({
        success: false,
        error:
          'Calendar authorization revoked. Please try again.',
      });
    }

    return res.status(500).json({
      success: false,
      error:
        'Failed to sync with Google Calendar',
    });
  }
});

/**
 * Google OAuth callback.
 */
router.get(
  '/google-callback',
  protect,
  async (req, res) => {
    try {
      const {
        code,
        state: planId,
      } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          error:
            'No authorization code provided',
        });
      }

      await calendarService.linkGoogleCalendar(
        code,
        req.user.id
      );

      if (planId) {
        const plan =
          await StudyPlan.findOne({
            where: {
              id: planId,
              user: req.user.id,
            },
          });

        const user =
          await User.findByPk(req.user.id);

        if (plan) {
          await calendarService.syncToGoogleCalendar(
            plan,
            user
          );
        }
      }

      res.send(`
        <script>
          if (window.opener) {
            window.opener.postMessage(
              'google_calendar_sync_success',
              '*'
            );
            window.close();
          } else {
            window.location.href = '/dashboard';
          }
        </script>
      `);
    } catch (error) {
      console.error(
        'OAuth Callback Error:',
        error
      );

      res.status(500).send(`
        <script>
          if (window.opener) {
            window.opener.postMessage(
              'google_calendar_sync_error',
              '*'
            );
            window.close();
          } else {
            document.write(
              'Error syncing with Google Calendar. You can close this window.'
            );
          }
        </script>
      `);
    }
  }
);

// Mock route for syncing timetable to Google Calendar (Legacy MVP)
router.post('/sync', async (req, res) => {
  try {
    const { events } = req.body;
    // In a real app, userId comes from req.user (auth middleware)
    const result = await calendarSyncService.syncTimetable('mock_user', events || []);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: 'Sync failed' });
  }
});

/**
 * Public webhook callback route for Google Calendar push notifications.
 */
router.post('/webhook', async (req, res) => {
  try {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceId = req.headers['x-goog-resource-id'];
    const resourceState = req.headers['x-goog-resource-state'];

    if (!channelId || !resourceId || !resourceState) {
      return res.status(400).json({
        success: false,
        error: 'Missing webhook headers',
      });
    }

    // Google sends 'sync' event when channel is created
    if (resourceState === 'sync') {
      return res.status(200).send('Sync confirmation');
    }

    // Look up user by channel ID
    const user = await User.findOne({
      where: {
        googleCalendarWebhookChannelId: channelId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found',
      });
    }

    // Verify authenticity: check resource ID match
    if (user.googleCalendarWebhookResourceId !== resourceId) {
      return res.status(401).json({
        success: false,
        error: 'Resource ID mismatch',
      });
    }

    // Call service to handle change sync
    await calendarService.handleGoogleCalendarWebhook(user);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Google Calendar Webhook Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/calendar/oauth-url
 * @desc    Get OAuth2 authorization URL for Google or Outlook
 * @access  Private
 */
router.get('/oauth-url', protect, async (req, res) => {
  try {
    const { provider } = req.query;
    if (!provider || (provider !== 'google' && provider !== 'outlook')) {
      return res.status(400).json({ success: false, error: 'Provider must be google or outlook' });
    }

    const url = calendarSyncService.getOAuthUrl(provider, req.user.id);
    res.status(200).json({ success: true, url });
  } catch (error) {
    console.error('OAuth URL Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate OAuth URL' });
  }
});

/**
 * @route   POST /api/calendar/exchange-token
 * @desc    Exchange authorization code for access token
 * @access  Private
 */
router.post('/exchange-token', protect, async (req, res) => {
  try {
    const { provider, code } = req.body;
    if (!provider || !code) {
      return res.status(400).json({ success: false, error: 'Provider and code are required' });
    }

    const tokens = await calendarSyncService.exchangeCodeForToken(provider, code);

    // TODO: Save tokens to User model in production
    res.status(200).json({ success: true, data: tokens });
  } catch (error) {
    console.error('Token Exchange Error:', error);
    res.status(500).json({ success: false, error: 'Failed to exchange token' });
  }
});

/**
 * @route   POST /api/calendar/sync-events
 * @desc    Sync spaced repetition events to external calendar
 * @access  Private
 */
router.post('/sync-events', protect, async (req, res) => {
  try {
    const { provider, accessToken, dueFlashcards, daysInAdvance } = req.body;

    if (!provider || !accessToken || !dueFlashcards) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await calendarSyncService.syncEventsToCalendar(
      provider,
      accessToken,
      dueFlashcards,
      daysInAdvance || 7
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Event Sync Error:', error);
    res.status(500).json({ success: false, error: 'Failed to sync events' });
  }
});

/**
 * @route   PATCH /api/calendar/update-event
 * @desc    Update or dismiss a calendar event
 * @access  Private
 */
router.patch('/update-event', protect, async (req, res) => {
  try {
    const { provider, accessToken, eventId, status } = req.body;

    if (!provider || !accessToken || !eventId || !status) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await calendarSyncService.updateCalendarEvent(
      provider,
      accessToken,
      eventId,
      status
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Event Update Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update event' });
  }
});

module.exports = router;
