/**
 * Clinical Pediatric Growth Velocity & Body Surface Area (BSA) Calculator Extension
 * Uses Haycock and Boyd BSA formulas for pediatric specific dosing evaluations.
 */

export interface PediatricBsaResult {
  haycockBsaM2: number;
  boydBsaM2: number;
  recommendedLiquidDosingSpoonMl: number;
}

export function calculatePediatricBsa(weightKg: number, heightCm: number): PediatricBsaResult {
  // Haycock Formula: 0.024265 * weight^0.5378 * height^0.3964
  const haycock = 0.024265 * Math.pow(weightKg, 0.5378) * Math.pow(heightCm, 0.3964);

  // Boyd Formula: 0.0003207 * height^0.3 * weight^(0.7285 - (0.0188 * log10(weight)))
  const weightGrams = weightKg * 1000;
  const boydExponent = 0.7285 - (0.0188 * Math.log10(weightGrams));
  const boyd = 0.0003207 * Math.pow(heightCm, 0.3) * Math.pow(weightGrams, boydExponent);

  return {
    haycockBsaM2: Math.round(haycock * 100) / 100,
    boydBsaM2: Math.round(boyd * 100) / 100,
    recommendedLiquidDosingSpoonMl: 5.0,
  };
}

export interface GrowthVelocityRecord {
  monthAge: number;
  weightKg: number;
  monthlyGainGrams: number;
}

export function evaluateGrowthVelocity(records: GrowthVelocityRecord[]): string {
  if (records.length < 2) return 'Insufficient historical growth points to determine velocity trend.';
  const latest = records[records.length - 1];
  const previous = records[records.length - 2];
  const gain = (latest.weightKg - previous.weightKg) * 1000;

  if (gain < 150) return 'Failure to thrive alert: Low weight gain velocity (<150g/month).';
  return 'Normal infant growth velocity maintained.';
}
