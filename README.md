# Cosgrove's Cosmos Tool Assets

Hosted static assets for interactive astronomy and astrophotography tools used on Cosgrove's Cosmos.

## Purpose

This repository is the public asset host for browser-based tools embedded on the Cosgrove's Cosmos Squarespace site.

It is intended to hold the generated deployment artifacts for tools such as:

- Astrophotography System-to-System Comparison Tool
- other future astronomy or astrophotography tools that need hosted JavaScript and CSS

This repository is **not** the primary source-authoring location for the tools themselves. The source of truth stays local in the master project files. This repository is for the hosted build artifacts that Squarespace loads.

## What lives here

Typical files for a tool deployment include:

- `app.js` — hosted JavaScript bundle for the tool
- `app.css` — hosted stylesheet for the tool
- `embed-snippet.html` — tiny HTML mount snippet for Squarespace
- `DEPLOYMENT.md` — deployment notes for the generated artifacts
- `SIZE-REPORT.txt` — size report for generated assets

If multiple tools are hosted here later, they should be organized into separate folders by tool name.

## Current hosting model

The current deployment model is:

1. Develop and maintain the tool locally as a master HTML source file
2. Generate hosted artifacts from that master file
3. Upload the generated artifacts to this repository
4. Serve those files through GitHub Pages
5. Load the hosted CSS and JS from Squarespace
6. Mount the tool into a small root div placed on the Squarespace page

## Squarespace integration pattern

Squarespace pages should generally contain a small mount point such as:

```html
<div id="astro-system-tool-root"></div>
```

The page then loads the hosted CSS and JS from GitHub Pages.

Example pattern:

```html
<link rel="stylesheet" href="https://cosgrovescomos.github.io/cosgroves-cosmos-tool-assets/app.css">
<script defer src="https://cosgrovescomos.github.io/cosgroves-cosmos-tool-assets/app.js"></script>
```

## Update workflow

When a new tool version is ready:

1. Update the master source locally
2. Regenerate the deployment artifacts
3. Replace the hosted `app.js` and `app.css` files in this repository
4. Commit the changes
5. Wait for GitHub Pages to refresh
6. Hard-refresh the Squarespace page and test the live result

The Squarespace code block usually does **not** need to be changed unless the mount snippet changes.

## Repository rules

- Edit the master source locally, not here
- Treat this repository as the public hosting layer
- Keep filenames stable when possible so Squarespace references do not need to change
- Keep tool assets organized and easy to identify
- If multiple tools are added, place each tool in its own folder

## Notes

This repository is public because GitHub Pages hosting on GitHub Free requires a public repository.

The hosted site URL for this repository is:

`https://cosgrovescomos.github.io/cosgroves-cosmos-tool-assets/`

Depending on the files present, the root URL may not show a page unless an `index.html` file exists. That is normal. The primary purpose of this repository is to serve static asset files directly.

## Maintainer

Cosgrove's Cosmos  
Astrophotography by Patrick A. Cosgrove
