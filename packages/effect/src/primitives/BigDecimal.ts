/**
 * This module provides utility functions and type class instances for working with the `BigDecimal` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for `Equivalence` and `Order`.
 *
 * A `BigDecimal` allows storing any real number to arbitrary precision; which avoids common floating point errors
 * (such as 0.1 + 0.2 ≠ 0.3) at the cost of complexity.
 *
 * Internally, `BigDecimal` uses a `BigInt` object, paired with a 64-bit integer which determines the position of the
 * decimal point. Therefore, the precision *is not* actually arbitrary, but limited to 2<sup>63</sup> decimal places.
 *
 * It is not recommended to convert a floating point number to a decimal directly, as the floating point representation
 * may be unexpected.
 *
 * @since 2.0.0
 */

import * as equivalence from "../data/Equivalence.ts"
import * as order from "../data/Order.ts"
import type { Ordering } from "../data/Ordering.ts"
import { hasProperty } from "../data/Predicate.ts"
import { dual } from "../Function.ts"
import * as Equal from "../interfaces/Equal.ts"
import * as Hash from "../interfaces/Hash.ts"
import { type Inspectable, NodeInspectSymbol } from "../interfaces/Inspectable.ts"
import { type Pipeable, pipeArguments } from "../interfaces/Pipeable.ts"

const DEFAULT_PRECISION = 100
const FINITE_INT_REGEX = /^[+-]?\d+$/

const TypeId = "~effect/primitives/BigDecimal"

/**
 * Represents an arbitrary precision decimal number.
 *
 * @example
 * ```ts
 * import { BigDecimal } from "effect/primitives"
 *
 * const d = BigDecimal.fromNumberUnsafe(123.45)
 *
 * d.value // 12345n
 * d.scale // 2
 * ```
 *
 * @category models
 * @since 2.0.0
 */
export interface BigDecimal extends Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: typeof TypeId
  readonly value: bigint
  readonly scale: number
  /** @internal */
  normalized?: BigDecimal
}

