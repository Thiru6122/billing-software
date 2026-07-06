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
  'non',
]);

const PRESERVED_FOOD_MARKERS =
  /\b(pickle|pickles|cucumber|gherkin|mushroom|tomato|olive|truffle|capsicum|preserved|chutney|sauce)\b/i;

const VINEGAR_PRODUCT_PATTERN =
  /\bvinegar\b/i;

function vinegarIsTheProduct(query) {
  const text = String(query || '').trim();
  if (!VINEGAR_PRODUCT_PATTERN.test(text)) return false;
  if (PRESERVED_FOOD_MARKERS.test(text)) return false;
  // e.g. "non fruit vinegar", "white vinegar", "coconut vinegar", "vinegar 500ml"
  return /\bvinegar\b\s*$/i.test(text) || /\b\w+\s+vinegar\b/i.test(text);
}

function mergeHsnResults(...lists) {
  const seen = new Set();
  const merged = [];

  lists.flat().forEach((row) => {
    const key = String(row?.code || '').replace(/\D/g, '');
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(row);
  });

  return merged;
}

const COMPOUND_KEYWORDS = [
  'soap',
  'oil',
  'neem',
  'phenyl',
  'phenyal',
  'omum',
  'water',
  'cream',
  'powder',
  'gel',
  'wash',
  'shampoo',
  'cleaner',
  'dish',
  'hand',
  'toilet',
  'floor',
  'liquid',
].sort((a, b) => b.length - a.length);

const KNOWN_COMPOUND_NAMES = {
  soapoil: ['soap', 'oil'],
  neemoil: ['neem', 'oil'],
  phenyal: ['phenyl'],
};

function splitCompoundWord(word) {
  const lower = String(word || '').toLowerCase().trim();
  if (!lower || lower.length <= 2) return [];

  if (KNOWN_COMPOUND_NAMES[lower]) {
    return KNOWN_COMPOUND_NAMES[lower];
  }

  const parts = [];
  let remaining = lower.replace(/\d+/g, '');
  let guard = 0;

  while (remaining.length > 0 && guard++ < 12) {
    let matched = false;

    for (const keyword of COMPOUND_KEYWORDS) {
      const index = remaining.indexOf(keyword);
      if (index === -1) continue;

      if (index > 0) {
        const prefix = remaining.slice(0, index);
        if (prefix.length > 2) parts.push(prefix);
      }

      parts.push(keyword);
      remaining = remaining.slice(index + keyword.length);
      matched = true;
      break;
    }

    if (!matched) {
      if (remaining.length > 2) parts.push(remaining);
      break;
    }
  }

  const unique = [...new Set(parts)].filter((part) => part.length > 2 && !STOP_WORDS.has(part));
  return unique.length ? unique : lower.length > 2 ? [lower] : [];
}

function tokenize(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const tokens = words.flatMap((word) => splitCompoundWord(word.replace(/\d+/g, '')));

  return [...new Set(tokens)].filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function normalizePackageCode(code) {
  const digits = String(code || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 8) return digits.slice(0, 8);
  if (digits.length >= 6) return digits.slice(0, 6);
  if (digits.length >= 4) return digits.slice(0, 4);
  return digits;
}

function scoreMatch(queryTokens, description, code, queryText = '') {
  const desc = String(description || '').toLowerCase();
  let score = 0;
  const codeDigits = String(code || '').replace(/\D/g, '');

  queryTokens.forEach((token) => {
    if (desc.includes(token)) score += 12;
  });

  if (queryTokens.length > 1 && queryTokens.every((token) => desc.includes(token))) {
    score += 20;
  }

  if (queryTokens.includes('soap') && queryTokens.includes('oil')) {
    if (codeDigits.startsWith('3401')) score += 18;
    if (desc.includes('surface-active') || desc.includes('detergent')) score += 12;
  }

  if (queryTokens.includes('neem') && queryTokens.includes('oil') && codeDigits.startsWith('1515')) {
    score += 15;
  }

  if (queryTokens.includes('vinegar') || desc.includes('vinegar')) {
    const fullQuery = queryText || queryTokens.join(' ');
    const vinegarProduct = vinegarIsTheProduct(fullQuery);

    if (vinegarProduct) {
      if (codeDigits.startsWith('2209')) score += 35;
      if (/VINEGAR AND SUBSTITUTES|OBTAINED FROM ACETIC ACID/i.test(desc)) score += 30;
      if (/SYNTHETIC VINEGAR/i.test(desc) && /\bsynthetic\b/i.test(fullQuery)) score += 12;
      if (/BREWED VINEGAR/i.test(desc) && /\bbrewed\b/i.test(fullQuery)) score += 12;
      if (/\bOTHER\b/i.test(desc) && /\b(non\s*fruit|synthetic|white)\b/i.test(fullQuery)) score += 10;

      if (/PRESERVED\s*BY\s*VINEGAR|PRESERVEDBY\s*VINEGAR|PREPARED OR PRESERVED/i.test(desc)) {
        score -= 50;
      }
      if (/OTHERWISE\s*THAN\s*BY\s*VINEGAR/i.test(desc)) score -= 35;
      if (codeDigits.startsWith('2001') || codeDigits.startsWith('2002') || codeDigits.startsWith('2003')) {
        score -= 25;
      }
    }
  }

  if (desc.includes('seed') && !queryTokens.includes('seed')) score -= 15;
  if (desc.includes('hair oil') && queryTokens.some((t) => t.includes('oil') || t === 'hair')) {
    score += 10;
  }

  if (
    queryTokens.some((t) => ['tablet', 'capsule', 'syrup', 'medicine', 'paracetamol'].includes(t)) &&
    (codeDigits.startsWith('3004') || codeDigits.startsWith('3003'))
  ) {
    score += 25;
  }

  const digitLen = codeDigits.length;
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
      score: scoreMatch(queryTokens, row.description, row.code, query),
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

  if (vinegarIsTheProduct(text)) {
    const vinegarCodes = searchHsn('VINEGAR AND SUBSTITUTES', { limit: 10 });
    results = mergeHsnResults(results, vinegarCodes);
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
      score: scoreMatch(queryTokens, row.description, row.code, query),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = {
  lookupHsnByProductName,
  suggestHsnMatches,
};
