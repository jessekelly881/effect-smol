/**
 * This module provides utility functions and type class instances for working with the `bigint` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */

import * as Combiner from "../data/Combiner.ts"
import * as order from "../data/Order.ts"
import type { Ordering } from "../data/Ordering.ts"
import * as predicate from "../data/Predicate.ts"
import * as Reducer from "../data/Reducer.ts"
import { dual } from "../Function.ts"

/**
 * Reference to the global BigInt constructor.
 *
 * @example
 * ```ts
 * import * as BigInt from "effect/primitives/BigInt"
 *
 * const bigInt = BigInt.BigInt(123)
 * console.log(bigInt) // 123n
 *
 * const fromString = BigInt.BigInt("456")
 * console.log(fromString) // 456n
 * ```
 *
 * @category constructors
 * @since 4.0.0
 */
export const BigInt = globalThis.BigInt

const bigint0 = BigInt(0)
const bigint1 = BigInt(1)
const bigint2 = BigInt(2)

/**
 * Tests if a value is a `bigint`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isBigInt } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(isBigInt(1n), true)
 * assert.deepStrictEqual(isBigInt(1), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isBigInt: (u: unknown) => u is bigint = predicate.isBigInt

/**
 * Provides an addition operation on `bigint`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { sum } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(sum(2n, 3n), 5n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const sum: {
  (that: bigint): (self: bigint) => bigint
  (self: bigint, that: bigint): bigint
} = dual(2, (self: bigint, that: bigint): bigint => self + that)

/**
 * Provides a multiplication operation on `bigint`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { multiply } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(multiply(2n, 3n), 6n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const multiply: {
  (that: bigint): (self: bigint) => bigint
  (self: bigint, that: bigint): bigint
} = dual(2, (self: bigint, that: bigint): bigint => self * that)

/**
 * Provides a subtraction operation on `bigint`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { subtract } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(subtract(2n, 3n), -1n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const subtract: {
  (that: bigint): (self: bigint) => bigint
  (self: bigint, that: bigint): bigint
} = dual(2, (self: bigint, that: bigint): bigint => self - that)

/**
 * Provides a division operation on `bigint`s.
 *
 * If the dividend is not a multiple of the divisor the result will be a `bigint` value
 * which represents the integer division rounded down to the nearest integer.
 *
 * Returns `undefined` if the divisor is `0n`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { divide } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(divide(6n, 3n), 2n)
 * assert.deepStrictEqual(divide(6n, 0n), undefined)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const divide: {
  (that: bigint): (self: bigint) => bigint | undefined
  (self: bigint, that: bigint): bigint | undefined
} = dual(
  2,
  (self: bigint, that: bigint): bigint | undefined => that === bigint0 ? undefined : self / that
)

/**
 * Provides a division operation on `bigint`s.
 *
 * If the dividend is not a multiple of the divisor the result will be a `bigint` value
 * which represents the integer division rounded down to the nearest integer.
 *
 * Throws a `RangeError` if the divisor is `0n`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { divideUnsafe } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(divideUnsafe(6n, 3n), 2n)
 * assert.deepStrictEqual(divideUnsafe(6n, 4n), 1n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const divideUnsafe: {
  (that: bigint): (self: bigint) => bigint
  (self: bigint, that: bigint): bigint
} = dual(2, (self: bigint, that: bigint): bigint => self / that)

/**
 * Returns the result of adding `1n` to a given number.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { increment } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(increment(2n), 3n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const increment = (n: bigint): bigint => n + bigint1

/**
 * Decrements a number by `1n`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { decrement } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(decrement(3n), 2n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const decrement = (n: bigint): bigint => n - bigint1

/**
 * Provides an `Order` instance for `bigint` that allows comparing and sorting BigInt values.
 *
 * @example
 * ```ts
 * import * as BigInt from "effect/primitives/BigInt"
 *
 * const a = 123n
 * const b = 456n
 * const c = 123n
 *
 * console.log(BigInt.Order(a, b)) // -1 (a < b)
 * console.log(BigInt.Order(b, a)) // 1 (b > a)
 * console.log(BigInt.Order(a, c)) // 0 (a === c)
 * ```
 *
 * @category instances
 * @since 2.0.0
 */
