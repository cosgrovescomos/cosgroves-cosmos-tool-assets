# Astro Exposure Explorer

## Purpose

Astro Exposure Explorer is a static browser tool for planning and comparing sub-exposure recommendations across mono filter sets. It includes setup inputs, recommendation and FAQ tabs, a technical appendix, JSON save/load, and appendix PDF export behavior.

## Hosted path

This tool is intended to be hosted from:

- `/tools/exposure-explorer/`

The stable entry point is:

- `/tools/exposure-explorer/index.html`

## File structure

- `index.html` — standalone entry page for GitHub Pages or direct static hosting
- `app.css` — extracted stylesheet for the tool
- `app.js` — extracted application logic and mount script
- `embed-snippet.html` — minimal embed snippet for page builders such as Squarespace
- `assets/` — local static assets used by the tool, including `logo.webp`
- `tools/build-bundle.js` — regeneration script that rebuilds the split bundle from the single-file source

## How to embed

The tool can be embedded into another page by loading its own stylesheet and script, then placing the root mount element on the page:

```html
<link rel="stylesheet" href="/tools/exposure-explorer/app.css" />
<div id="exposure-tool"></div>
<script src="/tools/exposure-explorer/app.js"></script>
```

The provided `embed-snippet.html` contains that exact snippet.

## Source of truth and regeneration

The split bundle is generated from the current single-file source HTML, not edited by hand.

Default source:

- `/Exposure-Tradeoff-Explorer-v1.0.0.html`

Regenerate the bundle with:

```bash
npm run build:exposure-explorer
```

Or point the generator at a different source file:

```bash
node tools/exposure-explorer/tools/build-bundle.js ./Exposure-Tradeoff-Explorer-v1.0.0.html
```

The regeneration script updates:

- `tools/exposure-explorer/index.html`
- `tools/exposure-explorer/app.css`
- `tools/exposure-explorer/app.js`

The local asset folder is preserved and the split bundle rewrites the logo reference to the local `assets/logo.webp` file.

## External dependencies

The static app is self-contained for UI, logic, and branding assets. Current live external calls still used by the app are:

- OpenStreetMap Nominatim geocoding for location resolution
- Reference links in the FAQ and Technical Appendix that point to external documentation and papers

## Versioning

The current tool version is displayed in the app UI and defined inside `app.js` by `currentToolVersion()`.

The stable hosted filename remains `index.html`; versioning should stay in:

- the UI
- internal version constants
- documentation
- exported file names

## Deployment notes

This tool is intentionally isolated from any existing root-level hosted files. It does not depend on root-level `app.css`, `app.js`, `embed-snippet.html`, `README.md`, or `DEPLOYMENT.md`.

All static references inside this folder are relative to the tool folder for standalone hosting, and the embed snippet points explicitly to `/tools/exposure-explorer/` so it does not collide with the existing hosted tool paths.

Do not point this tool at root-level hosted assets. It is intentionally packaged as its own isolated static bundle.
