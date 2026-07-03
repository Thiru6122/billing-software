const { renderBarcodeLabelsPdf } = require('@/services/barcodeLabelPdfService');

const printBarcodeLabels = async (req, res) => {
  try {
    const { html, rowCount, rowPageHeightsMm, layout } = req.body || {};

    if (!html || !layout?.sheetWidthMm) {
      return res.status(400).json({
        success: false,
        message: 'Label print HTML and layout are required.',
      });
    }

    const rows = Math.max(1, Number(rowCount) || 1);
    const pdfLayout = {
      ...layout,
      rowPageHeightsMm: Array.isArray(rowPageHeightsMm) ? rowPageHeightsMm : undefined,
    };
    const pdfBuffer = await renderBarcodeLabelsPdf(html, pdfLayout, rows);
    const body = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

    if (!body.length || body[0] !== 0x25 || body[1] !== 0x50 || body[2] !== 0x44 || body[3] !== 0x46) {
      throw new Error('Generated PDF is invalid or empty');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="barcode-labels.pdf"');
    res.setHeader('Content-Length', body.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.end(body);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Could not generate label PDF.',
    });
  }
};

module.exports = printBarcodeLabels;
