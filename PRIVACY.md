# Privacy Policy

Nest for Claude is designed so that your data never leaves your browser.

## What is stored

The extension stores, in your browser only:

- the folders you create: names, colors and emojis, and how they are nested;
- the claude.ai conversations you put in those folders: their conversation IDs and titles;
- the ID of the claude.ai project each folder belongs to;
- your display preferences: which folders and folder sections are expanded, and whether filed
  conversations are hidden from claude.ai's own lists.

It does **not** read or store the content of your conversations.

## Where it is stored

Everything is saved with the browser's `storage.local` API, on your device. It is not synced
through your browser account and is never sent anywhere.

## Network and third parties

- The extension makes **no network requests**.
- There is **no analytics, telemetry, tracking or advertising**.
- No data is shared with or sold to anyone, including Anthropic.
- The only permissions requested are `storage` and access to `https://claude.ai/*`, which is needed
  to display folders on claude.ai pages.

## Export your data

1. Click the extension's icon in the browser toolbar (pin it first if it is hidden in the
   extensions menu).
2. In **Backup**, click **Export backup** (on Firefox: **Export or import…**, then **Export
   backup** in the tab that opens). Your browser saves a `nest-for-claude-backup-YYYY-MM-DD.json`
   file on your device; it is not uploaded anywhere.

The file holds your folders, the IDs and titles of the conversations you filed, the IDs of the
projects they belong to and your display setting. **Import backup…** in the same place restores it,
after asking you to confirm that it replaces your current folders.

## Delete your data

- **Uninstalling the extension deletes all of its data.**
- To delete the data but keep the extension: click the extension's icon, then in **Danger zone**
  click **Delete all data** and confirm. Every folder of every project and your settings are removed
  from your browser.

## Changes

Any change to this policy is made in this file and visible in the repository history.

## Contact

Questions: open an issue on [GitHub](https://github.com/Azurioh/nest-for-claude/issues).
