import JsBarcode from 'jsbarcode';

/**
 * TVS LP 46 Neo — discontinuous 3-up roll (customer reference + manual).
 * Media width 110mm (11cm), 3 labels per row, 2mm gap between rows (manual min).
 */
export const LABEL_PRESETS = {
  tvs_neo46: {
    id: 'tvs_neo46',
    name: 'TVS LP 46 Neo (11cm, 3-up)',
    sheetWidthMm: 110,
    labelHeightMm: 25,
    gapMm: 2,
    columns: 3,
    layoutStyle: 'standard',
  },
  zebra_3col: {
    id: 'zebra_3col',
    name: 'Zebra 3-column (108mm × 25mm)',
    sheetWidthMm: 108,
    labelHeightMm: 25,
    gapMm: 0,
    columns: 3,
    layoutStyle: 'standard',
  },
};

export const DEFAULT_LABEL_PRESET = 'tvs_neo46';

const TEMPLATE_STORAGE_KEY = 'saltum-barcode-template';
const LAYOUT_STORAGE_KEY = 'saltum-barcode-layout';

export function getLabelLayout(presetId = DEFAULT_LABEL_PRESET) {
  const preset = LABEL_PRESETS[presetId] || LABEL_PRESETS[DEFAULT_LABEL_PRESET];
  const labelWidthMm = preset.sheetWidthMm / preset.columns;
  const gapMm = preset.gapMm || 0;
  const rowPitchMm = preset.labelHeightMm + gapMm;
  return { ...preset, labelWidthMm, gapMm, rowPitchMm };
}

export function loadLabelPresetId() {
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved === 'tvs_lp46') return 'tvs_neo46';
    return saved || DEFAULT_LABEL_PRESET;
  } catch {
    return DEFAULT_LABEL_PRESET;
  }
}

export function saveLabelPresetId(presetId) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, presetId);
  } catch {
    /* ignore */
  }
}

/** @deprecated use getLabelLayout() */
export const LABEL_LAYOUT = getLabelLayout(DEFAULT_LABEL_PRESET);

export function generateBarcodeValue() {
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `890${Date.now()}${suffix}`;
}

export function createBarcodeSvg(code, options = {}) {
  const style = options.layoutStyle || 'neo';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, String(code), {
    format: 'CODE128',
    width: style === 'neo' ? 1.1 : 1.4,
    height: style === 'neo' ? 28 : 32,
    displayValue: false,
    margin: 0,
    ...options,
  });
  return svg.outerHTML;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getDefaultLabelTemplate(companyName = '') {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'short' }).toLowerCase();
  const year = String(now.getFullYear()).slice(-2);

  return {
    companyName: companyName || 'PURE',
    productDescription: 'CASTOR OIL 100ML',
    mrp: '39',
    packDate: `${month} ${year}`,
    expiryText: '12 MONTHS',
  };
}

export function loadLabelTemplate(companyName = '') {
  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (saved) {
      return { ...getDefaultLabelTemplate(companyName), ...JSON.parse(saved) };
    }
  } catch {
    /* ignore */
  }
  return getDefaultLabelTemplate(companyName);
}

export function saveLabelTemplate(template) {
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(template));
  } catch {
    /* ignore */
  }
}

export function buildRetailLabels(codes, template = {}) {
  const t = { ...getDefaultLabelTemplate(), ...template };
  return codes.map((code) => ({
    code,
    companyName: t.companyName,
    productDescription: t.productDescription,
    mrp: t.mrp,
    packDate: t.packDate,
    expiryText: t.expiryText,
  }));
}

export function buildBlankLabels(codes, template) {
  return buildRetailLabels(codes, template);
}

export function buildProductLabels(products, { useMoneyFormatter, template } = {}) {
  return products
    .filter((p) => p.barcode)
    .map((p) => ({
      code: p.barcode,
      companyName: template?.companyName || '',
      productDescription: p.name || template?.productDescription || '',
      mrp: template?.mrp ?? (useMoneyFormatter ? useMoneyFormatter({ amount: p.price }) : String(p.price ?? '')),
      packDate: template?.packDate || '',
      expiryText: template?.expiryText || '',
    }));
}

