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

1. Open the extension's settings page (right-click the extension, then **Options** / **Manage**).
2. Open the developer tools on that page (`F12`, or right-click and **Inspect**).
3. In the console, run:

   ```js
   copy(JSON.stringify(await browser.storage.local.get(null), null, 2));
   ```

   On Chrome, replace `browser` with `chrome`. The JSON is now in your clipboard.

## Delete your data

- **Uninstalling the extension deletes all of its data.**
- To delete the data but keep the extension, run in the same console:

  ```js
  await browser.storage.local.clear();
  ```

  (On Chrome, replace `browser` with `chrome`.)

## Changes

Any change to this policy is made in this file and visible in the repository history.

## Contact

Questions: open an issue on [GitHub](https://github.com/Azurioh/nest-for-claude/issues).