const BigDecimalProto: Omit<BigDecimal, "value" | "scale" | "normalized"> = {
  [TypeId]: TypeId,
  [Hash.symbol](this: BigDecimal, context: Hash.HashContext): number {
    const normalized = normalize(this)
    return context.combine(context.hash(normalized.value), context.number(normalized.scale))
  },
  [Equal.symbol](this: BigDecimal, that: unknown): boolean {
    return isBigDecimal(that) && equals(this, that)
  },
  toString(this: BigDecimal) {
    return `BigDecimal(${format(this)})`
  },
  toJSON(this: BigDecimal) {
    return {
      _id: "BigDecimal",
      value: String(this.value),
      scale: this.scale
    }
  },
  [NodeInspectSymbol](this: BigDecimal) {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
} as const

/**
 * Checks if a given value is a `BigDecimal`.
 *
 * @example
 * ```ts
 * import { BigDecimal } from "effect/primitives"
 *
 * const decimal = BigDecimal.fromNumber(123.45)
 * console.log(BigDecimal.isBigDecimal(decimal)) // true
 * console.log(BigDecimal.isBigDecimal(123.45)) // false
 * console.log(BigDecimal.isBigDecimal("123.45")) // false
 * ```
 *
 * @since 2.0.0
 * @category guards
 */
export const isBigDecimal = (u: unknown): u is BigDecimal => hasProperty(u, TypeId)

/**
 * Creates a `BigDecimal` from a `bigint` value and a scale.
 *
 * @example
 * ```ts
 * import { BigDecimal } from "effect/primitives"
 *
 * // Create 123.45 (12345 with scale 2)
 * const decimal = BigDecimal.make(12345n, 2)
 * console.log(BigDecimal.format(decimal)) // "123.45"
 *
 * // Create 42 (42 with scale 0)
 * const integer = BigDecimal.make(42n, 0)
 * console.log(BigDecimal.format(integer)) // "42"
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export const make = (value: bigint, scale: number): BigDecimal => {
  const o = Object.create(BigDecimalProto)
  o.value = value
  o.scale = scale
  return o
}

/**
 * Internal function used to create pre-normalized `BigDecimal`s.
 *
 * @internal
 */
export const makeNormalizedUnsafe = (value: bigint, scale: number): BigDecimal => {
  if (value !== bigint0 && value % bigint10 === bigint0) {
    throw new RangeError("Value must be normalized")
  }

  const o = make(value, scale)
  o.normalized = o
  return o
}

const bigint0 = BigInt(0)
const bigint1 = BigInt(1)
const bigint10 = BigInt(10)
const zero = makeNormalizedUnsafe(bigint0, 0)

/**
 * Normalizes a given `BigDecimal` by removing trailing zeros.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { normalize, make, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(normalize(fromStringUnsafe("123.00000")), normalize(make(123n, 0)))
 * assert.deepStrictEqual(normalize(fromStringUnsafe("12300000")), normalize(make(123n, -5)))
 * ```
 *
 * @since 2.0.0
 * @category scaling
 */
export const normalize = (self: BigDecimal): BigDecimal => {
  if (self.normalized === undefined) {
    if (self.value === bigint0) {
      self.normalized = zero
    } else {
      const digits = `${self.value}`

      let trail = 0
      for (let i = digits.length - 1; i >= 0; i--) {
        if (digits[i] === "0") {
          trail++
        } else {
          break
        }
      }

      if (trail === 0) {
        self.normalized = self
      }

      const value = BigInt(digits.substring(0, digits.length - trail))
      const scale = self.scale - trail
      self.normalized = makeNormalizedUnsafe(value, scale)
    }
  }

  return self.normalized
}

/**
 * Scales a given `BigDecimal` to the specified scale.
 *
 * If the given scale is smaller than the current scale, the value will be rounded down to
 * the nearest integer.
 *
 * @example
 * ```ts
 * import { BigDecimal } from "effect/primitives"
 *
 * const decimal = BigDecimal.fromNumberUnsafe(123.45)
 *
 * // Increase scale (add more precision)
 * const scaled = BigDecimal.scale(decimal, 4)
 * console.log(BigDecimal.format(scaled)) // "123.4500"
 *
 * // Decrease scale (reduce precision, rounds down)
 * const reduced = BigDecimal.scale(decimal, 1)
 * console.log(BigDecimal.format(reduced)) // "123.4"
 * ```
 *
 * @since 2.0.0
 * @category scaling
 */
export const scale: {
  (scale: number): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, scale: number): BigDecimal
} = dual(2, (self: BigDecimal, scale: number): BigDecimal => {
  if (scale > self.scale) {
    return make(self.value * bigint10 ** BigInt(scale - self.scale), scale)
  }

  if (scale < self.scale) {
    return make(self.value / bigint10 ** BigInt(self.scale - scale), scale)
  }

  return self
})

/**
 * Provides an addition operation on `BigDecimal`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { sum, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(sum(fromStringUnsafe("2"), fromStringUnsafe("3")), fromStringUnsafe("5"))
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const sum: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, that: BigDecimal): BigDecimal => {
  if (that.value === bigint0) {
    return self
  }

  if (self.value === bigint0) {
    return that
  }

  if (self.scale > that.scale) {
    return make(scale(that, self.scale).value + self.value, self.scale)
  }

  if (self.scale < that.scale) {
    return make(scale(self, that.scale).value + that.value, that.scale)
  }

  return make(self.value + that.value, self.scale)
})

/**
 * Provides a multiplication operation on `BigDecimal`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { multiply, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(multiply(fromStringUnsafe("2"), fromStringUnsafe("3")), fromStringUnsafe("6"))
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const multiply: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, that: BigDecimal): BigDecimal => {
  if (that.value === bigint0 || self.value === bigint0) {
    return zero
  }

  return make(self.value * that.value, self.scale + that.scale)
})

/**
 * Provides a subtraction operation on `BigDecimal`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { subtract, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(subtract(fromStringUnsafe("2"), fromStringUnsafe("3")), fromStringUnsafe("-1"))
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const subtract: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, that: BigDecimal): BigDecimal => {
  if (that.value === bigint0) {
    return self
  }

  if (self.value === bigint0) {
    return make(-that.value, that.scale)
  }

  if (self.scale > that.scale) {
    return make(self.value - scale(that, self.scale).value, self.scale)
  }

  if (self.scale < that.scale) {
    return make(scale(self, that.scale).value - that.value, that.scale)
  }

  return make(self.value - that.value, self.scale)
})

/**
 * Internal function used for arbitrary precision division.
 */
