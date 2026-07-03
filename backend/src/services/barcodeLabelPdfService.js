const puppeteer = require('puppeteer');
const fs = require('fs');
const { PDFDocument, PrintScaling, Duplex, degrees } = require('pdf-lib');

const MM_TO_PT = 72 / 25.4;
const CSS_DPI = 96;
const RENDER_SCALE = 3;

/** Exact inch dimensions Adobe/TVS must see for 110×25 mm. */
const LABEL_WIDTH_IN = 110 / 25.4; // 4.330708661417322
const LABEL_HEIGHT_IN = 25 / 25.4; // 0.984251968503937

function mmToPt(mm) {
  return Number(mm) * MM_TO_PT;
}

function mmToCssPx(mm) {
  return Math.max(1, Math.ceil((Number(mm) * CSS_DPI) / 25.4));
}

function exactPageSizePt(widthMm, heightMm) {
  return {
    widthPt: (Number(widthMm) / 25.4) * 72,
    heightPt: (Number(heightMm) / 25.4) * 72,
  };
}

async function findBrowserExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function extractStyleBlock(html) {
  const match = html.match(/<style>([\s\S]*?)<\/style>/i);
  return match ? match[1] : '';
}

function extractSheetTables(html) {
  return html.match(/<table class="sheet[^"]*"[\s\S]*?<\/table>/gi) || [];
}

/** Strip inter-row gap and force 25mm label row only — same orientation for every PDF page. */
function normalizeRowTable(tableHtml, layout) {
  const labelHeightMm = Number(layout.labelHeightMm) || 25;
  return tableHtml
    .replace(/<tr>\s*<td class="sheet-gap"[\s\S]*?<\/tr>/gi, '')
    .replace(/class="sheet[^"]*"/, 'class="sheet last-row"')
    .replace(/height:\s*[\d.]+mm/i, `height:${labelHeightMm}mm`);
}

function getRowHeights(layout, rowCount) {
  if (Array.isArray(layout?.rowPageHeightsMm) && layout.rowPageHeightsMm.length) {
    return layout.rowPageHeightsMm.map(Number);
  }

  const rows = Math.max(1, Number(rowCount) || 1);
  const labelHeightMm = Number(layout.labelHeightMm) || 25;
  return Array.from({ length: rows }, () => labelHeightMm);
}

function sanitizeLabelStyleCss(css) {
  if (!css) return '';
  return css
    .replace(/@page[\s\S]*?\}\s*/g, '')
    .replace(/@media\s+print\s*\{[\s\S]*?\}\s*/g, '')
    .replace(/@media\s+screen\s*\{[\s\S]*?\}\s*/g, '');
}

