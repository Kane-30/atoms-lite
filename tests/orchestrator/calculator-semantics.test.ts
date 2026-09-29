import { describe, expect, it } from "vitest";
import {
  ensureCalculatorSemantics,
  looksLikeCalculator,
  previewCalculatorMath,
} from "@/lib/orchestrator/calculator-semantics";

/** Broken AtomsCalc: after operator, digit appends → 7×8 becomes 546. */
function brokenAtomsCalcFiles() {
  return [
    {
      path: "index.html",
      content: `<!doctype html><html><body>
<div id="display" aria-live="polite">0</div>
<button type="button" data-digit="1">1</button>
<button type="button" data-digit="2">2</button>
<button type="button" data-digit="3">3</button>
<button type="button" data-digit="4">4</button>
<button type="button" data-digit="7">7</button>
<button type="button" data-digit="8">8</button>
<button type="button" data-digit="9">9</button>
<button type="button" data-op="*">×</button>
<button type="button" data-op="+">+</button>
<button type="button" data-op="-">-</button>
<button type="button" data-op="/">÷</button>
<button type="button" data-action="clear">C</button>
<button type="button" data-action="equals">=</button>
<script src="scripts/calculator.js"></script>
<script src="scripts/app.js"></script>
</body></html>`,
    },
    {
      path: "scripts/calculator.js",
      content: `
(function (global) {
  var current = "0", stored = null, operator = null;
  function inputDigit(ch) {
    if (current === "0") current = ch;
    else current = current + ch;
    return current;
  }
  function chooseOperator(op) {
    stored = Number(current);
    operator = op;
    return current;
  }
  function evaluate() {
    var right = Number(current);
    var value = operator === "*" ? stored * right : operator === "+" ? stored + right : operator === "-" ? stored - right : stored / right;
    current = String(value);
    stored = null; operator = null;
    return { display: current, result: current };
  }
  function clear() { current = "0"; stored = null; operator = null; return current; }
  function getDisplay() { return current; }
  global.AtomsCalc = { inputDigit: inputDigit, chooseOperator: chooseOperator, evaluate: evaluate, clear: clear, reset: clear, getDisplay: getDisplay };
})(window);
`,
    },
    {
      path: "scripts/app.js",
      content: `
(function () {
  var Calc = window.AtomsCalc;
  var display = document.getElementById("display");
  function render() { display.textContent = Calc.getDisplay(); }
  document.querySelectorAll("[data-digit]").forEach(function (btn) {
    btn.addEventListener("click", function () { Calc.inputDigit(btn.getAttribute("data-digit")); render(); });
  });
  document.querySelectorAll("[data-op]").forEach(function (btn) {
    btn.addEventListener("click", function () { Calc.chooseOperator(btn.getAttribute("data-op")); render(); });
  });
  document.querySelector('[data-action="equals"]').addEventListener("click", function () { Calc.evaluate(); render(); });
  document.querySelector('[data-action="clear"]').addEventListener("click", function () { Calc.clear(); render(); });
  render();
})();
`,
    },
  ];
}

