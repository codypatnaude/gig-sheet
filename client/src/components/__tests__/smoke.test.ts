import { describe, it, expect } from 'vitest';

describe('client smoke test', () => {
  it('vitest + jsdom is configured correctly', () => {
    expect(1 + 1).toBe(2);
    // Verify jsdom environment
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
  });
});
