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
    layoutStyle: 'neo',
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

/** Safe inner margin inside each sticker (mm). */
export const LABEL_INNER_PADDING_V_MM = 0;
export const LABEL_INNER_PADDING_H_MM = 1.2;
/** Printable content block height (mm); remainder of 25 mm label is top spacer for Adobe/printer offset. */
export const LABEL_CONTENT_HEIGHT_MM = 22;
export const LABEL_TOP_SPACER_MM = 3;

const TEMPLATE_STORAGE_KEY = 'saltum-barcode-template';
const LAYOUT_STORAGE_KEY = 'saltum-barcode-layout';

export function getLabelLayout(presetId = DEFAULT_LABEL_PRESET) {
  const preset = LABEL_PRESETS[presetId] || LABEL_PRESETS[DEFAULT_LABEL_PRESET];
  const labelWidthMm = preset.sheetWidthMm / preset.columns;
  const gapMm = preset.gapMm || 0;
  const rowPitchMm = preset.labelHeightMm + gapMm;
  return {
    ...preset,
    labelWidthMm,
    gapMm,
    rowPitchMm,
    paddingVMm: LABEL_INNER_PADDING_V_MM,
    paddingHMm: LABEL_INNER_PADDING_H_MM,
    contentHeightMm: LABEL_CONTENT_HEIGHT_MM,
    topSpacerMm: LABEL_TOP_SPACER_MM,
  };
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
  const six = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  return `89${six}`;
}