const divideWithPrecision = (
  num: bigint,
  den: bigint,
  scale: number,
  precision: number
): BigDecimal => {
  const numNegative = num < bigint0
  const denNegative = den < bigint0
  const negateResult = numNegative !== denNegative

  num = numNegative ? -num : num
  den = denNegative ? -den : den

  // Shift digits until numerator is larger than denominator (set scale appropriately).
  while (num < den) {
    num *= bigint10
    scale++
  }

  // First division.
  let quotient = num / den
  let remainder = num % den

  if (remainder === bigint0) {
    // No remainder, return immediately.
    return make(negateResult ? -quotient : quotient, scale)
  }

  // The quotient is guaranteed to be non-negative at this point. No need to consider sign.
  let count = `${quotient}`.length

  // Shift the remainder by 1 decimal; The quotient will be 1 digit upon next division.
  remainder *= bigint10
  while (remainder !== bigint0 && count < precision) {
    const q = remainder / den
    const r = remainder % den
    quotient = quotient * bigint10 + q
    remainder = r * bigint10

    count++
    scale++
  }

  if (remainder !== bigint0) {
    // Round final number with remainder.
    quotient += roundTerminal(remainder / den)
  }

  return make(negateResult ? -quotient : quotient, scale)
}

/**
 * Internal function used for rounding.
 *
 * Returns 1 if the most significant digit is >= 5, otherwise 0.
 *
 * This is used after dividing a number by a power of ten and rounding the last digit.
 *
 * @internal
 */
export const roundTerminal = (n: bigint): bigint => {
  const pos = n >= bigint0 ? 0 : 1
  return Number(`${n}`[pos]) < 5 ? bigint0 : bigint1
}

/**
 * Provides a division operation on `BigDecimal`s.
 *
 * If the dividend is not a multiple of the divisor the result will be a `BigDecimal` value
 * which represents the integer division rounded down to the nearest integer.
 *
 * If the divisor is `0`, the result will be `undefined`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { BigDecimal } from "effect/primitives"
 *
 * assert.deepStrictEqual(BigDecimal.divide(BigDecimal.fromStringUnsafe("6"), BigDecimal.fromStringUnsafe("3")), BigDecimal.fromStringUnsafe("2"))
 * assert.deepStrictEqual(BigDecimal.divide(BigDecimal.fromStringUnsafe("6"), BigDecimal.fromStringUnsafe("4")), BigDecimal.fromStringUnsafe("1.5"))
 * assert.deepStrictEqual(BigDecimal.divide(BigDecimal.fromStringUnsafe("6"), BigDecimal.fromStringUnsafe("0")), undefined)
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const divide: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal | undefined
  (self: BigDecimal, that: BigDecimal): BigDecimal | undefined
} = dual(2, (self: BigDecimal, that: BigDecimal): BigDecimal | undefined => {
  if (that.value === bigint0) {
    return undefined
  }

  if (self.value === bigint0) {
    return zero
  }

  const scale = self.scale - that.scale
  if (self.value === that.value) {
    return make(bigint1, scale)
  }

  return divideWithPrecision(self.value, that.value, scale, DEFAULT_PRECISION)
})

/**
 * Provides an unsafe division operation on `BigDecimal`s.
 *
 * If the dividend is not a multiple of the divisor the result will be a `BigDecimal` value
 * which represents the integer division rounded down to the nearest integer.
 *
 * Throws a `RangeError` if the divisor is `0`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { divideUnsafe, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(divideUnsafe(fromStringUnsafe("6"), fromStringUnsafe("3")), fromStringUnsafe("2"))
 * assert.deepStrictEqual(divideUnsafe(fromStringUnsafe("6"), fromStringUnsafe("4")), fromStringUnsafe("1.5"))
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const divideUnsafe: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, that: BigDecimal): BigDecimal => {
  if (that.value === bigint0) {
    throw new RangeError("Division by zero")
  }

  if (self.value === bigint0) {
    return zero
  }

  const scale = self.scale - that.scale
  if (self.value === that.value) {
    return make(bigint1, scale)
  }
  return divideWithPrecision(self.value, that.value, scale, DEFAULT_PRECISION)
})

/**
 * Provides an `Order` instance for `BigDecimal` that allows comparing and sorting BigDecimal values.
 *
 * @example
 * ```ts
 * import { BigDecimal } from "effect/primitives"
 *
 * const a = BigDecimal.fromNumberUnsafe(1.5)
 * const b = BigDecimal.fromNumberUnsafe(2.3)
 * const c = BigDecimal.fromNumberUnsafe(1.5)
 *
 * console.log(BigDecimal.Order(a, b)) // -1 (a < b)
 * console.log(BigDecimal.Order(b, a)) // 1 (b > a)
 * console.log(BigDecimal.Order(a, c)) // 0 (a === c)
 * ```
 *
 * @since 2.0.0
 * @category instances
 */
