import { i18n } from '#i18n';
import { createSection } from '@/features/folders/popup/popup-controls';
import type { BrowserHideFiledSetting } from '@/features/folders/storage/browser-hide-filed.setting';
import { createElement } from '@/features/folders/ui/element';

/** The setting as the options page uses it. */
export type HideFiledControl = Pick<BrowserHideFiledSetting, 'load' | 'save' | 'watch'>;

const SWITCH_ID = 'nfc-hide-filed';
const HINT_ID = 'nfc-hide-filed-hint';

/** A rendered section that listens to storage until stopped. */
export type LiveSection = { readonly element: HTMLElement; stop(): void };

/**
 * Builds the "Display" section: a switch bound to the "hide filed conversations" setting (on:
 * hidden from claude.ai's lists, off: dimmed). It follows changes made in other tabs too.
 * @param params.document - The owner document.
 * @param params.setting - The stored setting.
 * @returns The section, and a function that stops watching the setting.
 */
export function displaySection(params: {
  document: Document;
  setting: HideFiledControl;
}): LiveSection {
  const { document, setting } = params;
  const input = createElement({
    document,
    tag: 'input',
    className: 'nfc-switch',
    attributes: { id: SWITCH_ID, type: 'checkbox', role: 'switch', 'aria-describedby': HINT_ID },
  });
  input.disabled = true;
  const show = (hideFiled: boolean) => {
    input.checked = hideFiled;
    input.disabled = false;
  };
  input.addEventListener('change', () => {
    void setting.save(input.checked);
  });
  const stop = setting.watch(show);
  void setting.load().then(show);
  const row = createElement({
    document,
    tag: 'div',
    className: 'nfc-switch-row',
    children: [
      createElement({
        document,
        tag: 'div',
        className: 'nfc-switch-text',
        children: [
          createElement({
            document,
            tag: 'label',
            className: 'nfc-switch-label',
            attributes: { for: SWITCH_ID },
            children: [i18n.t('hideFiledLabel')],
          }),
          createElement({
            document,
            tag: 'p',
            className: 'nfc-muted',
            attributes: { id: HINT_ID },
            children: [i18n.t('hideFiledHint')],
          }),
        ],
      }),
      input,
    ],
  });
  return {
    element: createSection({
      document,
      id: 'nfc-display-title',
      title: i18n.t('sectionDisplayTitle'),
      description: null,
      danger: false,
      children: [row],
    }),
    stop,
  };
}
