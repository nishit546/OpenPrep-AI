const squadController = require('../../controllers/squadController');
const squadService = require('../../services/squadService');
const models = require('../../models');
const cacheManager = require('../../utils/cacheManager');

describe('Squad Controller Extended', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { id: 'user-1' }, body: {}, params: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('getSquadHabits', () => {
    it('should return 403 if user is not a member', async () => {
      req.params = { squadId: 'squad-1' };
      vi.spyOn(models.SquadMember, 'findOne').mockResolvedValue(null);

      await squadController.getSquadHabits(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should calculate matrix, XP, and consistency', async () => {
      req.params = { squadId: 'squad-1' };
      vi.spyOn(models.SquadMember, 'findOne').mockResolvedValue({ id: 'm-1' });
      vi.spyOn(models.SquadMember, 'findAll').mockResolvedValue([
        { userId: 'user-1', userRef: { id: 'user-1' } },
        { userId: 'user-2', userRef: { id: 'user-2' } }
      ]);

      const todayStr = new Date().toISOString().split('T')[0];
      vi.spyOn(models.HabitLog, 'findAll').mockResolvedValue([
        { userId: 'user-1', date: todayStr, completionCount: 2 },
        { userId: 'user-1', date: todayStr, completionCount: 1 },
        { userId: 'user-2', date: todayStr, completionCount: 5 }
      ]);

      await squadController.getSquadHabits(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0];
      
      // user-1: 3 completions = 30 XP, 1 active day = 1/7 consistency
      expect(data.matrix['user-1'].weeklyXp).toBe(30);
      expect(data.matrix['user-1'].consistencyDays).toBe(1);
      // user-2: 5 completions = 50 XP
      expect(data.matrix['user-2'].weeklyXp).toBe(50);
      
      expect(data.squadProgress.totalXp).toBe(80); // 30 + 50
      expect(data.squadProgress.level).toBe(1); // 80 < 500
      expect(data.squadProgress.currentLevelXp).toBe(80);
      
      expect(data.leaderboard[0].user.id).toBe('user-2'); // 50 XP
      expect(data.leaderboard[0].consistency).toBe(14); // 1/7 = 14%
    });
  });

  describe('nudgeTeammate', () => {
    it('should block if daily limit reached', async () => {
      req.params = { squadId: 'squad-1' };
      req.body = { targetUserId: 'user-2' };
      vi.spyOn(models.SquadMember, 'findOne').mockResolvedValue({ id: 'm-1' });
      vi.spyOn(cacheManager, 'get').mockResolvedValue('1');

      await squadController.nudgeTeammate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({ error: 'Daily limit reached for nudging this teammate' });
    });

    it('should set cache and return success if under limit', async () => {
      req.params = { squadId: 'squad-1' };
      req.body = { targetUserId: 'user-2' };
      vi.spyOn(models.SquadMember, 'findOne').mockResolvedValue({ id: 'm-1' });
      vi.spyOn(cacheManager, 'get').mockResolvedValue(null);
      vi.spyOn(cacheManager, 'set').mockResolvedValue(true);

      await squadController.nudgeTeammate(req, res, next);
      
      expect(cacheManager.set).toHaveBeenCalledWith('nudge_squad-1_user-1_user-2', '1', 86400);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
