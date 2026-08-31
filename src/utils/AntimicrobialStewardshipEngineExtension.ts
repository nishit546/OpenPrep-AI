  /**
   * Evaluates pathogen susceptibility against renal dosing risk factors.
   */
  public evaluateRenalDosingAlerts(): string[] {
    const alerts: string[] = [];
    for (const iso of this.isolates) {
      for (const panel of iso.susceptibilityPanel) {
        if (panel.breakpointInterpretation === 'SUSCEPTIBLE' && panel.micValueUgMl > 16) {
          alerts.push(`High MIC (${panel.micValueUgMl} ug/mL) for ${panel.antibioticName} in isolate ${iso.isolateId}. Monitor trough concentration.`);
        }
      }
    }
    return alerts;
  }
