const express = require('express');
const router = express.Router();
const bountyController = require('../controllers/bountyController');
const { protect } = require('../middleware/auth');

// Protect all bounty board endpoints
router.use(protect);

router.get('/', bountyController.getBounties);
router.get('/:id', bountyController.getBountyDetails);
router.post('/', bountyController.createBounty);
router.post('/:id/answers', bountyController.submitSolution);
router.put('/:id/accept/:answerId', bountyController.acceptSolution);
router.post('/answers/:answerId/vote', bountyController.voteSolution);

module.exports = router;
