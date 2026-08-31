/**
 * @fileoverview Middleware to check client characteristics fingerprinting and impossible travel anomalies.
 */
const crypto = require('crypto');
const logger = require('../utils/logger');
const sendEmail = require('../services/emailService');

// In-memory cache for storing OTPs and user last activity geo profiles
const otpStore = new Map();
const userGeoCache = new Map();

// Helper: Haversine distance in km
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Mock IP to Geolocation mapping for testing and simulator verification
const getGeoFromIp = (ip) => {
  if (ip === '127.0.0.1' || ip.startsWith('192.168') || ip === '::1') {
    return { city: 'Localhost', lat: 19.0760, lon: 72.8777 }; // Mumbai coordinates
  }
  if (ip.startsWith('100.1.1')) {
    return { city: 'Mumbai', lat: 19.0760, lon: 72.8777 };
  }
  if (ip.startsWith('100.2.2')) {
    return { city: 'New York', lat: 40.7128, lon: -74.0060 };
  }
  // Default fallback city
  return { city: 'London', lat: 51.5074, lon: -0.1278 };
};

/**
 * Computes a secure device fingerprint hash using client attributes.
 */
const getDeviceFingerprint = (req) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const canvasHash = req.headers['x-canvas-fingerprint'] || 'default-canvas';
  const ipSubnet = (req.ip || '127.0.0.1').split('.').slice(0, 3).join('.'); // subnet class C
  
  return crypto
    .createHash('sha256')
    .update(`${userAgent}-${canvasHash}-${ipSubnet}`)
    .digest('hex');
};

const deviceAnomalyMiddleware = async (req, res, next) => {
  const userId = req.user ? req.user.id : (req.body.email || req.body.userId || 'anon');
  const ip = req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  const currentFingerprint = getDeviceFingerprint(req);
  const currentGeo = getGeoFromIp(ip);
  const currentTime = Date.now();

  const lastProfile = userGeoCache.get(userId);

  if (lastProfile) {
    const timeDeltaHours = (currentTime - lastProfile.timestamp) / 3600000; // in hours
    const distanceKm = getHaversineDistance(
      lastProfile.lat, lastProfile.lon,
      currentGeo.lat, currentGeo.lon
    );

    // Calculate travel speed (velocity) in km/h
    const velocity = timeDeltaHours > 0 ? distanceKm / timeDeltaHours : 0;

    // Threshold of commercial jet speed ~900 km/h
    if (velocity > 900 && distanceKm > 50) {
      logger.warn(`[Impossible Travel Warning] Anomaly detected for user ${userId}. Velocity: ${velocity.toFixed(2)} km/h. Distance: ${distanceKm.toFixed(2)} km.`, {
        userId,
        ip,
        previousIp: lastProfile.ip,
      });

      // Generate verification OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(userId, { otp, expires: currentTime + 5 * 60 * 1000 }); // 5 minutes expiry

      // Send OTP via email
      try {
        if (req.user && req.user.email) {
          await sendEmail({
            email: req.user.email,
            subject: 'Suspicious Account Activity Detected - Verification Code',
            message: `We detected a suspicious login attempt to your OpenPrep AI account.\n\nCoordinates: ${currentGeo.city} (IP: ${ip}).\n\nYour step-up verification code is: ${otp}.`,
          });
        }
      } catch (err) {
        console.error('Failed to send step-up verification OTP email:', err);
      }

      return res.status(403).json({
        success: false,
        requiresOtp: true,
        message: 'Suspicious login/travel anomaly detected. Verification code sent to email.',
        userId,
      });
    }
  }

  // Update geo cache
  userGeoCache.set(userId, {
    ip,
    city: currentGeo.city,
    lat: currentGeo.lat,
    lon: currentGeo.lon,
    fingerprint: currentFingerprint,
    timestamp: currentTime,
  });

  req.deviceFingerprint = currentFingerprint;
  req.estimatedLocation = currentGeo.city;
  next();
};

module.exports = {
  deviceAnomalyMiddleware,
  getDeviceFingerprint,
  getGeoFromIp,
  otpStore,
};
