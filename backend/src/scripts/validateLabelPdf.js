/**
 * Validates label PDF page count and dimensions — run before customer demo:
 *   node src/scripts/validateLabelPdf.js
 */
require('module-alias/register');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const { JSDOM } = require('jsdom');
const { PDFDocument } = require('pdf-lib');
const { PrintScaling } = require('pdf-lib');
const path = require('path');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

const { renderBarcodeLabelsPdf, getRowHeights, LABEL_WIDTH_IN, LABEL_HEIGHT_IN } = require('../services/barcodeLabelPdfService');

const MM_TO_PT = 72 / 25.4;

async function loadFrontendModule() {
  const modPath = path.join(__dirname, '../../../frontend/src/utils/barcodePrint.js');
  return import(`file:///${modPath.replace(/\\/g, '/')}`);
}

function assert(name, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${name}`);
    return true;
  }
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  return false;
}

async function checkPdf(name, pdfBuffer, { expectedPages, expectedHeightsMm, widthMm = 110 }) {
  console.log(`\n${name}`);
  let passed = 0;
  let failed = 0;

  const run = (label, ok, detail) => {
    if (assert(label, ok, detail)) passed += 1;
    else failed += 1;
  };

  run('PDF buffer created', pdfBuffer && pdfBuffer.length > 100, `size ${pdfBuffer?.length || 0}`);

  const doc = await PDFDocument.load(pdfBuffer);
  const pageCount = doc.getPageCount();
  run('exact page count', pageCount === expectedPages, `got ${pageCount}, expected ${expectedPages}`);
  run('no extra blank page', pageCount <= expectedPages);

  for (let i = 0; i < pageCount; i += 1) {
    const { width, height } = doc.getPage(i).getSize();
    const heightMm = height / MM_TO_PT;
    const widthMmActual = width / MM_TO_PT;
    const widthIn = width / 72;
    const heightIn = height / 72;
    const expectedH = expectedHeightsMm[i];
    run(
      `page ${i + 1} height ~${expectedH}mm`,
      Math.abs(heightMm - expectedH) < 1.5,
      `got ${heightMm.toFixed(2)}mm`
    );
    run(
      `page ${i + 1} width ~${widthMm}mm`,
      Math.abs(widthMmActual - widthMm) < 1.5,
      `got ${widthMmActual.toFixed(2)}mm`
    );
    run(
      `page ${i + 1} width ~${LABEL_WIDTH_IN.toFixed(8)}in`,
      Math.abs(widthIn - LABEL_WIDTH_IN) < 0.02,
      `got ${widthIn.toFixed(8)}in`
    );
    run(
      `page ${i + 1} height ~${(expectedH / 25.4).toFixed(8)}in (${expectedH}mm)`,
      Math.abs(heightIn - expectedH / 25.4) < 0.02,
      `got ${heightIn.toFixed(8)}in`
    );
  }

  const prefs = doc.catalog.getOrCreateViewerPreferences();
  run('PrintScaling None (no Fit to Page)', prefs.getPrintScaling() === PrintScaling.None);
  run('PickTrayByPDFSize enabled', prefs.getPickTrayByPDFSize() === true);

  return { passed, failed };
}

async function main() {
  const { buildPrintDocument, buildRetailLabels } = await loadFrontendModule();
  const sample = buildRetailLabels(['89012345'], {
    companyName: 'PURE',
    productDescription: 'CASTOR OIL 100ML',
    mrp: '39',
    packDate: 'jun 26',
    expiryText: '12 MONTHS',
  });

  let totalPassed = 0;
  let totalFailed = 0;

  const scenarios = [
    {
      name: 'CRITICAL: 1 row (3 labels) — must be exactly 1 PDF page at 25mm',
      labels: Array.from({ length: 3 }, (_, i) => ({ ...sample[0], code: `8900000${i}` })),
      expectedPages: 1,
      expectedHeights: [25],
    },
    {
      name: '2 rows (6 labels) — exactly 2 pages at 25mm each (same orientation)',
      labels: Array.from({ length: 6 }, (_, i) => ({ ...sample[0], code: `8900000${i}` })),
      expectedPages: 2,
      expectedHeights: [25, 25],
    },
  ];

  for (const scenario of scenarios) {
    const doc = buildPrintDocument(scenario.labels, 'Test', { presetId: 'tvs_neo46' });
    const layout = {
      sheetWidthMm: doc.layout.sheetWidthMm,
      labelHeightMm: doc.layout.labelHeightMm,
      rowPitchMm: doc.layout.rowPitchMm,
      gapMm: doc.layout.gapMm,
      rowPageHeightsMm: doc.rowPageHeightsMm,
    };

    const heights = getRowHeights(layout, doc.rowCount);
    const pdfBuffer = await renderBarcodeLabelsPdf(doc.contentHtml, layout, doc.rowCount);
    const result = await checkPdf(scenario.name, pdfBuffer, {
      expectedPages: scenario.expectedPages,
      expectedHeightsMm: scenario.expectedHeights,
    });
    totalPassed += result.passed;
    totalFailed += result.failed;

    if (scenario.expectedPages === 1) {
      console.log('\n  >>> 1-row job: PDF is 1 page only — printer should feed ONE row (25mm), not a full sheet.');
    }
  }

  console.log(`\n======================`);
  console.log(`Results: ${totalPassed} passed, ${totalFailed} failed`);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