function wrapRowDocument(styleCss, rowTable, layout, heightMm) {
  const widthMm = Number(layout.sheetWidthMm) || 110;
  const labelHeightMm = Number(layout.labelHeightMm) || 25;
  const labelWidthMm = Number(layout.labelWidthMm) || widthMm / (Number(layout.columns) || 3);
  const columns = Math.max(1, Number(layout.columns) || 3);
  const padH = Number(layout.paddingHMm) || 1.2;
  const contentH = Number(layout.contentHeightMm) || 22;
  const topSpacer = Number(layout.topSpacerMm) || 3;
  const labelCss = sanitizeLabelStyleCss(styleCss);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        width: ${widthMm}mm;
        height: ${heightMm}mm;
        max-width: ${widthMm}mm;
        max-height: ${heightMm}mm;
        overflow: hidden;
        background: #fff;
        font-family: Arial, Helvetica, sans-serif;
      }
      ${labelCss}
      .sheet,
      .sheet.last-row {
        width: ${widthMm}mm !important;
        height: ${heightMm}mm !important;
        max-height: ${heightMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
        page-break-after: avoid !important;
      }
      .sheet td.label {
        width: ${labelWidthMm}mm !important;
        max-width: ${labelWidthMm}mm !important;
        padding: 0 !important;
      }
      .label,
      .label-inner {
        height: ${labelHeightMm}mm !important;
        max-height: ${labelHeightMm}mm !important;
      }
      .label-inner {
        justify-content: flex-start !important;
        align-items: stretch !important;
        box-sizing: border-box !important;
        padding: 0 ${padH}mm !important;
      }
      .top-spacer {
        flex-shrink: 0 !important;
        height: ${topSpacer}mm !important;
        max-height: ${topSpacer}mm !important;
      }
      .label-content {
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        flex: 0 0 ${contentH}mm !important;
        height: ${contentH}mm !important;
        max-height: ${contentH}mm !important;
        overflow: hidden !important;
      }
      .label {
        vertical-align: middle !important;
      }
      .sheet > tr:first-child {
        height: ${labelHeightMm}mm !important;
        vertical-align: middle;
      }
      .sheet-gap {
        display: none !important;
        height: 0 !important;
      }
    </style>
  </head>
  <body>${rowTable}</body>
</html>`;
}

async function renderRowScreenshot(page, html, widthMm, heightMm) {
  const widthPx = mmToCssPx(widthMm);
  const heightPx = mmToCssPx(heightMm);

  await page.setViewport({
    width: widthPx,
    height: heightPx,
    deviceScaleFactor: RENDER_SCALE,
  });
  await page.emulateMediaType('screen');
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });

  await new Promise((r) => setTimeout(r, 150));

  return page.screenshot({
    type: 'png',
    fullPage: false,
    omitBackground: false,
  });
}

function applyExactPageBoxes(page, widthPt, heightPt) {
  page.setRotation(degrees(0));
  page.setMediaBox(0, 0, widthPt, heightPt);
  page.setCropBox(0, 0, widthPt, heightPt);
  page.setBleedBox(0, 0, widthPt, heightPt);
  page.setTrimBox(0, 0, widthPt, heightPt);
  page.setArtBox(0, 0, widthPt, heightPt);
}

/** Adobe Reader: disable Fit-to-Page, use PDF page size for paper tray. */
function applyLabelPrintPreferences(doc, { widthMm, heightMm, pageCount = 1 }) {
  const widthIn = Number(widthMm) / 25.4;
  const heightIn = Number(heightMm) / 25.4;
  doc.setTitle(`Barcode labels ${widthMm}×${heightMm}mm`, { showInWindowTitleBar: true });
  doc.setSubject(
    `TVS label ${widthIn.toFixed(8)}×${heightIn.toFixed(8)} in (${widthMm}×${heightMm} mm). Print Actual Size on TVS LP 46 Neo.`
  );
  doc.setKeywords([
    `${widthMm}x${heightMm}mm`,
    `${widthIn.toFixed(8)}x${heightIn.toFixed(8)}in`,
    'TVS',
    'label',
    'ActualSize',
  ]);
  doc.setCreator('Saltum ERP');

  const prefs = doc.catalog.getOrCreateViewerPreferences();
  prefs.setPrintScaling(PrintScaling.None);
  prefs.setPickTrayByPDFSize(true);
  prefs.setDuplex(Duplex.Simplex);
  prefs.setPrintPageRange({ start: 0, end: Math.max(0, pageCount - 1) });
}

async function buildPdfPageFromScreenshot(pngBuffer, widthMm, heightMm) {
  const { widthPt, heightPt } = exactPageSizePt(widthMm, heightMm);
  const doc = await PDFDocument.create();
  const page = doc.addPage([widthPt, heightPt]);
  applyExactPageBoxes(page, widthPt, heightPt);

  const image = await doc.embedPng(pngBuffer);
  page.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt });

  applyLabelPrintPreferences(doc, { widthMm, heightMm, pageCount: 1 });
  return Buffer.from(await doc.save());
}

async function assertPdfPageCount(pdfBuffer, expectedPages) {
  const doc = await PDFDocument.load(pdfBuffer);
  const count = doc.getPageCount();
  if (count !== expectedPages) {
    throw new Error(`PDF has ${count} page(s) but expected exactly ${expectedPages}`);
  }

  for (let i = 0; i < count; i += 1) {
    const { width, height } = doc.getPage(i).getSize();
    if (width <= 0 || height <= 0) {
      throw new Error(`PDF page ${i + 1} has invalid dimensions`);
    }
  }

  return doc;
}

/**
 * One PDF page per label row — exact 110×25mm (4.33070866×0.98425197 in).
 * Built with screenshot + pdf-lib so Adobe/TVS read custom size, not 6×4.1 driver default.
 */
async function renderBarcodeLabelsPdf(html, layout, rowCount) {
  const rows = Math.max(1, Number(rowCount) || 1);
  const rowHeights = getRowHeights(layout, rows);
  const styleCss = extractStyleBlock(html);
  const tables = extractSheetTables(html);

  if (tables.length === 0) {
    throw new Error('No label rows found in print HTML');
  }

  if (tables.length !== rowHeights.length) {
    throw new Error(`Row count mismatch: ${tables.length} tables vs ${rowHeights.length} page heights`);
  }

  const executablePath = await findBrowserExecutable();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const pageBuffers = [];
    const widthMm = Number(layout.sheetWidthMm) || 110;

    for (let i = 0; i < tables.length; i += 1) {
      const heightMm = rowHeights[i];
      const rowTable = normalizeRowTable(tables[i], layout);
      const rowHtml = wrapRowDocument(styleCss, rowTable, layout, heightMm);
      const pngBuffer = await renderRowScreenshot(page, rowHtml, widthMm, heightMm);
      const pdfBuffer = await buildPdfPageFromScreenshot(pngBuffer, widthMm, heightMm);
      await assertPdfPageCount(pdfBuffer, 1);
      pageBuffers.push(pdfBuffer);
    }

    if (pageBuffers.length === 1) {
      return pageBuffers[0];
    }

    const merged = await PDFDocument.create();
    for (const buffer of pageBuffers) {
      const doc = await PDFDocument.load(buffer);
      const [copied] = await merged.copyPages(doc, [0]);
      merged.addPage(copied);
    }

    applyLabelPrintPreferences(merged, {
      widthMm,
      heightMm: rowHeights[rowHeights.length - 1],
      pageCount: pageBuffers.length,
    });

    const bytes = await merged.save();
    await assertPdfPageCount(Buffer.from(bytes), pageBuffers.length);
    return Buffer.from(bytes);
  } finally {
    await browser.close();
  }
}

/** @deprecated kept for tests — use buildPdfPageFromScreenshot path */
async function normalizePageDimensions(pdfBuffer, widthMm, heightMm) {
  const doc = await PDFDocument.load(pdfBuffer);
  const { widthPt, heightPt } = exactPageSizePt(widthMm, heightMm);
  applyExactPageBoxes(doc.getPage(0), widthPt, heightPt);
  applyLabelPrintPreferences(doc, { widthMm, heightMm, pageCount: doc.getPageCount() });
  return Buffer.from(await doc.save());
}

module.exports = {
  renderBarcodeLabelsPdf,
  getRowHeights,
  mmToPt,
  normalizePageDimensions,
  exactPageSizePt,
  LABEL_WIDTH_IN,
  LABEL_HEIGHT_IN,
};
