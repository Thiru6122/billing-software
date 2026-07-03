const pug = require('pug');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const puppeteer = require('puppeteer');
const { loadSettings } = require('@/middlewares/settings');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');
const { splitGstInclusive } = require('@/utils/indianGst');

const pugFiles = ['invoice', 'offer', 'quote', 'payment'];

function enrichInvoiceForPdf(result) {
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

async function renderHtmlToPdf(htmlContent, { targetLocation, format = 'Letter' }) {
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

  const model = normalized === 'invoice' ? enrichInvoiceForPdf(result) : result;

  const templatePath = path.join('src/pdf', normalized + '.pug');
  return pug.renderFile(templatePath, {
    model,
    settings,
    translate,
    dateFormat,
    moneyFormatter,
    moment,
  });
}

function wrapHtmlForPrint(html) {
  const printStyle = `
    <style>
      @page { size: letter portrait; margin: 8mm; }
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
  const { targetLocation, format = 'Letter' } = info;

  if (!targetLocation) {
    throw new Error('PDF target location is required');
  }

  if (fs.existsSync(targetLocation)) {
    fs.unlinkSync(targetLocation);
  }

  const htmlContent = await buildDocumentHtml(modelName, result);
  await renderHtmlToPdf(htmlContent, { targetLocation, format });
};
