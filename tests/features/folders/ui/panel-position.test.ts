import { describe, expect, it } from 'vitest';
import { panelPosition } from '@/features/folders/ui/panel-position';

const VIEWPORT = { width: 1000, height: 800 };
const PANEL = { width: 252, height: 200 };

function anchor(params: { top: number; left: number }) {
  return { top: params.top, bottom: params.top + 30, left: params.left };
}

describe('panelPosition', () => {
  it('places the panel 6px under its anchor, aligned on its left edge', () => {
    expect(
      panelPosition({ anchor: anchor({ top: 100, left: 40 }), panel: PANEL, viewport: VIEWPORT }),
    ).toEqual({ top: 136, left: 40 });
  });

  it('flips the panel above its anchor when it would overflow the viewport bottom', () => {
    expect(
      panelPosition({ anchor: anchor({ top: 700, left: 40 }), panel: PANEL, viewport: VIEWPORT }),
    ).toEqual({ top: 494, left: 40 });
  });

  it('keeps the panel 8px inside the right edge', () => {
    expect(
      panelPosition({ anchor: anchor({ top: 100, left: 900 }), panel: PANEL, viewport: VIEWPORT }),
    ).toEqual({ top: 136, left: 740 });
  });

  it('keeps the panel 8px inside the top and left edges when there is no room', () => {
    expect(
      panelPosition({
        anchor: anchor({ top: 100, left: -20 }),
        panel: { width: 252, height: 790 },
        viewport: VIEWPORT,
      }),
    ).toEqual({ top: 8, left: 8 });
  });
});
