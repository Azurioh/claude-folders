// @vitest-environment happy-dom

import {
  createPanelLayer,
  focusedInLayer,
  pressKey,
  pressPointer,
} from '@@/tests/features/folders/ui/test-doubles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from '@/features/folders/ui/element';
import { FloatingPanels, type PanelControls } from '@/features/folders/ui/floating-panel';

function anchorButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.style.color = 'rgb(200, 200, 200)';
  const surface = document.createElement('div');
  surface.style.backgroundColor = 'rgb(30, 30, 30)';
  surface.append(button);
  document.body.append(surface);
  return button;
}

function openSample(params: {
  panels: FloatingPanels;
  anchor: HTMLElement;
  restoreFocus?: () => void;
}): { input: HTMLInputElement; controls: () => PanelControls } {
  let captured: PanelControls | null = null;
  const input = createElement({ document, tag: 'input', className: 'nfc-input' });
  params.panels.open({
    anchor: params.anchor,
    title: 'Sample panel',
    restoreFocus: params.restoreFocus ?? vi.fn(),
    render: (controls) => {
      captured = controls;
      return { body: [input], initialFocus: input };
    },
  });
  return {
    input,
    controls: () => {
      if (captured === null) {
        throw new Error('The panel was not rendered');
      }
      return captured;
    },
  };
}

function dialogs(layer: HTMLElement): HTMLElement[] {
  return [...layer.querySelectorAll<HTMLElement>('[role="dialog"]')];
}

describe('FloatingPanels', () => {
  let layer: HTMLElement;
  let panels: FloatingPanels;

  beforeEach(() => {
    document.body.replaceChildren();
    layer = createPanelLayer();
    panels = new FloatingPanels(layer);
  });

  it('renders a dialog named by its title in the layer, and focuses its first field', () => {
    const { input } = openSample({ panels, anchor: anchorButton() });

    const [dialog] = dialogs(layer);
    const labelId = dialog?.getAttribute('aria-labelledby') ?? '';
    expect(layer.querySelector(`#${labelId}`)?.textContent).toBe('Sample panel');
    expect(dialog?.contains(input)).toBe(true);
    expect(focusedInLayer(layer)).toBe(input);
  });

  it("copies the page's background and text color around the anchor", () => {
    openSample({ panels, anchor: anchorButton() });

    const [dialog] = dialogs(layer);
    expect(dialog?.style.backgroundColor).toBe('rgb(30, 30, 30)');
    expect(dialog?.style.color).toBe('rgb(200, 200, 200)');
  });

  it('closes on Escape and gives focus back', () => {
    const restoreFocus = vi.fn();
    const { input } = openSample({ panels, anchor: anchorButton(), restoreFocus });

    pressKey({ target: input, key: 'Escape' });

    expect(dialogs(layer)).toHaveLength(0);
    expect(restoreFocus).toHaveBeenCalledTimes(1);
  });

  it('closes on a pointer press outside of it, leaving focus where the user pressed', () => {
    const restoreFocus = vi.fn();
    openSample({ panels, anchor: anchorButton(), restoreFocus });

    pressPointer(document.body);

    expect(dialogs(layer)).toHaveLength(0);
    expect(restoreFocus).not.toHaveBeenCalled();
  });

  it('stays open on a pointer press inside of it', () => {
    const { input } = openSample({ panels, anchor: anchorButton() });

    pressPointer(input);

    expect(dialogs(layer)).toHaveLength(1);
  });

  it('gives focus back when its content closes it', () => {
    const restoreFocus = vi.fn();
    const { controls } = openSample({ panels, anchor: anchorButton(), restoreFocus });

    controls().close();

    expect(dialogs(layer)).toHaveLength(0);
    expect(restoreFocus).toHaveBeenCalledTimes(1);
  });

  it('shows one panel at a time', () => {
    const firstRestore = vi.fn();
    openSample({ panels, anchor: anchorButton(), restoreFocus: firstRestore });

    openSample({ panels, anchor: anchorButton() });

    expect(dialogs(layer)).toHaveLength(1);
    expect(firstRestore).not.toHaveBeenCalled();
  });

  it('stops listening to the page once closed', () => {
    const restoreFocus = vi.fn();
    const { controls } = openSample({ panels, anchor: anchorButton(), restoreFocus });
    controls().close();

    pressPointer(document.body);
    controls().close();

    expect(restoreFocus).toHaveBeenCalledTimes(1);
  });
});
