import { describe, expect, it } from 'vitest';
import { formatDate, getErrorMessage } from './utils';

describe('formatDate', () => {
  it('formats a valid ISO date', () => {
    expect(formatDate('2026-08-24T12:00:00.000Z')).toMatch(/Aug/);
  });

  it('returns an empty string for invalid values', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('getErrorMessage', () => {
  it('prefers the API error payload', () => {
    expect(getErrorMessage({ response: { data: { error: 'Title is required' } } })).toBe(
      'Title is required',
    );
  });

  it('explains a network failure', () => {
    expect(getErrorMessage({ message: 'Network Error' })).toMatch(/Cannot reach backend/);
  });
});
