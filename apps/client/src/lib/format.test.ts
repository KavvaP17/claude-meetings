import { describe, expect, it } from 'vitest';
import { formatFileSize } from './format';

describe('formatFileSize', () => {
  it('formats sub-KB sizes in bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats KB just above the byte boundary', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });

  it('formats MB', () => {
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });

  it('formats GB and stops scaling past it', () => {
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
  });
});