export function createBarcodeSvg(code, options = {}) {
  const style = options.layoutStyle || 'neo';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const isStandard = style === 'standard';
  JsBarcode(svg, String(code), {
    format: 'CODE128',
    width: isStandard ? 1.5 : 1.0,
    height: isStandard ? 20 : 18,
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
  const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = now.getDate();

  return {
    enterpriseLine1: 'Ashwin',
    companyName: companyName || 'PURE',
    productDescription: 'CASTOR OIL 100ML',
    mrp: '',
    packDate: `${month} ${day}`,
    expiryText: '12 MONTHS',
  };
}

/** Plain MRP number for label text (no currency symbol). */
export function formatLabelMrp(price) {
  if (price == null || price === '') return '';
  const amount = Number(price);
  if (Number.isNaN(amount)) return String(price).trim();
  if (Math.abs(amount - Math.round(amount)) < 0.001) return String(Math.round(amount));
  return amount.toFixed(2).replace(/\.?0+$/, '') || amount.toFixed(2);
}

export function loadLabelTemplate(companyName = '') {
  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const defaults = getDefaultLabelTemplate(companyName);
      const enterpriseLine1 =
        parsed.enterpriseLine1 ||
        (parsed.enterpriseName ? String(parsed.enterpriseName).trim().split(/\s+/)[0] : '') ||
        defaults.enterpriseLine1;
      return { ...defaults, ...parsed, enterpriseLine1 };
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
    enterpriseLine1: t.enterpriseLine1,
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
  const defaults = getDefaultLabelTemplate();
  const t = { ...defaults, ...template };

  return products
    .filter((p) => p.barcode)
    .map((p) => ({
      code: p.barcode,
      enterpriseLine1: p.enterpriseLine1 || t.enterpriseLine1,
      companyName: p.companyName || t.companyName,
      productDescription: p.name || t.productDescription || '',
      mrp: formatLabelMrp(p.price),
      packDate: p.packDate || t.packDate,
      expiryText: p.expiryText || t.expiryText,
    }));
}

function renderRetailLabelHtml(label, layout) {
  const mrpText = String(label.mrp ?? '').trim();
  const productLine = String(label.productDescription || '').trim();
  const mrpProductLine = mrpText
    ? `MRP.RS.${mrpText} ${productLine}`.trim()
    : productLine;
  const footerLine = `pkd:${label.packDate || ''} EXP.${label.expiryText || ''}`;
  const barcode = createBarcodeSvg(label.code, { layoutStyle: layout.layoutStyle });
  const labelClass = layout.layoutStyle === 'neo' ? 'label neo' : 'label standard';

  return `
    <td class="${labelClass}">
      <div class="label-inner">
        <div class="top-spacer" aria-hidden="true"></div>
        <div class="label-content">
          <div class="company">${escapeHtml(label.companyName)}</div>
          <div class="barcode-wrap">${barcode}</div>
          <div class="code">${escapeHtml(label.code)}</div>
          ${mrpProductLine ? `<div class="info-line mrp-product">${escapeHtml(mrpProductLine)}</div>` : ''}
          <div class="info-line footer">${escapeHtml(footerLine)}</div>
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

function getRowPageHeightsMm(layout, rowCount = 1) {
  const rows = Math.max(1, rowCount);
  // Every PDF page is exactly label height (25mm). Roll gap is handled by the printer driver.
  return Array.from({ length: rows }, () => layout.labelHeightMm);
}

function getPrintMetrics(layout, rowCount = 1) {
  const { labelHeightMm, rowPitchMm } = layout;
  const rows = Math.max(1, rowCount);
  const bodyHeightMm = rows <= 1 ? labelHeightMm : (rows - 1) * rowPitchMm + labelHeightMm;
  return { bodyHeightMm, rows, singleRow: rows <= 1 };
}

function renderSheetRowHtml(labels, layout, { isLastRow = true } = {}) {
  const cells = padRow(labels, layout.columns)
    .map((label) =>
      label ? renderRetailLabelHtml(label, layout) : '<td class="label label-empty"></td>'
    )
    .join('');
  const includeGap = layout.gapMm > 0 && !isLastRow;
  const gapRow = includeGap
    ? `<tr><td class="sheet-gap" colspan="${layout.columns}"></td></tr>`
    : '';
  const sheetClass = isLastRow ? 'sheet last-row' : 'sheet';
  const sheetHeightMm = isLastRow ? layout.labelHeightMm : layout.rowPitchMm;
  return `<table class="${sheetClass}" cellspacing="0" cellpadding="0" style="height:${sheetHeightMm}mm"><tr>${cells}</tr>${gapRow}</table>`;
}

function getPrintPageSizeCss(layout) {
  const { sheetWidthMm, labelHeightMm, rowPitchMm } = layout;
  const widthIn = (sheetWidthMm / 25.4).toFixed(3);
  const rowIn = (rowPitchMm / 25.4).toFixed(3);
  const lastIn = (labelHeightMm / 25.4).toFixed(3);
  return `
    @page label-row {
      size: ${sheetWidthMm}mm ${rowPitchMm}mm;
      size: ${widthIn}in ${rowIn}in;
      margin: 0;
    }
    @page label-row-last {
      size: ${sheetWidthMm}mm ${labelHeightMm}mm;
      size: ${widthIn}in ${lastIn}in;
      margin: 0;
    }
  `;
}

function renderPrintSetupHtml(layout, rowCount, setup = {}) {
  const metrics = getPrintMetrics(layout, rowCount);
  const pageSize =
    metrics.singleRow
      ? `${layout.sheetWidthMm} × ${layout.labelHeightMm} mm (one row only)`
      : `${layout.sheetWidthMm} × ${metrics.bodyHeightMm} mm total`;
  const title = setup.title || 'Label print setup';
  const letterWarning =
    setup.letterWarning ||
    'Do NOT use Letter paper. Labels print as a custom-size PDF — one short feed per row, not a full sheet.';
  const steps =
    setup.steps ||
    [
      `Paper / label size: ${pageSize}`,
      'Orientation: Portrait',
      'Scale: 100%, Margins: None',
      metrics.singleRow
        ? `Only 1 row (${layout.labelHeightMm}mm) — printer must NOT eject empty rows`
        : `${rowCount} row(s) — ${layout.rowPitchMm}mm per row except last (${layout.labelHeightMm}mm)`,
    ];
  const printButton = setup.printButton || 'Print labels';

  const stepsHtml = steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('');

  return `
    <div class="print-setup-notice">
      <h1>${escapeHtml(title)}</h1>
      <p class="letter-warning">${escapeHtml(letterWarning)}</p>
      <ol>${stepsHtml}</ol>
      <button type="button" class="print-now-btn" onclick="window.print()">${escapeHtml(printButton)}</button>
    </div>
  `;
}

function getLayoutCss(layout, rowCount = 1) {
  const {
    sheetWidthMm,
    labelWidthMm,
    labelHeightMm,
    rowPitchMm,
    gapMm,
    paddingHMm,
    contentHeightMm,
    topSpacerMm,
  } = layout;
  const padH = paddingHMm ?? LABEL_INNER_PADDING_H_MM;
  const contentH = contentHeightMm ?? LABEL_CONTENT_HEIGHT_MM;
  const topSpacer = topSpacerMm ?? LABEL_TOP_SPACER_MM;
  const metrics = getPrintMetrics(layout, rowCount);
  const { bodyHeightMm } = metrics;

  const infoLineCss = `
          .info-line {
            font-size: 6pt;
            line-height: 1.08;
            width: 100%;
            max-width: 100%;
            text-align: center;
            overflow: hidden;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .info-line.mrp-product {
            font-size: 6pt;
            font-weight: 700;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
          .info-line.footer {
            font-size: 6pt;
            font-weight: 700;
            margin-top: 0.05mm;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
        `;

  const labelBodyCss = `
          .company {
            font-weight: 700;
            font-size: 9pt;
            line-height: 1;
            letter-spacing: 0.3px;
            margin-bottom: 0.25mm;
          }
          .barcode-wrap {
            line-height: 0;
            height: 4.5mm;
            overflow: hidden;
            margin: 0 auto 0.2mm;
            width: 90%;
            max-width: 90%;
          }
          .barcode-wrap svg {
            width: 100%;
            height: 4.5mm;
            display: block;
          }
          .code {
            font-size: 8pt;
            font-weight: 700;
            line-height: 1;
            letter-spacing: 0.4px;
            margin-bottom: 0.25mm;
          }
          ${infoLineCss}
        `;

  const neoCss =
    layout.layoutStyle === 'neo'
      ? `
          .label.neo {
            padding: 0;
            text-align: center;
          }
          ${labelBodyCss}
        `
      : `
          .label.standard {
            padding: 0;
            text-align: center;
            vertical-align: middle;
          }
          ${labelBodyCss}
        `;

  return `
    ${getPrintPageSizeCss(layout)}
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-content {
      width: ${sheetWidthMm}mm;
    }
    .sheet {
      page: label-row;
      width: ${sheetWidthMm}mm;
      height: ${rowPitchMm}mm;
      max-height: ${rowPitchMm}mm;
      border-collapse: collapse;
      table-layout: fixed;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow: hidden;
    }
    .sheet:not(:last-child) {
      page-break-after: always;
      break-after: page;
    }
    .sheet.last-row {
      page: label-row-last;
      height: ${labelHeightMm}mm;
      max-height: ${labelHeightMm}mm;
    }
    .sheet:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
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
      justify-content: flex-start;
      align-items: stretch;
      width: 100%;
      height: ${labelHeightMm}mm;
      max-height: ${labelHeightMm}mm;
      overflow: hidden;
      box-sizing: border-box;
      padding: 0 ${padH}mm;
    }
    .top-spacer {
      flex-shrink: 0;
      height: ${topSpacer}mm;
      max-height: ${topSpacer}mm;
      line-height: 0;
      font-size: 0;
    }
    .label-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: stretch;
      flex: 0 0 ${contentH}mm;
      height: ${contentH}mm;
      max-height: ${contentH}mm;
      overflow: hidden;
      box-sizing: border-box;
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
      .print-setup-notice {
        display: none !important;
      }
      html, body {
        width: ${sheetWidthMm}mm !important;
        height: ${bodyHeightMm}mm !important;
        max-height: ${bodyHeightMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .print-content {
        width: ${sheetWidthMm}mm !important;
      }
      .sheet {
        width: ${sheetWidthMm}mm !important;
        page: label-row;
      }
      .sheet.last-row {
        height: ${labelHeightMm}mm !important;
        max-height: ${labelHeightMm}mm !important;
        page: label-row-last !important;
      }
      .sheet:not(.last-row) {
        height: ${rowPitchMm}mm !important;
        max-height: ${rowPitchMm}mm !important;
      }
      .sheet:last-child {
        page-break-after: avoid !important;
      }
    }
    @media screen {
      body {
        padding: 16px;
        background: #f0f0f0;
        width: auto;
        max-width: 720px;
      }
      .print-setup-notice {
        background: #fff;
        border: 1px solid #d9d9d9;
        border-left: 4px solid #faad14;
        border-radius: 6px;
        padding: 16px 20px;
        margin-bottom: 16px;
        font-size: 14px;
        line-height: 1.5;
      }
      .print-setup-notice h1 {
        margin: 0 0 8px;
        font-size: 18px;
      }
      .print-setup-notice .letter-warning {
        margin: 0 0 12px;
        color: #ad6800;
        font-weight: 600;
      }
      .print-setup-notice ol {
        margin: 0 0 16px;
        padding-left: 20px;
      }
      .print-now-btn {
        background: #1677ff;
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 8px 20px;
        font-size: 15px;
        cursor: pointer;
      }
      .print-now-btn:hover {
        background: #4096ff;
      }
      .print-content .sheet {
        margin-bottom: 8px;
        background: #fff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.15);
      }
    }
  `;
}

function renderSheetsHtml(labels, layout) {
  const rows = chunkRows(labels, layout.columns);
  return rows
    .map((row, index) => renderSheetRowHtml(row, layout, { isLastRow: index === rows.length - 1 }))
    .join('');
}

function renderPrintContentHtml(labels, layout) {
  const rows = chunkRows(labels, layout.columns);
  const metrics = getPrintMetrics(layout, rows.length);
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Barcode Labels</title>
        <style>${getLayoutCss(layout, rows.length)}</style>
      </head>
      <body style="width:${layout.sheetWidthMm}mm;height:${metrics.bodyHeightMm}mm;margin:0;padding:0;overflow:hidden;">
        ${renderSheetsHtml(labels, layout)}
      </body>
    </html>
  `;
}

function renderPrintHtml(labels, documentTitle, layout, options = {}) {
  const rows = chunkRows(labels, layout.columns);
  const rowsHtml = renderSheetsHtml(labels, layout);
  const setupHtml = renderPrintSetupHtml(layout, rows.length, options.printSetup);
  const autoPrint = options.autoPrint === true;
  const bodyAttrs = autoPrint
    ? ' onload="setTimeout(function(){ window.print(); }, 300);" onafterprint="window.close();"'
    : ' onafterprint="window.close();"';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentTitle)}</title>
        <style>${getLayoutCss(layout, rows.length)}</style>
      </head>
      <body${bodyAttrs}>
        ${setupHtml}
        <div class="print-content">
          ${rowsHtml}
        </div>
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
  const metrics = getPrintMetrics(layout, rows.length);

  return {
    html: renderPrintHtml(labels, documentTitle, layout, options),
    contentHtml: renderPrintContentHtml(labels, layout),
    presetId,
    layout,
    labelCount: labels.length,
    rowCount: rows.length,
    pageHeightMm: metrics.bodyHeightMm,
    rowPageHeightsMm: getRowPageHeightsMm(layout, rows.length),
    sheetCount: rows.length,
    singleRow: metrics.singleRow,
  };
}

async function parseApiErrorPayload(data) {
  try {
    const text =
      data instanceof Blob
        ? await data.text()
        : typeof data === 'string'
          ? data
          : new TextDecoder().decode(data);
    const json = JSON.parse(text);
    return json.message || json.error?.message || 'Could not generate label PDF';
  } catch {
    return 'Could not generate label PDF';
  }
}

async function ensurePdfBlob(data) {
  const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 100) {
    throw new Error('Label PDF is empty — restart the backend server and try again.');
  }

  const isPdf =
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  if (!isPdf) {
    throw new Error(await parseApiErrorPayload(bytes));
  }

  return new Blob([buffer], { type: 'application/pdf' });
}

/** Edge/Chrome PDF viewer fails on blob: URLs opened with noopener — use data URL instead. */
function openPdfInBrowser(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const opened = window.open(reader.result, '_blank');
      if (!opened) {
        reject(new Error('Pop-up blocked — allow pop-ups for this site or use Download PDF.'));
        return;
      }
      resolve(true);
    };
    reader.onerror = () => reject(new Error('Could not open label PDF'));
    reader.readAsDataURL(blob);
  });
}

function downloadPdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

async function fetchLabelPdf(doc) {
  const { default: axios } = await import('axios');
  const { API_BASE_URL } = await import('@/config/serverApiConfig');
  const storePersist = (await import('@/redux/storePersist')).default;
  const auth = storePersist.get('auth');

  let response;
  try {
    response = await axios.post(
      `${API_BASE_URL}product/printBarcodeLabels`,
      {
        html: doc.contentHtml,
        rowCount: doc.rowCount,
        rowPageHeightsMm: doc.rowPageHeightsMm,
        layout: {
          sheetWidthMm: doc.layout.sheetWidthMm,
          labelHeightMm: doc.layout.labelHeightMm,
          labelWidthMm: doc.layout.labelWidthMm,
          rowPitchMm: doc.layout.rowPitchMm,
          gapMm: doc.layout.gapMm,
          columns: doc.layout.columns,
          layoutStyle: doc.layout.layoutStyle,
          paddingVMm: doc.layout.paddingVMm,
          paddingHMm: doc.layout.paddingHMm,
          contentHeightMm: doc.layout.contentHeightMm,
          topSpacerMm: doc.layout.topSpacerMm,
        },
      },
      {
        responseType: 'arraybuffer',
        withCredentials: true,
        headers: auth?.current?.token ? { Authorization: `Bearer ${auth.current.token}` } : {},
      }
    );
  } catch (error) {
    const payload = error.response?.data;
    if (payload) {
      throw new Error(await parseApiErrorPayload(payload));
    }
    throw new Error(error.message || 'Could not reach label PDF server');
  }

  if (response.status !== 200) {
    throw new Error(await parseApiErrorPayload(response.data));
  }

  return ensurePdfBlob(response.data);
}