export const Order: order.Order<bigint> = order.bigint

/**
 * Returns `true` if the first argument is less than the second, otherwise `false`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { lessThan } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(lessThan(2n, 3n), true)
 * assert.deepStrictEqual(lessThan(3n, 3n), false)
 * assert.deepStrictEqual(lessThan(4n, 3n), false)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const lessThan: {
  (that: bigint): (self: bigint) => boolean
  (self: bigint, that: bigint): boolean
} = order.lessThan(Order)

/**
 * Returns a function that checks if a given `bigint` is less than or equal to the provided one.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { lessThanOrEqualTo } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(lessThanOrEqualTo(2n, 3n), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(3n, 3n), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(4n, 3n), false)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const lessThanOrEqualTo: {
  (that: bigint): (self: bigint) => boolean
  (self: bigint, that: bigint): boolean
} = order.lessThanOrEqualTo(Order)

/**
 * Returns `true` if the first argument is greater than the second, otherwise `false`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { greaterThan } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(greaterThan(2n, 3n), false)
 * assert.deepStrictEqual(greaterThan(3n, 3n), false)
 * assert.deepStrictEqual(greaterThan(4n, 3n), true)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const greaterThan: {
  (that: bigint): (self: bigint) => boolean
  (self: bigint, that: bigint): boolean
} = order.greaterThan(Order)

/**
 * Returns a function that checks if a given `bigint` is greater than or equal to the provided one.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { greaterThanOrEqualTo } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(greaterThanOrEqualTo(2n, 3n), false)
 * assert.deepStrictEqual(greaterThanOrEqualTo(3n, 3n), true)
 * assert.deepStrictEqual(greaterThanOrEqualTo(4n, 3n), true)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const greaterThanOrEqualTo: {
  (that: bigint): (self: bigint) => boolean
  (self: bigint, that: bigint): boolean
} = order.greaterThanOrEqualTo(Order)

/**
 * Checks if a `bigint` is between a `minimum` and `maximum` value (inclusive).
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as BigInt from "effect/primitives/BigInt"
 *
 * const between = BigInt.between({ minimum: 0n, maximum: 5n })
 *
 * assert.deepStrictEqual(between(3n), true)
 * assert.deepStrictEqual(between(-1n), false)
 * assert.deepStrictEqual(between(6n), false)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const between: {
  (options: {
    minimum: bigint
    maximum: bigint
  }): (self: bigint) => boolean
  (self: bigint, options: {
    minimum: bigint
    maximum: bigint
  }): boolean
} = order.between(Order)

/**
 * Restricts the given `bigint` to be within the range specified by the `minimum` and `maximum` values.
 *
 * - If the `bigint` is less than the `minimum` value, the function returns the `minimum` value.
 * - If the `bigint` is greater than the `maximum` value, the function returns the `maximum` value.
 * - Otherwise, it returns the original `bigint`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as BigInt from "effect/primitives/BigInt"
 *
 * const clamp = BigInt.clamp({ minimum: 1n, maximum: 5n })
 *
 * assert.equal(clamp(3n), 3n)
 * assert.equal(clamp(0n), 1n)
 * assert.equal(clamp(6n), 5n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const clamp: {
  (options: {
    minimum: bigint
    maximum: bigint
  }): (self: bigint) => bigint
  (self: bigint, options: {
    minimum: bigint
    maximum: bigint
  }): bigint
} = order.clamp(Order)

/**
 * Returns the minimum between two `bigint`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { min } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(min(2n, 3n), 2n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const min: {
  (that: bigint): (self: bigint) => bigint
  (self: bigint, that: bigint): bigint
} = order.min(Order)

/**
 * Returns the maximum between two `bigint`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { max } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(max(2n, 3n), 3n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const max: {
  (that: bigint): (self: bigint) => bigint
  (self: bigint, that: bigint): bigint
} = order.max(Order)

/**
 * Determines the sign of a given `bigint`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { sign } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(sign(-5n), -1)
 * assert.deepStrictEqual(sign(0n), 0)
 * assert.deepStrictEqual(sign(5n), 1)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const sign = (n: bigint): Ordering => Order(n, bigint0)

/**
 * Determines the absolute value of a given `bigint`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { abs } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(abs(-5n), 5n)
 * assert.deepStrictEqual(abs(0n), 0n)
 * assert.deepStrictEqual(abs(5n), 5n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const abs = (n: bigint): bigint => (n < bigint0 ? -n : n)

/**
 * Determines the greatest common divisor of two `bigint`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { gcd } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(gcd(2n, 3n), 1n)
 * assert.deepStrictEqual(gcd(2n, 4n), 2n)
 * assert.deepStrictEqual(gcd(16n, 24n), 8n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const gcd: {
  (that: bigint): (self: bigint) => bigint
  (self: bigint, that: bigint): bigint
} = dual(2, (self: bigint, that: bigint): bigint => {
  while (that !== bigint0) {
    const t = that
    that = self % that
    self = t
  }
  return self
})

/**
 * Determines the least common multiple of two `bigint`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { lcm } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(lcm(2n, 3n), 6n)
 * assert.deepStrictEqual(lcm(2n, 4n), 4n)
 * assert.deepStrictEqual(lcm(16n, 24n), 48n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const lcm: {
  (that: bigint): (self: bigint) => bigint
  (self: bigint, that: bigint): bigint
} = dual(2, (self: bigint, that: bigint): bigint => (self * that) / gcd(self, that))

/**
 * Determines the square root of a given `bigint` unsafely. Throws if the given `bigint` is negative.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { sqrtUnsafe } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(sqrtUnsafe(4n), 2n)
 * assert.deepStrictEqual(sqrtUnsafe(9n), 3n)
 * assert.deepStrictEqual(sqrtUnsafe(16n), 4n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const sqrtUnsafe = (n: bigint): bigint => {
  if (n < bigint0) {
    throw new RangeError("Cannot take the square root of a negative number")
  }
  if (n < bigint2) {
    return n
  }
  let x = n / bigint2
  while (x * x > n) {
    x = ((n / x) + x) / bigint2
  }
  return x
}

/**
 * Determines the square root of a given `bigint` safely. Returns `undefined` if
 * the given `bigint` is negative.
 *
 * **Example**
 *
 * ```ts
 * import { BigInt } from "effect/primitives"
 *
 * BigInt.sqrt(4n) // 2n
 * BigInt.sqrt(9n) // 3n
 * BigInt.sqrt(16n) // 4n
 * BigInt.sqrt(-1n) // undefined
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const sqrt = (n: bigint): bigint | undefined => greaterThanOrEqualTo(n, bigint0) ? sqrtUnsafe(n) : undefined

/**
 * Takes an `Iterable` of `bigint`s and returns their sum as a single `bigint
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { sumAll } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(sumAll([2n, 3n, 4n]), 9n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const sumAll = (collection: Iterable<bigint>): bigint => {
  let out = bigint0
  for (const n of collection) {
    out += n
  }
  return out
}

/**
 * Takes an `Iterable` of `bigint`s and returns their multiplication as a single `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { multiplyAll } from "effect/primitives/BigInt"
 *
 * assert.deepStrictEqual(multiplyAll([2n, 3n, 4n]), 24n)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const multiplyAll = (collection: Iterable<bigint>): bigint => {
  let out = bigint1
  for (const n of collection) {
    if (n === bigint0) {
      return bigint0
    }
    out *= n
  }
  return out
}

/**
 * Converts a `bigint` to a `number`.
 *
 * If the `bigint` is outside the safe integer range for JavaScript (`Number.MAX_SAFE_INTEGER`
 * and `Number.MIN_SAFE_INTEGER`), it returns `undefined`
 *
 * @example
 * ```ts
 * import { BigInt as BI } from "effect/primitives"
 *
 * BI.toNumber(42n) // 42
 * BI.toNumber(BigInt(Number.MAX_SAFE_INTEGER) + 1n) // undefined
 * BI.toNumber(BigInt(Number.MIN_SAFE_INTEGER) - 1n) // undefined
 * ```
 *
 * @category conversions
 * @since 2.0.0
 */
