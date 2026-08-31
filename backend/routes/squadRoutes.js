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

router.post('/:squadId/challenges', challengeController.createChallenge);
router.put('/:squadId/challenges/:challengeId', challengeController.updateChallenge);

router.get('/:squadId/activity', squadActivityController.getFeed);
router.post('/:squadId/activity/:activityId/react', squadActivityController.react);

router.get('/:squadId/habits', squadController.getSquadHabits);
router.post('/:squadId/nudge', squadController.nudgeTeammate);

module.exports = router;
