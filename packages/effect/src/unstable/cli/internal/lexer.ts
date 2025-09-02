export type Token =
  | { _tag: "LongOption"; name: string; raw: string; value?: string }
  | { _tag: "ShortOption"; flag: string; raw: string; value?: string }
  | { _tag: "Value"; value: string }

export interface LexResult {
  readonly tokens: ReadonlyArray<Token>
  readonly trailingOperands: ReadonlyArray<string>
}

export function lex(argv: ReadonlyArray<string>): LexResult {
  const endIndex = argv.indexOf("--")

  if (endIndex === -1) {
    // No -- delimiter, lex everything normally
    return {
      tokens: lexTokens(argv),
      trailingOperands: []
    }
  }

  // Split at -- delimiter
  return {
    tokens: lexTokens(argv.slice(0, endIndex)),
    trailingOperands: argv.slice(endIndex + 1)
  }
}

function lexTokens(args: ReadonlyArray<string>): ReadonlyArray<Token> {
  const tokens: Array<Token> = []

  for (const arg of args) {
    if (!arg.startsWith("-")) {
      tokens.push({ _tag: "Value", value: arg })
    } else if (arg.startsWith("--")) {
      const [name, value] = arg.slice(2).split("=", 2)
      tokens.push({ _tag: "LongOption", name, raw: arg, value })
    } else if (arg.length > 1) {
      const flags = arg.slice(1)
      const equalIndex = flags.indexOf("=")
      if (equalIndex !== -1) {
        const flag = flags.slice(0, equalIndex)
        const value = flags.slice(equalIndex + 1)
        tokens.push({ _tag: "ShortOption", flag, raw: `-${flag}`, value })
      } else {
        for (const ch of flags) {
          tokens.push({ _tag: "ShortOption", flag: ch, raw: `-${ch}` })
        }
      }
    } else {
      tokens.push({ _tag: "Value", value: arg })
    }
  }

  return tokens
}
