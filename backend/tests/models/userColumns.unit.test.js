import { describe, it, expect } from 'vitest';
const User = require('../../models/User');

describe('User Model Column Constraints', () => {
  it('should have exactly one leaderboardVisible definition with correct constraints', () => {
    const attribute = User.rawAttributes.leaderboardVisible;
    expect(attribute).toBeDefined();
    expect(attribute.type.constructor.name).toBe('BOOLEAN');
    expect(attribute.defaultValue).toBe(true);
  });

  it('should have exactly one receiveWeeklyDigest definition with allowNull: false', () => {
    const attribute = User.rawAttributes.receiveWeeklyDigest;
    expect(attribute).toBeDefined();
    expect(attribute.type.constructor.name).toBe('BOOLEAN');
    expect(attribute.defaultValue).toBe(true);
    expect(attribute.allowNull).toBe(false);
  });
});