export const Order: order.Order<BigDecimal> = order.make((self, that) => {
  const scmp = order.number(sign(self), sign(that))
  if (scmp !== 0) {
    return scmp
  }

  if (self.scale > that.scale) {
    return order.bigint(self.value, scale(that, self.scale).value)
  }

  if (self.scale < that.scale) {
    return order.bigint(scale(self, that.scale).value, that.value)
  }

  return order.bigint(self.value, that.value)
})

/**
 * Returns `true` if the first argument is less than the second, otherwise `false`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { lessThan, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(lessThan(fromStringUnsafe("2"), fromStringUnsafe("3")), true)
 * assert.deepStrictEqual(lessThan(fromStringUnsafe("3"), fromStringUnsafe("3")), false)
 * assert.deepStrictEqual(lessThan(fromStringUnsafe("4"), fromStringUnsafe("3")), false)
 * ```
 *
 * @since 2.0.0
 * @category predicates
 */
export const lessThan: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = order.lessThan(Order)

/**
 * Checks if a given `BigDecimal` is less than or equal to the provided one.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { lessThanOrEqualTo, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(lessThanOrEqualTo(fromStringUnsafe("2"), fromStringUnsafe("3")), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(fromStringUnsafe("3"), fromStringUnsafe("3")), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(fromStringUnsafe("4"), fromStringUnsafe("3")), false)
 * ```
 *
 * @since 2.0.0
 * @category predicates
 */
export const lessThanOrEqualTo: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = order.lessThanOrEqualTo(Order)

/**
 * Returns `true` if the first argument is greater than the second, otherwise `false`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { greaterThan, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(greaterThan(fromStringUnsafe("2"), fromStringUnsafe("3")), false)
 * assert.deepStrictEqual(greaterThan(fromStringUnsafe("3"), fromStringUnsafe("3")), false)
 * assert.deepStrictEqual(greaterThan(fromStringUnsafe("4"), fromStringUnsafe("3")), true)
 * ```
 *
 * @since 2.0.0
 * @category predicates
 */
export const greaterThan: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = order.greaterThan(Order)

/**
 * Checks if a given `BigDecimal` is greater than or equal to the provided one.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { greaterThanOrEqualTo, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(greaterThanOrEqualTo(fromStringUnsafe("2"), fromStringUnsafe("3")), false)
 * assert.deepStrictEqual(greaterThanOrEqualTo(fromStringUnsafe("3"), fromStringUnsafe("3")), true)
 * assert.deepStrictEqual(greaterThanOrEqualTo(fromStringUnsafe("4"), fromStringUnsafe("3")), true)
 * ```
 *
 * @since 2.0.0
 * @category predicates
 */
export const greaterThanOrEqualTo: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = order.greaterThanOrEqualTo(Order)

