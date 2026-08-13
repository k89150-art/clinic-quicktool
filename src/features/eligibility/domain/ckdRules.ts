import type { ClinicalAdvisory, EligibilityResult, EligibilityStatus, TriState } from './eligibilityTypes';
import { clinicalFieldIssue, clinicalValue, validateClinicalNumber, vpnQualificationReasons } from './clinicalInputValidation';

export type CkdStage = 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';

export interface CkdInput {
  egfr: number | null;
  uacr: number | null;
  upcr: number | null;
  recentVisit: TriState;
  primaryDiagnosis: TriState;
  vpnConfirmed?: boolean;
}

export interface CkdEligibilityResult extends EligibilityResult {
  stage: CkdStage | null;
}

export const PRE_ESRD_ADVISORY: ClinicalAdvisory = {
  code: 'PRE_ESRD',
  severity: 'important',
  message: 'CKD：建議評估 Pre-ESRD'
};

export function getCkdStage(egfr: number | null): CkdStage | null {
  const value = clinicalValue(egfr);
  if (value === null) return null;
  if (value >= 90) return 'G1';
  if (value >= 60) return 'G2';
  if (value >= 45) return 'G3a';
  if (value >= 30) return 'G3b';
  if (value >= 15) return 'G4';
  return 'G5';
}

export function evaluateCkdEligibility(input: CkdInput): CkdEligibilityResult {
  const egfr = clinicalValue(input.egfr);
  const stage = getCkdStage(input.egfr);
  if (egfr === null) {
    return {
      status: 'insufficient-data',
      reasons: [],
      missingFields: [clinicalFieldIssue('eGFR', input.egfr)!],
      advisories: [],
      stage
    };
  }

  const uacr = clinicalValue(input.uacr);
  const upcr = clinicalValue(input.upcr);
  const preEsrd = egfr < 45 || (upcr !== null && upcr >= 1000);
  if (preEsrd) {
    return {
      status: 'refer',
      reasons: ['建議評估 Pre-ESRD 照護方案'],
      missingFields: [],
      advisories: [{ ...PRE_ESRD_ADVISORY }],
      stage
    };
  }

  const reasons: string[] = [];
  const missingFields: string[] = [];
  let renalStatus: EligibilityStatus = 'eligible';

  if (stage === 'G1' || stage === 'G2') {
    const uacrValidation = validateClinicalNumber(input.uacr);
    const upcrValidation = validateClinicalNumber(input.upcr);
    const renalPositive = (uacr !== null && uacr >= 30) || (upcr !== null && upcr >= 150);
    const renalInvalid = uacrValidation.kind === 'invalid' || upcrValidation.kind === 'invalid';
    const renalFailure = !renalPositive && !renalInvalid
      && (uacrValidation.kind === 'valid' || upcrValidation.kind === 'valid');

    if (renalPositive) {
      renalStatus = 'eligible';
    } else if (renalFailure) {
      renalStatus = 'not-eligible';
      reasons.push('未達 UACR／UPCR 蛋白尿條件');
    } else {
      renalStatus = 'insufficient-data';
      const uacrIssue = clinicalFieldIssue('UACR', input.uacr);
      const upcrIssue = clinicalFieldIssue('UPCR', input.upcr);
      if (uacrIssue?.includes('數值無效')) missingFields.push(uacrIssue);
      if (upcrIssue?.includes('數值無效')) missingFields.push(upcrIssue);
      if (!missingFields.length) missingFields.push('UACR 或 UPCR');
    }
  }

  if (input.recentVisit === 'no') reasons.push('近 90 天未曾於本院就醫');
  if (input.primaryDiagnosis === 'no') reasons.push('本次未以 CKD 為主診斷');
  if (input.recentVisit === 'unknown') missingFields.push('近 90 天本院就醫');
  if (input.primaryDiagnosis === 'unknown') missingFields.push('本次 CKD 主診斷');

  const renalReasons = stage === 'G1' || stage === 'G2'
    ? renalStatus === 'eligible' ? ['蛋白尿條件符合'] : []
    : ['G3a 腎功能條件符合'];

  if (reasons.length) return { status: 'not-eligible', reasons, missingFields, advisories: [], stage };
  if (missingFields.length) return { status: 'insufficient-data', reasons: renalReasons, missingFields, advisories: [], stage };
  return {
    status: 'eligible',
    reasons: [...renalReasons, ...vpnQualificationReasons(input.vpnConfirmed)],
    missingFields: [],
    advisories: [],
    stage
  };
}
