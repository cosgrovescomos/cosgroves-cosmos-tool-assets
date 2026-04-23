#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const toolDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(toolDir, "..", "..");

const DEFAULT_SOURCE = path.join(repoRoot, "Exposure-Tradeoff-Explorer-v1.0.0.html");
const REMOTE_LOGO =
  "https://images.squarespace-cdn.com/content/v1/60d7296aaa6c862de19a7d3b/c6f3c7cd-bb49-478c-8709-7798dcf649e0/framed_2_justlogo-updated.jpg?format=1500w";
const LOCAL_LOGO_PATH = "./assets/logo.webp";

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

function detectVersion(source) {
  const versionMatch = source.match(/<span class="hero-version">(v[^<]+)<\/span>/);
  if (versionMatch) return versionMatch[1];
  const functionMatch = source.match(/function currentToolVersion\(\)\s*\{\s*return "([^"]+)";\s*\}/);
  if (functionMatch) return functionMatch[1];
  return "unknown";
}

function extractOuterStyle(source) {
  const styleStart = source.indexOf("<style>");
  const styleEnd = source.indexOf("</style>", styleStart);
  if (styleStart === -1 || styleEnd === -1 || styleEnd <= styleStart) {
    throw new Error("Could not find the outer <style> block in the source HTML.");
  }
  return source.slice(styleStart + "<style>".length, styleEnd).trim() + "\n";
}

function transformCssForStandalone(cssSource) {
  const standaloneCss = cssSource
    .replace(/\*\{box-sizing:border-box\}/g, "#exposure-tool, #exposure-tool *{box-sizing:border-box}")
    .replace(/html,body\{margin:0;padding:0;min-height:100%\}/g, "html.exposure-explorer-standalone,body.exposure-explorer-standalone{margin:0;padding:0;min-height:100%}")
    .replace(/(^|\n)(\s*)body\{([\s\S]*?)\n\s*\}/, (match, prefix, indent, bodyContents) => {
      if (match.includes("body.exposure-explorer-standalone")) return match;
      return `${prefix}${indent}body.exposure-explorer-standalone{${bodyContents}\n${indent}}`;
    })
    .replace(/(\n\s*)body\{padding:10px\}/g, "$1body.exposure-explorer-standalone{padding:10px}");

  return `${standaloneCss}

/* Embed mode: let the iframe document grow naturally and avoid nested scroll panes. */
html.embedded-host{
  height:auto;
  min-height:0;
  overflow:hidden;
}
body.embedded-host{
  height:auto;
  min-height:0;
  overflow:hidden;
}
body.embedded-host #exposure-tool,
body.embedded-host .layout,
body.embedded-host .setup,
body.embedded-host .results{
  height:auto;
  min-height:0;
  max-height:none;
  overflow:visible;
  overscroll-behavior:auto;
  scrollbar-gutter:auto;
}
body.embedded-host .layout{
  min-height:0;
  align-items:start;
}
body.embedded-host .setup,
body.embedded-host .results{
  position:static;
  top:auto;
  align-self:auto;
  padding-right:0;
}
body.embedded-host .results::-webkit-scrollbar{
  display:none;
}
`;
}

function extractBodyMarkup(source) {
  const bodyStartTag = source.indexOf("<body>");
  const scriptStart = source.indexOf("<script>", bodyStartTag);
  if (bodyStartTag === -1 || scriptStart === -1) {
    throw new Error("Could not find the body markup or app script block.");
  }
  const rawBody = source.slice(bodyStartTag + "<body>".length, scriptStart).trim();
  const wrapperMatch = rawBody.match(/^<div id="exposure-tool">\s*([\s\S]*?)\s*<\/div>$/);
  return (wrapperMatch ? wrapperMatch[1] : rawBody).trim().replaceAll(REMOTE_LOGO, LOCAL_LOGO_PATH);
}