/**
 * Checks if a `BigDecimal` is between a `minimum` and `maximum` value (inclusive).
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { BigDecimal } from "effect/primitives"
 *
 * const between = BigDecimal.between({
 *   minimum: BigDecimal.fromStringUnsafe("1"),
 *   maximum: BigDecimal.fromStringUnsafe("5") }
 * )
 *
 * assert.deepStrictEqual(between(BigDecimal.fromStringUnsafe("3")), true)
 * assert.deepStrictEqual(between(BigDecimal.fromStringUnsafe("0")), false)
 * assert.deepStrictEqual(between(BigDecimal.fromStringUnsafe("6")), false)
 * ```
 *
 * @since 2.0.0
 * @category predicates
 */
export const between: {
  (options: {
    minimum: BigDecimal
    maximum: BigDecimal
  }): (self: BigDecimal) => boolean
  (self: BigDecimal, options: {
    minimum: BigDecimal
    maximum: BigDecimal
  }): boolean
} = order.between(Order)

/**
 * Restricts the given `BigDecimal` to be within the range specified by the `minimum` and `maximum` values.
 *
 * - If the `BigDecimal` is less than the `minimum` value, the function returns the `minimum` value.
 * - If the `BigDecimal` is greater than the `maximum` value, the function returns the `maximum` value.
 * - Otherwise, it returns the original `BigDecimal`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { BigDecimal } from "effect/primitives"
 *
 * const clamp = BigDecimal.clamp({
 *   minimum: BigDecimal.fromStringUnsafe("1"),
 *   maximum: BigDecimal.fromStringUnsafe("5") }
 * )
 *
 * assert.deepStrictEqual(clamp(BigDecimal.fromStringUnsafe("3")), BigDecimal.fromStringUnsafe("3"))
 * assert.deepStrictEqual(clamp(BigDecimal.fromStringUnsafe("0")), BigDecimal.fromStringUnsafe("1"))
 * assert.deepStrictEqual(clamp(BigDecimal.fromStringUnsafe("6")), BigDecimal.fromStringUnsafe("5"))
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const clamp: {
  (options: {
    minimum: BigDecimal
    maximum: BigDecimal
  }): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, options: {
    minimum: BigDecimal
    maximum: BigDecimal
  }): BigDecimal
} = order.clamp(Order)

/**
 * Returns the minimum between two `BigDecimal`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { min, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(min(fromStringUnsafe("2"), fromStringUnsafe("3")), fromStringUnsafe("2"))
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const min: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = order.min(Order)

/**
 * Returns the maximum between two `BigDecimal`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { max, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(max(fromStringUnsafe("2"), fromStringUnsafe("3")), fromStringUnsafe("3"))
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const max: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = order.max(Order)

/**
 * Determines the sign of a given `BigDecimal`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { sign, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(sign(fromStringUnsafe("-5")), -1)
 * assert.deepStrictEqual(sign(fromStringUnsafe("0")), 0)
 * assert.deepStrictEqual(sign(fromStringUnsafe("5")), 1)
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const sign = (n: BigDecimal): Ordering => n.value === bigint0 ? 0 : n.value < bigint0 ? -1 : 1

/**
 * Determines the absolute value of a given `BigDecimal`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { abs, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(abs(fromStringUnsafe("-5")), fromStringUnsafe("5"))
 * assert.deepStrictEqual(abs(fromStringUnsafe("0")), fromStringUnsafe("0"))
 * assert.deepStrictEqual(abs(fromStringUnsafe("5")), fromStringUnsafe("5"))
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const abs = (n: BigDecimal): BigDecimal => n.value < bigint0 ? make(-n.value, n.scale) : n

/**
 * Provides a negate operation on `BigDecimal`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { negate, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(negate(fromStringUnsafe("3")), fromStringUnsafe("-3"))
 * assert.deepStrictEqual(negate(fromStringUnsafe("-6")), fromStringUnsafe("6"))
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const negate = (n: BigDecimal): BigDecimal => make(-n.value, n.scale)

/**
 * Returns the remainder left over when one operand is divided by a second operand.
 *
 * If the divisor is `0`, the result will be `undefined`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { BigDecimal } from "effect/primitives"
 *
 * assert.deepStrictEqual(BigDecimal.remainder(BigDecimal.fromStringUnsafe("2"), BigDecimal.fromStringUnsafe("2")), BigDecimal.fromStringUnsafe("0"))
 * assert.deepStrictEqual(BigDecimal.remainder(BigDecimal.fromStringUnsafe("3"), BigDecimal.fromStringUnsafe("2")), BigDecimal.fromStringUnsafe("1"))
 * assert.deepStrictEqual(BigDecimal.remainder(BigDecimal.fromStringUnsafe("-4"), BigDecimal.fromStringUnsafe("2")), BigDecimal.fromStringUnsafe("0"))
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const remainder: {
  (divisor: BigDecimal): (self: BigDecimal) => BigDecimal | undefined
  (self: BigDecimal, divisor: BigDecimal): BigDecimal | undefined
} = dual(2, (self: BigDecimal, divisor: BigDecimal): BigDecimal | undefined => {
  if (divisor.value === bigint0) {
    return undefined
  }

  const max = Math.max(self.scale, divisor.scale)
  return make(scale(self, max).value % scale(divisor, max).value, max)
})

/**
 * Returns the remainder left over when one operand is divided by a second operand.
 *
 * Throws a `RangeError` if the divisor is `0`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { remainderUnsafe, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(remainderUnsafe(fromStringUnsafe("2"), fromStringUnsafe("2")), fromStringUnsafe("0"))
 * assert.deepStrictEqual(remainderUnsafe(fromStringUnsafe("3"), fromStringUnsafe("2")), fromStringUnsafe("1"))
 * assert.deepStrictEqual(remainderUnsafe(fromStringUnsafe("-4"), fromStringUnsafe("2")), fromStringUnsafe("0"))
 * ```
 *
 * @since 2.0.0
 * @category math
 */
