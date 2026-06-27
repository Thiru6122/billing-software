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
  LABEL_PRESETS,
} = await import('../src/utils/barcodePrint.js');

const SAMPLE = buildRetailLabels(['890178231672658225203'], {
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

  assert('document built', !!doc);
  assert('row count', doc.rowCount === expectedRows, `got ${doc.rowCount}, expected ${expectedRows}`);
  assert('sheet count matches rows', doc.sheetCount === expectedRows);
  assert(
    'body height matches rows',
    doc.pageHeightMm === expectedRows * layout.rowPitchMm,
    `got ${doc.pageHeightMm}mm`
  );
  assert('sheet tables', countMatches(html, /<table class="sheet"/g) === expectedRows);
  assert('no landscape in @page', !/landscape/i.test(html));
  assert(
    '@page width × row pitch',
    html.includes(`size: ${layout.sheetWidthMm}mm ${layout.rowPitchMm}mm`),
    `expected ${layout.sheetWidthMm}mm × ${layout.rowPitchMm}mm`
  );
  assert('body height in CSS', html.includes(`height: ${doc.pageHeightMm}mm`));
  assert('last sheet avoids page break', html.includes('page-break-after: avoid'));
  assert('label-inner wrapper', countMatches(html, /class="label-inner"/g) === labelCount);
  assert('barcode SVG present', countMatches(html, /<svg/g) === labelCount);
  assert('PURE company name', html.includes('PURE'));
  assert('product line', html.includes('CASTOR OIL 100ML'));
  assert('auto-close after print', html.includes('onafterprint="window.close();"'));

  if (layout.layoutStyle === 'standard') {
    assert('standard layout class', countMatches(html, /class="label standard"/g) === labelCount);
    assert(
      'split detail rows',
      countMatches(html, /class="detail-row/g) === labelCount * 2
    );
  } else {
    assert('neo layout class', countMatches(html, /class="label neo"/g) === labelCount);
  }

  if (layout.gapMm > 0) {
    assert('inter-row gap rows', countMatches(html, /class="sheet-gap"/g) === expectedRows);
  }

  if (labelCount === 3 && presetId === 'tvs_neo46') {
    assert('one row only feeds 27mm', doc.pageHeightMm === 27, `got ${doc.pageHeightMm}mm`);
    assert('three columns filled', countMatches(html, /class="label standard"/g) === 3);
    assert('no empty sticker cells', countMatches(html, /<td class="label label-empty"/g) === 0);
  }

  if (labelCount === 6 && presetId === 'tvs_neo46') {
    assert('two rows = 54mm total', doc.pageHeightMm === 54, `got ${doc.pageHeightMm}mm`);
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
assert('TVS uses standard layout (customer sample)', tvs.layoutStyle === 'standard');

const zebra = getLabelLayout('zebra_3col');
assert('Zebra row pitch 25mm (no gap)', zebra.rowPitchMm === 25);
assert('Zebra page width 108mm', zebra.sheetWidthMm === 108);

assert('both presets exist', Object.keys(LABEL_PRESETS).length >= 2);

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
  writeFileSync(outPath, doc.html.replace('window.print();', '/* print disabled for preview */'));
  console.log(`\nSample written: ${outPath}`);
}

console.log(`\n======================`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\nAll checks passed — safe for demo print test.');
