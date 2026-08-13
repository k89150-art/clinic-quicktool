import type { EligibilityResult, EligibilityStatus, TriState } from './eligibilityTypes';

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

export function getCkdStage(egfr: number | null): CkdStage | null {
  if (egfr === null) return null;
  if (egfr >= 90) return 'G1';
  if (egfr >= 60) return 'G2';
  if (egfr >= 45) return 'G3a';
  if (egfr >= 30) return 'G3b';
  if (egfr >= 15) return 'G4';
  return 'G5';
}

export function evaluateCkdEligibility(input: CkdInput): CkdEligibilityResult {
  const stage = getCkdStage(input.egfr);
  if (input.egfr === null) return { status: 'insufficient-data', reasons: [], missingFields: ['eGFR'], stage };

  const preEsrd = input.egfr < 45 || (input.upcr !== null && input.upcr >= 1000);
  if (preEsrd) return { status: 'refer', reasons: ['建議評估 Pre-ESRD 照護方案'], missingFields: [], stage };

  const missingFields: string[] = [];
  let renalStatus: EligibilityStatus = 'eligible';
  if (stage === 'G1' || stage === 'G2') {
    if (input.uacr === null && input.upcr === null) {
      renalStatus = 'insufficient-data';
      missingFields.push('UACR 或 UPCR');
    } else if (!((input.uacr ?? -1) >= 30 || (input.upcr ?? -1) >= 150)) {
      renalStatus = 'not-eligible';
    }
  }

  const renalReasons = stage === 'G1' || stage === 'G2'
    ? renalStatus === 'eligible' ? ['蛋白尿條件符合'] : []
    : ['G3a 腎功能條件符合'];

  if (input.recentVisit === 'unknown') missingFields.push('近 90 天本院就醫');
  if (input.primaryDiagnosis === 'unknown') missingFields.push('本次 CKD 主診斷');
  if (missingFields.length) return { status: 'insufficient-data', reasons: renalReasons, missingFields, stage };
  if (renalStatus === 'not-eligible') return { status: 'not-eligible', reasons: ['未達 UACR／UPCR 蛋白尿條件'], missingFields: [], stage };
  if (input.recentVisit === 'no' || input.primaryDiagnosis === 'no') {
    return { status: 'not-eligible', reasons: [input.recentVisit === 'no' ? '近 90 天未曾於本院就醫' : '本次未以 CKD 為主診斷'], missingFields: [], stage };
  }
  return { status: 'eligible', reasons: [...renalReasons, input.vpnConfirmed ? '符合且已確認系統資格' : '依目前輸入條件符合；尚未確認 VPN／收案系統資格'], missingFields: [], stage };
}
