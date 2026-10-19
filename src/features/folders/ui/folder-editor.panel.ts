import { i18n } from '#i18n';
import type { Folder } from '@/features/folders/domain/folders.model';
import { createElement } from '@/features/folders/ui/element';
import type {
  PanelContent,
  PanelControls,
  PanelRender,
} from '@/features/folders/ui/floating-panel';
import {
  FOLDER_COLORS,
  FOLDER_EMOJI_MAX_LENGTH,
  FOLDER_EMOJIS,
  type FolderColorOption,
} from '@/features/folders/ui/folder-appearance.options';
import { createIcon } from '@/features/folders/ui/icons';
import {
  createPanelLabel,
  createTextInput,
  onEnterKey,
} from '@/features/folders/ui/panel-controls';

const NAME_FIELD_ID = 'nfc-folder-name';
const EMOJI_FIELD_ID = 'nfc-folder-emoji';
const COLOR_LABEL_ID = 'nfc-folder-color';
const EMOJI_DEFAULT_DESCRIPTION_ID = 'nfc-folder-emoji-default';
const ARIA_DESCRIBEDBY = 'aria-describedby';
const DEFAULT_ICON_SIZE = 16;
/** Custom property holding the color painted by a swatch. */
const SWATCH_COLOR_PROPERTY = '--nfc-swatch';

/** Emoji and color of a folder as edited; `null` removes them. */
export interface FolderAppearance {
  readonly emoji: string | null;
  readonly color: string | null;
}

function pressedState(pressed: boolean): string {
  return String(pressed);
}

/**
 * The folder editor: name, emoji (field, grid and "default icon") and color palette. Every change
 * is handed over right away; the selected emoji and swatch are marked with `aria-pressed`.
 */
class FolderEditor {
  private readonly document: Document;
  private readonly onRename: (name: string) => void;
  private readonly onAppearance: (appearance: FolderAppearance) => void;
  private readonly emojiButtons = new Map<string | null, HTMLButtonElement>();
  private readonly swatches = new Map<string | null, HTMLButtonElement>();
  private readonly emojiField: HTMLInputElement;
  private readonly emojiPlaceholder: HTMLElement;
  private appearance: FolderAppearance;

  constructor(params: {
    document: Document;
    folder: Folder;
    onRename: (name: string) => void;
    onAppearance: (appearance: FolderAppearance) => void;
  }) {
    this.document = params.document;
    this.onRename = params.onRename;
    this.onAppearance = params.onAppearance;
    this.appearance = {
      emoji: params.folder.emoji ?? null,
      color: params.folder.color ?? null,
    };
    this.emojiField = createTextInput({
      document: this.document,
      id: EMOJI_FIELD_ID,
      value: this.appearance.emoji ?? '',
      className: 'nfc-emoji-input',
    });
    this.emojiField.maxLength = FOLDER_EMOJI_MAX_LENGTH;
    this.emojiPlaceholder = createElement({
      document: this.document,
      tag: 'span',
      className: 'nfc-emoji-placeholder',
      attributes: { 'aria-hidden': 'true' },
      children: [
        createIcon({
          document: this.document,
          name: 'folder',
          size: DEFAULT_ICON_SIZE,
          className: 'nfc-default-icon',
        }),
      ],
    });
    this.emojiField.addEventListener('input', () => {
      const emoji = this.emojiField.value.trim();
      this.change({ ...this.appearance, emoji: emoji === '' ? null : emoji });
    });
  }

  build(params: { controls: PanelControls; name: string }): PanelContent {
    const { document } = this;
    const nameField = createTextInput({
      document,
      id: NAME_FIELD_ID,
      value: params.name,
      className: '',
    });
    nameField.addEventListener('input', () => {
      this.onRename(nameField.value);
    });
    onEnterKey({
      input: nameField,
      onEnter: () => {
        params.controls.close();
      },
    });
    const body = [
      createPanelLabel({ document, text: i18n.t('fieldName'), forId: NAME_FIELD_ID, id: null }),
      nameField,
      createPanelLabel({ document, text: i18n.t('fieldEmoji'), forId: EMOJI_FIELD_ID, id: null }),
      this.emojiFieldBox(),
      this.emojiGrid(),
      createPanelLabel({ document, text: i18n.t('fieldColor'), forId: null, id: COLOR_LABEL_ID }),
      this.palette(),
    ];
    this.markSelection();
    return { body, initialFocus: nameField };
  }