function extractOuterScript(source) {
  const bodyStartTag = source.indexOf("<body>");
  const scriptStart = source.indexOf("<script>", bodyStartTag);
  const scriptEnd = source.lastIndexOf("</script>");
  if (scriptStart === -1 || scriptEnd === -1 || scriptEnd <= scriptStart) {
    throw new Error("Could not find the outer app <script> block in the source HTML.");
  }
  return source
    .slice(scriptStart + "<script>".length, scriptEnd)
    .trim()
    .replaceAll(REMOTE_LOGO, '${toolAssetUrl("./assets/logo.webp")}') + "\n";
}

function escapeTemplateLiteral(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function patchExportAppendix(scriptSource) {
  const replacement = `
  function collectPrintableStyles() {
    const inlineStyles = Array.from(document.querySelectorAll("style"))
      .map((style) => style.outerHTML)
      .join("\\n");
    const linkedCss = Array.from(document.styleSheets || [])
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules || []).map((rule) => rule.cssText).join("\\n");
        } catch (error) {
          return "";
        }
      })
      .filter(Boolean)
      .map((cssText) => \`<style>\\n\${cssText}\\n</style>\`)
      .join("\\n");
    return [inlineStyles, linkedCss].filter(Boolean).join("\\n");
  }

  function absolutizeAppendixAssets(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll("img[src]").forEach((img) => {
      const src = img.getAttribute("src");
      if (!src) return;
      try {
        img.setAttribute("src", new URL(src, document.baseURI).href);
      } catch (error) {
        // Leave the original source in place if URL resolution fails.
      }
    });
    return clone;
  }

  function exportAppendixPdf() {
    const appendixPanel = document.querySelector('[data-panel="appendix"] .ap-paper');
    if (!appendixPanel) return;
    const styles = collectPrintableStyles();
    const appendixExportNode = absolutizeAppendixAssets(appendixPanel);
    const title = \`Astro Exposure Explorer Technical Appendix \${currentToolVersion()}\`;
    const printableHtml = \`
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>\${title}</title>
        \${styles}
        <style>
          @page{
            size:auto;
            margin:0.55in;
          }
          *{
            -webkit-print-color-adjust:exact !important;
            print-color-adjust:exact !important;
          }
          body.appendix-export{
            margin:0;
            padding:20px 20px 28px;
            background:#ffffff;
            color:#111827;
            font-family:ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .appendix-export-toolbar{
            position:sticky;
            top:0;
            z-index:10;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            margin:0 auto 16px;
            max-width:1080px;
            padding:10px 12px;
            border:1px solid rgba(15,23,42,.12);
            border-radius:12px;
            background:#f8fafc;
            color:#334155;
          }
          .appendix-export-toolbar-text{
            font-size:0.84rem;
            line-height:1.45;
          }
          .appendix-export-toolbar button{
            appearance:none;
            border:none;
            cursor:pointer;
            padding:10px 14px;
            border-radius:10px;
            background:#0f172a;
            color:#ffffff;
            font-weight:800;
            font-size:0.82rem;
          }
          .appendix-export .ap-paper{
            max-width:1080px;
            margin:0 auto;
            background:#ffffff;
            border:none;
            box-shadow:none;
            padding:0;
            gap:18px;
          }
          .appendix-export .ap-header,
          .appendix-export .ap-toc,
          .appendix-export .ap-section,
          .appendix-export .ap-figure,
          .appendix-export .ap-eqn-block,
          .appendix-export .ap-block,
          .appendix-export .ap-method-group,
          .appendix-export .ap-ref-intro,
          .appendix-export .ap-ref-item,
          .appendix-export .ap-callout,
          .appendix-export .ap-takeaway{
            background:#ffffff !important;
            color:#111827 !important;
            border:1px solid rgba(15,23,42,.16) !important;
            box-shadow:none !important;
          }
          .appendix-export .ap-figure-frame,
          .appendix-export .ap-eqn-display{
            background:#f8fafc !important;
            border:1px solid rgba(15,23,42,.12) !important;
          }
          .appendix-export .ap-figure{
            page-break-inside:avoid;
            break-inside:avoid;
          }
          .appendix-export .ap-figure-frame{
            padding:14px;
          }
          .appendix-export .ap-figure svg{
            width:100%;
            height:auto;
          }
          .appendix-export svg[aria-label="Conceptual exposure regimes"] text,
          .appendix-export svg[aria-label="Lower-bound sensitivity plot"] text,
          .appendix-export svg[aria-label="Conceptual noise terms diagram"] text,
          .appendix-export svg[aria-label="Conceptual exposure tradeoff figure"] text{
            font-size:.88em !important;
            fill:#0f172a !important;
            font-weight:700 !important;
          }
          .appendix-export svg[aria-label="Planning mode versus empirical calibration mode schematic"] text{
            font-size:.84em !important;
            fill:#0f172a !important;
            font-weight:700 !important;
          }
          .appendix-export svg[aria-label="Conceptual exposure regimes"] line,
          .appendix-export svg[aria-label="Conceptual exposure regimes"] path,
          .appendix-export svg[aria-label="Lower-bound sensitivity plot"] line,
          .appendix-export svg[aria-label="Lower-bound sensitivity plot"] path,
          .appendix-export svg[aria-label="Planning mode versus empirical calibration mode schematic"] line,
          .appendix-export svg[aria-label="Planning mode versus empirical calibration mode schematic"] path,
          .appendix-export svg[aria-label="Conceptual exposure tradeoff figure"] line,
          .appendix-export svg[aria-label="Conceptual exposure tradeoff figure"] path{
            stroke-opacity:1 !important;
          }
          .appendix-export svg[aria-label="Lower-bound sensitivity plot"] text,
          .appendix-export svg[aria-label="Lower-bound sensitivity plot"] tspan{
            fill:#0f172a !important;
          }
          .appendix-export svg[aria-label="Conceptual exposure regimes"] text,
          .appendix-export svg[aria-label="Conceptual exposure regimes"] tspan,
          .appendix-export svg[aria-label="Conceptual noise terms diagram"] text,
          .appendix-export svg[aria-label="Conceptual noise terms diagram"] tspan,
          .appendix-export svg[aria-label="Conceptual exposure tradeoff figure"] text,
          .appendix-export svg[aria-label="Conceptual exposure tradeoff figure"] tspan,
          .appendix-export svg[aria-label="Planning mode versus empirical calibration mode schematic"] text,
          .appendix-export svg[aria-label="Planning mode versus empirical calibration mode schematic"] tspan{
            fill:#0f172a !important;
          }
          .appendix-export svg[aria-label="Lower-bound sensitivity plot"] [fill="rgba(255,255,255,.02)"]{
            fill:#ffffff !important;
          }
          .appendix-export svg[aria-label="Lower-bound sensitivity plot"] [stroke="rgba(255,255,255,.08)"]{
            stroke:rgba(15,23,42,.14) !important;
          }
          .appendix-export svg[aria-label="Lower-bound sensitivity plot"] text[fill="#d6e7f4"],
          .appendix-export svg[aria-label="Lower-bound sensitivity plot"] text[fill="#dfeffc"]{
            fill:#0f172a !important;
          }
          .appendix-export .ap-kicker,
          .appendix-export .ap-subhead,
          .appendix-export .ap-eqn-title{
            color:#8a6508 !important;
          }
          .appendix-export .ap-title,
          .appendix-export .ap-section-title,
          .appendix-export .ap-block-title,
          .appendix-export .ap-method-name,
          .appendix-export .ap-ref-item a,
          .appendix-export .ap-takeaway,
          .appendix-export .ap-callout,
          .appendix-export .ap-eqn-display,
          .appendix-export .ap-eqn-defs li strong,
          .appendix-export .ap-figure-title{
            color:#0f172a !important;
          }
          .appendix-export .ap-subtitle,
          .appendix-export .ap-meta,
          .appendix-export .ap-section-body,
          .appendix-export .ap-section-label,
          .appendix-export .ap-eqn-lead,
          .appendix-export .ap-eqn-note,
          .appendix-export .ap-eqn-defs,
          .appendix-export .ap-bullets,
          .appendix-export .ap-steps,
          .appendix-export .ap-method-desc,
          .appendix-export .ap-ref-summary,
          .appendix-export .ap-figure-caption,
          .appendix-export .ap-toc-title,
          .appendix-export .ap-toc ol,
          .appendix-export .ap-toc a{
            color:#334155 !important;
          }
          .appendix-export .ap-block-value{
            color:#0f172a !important;
          }
          .appendix-export .ap-block-note{
            color:#475569 !important;
          }
          .appendix-export .ap-method-desc strong,
          .appendix-export .ap-callout strong,
          .appendix-export .ap-block strong,
          .appendix-export .ap-figure-caption strong,
          .appendix-export .ap-meta strong{
            color:#0f172a !important;
          }
          .appendix-export .ap-header-actions,
          .appendix-export .ghost,
          .appendix-export .ap-paper button{
            display:none !important;
          }
          .appendix-export .ap-logo{
            border-color:rgba(15,23,42,.16);
            box-shadow:none;
          }
          @media print{
            body.appendix-export{
              padding:0;
            }
            .appendix-export-toolbar{
              display:none !important;
            }
            .appendix-export .ap-paper{
              max-width:none;
            }
          }
        </style>
      </head>
      <body class="appendix-export">
        <div class="appendix-export-toolbar">
          <div class="appendix-export-toolbar-text">Use your browser’s print dialog to save this appendix as a PDF.</div>
          <button type="button" onclick="window.print()">Print / Save PDF</button>
        </div>
        \${appendixExportNode.outerHTML}
        <script>
          window.__appendixPrintTriggered = false;
          function triggerAppendixPrintOnce() {
            if (window.__appendixPrintTriggered) return;
            window.__appendixPrintTriggered = true;
            window.setTimeout(() => { window.print(); }, 650);
          }
          window.addEventListener('load', () => {
            triggerAppendixPrintOnce();
          }, { once: true });
          window.addEventListener('pageshow', () => {
            triggerAppendixPrintOnce();
          });
        <\\/script>
      </body>
      </html>
    \`;
    const blob = new Blob([printableHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const exportWindow = window.open(url, "_blank", "width=1180,height=920");
    if (!exportWindow) {
      URL.revokeObjectURL(url);
      appState.planStatus = "Popup blocked. Allow popups to export the appendix as PDF.";
      appState.planStatusLevel = "error";
      renderResults();
      return;
    }
    window.setTimeout(() => {
      exportWindow.focus();
    }, 120);
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 12000);
    appState.planStatus = "Appendix export opened in print view. Choose Save as PDF in the print dialog.";
    appState.planStatusLevel = "success";
    renderResults();
  }`;

  return scriptSource.replace(
    /function exportAppendixPdf\(\) \{[\s\S]*?\n\s*function escapeHtml\(value\) \{/,
    `${replacement}\n\n  function escapeHtml(value) {`
  );
}

function buildIndexHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Astro Exposure Explorer</title>
  <link rel="stylesheet" href="./app.css" />
</head>
<body class="exposure-explorer-standalone">
  <div id="exposure-tool"></div>
  <script src="./app.js"></script>
</body>
</html>
`;
}

function buildWrappedJs(bodyMarkup, appScript, sourceLabel) {
  const escapedMarkup = escapeTemplateLiteral(bodyMarkup.replaceAll(LOCAL_LOGO_PATH, '${toolAssetUrl("./assets/logo.webp")}'));
  const patchedScript = patchExportAppendix(appScript);
  return `/* Generated from ${sourceLabel}. Do not edit by hand. */
(function(){
  const embedParams = new URLSearchParams(window.location.search);
  if (embedParams.get("embed") === "1") {
    document.documentElement.classList.add("embedded-host");
    document.body.classList.add("embedded-host");
  }
  const root = document.getElementById('exposure-tool');
  if (!root) return;
  if (root.dataset.exposureExplorerMounted === '1') return;
  root.dataset.exposureExplorerMounted = '1';
  const mountScript = document.currentScript || Array.from(document.scripts).find((script) => /\\/tools\\/exposure-explorer\\/app\\.js(?:\\?|$)/.test(script.src || ""));
  const appBaseUrl = mountScript?.src ? new URL("./", mountScript.src).href : new URL("./", document.baseURI).href;
  function toolAssetUrl(relativePath) {
    return new URL(relativePath, appBaseUrl).href;
  }
  root.innerHTML = \`${escapedMarkup}\`;

  const isEmbedMode = document.body.classList.contains("embedded-host");
  let iframeResizeTimer = 0;
  let lastSentIframeHeight = 0;
  function sendHeightToParent() {
    if (!window.parent || window.parent === window) return;
    const rootBox = root.getBoundingClientRect();
    const bodyBox = document.body.getBoundingClientRect();
    const bodyStyles = window.getComputedStyle(document.body);
    const bodyPaddingBottom = parseFloat(bodyStyles.paddingBottom || "0") || 0;
    const height = Math.ceil(isEmbedMode
      ? Math.max(rootBox.bottom - bodyBox.top + bodyPaddingBottom, root.scrollHeight || 0)
      : Math.max(
          document.documentElement?.scrollHeight || 0,
          document.body?.scrollHeight || 0,
          document.documentElement?.offsetHeight || 0,
          document.body?.offsetHeight || 0
        )
    );
    if (!height) return;
    if (Math.abs(height - lastSentIframeHeight) <= 4) return;
    lastSentIframeHeight = height;
    window.parent.postMessage({ type: "exposureExplorerResize", height }, "*");
  }
  function scheduleHeightToParent() {
    if (iframeResizeTimer) window.clearTimeout(iframeResizeTimer);
    iframeResizeTimer = window.setTimeout(() => {
      iframeResizeTimer = 0;
      sendHeightToParent();
    }, 75);
  }
  window.addEventListener("load", scheduleHeightToParent);
  window.addEventListener("resize", scheduleHeightToParent);
  if ("ResizeObserver" in window) {
    const iframeResizeObserver = new ResizeObserver(scheduleHeightToParent);
    iframeResizeObserver.observe(root);
  }
  scheduleHeightToParent();

${patchedScript.replace(/^/gm, "  ")}
})();
`;
}

function main() {
  const explicitSource = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : DEFAULT_SOURCE;
  if (!fs.existsSync(explicitSource)) {
    throw new Error(`Source file not found: ${explicitSource}`);
  }

  const sourceHtml = read(explicitSource);
  const version = detectVersion(sourceHtml);
  const sourceLabel = path.relative(repoRoot, explicitSource) || path.basename(explicitSource);
  const css = transformCssForStandalone(extractOuterStyle(sourceHtml));
  const bodyMarkup = extractBodyMarkup(sourceHtml);
  const appScript = extractOuterScript(sourceHtml);

  write(path.join(toolDir, "index.html"), buildIndexHtml());
  write(path.join(toolDir, "app.css"), `/* Generated from ${sourceLabel} (${version}). Do not edit by hand. */\n${css}`);
  write(path.join(toolDir, "app.js"), buildWrappedJs(bodyMarkup, appScript, `${sourceLabel} (${version})`));

  console.log(`Built Astro Exposure Explorer bundle from ${sourceLabel}`);
  console.log(`Version: ${version}`);
  console.log(`Wrote ${path.join(toolDir, "index.html")}`);
  console.log(`Wrote ${path.join(toolDir, "app.css")}`);
  console.log(`Wrote ${path.join(toolDir, "app.js")}`);
}

main();
