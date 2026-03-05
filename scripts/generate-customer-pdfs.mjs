import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, "docs");
const buildDir = path.join(docsDir, "pdf-build");
const outputDir = path.join(docsDir, "pdf");

const targets = [
  {
    markdown: path.join(docsDir, "MVP_Scope_Workflow.md"),
    title: "Telemedicine MVP Scope and Workflow",
    outputBase: "Telemedicine_MVP_Scope_and_Workflow",
  },
  {
    markdown: path.join(docsDir, "Phase_Roadmap_Sprint_Plan.md"),
    title: "Telemedicine Roadmap and Sprint Plan",
    outputBase: "Telemedicine_Phase_Roadmap_and_Sprint_Plan",
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(input) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function applyInlineFormatting(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function isTableDelimiter(line) {
  const trimmed = line.trim();
  return /^\|?[\s:-]+\|[\s|:-]*$/.test(trimmed);
}

function parseTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => applyInlineFormatting(cell.trim()));
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const out = [];

  let inCode = false;
  let inUl = false;
  let inOl = false;
  let inTable = false;

  const closeListBlocks = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      out.push("</tbody></table>");
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (line.startsWith("```")) {
      closeListBlocks();
      closeTable();
      if (!inCode) {
        inCode = true;
        out.push("<pre><code>");
      } else {
        inCode = false;
        out.push("</code></pre>");
      }
      continue;
    }

    if (inCode) {
      out.push(`${escapeHtml(raw)}\n`);
      continue;
    }

    if (!line.trim()) {
      closeListBlocks();
      closeTable();
      continue;
    }

    const next = lines[i + 1]?.trimEnd() ?? "";
    const looksLikeTable = line.includes("|") && next && isTableDelimiter(next);

    if (looksLikeTable) {
      closeListBlocks();
      closeTable();
      const headers = parseTableRow(line);
      out.push("<table><thead><tr>");
      headers.forEach((h) => out.push(`<th>${h}</th>`));
      out.push("</tr></thead><tbody>");
      inTable = true;
      i += 1;
      continue;
    }

    if (inTable && line.includes("|")) {
      const cells = parseTableRow(line);
      out.push("<tr>");
      cells.forEach((c) => out.push(`<td>${c}</td>`));
      out.push("</tr>");
      continue;
    }

    if (line.startsWith("# ")) {
      closeListBlocks();
      closeTable();
      out.push(`<h1>${applyInlineFormatting(line.slice(2).trim())}</h1>`);
      continue;
    }

    if (line.startsWith("## ")) {
      closeListBlocks();
      closeTable();
      out.push(`<h2>${applyInlineFormatting(line.slice(3).trim())}</h2>`);
      continue;
    }

    if (line.startsWith("### ")) {
      closeListBlocks();
      closeTable();
      out.push(`<h3>${applyInlineFormatting(line.slice(4).trim())}</h3>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      closeTable();
      if (!inOl) {
        closeListBlocks();
        inOl = true;
        out.push("<ol>");
      }
      out.push(`<li>${applyInlineFormatting(line.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }

    if (line.startsWith("- ")) {
      closeTable();
      if (!inUl) {
        closeListBlocks();
        inUl = true;
        out.push("<ul>");
      }
      out.push(`<li>${applyInlineFormatting(line.slice(2).trim())}</li>`);
      continue;
    }

    closeListBlocks();
    closeTable();
    out.push(`<p>${applyInlineFormatting(line.trim())}</p>`);
  }

  closeListBlocks();
  closeTable();
  if (inCode) {
    out.push("</code></pre>");
  }

  return out.join("\n");
}

function buildHtmlPage(title, bodyHtml, generatedAt) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 14mm 18mm 14mm;
    }
    :root {
      --ink: #0f172a;
      --muted: #475569;
      --brand: #0e7490;
      --bg: #f8fafc;
      --line: #cbd5e1;
    }
    html, body {
      margin: 0;
      padding: 0;
      font-family: "Segoe UI", "Trebuchet MS", Arial, sans-serif;
      color: var(--ink);
      background: white;
      line-height: 1.45;
    }
    body {
      font-size: 12px;
    }
    .cover {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 18px;
      background:
        radial-gradient(circle at top right, rgba(14, 116, 144, 0.12), transparent 45%),
        radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.10), transparent 42%),
        #f8fbfd;
    }
    .cover h1 {
      margin: 0 0 8px;
      font-size: 24px;
      color: var(--brand);
      letter-spacing: 0.2px;
    }
    .cover p {
      margin: 0;
      color: var(--muted);
      font-size: 11px;
    }
    h1 {
      font-size: 20px;
      margin: 18px 0 8px;
      color: var(--brand);
      page-break-after: avoid;
    }
    h2 {
      font-size: 16px;
      margin: 14px 0 6px;
      color: #0f766e;
      page-break-after: avoid;
      border-bottom: 1px solid #dbeafe;
      padding-bottom: 4px;
    }
    h3 {
      font-size: 13px;
      margin: 12px 0 5px;
      color: #075985;
      page-break-after: avoid;
    }
    p {
      margin: 6px 0;
      color: var(--ink);
    }
    ul, ol {
      margin: 6px 0 8px 18px;
      padding: 0;
    }
    li {
      margin: 2px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px;
      page-break-inside: auto;
      font-size: 11px;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 7px 8px;
      vertical-align: top;
      text-align: left;
    }
    th {
      background: #e0f2fe;
      color: #0c4a6e;
      font-weight: 700;
    }
    code {
      font-family: Consolas, "Courier New", monospace;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 1px 4px;
      font-size: 10px;
    }
    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      white-space: pre-wrap;
      word-break: break-word;
      overflow: visible;
      margin: 10px 0;
    }
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 10px;
    }
  </style>
</head>
<body>
  <section class="cover">
    <h1>${escapeHtml(title)}</h1>
    <p>Generated for customer sharing on ${escapeHtml(generatedAt)}</p>
  </section>
  ${bodyHtml}
  <div class="footer">Generated from project documentation files.</div>
</body>
</html>`;
}

function resolveChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function toFileUrl(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  return `file:///${normalized}`;
}

function runPrintToPdf(browserPath, htmlPath, pdfPath) {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--print-to-pdf=${pdfPath}`,
    toFileUrl(htmlPath),
  ];

  const result = spawnSync(browserPath, args, { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(
      `PDF generation failed for ${path.basename(pdfPath)}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
  }
}

function main() {
  ensureDir(buildDir);
  ensureDir(outputDir);

  const browserPath = resolveChromePath();
  if (!browserPath) {
    throw new Error("Chrome/Edge executable not found. Set CHROME_PATH env var to browser executable.");
  }

  const generatedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const outputs = [];

  for (const target of targets) {
    const markdown = fs.readFileSync(target.markdown, "utf-8");
    const bodyHtml = markdownToHtml(markdown);
    const html = buildHtmlPage(target.title, bodyHtml, generatedAt);

    const htmlPath = path.join(buildDir, `${target.outputBase}.html`);
    const pdfPath = path.join(outputDir, `${target.outputBase}.pdf`);

    fs.writeFileSync(htmlPath, html, "utf-8");
    runPrintToPdf(browserPath, htmlPath, pdfPath);

    outputs.push({ htmlPath, pdfPath });
  }

  console.log(JSON.stringify({ ok: true, browserPath, outputs }, null, 2));
}

main();