/** Broken Calculator + screen-value display (aria-live expression is empty after =). */
function brokenCalculatorScreenValueFiles() {
  return [
    {
      path: "index.html",
      content: `<!doctype html><html><body>
<div id="screen-expr" aria-live="polite"></div>
<div id="screen-value">0</div>
<button type="button" data-digit="7">7</button>
<button type="button" data-digit="8">8</button>
<button type="button" data-digit="1">1</button>
<button type="button" data-digit="2">2</button>
<button type="button" data-digit="3">3</button>
<button type="button" data-digit="9">9</button>
<button type="button" data-digit="4">4</button>
<button type="button" data-op="×">×</button>
<button type="button" data-op="+">+</button>
<button type="button" data-op="-">−</button>
<button type="button" data-op="÷">÷</button>
<button type="button" id="btn-clear">C</button>
<button type="button" id="btn-equals">=</button>
<script src="scripts/calculator.js"></script>
<script src="scripts/app.js"></script>
</body></html>`,
    },
    {
      path: "scripts/calculator.js",
      content: `
(function (global) {
  function createState() { return { current: "0", stored: null, operator: null, error: false }; }
  function inputDigit(state, ch) {
    if (state.current === "0") state.current = ch;
    else state.current += ch;
    return state;
  }
  function chooseOperator(state, op) {
    state.stored = state.current;
    state.operator = op;
    return state;
  }
  function evaluate(state) {
    var a = Number(state.stored), b = Number(state.current);
    var v = state.operator === "×" ? a * b : state.operator === "+" ? a + b : state.operator === "-" ? a - b : a / b;
    state.current = String(v);
    state.stored = null; state.operator = null;
    return { ok: true, text: state.current, expression: "" };
  }
  function reset(state) { state.current = "0"; state.stored = null; state.operator = null; state.error = false; return state; }
  function view(state) {
    return { value: state.current, expression: state.operator ? state.stored + " " + state.operator : "", operator: state.operator, error: state.error };
  }
  global.Calculator = { createState: createState, inputDigit: inputDigit, chooseOperator: chooseOperator, evaluate: evaluate, reset: reset, view: view };
})(window);
`,
    },
    {
      path: "scripts/app.js",
      content: `
(function () {
  var Calc = window.Calculator;
  var state = Calc.createState();
  var valueEl = document.getElementById("screen-value");
  var exprEl = document.getElementById("screen-expr");
  function render() {
    var v = Calc.view(state);
    valueEl.textContent = v.value;
    exprEl.textContent = v.expression;
  }
  document.querySelectorAll("[data-digit]").forEach(function (btn) {
    btn.addEventListener("click", function () { Calc.inputDigit(state, btn.getAttribute("data-digit")); render(); });
  });
  document.querySelectorAll("[data-op]").forEach(function (btn) {
    btn.addEventListener("click", function () { Calc.chooseOperator(state, btn.getAttribute("data-op")); render(); });
  });
  document.getElementById("btn-equals").addEventListener("click", function () { Calc.evaluate(state); render(); });
  document.getElementById("btn-clear").addEventListener("click", function () { Calc.reset(state); render(); });
  render();
})();
`,
    },
  ];
}

describe("looksLikeCalculator", () => {
  it("detects digit+op pads", () => {
    expect(looksLikeCalculator(brokenAtomsCalcFiles())).toBe(true);
    expect(
      looksLikeCalculator([
        { path: "index.html", content: `<button data-feature="add">添加</button>` },
        { path: "scripts/app.js", content: `window.atomslite.db.list("todos")` },
      ]),
    ).toBe(false);
  });
});

describe("ensureCalculatorSemantics", () => {
  it("repairs broken AtomsCalc so Preview 7×8=56 and ±×÷/clear pass", async () => {
    const before = await previewCalculatorMath(brokenAtomsCalcFiles());
    expect(before.ok).toBe(false);

    const fixed = ensureCalculatorSemantics(brokenAtomsCalcFiles());
    const after = await previewCalculatorMath(fixed);
    expect(after).toMatchObject({ ok: true, mul: expect.stringMatching(/\b56\b/), add: expect.stringMatching(/\b15\b/) });
  });

  it("repairs broken Calculator + screen-value so harness reads 56", async () => {
    const before = await previewCalculatorMath(brokenCalculatorScreenValueFiles());
    expect(before.ok).toBe(false);

    const fixed = ensureCalculatorSemantics(brokenCalculatorScreenValueFiles());
    const after = await previewCalculatorMath(fixed);
    expect(after.ok).toBe(true);
    expect(after.mul).toMatch(/\b56\b/);
    expect(after.sub).toMatch(/\b5\b/);
    expect(after.div).toMatch(/\b4\b/);
  });

  it("leaves non-calculator apps unchanged", () => {
    const files = [
      { path: "index.html", content: `<html><body><button data-feature="add">添加</button><script src="scripts/app.js"></script></body></html>` },
      { path: "scripts/app.js", content: `window.atomslite.db.list("todos")` },
    ];
    expect(ensureCalculatorSemantics(files)).toEqual(files);
  });

  it("repairs AtomsliteCalculator.create + AtomsliteDB apps after domain overwrite", async () => {
    const files = atomsliteNamedModuleFiles();
    const before = await previewCalculatorMath(files);
    expect(before.ok).toBe(false);
    expect(`${before.error || ""} ${(before.runtimeErrors || []).join(" ")}`).toMatch(
      /AtomsliteCalculator|AtomsliteDB/,
    );

    const fixed = ensureCalculatorSemantics(files);
    const domain = fixed.find((f) => f.path === "scripts/calculator.js")!.content;
    expect(domain).toMatch(/AtomsliteCalculator/);

    const after = await previewCalculatorMath(fixed);
    expect(after.ok).toBe(true);
    expect(after.mul).toMatch(/\b56\b/);
    expect(after.add).toMatch(/\b15\b/);
    expect(after.cleared).toMatch(/\b0\b/);
  });

  it("injects AtomsliteDB facade when app needs it but db module is missing", async () => {
    const files = atomsliteNamedModuleFiles().filter((f) => f.path !== "scripts/db.js");
    const index = files.find((f) => f.path === "index.html")!;
    index.content = index.content.replace('<script src="scripts/db.js"></script>\n', "");

    const fixed = ensureCalculatorSemantics(files);
    expect(fixed.some((f) => /AtomsliteDB\s*=/.test(f.content))).toBe(true);
    const after = await previewCalculatorMath(fixed);
    expect(after.ok).toBe(true);
    expect(after.mul).toMatch(/\b56\b/);
  });
});

