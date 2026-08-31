/**
 * Unit tests for confidenceCalibrationService helper functions.
 * Tests pure logic without requiring a database connection.
 */

const {
  recalcStatus,
  GAP_THRESHOLD_BLIND_SPOT,
  GAP_THRESHOLD_UNDERCONFIDENT,
  GAP_THRESHOLD_CALIBRATED,
} = require('../../services/confidenceCalibrationService');

describe('confidenceCalibrationService – recalcStatus', () => {
  function makeRating(confidence, actualScore) {
    return {
      confidence,
      actualScore,
      calibrationGap: 0,
      status: 'untested',
    };
  }

  it('marks as untested when actualScore is null', () => {
    const r = makeRating(8, null);
    recalcStatus(r);
    expect(r.status).toBe('untested');
    expect(r.calibrationGap).toBe(0);
  });

  it('marks as untested when actualScore is undefined', () => {
    const r = makeRating(8, undefined);
    recalcStatus(r);
    expect(r.status).toBe('untested');
  });

  it('marks as blind_spot when confidence significantly exceeds actual', () => {
    const r = makeRating(9, 40); // 90% normalized vs 40% actual → gap=50
    recalcStatus(r);
    expect(r.status).toBe('blind_spot');
    expect(r.calibrationGap).toBe(50);
  });

  it('marks as underconfident when actual exceeds confidence', () => {
    const r = makeRating(3, 80); // 30% normalized vs 80% actual → gap=-50
    recalcStatus(r);
    expect(r.status).toBe('underconfident');
    expect(r.calibrationGap).toBe(-50);
  });

  it('marks as calibrated when gap is within threshold', () => {
    const r = makeRating(7, 65); // 70% normalized vs 65% actual → gap=5
    recalcStatus(r);
    expect(r.status).toBe('calibrated');
    expect(r.calibrationGap).toBe(5);
  });

  it('marks as blind_spot at exactly the threshold', () => {
    const r = makeRating(10, 80); // 100 - 80 = 20, exactly at threshold
    recalcStatus(r);
    expect(r.status).toBe('blind_spot');
  });

  it('marks as calibrated just below the blind_spot threshold', () => {
    const r = makeRating(9, 80); // 90 - 80 = 10, just at calibrated boundary
    recalcStatus(r);
    expect(r.status).toBe('calibrated');
  });

  it('rounds calibrationGap to one decimal', () => {
    const r = makeRating(7, 60); // 70 - 60 = 10
    recalcStatus(r);
    expect(typeof r.calibrationGap).toBe('number');
    expect(Number.isInteger(r.calibrationGap) || String(r.calibrationGap).split('.')[1].length <= 1).toBe(true);
  });
});

describe('confidenceCalibrationService – constants', () => {
  it('has sensible threshold ordering', () => {
    expect(GAP_THRESHOLD_UNDERCONFIDENT).toBeLessThan(GAP_THRESHOLD_CALIBRATED);
    expect(GAP_THRESHOLD_CALIBRATED).toBeLessThan(GAP_THRESHOLD_BLIND_SPOT);
  });

  it('thresholds are all positive or zero', () => {
    expect(GAP_THRESHOLD_BLIND_SPOT).toBeGreaterThanOrEqual(0);
    expect(GAP_THRESHOLD_CALIBRATED).toBeGreaterThanOrEqual(0);
  });
});
