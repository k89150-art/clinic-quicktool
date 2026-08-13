import { describe, expect, it } from 'vitest';
import { isValidLocalDate, parseLocalDateInput, parseQuickMonthDay, toDateInputValue } from './dateInput';

describe('date input parsing', () => {
  it('returns null for blank and incomplete manual dates', () => {
    expect(parseLocalDateInput('')).toBeNull();
    expect(parseLocalDateInput('2026-02')).toBeNull();
  });

  it.each(['2026-02-30', '2026-00-10', '2026-13-01', '2026-04-31', '0000-01-01'])('rejects invalid year/month/day: %s', (value) => {
    expect(parseLocalDateInput(value)).toBeNull();
  });

  it('accepts a valid leap date as a local calendar date', () => {
    const date = parseLocalDateInput('2024-02-29');
    expect(date && [date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([2024, 2, 29]);
  });

  it.each(['1', '12'])('keeps partial quick input invalid without creating a Date: %s', (value) => {
    expect(parseQuickMonthDay(value, 2026)).toBeNull();
  });

  it('accepts supported 3 and 4 digit quick dates', () => {
    expect(toDateInputValue(parseQuickMonthDay('525', 2026))).toBe('2026-05-25');
    expect(toDateInputValue(parseQuickMonthDay('1025', 2026))).toBe('2026-10-25');
  });

  it.each(['230', '0230', '0001', '1331'])('rejects nonexistent quick dates: %s', (value) => {
    expect(parseQuickMonthDay(value, 2026)).toBeNull();
  });

  it('never formats null or invalid Date', () => {
    expect(toDateInputValue(null)).toBe('');
    expect(toDateInputValue(new Date(Number.NaN))).toBe('');
    expect(isValidLocalDate(new Date(Number.NaN))).toBe(false);
  });
});
