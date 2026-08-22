const { initializeQueryAudit } = require('../../services/queryAuditService');
const AuditLog = require('../../models/AuditLog');

describe('Query Performance Auditing and Profiling Hook', () => {
  let sequelizeMock;
  let registeredHooks;

  beforeEach(() => {
    vi.restoreAllMocks();
    registeredHooks = {};

    sequelizeMock = {
      addHook: vi.fn().mockImplementation((hookName, callback) => {
        registeredHooks[hookName] = callback;
      }),
      query: vi.fn().mockResolvedValue([
        [{ 'QUERY PLAN': 'Seq Scan on Exams...' }]
      ]),
      QueryTypes: { SELECT: 'SELECT' }
    };

    initializeQueryAudit(sequelizeMock);
  });

  it('should register beforeQuery and afterQuery hooks', () => {
    expect(sequelizeMock.addHook).toHaveBeenCalledWith('beforeQuery', expect.any(Function));
    expect(sequelizeMock.addHook).toHaveBeenCalledWith('afterQuery', expect.any(Function));
  });

  it('should record startTime in beforeQuery hook options', () => {
    const beforeQuery = registeredHooks['beforeQuery'];
    const options = {};
    beforeQuery(options);
    expect(options.startTime).toBeDefined();
    expect(options.startTime).toBeLessThanOrEqual(Date.now());
  });

  it('should skip audit log creation if query duration is below 100ms', async () => {
    const afterQuery = registeredHooks['afterQuery'];
    vi.spyOn(AuditLog, 'create').mockResolvedValue({});

    const options = {
      startTime: Date.now() - 30, // 30ms duration
      sql: 'SELECT * FROM "Exams";',
    };

    await afterQuery(options);

    // Give setImmediate queue a brief tick
    await new Promise(resolve => setImmediate(resolve));

    expect(sequelizeMock.query).not.toHaveBeenCalled();
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it('should run explain plan and save audit log if query exceeds 100ms', async () => {
    const afterQuery = registeredHooks['afterQuery'];
    vi.spyOn(AuditLog, 'create').mockResolvedValue({});

    const options = {
      startTime: Date.now() - 150, // 150ms duration
      sql: 'SELECT * FROM "Exams";',
    };

    await afterQuery(options);

    // Wait for the async setImmediate processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(sequelizeMock.query).toHaveBeenCalledWith(
      expect.stringContaining('EXPLAIN (ANALYZE, BUFFERS)'),
      expect.objectContaining({ isProfiling: true })
    );
    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'SELECT * FROM "Exams";',
        executionTime: expect.any(Number),
        executionPlan: 'Seq Scan on Exams...'
      })
    );
  });

  it('should skip system query formats to prevent recursive audits', async () => {
    const afterQuery = registeredHooks['afterQuery'];
    vi.spyOn(AuditLog, 'create').mockResolvedValue({});

    const options = {
      startTime: Date.now() - 200,
      sql: 'INSERT INTO "AuditLogs" VALUES (...);', // is an AuditLogs query
    };

    await afterQuery(options);
    await new Promise(resolve => setImmediate(resolve));

    expect(sequelizeMock.query).not.toHaveBeenCalled();
    expect(AuditLog.create).not.toHaveBeenCalled();
  });
});
