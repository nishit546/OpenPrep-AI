const https = require('https');

async function sendSlackNotification(message) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const parsedUrl = new URL(webhookUrl);
    const data = JSON.stringify({ text: message });
    const req = https.request({
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    });
    req.write(data);
    req.end();
  } catch (err) {
    console.error('[queryAuditService] Failed to send Slack alert:', err.message);
  }
}

function initializeQueryAudit(sequelize) {
  sequelize.addHook('beforeQuery', (options) => {
    options.startTime = Date.now();
  });

  sequelize.addHook('afterQuery', async (options) => {
    // Avoid recursive profiling on explain/set queries or writes to AuditLogs itself
    if (options.isProfiling || !options.sql) return;
    if (
      options.sql.startsWith('EXPLAIN') || 
      options.sql.startsWith('SET ') || 
      options.sql.includes('AuditLogs') ||
      options.sql.includes('SHOW ')
    ) {
      return;
    }

    if (options.startTime) {
      const duration = Date.now() - options.startTime;
      if (duration >= 100) {
        // Slow query detected - profile out of band using setImmediate
        setImmediate(async () => {
          try {
            const explainSql = `EXPLAIN (ANALYZE, BUFFERS) ${options.sql}`;
            let explainPlan = '';

            try {
              const rawResult = await sequelize.query(explainSql, {
                bind: options.bind || options.replacements,
                replacements: options.bind || options.replacements,
                isProfiling: true,
                logging: false,
              });
              if (rawResult && rawResult[0]) {
                explainPlan = rawResult[0].map(row => row['QUERY PLAN'] || JSON.stringify(row)).join('\n');
              }
            } catch (err) {
              explainPlan = `Failed to generate explain plan: ${err.message}`;
            }

            const AuditLog = require('../models/AuditLog');
            await AuditLog.create({
              query: options.sql,
              executionTime: duration,
              executionPlan,
            });

            if (duration >= 500) {
              await sendSlackNotification(`⚠️ *Critical Slow Query Alert*:\n*Duration*: ${duration}ms\n*Query*: \`${options.sql}\``);
            }
          } catch (auditErr) {
            console.error('[QueryAudit] Error capturing diagnostics:', auditErr.message);
          }
        });
      }
    }
  });
}

module.exports = {
  initializeQueryAudit,
  sendSlackNotification,
};