function renderRetailLabelHtml(label, layout) {
  const mrpText = String(label.mrp ?? '').trim();
  const mrpProductLine = mrpText
    ? `MRP.RS.${mrpText} ${label.productDescription || ''}`.trim()
    : String(label.productDescription || '');
  const footerLine = `pkd:${label.packDate || ''} EXP.${label.expiryText || ''}`;
  const barcode = createBarcodeSvg(label.code, { layoutStyle: layout.layoutStyle });

  if (layout.layoutStyle === 'neo') {
    return `
      <td class="label neo">
        <div class="label-inner">
          <div class="company">${escapeHtml(label.companyName)}</div>
          <div class="barcode-wrap">${barcode}</div>
          <div class="code">${escapeHtml(label.code)}</div>
          <div class="info-line">${escapeHtml(mrpProductLine)}</div>
          <div class="info-line footer">${escapeHtml(footerLine)}</div>
        </div>
      </td>
    `;
  }

  const mrpLine = mrpText ? `MRP.RS.${mrpText}` : '';
  return `
    <td class="label standard">
      <div class="label-inner">
        <div class="company">${escapeHtml(label.companyName)}</div>
        <div class="barcode-wrap">${barcode}</div>
        <div class="code">${escapeHtml(label.code)}</div>
        <div class="detail-row">
          <span class="left">${escapeHtml(mrpLine)}</span>
          <span class="right">${escapeHtml(label.productDescription)}</span>
        </div>
        <div class="detail-row footer">
          <span class="left">pkd:${escapeHtml(label.packDate)}</span>
          <span class="right">EXP.${escapeHtml(label.expiryText)}</span>
        </div>
      </div>
    </td>
  `;
}

function padRow(row, columns) {
  const padded = [...row];
  while (padded.length < columns) {
    padded.push(null);
  }
  return padded.slice(0, columns);
}

function chunkRows(labels, columns) {
  const rows = [];
  for (let i = 0; i < labels.length; i += columns) {
    rows.push(labels.slice(i, i + columns));
  }
  return rows;
}

function renderSheetRowHtml(labels, layout) {
  const cells = padRow(labels, layout.columns)
    .map((label) =>
      label ? renderRetailLabelHtml(label, layout) : '<td class="label label-empty"></td>'
    )
    .join('');
  const gapRow =
    layout.gapMm > 0
      ? `<tr><td class="sheet-gap" colspan="${layout.columns}"></td></tr>`
      : '';
  return `<table class="sheet" cellspacing="0" cellpadding="0"><tr>${cells}</tr>${gapRow}</table>`;
}

