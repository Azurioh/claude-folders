/** Emojis offered by the folder editor. */
export const FOLDER_EMOJIS: readonly string[] = [
  '📚',
  '⚖️',
  '📝',
  '💡',
  '🔬',
  '📊',
  '🗂️',
  '⭐',
  '🎯',
  '🧪',
  '💼',
  '🏛️',
  '🔥',
];

/** Longest emoji (in UTF-16 code units) the editor field accepts: room for ZWJ sequences. */
export const FOLDER_EMOJI_MAX_LENGTH = 8;

/** Message key naming a palette color. */
export type FolderColorName =
  | 'colorNone'
  | 'colorClay'
  | 'colorOchre'
  | 'colorOlive'
  | 'colorGreen'
  | 'colorTeal'
  | 'colorBlue'
  | 'colorViolet'
  | 'colorPink'
  | 'colorTaupe';

/** A color of the folder palette; `value` is `null` for "no color". */
export interface FolderColorOption {
  readonly value: string | null;
  readonly name: FolderColorName;
}

/** Colors offered by the folder editor, "no color" first. */
export const FOLDER_COLORS: readonly FolderColorOption[] = [
  { value: null, name: 'colorNone' },
  { value: '#d97757', name: 'colorClay' },
  { value: '#d4a24c', name: 'colorOchre' },
  { value: '#8a9a5b', name: 'colorOlive' },
  { value: '#5f9e6e', name: 'colorGreen' },
  { value: '#4a9a9a', name: 'colorTeal' },
  { value: '#5b8dd6', name: 'colorBlue' },
  { value: '#8f7ad6', name: 'colorViolet' },
  { value: '#c86b9a', name: 'colorPink' },
  { value: '#9a8f84', name: 'colorTaupe' },
];
