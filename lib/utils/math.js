// Pure, safe math expression evaluator for peso amount inputs (e.g., "145+35", "220*2", "(120+80)/2").
// Uses a recursive-descent parser — never eval() or new Function().

const MAX_CENTS = 100_000_000_000; // ₱1,000,000,000.00

/** Returns true if the input looks like a math expression rather than a plain number. */
export function hasMathExpression(input) {
  const s = String(input ?? "").replace(/[₱,\s]/g, "");
  if (!s) return false;
  return /[+\-*×/÷()]/.test(s) || /[\d)][xX][\d(]/.test(s);
}

/**
 * Evaluates a basic arithmetic expression (+, -, *, /, parentheses) and returns integer centavos.
 * Returns null if the expression is incomplete, invalid, divides by zero, <= 0, or exceeds MAX_CENTS.
 */
export function evaluateMoneyExpression(input) {
  let raw = String(input ?? "")
    .replace(/[₱,\s]/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/");

  // Allow "2x150" or "(50+20)x2" as multiplication
  raw = raw.replace(/([\d.)])[xX](?=[\d.(])/g, "$1*");

  if (!raw || raw.length > 120) return null;

  // Tokenize
  const tokens = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let numStr = "";
      let dots = 0;
      while (i < raw.length && ((raw[i] >= "0" && raw[i] <= "9") || raw[i] === ".")) {
        if (raw[i] === ".") dots++;
        if (dots > 1) return null;
        numStr += raw[i++];
      }
      if (numStr === ".") return null;
      const val = Number(numStr);
      if (!Number.isFinite(val)) return null;
      tokens.push({ type: "num", value: val });
    } else if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "(" || ch === ")") {
      tokens.push({ type: ch });
      i++;
    } else {
      return null;
    }
  }

  if (tokens.length === 0) return null;

  let pos = 0;
  let invalid = false;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr() {
    let left = parseTerm();
    while (!invalid && peek() && (peek().type === "+" || peek().type === "-")) {
      const op = consume().type;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parseUnary();
    while (!invalid && peek() && (peek().type === "*" || peek().type === "/")) {
      const op = consume().type;
      const right = parseUnary();
      if (op === "/") {
        if (right === 0) {
          invalid = true;
          return 0;
        }
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  function parseUnary() {
    if (!invalid && peek() && (peek().type === "+" || peek().type === "-")) {
      const op = consume().type;
      const val = parseUnary();
      return op === "-" ? -val : val;
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const tok = peek();
    if (!tok) {
      invalid = true;
      return 0;
    }
    if (tok.type === "num") {
      consume();
      return tok.value;
    }
    if (tok.type === "(") {
      consume();
      const val = parseExpr();
      if (!peek() || peek().type !== ")") {
        invalid = true;
        return 0;
      }
      consume();
      return val;
    }
    invalid = true;
    return 0;
  }

  const result = parseExpr();
  if (invalid || pos !== tokens.length || !Number.isFinite(result)) return null;

  const cents = Math.round(result * 100);
  if (cents <= 0 || cents > MAX_CENTS) return null;
  return cents;
}
