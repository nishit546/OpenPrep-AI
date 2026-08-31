const { hasPermission, DEFAULT_PERMISSIONS } = require('../../middleware/squadAuth');

describe('Squad Auth Bitmask Verification', () => {
  it('correctly maps OWNER/ADMIN permissions to have all flags enabled', () => {
    const ownerBits = DEFAULT_PERMISSIONS.owner;
    expect(hasPermission(ownerBits, 'CAN_EDIT_DECKS')).toBe(true);
    expect(hasPermission(ownerBits, 'CAN_DELETE_NOTES')).toBe(true);
    expect(hasPermission(ownerBits, 'CAN_INVITE_MEMBERS')).toBe(true);
    expect(hasPermission(ownerBits, 'CAN_BAN_MEMBERS')).toBe(true);
    expect(hasPermission(ownerBits, 'CAN_VIEW_AUDIT_LOGS')).toBe(true);
  });

  it('correctly restricts MODERATOR from banning members', () => {
    const modBits = DEFAULT_PERMISSIONS.moderator;
    expect(hasPermission(modBits, 'CAN_EDIT_DECKS')).toBe(true);
    expect(hasPermission(modBits, 'CAN_DELETE_NOTES')).toBe(true);
    expect(hasPermission(modBits, 'CAN_INVITE_MEMBERS')).toBe(true);
    expect(hasPermission(modBits, 'CAN_BAN_MEMBERS')).toBe(false);
    expect(hasPermission(modBits, 'CAN_VIEW_AUDIT_LOGS')).toBe(true);
  });

  it('restricts VIEWER from all options', () => {
    const viewerBits = DEFAULT_PERMISSIONS.viewer;
    expect(hasPermission(viewerBits, 'CAN_EDIT_DECKS')).toBe(false);
    expect(hasPermission(viewerBits, 'CAN_VIEW_AUDIT_LOGS')).toBe(false);
  });
});
