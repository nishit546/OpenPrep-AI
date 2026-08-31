const { ROLES } = require('./rbacMiddleware');
const db = require('../models');

/**
 * Middleware to check resource ownership (Prevents IDOR)
 * @param {string} modelName - The Sequelize model name (e.g., 'Quiz', 'Note', 'FlashcardDeck')
 * @param {string} idParam - The URL parameter name containing the resource ID (default: 'id')
 * @param {string} ownerField - The field on the model representing the owner (default: 'userId')
 */
const checkOwnership = (modelName, idParam = 'id', ownerField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const resourceId = req.params[idParam];
      if (!resourceId) {
        return res.status(400).json({ success: false, error: 'Resource ID is missing in the request.' });
      }

      // Allow Admins to bypass ownership checks
      const userRole = (req.user.role || ROLES.STUDENT).toUpperCase();
      if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.INSTITUTION_ADMIN) {
        return next();
      }

      const Model = db[modelName];
      if (!Model) {
        console.error(`checkOwnership middleware: Model ${modelName} not found.`);
        return res.status(500).json({ success: false, error: 'Internal server error' });
      }

      const resource = await Model.findByPk(resourceId);
      if (!resource) {
        return res.status(404).json({ success: false, error: `${modelName} not found.` });
      }

      // Check if the authenticated user owns the resource
      if (resource[ownerField] && resource[ownerField].toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You do not have permission to access or modify this resource.'
        });
      }

      // Attach resource to request to avoid duplicate DB calls in the controller
      req.resource = resource;
      next();
    } catch (error) {
      console.error(`Error in checkOwnership (${modelName}):`, error);
      res.status(500).json({ success: false, error: 'Server error during authorization.' });
    }
  };
};

module.exports = checkOwnership;
