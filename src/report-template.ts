import path from 'path';

/**
 * Custom inline style parser that converts standard markdown styling
 * (bold, italic, code, checkbox) and typical keywords into premium HTML components/badges.
 */
function parseInlineStyles(text: string): string {
  let res = text;

  // Escape basic HTML characters to prevent breaking layout
  res = res
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold (**text** or __text__)
  res = res.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  res = res.replace(/\*(.*?)\*/g, '<em>$1</em>');
  res = res.replace(/_(.*?)_/g, '<em>$1</em>');

  // Inline code (`code`)
  res = res.replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');

  // Keywords -> High-fidelity badges with strict bracket matching to avoid double replacements
  res = res.replace(/\[(Alert|Warning|Caution|Anomaly|Drop|Spike)\]/gi, '<span class="badge badge-warning">$1</span>');
  res = res.replace(/\[(Critical|Error|Failed|High Risk)\]/gi, '<span class="badge badge-danger">$1</span>');
  res = res.replace(/\[(Success|On Track|Active|Passed|Resolved)\]/gi, '<span class="badge badge-success">$1</span>');
  res = res.replace(/\[(Info|Daily|Weekly|Monthly|Report|Recommended|Notice)\]/gi, '<span class="badge badge-info">$1</span>');

  return res;
}

/**
 * Builds a beautifully styled HTML table from markdown table rows.
 */
function buildTableHtml(rows: string[]): string {
  if (rows.length < 2) return '';

  const headerRow = rows[0];
  const dataRows = rows.slice(1).filter(r => !r.match(/^\|\s*[-|:\s]+\s*\|$/));

  const parseRow = (row: string) => {
    return row
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim());
  };

  const headers = parseRow(headerRow);
  const thead = `<thead><tr>${headers.map(h => `<th>${parseInlineStyles(h)}</th>`).join('')}</tr></thead>`;

  const tbody = `<tbody>${dataRows.map(row => {
    const cells = parseRow(row);
    return `<tr>${cells.map(c => `<td>${parseInlineStyles(c)}</td>`).join('')}</tr>`;
  }).join('')}</tbody>`;

  return `<div class="table-container"><table>${thead}${tbody}</table></div>`;
}

/**
 * Core Markdown-to-HTML parser optimized for OpenAds reports.
 * Uses a robust line-by-line state machine for exact output representation.
 */
export function parseMarkdown(md: string): string {
  let html = md.replace(/\r\n/g, '\n');

  // 1. Fenced code blocks
  const codeBlocks: string[] = [];
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    const id = `___CODE_BLOCK_${codeBlocks.length}___`;
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    codeBlocks.push(`<pre class="code-block"><code>${escapedCode.trim()}</code></pre>`);
    return id;
  });

  // 2. Identify tables
  const tables: string[] = [];
  const lines = html.split('\n');
  const linesWithTables: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true;
      tableRows.push(line);
    } else {
      if (inTable) {
        const tableHtml = buildTableHtml(tableRows);
        const id = `___TABLE_${tables.length}___`;
        tables.push(tableHtml);
        linesWithTables.push(id);
        tableRows = [];
        inTable = false;
      }
      linesWithTables.push(lines[i]);
    }
  }
  if (inTable && tableRows.length > 0) {
    const tableHtml = buildTableHtml(tableRows);
    const id = `___TABLE_${tables.length}___`;
    tables.push(tableHtml);
    linesWithTables.push(id);
  }

  // 3. Process line-by-line
  const processedHtml: string[] = [];
  let inList = false;
  let isOrdered = false;

  const closeListIfNeeded = () => {
    if (inList) {
      processedHtml.push(isOrdered ? '</ol>' : '</ul>');
      inList = false;
    }
  };

  for (let i = 0; i < linesWithTables.length; i++) {
    const line = linesWithTables[i].trim();
    if (!line) {
      closeListIfNeeded();
      continue;
    }

    // Fenced code blocks / table placeholders
    if (line.startsWith('___CODE_BLOCK_') && line.endsWith('___')) {
      closeListIfNeeded();
      processedHtml.push(line);
      continue;
    }
    if (line.startsWith('___TABLE_') && line.endsWith('___')) {
      closeListIfNeeded();
      processedHtml.push(line);
      continue;
    }

    // Headings
    if (line.startsWith('#')) {
      closeListIfNeeded();
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = parseInlineStyles(match[2]);
        if (level === 1) {
          processedHtml.push(`<h1>${text}</h1>`);
        } else if (level === 2) {
          processedHtml.push(`</section><section class="report-card"><h2>${text}</h2>`);
        } else {
          processedHtml.push(`<h${level}>${text}</h${level}>`);
        }
      }
      continue;
    }

    // Horizontal rule / dividers
    if (line === '---' || line === '***') {
      closeListIfNeeded();
      processedHtml.push('<hr class="report-divider">');
      continue;
    }

    // Lists (unordered)
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!inList || isOrdered) {
        closeListIfNeeded();
        processedHtml.push('<ul>');
        inList = true;
        isOrdered = false;
      }
      let content = ulMatch[1];
      const hasChecked = content.startsWith('[x] ');
      const hasUnchecked = content.startsWith('[ ] ');
      if (hasChecked || hasUnchecked) {
        content = content.slice(4);
      }
      // Parse inline styles on text only before wrapping in custom elements
      content = parseInlineStyles(content);
      if (hasChecked) {
        content = `<span class="checkbox checked">✓</span> <span class="checkbox-text">${content}</span>`;
      } else if (hasUnchecked) {
        content = `<span class="checkbox unchecked"></span> <span class="checkbox-text">${content}</span>`;
      }
      processedHtml.push(`<li>${content}</li>`);
      continue;
    }

    // Lists (ordered)
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (!inList || !isOrdered) {
        closeListIfNeeded();
        processedHtml.push('<ol>');
        inList = true;
        isOrdered = true;
      }
      let content = olMatch[2];
      content = parseInlineStyles(content);
      processedHtml.push(`<li>${content}</li>`);
      continue;
    }

    // If it's a plain line, it is a paragraph
    closeListIfNeeded();
    processedHtml.push(`<p>${parseInlineStyles(line)}</p>`);
  }

  closeListIfNeeded();

  let finalHtml = processedHtml.join('\n');

  // Clean sections wrap
  finalHtml = '<section class="report-card intro-card">\n' + finalHtml;
  finalHtml += '\n</section>';
  finalHtml = finalHtml.replace(/<section class="report-card intro-card">\s*<\/section>/g, '');
  finalHtml = finalHtml.replace(/<section class="report-card">\s*<\/section>/g, '');

  // 4. Restore placeholders
  codeBlocks.forEach((code, idx) => {
    finalHtml = finalHtml.replace(`___CODE_BLOCK_${idx}___`, code);
  });
  tables.forEach((table, idx) => {
    finalHtml = finalHtml.replace(`___TABLE_${idx}___`, table);
  });

  return finalHtml;
}

