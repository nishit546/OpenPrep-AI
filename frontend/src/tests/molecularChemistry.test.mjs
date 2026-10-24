import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  parseChemicalFormula,
  balanceChemicalEquation
} from '../utils/chemicalEquationBalancer.js';

test('Interactive 3D Molecular Viewer & Chemical Reaction Balancer', async (t) => {
  await t.test('parseChemicalFormula extracts correct atom multiplicities', () => {
    assert.deepStrictEqual(parseChemicalFormula('H2O'), { H: 2, O: 1 });
    assert.deepStrictEqual(parseChemicalFormula('C3H8'), { C: 3, H: 8 });
    assert.deepStrictEqual(parseChemicalFormula('KMnO4'), { K: 1, Mn: 1, O: 4 });
    assert.deepStrictEqual(parseChemicalFormula('Ca(OH)2'), { Ca: 1, O: 2, H: 2 });
    assert.deepStrictEqual(parseChemicalFormula('Fe2(SO4)3'), { Fe: 2, S: 3, O: 12 });
  });

  await t.test('balanceChemicalEquation solves single displacement reaction', () => {
    const res = balanceChemicalEquation('Zn + HCl -> ZnCl2 + H2');
    assert.strictEqual(res.balancedString, 'Zn + 2 HCl -> ZnCl2 + H2');
    assert.strictEqual(res.isBalanced, true);

    const zn = res.verificationTable.find((v) => v.element === 'Zn');
    assert.strictEqual(zn.reactantCount, 1);
    assert.strictEqual(zn.productCount, 1);

    const cl = res.verificationTable.find((v) => v.element === 'Cl');
    assert.strictEqual(cl.reactantCount, 2);
    assert.strictEqual(cl.productCount, 2);
  });

  await t.test('balanceChemicalEquation solves hydrocarbon combustion reaction', () => {
    const res = balanceChemicalEquation('C3H8 + O2 -> CO2 + H2O');
    assert.strictEqual(res.balancedString, 'C3H8 + 5 O2 -> 3 CO2 + 4 H2O');
    assert.strictEqual(res.isBalanced, true);
  });

  await t.test('balanceChemicalEquation solves challenging redox reaction with KMnO4', () => {
    const res = balanceChemicalEquation('KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2');
    assert.strictEqual(
      res.balancedString,
      '2 KMnO4 + 16 HCl -> 2 KCl + 2 MnCl2 + 8 H2O + 5 Cl2'
    );
    assert.strictEqual(res.isBalanced, true);

    res.verificationTable.forEach((row) => {
      assert.strictEqual(
        row.reactantCount,
        row.productCount,
        `Element ${row.element} must be balanced`
      );
    });
  });

  await t.test('balanceChemicalEquation throws descriptive error for mismatched elements', () => {
    assert.throws(
      () => balanceChemicalEquation('H2 + O2 -> NaCl'),
      /Element "H" is present in reactants but missing in products/
    );
  });

  await t.test('MolecularViewer3D.jsx exports component and includes exam molecule library', async () => {
    const viewerPath = path.resolve(__dirname, '../components/chemistry/MolecularViewer3D.jsx');
    assert.ok(fs.existsSync(viewerPath), 'MolecularViewer3D.jsx must exist');

    const content = fs.readFileSync(viewerPath, 'utf8');
    assert.match(content, /MOLECULE_LIBRARY/, 'Must export MOLECULE_LIBRARY');
    assert.match(content, /benzene/, 'Must include benzene in library');
    assert.match(content, /methane/, 'Must include methane in library');
    assert.match(content, /aspirin/, 'Must include aspirin in library');
    assert.match(content, /cis_butene/, 'Must include stereoisomer in library');
    assert.match(content, /EquationBalancerModal/, 'Must integrate EquationBalancerModal');
  });

  await t.test('EquationBalancerModal.jsx exports modal with step-by-step element balance verification', () => {
    const modalPath = path.resolve(__dirname, '../components/chemistry/EquationBalancerModal.jsx');
    assert.ok(fs.existsSync(modalPath), 'EquationBalancerModal.jsx must exist');

    const content = fs.readFileSync(modalPath, 'utf8');
    assert.match(content, /balanceChemicalEquation/, 'Must call balanceChemicalEquation');
    assert.match(content, /verificationTable/, 'Must display atom verification table');
    assert.match(content, /PRESETS/, 'Must provide chemical presets');
  });
});
