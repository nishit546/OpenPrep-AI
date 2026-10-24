/**
 * Algebraic Chemical Equation Balancer using Gaussian Elimination over Rationals.
 * Solves stoichiometric coefficients for complex redox, combustion, decomposition,
 * and displacement chemical equations.
 */

// Greatest Common Divisor (GCD) for integers
function gcd(a, b) {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

// Least Common Multiple (LCM) for integers
function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.round((a * b) / gcd(a, b)));
}

/**
 * Rational Number class for exact fraction arithmetic without floating point drift
 */
class Fraction {
  constructor(numerator, denominator = 1) {
    if (denominator === 0) throw new Error('Denominator cannot be zero');
    if (denominator < 0) {
      numerator = -numerator;
      denominator = -denominator;
    }
    const g = gcd(numerator, denominator);
    this.n = Math.round(numerator / g);
    this.d = Math.round(denominator / g);
  }

  add(other) {
    const num = this.n * other.d + other.n * this.d;
    const den = this.d * other.d;
    return new Fraction(num, den);
  }

  sub(other) {
    const num = this.n * other.d - other.n * this.d;
    const den = this.d * other.d;
    return new Fraction(num, den);
  }

  mul(other) {
    return new Fraction(this.n * other.n, this.d * other.d);
  }

  div(other) {
    if (other.n === 0) throw new Error('Division by zero in Fraction');
    return new Fraction(this.n * other.d, this.d * other.n);
  }

  isZero() {
    return this.n === 0;
  }

  toFloat() {
    return this.n / this.d;
  }
}

/**
 * Parses a chemical formula (e.g. "KMnO4", "Ca(OH)2", "Fe2(SO4)3") into an element map
 * { K: 1, Mn: 1, O: 4 }
 */
export function parseChemicalFormula(formula) {
  const elementCounts = {};
  if (!formula || typeof formula !== 'string') return elementCounts;

  const cleanFormula = formula.trim().replace(/\s+/g, '');

  // Recursive parser handling nested parentheses like (NH4)2SO4
  function parseSegment(str, multiplier = 1) {
    // Process sub-parentheses: (Group)Count
    const groupRegex = /\(([^()]+)\)(\d*)/g;
    let match;
    let stripped = str;

    while ((match = groupRegex.exec(str)) !== null) {
      const innerStr = match[1];
      const count = match[2] ? parseInt(match[2], 10) : 1;
      parseSegment(innerStr, multiplier * count);
    }

    // Remove paren groups and parse bare elements
    stripped = stripped.replace(/\([^()]+\)\d*/g, '');

    const elementRegex = /([A-Z][a-z]*)(\d*)/g;
    let elemMatch;
    while ((elemMatch = elementRegex.exec(stripped)) !== null) {
      const element = elemMatch[1];
      const count = elemMatch[2] ? parseInt(elemMatch[2], 10) : 1;
      elementCounts[element] = (elementCounts[element] || 0) + count * multiplier;
    }
  }

  parseSegment(cleanFormula, 1);
  return elementCounts;
}

/**
 * Balances a chemical equation string using Gaussian elimination.
 * Example inputs:
 *  - "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2"
 *  - "C3H8 + O2 = CO2 + H2O"
 *
 * @param {string} equation - Raw chemical equation
 * @returns {object} Balanced equation object with verification details
 */
