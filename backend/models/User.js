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
    studyHours: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
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
    xp: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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
    streakFreezesAvailable: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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

module.exports = User;
