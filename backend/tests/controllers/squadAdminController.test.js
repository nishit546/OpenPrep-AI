const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const squadRoutes = require('../../routes/squadRoutes');
const errorHandler = require('../../middleware/error');
const User = require('../../models/User');
const { StudySquad, SquadMember, SquadAuditLog } = require('../../models');
const { DEFAULT_PERMISSIONS } = require('../../middleware/squadAuth');

const app = express();
app.use(express.json());
app.use('/api/squads', squadRoutes);
app.use(errorHandler);

describe('Squad Admin Controller Integration Tests', () => {
  let ownerUser, adminUser, modUser, targetUser;
  let ownerToken, adminToken, modToken, targetToken;
  let testSquad;
  let ownerMember, adminMember, modMember, targetMember;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'squad_jwt_secret_test';

    // Create users
    ownerUser = await User.create({ name: 'Owner User', email: 'owner@squad.com', password: 'StrongPass1!', xp: 0 });
    adminUser = await User.create({ name: 'Admin User', email: 'admin@squad.com', password: 'StrongPass1!', xp: 0 });
    modUser = await User.create({ name: 'Mod User', email: 'mod@squad.com', password: 'StrongPass1!', xp: 0 });
    targetUser = await User.create({ name: 'Target User', email: 'target@squad.com', password: 'StrongPass1!', xp: 0 });

    ownerToken = jwt.sign({ id: ownerUser.id, type: 'access' }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ id: adminUser.id, type: 'access' }, process.env.JWT_SECRET);
    modToken = jwt.sign({ id: modUser.id, type: 'access' }, process.env.JWT_SECRET);
    targetToken = jwt.sign({ id: targetUser.id, type: 'access' }, process.env.JWT_SECRET);

    // Create squad
    testSquad = await StudySquad.create({
      name: 'RBAC Test Squad',
      inviteCode: 'RBAC12',
      adminUserId: ownerUser.id,
    });

    // Create memberships with permissions bitmasks
    ownerMember = await SquadMember.create({
      squadId: testSquad.id,
      userId: ownerUser.id,
      role: 'owner',
      permissions: DEFAULT_PERMISSIONS.owner,
    });

    adminMember = await SquadMember.create({
      squadId: testSquad.id,
      userId: adminUser.id,
      role: 'admin',
      permissions: DEFAULT_PERMISSIONS.admin,
    });

    modMember = await SquadMember.create({
      squadId: testSquad.id,
      userId: modUser.id,
      role: 'moderator',
      permissions: DEFAULT_PERMISSIONS.moderator,
    });

    targetMember = await SquadMember.create({
      squadId: testSquad.id,
      userId: targetUser.id,
      role: 'viewer',
      permissions: DEFAULT_PERMISSIONS.viewer,
    });
  });

  afterAll(async () => {
    await SquadMember.destroy({ where: { squadId: testSquad.id } });
    await SquadAuditLog.destroy({ where: { squadId: testSquad.id } });
    await testSquad.destroy();
    await ownerUser.destroy();
    await adminUser.destroy();
    await modUser.destroy();
    await targetUser.destroy();
  });

  describe('GET /api/squads/:id/audit-logs', () => {
    it('allows owner or admin to read audit logs', async () => {
      // Log an event first
      await SquadAuditLog.create({
        squadId: testSquad.id,
        userId: ownerUser.id,
        action: 'MEMBER_JOINED',
      });

      const res = await request(app)
        .get(`/api/squads/${testSquad.id}/audit-logs`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.logs.length).toBeGreaterThan(0);
    });

    it('denies audit logs access to contributors/viewers', async () => {
      // Revoke view audit logs permission from target member
      await targetMember.update({ permissions: 0 });

      const res = await request(app)
        .get(`/api/squads/${testSquad.id}/audit-logs`)
        .set('Authorization', `Bearer ${targetToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Missing required permission CAN_VIEW_AUDIT_LOGS');
    });
  });

  describe('PUT /api/squads/:id/members/:userId/role', () => {
    it('allows owner to promote contributor to moderator', async () => {
      const res = await request(app)
        .put(`/api/squads/${testSquad.id}/members/${targetUser.id}/role`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'moderator' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await SquadMember.findOne({ where: { squadId: testSquad.id, userId: targetUser.id } });
      expect(updated.role).toBe('moderator');
      expect(updated.permissions).toBe(DEFAULT_PERMISSIONS.moderator);
    });

    it('denies non-admin/non-owner from changing roles', async () => {
      const res = await request(app)
        .put(`/api/squads/${testSquad.id}/members/${adminUser.id}/role`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ role: 'contributor' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Only owners and admins can modify roles');
    });
  });

  describe('DELETE /api/squads/:id/members/:userId', () => {
    it('denies moderators from kicking members without CAN_BAN_MEMBERS permission', async () => {
      const res = await request(app)
        .delete(`/api/squads/${testSquad.id}/members/${targetUser.id}`)
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Missing required permission CAN_BAN_MEMBERS');
    });

    it('allows owner to kick members', async () => {
      const res = await request(app)
        .delete(`/api/squads/${testSquad.id}/members/${targetUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const exists = await SquadMember.findOne({ where: { squadId: testSquad.id, userId: targetUser.id } });
      expect(exists).toBeNull();
    });
  });
});
