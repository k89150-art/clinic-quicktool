import type { EligibilityResult } from './eligibilityTypes';

export type RiskFactorStatus = 'positive' | 'negative' | 'unknown';

export interface MetabolicInput {
  age: number | null;
  sex: 'male' | 'female' | null;
  waist: number | null;
  bmi: number | null;
  fastingGlucose: number | null;
  sbp: number | null;
  dbp: number | null;
  triglycerides: number | null;
  hdl: number | null;
  glucoseMedication: boolean;
  bloodPressureMedication: boolean;
  triglycerideMedication: boolean;
  hdlMedication: boolean;
  dialysis: 'yes' | 'no' | 'unknown';
  vpnConfirmed: boolean;
}

export interface MetabolicSyndromeResult extends EligibilityResult {
  positiveCount: number;
  negativeCount: number;
  unknownCount: number;
  factors: Record<'obesity' | 'glucose' | 'bloodPressure' | 'triglycerides' | 'hdl', RiskFactorStatus>;
}