/**
 * Wraps parsed HTML body in a complete, premium styled HTML page template.
 */
export function compileHtmlReport(title: string, markdownContent: string): string {
  const parsedBody = parseMarkdown(markdownContent);
  const formattedTitle = title.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenAds Report — ${formattedTitle}</title>
  <!-- Modern Premium Typography -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
  
  <style>
    /* ─── Premium Modern CSS variables ─────────────────────────────────── */
    :root {
      --bg-color: #0b0f19;
      --card-bg: rgba(23, 28, 41, 0.6);
      --card-border: rgba(255, 255, 255, 0.08);
      --text-main: #a4b0be;
      --text-bright: #ffffff;
      --text-muted: #747d8c;
      
      /* Glowing Gradients */
      --primary-gradient: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
      --accent-color: #00d2ff;
      
      /* Status Colors */
      --color-success: #2ed573;
      --bg-success: rgba(46, 213, 115, 0.15);
      --color-warning: #ffa502;
      --bg-warning: rgba(255, 165, 2, 0.15);
      --color-danger: #ff4757;
      --bg-danger: rgba(255, 71, 87, 0.15);
      --color-info: #00d2ff;
      --bg-info: rgba(0, 210, 255, 0.15);
      
      --shadow-premium: 0 12px 40px rgba(0, 0, 0, 0.5);
      --transition-smooth: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    /* ─── Global Reset & Styling ────────────────────────────────────────── */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-main);
      line-height: 1.6;
      padding: 3rem 1.5rem;
      min-height: 100vh;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(0, 210, 255, 0.04) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(58, 123, 213, 0.04) 0%, transparent 40%);
      background-attachment: fixed;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    /* ─── Premium Header ────────────────────────────────────────────────── */
    header {
      margin-bottom: 3.5rem;
      text-align: center;
      position: relative;
    }

    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 0.4rem 1rem;
      border-radius: 100px;
      font-family: 'Outfit', sans-serif;
      font-size: 0.85rem;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--accent-color);
      margin-bottom: 1.5rem;
      backdrop-filter: blur(10px);
    }
    
    .logo-badge svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }

    header h1 {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 2.8rem;
      color: var(--text-bright);
      line-height: 1.2;
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
      letter-spacing: -0.5px;
    }

    header .report-subtitle {
      font-size: 1.1rem;
      color: var(--text-muted);
      margin-bottom: 1.5rem;
    }

    /* ─── Premium Card Layout ───────────────────────────────────────────── */
    .report-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 2.5rem;
      margin-bottom: 2.5rem;
      box-shadow: var(--shadow-premium);
      backdrop-filter: blur(12px);
      transition: var(--transition-smooth);
      position: relative;
      overflow: hidden;
    }
    
    .report-card:hover {
      transform: translateY(-4px);
      border-color: rgba(0, 210, 255, 0.2);
      box-shadow: 0 16px 48px rgba(0, 210, 255, 0.08);
    }
    
    .report-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: var(--primary-gradient);
    }

    /* Card Typography */
    .report-card h2 {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 1.6rem;
      color: var(--text-bright);
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .report-card h3 {
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      font-size: 1.25rem;
      color: var(--text-bright);
      margin: 1.5rem 0 1rem 0;
    }

    .report-card p {
      margin-bottom: 1.2rem;
      font-size: 1.05rem;
      color: var(--text-main);
    }
    
    .report-card p strong {
      color: var(--text-bright);
      font-weight: 600;
    }

    /* Divider */
    .report-divider {
      border: none;
      height: 1px;
      background: rgba(255, 255, 255, 0.06);
      margin: 2rem 0;
    }

    /* ─── Lists & Checkboxes ────────────────────────────────────────────── */
    .report-card ul, .report-card ol {
      margin-bottom: 1.5rem;
      padding-left: 0.5rem;
    }

    .report-card li {
      margin-bottom: 0.8rem;
      font-size: 1.05rem;
      list-style: none;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    
    .report-card ul li::before {
      content: "•";
      color: var(--accent-color);
      font-weight: bold;
      font-size: 1.2rem;
      line-height: 1.4rem;
      display: inline-block;
      flex-shrink: 0;
    }

    .report-card ol {
      list-style-type: decimal;
      padding-left: 1.5rem;
    }
    
    .report-card ol li {
      display: list-item;
      list-style-position: outside;
    }

    /* Styled Checkboxes */
    .checkbox {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      margin-top: 0.2rem;
      flex-shrink: 0;
    }
    
    .checkbox.checked {
      background: var(--color-success);
      color: #0b0f19;
      font-size: 0.75rem;
      font-weight: bold;
    }
    
    .checkbox.unchecked {
      border: 2px solid var(--text-muted);
    }
    
    .checkbox-text {
      flex: 1;
    }

    /* ─── Premium Tables ────────────────────────────────────────────────── */
    .table-container {
      width: 100%;
      overflow-x: auto;
      margin: 2rem 0;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(0, 0, 0, 0.15);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.95rem;
    }

    th {
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      color: var(--text-bright);
      background: rgba(255, 255, 255, 0.02);
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-main);
      vertical-align: middle;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.015);
      color: var(--text-bright);
    }

    /* ─── High-Fidelity Badges ──────────────────────────────────────────── */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.65rem;
      border-radius: 100px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      font-family: 'Outfit', sans-serif;
    }

    .badge-success {
      background: var(--bg-success);
      color: var(--color-success);
      border: 1px solid rgba(46, 213, 115, 0.3);
    }

    .badge-warning {
      background: var(--bg-warning);
      color: var(--color-warning);
      border: 1px solid rgba(255, 165, 2, 0.3);
    }

    .badge-danger {
      background: var(--bg-danger);
      color: var(--color-danger);
      border: 1px solid rgba(255, 71, 87, 0.3);
    }

    .badge-info {
      background: var(--bg-info);
      color: var(--color-info);
      border: 1px solid rgba(0, 210, 255, 0.3);
    }

    /* ─── Code Blocks ───────────────────────────────────────────────────── */
    .code-block {
      background: #060911;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1.5rem;
      margin: 1.5rem 0;
      overflow-x: auto;
    }

    .code-block code {
      font-family: 'Courier New', Courier, monospace;
      color: #00d2ff;
      font-size: 0.9rem;
    }
    
    .inline-code {
      font-family: 'Courier New', Courier, monospace;
      background: rgba(255, 255, 255, 0.05);
      color: var(--accent-color);
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      font-size: 0.9em;
    }

    /* ─── Footer ────────────────────────────────────────────────────────── */
    footer {
      text-align: center;
      margin-top: 5rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    footer a {
      color: var(--accent-color);
      text-decoration: none;
      transition: var(--transition-smooth);
    }
    
    footer a:hover {
      text-decoration: underline;
    }

    /* ─── Responsive Adjustments ────────────────────────────────────────── */
    @media (max-width: 768px) {
      body {
        padding: 2rem 1rem;
      }
      
      header h1 {
        font-size: 2.2rem;
      }
      
      .report-card {
        padding: 1.75rem;
      }
      
      th, td {
        padding: 0.75rem 1rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-badge">
        <svg viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        OpenAds AI
      </div>
      <h1>${formattedTitle}</h1>
      <div class="report-subtitle">Autonomous Campaign Performance Report</div>
    </header>

    <main>
      ${parsedBody}
    </main>

    <footer>
      <p>Report compiled autonomously by <a href="https://github.com/lamorim-net/openads-ai" target="_blank">OpenAds AI Command Center</a>.</p>
    </footer>
  </div>
</body>
</html>`;
}
