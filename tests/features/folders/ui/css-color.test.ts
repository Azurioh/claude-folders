import { describe, expect, it } from 'vitest';
import { alphaOf, rgbChannelsOf } from '@/features/folders/ui/css-color';

describe('alphaOf', () => {
  it.each([
    ['transparent', 0],
    ['rgb(10, 20, 30)', 1],
    ['rgba(10, 20, 30, 0)', 0],
    ['rgba(10, 20, 30, 0.05)', 0.05],
    ['rgba(10, 20, 30, 50%)', 0.5],
    ['rgba(10, 20, 30, 1)', 1],
    ['hsla(10, 20%, 30%, 0.5)', 0.5],
    ['rgb(10 20 30)', 1],
    ['rgb(10 20 30 / 0)', 0],
    ['rgb(10 20 30 / 0.05)', 0.05],
    ['rgb(10 20 30 / 50%)', 0.5],
    ['rgb(10 20 30 / 1)', 1],
    ['rgb(10 20 30 / none)', 0],
    ['rgb(10% 20% 30%)', 1],
    ['oklch(0.2 0.01 250)', 1],
    ['oklch(0.2 0.01 250 / 0.05)', 0.05],
    ['oklch(0.2 none 250 / 50%)', 0.5],
    ['oklab(0.2 0.01 0.02 / 0)', 0],
    ['oklab(0.2 0.01 0.02)', 1],
    ['lab(20% 1 2 / 1)', 1],
    ['lab(20% 1 2 / none)', 0],
    ['color(srgb 0.1 0.2 0.3 / 0.05)', 0.05],
    ['color(srgb 0.1 0.2 0.3)', 1],
    ['#112233', 1],
    ['#11223380', 128 / 255],
  ])('reads the alpha of %s', (color, alpha) => {
    expect(alphaOf(color)).toBeCloseTo(alpha);
  });

  it.each(['', 'currentcolor', 'rgb(', 'rgba(1, 2)', 'rgb(1 2 3 / nope)'])(
    'cannot read %j',
    (color) => {
      expect(alphaOf(color)).toBeNull();
    },
  );
});

describe('rgbChannelsOf', () => {
  it.each([
    ['rgb(10, 20, 30)', [10, 20, 30]],
    ['rgba(10, 20, 30, 0.5)', [10, 20, 30]],
    ['rgb(10 20 30 / 50%)', [10, 20, 30]],
    ['rgb(100% 0% 50%)', [255, 0, 127.5]],
    ['rgb(none 20 30)', [0, 20, 30]],
  ])('reads the channels of %s', (color, channels) => {
    expect(rgbChannelsOf(color)).toEqual(channels);
  });

  it.each(['oklch(0.9 0 0)', 'transparent', 'rgb(1, 2)'])('cannot read %s', (color) => {
    expect(rgbChannelsOf(color)).toBeNull();
  });
});
