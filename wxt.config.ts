import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  modules: ['@wxt-dev/i18n/module'],
  manifest: ({ browser, mode }) => ({
    name: mode === 'development' ? '__MSG_extNameDev__' : '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage'],
    host_permissions: ['https://claude.ai/*'],
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: 'nest-for-claude@azurioh',
          data_collection_permissions: {
            required: ['none'],
          },
        },
      },
    }),
  }),
});
