/**
 * Barcode print validation — run before customer demo:
 *   node scripts/validate-barcode-print.mjs
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
globalThis.document = dom.window.document;
globalThis.window = dom.window;

const {
  buildPrintDocument,
  buildRetailLabels,
  getLabelLayout,
  generateBarcodeValue,
  LABEL_PRESETS,
} = await import('../src/utils/barcodePrint.js');

const SAMPLE = buildRetailLabels(['89012345'], {
  enterpriseLine1: 'Ashwin',
  companyName: 'PURE',
  productDescription: 'CASTOR OIL 100ML',
  mrp: '39',
  packDate: 'jun 26',
  expiryText: '12 MONTHS',
});

let passed = 0;
let failed = 0;

function assert(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function countMatches(html, pattern) {
  const re = pattern.global ? pattern : new RegExp(pattern.source, pattern.flags + (pattern.global ? '' : 'g'));
  return (html.match(re) || []).length;
}

function runScenario(name, labelCount, presetId = 'tvs_neo46') {
  console.log(`\n${name} (${labelCount} labels, ${presetId})`);
  const labels = Array.from({ length: labelCount }, (_, i) => ({
    ...SAMPLE[0],
    code: `${SAMPLE[0].code}${i}`,
  }));
  const doc = buildPrintDocument(labels, 'Test', { presetId });
  const layout = getLabelLayout(presetId);
  const expectedRows = Math.ceil(labelCount / layout.columns);
  const html = doc.html;

  const expectedHeightMm =
    expectedRows <= 1
      ? layout.labelHeightMm
      : (expectedRows - 1) * layout.rowPitchMm + layout.labelHeightMm;

  assert('document built', !!doc);
  assert('row count', doc.rowCount === expectedRows, `got ${doc.rowCount}, expected ${expectedRows}`);
  assert('sheet count matches rows', doc.sheetCount === expectedRows);
  assert(
    'body height matches rows',
    doc.pageHeightMm === expectedHeightMm,
    `got ${doc.pageHeightMm}mm, expected ${expectedHeightMm}mm`
  );
  assert('sheet tables', countMatches(html, /<table class="sheet/g) === expectedRows);
  assert('no landscape in @page', !/landscape/i.test(html));
  assert(
    '@page last row size',
    html.includes(`size: ${layout.sheetWidthMm}mm ${layout.labelHeightMm}mm`),
    `expected ${layout.sheetWidthMm}mm × ${layout.labelHeightMm}mm last page`
  );
  assert('body height in CSS', html.includes(`height: ${doc.pageHeightMm}mm`));
  assert('last sheet avoids page break', html.includes('page-break-after: avoid'));
  assert('label-inner wrapper', countMatches(html, /class="label-inner"/g) === labelCount);
  assert('barcode SVG present', countMatches(html, /<svg/g) === labelCount);
  assert('PURE company name', html.includes('PURE'));
  assert('enterprise line above brand', html.includes('class="enterprise-line"'));
  assert('default enterprise name', html.includes('Ashwin'));
  assert('no enterprise line 2', !html.includes('>enterprise</div>'));
  assert('one enterprise line per label', countMatches(html, /class="enterprise-line"/g) === labelCount);
  assert('product line', html.includes('CASTOR OIL 100ML'));
  assert('auto-close after print', html.includes('onafterprint="window.close();"'));
  assert('print setup notice (screen)', html.includes('print-setup-notice'));
  assert('letter warning in setup', /letter/i.test(html));
  assert('manual print button', html.includes('print-now-btn'));
  assert('named label page', html.includes('@page label-row-last'));
  assert('last-row sheet class', html.includes('class="sheet last-row"'));
  assert('no letter @page in label doc', !/@page\s*\{[^}]*letter/i.test(html));

  assert('vertically centered label inner', html.includes('justify-content: center'));
  assert('top spacer above company name', html.includes('class="top-spacer"'));
  assert('22mm content block', html.includes('height: 22mm'));
  assert('3mm top spacer', html.includes('height: 3mm'));
  assert('horizontal padding on label', html.includes('padding: 0 1.2mm'));
  assert('compact barcode height', html.includes('height: 4.5mm'));
  if (layout.layoutStyle === 'neo') {
    assert('neo barcode number style', html.includes('font-size: 7.5pt'));
    assert('neo footer line style', html.includes('font-size: 8pt'));
    assert('neo mrp+product line style', html.includes('font-size: 7.5pt'));
    assert('bold dark product lines', html.includes('font-weight: 700'));
    assert('neo company name', html.includes('font-size: 9pt'));
    assert('neo combined mrp product line', html.includes('class="info-line mrp-product"'));
    assert('MRP and product on one line', html.includes('MRP.RS.39 CASTOR OIL 100ML'));
  } else {
    assert('standard barcode number style', html.includes('font-size: 8pt'));
    assert('standard footer line style', html.includes('font-size: 7.5pt'));
    assert('standard mrp+product line style', html.includes('font-size: 7pt'));
    assert('standard combined mrp product line', html.includes('class="info-line mrp-product"'));
  }

  if (layout.layoutStyle === 'standard') {
    assert('standard layout class', countMatches(html, /class="label standard"/g) === labelCount);
  } else {
    assert('neo layout class', countMatches(html, /class="label neo"/g) === labelCount);
  }

  if (layout.gapMm > 0 && expectedRows > 1) {
    assert('inter-row gap rows', countMatches(html, /class="sheet-gap"/g) === expectedRows - 1);
  } else if (layout.gapMm > 0 && labelCount === 3) {
    assert('single row has no gap feed', countMatches(html, /class="sheet-gap"/g) === 0);
    assert('single row no page-break-after always only', !/\.sheet\s*\{[^}]*page-break-after:\s*always/.test(doc.contentHtml || ''));
    assert('row page heights in doc', doc.rowPageHeightsMm?.join(',') === '25');
  }

  if (labelCount === 3 && presetId === 'tvs_neo46') {
    assert('one row only feeds 25mm', doc.pageHeightMm === 25, `got ${doc.pageHeightMm}mm`);
    assert('three columns filled', countMatches(html, /class="label neo"/g) === 3);
    assert('no empty sticker cells', countMatches(html, /<td class="label label-empty"/g) === 0);
    assert('content HTML for PDF', doc.contentHtml?.includes('label-row-last'));
  }

  if (labelCount === 6 && presetId === 'tvs_neo46') {
    assert('two rows = 52mm HTML preview total', doc.pageHeightMm === 52, `got ${doc.pageHeightMm}mm`);
    assert('PDF row heights all 25mm', doc.rowPageHeightsMm?.join(',') === '25,25');
  }

  if (labelCount === 6 && presetId === 'zebra_3col') {
    assert('two zebra rows = 50mm total', doc.pageHeightMm === 50, `got ${doc.pageHeightMm}mm`);
  }
}

console.log('Barcode print validation\n======================');

// Layout math
const tvs = getLabelLayout('tvs_neo46');
assert('TVS label width ~36.67mm', Math.abs(tvs.labelWidthMm - 110 / 3) < 0.01);
assert('TVS row pitch 27mm', tvs.rowPitchMm === 27);
assert('TVS uses neo layout (customer sample)', tvs.layoutStyle === 'neo');

const zebra = getLabelLayout('zebra_3col');
assert('Zebra row pitch 25mm (no gap)', zebra.rowPitchMm === 25);
assert('Zebra page width 108mm', zebra.sheetWidthMm === 108);

assert('both presets exist', Object.keys(LABEL_PRESETS).length >= 2);
assert('barcode is 8 digits', /^\d{8}$/.test(generateBarcodeValue()));
assert('barcode starts with 89', /^89\d{6}$/.test(generateBarcodeValue()));

// XSS escape
const xssDoc = buildPrintDocument(
  [{ ...SAMPLE[0], companyName: '<script>alert(1)</script>' }],
  'XSS',
  { presetId: 'tvs_neo46' }
);
assert('HTML escaped in output', xssDoc.html.includes('&lt;script&gt;'));
assert('no raw script tag in company', !xssDoc.html.includes('<script>alert(1)</script>'));

// Print scenarios
runScenario('Single row (demo default)', 3, 'tvs_neo46');
runScenario('Two rows', 6, 'tvs_neo46');
runScenario('Partial last row', 4, 'tvs_neo46');
runScenario('Max batch slice', 30, 'tvs_neo46');
runScenario('Zebra preset one row', 3, 'zebra_3col');
runScenario('Zebra two rows', 6, 'zebra_3col');

// Write sample HTML files for manual browser check before demo
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'tmp', 'barcode-print-samples');
mkdirSync(outDir, { recursive: true });

for (const [count, name] of [
  [3, '3-labels-1-row'],
  [6, '6-labels-2-rows'],
]) {
  const labels = Array.from({ length: count }, (_, i) => ({
    ...SAMPLE[0],
    code: `89017823167265822520${i}`,
  }));
  const doc = buildPrintDocument(labels, name, { presetId: 'tvs_neo46' });
  const outPath = join(outDir, `${name}.html`);
  writeFileSync(outPath, doc.contentHtml || doc.html);
  console.log(`\nSample written: ${outPath}`);
}

console.log(`\n======================`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\nAll checks passed — safe for demo print test.');
