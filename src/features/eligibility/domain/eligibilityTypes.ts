export type EligibilityStatus = 'eligible' | 'not-eligible' | 'insufficient-data' | 'refer';
export type TriState = 'yes' | 'no' | 'unknown';

export interface ClinicalAdvisory {
  code: string;
  severity: 'info' | 'warning' | 'important';
  message: string;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: string[];
  missingFields: string[];
  advisories: ClinicalAdvisory[];
}

export interface EligibilityInputState {
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
  dialysis: TriState;
  vpnConfirmed: boolean;
  dmDiagnosis: TriState;
  dmVisits: TriState;
  dmPrimaryDiagnosis: TriState;
  dmClosedWithinYear: TriState;
  egfr: number | null;
  uacr: number | null;
  upcr: number | null;
  ckdRecentVisit: TriState;
  ckdPrimaryDiagnosis: TriState;
}
