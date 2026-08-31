/**
 * @fileoverview Automated MTTR Resilience Audit Report generator for Chaos Engineering.
 */
const fs = require('fs');
const path = require('path');

class MTTRReportGenerator {
  constructor() {
    this.scenarios = [];
    this.totalRequests = 0;
    this.unhandled500Count = 0;
    this.startTime = new Date().toISOString();
  }

  /**
   * Record sample HTTP request result for 500 error rate tracking
   */
  recordRequest(statusCode) {
    this.totalRequests += 1;
    if (statusCode === 500) {
      this.unhandled500Count += 1;
    }
  }

  /**
   * Add scenario metrics
   */
  recordScenarioResult({
    scenarioName,
    toxicType,
    targetService,
    injectTime,
    detectTime,
    restoreTime,
    recoverTime,
    passed = true,
    notes = '',
  }) {
    const injectTs = new Date(injectTime).getTime();
    const restoreTs = new Date(restoreTime).getTime();
    const recoverTs = new Date(recoverTime || Date.now()).getTime();

    const mttrMs = Math.max(0, recoverTs - restoreTs);

    this.scenarios.push({
      scenarioName,
      toxicType,
      targetService,
      injectTime: new Date(injectTs).toISOString(),
      detectTime: new Date(detectTime || injectTs).toISOString(),
      restoreTime: new Date(restoreTs).toISOString(),
      recoverTime: new Date(recoverTs).toISOString(),
      mttrMs,
      passed,
      notes,
    });
  }

  /**
   * Calculate overall MTTR and 500 error rate metrics
   */
  calculateMetrics() {
    const count = this.scenarios.length;
    const totalMttr = this.scenarios.reduce((acc, s) => acc + s.mttrMs, 0);
    const overallMttrMs = count > 0 ? Math.round(totalMttr / count) : 0;
    const unhandled500Rate = this.totalRequests > 0 ? Number((this.unhandled500Count / this.totalRequests).toFixed(4)) : 0;
    const passedAll = this.scenarios.every((s) => s.passed) && unhandled500Rate < 0.1;

    return {
      startTime: this.startTime,
      endTime: new Date().toISOString(),
      scenarioCount: count,
      overallMttrMs,
      totalRequests: this.totalRequests,
      unhandled500Count: this.unhandled500Count,
      unhandled500Rate,
      unhandled500RatePass: unhandled500Rate < 0.1,
      passedAll,
      scenarios: this.scenarios,
    };
  }

  /**
   * Save report as JSON and Markdown files
   * @param {string} outputDir Directory path (default: backend/coverage)
   */
  saveReports(outputDir = path.join(__dirname, '../../../coverage')) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const metrics = this.calculateMetrics();

    // 1. Write JSON Report
    const jsonPath = path.join(outputDir, 'chaos-mttr-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2), 'utf-8');

    // 2. Write Markdown Report
    const mdLines = [
      '# MTTR Resilience Audit Report',
      '',
      `- **Generated**: ${metrics.endTime}`,
      `- **Overall MTTR**: ${metrics.overallMttrMs} ms`,
      `- **Total Requests Sampled**: ${metrics.totalRequests}`,
      `- **Unhandled 500 Error Count**: ${metrics.unhandled500Count}`,
      `- **Unhandled 500 Error Rate**: ${metrics.unhandled500Rate} (Threshold: < 0.10) — ${metrics.unhandled500RatePass ? '✅ PASS' : '❌ FAIL'}`,
      `- **Suite Result**: ${metrics.passedAll ? '✅ PASSED' : '❌ FAILED'}`,
      '',
      '| Scenario | Toxic Type | Target Service | Inject Time | Restore Time | Recover Time | MTTR (ms) | Status |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ];

    for (const s of metrics.scenarios) {
      mdLines.push(
        `| ${s.scenarioName} | ${s.toxicType} | ${s.targetService} | ${s.injectTime.split('T')[1].split('.')[0]} | ${s.restoreTime.split('T')[1].split('.')[0]} | ${s.recoverTime.split('T')[1].split('.')[0]} | ${s.mttrMs}ms | ${s.passed ? 'PASSED' : 'FAILED'} |`
      );
    }

    const mdPath = path.join(outputDir, 'chaos-mttr-report.md');
    fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf-8');

    console.log(`[MTTR Report] Generated chaos audit reports:\n  - ${jsonPath}\n  - ${mdPath}`);
    return { jsonPath, mdPath, metrics };
  }
}

module.exports = MTTRReportGenerator;
