const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Please add a name' },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: { msg: 'Email already exists' },
      validate: {
        isEmail: { msg: 'Please add a valid email' },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isValidPassword(value) {
          if (value && value.length < 8) {
            throw new Error('Password must be at least 8 characters long');
          }
        },
      },
    },
    role: {
      type: DataTypes.ENUM('student', 'contributor', 'admin'),
      defaultValue: 'student',
    },
    provider: {
      type: DataTypes.STRING,
      defaultValue: 'local',
    },
    socialId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    githubId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    currentLearningPathId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    authProvider: {
      type: DataTypes.ENUM('local', 'google', 'github'),
      defaultValue: 'local',
    },
    streakCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    streakLastActive: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    streakFreezes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    streakFreezesAvailable: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'streak_freezes_available',
    },
    prepCoins: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'prep_coins',
    },
    equippedAvatarFrame: {
      type: DataTypes.STRING,
      defaultValue: null,
      field: 'equipped_avatar_frame',
    },
    ownedCosmetics: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'owned_cosmetics',
    },
    activeXpBoosterUntil: {
      type: DataTypes.DATE,
      defaultValue: null,
      field: 'active_xp_booster_until',
    },
    xp: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    studyHours: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    eloRating: {
      type: DataTypes.INTEGER,
      defaultValue: 1200,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    locale: {
      type: DataTypes.STRING,
      defaultValue: 'en',
    },
    leaderboardVisible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    receiveWeeklyDigest: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
    },
    emailVerificationExpire: {
      type: DataTypes.DATE,
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
    },
    resetPasswordExpire: {
      type: DataTypes.DATE,
    },
    resetPasswordOtpHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordOtpExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resetPasswordAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    refreshTokens: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    refreshTokenExpire: {
      type: DataTypes.DATE,
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lockoutUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sm2EasyFactorModifier: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    sm2IntervalModifier: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    sm2Step1Interval: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    sm2Step2Interval: {
      type: DataTypes.INTEGER,
      defaultValue: 6,
    },
    googleCalendarRefreshToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    syncGoogleCalendar: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    googleCalendarWebhookChannelId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    googleCalendarWebhookResourceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    googleCalendarWebhookExpiration: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    hideActivityFromSquad: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },    pushSubscription: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
dailyReminderTime: {
  type: DataTypes.STRING,
  defaultValue: '09:00',
},
examCountdownPreferences: {
  type: DataTypes.JSONB,
  allowNull: false,
  defaultValue: {
    targetExamDate: null,
    targetScore: null,
    milestones: [],
  },
},    dailyAiUsageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastAiUsageReset: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    badges: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    skillPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    unlockedNodes: {
      type: DataTypes.JSONB,
      defaultValue: ['root'],
    },
    streakFreezesEquippedThisMonth: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastStreakFreezeEquipMonth: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    currentStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    longestStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastActivityDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    skillScore: {
      type: DataTypes.FLOAT,
      defaultValue: 1000.0,
    },
    recentAnswerHistory: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    dashboardLayout: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    /**
     * Whether this account is shadow banned from community discussion.
     *
     * The column has existed since the question-comments migration, but the
     * attribute did not, and Sequelize builds its SET clause from
     * rawAttributes: `User.update({ isShadowBanned: true }, ...)` produced SQL
     * that updated nothing, silently, and `req.user.isShadowBanned` was never
     * hydrated so it read as undefined on every request. The flag pipeline
     * looked like it worked and banned no one.
     *
     * A shadow-banned author can still post; their comments are created
     * hidden, so the account sees its own contributions and no one else does.
     */
    isShadowBanned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    /**
     * IANA timezone name, used to decide when a user's study day rolls over.
     *
     * Same omission as isShadowBanned above, found by the migration/model
     * cross-check added alongside it: the column arrived in
     * 20260821140000-add-timezone-to-users.js and the attribute never did, so
     * `user.timezone = timezone; await user.save()` in userController wrote
     * nothing and the endpoint echoed the value straight back as if it had.
     */
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Asia/Kolkata',
    },
    eloRating: {
      type: DataTypes.INTEGER,
      defaultValue: 1200,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password') && user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

// Match user entered password to hashed password in database
User.prototype.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Calculate and apply post-match ELO changes
User.adjustRatings = async function (winnerId, loserId, kFactor = 32) {
  const winner = typeof this.findByPk === 'function' ? await this.findByPk(winnerId) : await this.findById(winnerId);
  const loser = typeof this.findByPk === 'function' ? await this.findByPk(loserId) : await this.findById(loserId);

  const winnerElo = winner ? (winner.eloRating !== undefined && winner.eloRating !== null ? winner.eloRating : 1200) : 1200;
  const loserElo = loser ? (loser.eloRating !== undefined && loser.eloRating !== null ? loser.eloRating : 1200) : 1200;

  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

  const newWinnerElo = Math.round(winnerElo + kFactor * (1 - expectedWinner));
  const newLoserElo = Math.round(loserElo + kFactor * (0 - expectedLoser));

  if (winner) {
    if (typeof winner.update === 'function') {
      await winner.update({ eloRating: newWinnerElo });
    } else {
      winner.eloRating = newWinnerElo;
      if (typeof winner.save === 'function') await winner.save();
    }
  } else if (typeof this.findByIdAndUpdate === 'function') {
    await this.findByIdAndUpdate(winnerId, { eloRating: newWinnerElo });
  }

  if (loser) {
    if (typeof loser.update === 'function') {
      await loser.update({ eloRating: newLoserElo });
    } else {
      loser.eloRating = newLoserElo;
      if (typeof loser.save === 'function') await loser.save();
    }
  } else if (typeof this.findByIdAndUpdate === 'function') {
    await this.findByIdAndUpdate(loserId, { eloRating: newLoserElo });
  }

  return { newWinnerElo, newLoserElo };
};

User.statics = {
  adjustRatings: User.adjustRatings,
};

module.exports = User;