export const remainderUnsafe: {
  (divisor: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, divisor: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, divisor: BigDecimal): BigDecimal => {
  if (divisor.value === bigint0) {
    throw new RangeError("Division by zero")
  }

  const max = Math.max(self.scale, divisor.scale)
  return make(scale(self, max).value % scale(divisor, max).value, max)
})

/**
 * Provides an `Equivalence` instance for `BigDecimal` that determines equality between BigDecimal values.
 *
 * @example
 * ```ts
 * import { BigDecimal } from "effect/primitives"
 *
 * const a = BigDecimal.fromNumberUnsafe(1.50)
 * const b = BigDecimal.fromNumberUnsafe(1.5)
 * const c = BigDecimal.fromNumberUnsafe(2.0)
 *
 * console.log(BigDecimal.Equivalence(a, b)) // true (1.50 === 1.5)
 * console.log(BigDecimal.Equivalence(a, c)) // false (1.50 !== 2.0)
 * ```
 *
 * @category instances
 * @since 2.0.0
 */
export const Equivalence: equivalence.Equivalence<BigDecimal> = equivalence.make((self, that) => {
  if (self.scale > that.scale) {
    return scale(that, self.scale).value === self.value
  }

  if (self.scale < that.scale) {
    return scale(self, that.scale).value === that.value
  }

  return self.value === that.value
})

/**
 * Checks if two `BigDecimal`s are equal.
 *
 * @example
 * ```ts
 * import { BigDecimal } from "effect/primitives"
 *
 * const a = BigDecimal.fromNumberUnsafe(1.5)
 * const b = BigDecimal.fromNumberUnsafe(1.50)
 * const c = BigDecimal.fromNumberUnsafe(2.0)
 *
 * console.log(BigDecimal.equals(a, b)) // true
 * console.log(BigDecimal.equals(a, c)) // false
 * ```
 *
 * @since 2.0.0
 * @category predicates
 */
export const equals: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = dual(2, (self: BigDecimal, that: BigDecimal): boolean => Equivalence(self, that))