export function balanceChemicalEquation(equation) {
  if (!equation || typeof equation !== 'string') {
    throw new Error('Please enter a chemical equation string.');
  }

  // Normalize delimiters (->, =>, =)
  const sides = equation.split(/->|=>|=/);
  if (sides.length !== 2) {
    throw new Error('Equation must contain reactants and products separated by "->" or "=".');
  }

  const rawReactants = sides[0].split('+').map((s) => s.trim()).filter(Boolean);
  const rawProducts = sides[1].split('+').map((s) => s.trim()).filter(Boolean);

  if (rawReactants.length === 0 || rawProducts.length === 0) {
    throw new Error('Both sides must contain at least one chemical species.');
  }

  const reactantMaps = rawReactants.map(parseChemicalFormula);
  const productMaps = rawProducts.map(parseChemicalFormula);

  // Collect all unique chemical elements
  const allElements = Array.from(
    new Set([
      ...reactantMaps.flatMap(Object.keys),
      ...productMaps.flatMap(Object.keys)
    ])
  );

  if (allElements.length === 0) {
    throw new Error('No valid chemical elements found in equation.');
  }

  // Verify that every element in reactants exists in products and vice versa
  const reactantElements = new Set(reactantMaps.flatMap(Object.keys));
  const productElements = new Set(productMaps.flatMap(Object.keys));

  for (const elem of reactantElements) {
    if (!productElements.has(elem)) {
      throw new Error(`Element "${elem}" is present in reactants but missing in products.`);
    }
  }
  for (const elem of productElements) {
    if (!reactantElements.has(elem)) {
      throw new Error(`Element "${elem}" is present in products but missing in reactants.`);
    }
  }

  const species = [...rawReactants, ...rawProducts];
  const numSpecies = species.length;
  const numElements = allElements.length;

  // Build matrix M: rows = elements, cols = species
  // Reactant entries positive (+count), product entries negative (-count)
  const matrix = [];
  for (let r = 0; r < numElements; r++) {
    const elem = allElements[r];
    const row = [];

    // Reactants
    for (let c = 0; c < rawReactants.length; c++) {
      const count = reactantMaps[c][elem] || 0;
      row.push(new Fraction(count, 1));
    }
    // Products
    for (let c = 0; c < rawProducts.length; c++) {
      const count = productMaps[c][elem] || 0;
      row.push(new Fraction(-count, 1));
    }

    matrix.push(row);
  }

  // Gaussian elimination over Rationals to Reduced Row Echelon Form (RREF)
  let lead = 0;
  for (let r = 0; r < numElements && lead < numSpecies; r++) {
    let pivot = r;
    while (pivot < numElements && matrix[pivot][lead].isZero()) {
      pivot++;
    }

    if (pivot === numElements) {
      lead++;
      r--;
      continue;
    }

    // Swap rows
    const temp = matrix[r];
    matrix[r] = matrix[pivot];
    matrix[pivot] = temp;

    // Normalize pivot row
    const pivotVal = matrix[r][lead];
    for (let c = 0; c < numSpecies; c++) {
      matrix[r][c] = matrix[r][c].div(pivotVal);
    }

    // Eliminate other rows
    for (let i = 0; i < numElements; i++) {
      if (i !== r && !matrix[i][lead].isZero()) {
        const factor = matrix[i][lead];
        for (let c = 0; c < numSpecies; c++) {
          matrix[i][c] = matrix[i][c].sub(factor.mul(matrix[r][c]));
        }
      }
    }
    lead++;
  }

  // Solve for free variable (assume last variable x[numSpecies - 1] = 1)
  const rawCoeffs = new Array(numSpecies).fill(null);
  rawCoeffs[numSpecies - 1] = new Fraction(1, 1);

  for (let r = numElements - 1; r >= 0; r--) {
    let firstNonZero = -1;
    for (let c = 0; c < numSpecies; c++) {
      if (!matrix[r][c].isZero()) {
        firstNonZero = c;
        break;
      }
    }

    if (firstNonZero !== -1 && firstNonZero < numSpecies - 1) {
      let sum = new Fraction(0, 1);
      for (let c = firstNonZero + 1; c < numSpecies; c++) {
        sum = sum.add(matrix[r][c].mul(rawCoeffs[c] || new Fraction(0, 1)));
      }
      rawCoeffs[firstNonZero] = new Fraction(0, 1).sub(sum);
    }
  }

  // Find least common multiple (LCM) of all denominators
  let commonDenominator = 1;
  for (let i = 0; i < numSpecies; i++) {
    if (rawCoeffs[i]) {
      commonDenominator = lcm(commonDenominator, rawCoeffs[i].d);
    }
  }

  // Multiply by LCM to get integer coefficients
  let integerCoeffs = rawCoeffs.map((f) => {
    if (!f) return 1;
    return Math.round((f.n * commonDenominator) / f.d);
  });

  // Ensure all coefficients are strictly positive
  if (integerCoeffs.some((c) => c <= 0)) {
    // If all negative, invert
    if (integerCoeffs.every((c) => c <= 0)) {
      integerCoeffs = integerCoeffs.map((c) => -c);
    } else {
      throw new Error('Could not find a unique positive stoichiometric solution for this equation.');
    }
  }

  // Reduce by greatest common divisor
  let overallGcd = integerCoeffs[0];
  for (let i = 1; i < integerCoeffs.length; i++) {
    overallGcd = gcd(overallGcd, integerCoeffs[i]);
  }
  const finalCoeffs = integerCoeffs.map((c) => Math.round(c / overallGcd));

  // Split coefficients between reactants and products
  const reactantCount = rawReactants.length;
  const balancedReactants = rawReactants.map((formula, idx) => ({
    formula,
    coefficient: finalCoeffs[idx]
  }));

  const balancedProducts = rawProducts.map((formula, idx) => ({
    formula,
    coefficient: finalCoeffs[reactantCount + idx]
  }));

  // Build element verification table
  const verificationTable = allElements.map((element) => {
    const leftCount = balancedReactants.reduce(
      (sum, item, idx) => sum + item.coefficient * (reactantMaps[idx][element] || 0),
      0
    );
    const rightCount = balancedProducts.reduce(
      (sum, item, idx) => sum + item.coefficient * (productMaps[idx][element] || 0),
      0
    );
    return {
      element,
      reactantCount: leftCount,
      productCount: rightCount,
      balanced: leftCount === rightCount
    };
  });

  // Build formatted equation string
  const formatSide = (items) =>
    items
      .map((item) => (item.coefficient === 1 ? item.formula : `${item.coefficient} ${item.formula}`))
      .join(' + ');

  const balancedString = `${formatSide(balancedReactants)} -> ${formatSide(balancedProducts)}`;

  return {
    balancedString,
    reactants: balancedReactants,
    products: balancedProducts,
    verificationTable,
    isBalanced: verificationTable.every((v) => v.balanced)
  };
}

export default {
  parseChemicalFormula,
  balanceChemicalEquation
};
