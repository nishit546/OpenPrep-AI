/**
 * Perioperative Anesthesia Risk Scoring & Airway Evaluation Engine
 * Evaluates ASA Physical Status, Mallampati Airway Classification, RCRI (Revised Cardiac Risk Index),
 * and STOP-Bang Obstructive Sleep Apnea risk metrics for clinical surgical simulation.
 */

export interface PatientPreopAssessment {
  patientId: string;
  ageYears: number;
  asaClass: 1 | 2 | 3 | 4 | 5; // ASA Physical Status I-V
  isEmergencyProcedure: boolean;
  mallampatiScore: 1 | 2 | 3 | 4; // Class I - IV
  mouthOpeningCm: number;
  thyromentalDistanceCm: number;
  hasHighRiskSurgery: boolean;
  hasHistoryIschemicHeartDisease: boolean;
  hasHistoryCongestiveHeartFailure: boolean;
  hasHistoryCerebrovascularDisease: boolean;
  preopSerumCreatinineMgDl: number;
  isInsulinDependentDiabetes: boolean;
  snoringHeavy: boolean;
  tiredDaytime: boolean;
  observedApnea: boolean;
  highBloodPressure: boolean;
  bmi: number;
  neckCircumferenceCm: number;
}

export interface AirwayRiskEvaluation {
  mallampatiScore: number;
  isDifficultAirwayPredicted: boolean;
  airwayRiskLevel: 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK_DIFFICULT_AIRWAY';
  recommendedEquipment: string[];
}

export interface CardiacRiskEvaluation {
  rcriScore: number; // 0 to 6
  cardiacRiskPercent: number; // % MACE (Major Adverse Cardiac Event) risk
  cardiacRiskTier: 'CLASS_I_LOW' | 'CLASS_II_MODERATE' | 'CLASS_III_HIGH' | 'CLASS_IV_VERY_HIGH';
}

export interface OSARiskEvaluation {
  stopBangScore: number; // 0 to 8
  osaRiskCategory: 'LOW_RISK_OSA' | 'INTERMEDIATE_RISK_OSA' | 'HIGH_RISK_OSA';
}

export interface PerioperativeRiskReport {
  patientId: string;
  asaPhysicalStatusLabel: string;
  airway: AirwayRiskEvaluation;
  cardiac: CardiacRiskEvaluation;
  osa: OSARiskEvaluation;
  anestheticPlanRecommendation: string;
}

export class PerioperativeAnesthesiaEngine {
  private assessment: PatientPreopAssessment;

  constructor(assessment: PatientPreopAssessment) {
    this.assessment = assessment;
  }

  /**
   * Evaluates airway difficulty using Mallampati, mouth opening, and thyromental distance.
   */
  public evaluateAirway(): AirwayRiskEvaluation {
    const { mallampatiScore, mouthOpeningCm, thyromentalDistanceCm } = this.assessment;
    let isDifficult = false;
    const equipment: string[] = ['Standard Laryngoscope (Mac 3/4)'];

    if (mallampatiScore >= 3 || mouthOpeningCm < 3.0 || thyromentalDistanceCm < 6.0) {
      isDifficult = true;
    }

    let riskLevel: AirwayRiskEvaluation['airwayRiskLevel'] = 'LOW_RISK';
    if (mallampatiScore === 4 || (mouthOpeningCm < 2.5 && thyromentalDistanceCm < 5.0)) {
      riskLevel = 'HIGH_RISK_DIFFICULT_AIRWAY';
      equipment.push('Video Laryngoscope (GlideScope)', 'Flexible Fiberoptic Bronchoscope', 'Bougie Introducer');
    } else if (isDifficult) {
      riskLevel = 'MODERATE_RISK';
      equipment.push('Video Laryngoscope (GlideScope)', 'Bougie Introducer');
    }

    return {
      mallampatiScore,
      isDifficultAirwayPredicted: isDifficult,
      airwayRiskLevel: riskLevel,
      recommendedEquipment: equipment,
    };
  }

  /**
   * Computes Revised Cardiac Risk Index (RCRI / Lee's Index).
   */
  public evaluateCardiacRisk(): CardiacRiskEvaluation {
    let rcri = 0;
    if (this.assessment.hasHighRiskSurgery) rcri++;
    if (this.assessment.hasHistoryIschemicHeartDisease) rcri++;
    if (this.assessment.hasHistoryCongestiveHeartFailure) rcri++;
    if (this.assessment.hasHistoryCerebrovascularDisease) rcri++;
    if (this.assessment.isInsulinDependentDiabetes) rcri++;
    if (this.assessment.preopSerumCreatinineMgDl > 2.0) rcri++;

    let riskPercent = 0.4;
    let tier: CardiacRiskEvaluation['cardiacRiskTier'] = 'CLASS_I_LOW';

    if (rcri === 1) {
      riskPercent = 0.9;
      tier = 'CLASS_II_MODERATE';
    } else if (rcri === 2) {
      riskPercent = 6.6;
      tier = 'CLASS_III_HIGH';
    } else if (rcri >= 3) {
      riskPercent = 11.0;
      tier = 'CLASS_IV_VERY_HIGH';
    }

    return {
      rcriScore: rcri,
      cardiacRiskPercent: riskPercent,
      cardiacRiskTier: tier,
    };
  }

  /**
   * Computes STOP-Bang Obstructive Sleep Apnea score.
   */
  public evaluateOSARisk(): OSARiskEvaluation {
    let score = 0;
    if (this.assessment.snoringHeavy) score++;
    if (this.assessment.tiredDaytime) score++;
    if (this.assessment.observedApnea) score++;
    if (this.assessment.highBloodPressure) score++;
    if (this.assessment.bmi > 35) score++;
    if (this.assessment.ageYears > 50) score++;
    if (this.assessment.neckCircumferenceCm > 40) score++;

    let category: OSARiskEvaluation['osaRiskCategory'] = 'LOW_RISK_OSA';
    if (score >= 5) {
      category = 'HIGH_RISK_OSA';
    } else if (score >= 3) {
      category = 'INTERMEDIATE_RISK_OSA';
    }

    return {
      stopBangScore: score,
      osaRiskCategory: category,
    };
  }

  /**
   * Generates comprehensive perioperative report.
   */
  public generateReport(): PerioperativeRiskReport {
    const airway = this.evaluateAirway();
    const cardiac = this.evaluateCardiacRisk();
    const osa = this.evaluateOSARisk();

    const asaLabels = {
      1: 'ASA I: Normal Healthy Patient',
      2: 'ASA II: Mild Systemic Disease',
      3: 'ASA III: Severe Systemic Disease',
      4: 'ASA IV: Severe Disease Threat to Life',
      5: 'ASA V: Moribund Patient',
    };

    let plan = 'Standard General Anesthesia with endotracheal intubation.';
    if (airway.airwayRiskLevel === 'HIGH_RISK_DIFFICULT_AIRWAY') {
      plan = 'Awake Fiberoptic Intubation / Video-Laryngoscopy Standby with Difficult Airway Cart.';
    } else if (cardiac.cardiacRiskTier === 'CLASS_IV_VERY_HIGH') {
      plan = 'Invasive Arterial Line Monitoring + ICU Post-op Bed Reservation + TEE Standby.';
    }

    return {
      patientId: this.assessment.patientId,
      asaPhysicalStatusLabel: asaLabels[this.assessment.asaClass] + (this.assessment.isEmergencyProcedure ? ' (Emergency - E)' : ''),
      airway,
      cardiac,
      osa,
      anestheticPlanRecommendation: plan,
    };
  }
}
