import { describe, expect, it } from 'vitest';
import { calculateActualDispense, calculateInitialSchedule } from './prescriptionRules';

const localDate = (year: number, month: number, day: number) => new Date(year, month - 1, day);
const ymd = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

describe('prescription rules', () => {
  it('creates the required 28-day initial schedule', () => {
    const result = calculateInitialSchedule(localDate(2026, 5, 25));
    expect(ymd(result.firstDate)).toEqual([2026, 5, 25]);
    expect(ymd(result.secondDate)).toEqual([2026, 6, 22]);
    expect(ymd(result.thirdDate)).toEqual([2026, 7, 20]);
  });

  it('keeps the original cycle when dispensing early', () => {
    const result = calculateActualDispense(localDate(2026, 6, 22), localDate(2026, 6, 20));
    expect(result.status).toBe('early');
    expect(result.differenceDays).toBe(2);
    expect(ymd(result.nextDispenseDate)).toEqual([2026, 7, 20]);
  });

  it('keeps the cycle when on time', () => {
    const result = calculateActualDispense(localDate(2026, 6, 22), localDate(2026, 6, 22));
    expect(result.status).toBe('on-time');
    expect(ymd(result.nextDispenseDate)).toEqual([2026, 7, 20]);
  });

  it('restarts from the actual date when late', () => {
    const result = calculateActualDispense(localDate(2026, 6, 22), localDate(2026, 6, 25));
    expect(result.status).toBe('late');
    expect(result.differenceDays).toBe(3);
    expect(ymd(result.nextDispenseDate)).toEqual([2026, 7, 23]);
  });

  it.each([
    [localDate(2026, 1, 31), [2026, 2, 28]],
    [localDate(2024, 2, 1), [2024, 2, 29]],
    [localDate(2026, 12, 31), [2027, 1, 28]]
  ])('handles month, leap-year and year boundaries', (first, expected) => {
    expect(ymd(calculateInitialSchedule(first as Date).secondDate)).toEqual(expected);
  });
});
