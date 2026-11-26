import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMoneyExpression, hasMathExpression } from "../lib/utils/math.js";

test("hasMathExpression detects arithmetic expressions vs plain numbers", () => {
  assert.equal(hasMathExpression("145+35"), true);
  assert.equal(hasMathExpression("220*2"), true);
  assert.equal(hasMathExpression("220×2"), true);
  assert.equal(hasMathExpression("2x150"), true);
  assert.equal(hasMathExpression("(120+80)/2"), true);
  assert.equal(hasMathExpression("500-45.50"), true);
  assert.equal(hasMathExpression("1,234.50"), false);
  assert.equal(hasMathExpression("₱50"), false);
  assert.equal(hasMathExpression(""), false);
});

test("evaluateMoneyExpression accurately computes centavos with operator precedence", () => {
  assert.equal(evaluateMoneyExpression("145+35"), 18000);
  assert.equal(evaluateMoneyExpression("220*2"), 44000);
  assert.equal(evaluateMoneyExpression("220×2"), 44000);
  assert.equal(evaluateMoneyExpression("2x150.5"), 30100);
  assert.equal(evaluateMoneyExpression("100 + 50 * 2"), 20000);
  assert.equal(evaluateMoneyExpression("(120 + 80) / 2"), 10000);
  assert.equal(evaluateMoneyExpression("500 - 45.50"), 45450);
  assert.equal(evaluateMoneyExpression("₱1,000 / 3"), 33333);
  assert.equal(evaluateMoneyExpression("100 ÷ 4"), 2500);
});

test("evaluateMoneyExpression safely rejects invalid, zero, negative, or div-by-zero inputs", () => {
  assert.equal(evaluateMoneyExpression(""), null);
  assert.equal(evaluateMoneyExpression("145+"), null);
  assert.equal(evaluateMoneyExpression("100/0"), null);
  assert.equal(evaluateMoneyExpression("50-100"), null);
  assert.equal(evaluateMoneyExpression("50-50"), null);
  assert.equal(evaluateMoneyExpression("((100+20)"), null);
  assert.equal(evaluateMoneyExpression("alert(1)"), null);
  assert.equal(evaluateMoneyExpression("10..5+1"), null);
});
