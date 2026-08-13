import type { EligibilityResult, TriState } from './eligibilityTypes';
import { vpnQualificationReasons } from './clinicalInputValidation';

export interface DiabetesInput {
  diagnosisE08ToE13: TriState;
  visitsWithin90DaysAtLeastTwo: TriState;
  primaryDiagnosis: TriState;
  closedWithinPastYear: TriState;
  vpnConfirmed?: boolean;
}

export function evaluateDiabetesEligibility(input: DiabetesInput): EligibilityResult {
  const reasons: string[] = [];
  const missingFields: string[] = [];

  if (input.diagnosisE08ToE13 === 'no') reasons.push('無 E08–E13 糖尿病診斷');
  if (input.visitsWithin90DaysAtLeastTwo === 'no') reasons.push('近 90 天本院糖尿病就醫未達 2 次');
  if (input.primaryDiagnosis === 'no') reasons.push('本次未以 DM 為主診斷');
  if (input.closedWithinPastYear === 'yes') reasons.push('同院所結案後一年內不得重新收案');

  if (input.diagnosisE08ToE13 === 'unknown') missingFields.push('E08–E13 糖尿病診斷');
  if (input.visitsWithin90DaysAtLeastTwo === 'unknown') missingFields.push('近 90 天本院就醫次數');
  if (input.primaryDiagnosis === 'unknown') missingFields.push('本次 DM 主診斷');
  if (input.closedWithinPastYear === 'unknown') missingFields.push('過去一年結案狀態');

  if (reasons.length) return { status: 'not-eligible', reasons, missingFields, advisories: [] };
  if (missingFields.length) return { status: 'insufficient-data', reasons: [], missingFields, advisories: [] };
  return {
    status: 'eligible',
    reasons: vpnQualificationReasons(input.vpnConfirmed),
    missingFields: [],
    advisories: []
  };
}
