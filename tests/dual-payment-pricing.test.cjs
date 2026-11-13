const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

const source = fs.readFileSync('lib/dual-payment-pricing.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const pricingExports = {};
vm.runInNewContext(compiled, { exports: pricingExports, RangeError, Number, Math });
const { regularCardPriceCents, dualPriceForRegistration } = pricingExports;

test('solo Zelle $16 => regular card $16.79', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(dualPriceForRegistration(1600, 1))), {
    zelleTotalCents: 1600, regularCardTotalCents: 1679
  });
});
test('team Zelle $80 => one card charge $82.70', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(dualPriceForRegistration(1600, 5))), {
    zelleTotalCents: 8000, regularCardTotalCents: 8270
  });
});
test('gross covers base after Stripe 2.9% + 30 cents with minimal rounding', () => {
  for (const base of [50, 100, 1600, 3200, 8000, 100000]) {
    const gross = regularCardPriceCents(base);
    assert.ok(gross - Math.round(gross * 0.029) - 30 >= base);
    assert.ok(gross - 1 - (gross - 1) * 0.029 - 30 < base);
  }
});
test('invalid amounts and quantities rejected', () => {
  assert.throws(() => regularCardPriceCents(-1), /Invalid price/);
  assert.throws(() => dualPriceForRegistration(1600, 0), /Invalid reserved/);
  assert.throws(() => dualPriceForRegistration(1600, 101), /Invalid reserved/);
});
