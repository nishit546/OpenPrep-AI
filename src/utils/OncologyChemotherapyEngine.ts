/**
 * Oncology Precision Chemotherapy Regimen & Toxicity Scoring Engine
 * Evaluates Body Surface Area (BSA) / Calvert AUC dosing formulas, CTCAE v5.0 organ toxicity grading,
 * and hematologic risk stratification for clinical oncology prep and treatment simulation.
 */

export interface PatientOncologyProfile {
  patientId: string;
  weightKg: number;
  heightCm: number;
  serumCreatinineMgDl: number;
  gender: 'MALE' | 'FEMALE';
  ageYears: number;
  cancerType: 'BREAST' | 'NON_SMALL_CELL_LUNG' | 'COLORECTAL' | 'OVARIAN';
}

export interface ChemotherapyDrugDose {
  drugName: string;
  dosingType: 'BSA_BASED' | 'CALVERT_AUC' | 'FLAT_DOSE';
  targetDosePerM2OrAuc: number;
  calculatedDose: number;
  unit: string;
}

export interface CTCAEToxicityGrade {
  toxicityCategory: 'NEUTROPENIA' | 'THROMBOCYTOPENIA' | 'NEUROPATHY' | 'NEPHROTOXICITY' | 'NAUSEA_VOMITING';
  currentGrade: 0 | 1 | 2 | 3 | 4 | 5; // 0 (None) to 5 (Death)
  clinicalDescription: string;
}

export interface RegimenSafetyAssessment {
  patientId: string;
  calculatedBsaM2: number;
  calculatedGfrMlMin: number;
  chemotherapyDoses: ChemotherapyDrugDose[];
  maxToxicityGrade: number;
  isDoseReductionRequired: boolean;
  recommendedDoseAdjustmentPercent: number;
  gcsfProphylaxisIndicated: boolean;
}

export class OncologyChemotherapyEngine {
  private patient: PatientOncologyProfile;
  private toxicities: CTCAEToxicityGrade[];

  constructor(patient: PatientOncologyProfile, initialToxicities: CTCAEToxicityGrade[] = []) {
    this.patient = patient;
    this.toxicities = initialToxicities;
  }

  /**
   * Calculates Body Surface Area (BSA) using Mosteller Formula: sqrt((height * weight) / 3600)
   */
  public calculateBSA(): number {
    const bsa = Math.sqrt((this.patient.heightCm * this.patient.weightKg) / 3600);
    return Math.round(bsa * 100) / 100;
  }

  /**
   * Calculates Glomerular Filtration Rate (eGFR) / CrCl using Cockcroft-Gault Equation.
   */
  public calculateCockcroftGaultCrCl(): number {
    const { ageYears, weightKg, serumCreatinineMgDl, gender } = this.patient;
    let crcl = ((140 - ageYears) * weightKg) / (72 * Math.max(0.4, serumCreatinineMgDl));
    if (gender === 'FEMALE') {
      crcl *= 0.85;
    }
    return Math.round(crcl * 10) / 10;
  }

  /**
   * Calculates Carboplatin dose via Calvert Formula: Total Dose (mg) = Target AUC * (GFR + 25)
   */
  public calculateCalvertDose(targetAUC: number): number {
    const gfr = Math.min(125, this.calculateCockcroftGaultCrCl()); // Capped at 125 mL/min as per ASCO guidelines
    const dose = targetAUC * (gfr + 25);
    return Math.round(dose);
  }

  /**
   * Calculates comprehensive chemotherapy regimen doses based on cancer protocol.
   */
  public computeRegimenDoses(): ChemotherapyDrugDose[] {
    const bsa = this.calculateBSA();
    const doses: ChemotherapyDrugDose[] = [];

    switch (this.patient.cancerType) {
      case 'BREAST':
        // AC-T Protocol (Doxorubicin + Cyclophosphamide)
        doses.push({ drugName: 'Doxorubicin', dosingType: 'BSA_BASED', targetDosePerM2OrAuc: 60, calculatedDose: Math.round(60 * bsa), unit: 'mg' });
        doses.push({ drugName: 'Cyclophosphamide', dosingType: 'BSA_BASED', targetDosePerM2OrAuc: 600, calculatedDose: Math.round(600 * bsa), unit: 'mg' });
        break;
      case 'OVARIAN':
        // Paclitaxel + Carboplatin AUC 5
        doses.push({ drugName: 'Paclitaxel', dosingType: 'BSA_BASED', targetDosePerM2OrAuc: 175, calculatedDose: Math.round(175 * bsa), unit: 'mg' });
        doses.push({ drugName: 'Carboplatin', dosingType: 'CALVERT_AUC', targetDosePerM2OrAuc: 5, calculatedDose: this.calculateCalvertDose(5), unit: 'mg' });
        break;
      case 'NON_SMALL_CELL_LUNG':
        // Cisplatin + Pemetrexed
        doses.push({ drugName: 'Cisplatin', dosingType: 'BSA_BASED', targetDosePerM2OrAuc: 75, calculatedDose: Math.round(75 * bsa), unit: 'mg' });
        doses.push({ drugName: 'Pemetrexed', dosingType: 'BSA_BASED', targetDosePerM2OrAuc: 500, calculatedDose: Math.round(500 * bsa), unit: 'mg' });
        break;
      case 'COLORECTAL':
        // FOLFOX (Oxaliplatin + 5-FU)
        doses.push({ drugName: 'Oxaliplatin', dosingType: 'BSA_BASED', targetDosePerM2OrAuc: 85, calculatedDose: Math.round(85 * bsa), unit: 'mg' });
        doses.push({ drugName: 'Fluorouracil (5-FU)', dosingType: 'BSA_BASED', targetDosePerM2OrAuc: 2400, calculatedDose: Math.round(2400 * bsa), unit: 'mg' });
        break;
    }

    return doses;
  }

  /**
   * Performs CTCAE v5.0 toxicity evaluation and dose modification assessment.
   */
  public evaluateRegimenSafety(): RegimenSafetyAssessment {
    const bsa = this.calculateBSA();
    const gfr = this.calculateCockcroftGaultCrCl();
    const doses = this.computeRegimenDoses();

    let maxGrade = 0;
    let neutropeniaGrade = 0;

    for (const tox of this.toxicities) {
      if (tox.currentGrade > maxGrade) {
        maxGrade = tox.currentGrade;
      }
      if (tox.toxicityCategory === 'NEUTROPENIA') {
        neutropeniaGrade = tox.currentGrade;
      }
    }

    let isDoseRedReq = false;
    let adjustmentPct = 0;
    let gcsfIndicated = false;

    if (maxGrade >= 4) {
      isDoseRedReq = true;
      adjustmentPct = 50; // 50% dose reduction for Grade 4 organ toxicity
      gcsfIndicated = true;
    } else if (maxGrade === 3) {
      isDoseRedReq = true;
      adjustmentPct = 25; // 25% dose reduction for Grade 3 toxicity
      if (neutropeniaGrade >= 3) gcsfIndicated = true;
    } else if (neutropeniaGrade >= 3) {
      gcsfIndicated = true;
    }

    return {
      patientId: this.patient.patientId,
      calculatedBsaM2: bsa,
      calculatedGfrMlMin: gfr,
      chemotherapyDoses: doses,
      maxToxicityGrade: maxGrade,
      isDoseReductionRequired: isDoseRedReq,
      recommendedDoseAdjustmentPercent: adjustmentPct,
      gcsfProphylaxisIndicated: gcsfIndicated,
    };
  }
}
