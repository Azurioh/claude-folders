import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  manifestVersion: 3,
  modules: ['@wxt-dev/i18n/module'],
  // Vite scans every .html in the repo by default, including dist/ builds and test fixtures.
  vite: () => ({
    optimizeDeps: { entries: ['src/entrypoints/**/*.html'] },
  }),
  // The landing page and its Cloudflare config are not extension source.
  zip: {
    excludeSources: ['site/**', 'wrangler.jsonc'],
  },
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
