/**
 * Additional Pediatric Clinical Trial & Growth Milestone Reference Standards
 * Standards derived from CDC growth charts and WHO Child Growth Standards.
 */

export interface GrowthMilestoneReference {
  ageMonths: number;
  grossMotorMilestone: string;
  fineMotorMilestone: string;
  languageMilestone: string;
  socialEmotionalMilestone: string;
}

export const PEDIATRIC_MILESTONE_CATALOG: GrowthMilestoneReference[] = [
  {
    ageMonths: 2,
    grossMotorMilestone: 'Holds head up when on tummy',
    fineMotorMilestone: 'Opens hands briefly',
    languageMilestone: 'Coos and makes gurgling sounds',
    socialEmotionalMilestone: 'Smiles at people',
  },
  {
    ageMonths: 6,
    grossMotorMilestone: 'Rolls over front to back',
    fineMotorMilestone: 'Reaches for toys with both hands',
    languageMilestone: 'Babbles with vowels (oh, ah)',
    socialEmotionalMilestone: 'Knows familiar faces',
  },
  {
    ageMonths: 12,
    grossMotorMilestone: 'Pulls up to stand, walks holding furniture',
    fineMotorMilestone: 'Pincer grasp (thumb and index finger)',
    languageMilestone: 'Says "mama" or "dada"',
    socialEmotionalMilestone: 'Plays peek-a-boo',
  },
  {
    ageMonths: 24,
    grossMotorMilestone: 'Kicks a ball, runs smoothly',
    fineMotorMilestone: 'Builds tower of 4+ blocks',
    languageMilestone: '2-4 word sentences',
    socialEmotionalMilestone: 'Parallel play alongside other children',
  },
];

export function getMilestoneByAge(months: number): GrowthMilestoneReference | undefined {
  return PEDIATRIC_MILESTONE_CATALOG.find(m => m.ageMonths === months);
}