/**
 * Creates a `BigDecimal` from a `bigint` value.
 *
 * @example
 * ```ts
 * import { BigDecimal } from "effect/primitives"
 *
 * const decimal = BigDecimal.fromBigInt(123n)
 * console.log(BigDecimal.format(decimal)) // "123"
 *
 * const largeBigInt = BigDecimal.fromBigInt(9007199254740991n)
 * console.log(BigDecimal.format(largeBigInt)) // "9007199254740991"
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromBigInt = (n: bigint): BigDecimal => make(n, 0)

/**
 * Creates a `BigDecimal` from a `number` value.
 *
 * It is not recommended to convert a floating point number to a decimal directly,
 * as the floating point representation may be unexpected.
 *
 * Throws a `RangeError` if the number is not finite (`NaN`, `+Infinity` or `-Infinity`).
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { fromNumberUnsafe, make } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(fromNumberUnsafe(123), make(123n, 0))
 * assert.deepStrictEqual(fromNumberUnsafe(123.456), make(123456n, 3))
 * ```
 *
 * @since 3.11.0
 * @category constructors
 */
export const fromNumberUnsafe = (n: number): BigDecimal => {
  const out = fromNumber(n)
  if (out) return out
  throw new RangeError(`Number must be finite, got ${n}`)
}

/**
 * Creates a `BigDecimal` from a `number` value.
 *
 * It is not recommended to convert a floating point number to a decimal directly,
 * as the floating point representation may be unexpected.
 *
 * Returns `undefined` for `NaN`, `+Infinity` or `-Infinity`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { BigDecimal } from "effect/primitives"
 *
 * assert.deepStrictEqual(BigDecimal.fromNumber(123), BigDecimal.make(123n, 0))
 * assert.deepStrictEqual(BigDecimal.fromNumber(123.456), BigDecimal.make(123456n, 3))
 * assert.deepStrictEqual(BigDecimal.fromNumber(Infinity), undefined)
 * ```
 *
 * @since 3.11.0
 * @category constructors
 */
export const fromNumber = (n: number): BigDecimal | undefined => {
  if (!Number.isFinite(n)) {
    return undefined
  }

  const string = `${n}`
  if (string.includes("e")) {
    return fromString(string)
  }

  const [lead, trail = ""] = string.split(".")
  return make(BigInt(`${lead}${trail}`), trail.length)
}

/**
 * Parses a numerical `string` into a `BigDecimal`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { BigDecimal } from "effect/primitives"
 *
 * assert.deepStrictEqual(BigDecimal.fromString("123"), BigDecimal.make(123n, 0))
 * assert.deepStrictEqual(BigDecimal.fromString("123.456"), BigDecimal.make(123456n, 3))
 * assert.deepStrictEqual(BigDecimal.fromString("123.abc"), undefined)
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromString = (s: string): BigDecimal | undefined => {
  if (s === "") {
    return zero
  }

  let base: string
  let exp: number
  const seperator = s.search(/[eE]/)
  if (seperator !== -1) {
    const trail = s.slice(seperator + 1)
    base = s.slice(0, seperator)
    exp = Number(trail)
    if (base === "" || !Number.isSafeInteger(exp) || !FINITE_INT_REGEX.test(trail)) {
      return undefined
    }
  } else {
    base = s
    exp = 0
  }

  let digits: string
  let offset: number
  const dot = base.search(/\./)
  if (dot !== -1) {
    const lead = base.slice(0, dot)
    const trail = base.slice(dot + 1)
    digits = `${lead}${trail}`
    offset = trail.length
  } else {
    digits = base
    offset = 0
  }

  if (!FINITE_INT_REGEX.test(digits)) {
    return undefined
  }

  const scale = offset - exp
  if (!Number.isSafeInteger(scale)) {
    return undefined
  }

  return make(BigInt(digits), scale)
}

/**
 * Parses a numerical `string` into a `BigDecimal`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { fromStringUnsafe, make } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(fromStringUnsafe("123"), make(123n, 0))
 * assert.deepStrictEqual(fromStringUnsafe("123.456"), make(123456n, 3))
 * assert.throws(() => fromStringUnsafe("123.abc"))
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromStringUnsafe = (s: string): BigDecimal => {
  const out = fromString(s)
  if (out) return out
  throw new Error("Invalid numerical string")
}

/**
 * Formats a given `BigDecimal` as a `string`.
 *
 * If the scale of the `BigDecimal` is greater than or equal to 16, the `BigDecimal` will
 * be formatted in scientific notation.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { format, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(format(fromStringUnsafe("-5")), "-5")
 * assert.deepStrictEqual(format(fromStringUnsafe("123.456")), "123.456")
 * assert.deepStrictEqual(format(fromStringUnsafe("-0.00000123")), "-0.00000123")
 * ```
 *
 * @since 2.0.0
 * @category conversions
 */
