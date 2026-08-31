const squadService = require('../services/squadService');
const { StudySquad, SquadMember, User, SquadChallenge, SquadAchievement, SquadChallengeContribution } = require('../models');

async function createSquad(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Squad name is required' });
    }
    const squad = await squadService.createSquad(req.user.id, name);
    res.status(201).json(squad);
  } catch (err) {
    next(err);
  }
}

async function joinSquad(req, res, next) {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }
    const squad = await squadService.joinSquad(req.user.id, inviteCode);
    res.status(200).json(squad);
  } catch (err) {
    if (err.message === 'Invalid invite code' || err.message === 'User is already a member of this squad') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function leaveSquad(req, res, next) {
  try {
    const { id } = req.params;
    await squadService.leaveSquad(req.user.id, id);
    res.status(200).json({ message: 'Left squad successfully' });
  } catch (err) {
    if (err.message === 'Not a member of this squad') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function getSquadDashboard(req, res, next) {
  try {
    const { id } = req.params;
    
    // Check membership
    const member = await SquadMember.findOne({ where: { squadId: id, userId: req.user.id } });
    if (!member) {
      return res.status(403).json({ error: 'Not authorized to view this squad' });
    }

    const squad = await StudySquad.findByPk(id, {
      include: [
        {
          model: SquadMember,
          as: 'SquadMembers',
          include: [{ model: User, as: 'userRef', attributes: ['id', 'name', 'avatar'] }]
        },
        {
          model: SquadChallenge,
          as: 'SquadChallenges',
          where: { status: 'active' },
          required: false,
          include: [{ model: SquadChallengeContribution, as: 'SquadChallengeContributions' }]
        },
        {
          model: SquadAchievement,
          as: 'SquadAchievements'
        }
      ]
    });

    if (!squad) {
      return res.status(404).json({ error: 'Squad not found' });
    }

    res.status(200).json({ squad, currentUserRole: member.role });
  } catch (err) {
    next(err);
  }
}

async function getMySquads(req, res, next) {
  try {
    const memberships = await SquadMember.findAll({
      where: { userId: req.user.id },
      include: [{ model: StudySquad, as: 'squadRef' }]
    });
    const squads = memberships.map(m => m.squadRef);
    res.status(200).json(squads);
  } catch (err) {
    next(err);
  }
}

async function getSquadHabits(req, res, next) {
  try {
    const { squadId } = req.params;
    const { HabitLog, User } = require('../models');
    const { Op } = require('sequelize');

    const member = await SquadMember.findOne({ where: { squadId, userId: req.user.id } });
    if (!member) return res.status(403).json({ error: 'Not authorized to view this squad' });

    const squadMembers = await SquadMember.findAll({
      where: { squadId },
      include: [{ model: User, as: 'userRef', attributes: ['id', 'name', 'avatar'] }]
    });

    const userIds = squadMembers.map(m => m.userId);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const logs = await HabitLog.findAll({
      where: {
        userId: { [Op.in]: userIds },
        date: { [Op.gte]: sevenDaysAgo }
      }
    });

    const matrix = {};
    let totalSquadXP = 0;
    
    squadMembers.forEach(m => {
      matrix[m.userId] = {
        user: m.userRef,
        habitsByDate: {},
        weeklyXp: 0,
        consistencyDays: 0
      };
    });

    logs.forEach(log => {
      const u = matrix[log.userId];
      if (u) {
        if (!u.habitsByDate[log.date]) {
          u.habitsByDate[log.date] = 0;
          u.consistencyDays += 1;
        }
        u.habitsByDate[log.date] += log.completionCount;
        
        const xp = log.completionCount * 10;
        u.weeklyXp += xp;
        totalSquadXP += xp;
      }
    });

    const level = Math.floor(totalSquadXP / 500) + 1;
    const currentLevelXp = totalSquadXP % 500;
    const nextLevelXp = 500;

    const leaderboard = Object.values(matrix)
      .map(u => ({
        user: u.user,
        xp: u.weeklyXp,
        consistency: Math.round((u.consistencyDays / 7) * 100)
      }))
      .sort((a, b) => b.xp - a.xp);

    res.status(200).json({
      matrix,
      leaderboard,
      squadProgress: {
        totalXp: totalSquadXP,
        level,
        currentLevelXp,
        nextLevelXp
      }
    });
  } catch (err) {
    next(err);
  }
}

async function nudgeTeammate(req, res, next) {
  try {
    const { squadId } = req.params;
    const { targetUserId } = req.body;
    const cacheManager = require('../utils/cacheManager');

    const member = await SquadMember.findOne({ where: { squadId, userId: req.user.id } });
    if (!member) return res.status(403).json({ error: 'Not authorized' });

    const targetMember = await SquadMember.findOne({ where: { squadId, userId: targetUserId } });
    if (!targetMember) return res.status(400).json({ error: 'Target user is not in the squad' });

    const cacheKey = `nudge_${squadId}_${req.user.id}_${targetUserId}`;
    const alreadyNudged = await cacheManager.get(cacheKey);
    if (alreadyNudged) {
      return res.status(429).json({ error: 'Daily limit reached for nudging this teammate' });
    }

    await cacheManager.set(cacheKey, '1', 86400);

    if (global.io) {
      global.io.to(`user:${targetUserId}`).emit('squad:nudge_received', {
        squadId,
        fromUserId: req.user.id,
        timestamp: new Date()
      });
    }

    res.status(200).json({ message: 'Nudge sent successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSquad,
  joinSquad,
  leaveSquad,
  getSquadDashboard,
  getMySquads,
  getSquadHabits,
  nudgeTeammate
};
