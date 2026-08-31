const squadAuditService = require('../../services/squadAuditService');
const { SquadAuditLog } = require('../../models');

describe('Squad Audit Service Unit Tests', () => {
  let createdLog;

  afterEach(async () => {
    if (createdLog) {
      await createdLog.destroy();
    }
  });

  it('successfully creates an audit log in the database', async () => {
    createdLog = await squadAuditService.logSquadEvent({
      squadId: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000002',
      action: 'DECK_CREATED',
      ipAddress: '10.0.0.5',
      metadata: { deckTitle: 'Organic Chemistry' }
    });

    expect(createdLog).toBeDefined();
    expect(createdLog.action).toBe('DECK_CREATED');
    expect(createdLog.ipAddress).toBe('10.0.0.5');
    expect(createdLog.metadata.deckTitle).toBe('Organic Chemistry');
  });
});
