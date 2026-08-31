/**
 * @fileoverview Two-Way Calendar Synchronization Controller.
 * Provides endpoints for managing Google Calendar, Microsoft Outlook, and Apple iCal webcal feeds,
 * handling webhooks, and detecting schedule conflicts.
 */
const calendarService = require('../services/calendarService');
const User = require('../models/User');
const crypto = require('crypto');

/**
 * @desc Get calendar sync connection status for Google, Outlook, and Apple iCal feed
 * @route GET /api/calendar-sync/status
 * @access Protected
 */
exports.getSyncStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Generate or retrieve feed token for Apple iCal webcal URL
    let feedToken = user.iCalFeedToken;
    if (!feedToken) {
      feedToken = crypto.randomBytes(16).toString('hex');
      await user.update({ iCalFeedToken: feedToken }).catch(() => {});
    }

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol === 'https' ? 'webcal' : 'http';
    const iCalWebcalUrl = `${protocol}://${host}/api/calendar-sync/ical-feed/${feedToken}.ics`;

    return res.status(200).json({
      success: true,
      data: {
        googleCalendar: {
          connected: Boolean(user.googleCalendarRefreshToken),
          autoSync: Boolean(user.syncGoogleCalendar),
          lastSyncedAt: user.updatedAt,
        },
        outlookCalendar: {
          connected: Boolean(user.outlookCalendarRefreshToken),
          autoSync: Boolean(user.syncOutlookCalendar),
          lastSyncedAt: user.updatedAt,
        },
        appleICal: {
          enabled: true,
          webcalUrl: iCalWebcalUrl,
          feedToken,
        },
        conflictAvoidanceEnabled: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Link Microsoft Outlook OAuth account
 * @route POST /api/calendar-sync/outlook/link
 * @access Protected
 */
exports.linkOutlook = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'OAuth code parameter is required.' });
    }

    const result = await calendarService.linkOutlookCalendar(code, req.user.id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Serve subscribable Apple iCal RFC 5545 feed (.ics)
 * @route GET /api/calendar-sync/ical-feed/:feedToken.ics
 * @access Public (Token-authenticated)
 */
exports.getAppleICalFeed = async (req, res, next) => {
  try {
    const { feedToken } = req.params;
    const cleanToken = feedToken ? feedToken.replace('.ics', '') : '';

    const user = await User.findOne({ where: { iCalFeedToken: cleanToken } });
    const userId = user ? user.id : null;

    const icsContent = await calendarService.generateUserICalFeed(userId);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="openprep-study-schedule.ics"');
    res.setHeader('X-PUBLISHED-TTL', 'PT1H');
    return res.send(icsContent);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Handle Microsoft Graph Outlook Webhook notifications
 * @route POST /api/calendar-sync/outlook/webhook
 * @access Public (Webhook Validation)
 */
exports.handleOutlookWebhook = async (req, res, next) => {
  try {
    // Microsoft Graph validation handshake query param
    if (req.query && req.query.validationToken) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(req.query.validationToken);
    }

    console.log('[Outlook Webhook] Received notification payload from Microsoft Graph');
    return res.status(202).send();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Detect and resolve overlapping calendar block conflicts
 * @route POST /api/calendar-sync/check-conflicts
 * @access Protected
 */
exports.checkConflicts = async (req, res, next) => {
  try {
    const { proposedEvents = [], existingEvents = [] } = req.body;
    const analysis = calendarService.detectCalendarConflicts(req.user.id, proposedEvents, existingEvents);

    return res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};
