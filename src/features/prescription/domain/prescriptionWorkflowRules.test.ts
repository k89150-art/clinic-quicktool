import { describe, expect, it } from 'vitest';
import {
  LAB_BEFORE_VISIT_DAYS,
  calculateInitialPrescriptionPlan,
  calculateSecondDispensePlan,
  calculateThirdDispensePlan
} from './prescriptionWorkflowRules';

const d = (year: number, month: number, day: number) => new Date(year, month - 1, day);
const ymd = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

describe('prescription workflow rules', () => {
  it('creates the new-prescription lab and follow-up plan', () => {
    const result = calculateInitialPrescriptionPlan(d(2026, 5, 25))!;
    expect(ymd(result.scheduledSecondDate)).toEqual([2026, 6, 22]);
    expect(ymd(result.scheduledThirdDate)).toEqual([2026, 7, 20]);
    expect(ymd(result.followUpDate)).toEqual([2026, 8, 17]);
    expect(ymd(result.labDate)).toEqual([2026, 8, 10]);
    expect(LAB_BEFORE_VISIT_DAYS).toBe(7);
  });

  it('keeps the original cycle when the second dispense is early', () => {
    const result = calculateSecondDispensePlan({ lastVisitDate: d(2026, 5, 25), actualSecondDate: d(2026, 6, 20) })!;
    expect(result.dispense.status).toBe('early');
    expect(result.dispense.differenceDays).toBe(2);
    expect(ymd(result.timeline.scheduledThirdDate)).toEqual([2026, 7, 20]);
    expect(ymd(result.timeline.followUpDate)).toEqual([2026, 8, 17]);
    expect(ymd(result.timeline.labDate)).toEqual([2026, 8, 10]);
  });

  it('restarts the cycle when the second dispense is late', () => {
    const result = calculateSecondDispensePlan({ lastVisitDate: d(2026, 5, 25), actualSecondDate: d(2026, 6, 25) })!;
    expect(result.dispense.status).toBe('late');
    expect(result.dispense.differenceDays).toBe(3);
    expect(ymd(result.timeline.scheduledThirdDate)).toEqual([2026, 7, 23]);
    expect(ymd(result.timeline.followUpDate)).toEqual([2026, 8, 20]);
    expect(ymd(result.timeline.labDate)).toEqual([2026, 8, 13]);
  });

  it('keeps the original cycle when the second dispense is on time', () => {
    const result = calculateSecondDispensePlan({ lastVisitDate: d(2026, 5, 25), actualSecondDate: d(2026, 6, 22) })!;
    expect(result.dispense.status).toBe('on-time');
    expect(result.dispense.differenceDays).toBe(0);
    expect(ymd(result.timeline.scheduledThirdDate)).toEqual([2026, 7, 20]);
    expect(ymd(result.timeline.followUpDate)).toEqual([2026, 8, 17]);
  });

  it('keeps the original follow-up when the third dispense is on time', () => {
    const result = calculateThirdDispensePlan({ lastVisitDate: d(2026, 5, 25), actualThirdDate: d(2026, 7, 20), secondWasDelayed: false })!;
    expect(result.dispense.status).toBe('on-time');
    expect(ymd(result.timeline.followUpDate)).toEqual([2026, 8, 17]);
    expect(ymd(result.timeline.labDate)).toEqual([2026, 8, 10]);
  });

  it('restarts the follow-up cycle when the third dispense is late', () => {
    const result = calculateThirdDispensePlan({ lastVisitDate: d(2026, 5, 25), actualThirdDate: d(2026, 7, 23), secondWasDelayed: false })!;
    expect(result.dispense.status).toBe('late');
    expect(ymd(result.timeline.followUpDate)).toEqual([2026, 8, 20]);
    expect(ymd(result.timeline.labDate)).toEqual([2026, 8, 13]);
  });

  it('keeps the original follow-up when the third dispense is early', () => {
    const result = calculateThirdDispensePlan({ lastVisitDate: d(2026, 5, 25), actualThirdDate: d(2026, 7, 18), secondWasDelayed: false })!;
    expect(result.dispense.status).toBe('early');
    expect(result.dispense.differenceDays).toBe(2);
    expect(ymd(result.timeline.followUpDate)).toEqual([2026, 8, 17]);
    expect(ymd(result.timeline.labDate)).toEqual([2026, 8, 10]);
  });

  it('derives the third schedule from a delayed second dispense', () => {
    const result = calculateThirdDispensePlan({
      lastVisitDate: d(2026, 5, 25), actualSecondDate: d(2026, 6, 25),
      actualThirdDate: d(2026, 7, 23), secondWasDelayed: true
    })!;
    expect(ymd(result.timeline.scheduledThirdDate)).toEqual([2026, 7, 23]);
    expect(result.dispense.status).toBe('on-time');
    expect(ymd(result.timeline.followUpDate)).toEqual([2026, 8, 20]);
    expect(ymd(result.timeline.labDate)).toEqual([2026, 8, 13]);
  });

  it('handles an additional third-dispense delay after a delayed second dispense', () => {
    const result = calculateThirdDispensePlan({
      lastVisitDate: d(2026, 5, 25), actualSecondDate: d(2026, 6, 25),
      actualThirdDate: d(2026, 7, 25), secondWasDelayed: true
    })!;
    expect(result.dispense.status).toBe('late');
    expect(result.dispense.differenceDays).toBe(2);
    expect(ymd(result.timeline.followUpDate)).toEqual([2026, 8, 22]);
    expect(ymd(result.timeline.labDate)).toEqual([2026, 8, 15]);
  });

  it.each([
    [d(2026, 1, 31), [2026, 4, 25]],
    [d(2024, 1, 1), [2024, 3, 25]],
    [d(2026, 12, 1), [2027, 2, 23]]
  ])('handles month, leap-year, and year boundaries', (visit, expectedFollowUp) => {
    expect(ymd(calculateInitialPrescriptionPlan(visit as Date)!.followUpDate)).toEqual(expectedFollowUp);
  });

  it('returns null for missing or invalid required dates', () => {
    const invalid = new Date(Number.NaN);
    expect(calculateInitialPrescriptionPlan(null)).toBeNull();
    expect(calculateInitialPrescriptionPlan(invalid)).toBeNull();
    expect(calculateSecondDispensePlan({ lastVisitDate: d(2026, 5, 25), actualSecondDate: null })).toBeNull();
    expect(calculateThirdDispensePlan({ lastVisitDate: d(2026, 5, 25), actualThirdDate: d(2026, 7, 23), secondWasDelayed: true })).toBeNull();
    expect(calculateThirdDispensePlan({ lastVisitDate: invalid, actualThirdDate: d(2026, 7, 23), secondWasDelayed: false })).toBeNull();
  });
});
