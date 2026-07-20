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
      allowNull: false,
      validate: {
        len: {
          args: [8],
          msg: 'Password must be at least 8 characters long',
        },
      },
    },
    role: {
      type: DataTypes.ENUM('student', 'contributor', 'admin'),
      defaultValue: 'student',
    },
    streakCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    streakLastActive: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    studyHours: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    avatar: {
      type: DataTypes.STRING,
      defaultValue: '',
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
    refreshTokens: {
      type: DataTypes.ARRAY(DataTypes.STRING),
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
  },
  {
    timestamps: true,
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

// Match user entered password to hashed password in database
User.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash reset/verification tokens
User.prototype.generateToken = function (field) {
  const token = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  if (field === 'resetPassword') {
    this.resetPasswordToken = hashed;
    this.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  } else if (field === 'emailVerification') {
    this.emailVerificationToken = hashed;
    this.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  return token;
};

module.exports = User;
