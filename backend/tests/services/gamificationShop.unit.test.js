const gamificationService = require('../../services/gamificationService');
const { User } = require('../../models');

describe('Gamification Shop & Economy Unit Tests', () => {
  let mockUser;

  beforeEach(() => {
    mockUser = {
      id: 'user-xyz',
      prepCoins: 500,
      xp: 100,
      level: 1,
      ownedCosmetics: ['golden_sparkle_frame'],
      equippedAvatarFrame: null,
      activeXpBoosterUntil: null,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(User, 'findByPk').mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('awards PrepCoins to users correctly', async () => {
    const res = await gamificationService.awardCoins('user-xyz', 50, 'Goal completed');
    expect(mockUser.prepCoins).toBe(550);
    expect(mockUser.save).toHaveBeenCalled();
  });

  it('doubles XP awards when activeXpBoosterUntil is set to a future date', async () => {
    // Set 2x booster active for 1 hour
    mockUser.activeXpBoosterUntil = new Date(Date.now() + 60 * 60 * 1000);

    // Mock rate limiter to allow the XP award
    const xpRateLimiter = require('../../services/xpRateLimiter');
    vi.spyOn(xpRateLimiter, 'consume').mockImplementation((userId, amount) => {
      return Promise.resolve({ granted: amount });
    });

    const res = await gamificationService.awardXP('user-xyz', 100, 'Quiz completed');
    
    // XP awarded should be 100 * 2 = 200!
    expect(mockUser.xp).toBe(300); // 100 base + 200 booster XP
    expect(mockUser.save).toHaveBeenCalled();
  });

  it('applies standard daily streak auto-freeze maintenance logic', async () => {
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dayBeforeYesterdayStr = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0];

    mockUser.lastActivityDate = dayBeforeYesterdayStr;
    mockUser.streakFreezes = 2;
    mockUser.streakFreezesAvailable = 2;

    vi.spyOn(User, 'findAll').mockResolvedValue([mockUser]);

    await gamificationService.maintainDailyStreaks();

    // Inactivity consumed 1 freeze and set lastActivityDate to yesterday!
    expect(mockUser.streakFreezesAvailable).toBe(1);
    expect(mockUser.lastActivityDate).toBe(yesterdayStr);
    expect(mockUser.save).toHaveBeenCalled();
  });
});
