const {
  searchHsn,
  findCodesByDescription,
  getGstRateByCode,
} = require('hsn-code-package');

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'ml',
  'gm',
  'kg',
  'pcs',
  'pure',
  'new',
  'pack',
]);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function normalizePackageCode(code) {
  const digits = String(code || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 8) return digits.slice(0, 8);
  if (digits.length >= 6) return digits.slice(0, 6);
  if (digits.length >= 4) return digits.slice(0, 4);
  return digits;
}

function scoreMatch(queryTokens, description, code) {
  const desc = String(description || '').toLowerCase();
  let score = 0;

  queryTokens.forEach((token) => {
    if (desc.includes(token)) score += 12;
  });

  if (queryTokens.length > 1 && queryTokens.every((token) => desc.includes(token))) {
    score += 20;
  }

  if (desc.includes('seed') && !queryTokens.includes('seed')) score -= 15;
  if (desc.includes('hair oil') && queryTokens.some((t) => t.includes('oil') || t === 'hair')) {
    score += 10;
  }

  const codeDigits = String(code || '').replace(/\D/g, '');
  if (
    queryTokens.some((t) => ['tablet', 'capsule', 'syrup', 'medicine', 'paracetamol'].includes(t)) &&
    (codeDigits.startsWith('3004') || codeDigits.startsWith('3003'))
  ) {
    score += 25;
  }

  const digitLen = String(code || '').replace(/\D/g, '').length;
  if (digitLen === 8) score += 4;
  else if (digitLen === 6) score += 2;
  else if (digitLen === 4) score += 1;

  return score;
}

function pickBestMatch(query, results) {
  if (!results?.length) return null;

  const queryTokens = tokenize(query);
  const scored = results
    .map((row) => ({
      ...row,
      score: scoreMatch(queryTokens, row.description, row.code),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0] || results[0];
}

function searchHsnDatabase(query) {
  const text = String(query || '').trim();
  if (!text) return [];

  const keywords = tokenize(text);
  let results = [];

  if (keywords.length >= 2) {
    results = findCodesByDescription(keywords.slice(0, Math.min(keywords.length, 4)));
  }

  if (!results.length) {
    results = searchHsn(text, { matchType: 'contains', limit: 25 });
  }

  if (!results.length && keywords.length) {
    const mainKeyword = [...keywords].sort((a, b) => b.length - a.length)[0];
    results = searchHsn(mainKeyword, { limit: 25 });
  }

  return results;
}

function lookupHsnByProductName(productName, category = '') {
  const query = [productName, category].filter(Boolean).join(' ').trim();
  if (!query) return null;

  const results = searchHsnDatabase(query);
  const best = pickBestMatch(query, results);
  if (!best?.code) return null;

  const hsnCode = normalizePackageCode(best.code);
  const rateInfo = getGstRateByCode(best.code) || getGstRateByCode(hsnCode);
  const taxRate = Number(rateInfo?.igstRate ?? rateInfo?.igst ?? 0) || 0;

  return {
    hsnCode,
    taxRate,
    description: best.description,
    source: 'cbic-hsn-database',
  };
}

function suggestHsnMatches(productName, category = '', limit = 5) {
  const query = [productName, category].filter(Boolean).join(' ').trim();
  if (!query) return [];

  const results = searchHsnDatabase(query);
  const queryTokens = tokenize(query);

  return results
    .map((row) => ({
      hsnCode: normalizePackageCode(row.code),
      description: row.description,
      taxRate: Number(getGstRateByCode(row.code)?.igstRate ?? 0) || 0,
      score: scoreMatch(queryTokens, row.description, row.code),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = {
  lookupHsnByProductName,
  suggestHsnMatches,
};
