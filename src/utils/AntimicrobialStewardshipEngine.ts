/**
 * Antimicrobial Stewardship & Clinical Antibiogram Analytics Engine
 * Evaluates pathogen susceptibility profiles, MIC breakpoints (CLSI M100 standard),
 * multi-drug resistance (MDR/XDR) classification, and optimal empiric regimen recommendations.
 */

export interface PathogenIsolateRecord {
  isolateId: string;
  patientId: string;
  specimenSource: 'BLOOD' | 'URINE' | 'SPUTUM' | 'WOUND_DRAINAGE';
  organismName: string; // e.g., 'Pseudomonas aeruginosa', 'Staphylococcus aureus'
  gramStain: 'GRAM_POSITIVE' | 'GRAM_NEGATIVE';
  susceptibilityPanel: {
    antibioticName: string;
    micValueUgMl: number;
    breakpointInterpretation: 'SUSCEPTIBLE' | 'INTERMEDIATE' | 'RESISTANT';
  }[];
  isolatedAt: string;
}

export interface AntibiogramSummaryRow {
  organismName: string;
  totalIsolatesCount: number;
  antibioticSusceptibilityRates: {
    antibioticName: string;
    susceptiblePercent: number;
    totalTested: number;
  }[];
}

export interface PathogenResistanceEvaluation {
  isolateId: string;
  organismName: string;
  resistanceCategory: 'SENSITIVE' | 'MULTI_DRUG_RESISTANT' | 'EXTENSIVELY_DRUG_RESISTANT' | 'PANDRUG_RESISTANT';
  activeAntibioticsCount: number;
  recommendedEmpiricRegimen: string;
}

export class AntimicrobialStewardshipEngine {
  private isolates: PathogenIsolateRecord[];

  constructor(initialIsolates: PathogenIsolateRecord[] = []) {
    this.isolates = initialIsolates;
  }

  /**
   * Adds a new microbiological isolate record.
   */
  public addIsolateRecord(record: PathogenIsolateRecord): void {
    this.isolates.push(record);
  }

  /**
   * Generates facility Cumulative Antibiogram summary for clinical infection control.
   */
  public generateCumulativeAntibiogram(): AntibiogramSummaryRow[] {
    const organismMap: Record<string, PathogenIsolateRecord[]> = {};

    for (const iso of this.isolates) {
      if (!organismMap[iso.organismName]) {
        organismMap[iso.organismName] = [];
      }
      organismMap[iso.organismName].push(iso);
    }

    const antibiogram: AntibiogramSummaryRow[] = [];

    for (const [organism, records] of Object.entries(organismMap)) {
      const drugStats: Record<string, { susceptible: number; tested: number }> = {};

      for (const rec of records) {
        for (const panel of rec.susceptibilityPanel) {
          if (!drugStats[panel.antibioticName]) {
            drugStats[panel.antibioticName] = { susceptible: 0, tested: 0 };
          }
          drugStats[panel.antibioticName].tested += 1;
          if (panel.breakpointInterpretation === 'SUSCEPTIBLE') {
            drugStats[panel.antibioticName].susceptible += 1;
          }
        }
      }

      const rates = Object.entries(drugStats).map(([drug, stats]) => ({
        antibioticName: drug,
        susceptiblePercent: Math.round((stats.susceptible / stats.tested) * 100),
        totalTested: stats.tested,
      }));

      antibiogram.push({
        organismName: organism,
        totalIsolatesCount: records.length,
        antibioticSusceptibilityRates: rates,
      });
    }

    return antibiogram;
  }

  /**
   * Classifies an isolate under CDC/ECDC Multi-Drug Resistance (MDR/XDR) criteria.
   */
  public evaluateIsolateResistance(isolateId: string): PathogenResistanceEvaluation | null {
    const iso = this.isolates.find(i => i.isolateId === isolateId);
    if (!iso) return null;

    let resistantCount = 0;
    let susceptibleCount = 0;

    for (const panel of iso.susceptibilityPanel) {
      if (panel.breakpointInterpretation === 'RESISTANT') {
        resistantCount++;
      } else if (panel.breakpointInterpretation === 'SUSCEPTIBLE') {
        susceptibleCount++;
      }
    }

    const totalTested = iso.susceptibilityPanel.length;
    let category: PathogenResistanceEvaluation['resistanceCategory'] = 'SENSITIVE';
    let recommendation = 'Standard first-line target therapy based on antibiogram';

    if (resistantCount === totalTested && totalTested > 0) {
      category = 'PANDRUG_RESISTANT';
      recommendation = 'CRITICAL: Infectious Disease Consult Required. Evaluate combination synergy therapy.';
    } else if (resistantCount >= totalTested - 1 && totalTested >= 4) {
      category = 'EXTENSIVELY_DRUG_RESISTANT';
      recommendation = 'Reserve Agents: Colistin / Ceftazidime-Avibactam / Cefiderocol based on MIC';
    } else if (resistantCount >= 3) {
      category = 'MULTI_DRUG_RESISTANT';
      recommendation = 'Broad-spectrum agent tailored to susceptible MIC (e.g. Meropenem / Piperacillin-Tazobactam)';
    }

    return {
      isolateId: iso.isolateId,
      organismName: iso.organismName,
      resistanceCategory: category,
      activeAntibioticsCount: susceptibleCount,
      recommendedEmpiricRegimen: recommendation,
    };
  }
}