function getLayoutCss(layout, rowCount = 1) {
  const { sheetWidthMm, labelWidthMm, labelHeightMm, rowPitchMm, gapMm } = layout;
  const bodyHeightMm = rowCount * rowPitchMm;

  const neoCss =
    layout.layoutStyle === 'neo'
      ? `
          .label.neo {
            padding: 0.5mm 1mm;
            text-align: center;
          }
          .label.neo .company {
            font-weight: 700;
            font-size: 7pt;
            line-height: 1;
            letter-spacing: 0.4px;
            margin-bottom: 0.4mm;
          }
          .label.neo .barcode-wrap {
            line-height: 0;
            height: 7mm;
            overflow: hidden;
            margin-bottom: 0.3mm;
            width: 100%;
          }
          .label.neo .barcode-wrap svg {
            width: 100%;
            height: 7mm;
            display: block;
          }
          .label.neo .code {
            font-size: 5.5pt;
            line-height: 1;
            margin-bottom: 0.4mm;
          }
          .label.neo .info-line {
            font-size: 5pt;
            line-height: 1.05;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            max-width: 100%;
          }
          .label.neo .info-line.footer {
            margin-top: 0.2mm;
          }
        `
      : `
          .label.standard {
            padding: 0.6mm 1mm;
            text-align: center;
          }
          .label.standard .company {
            font-weight: 700;
            font-size: 7.5pt;
            line-height: 1.1;
            margin-bottom: 0.3mm;
          }
          .label.standard .barcode-wrap {
            width: 100%;
            line-height: 0;
            margin-bottom: 0.3mm;
          }
          .label.standard .barcode-wrap svg {
            width: 100%;
            height: 8.5mm;
            display: block;
          }
          .label.standard .code {
            font-size: 6pt;
            line-height: 1.1;
            margin-bottom: 0.4mm;
          }
          .label.standard .detail-row {
            display: flex;
            justify-content: space-between;
            font-size: 5.2pt;
            line-height: 1.15;
            gap: 1mm;
            width: 100%;
            max-width: 100%;
          }
          .label.standard .detail-row .right {
            text-align: right;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        `;

  return `
    @page {
      size: ${sheetWidthMm}mm ${rowPitchMm}mm;
      margin: 0;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${sheetWidthMm}mm;
      height: ${bodyHeightMm}mm;
      max-height: ${bodyHeightMm}mm;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: ${sheetWidthMm}mm;
      height: ${rowPitchMm}mm;
      max-height: ${rowPitchMm}mm;
      border-collapse: collapse;
      table-layout: fixed;
      page-break-after: always;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow: hidden;
    }
    .sheet:last-child {
      page-break-after: avoid;
    }
    .label {
      width: ${labelWidthMm}mm;
      height: ${labelHeightMm}mm;
      max-height: ${labelHeightMm}mm;
      overflow: hidden;
      vertical-align: middle;
    }
    .label-inner {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: stretch;
      width: 100%;
      height: ${labelHeightMm}mm;
      max-height: ${labelHeightMm}mm;
      overflow: hidden;
    }
    .label-empty {
      padding: 0;
    }
    .sheet > tr:first-child {
      height: ${labelHeightMm}mm;
    }
    .sheet-gap {
      height: ${gapMm}mm;
      max-height: ${gapMm}mm;
      line-height: 0;
      font-size: 0;
      padding: 0;
    }
    ${neoCss}
    @media print {
      html, body {
        width: ${sheetWidthMm}mm !important;
        height: ${bodyHeightMm}mm !important;
        max-height: ${bodyHeightMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .sheet {
        width: ${sheetWidthMm}mm !important;
        height: ${rowPitchMm}mm !important;
        max-height: ${rowPitchMm}mm !important;
      }
      .sheet:last-child {
        page-break-after: avoid !important;
      }
    }
    @media screen {
      body { padding: 8px; background: #f0f0f0; width: auto; }
      .sheet {
        margin-bottom: 8px;
        background: #fff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.15);
      }
    }
  `;
}

function renderPrintHtml(labels, documentTitle, layout) {
  const rows = chunkRows(labels, layout.columns);
  const rowsHtml = rows.map((row) => renderSheetRowHtml(row, layout)).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentTitle)}</title>
        <style>${getLayoutCss(layout, rows.length)}</style>
      </head>
      <body onload="setTimeout(function(){ window.print(); }, 300);" onafterprint="window.close();">
        ${rowsHtml}
      </body>
    </html>
  `;
}

/** Build print HTML + metadata (for tests and preview export). */
export function buildPrintDocument(labels, documentTitle = 'Barcode Labels', options = {}) {
  if (!labels?.length) return null;

  const presetId = options.presetId || DEFAULT_LABEL_PRESET;
  const layout = getLabelLayout(presetId);
  const rows = chunkRows(labels, layout.columns);

  return {
    html: renderPrintHtml(labels, documentTitle, layout),
    presetId,
    layout,
    labelCount: labels.length,
    rowCount: rows.length,
    pageHeightMm: rows.length * layout.rowPitchMm,
    sheetCount: rows.length,
  };
}

export function printBarcodeLabels(labels, documentTitle = 'Barcode Labels', options = {}) {
  const doc = buildPrintDocument(labels, documentTitle, options);
  if (!doc) return false;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.write(doc.html);
  printWindow.document.close();
  return true;
}

/** Full 11cm row preview — 3 labels like customer sample */
export function renderLabelPreviewHtml(label, presetId) {
  const layout = getLabelLayout(presetId || loadLabelPresetId());
  const row = Array.from({ length: layout.columns }, () => label);
  return renderSheetRowHtml(row, layout);
}

export function getPreviewScaleStyle(presetId) {
  const layout = getLabelLayout(presetId || loadLabelPresetId());
  const scale = 0.85;
  return {
    width: `${layout.sheetWidthMm}mm`,
    height: `${layout.rowPitchMm}mm`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    marginBottom: `${layout.rowPitchMm * (scale - 1) + 4}mm`,
  };
}

export function getPreviewContainerStyle(presetId) {
  const layout = getLabelLayout(presetId || loadLabelPresetId());
  const scale = 0.85;
  return {
    width: `${layout.sheetWidthMm * scale}mm`,
    minHeight: `${layout.rowPitchMm * scale + 4}mm`,
    overflow: 'visible',
  };
}
