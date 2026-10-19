# Security Policy

## Supported versions

Only the latest released version of Nest for Claude receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report vulnerabilities privately through GitHub's private vulnerability reporting:
[Report a vulnerability](https://github.com/Azurioh/nest-for-claude/security/advisories/new)
(repository **Security** tab, then **Report a vulnerability**).

Include, if you can:

- the affected version and browser,
- steps to reproduce or a proof of concept,
- the impact you expect (for example data exposure, script injection on claude.ai).

You will get an acknowledgement as soon as possible. Once a fix is released, the advisory is
published with credit to the reporter unless you prefer to stay anonymous.

## Scope

The extension stores data only in `browser.storage.local`, makes no network requests and requests
only the `storage` permission plus access to `https://claude.ai/*`. Any behavior that breaks one of
these guarantees is in scope.
