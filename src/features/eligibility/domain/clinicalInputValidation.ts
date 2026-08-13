export type ClinicalNumberValidation =
  | { kind: 'missing' }
  | { kind: 'invalid' }
  | { kind: 'valid'; value: number };

export function validateClinicalNumber(value: unknown): ClinicalNumberValidation {
  if (value === null || value === undefined || value === '') return { kind: 'missing' };
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return { kind: 'invalid' };
  return { kind: 'valid', value };
}

export function clinicalValue(value: unknown): number | null {
  const validation = validateClinicalNumber(value);
  return validation.kind === 'valid' ? validation.value : null;
}

export function clinicalFieldIssue(field: string, value: unknown): string | null {
  const validation = validateClinicalNumber(value);
  if (validation.kind === 'missing') return field;
  if (validation.kind === 'invalid') return `${field}（數值無效）`;
  return null;
}

export function vpnQualificationReasons(confirmed: boolean | undefined): string[] {
  return [
    '依目前輸入條件符合',
    confirmed ? 'VPN／收案系統資格已人工確認' : '尚未確認 VPN／收案系統資格'
  ];
}