export const toNumber = (b: bigint): number | undefined => {
  if (b > BigInt(Number.MAX_SAFE_INTEGER) || b < BigInt(Number.MIN_SAFE_INTEGER)) {
    return undefined
  }
  return Number(b)
}

/**
 * Converts a string to a `bigint`.
 *
 * If the string is empty or contains characters that cannot be converted into a
 * `bigint`, it returns `undefined`.
 *
 * @example
 * ```ts
 * import { BigInt } from "effect/primitives"
 *
 * BigInt.fromString("42") // 42n
 * BigInt.fromString(" ") // undefined
 * BigInt.fromString("a") // undefined
 * ```
 *
 * @category conversions
 * @since 2.4.12
 */
export const fromString = (s: string): bigint | undefined => {
  try {
    return s.trim() === ""
      ? undefined
      : BigInt(s)
  } catch {
    return undefined
  }
}

/**
 * Converts a number to a `bigint`.
 *
 * If the number is outside the safe integer range for JavaScript
 * (`Number.MAX_SAFE_INTEGER` and `Number.MIN_SAFE_INTEGER`) or if the number is
 * not a valid `bigint`, it returns `undefined`.
 *
 * @example
 * ```ts
 * import { BigInt } from "effect/primitives"
 *
 * BigInt.fromNumber(42) // 42n
 *
 * BigInt.fromNumber(Number.MAX_SAFE_INTEGER + 1) // undefined
 * BigInt.fromNumber(Number.MIN_SAFE_INTEGER - 1) // undefined
 * ```
 *
 * @category conversions
 * @since 2.4.12
 */
