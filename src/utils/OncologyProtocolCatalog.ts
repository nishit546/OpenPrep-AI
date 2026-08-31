/**
 * Clinical Oncology Chemotherapy Protocol Reference Types & Utilities
 * Provides standardized constants and helper utilities for chemotherapy protocol selection.
 */

export interface ChemotherapyProtocolMeta {
  code: string;
  name: string;
  indication: string;
  cycleLengthDays: number;
  emeticRiskLevel: 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL';
}

export const PROTOCOL_CATALOG: ChemotherapyProtocolMeta[] = [
  {
    code: 'AC-T',
    name: 'Doxorubicin + Cyclophosphamide -> Paclitaxel',
    indication: 'Adjuvant / Neoadjuvant Breast Cancer',
    cycleLengthDays: 14,
    emeticRiskLevel: 'HIGH',
  },
  {
    code: 'CARBO-PAC',
    name: 'Carboplatin + Paclitaxel',
    indication: 'Advanced Ovarian & Non-Small Cell Lung Cancer',
    cycleLengthDays: 21,
    emeticRiskLevel: 'MODERATE',
  },
  {
    code: 'FOLFOX6',
    name: 'Oxaliplatin + Leucovorin + 5-Fluorouracil',
    indication: 'Colorectal Carcinoma Stage III/IV',
    cycleLengthDays: 14,
    emeticRiskLevel: 'MODERATE',
  },
  {
    code: 'CIS-PEM',
    name: 'Cisplatin + Pemetrexed',
    indication: 'Nonsquamous Non-Small Cell Lung Cancer',
    cycleLengthDays: 21,
    emeticRiskLevel: 'HIGH',
  },
];

export function getProtocolDetails(code: string): ChemotherapyProtocolMeta | undefined {
  return PROTOCOL_CATALOG.find(p => p.code === code);
}
