import JsBarcode from 'jsbarcode';

export function generateBarcodeValue() {
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `890${Date.now()}${suffix}`;
}

export function createBarcodeSvg(code, options = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, String(code), {
    format: 'CODE128',
    width: 2,
    height: 50,
    displayValue: true,
    margin: 6,
    fontSize: 14,
    ...options,
  });
  return svg.outerHTML;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * labels: [{ code, title, subtitle }]
 */
export function printBarcodeLabels(labels, documentTitle = 'Barcode Labels') {
  if (!labels?.length) return false;

  const labelsHtml = labels
    .map(
      (label) => `
    <div class="label">
      <div class="title">${escapeHtml(label.title)}</div>
      <div class="subtitle">${escapeHtml(label.subtitle)}</div>
      ${createBarcodeSvg(label.code)}
    </div>
  `
    )
    .join('');

  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(documentTitle)}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 8px; }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          .label {
            border: 1px dashed #ccc;
            padding: 8px;
            text-align: center;
            page-break-inside: avoid;
            min-height: 110px;
          }
          .title { font-weight: bold; font-size: 12px; margin-bottom: 2px; }
          .subtitle { font-size: 11px; color: #555; margin-bottom: 4px; }
          svg { max-width: 100%; height: auto; }
        </style>
      </head>
      <body onload="window.print();">
        <div class="grid">${labelsHtml}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  return true;
}

export function buildProductLabels(products, { useMoneyFormatter } = {}) {
  return products
    .filter((p) => p.barcode)
    .map((p) => ({
      code: p.barcode,
      title: p.name,
      subtitle: useMoneyFormatter
        ? `${p.sku ? `SKU: ${p.sku} · ` : ''}${useMoneyFormatter({ amount: p.price })}`
        : p.sku
          ? `SKU: ${p.sku}`
          : '',
    }));
}

export function buildBlankLabels(codes) {
  return codes.map((code) => ({
    code,
    title: '',
    subtitle: 'Scan when saving product',
  }));
}
