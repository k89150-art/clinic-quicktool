export const RULE_VERSIONS = {
  dmCkdDkd: {
    authority: '衛生福利部中央健康保險署',
    effectiveDate: '2026-04-01',
    rocDate: '115/04/01'
  },
  metabolic: {
    authority: '衛生福利部國民健康署',
    year: 2026,
    rocYear: 115
  }
} as const;

export const METABOLIC_RULE_VERSION = {
  name: '代謝症候群防治計畫',
  ...RULE_VERSIONS.metabolic
} as const;
