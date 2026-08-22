const { logSquadActivity } = require('../../services/squadActivityService');
const { startWorker, stopWorker, consumerName } = require('../../workers/squadActivityWorker');
const redisService = require('../../services/redisService');
const { SquadActivity, SquadMember } = require('../../models');

describe('Squad Activity Change Data Capture (CDC) & Stream Worker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    redisService.isReady = false;
    redisService.client = null;
    global.io = null;
  });

  afterEach(() => {
    stopWorker();
  });

  describe('logSquadActivity Service Integration', () => {
    it('should push to Redis Stream if Redis is ready', async () => {
      redisService.isReady = true;
      redisService.client = {
        xadd: vi.fn().mockResolvedValue('12345-0')
      };

      vi.spyOn(SquadMember, 'findAll').mockResolvedValue([{ squadId: 'squad-1' }]);

      const result = await logSquadActivity('user-123', 'quiz_completed', 'Completed a Quiz!', { score: 90 });

      expect(redisService.client.xadd).toHaveBeenCalledWith(
        'squad:stream',
        '*',
        'data',
        expect.stringContaining('Completed a Quiz!')
      );
      expect(result.queued).toBe(true);
      expect(result.posted).toBe(1);
    });

    it('should fallback to database write if Redis is offline', async () => {
      redisService.isReady = false;

      const mockActivity = { id: 'act-123', createdAt: new Date() };
      vi.spyOn(SquadMember, 'findAll').mockResolvedValue([{ squadId: 'squad-1' }]);
      vi.spyOn(SquadActivity, 'create').mockResolvedValue(mockActivity);

      const result = await logSquadActivity('user-123', 'quiz_completed', 'Fallback Dump', {});

      expect(SquadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          squadId: 'squad-1',
          userId: 'user-123',
          message: 'Fallback Dump'
        })
      );
      expect(result.posted).toBe(1);
      expect(result.queued).toBeUndefined();
    });
  });

  describe('squadActivityWorker Stream Daemon', () => {
    it('should consume stream events, bulk create SQL records, and broadcast via Socket.io', async () => {
      redisService.isReady = true;

      // Mock XREADGROUP response with one event
      const mockEventData = {
        userId: 'user-123',
        activityType: 'quiz_completed',
        message: 'Quiz Master!',
        metadata: { score: 100 }
      };

      redisService.client = {
        xgroup: vi.fn().mockResolvedValue('OK'),
        xreadgroup: vi.fn()
          // First call: returns one event
          .mockResolvedValueOnce([
            [
              'squad:stream',
              [
                ['12345-0', ['data', JSON.stringify(mockEventData)]]
              ]
            ]
          ])
          // Subsequent calls: returns empty to break loop in test
          .mockResolvedValue([]),
        xack: vi.fn().mockResolvedValue(1),
      };

      vi.spyOn(SquadMember, 'findAll').mockResolvedValue([
        { squadId: 'squad-1' },
        { squadId: 'squad-2' }
      ]);
      vi.spyOn(SquadActivity, 'bulkCreate').mockResolvedValue([]);

      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      };
      global.io = mockIo;

      await startWorker();

      // Give worker cycle a small delay to execute
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(SquadMember.findAll).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
      expect(SquadActivity.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ squadId: 'squad-1', userId: 'user-123', message: 'Quiz Master!' }),
          expect.objectContaining({ squadId: 'squad-2', userId: 'user-123', message: 'Quiz Master!' })
        ])
      );
      expect(redisService.client.xack).toHaveBeenCalledWith('squad:stream', 'squad_group', '12345-0');
      expect(mockIo.to).toHaveBeenCalledWith('squad:squad-1');
      expect(mockIo.to).toHaveBeenCalledWith('squad:squad-2');
    });
  });
});
