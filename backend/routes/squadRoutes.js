const express = require('express');
const router = express.Router();
const squadController = require('../controllers/squadController');
const challengeController = require('../controllers/challengeController');
const squadActivityController = require('../controllers/squadActivityController');
// `middleware/auth` exports { protect, authorize, requireAdmin } — passing the
// whole module object to router.use() registers a non-function and throws.
const { protect } = require('../middleware/auth');
router.use(protect);

router.get('/', squadController.getMySquads);
router.post('/create', squadController.createSquad);
router.post('/join', squadController.joinSquad);
router.post('/:id/leave', squadController.leaveSquad);
router.get('/:id/dashboard', squadController.getSquadDashboard);
router.get('/:id/audio-status', squadController.getAudioStatus);

// Squad Admin/RBAC & Audit logs
const squadAdminController = require('../controllers/squadAdminController');
const { requireSquadPermission } = require('../middleware/squadAuth');

router.get('/:id/audit-logs', requireSquadPermission('CAN_VIEW_AUDIT_LOGS'), squadAdminController.getAuditLogs);
router.put('/:id/members/:userId/role', squadAdminController.updateMemberRole);
router.delete('/:id/members/:userId', requireSquadPermission('CAN_BAN_MEMBERS'), squadAdminController.kickMember);

router.post('/:squadId/challenges', challengeController.createChallenge);
router.put('/:squadId/challenges/:challengeId', challengeController.updateChallenge);

router.get('/:squadId/activity', squadActivityController.getFeed);
router.post('/:squadId/activity/:activityId/react', squadActivityController.react);

module.exports = router;
