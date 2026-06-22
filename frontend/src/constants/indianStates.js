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
