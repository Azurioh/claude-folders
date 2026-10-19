// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  DARK_PANEL_BACKGROUND,
  LIGHT_PANEL_BACKGROUND,
  opaqueBackground,
  panelThemeOf,
} from '@/features/folders/ui/panel-theme';

const LIGHT_TEXT = 'rgb(240, 240, 240)';
const DARK_TEXT = 'rgb(20, 20, 20)';

describe('opaqueBackground', () => {
  it('takes the first fully opaque background of the chain', () => {
    expect(
      opaqueBackground({
        backgrounds: [
          'rgba(0, 0, 0, 0)',
          'rgba(255, 255, 255, 0.05)',
          'oklch(0.3 0 0 / 50%)',
          'rgb(1 2 3 / none)',
          'oklch(0.21 0.01 250)',
          'rgb(9, 9, 9)',
        ],
        textColor: LIGHT_TEXT,
      }),
    ).toBe('oklch(0.21 0.01 250)');
  });

  it('accepts an explicit alpha of 1, in every syntax', () => {
    for (const color of ['rgba(1, 2, 3, 1)', 'rgb(1 2 3 / 100%)', 'color(srgb 0 0 0 / 1)']) {
      expect(opaqueBackground({ backgrounds: [color], textColor: LIGHT_TEXT })).toBe(color);
    }
  });

  it('skips colors it cannot read', () => {
    expect(
      opaqueBackground({ backgrounds: ['', 'currentcolor', 'rgb(5, 5, 5)'], textColor: DARK_TEXT }),
    ).toBe('rgb(5, 5, 5)');
  });

  it('falls back to a dark background behind light text', () => {
    expect(
      opaqueBackground({
        backgrounds: ['transparent', 'rgba(0, 0, 0, 0.5)'],
        textColor: LIGHT_TEXT,
      }),
    ).toBe(DARK_PANEL_BACKGROUND);
  });

  it('falls back to a light background behind dark text', () => {
    expect(opaqueBackground({ backgrounds: ['transparent'], textColor: DARK_TEXT })).toBe(
      LIGHT_PANEL_BACKGROUND,
    );
  });

  it('falls back to a dark background when the text color cannot be read', () => {
    expect(opaqueBackground({ backgrounds: [], textColor: 'oklch(0.2 0 0)' })).toBe(
      DARK_PANEL_BACKGROUND,
    );
  });
});

describe('panelThemeOf', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    document.body.style.backgroundColor = '';
    document.documentElement.style.backgroundColor = '';
  });

  function anchorIn(params: { outer: string; inner: string }): HTMLElement {
    const outer = document.createElement('div');
    outer.style.backgroundColor = params.outer;
    const inner = document.createElement('div');
    inner.style.backgroundColor = params.inner;
    const anchor = document.createElement('button');
    anchor.style.color = 'rgb(10, 20, 30)';
    inner.append(anchor);
    outer.append(inner);
    document.body.append(outer);
    return anchor;
  }

  it('takes the first opaque ancestor background and the anchor text color', () => {
    const anchor = anchorIn({ outer: 'rgb(1, 2, 3)', inner: 'rgba(9, 9, 9, 0.05)' });

    const theme = panelThemeOf(anchor);

    expect(theme.background).toBe('rgb(1, 2, 3)');
    expect(theme.color).toBe('rgb(10, 20, 30)');
  });

  it('falls back to the body, then the root element background', () => {
    const anchor = anchorIn({ outer: 'transparent', inner: 'rgba(0, 0, 0, 0.5)' });
    document.documentElement.style.backgroundColor = 'rgb(7, 7, 7)';
    expect(panelThemeOf(anchor).background).toBe('rgb(7, 7, 7)');

    document.body.style.backgroundColor = 'rgb(4, 5, 6)';
    expect(panelThemeOf(anchor).background).toBe('rgb(4, 5, 6)');
  });

  it('picks a constant matching the text when nothing is opaque', () => {
    const anchor = anchorIn({ outer: 'transparent', inner: 'transparent' });

    expect(panelThemeOf(anchor).background).toBe(LIGHT_PANEL_BACKGROUND);
  });
});
