// A small, safe math-expression parser. It never uses eval or Function: the input is turned into
// a tree of closures that can only do arithmetic and call the whitelisted functions below.
export class ExprError extends Error {}

const FUNCS: Record<string, (v: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, ln: Math.log, log: Math.log10, log10: Math.log10, log2: Math.log2,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, sign: Math.sign, floor: Math.floor, ceil: Math.ceil,
}
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E }
const NAMES = [...Object.keys(FUNCS), ...Object.keys(CONSTS), 'x'].sort((a, b) => b.length - a.length)

type Tok =
  | { t: 'num'; v: number; pos: number }
  | { t: 'name'; v: string; pos: number }
  | { t: 'op'; v: string; pos: number }
  | { t: 'end'; pos: number }

const NUM = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/

function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) { i++; continue }
    const rest = src.slice(i)
    const n = NUM.exec(rest)
    if (n) { out.push({ t: 'num', v: Number(n[0]), pos: i }); i += n[0].length; continue }
    if (/[a-zA-Z]/.test(ch)) {
      const name = NAMES.find((k) => rest.startsWith(k))
      if (!name) {
        const word = /^[a-zA-Z]+/.exec(rest)![0]
        throw new ExprError(
          word.length === 1 && word !== 'x'
            ? `I don’t know “${word}”. Use x as the variable.`
            : `I don’t recognise “${word}”. Try sin, cos, tan, exp, ln, log, sqrt, abs, pi, e.`,
        )
      }
      out.push({ t: 'name', v: name, pos: i }); i += name.length; continue
    }
    if ('+-*/^()'.includes(ch)) { out.push({ t: 'op', v: ch, pos: i }); i++; continue }
    if (ch === '×' || ch === '·') { out.push({ t: 'op', v: '*', pos: i }); i++; continue }
    if (ch === '−') { out.push({ t: 'op', v: '-', pos: i }); i++; continue }
    throw new ExprError(`Unexpected character “${ch}”.`)
  }
  out.push({ t: 'end', pos: src.length })
  return out
}

type Node = (x: number) => number

export function parseExpr(src: string): (x: number) => number {
  const text = src.replace(/\*\*/g, '^')
  if (!text.trim()) throw new ExprError('Type a function of x, for example x^2 * sin(x).')
  if (text.length > 200) throw new ExprError('That expression is too long (200 characters max).')
  const toks = tokenize(text)
  let p = 0
  let depth = 0
  const peek = () => toks[p]
  const isOp = (v: string) => peek().t === 'op' && (peek() as { v: string }).v === v

  const expr = (): Node => {
    let left = term()
    while (isOp('+') || isOp('-')) {
      const op = (toks[p++] as { v: string }).v
      const l = left, r = term()
      left = op === '+' ? (x) => l(x) + r(x) : (x) => l(x) - r(x)
    }
    return left
  }
  const startsFactor = () => {
    const k = peek()
    return k.t === 'name' || k.t === 'num' || (k.t === 'op' && k.v === '(')
  }
  const term = (): Node => {
    let left = unary()
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = (toks[p++] as { v: string }).v
        const l = left, r = unary()
        left = op === '*' ? (x) => l(x) * r(x) : (x) => l(x) / r(x)
      } else if (startsFactor() && peek().t !== 'num') {
        const l = left, r = unary() // implicit multiplication: 2x, 3sin(x), (x+1)(x-1)
        left = (x) => l(x) * r(x)
      } else break
    }
    return left
  }
  const unary = (): Node => {
    if (isOp('-')) { p++; const v = unary(); return (x) => -v(x) }
    if (isOp('+')) { p++; return unary() }
    return power()
  }
  const power = (): Node => {
    const base = atom()
    if (isOp('^')) {
      p++
      const ex = unary()
      return (x) => Math.pow(base(x), ex(x))
    }
    return base
  }
  const atom = (): Node => {
    const k = toks[p]
    if (k.t === 'num') { p++; const v = k.v; return () => v }
    if (k.t === 'name') {
      p++
      if (k.v === 'x') return (x) => x
      if (k.v in CONSTS) { const v = CONSTS[k.v]; return () => v }
      const fn = FUNCS[k.v]
      if (!isOp('(')) throw new ExprError(`Put the input of ${k.v} in brackets: ${k.v}(x).`)
      p++
      if (++depth > 40) throw new ExprError('Too many nested brackets.')
      const inner = expr()
      if (!isOp(')')) throw new ExprError(`Missing a closing bracket after ${k.v}(…`)
      p++; depth--
      return (x) => fn(inner(x))
    }
    if (k.t === 'op' && k.v === '(') {
      p++
      if (++depth > 40) throw new ExprError('Too many nested brackets.')
      const inner = expr()
      if (!isOp(')')) throw new ExprError('Missing a closing bracket “)”.')
      p++; depth--
      return inner
    }
    if (k.t === 'end') throw new ExprError('The expression ends too early. Is something missing after the last operator?')
    throw new ExprError(`Unexpected “${(k as { v: string | number }).v}” here.`)
  }

  const tree = expr()
  const k = peek()
  if (k.t !== 'end') {
    throw new ExprError(
      k.t === 'op' && k.v === ')' ? 'There is a “)” without a matching “(”.' : `Unexpected “${(k as { v: string | number }).v}”. Did you forget an operator such as * ?`,
    )
  }
  // Non-finite results (log of a negative, division by zero) become NaN so graphs show a gap.
  return (x) => {
    const v = tree(x)
    return Number.isFinite(v) ? v : NaN
  }
}
