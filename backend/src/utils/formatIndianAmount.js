function formatIndianAmount(amount, { decimalSep = '.', precision = 2 } = {}) {
  const value = Number(amount) || 0;
  const fixed = value.toFixed(precision);
  const [intPart, decPart] = fixed.split('.');

  if (intPart.length <= 3) {
    return decPart ? `${intPart}${decimalSep}${decPart}` : intPart;
  }

  let formatted = intPart.slice(-3);
  let rest = intPart.slice(0, -3);

  while (rest.length > 0) {
    formatted = `${rest.slice(-2)},${formatted}`;
    rest = rest.slice(0, -2);
  }

  return decPart ? `${formatted}${decimalSep}${decPart}` : formatted;
}

module.exports = { formatIndianAmount };
