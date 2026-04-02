# Hosted Deployment

Generated from `master.html` version `2.4.5`.

## What these files are

- `app.css` — the hosted stylesheet extracted from the master file
- `app.js` — the hosted mount script that injects the app into one root container
- `embed-snippet.html` — the tiny Squarespace page code block snippet

## Squarespace usage

1. Host `app.css` and `app.js` somewhere you control.
2. Add the hosted CSS URL to the page or site header.
3. Add the hosted JS URL late in the page so the root element already exists.
4. Paste the contents of `embed-snippet.html` into a Squarespace code block where the tool should appear.

## Important rule

Edit only `master.html`.

Do not hand-edit files in `dist/`. Re-run:

```bash
node tools/build-hosted-assets.js
```

to regenerate hosted assets from the master source of truth.
