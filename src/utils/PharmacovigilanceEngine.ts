/**
 * Pharmacovigilance Signal Detection & Adverse Drug Reaction (ADR) Analytics Engine
 * Implements Proportional Reporting Ratio (PRR), Reporting Odds Ratio (ROR), and Bayesian Confidence Propagation Neural Network (BCPNN)
 * disproportionality algorithms for real-time safety surveillance across global clinical prep and pharmaceutical telemetry datasets.
 */

export interface AdverseEventReport {
  reportId: string;
  drugName: string;
  adverseEventTerm: string;
  reactionSeverity: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';
  patientAgeGroup: 'PEDIATRIC' | 'ADULT' | 'GERIATRIC';
  reporterType: 'PHYSICIAN' | 'PHARMACIST' | 'PATIENT';
  reportedAt: string;
  isConfirmedByLab: boolean;
}

export interface DisproportionalityMetrics {
  drugName: string;
  adverseEventTerm: string;
  coOccurrenceCount: number;
  proportionalReportingRatio: number; // PRR
  reportingOddsRatio: number;        // ROR
  informationComponent: number;       // IC from BCPNN
  signalStatus: 'STRONG_SIGNAL' | 'MODERATE_SIGNAL' | 'WEAK_SIGNAL' | 'NO_SIGNAL';
}

export interface DrugSafetyProfile {
  drugName: string;
  totalReportsCount: number;
  topAdverseEvents: { term: string; count: number; prr: number }[];
  highRiskDemographic: string;
  overallSafetyRiskScore: number; // 0 to 100
}

export class PharmacovigilanceEngine {
  private eventReports: AdverseEventReport[];

  constructor(initialReports: AdverseEventReport[] = []) {
    this.eventReports = initialReports;
  }

  /**
   * Submits a new adverse drug reaction safety report.
   */
  public submitEventReport(report: AdverseEventReport): void {
    this.eventReports.push(report);
  }

  /**
   * Calculates 2x2 contingency table components for a specific Drug-AdverseEvent pair.
   * Contingency Table:
   *        | Event + | Event -
   * Drug + |    a    |    b
   * Drug - |    c    |    d
   */
  public calculateContingencyTable(targetDrug: string, targetEvent: string): { a: number; b: number; c: number; d: number } {
    let a = 0, b = 0, c = 0, d = 0;

    for (const r of this.eventReports) {
      const isTargetDrug = r.drugName.toLowerCase() === targetDrug.toLowerCase();
      const isTargetEvent = r.adverseEventTerm.toLowerCase() === targetEvent.toLowerCase();

      if (isTargetDrug && isTargetEvent) a++;
      else if (isTargetDrug && !isTargetEvent) b++;
      else if (!isTargetDrug && isTargetEvent) c++;
      else if (!isTargetDrug && !isTargetEvent) d++;
    }

    return { a, b, c, d };
  }

  /**
   * Computes disproportionality signal metrics (PRR, ROR, IC) for a Drug-Event combination.
   */
  public evaluateSignalMetrics(targetDrug: string, targetEvent: string): DisproportionalityMetrics {
    const { a, b, c, d } = this.calculateContingencyTable(targetDrug, targetEvent);

    if (a === 0) {
      return {
        drugName: targetDrug,
        adverseEventTerm: targetEvent,
        coOccurrenceCount: 0,
        proportionalReportingRatio: 0,
        reportingOddsRatio: 0,
        informationComponent: 0,
        signalStatus: 'NO_SIGNAL',
      };
    }

    // Proportional Reporting Ratio (PRR) = (a / (a + b)) / (c / (c + d))
    const prrNum = a / Math.max(1, a + b);
    const prrDen = c / Math.max(1, c + d);
    const prr = prrDen > 0 ? prrNum / prrDen : prrNum;

    // Reporting Odds Ratio (ROR) = (a * d) / (b * c)
    const rorNum = a * d;
    const rorDen = Math.max(1, b * c);
    const ror = rorNum / rorDen;

    // Bayesian Information Component (IC) approximation = log2((a * (a + b + c + d)) / ((a + b) * (a + c)))
    const N = a + b + c + d;
    const expected = ((a + b) * (a + c)) / Math.max(1, N);
    const ic = Math.log2(a / Math.max(0.1, expected));

    let status: DisproportionalityMetrics['signalStatus'] = 'NO_SIGNAL';
    if (a >= 3 && prr >= 2.0 && ic > 1.0) {
      status = 'STRONG_SIGNAL';
    } else if (a >= 2 && prr >= 1.5 && ic > 0.5) {
      status = 'MODERATE_SIGNAL';
    } else if (prr > 1.0) {
      status = 'WEAK_SIGNAL';
    }

    return {
      drugName: targetDrug,
      adverseEventTerm: targetEvent,
      coOccurrenceCount: a,
      proportionalReportingRatio: Math.round(prr * 100) / 100,
      reportingOddsRatio: Math.round(ror * 100) / 100,
      informationComponent: Math.round(ic * 100) / 100,
      signalStatus: status,
    };
  }

  /**
   * Generates a comprehensive drug safety profile summarizing top adverse signals and risk score.
   */
  public generateDrugSafetyProfile(targetDrug: string): DrugSafetyProfile {
    const drugReports = this.eventReports.filter(
      r => r.drugName.toLowerCase() === targetDrug.toLowerCase()
    );

    const eventCounts: Record<string, number> = {};
    const ageGroupCounts: Record<string, number> = {};
    let severeCount = 0;

    for (const r of drugReports) {
      eventCounts[r.adverseEventTerm] = (eventCounts[r.adverseEventTerm] || 0) + 1;
      ageGroupCounts[r.patientAgeGroup] = (ageGroupCounts[r.patientAgeGroup] || 0) + 1;
      if (r.reactionSeverity === 'SEVERE' || r.reactionSeverity === 'LIFE_THREATENING') {
        severeCount++;
      }
    }

    const topEvents = Object.entries(eventCounts)
      .map(([term, count]) => {
        const metrics = this.evaluateSignalMetrics(targetDrug, term);
        return { term, count, prr: metrics.proportionalReportingRatio };
      })
      .sort((x, y) => y.count - x.count)
      .slice(0, 5);

    let highRiskDemo = 'ADULT';
    let maxDemoCount = 0;
    for (const [demo, cnt] of Object.entries(ageGroupCounts)) {
      if (cnt > maxDemoCount) {
        maxDemoCount = cnt;
        highRiskDemo = demo;
      }
    }

    const severeRatio = drugReports.length > 0 ? severeCount / drugReports.length : 0;
    const riskScore = Math.min(100, Math.round((drugReports.length * 5) + (severeRatio * 50)));

    return {
      drugName: targetDrug,
      totalReportsCount: drugReports.length,
      topAdverseEvents: topEvents,
      highRiskDemographic: highRiskDemo,
      overallSafetyRiskScore: riskScore,
    };
  }
}
