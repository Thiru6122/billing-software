const pug = require('pug');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const puppeteer = require('puppeteer');
const { loadSettings } = require('@/middlewares/settings');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');
const { splitGstInclusive } = require('@/utils/indianGst');
const { amountInWords } = require('@/utils/amountInWords');
const { formatPlaceOfSupply } = require('@/utils/indianStates');
const { formatIndianAmount } = require('@/utils/formatIndianAmount');

const pugFiles = ['invoice', 'offer', 'quote', 'payment', 'purchase'];
const GST_PDF_TYPES = ['invoice', 'purchase'];

function enrichGstDocumentForPdf(result) {
  const model = result?.toObject ? result.toObject() : { ...result };
  if (!Array.isArray(model.items)) return model;

  model.items = model.items.map((item) => {
    const line = { ...item };
    if (line.taxableValue == null || line.gstAmount == null) {
      const { taxable, gst } = splitGstInclusive(line.total, line.gstRate);
      line.taxableValue = taxable;
      line.gstAmount = gst;
    }
    return line;
  });

  return model;
}

function getInvoiceCustomer(model) {
  if (model.customerName) {
    return {
      name: model.customerName,
      gstin: model.customerGstin || '',
      phone: '',
      email: '',
      address: '',
      state: '',
    };
  }

  if (model.client) {
    return {
      name: model.client.name || '',
      gstin: model.customerGstin || model.client.gstin || '',
      phone: model.client.phone || '',
      email: model.client.email || '',
      address: model.client.address || '',
      state: model.client.state || '',
    };
  }

  return {
    name: 'Walk-in Customer',
    gstin: model.customerGstin || '',
    phone: '',
    email: '',
    address: '',
    state: '',
  };
}

function getPurchaseSupplier(model) {
  if (model.supplierName) {
    return {
      name: model.supplierName,
      gstin: model.supplierGstin || '',
      phone: '',
      email: '',
      address: '',
      state: '',
    };
  }

  if (model.supplier) {
    return {
      name: model.supplier.name || '',
      gstin: model.supplierGstin || model.supplier.gstin || '',
      phone: model.supplier.phone || '',
      email: model.supplier.email || '',
      address: model.supplier.address || '',
      state: model.supplier.state || '',
    };
  }

  return {
    name: '—',
    gstin: model.supplierGstin || '',
    phone: '',
    email: '',
    address: '',
    state: '',
  };
}

function buildTaxSummary(model) {
  const groups = {};
  (model.items || []).forEach((item) => {
    const rate = Number(item.gstRate) || 0;
    const key = String(rate);
    if (!groups[key]) {
      groups[key] = { rate, taxable: 0, gst: 0, total: 0 };
    }
    const taxable = item.taxableValue != null ? item.taxableValue : item.total;
    const gst = item.gstAmount || 0;
    groups[key].taxable += Number(taxable) || 0;
    groups[key].gst += Number(gst) || 0;
    groups[key].total += Number(item.total) || 0;
  });
  return Object.values(groups).sort((a, b) => a.rate - b.rate);
}

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

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

async function renderHtmlToPdf(htmlContent, { targetLocation, format = 'A4' }) {
  const dir = path.dirname(targetLocation);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const executablePath = await findBrowserExecutable();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: targetLocation,
      format,
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });
  } finally {
    await browser.close();
  }
}

async function buildDocumentHtml(modelName, result) {
  const normalized = modelName.toLowerCase();
  if (!pugFiles.includes(normalized)) {
    throw new Error(`Unsupported PDF model: ${modelName}`);
  }

  const settings = await loadSettings();
  const selectedLang = settings['idurar_app_language'];
  const translate = useLanguage({ selectedLang });

  const {
    currency_symbol,
    currency_position,
    decimal_sep,
    thousand_sep,
    cent_precision,
    zero_format,
  } = settings;

  const { moneyFormatter } = useMoney({
    settings: {
      currency_symbol,
      currency_position,
      decimal_sep,
      thousand_sep,
      cent_precision,
      zero_format,
    },
  });
  const { dateFormat } = useDate({ settings });

  settings.public_server_file = process.env.PUBLIC_SERVER_FILE;

  const model = GST_PDF_TYPES.includes(normalized)
    ? enrichGstDocumentForPdf(result?.toObject ? result.toObject() : result)
    : result?.toObject
      ? result.toObject()
      : result;
  const customer = normalized === 'invoice' ? getInvoiceCustomer(model) : null;
  const supplier = normalized === 'purchase' ? getPurchaseSupplier(model) : null;
  const taxSummary = GST_PDF_TYPES.includes(normalized) ? buildTaxSummary(model) : [];

  const indianAmount = (amount) =>
    formatIndianAmount(amount, {
      decimalSep: decimal_sep || '.',
      precision: cent_precision ?? 2,
    });

  const templatePath = path.join('src/pdf', normalized + '.pug');
  return pug.renderFile(templatePath, {
    model,
    customer,
    supplier,
    taxSummary,
    settings,
    translate,
    dateFormat,
    moneyFormatter,
    indianAmount,
    amountInWords,
    formatPlaceOfSupply,
    moment,
  });
}

function wrapHtmlForPrint(html) {
  const printStyle = `
    <style>
      @page { size: A4 portrait; margin: 8mm; }
      html, body {
        width: 100%;
        max-width: 100%;
        margin: 0;
        padding: 0;
      }
      @media print {
        html, body {
          width: 100% !important;
          max-width: 100% !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        header, main, .table-invoice, footer {
          max-width: 100% !important;
        }
        .sheet {
          height: auto !important;
        }
      }
    </style>
  `;
  let output = html.includes('</head>') ? html.replace('</head>', `${printStyle}</head>`) : printStyle + html;
  output = output.replace(
    /<body(\s[^>]*)?>/i,
    '<body$1 onload="setTimeout(function(){ window.print(); }, 400);" onafterprint="window.close();">'
  );
  return output;
}

exports.buildDocumentHtml = buildDocumentHtml;
exports.wrapHtmlForPrint = wrapHtmlForPrint;

exports.generatePdf = async (
  modelName,
  info = { filename: 'pdf_file', format: 'A5', targetLocation: '' },
  result
) => {
  const { targetLocation, format = 'A4' } = info;

  if (!targetLocation) {
    throw new Error('PDF target location is required');
  }

  if (fs.existsSync(targetLocation)) {
    fs.unlinkSync(targetLocation);
  }

  const htmlContent = await buildDocumentHtml(modelName, result);
  await renderHtmlToPdf(htmlContent, { targetLocation, format });
};
