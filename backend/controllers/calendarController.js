/**
 * @fileoverview Controller for handling calendar integration and sync preferences.
 */
const calendarSyncService = require('../services/calendarSyncService');
// const UserCalendar = require('../models/UserCalendar');

/**
 * Initiates the OAuth2 flow by redirecting to the provider.
 */
const initiateOAuth = async (req, res) => {
    try {
        const { provider } = req.params;
        // const userId = req.user.id;
        const userId = 'mock_user_123';

        if (!['google', 'outlook'].includes(provider)) {
            return res.status(400).json({ success: false, message: 'Invalid provider.' });
        }

        const authUrl = calendarSyncService.getOAuthUrl(provider, userId);
        res.status(200).json({ success: true, data: { authUrl } });
    } catch (error) {
        console.error('Error initiating OAuth:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Handles the OAuth2 callback and saves the token.
 */
const handleOAuthCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        const provider = 'google'; // Simplified for demo

        const tokens = await calendarSyncService.exchangeCodeForToken(provider, code);

        // Mock saving to database
        // await UserCalendar.upsert({ userId: state, provider, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, daysInAdvance: 3, isEnabled: true });

        res.status(200).json({
            success: true,
            message: 'Calendar connected successfully.',
            data: { provider, isConnected: true }
        });
    } catch (error) {
        console.error('Error handling OAuth callback:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Fetches the user's current calendar sync status and preferences.
 */
const getSyncStatus = async (req, res) => {
    try {
        // Mock database fetch
        const mockStatus = {
            isConnected: true,
            provider: 'google',
            isEnabled: true,
            daysInAdvance: 3,
            lastSyncedAt: new Date().toISOString()
        };

        res.status(200).json({ success: true, data: mockStatus });
    } catch (error) {
        console.error('Error fetching sync status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Updates sync preferences (e.g., days in advance, toggle on/off).
 */
const updateSyncPreferences = async (req, res) => {
    try {
        const { isEnabled, daysInAdvance } = req.body;

        // Mock database update
        res.status(200).json({
            success: true,
            message: 'Preferences updated successfully.',
            data: { isEnabled, daysInAdvance }
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Disconnects the calendar and revokes tokens.
 */
const disconnectCalendar = async (req, res) => {
    try {
        // Mock database deletion and token revocation
        res.status(200).json({ success: true, message: 'Calendar disconnected successfully.' });
    } catch (error) {
        console.error('Error disconnecting calendar:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    initiateOAuth,
    handleOAuthCallback,
    getSyncStatus,
    updateSyncPreferences,
    disconnectCalendar,
};