  /**
   * The emoji field, showing the default folder icon (in the folder's color) while it is empty, so
   * it always shows the folder's current visual; screen readers get the same as a description.
   */
  private emojiFieldBox(): HTMLElement {
    const { document } = this;
    return createElement({
      document,
      tag: 'span',
      className: 'nfc-emoji-field',
      children: [
        this.emojiField,
        this.emojiPlaceholder,
        createElement({
          document,
          tag: 'span',
          className: 'nfc-visually-hidden',
          attributes: { id: EMOJI_DEFAULT_DESCRIPTION_ID },
          children: [i18n.t('emojiDefaultIcon')],
        }),
      ],
    });
  }

  private emojiGrid(): HTMLElement {
    const { document } = this;
    const buttons = FOLDER_EMOJIS.map((emoji) =>
      this.emojiButton({ emoji, label: null, content: emoji }),
    );
    const defaultIcon = this.emojiButton({
      emoji: null,
      label: i18n.t('emojiDefaultIcon'),
      content: createIcon({
        document,
        name: 'folder',
        size: DEFAULT_ICON_SIZE,
        className: 'nfc-default-icon',
      }),
    });
    return createElement({
      document,
      tag: 'div',
      className: 'nfc-emoji-grid',
      attributes: { role: 'group', 'aria-label': i18n.t('fieldEmoji') },
      children: [...buttons, defaultIcon],
    });
  }

  private emojiButton(params: {
    emoji: string | null;
    label: string | null;
    content: Node | string;
  }): HTMLButtonElement {
    const { emoji, label, content } = params;
    const button = createElement({
      document: this.document,
      tag: 'button',
      className: 'nfc-emoji-btn',
      attributes: { type: 'button' },
      children: [content],
    });
    if (label !== null) {
      button.setAttribute('aria-label', label);
      button.title = label;
    }
    button.addEventListener('click', () => {
      this.emojiField.value = emoji ?? '';
      this.change({ ...this.appearance, emoji });
    });
    this.emojiButtons.set(emoji, button);
    return button;
  }

  private palette(): HTMLElement {
    return createElement({
      document: this.document,
      tag: 'div',
      className: 'nfc-palette',
      attributes: { role: 'group', 'aria-labelledby': COLOR_LABEL_ID },
      children: FOLDER_COLORS.map((option) => this.swatch(option)),
    });
  }

  private swatch(option: FolderColorOption): HTMLButtonElement {
    const label = i18n.t(option.name);
    const button = createElement({
      document: this.document,
      tag: 'button',
      className: 'nfc-swatch',
      attributes: { type: 'button', 'aria-label': label, title: label },
      children: [
        createElement({
          document: this.document,
          tag: 'span',
          className: option.value === null ? 'nfc-swatch-dot nfc-swatch-none' : 'nfc-swatch-dot',
          attributes: { 'aria-hidden': 'true' },
        }),
      ],
    });
    if (option.value !== null) {
      button.style.setProperty(SWATCH_COLOR_PROPERTY, option.value);
    }
    button.addEventListener('click', () => {
      this.change({ ...this.appearance, color: option.value });
    });
    this.swatches.set(option.value, button);
    return button;
  }

  private change(appearance: FolderAppearance): void {
    this.appearance = appearance;
    this.onAppearance(appearance);
    this.markSelection();
  }

  private markSelection(): void {
    for (const [emoji, button] of this.emojiButtons) {
      button.setAttribute('aria-pressed', pressedState(emoji === this.appearance.emoji));
    }
    for (const [color, button] of this.swatches) {
      button.setAttribute('aria-pressed', pressedState(color === this.appearance.color));
    }
    this.showEmojiPlaceholder();
  }

  private showEmojiPlaceholder(): void {
    const empty = this.emojiField.value.trim() === '';
    this.emojiPlaceholder.hidden = !empty;
    this.emojiPlaceholder.style.color = this.appearance.color ?? '';
    if (empty) {
      this.emojiField.setAttribute(ARIA_DESCRIBEDBY, EMOJI_DEFAULT_DESCRIPTION_ID);
    } else {
      this.emojiField.removeAttribute(ARIA_DESCRIBEDBY);
    }
  }
}

/**
 * Builds the content of the folder editor panel: name (renamed as it is typed, Enter closes),
 * emoji field and grid with a "default icon" button removing the emoji, and color palette with
 * "no color". Every change is saved right away by the handlers.
 * @param params.document - The owner document.
 * @param params.folder - The folder as it is when the panel opens.
 * @param params.onRename - Receives every typed name; blank names are for it to ignore.
 * @param params.onAppearance - Receives the emoji and color after every change.
 * @returns The panel content builder, for `FloatingPanels.open`.
 */
export function folderEditorPanel(params: {
  document: Document;
  folder: Folder;
  onRename: (name: string) => void;
  onAppearance: (appearance: FolderAppearance) => void;
}): PanelRender {
  const editor = new FolderEditor(params);
  return (controls) => editor.build({ controls, name: params.folder.name });
}
