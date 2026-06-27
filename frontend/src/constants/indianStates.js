export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export function inferGstType(placeOfSupply, companyState) {
  if (!placeOfSupply || !companyState) return 'intra';
  const norm = (s) => String(s || '').trim().toLowerCase();
  return norm(placeOfSupply) === norm(companyState) ? 'intra' : 'inter';
}

export function splitGstInclusive(inclusiveAmount, gstRate) {
  const inclusive = Number(inclusiveAmount) || 0;
  const rate = Number(gstRate) || 0;
  if (rate <= 0 || inclusive <= 0) {
    return { taxable: inclusive, gst: 0 };
  }
  const taxable = Math.round((inclusive / (1 + rate / 100)) * 100) / 100;
  const gst = Math.round((inclusive - taxable) * 100) / 100;
  return { taxable, gst };
}

export function splitGstTaxTotal(taxTotal, gstType = 'intra') {
  const tax = Number(taxTotal) || 0;
  const type = gstType === 'inter' ? 'inter' : 'intra';

  if (type === 'inter') {
    return { taxTotal: tax, cgstTotal: 0, sgstTotal: 0, igstTotal: tax, gstType: 'inter' };
  }

  const cgstTotal = Math.round((tax / 2) * 100) / 100;
  const sgstTotal = Math.round((tax - cgstTotal) * 100) / 100;
  return { taxTotal: tax, cgstTotal, sgstTotal, igstTotal: 0, gstType: 'intra' };
}

export function computeInvoiceGstFromItems(items = [], gstType = 'intra') {
  let subTotal = 0;
  let taxTotal = 0;
  let inclusiveTotal = 0;

  items.forEach((item) => {
    if (!item) return;
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const gstRate = Number(item.gstRate) || 0;
    const lineInclusive = Math.round(quantity * price * 100) / 100;
    const { taxable, gst } = splitGstInclusive(lineInclusive, gstRate);

    subTotal = Math.round((subTotal + taxable) * 100) / 100;
    taxTotal = Math.round((taxTotal + gst) * 100) / 100;
    inclusiveTotal = Math.round((inclusiveTotal + lineInclusive) * 100) / 100;
  });

  const gst = splitGstTaxTotal(taxTotal, gstType);
  const effectiveTaxRate =
    subTotal > 0 ? Math.round((taxTotal / subTotal) * 10000) / 100 : 0;

  return {
    subTotal,
    taxTotal: gst.taxTotal,
    cgstTotal: gst.cgstTotal,
    sgstTotal: gst.sgstTotal,
    igstTotal: gst.igstTotal,
    gstType: gst.gstType,
    total: inclusiveTotal,
    taxRate: effectiveTaxRate,
  };
}

export function computeIndianGstTotals({ subTotal, taxRate, gstType = 'intra' }) {
  const taxable = Number(subTotal) || 0;
  const rate = Number(taxRate) || 0;
  const taxTotal = Math.round(((taxable * rate) / 100) * 100) / 100;
  const type = gstType === 'inter' ? 'inter' : 'intra';

  if (type === 'inter') {
    return { taxTotal, cgstTotal: 0, sgstTotal: 0, igstTotal: taxTotal, gstType: 'inter' };
  }

  const cgstTotal = Math.round((taxTotal / 2) * 100) / 100;
  const sgstTotal = Math.round((taxTotal - cgstTotal) * 100) / 100;
  return { taxTotal, cgstTotal, sgstTotal, igstTotal: 0, gstType: 'intra' };
}
