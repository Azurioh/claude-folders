import type { PanelRender } from '@/features/folders/ui/floating-panel';
import {
  createPanelButton,
  createPanelButtons,
  createPanelHint,
  createPanelLabel,
  createTextInput,
  onEnterKey,
} from '@/features/folders/ui/panel-controls';

const FIELD_ID = 'nfc-text-field';

/**
 * Builds the content of a panel asking for one line of text (a folder name, a title): a labelled
 * field, focused, submitted with Enter or the submit button.
 * @param params.document - The owner document.
 * @param params.fieldLabel - The field label.
 * @param params.value - The initial value.
 * @param params.submitLabel - The submit button text.
 * @param params.hint - An explanation under the field, or `null`.
 * @param params.onSubmit - Receives the value; returns `true` to close the panel, `false` to keep
 *   it open (e.g. a rejected blank value).
 * @returns The panel content builder, for `FloatingPanels.open`.
 */
export function textFieldPanel(params: {
  document: Document;
  fieldLabel: string;
  value: string;
  submitLabel: string;
  hint: string | null;
  onSubmit: (value: string) => boolean;
}): PanelRender {
  const { document, fieldLabel, value, submitLabel, hint, onSubmit } = params;
  return (controls) => {
    const input = createTextInput({ document, id: FIELD_ID, value, className: '' });
    const submit = (): void => {
      if (onSubmit(input.value)) {
        controls.close();
      }
    };
    onEnterKey({ input, onEnter: submit });
    return {
      body: [
        createPanelLabel({ document, text: fieldLabel, forId: FIELD_ID, id: null }),
        input,
        ...(hint === null ? [] : [createPanelHint({ document, text: hint })]),
        createPanelButtons({
          document,
          buttons: [
            createPanelButton({
              document,
              label: submitLabel,
              variant: 'primary',
              onPress: submit,
            }),
          ],
        }),
      ],
      initialFocus: input,
    };
  };
}
