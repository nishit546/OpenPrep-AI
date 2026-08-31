/**
 * Clinical Antimicrobial Reference Catalog & Empiric Guidance Constants
 * Standards based on CLSI M100 and SANFORD Guide to Antimicrobial Therapy.
 */

export interface AntibioticSpectrumMeta {
  antibioticName: string;
  classCategory: 'PENICILLIN' | 'CEPHALOSPORIN' | 'CARBAPENEM' | 'GLYCOPEPTIDE' | 'FLUOROQUINOLONE' | 'AMINOGLYCOSIDE';
  typicalCoverage: string;
  renalAdjustmentRequired: boolean;
}

export const ANTIBIOTIC_SPECTRUM_CATALOG: AntibioticSpectrumMeta[] = [
  {
    antibioticName: 'Piperacillin-Tazobactam',
    classCategory: 'PENICILLIN',
    typicalCoverage: 'Broad-Spectrum Gram-Negative (Pseudomonas) & Anaerobes',
    renalAdjustmentRequired: true,
  },
  {
    antibioticName: 'Meropenem',
    classCategory: 'CARBAPENEM',
    typicalCoverage: 'Ultra Broad-Spectrum Gram-Negative ESBL & Anaerobes',
    renalAdjustmentRequired: true,
  },
  {
    antibioticName: 'Vancomycin',
    classCategory: 'GLYCOPEPTIDE',
    typicalCoverage: 'Gram-Positive (MRSA & Enterococcus faecalis)',
    renalAdjustmentRequired: true,
  },
  {
    antibioticName: 'Cefepime',
    classCategory: 'CEPHALOSPORIN',
    typicalCoverage: '4th Gen Cephalosporin - Antipseudomonal & Enterobacteriaceae',
    renalAdjustmentRequired: true,
  },
  {
    antibioticName: 'Linezolid',
    classCategory: 'GLYCOPEPTIDE',
    typicalCoverage: 'MRSA & Vancomycin-Resistant Enterococcus (VRE)',
    renalAdjustmentRequired: false,
  },
  {
    antibioticName: 'Ciprofloxacin',
    classCategory: 'FLUOROQUINOLONE',
    typicalCoverage: 'Gram-Negative Aerobes & Atypical Pathogens',
    renalAdjustmentRequired: true,
  },
  {
    antibioticName: 'Gentamicin',
    classCategory: 'AMINOGLYCOSIDE',
    typicalCoverage: 'Synergy Gram-Positive & Serious Gram-Negative Bacilli',
    renalAdjustmentRequired: true,
  },
  {
    antibioticName: 'Ceftazidime-Avibactam',
    classCategory: 'CEPHALOSPORIN',
    typicalCoverage: 'KPC / CRE Carbapenem-Resistant Enterobacteriaceae',
    renalAdjustmentRequired: true,
  },
  {
    antibioticName: 'Colistin (Polymyxin E)',
    classCategory: 'AMINOGLYCOSIDE',
    typicalCoverage: 'MDR / XDR Pseudomonas & Acinetobacter baumannii',
    renalAdjustmentRequired: true,
  },
];

export function getAntibioticMeta(drugName: string): AntibioticSpectrumMeta | undefined {
  return ANTIBIOTIC_SPECTRUM_CATALOG.find(a => a.antibioticName.toLowerCase() === drugName.toLowerCase());
}
