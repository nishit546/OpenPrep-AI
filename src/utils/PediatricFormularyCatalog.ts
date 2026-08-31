/**
 * Standard Pediatric Formulary Reference Catalog
 * Weight-based dosing guidelines based on Harriet Lane Handbook & Nelson Pediatrics.
 */

export interface PediatricFormularyItem {
  drugName: string;
  indication: string;
  defaultMgPerKgPerDose: number;
  dosesPerDay: number;
  maxAdultSingleDoseMg: number;
  concentrationMgPerMl?: number;
}

export const PEDIATRIC_FORMULARY_CATALOG: PediatricFormularyItem[] = [
  {
    drugName: 'Amoxicillin',
    indication: 'Acute Otitis Media / Pneumonia',
    defaultMgPerKgPerDose: 45,
    dosesPerDay: 2,
    maxAdultSingleDoseMg: 1000,
    concentrationMgPerMl: 80, // 400mg/5mL
  },
  {
    drugName: 'Acetaminophen (Paracetamol)',
    indication: 'Fever / Analgesia',
    defaultMgPerKgPerDose: 15,
    dosesPerDay: 4,
    maxAdultSingleDoseMg: 1000,
    concentrationMgPerMl: 32, // 160mg/5mL
  },
  {
    drugName: 'Ibuprofen',
    indication: 'Inflammation / Fever',
    defaultMgPerKgPerDose: 10,
    dosesPerDay: 3,
    maxAdultSingleDoseMg: 400,
    concentrationMgPerMl: 20, // 100mg/5mL
  },
  {
    drugName: 'Azithromycin',
    indication: 'Community Acquired Pneumonia',
    defaultMgPerKgPerDose: 10,
    dosesPerDay: 1,
    maxAdultSingleDoseMg: 500,
    concentrationMgPerMl: 40, // 200mg/5mL
  },
  {
    drugName: 'Ceftriaxone',
    indication: 'Severe Sepsis / Pediatric Meningitis',
    defaultMgPerKgPerDose: 50,
    dosesPerDay: 2,
    maxAdultSingleDoseMg: 2000,
  },
];

export function getFormularyItem(drugName: string): PediatricFormularyItem | undefined {
  return PEDIATRIC_FORMULARY_CATALOG.find(f => f.drugName.toLowerCase() === drugName.toLowerCase());
}