export function fromNumber(n: number): bigint | undefined {
  if (n > Number.MAX_SAFE_INTEGER || n < Number.MIN_SAFE_INTEGER) {
    return undefined
  }

  try {
    return BigInt(n)
  } catch {
    return undefined
  }
}

/**
 * Returns the remainder of dividing the first `bigint` by the second `bigint`.
 *
 * @example
 * ```ts
 * import { BigInt } from "effect/primitives"
 *
 * BigInt.remainder(10n, 3n) // 1n
 *
 * BigInt.remainder(15n, 4n) // 3n
 * ```
 *
 * @category math
 * @since 4.0.0
 */
export const remainder: {
  (divisor: bigint): (self: bigint) => bigint
  (self: bigint, divisor: bigint): bigint
} = dual(2, (self: bigint, divisor: bigint): bigint => self % divisor)

/**
 * A `Reducer` for combining `bigint`s using addition.
 *
 * @since 4.0.0
 */
export const ReducerSum: Reducer.Reducer<bigint> = Reducer.make((a, b) => a + b, 0n)

/**
 * A `Reducer` for combining `bigint`s using multiplication.
 *
 * @since 4.0.0
 */
export const ReducerMultiply: Reducer.Reducer<bigint> = Reducer.make((a, b) => a * b, 1n, (collection) => {
  let acc = 1n
  for (const n of collection) {
    if (n === 0n) return 0n
    acc *= n
  }
  return acc
})

/**
 * A `Combiner` that returns the maximum `bigint`.
 *
 * @since 4.0.0
 */
export const CombinerMax: Combiner.Combiner<bigint> = Combiner.max(Order)

/**
 * A `Combiner` that returns the minimum `bigint`.
 *
 * @since 4.0.0
 */
export const CombinerMin: Combiner.Combiner<bigint> = Combiner.min(Order)
