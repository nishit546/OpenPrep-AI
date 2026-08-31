/**
 * Pediatric Precision Dosing & WHO Growth Percentile Z-Score Engine
 * Computes WHO/CDC growth percentile Z-scores, weight-based mg/kg medication dosing,
 * and maximum daily adult dose safety caps for clinical pediatric simulation.
 */

export interface PediatricPatientProfile {
  patientId: string;
  gender: 'MALE' | 'FEMALE';
  ageMonths: number;
  weightKg: number;
  heightCm: number;
  headCircumferenceCm?: number;
}

export interface GrowthZScoreAssessment {
  weightForAgeZScore: number;
  weightForAgePercentile: number;
  heightForAgeZScore: number;
  heightForAgePercentile: number;
  bmiZScore: number;
  growthStatus: 'SEVERE_UNDERWEIGHT' | 'UNDERWEIGHT' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE';
}

export interface PediatricDrugDoseCalculation {
  drugName: string;
  indication: string;
  recommendedDoseMgPerKg: number;
  dosingFrequency: 'Q8H' | 'Q12H' | 'Q24H' | 'PRN';
  calculatedSingleDoseMg: number;
  calculatedDailyTotalMg: number;
  maxAdultDailyDoseMg: number;
  isExceedingAdultCap: boolean;
  finalSafeSingleDoseMg: number;
}

export class PediatricDosingEngine {
  private patient: PediatricPatientProfile;

  constructor(patient: PediatricPatientProfile) {
    this.patient = patient;
  }

  /**
   * Evaluates WHO Growth Percentile Z-scores for weight and height.
   */
  public evaluateGrowthZScores(): GrowthZScoreAssessment {
    const { ageMonths, weightKg, heightCm } = this.patient;

    // Standard WHO reference median approximations for children 0-60 months
    const expectedWeight = 3.3 + (ageMonths * 0.5); // approximate WHO weight trajectory
    const expectedHeight = 50 + (ageMonths * 1.25); // approximate WHO height trajectory

    const weightSD = 1.2 + (ageMonths * 0.1);
    const heightSD = 2.5 + (ageMonths * 0.15);

    const weightZ = (weightKg - expectedWeight) / weightSD;
    const heightZ = (heightCm - expectedHeight) / heightSD;

    // Convert Z-score to percentile approximation using standard normal CDF
    const weightPercentile = Math.round((1.0 / (1.0 + Math.exp(-1.7 * weightZ))) * 100.0);
    const heightPercentile = Math.round((1.0 / (1.0 + Math.exp(-1.7 * heightZ))) * 100.0);

    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    const bmiZ = Math.round(((bmi - 16.5) / 1.8) * 10) / 10;

    let status: GrowthZScoreAssessment['growthStatus'] = 'NORMAL';
    if (weightZ < -3.0) status = 'SEVERE_UNDERWEIGHT';
    else if (weightZ < -2.0) status = 'UNDERWEIGHT';
    else if (weightZ > 3.0) status = 'OBESE';
    else if (weightZ > 2.0) status = 'OVERWEIGHT';

    return {
      weightForAgeZScore: Math.round(weightZ * 100) / 100,
      weightForAgePercentile: Math.min(99, Math.max(1, weightPercentile)),
      heightForAgeZScore: Math.round(heightZ * 100) / 100,
      heightForAgePercentile: Math.min(99, Math.max(1, heightPercentile)),
      bmiZScore: bmiZ,
      growthStatus: status,
    };
  }

  /**
   * Calculates weight-based mg/kg medication dosing with adult cap enforcement.
   */
  public calculateMedicationDose(
    drugName: string,
    indication: string,
    mgPerKgPerDose: number,
    frequencyDosesPerDay: number,
    maxAdultSingleDoseMg: number
  ): PediatricDrugDoseCalculation {
    const rawSingleDose = mgPerKgPerDose * this.patient.weightKg;
    const isCapped = rawSingleDose > maxAdultSingleDoseMg;
    const safeSingleDose = isCapped ? maxAdultSingleDoseMg : Math.round(rawSingleDose);

    let freqCode: PediatricDrugDoseCalculation['dosingFrequency'] = 'Q8H';
    if (frequencyDosesPerDay === 2) freqCode = 'Q12H';
    else if (frequencyDosesPerDay === 1) freqCode = 'Q24H';

    return {
      drugName,
      indication,
      recommendedDoseMgPerKg: mgPerKgPerDose,
      dosingFrequency: freqCode,
      calculatedSingleDoseMg: Math.round(rawSingleDose),
      calculatedDailyTotalMg: Math.round(rawSingleDose * frequencyDosesPerDay),
      maxAdultDailyDoseMg: maxAdultSingleDoseMg * frequencyDosesPerDay,
      isExceedingAdultCap: isCapped,
      finalSafeSingleDoseMg: safeSingleDose,
    };
  }
}
