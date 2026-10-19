import { describe, expect, it } from 'vitest';
import { browserLabel } from '@/features/folders/popup/browser-label';

describe('browserLabel', () => {
  const cases: [string, string, string][] = [
    [
      'Firefox',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0',
      'Firefox 131',
    ],
    [
      'Chrome',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.86 Safari/537.36',
      'Chrome 131',
    ],
    [
      'Edge',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.70',
      'Edge 131',
    ],
    [
      'Opera',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0',
      'Opera 115',
    ],
    ['an unknown browser', 'SomethingElse/1.0', 'Unknown browser'],
  ];

  for (const [label, userAgent, expected] of cases) {
    it(`names ${label} with its major version only`, () => {
      expect(browserLabel(userAgent)).toBe(expected);
    });
  }
});