/** Download or open label PDF from server — no browser HTML print dialog. */
export async function deliverBarcodeLabelPdf(
  labels,
  documentTitle = 'Barcode Labels',
  options = {}
) {
  const doc = buildPrintDocument(labels, documentTitle, options);
  if (!doc) return { success: false, message: 'No labels to print' };

  try {
    const blob = await fetchLabelPdf(doc);
    const filename =
      options.filename ||
      `barcode-labels-${labels.length}-${new Date().toISOString().slice(0, 10)}.pdf`;
    const mode = options.mode || 'download';

    if (mode === 'open') {
      try {
        await openPdfInBrowser(blob);
      } catch (openError) {
        downloadPdfBlob(blob, filename);
        return {
          success: true,
          labelCount: labels.length,
          rowCount: doc.rowCount,
          pageHeightMm: doc.pageHeightMm,
          mode: 'download',
          message: openError.message,
        };
      }
    } else {
      downloadPdfBlob(blob, filename);
    }

    return {
      success: true,
      labelCount: labels.length,
      rowCount: doc.rowCount,
      pageHeightMm: doc.pageHeightMm,
      mode,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Could not generate label PDF',
    };
  }
}

export async function printBarcodeLabels(labels, documentTitle = 'Barcode Labels', options = {}) {
  const result = await deliverBarcodeLabelPdf(labels, documentTitle, {
    ...options,
    mode: options.mode || 'download',
  });
  return result.success;
}

/** Full 11cm row preview — 3 labels like customer sample */
export function renderLabelPreviewHtml(label, presetId) {
  const layout = getLabelLayout(presetId || loadLabelPresetId());
  const row = Array.from({ length: layout.columns }, () => label);
  return renderSheetRowHtml(row, layout, { isLastRow: true });
}

export function getPreviewScaleStyle(presetId) {
  const layout = getLabelLayout(presetId || loadLabelPresetId());
  const scale = 0.85;
  const previewHeightMm = layout.labelHeightMm;
  return {
    width: `${layout.sheetWidthMm}mm`,
    height: `${previewHeightMm}mm`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    marginBottom: `${previewHeightMm * (scale - 1) + 4}mm`,
  };
}

export function getPreviewContainerStyle(presetId) {
  const layout = getLabelLayout(presetId || loadLabelPresetId());
  const scale = 0.85;
  const previewHeightMm = layout.labelHeightMm;
  return {
    width: `${layout.sheetWidthMm * scale}mm`,
    minHeight: `${previewHeightMm * scale + 4}mm`,
    overflow: 'visible',
  };
}