/**
 * Trial-19 class: app needs AtomsliteCalculator.create() + AtomsliteDB, but domain
 * only exposes AtomsCalc/Calculator (as after a naive overwrite).
 */
function atomsliteNamedModuleFiles() {
  return [
    {
      path: "index.html",
      content: `<!doctype html><html><body>
<div id="display" aria-live="polite">0</div>
<button type="button" data-digit="7">7</button>
<button type="button" data-digit="8">8</button>
<button type="button" data-digit="1">1</button>
<button type="button" data-digit="2">2</button>
<button type="button" data-digit="3">3</button>
<button type="button" data-digit="9">9</button>
<button type="button" data-digit="4">4</button>
<button type="button" data-op="*">×</button>
<button type="button" data-op="+">+</button>
<button type="button" data-op="-">-</button>
<button type="button" data-op="/">÷</button>
<button type="button" data-action="clear">C</button>
<button type="button" data-action="equals">=</button>
<script src="scripts/db.js"></script>
<script src="scripts/calculator.js"></script>
<script src="scripts/app.js"></script>
</body></html>`,
    },
    {
      path: "scripts/db.js",
      content: `
(function (global) {
  global.AtomsliteDB = {
    listHistory: function () { return Promise.resolve([]); },
    addHistory: function () { return Promise.resolve({}); },
    clearHistory: function () { return Promise.resolve({}); }
  };
})(window);
`,
    },
    {
      path: "scripts/calculator.js",
      content: `
(function (global) {
  global.AtomsCalc = { inputDigit: function () { return "0"; }, getDisplay: function () { return "0"; } };
  global.Calculator = { createState: function () { return {}; } };
})(window);
`,
    },
    {
      path: "scripts/app.js",
      content: `
(function (global) {
  var Calc = global.AtomsliteCalculator;
  var DB = global.AtomsliteDB;
  if (!Calc || !DB) {
    console.error("缺少 AtomsliteCalculator 或 AtomsliteDB 依赖");
    return;
  }
  var calc = Calc.create();
  var display = document.getElementById("display");
  function render() { display.textContent = calc.getDisplay(); }
  document.querySelectorAll("[data-digit]").forEach(function (btn) {
    btn.addEventListener("click", function () { calc.inputDigit(btn.getAttribute("data-digit")); render(); });
  });
  document.querySelectorAll("[data-op]").forEach(function (btn) {
    btn.addEventListener("click", function () { calc.chooseOperator(btn.getAttribute("data-op")); render(); });
  });
  document.querySelector('[data-action="equals"]').addEventListener("click", function () {
    calc.evaluate(); render();
    DB.addHistory({ expression: "x", result: calc.getDisplay() });
  });
  document.querySelector('[data-action="clear"]').addEventListener("click", function () { calc.clear(); render(); });
  render();
})(window);
`,
    },
  ];
}
