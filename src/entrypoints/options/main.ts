import { i18n } from '#i18n';
import { browser } from '#imports';

function setText(id: string, text: string): void {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;
  }
}

document.documentElement.lang = browser.i18n.getUILanguage();
document.title = i18n.t('optionsTitle');
setText('nfc-options-title', i18n.t('optionsTitle'));
setText('nfc-options-description', i18n.t('optionsDescription'));
