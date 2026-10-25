import { describe, it, expect } from 'vitest';
import { formatDisplayDate, toInputDate } from '../utils/date';

describe('Date formatting utilities', () => {
  it('formats ISO date to human readable format (Month Day, Year)', () => {
    const formatted = formatDisplayDate('2022-09-20T00:00:00.000Z');
    expect(formatted).toBe('September 20, 2022');
  });

  it('formats Date object to human readable format', () => {
    const d = new Date(Date.UTC(2022, 9, 10)); // October 10, 2022
    const formatted = formatDisplayDate(d);
    expect(formatted).toBe('October 10, 2022');
  });

  it('converts date to input format YYYY-MM-DD', () => {
    const d = new Date('2022-11-01T12:00:00.000Z');
    expect(toInputDate(d)).toBe('2022-11-01');
  });

  it('handles null/undefined gracefully for toInputDate', () => {
    expect(toInputDate(null)).toBe('');
    expect(toInputDate(undefined)).toBe('');
  });
});
