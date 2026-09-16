// Renders PRIVACY.md and TERMS.md from the extension repo into styled pages.
//
// The markdown files are the single source of truth and live with the code, so
// these pages are generated rather than hand-written - a privacy notice that
// drifts from the one shipped in the extension is worse than no page at all.
// Re-run after editing either markdown file:
//
//   node build-legal.mjs [path-to-extension-dir]

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const src = process.argv[2] ?? 'C:/Source/Lucid/Extensions/VSCode';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Inline markdown only: code, bold, links. The documents use nothing else, and
// a fuller parser would be more surface area than the job needs.
function inline(s) {
    return esc(s)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function render(md) {
    const out = [];
    let list = null;
    const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

    for (const raw of md.split(/\r?\n/)) {
        const line = raw.trimEnd();

        if (!line.trim()) { closeList(); continue; }
        if (/^---+$/.test(line.trim())) { closeList(); out.push('<hr>'); continue; }

        const h = line.match(/^(#{1,4})\s+(.*)$/);
        if (h) { closeList(); const n = h[1].length; out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }

        const ul = line.match(/^\s*[-*]\s+(.*)$/);
        if (ul) {
            if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
            out.push(`<li>${inline(ul[1])}</li>`);
            continue;
        }

        const ol = line.match(/^\s*\d+\.\s+(.*)$/);
        if (ol) {
            if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
            out.push(`<li>${inline(ol[1])}</li>`);
            continue;
        }

        // Consecutive plain lines are one block; markdown treats a single
        // newline as a soft wrap and both documents are hard-wrapped at ~78.
        // A wrapped line inside a list belongs to the bullet above it - without
        // this, the tail of a long bullet ("...and the most recent validation /
        // message.") is emitted as a stray paragraph after the list.
        const prev = out[out.length - 1];
        if (list && prev && prev.startsWith('<li>')) {
            out[out.length - 1] = prev.replace(/<\/li>$/, ' ' + inline(line) + '</li>');
        } else if (!list && prev && prev.startsWith('<p>')) {
            out[out.length - 1] = prev.replace(/<\/p>$/, ' ' + inline(line) + '</p>');
        } else {
            closeList();
            out.push(`<p>${inline(line)}</p>`);
        }
    }
    closeList();
    return out.join('\n');
}

const shell = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Lucid Programming</title>
<link rel="icon" href="favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>
  :root {
    --bg:#0f1419; --panel:#161d25; --panel-2:#1b232d; --line:#273240;
    --text:#dbe2ea; --muted:#8d99a8; --accent:#ff6a5f; --teal:#4ec9b0;
    --mono:"Cascadia Code",Consolas,"SF Mono",Menlo,monospace;
    --sans:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:16px/1.7 var(--sans);-webkit-font-smoothing:antialiased}
  .wrap{max-width:760px;margin:0 auto;padding:0 24px}
  header{border-bottom:1px solid var(--line)}
  .bar{display:flex;align-items:center;gap:13px;padding:18px 0}
  .bar a{color:var(--text);text-decoration:none;font-weight:650}
  .bar .back{margin-left:auto;color:var(--muted);font-weight:400;font-size:14.5px}
  .bar .back:hover{color:var(--text)}
  main{padding:44px 0 72px}
  h1{font-size:31px;letter-spacing:-.02em;margin:0 0 6px}
  h2{font-size:20px;letter-spacing:-.01em;margin:36px 0 10px;padding-top:18px;border-top:1px solid var(--line)}
  h3{font-size:16.5px;margin:26px 0 8px}
  p{margin:0 0 15px}
  ul,ol{margin:0 0 15px;padding-left:22px}
  li{margin-bottom:7px}
  a{color:var(--teal)}
  code{font:.92em var(--mono);background:var(--panel-2);padding:1px 6px;border-radius:4px;color:var(--teal)}
  hr{border:0;border-top:1px solid var(--line);margin:30px 0}
  strong{font-weight:600}
  footer{border-top:1px solid var(--line);padding:26px 0 44px;font-size:14px;color:var(--muted)}
  footer a{color:var(--muted)}
</style>
</head>
<body>
<header><div class="wrap bar">
  <a href="/">Lucid Programming</a>
  <a class="back" href="/">&larr; Back to site</a>
</div></header>
<main><div class="wrap">
${body}
</div></main>
<footer><div class="wrap">
  <a href="privacy.html">Privacy notice</a> &nbsp;·&nbsp;
  <a href="terms.html">Product terms</a> &nbsp;·&nbsp;
  <a href="https://github.com/Administrator-Lucid-Programming/ics-support/issues">Support</a>
</div></footer>
</body>
</html>
`;

for (const [file, out, title] of [
    ['PRIVACY.md', 'privacy.html', 'Privacy notice'],
    ['TERMS.md', 'terms.html', 'Product terms'],
]) {
    const md = readFileSync(join(src, file), 'utf8');
    writeFileSync(out, shell(title, render(md)), 'utf8');
    console.log(`${file} -> ${out} (${md.split(/\r?\n/).length} md lines)`);
}