export const format = (n: BigDecimal): string => {
  const normalized = normalize(n)
  if (Math.abs(normalized.scale) >= 16) {
    return toExponential(normalized)
  }

  const negative = normalized.value < bigint0
  const absolute = negative ? `${normalized.value}`.substring(1) : `${normalized.value}`

  let before: string
  let after: string

  if (normalized.scale >= absolute.length) {
    before = "0"
    after = "0".repeat(normalized.scale - absolute.length) + absolute
  } else {
    const location = absolute.length - normalized.scale
    if (location > absolute.length) {
      const zeros = location - absolute.length
      before = `${absolute}${"0".repeat(zeros)}`
      after = ""
    } else {
      after = absolute.slice(location)
      before = absolute.slice(0, location)
    }
  }

  const complete = after === "" ? before : `${before}.${after}`
  return negative ? `-${complete}` : complete
}

/**
 * Formats a given `BigDecimal` as a `string` in scientific notation.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { toExponential, make } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(toExponential(make(123456n, -5)), "1.23456e+10")
 * ```
 *
 * @since 3.11.0
 * @category conversions
 */
export const toExponential = (n: BigDecimal): string => {
  if (isZero(n)) {
    return "0e+0"
  }

  const normalized = normalize(n)
  const digits = `${abs(normalized).value}`
  const head = digits.slice(0, 1)
  const tail = digits.slice(1)

  let output = `${isNegative(normalized) ? "-" : ""}${head}`
  if (tail !== "") {
    output += `.${tail}`
  }

  const exp = tail.length - normalized.scale
  return `${output}e${exp >= 0 ? "+" : ""}${exp}`
}

/**
 * Converts a `BigDecimal` to a `number`.
 *
 * This function will produce incorrect results if the `BigDecimal` exceeds the 64-bit range of a `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { toNumberUnsafe, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(toNumberUnsafe(fromStringUnsafe("123.456")), 123.456)
 * ```
 *
 * @since 2.0.0
 * @category conversions
 */
export const toNumberUnsafe = (n: BigDecimal): number => Number(format(n))

/**
 * Checks if a given `BigDecimal` is an integer.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isInteger, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(isInteger(fromStringUnsafe("0")), true)
 * assert.deepStrictEqual(isInteger(fromStringUnsafe("1")), true)
 * assert.deepStrictEqual(isInteger(fromStringUnsafe("1.1")), false)
 * ```
 *
 * @since 2.0.0
 * @category predicates
 */
export const isInteger = (n: BigDecimal): boolean => normalize(n).scale <= 0

/**
 * Checks if a given `BigDecimal` is `0`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isZero, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(isZero(fromStringUnsafe("0")), true)
 * assert.deepStrictEqual(isZero(fromStringUnsafe("1")), false)
 * ```
 *
 * @since 2.0.0
 * @category predicates
 */
export const isZero = (n: BigDecimal): boolean => n.value === bigint0

/**
 * Checks if a given `BigDecimal` is negative.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNegative, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(isNegative(fromStringUnsafe("-1")), true)
 * assert.deepStrictEqual(isNegative(fromStringUnsafe("0")), false)
 * assert.deepStrictEqual(isNegative(fromStringUnsafe("1")), false)
 * ```
 *
 * @since 2.0.0
 * @category predicates
 */
export const isNegative = (n: BigDecimal): boolean => n.value < bigint0

/**
 * Checks if a given `BigDecimal` is positive.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isPositive, fromStringUnsafe } from "effect/primitives/BigDecimal"
 *
 * assert.deepStrictEqual(isPositive(fromStringUnsafe("-1")), false)
 * assert.deepStrictEqual(isPositive(fromStringUnsafe("0")), false)
 * assert.deepStrictEqual(isPositive(fromStringUnsafe("1")), true)
 * ```
 *
 * @since 2.0.0
 * @category predicates
 */
export const isPositive = (n: BigDecimal): boolean => n.value > bigint0
