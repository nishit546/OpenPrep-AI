/**
 * Clinical Anesthesia Airway & Pharmacology Reference Data Catalog
 * Standardized guidelines from ASA (American Society of Anesthesiologists).
 */

export interface AirwayClassificationMeta {
  mallampatiClass: number;
  description: string;
  visibilityStructures: string;
  intubationDifficultyRisk: 'MINIMAL' | 'MODERATE' | 'SEVERE' | 'EXTREME';
}

export const MALLAMPATI_REFERENCE_CATALOG: AirwayClassificationMeta[] = [
  {
    mallampatiClass: 1,
    description: 'Full visibility of soft palate, fauces, uvula, and pillars',
    visibilityStructures: 'Soft palate, fauces, uvula, anterior/posterior pillars',
    intubationDifficultyRisk: 'MINIMAL',
  },
  {
    mallampatiClass: 2,
    description: 'Visibility of soft palate, fauces, and portion of uvula',
    visibilityStructures: 'Soft palate, fauces, portion of uvula',
    intubationDifficultyRisk: 'MODERATE',
  },
  {
    mallampatiClass: 3,
    description: 'Soft palate and base of uvula visible',
    visibilityStructures: 'Soft palate, base of uvula',
    intubationDifficultyRisk: 'SEVERE',
  },
  {
    mallampatiClass: 4,
    description: 'Hard palate only visible',
    visibilityStructures: 'Hard palate only',
    intubationDifficultyRisk: 'EXTREME',
  },
];

export function getMallampatiMeta(classNum: number): AirwayClassificationMeta | undefined {
  return MALLAMPATI_REFERENCE_CATALOG.find(m => m.mallampatiClass === classNum);
}
