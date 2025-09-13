/**
 * This module provides utility functions and type class instances for working with the `number` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
import * as order from "../data/Order.ts"
import type { Ordering } from "../data/Ordering.ts"
import * as predicate from "../data/Predicate.ts"
import * as Reducer from "../data/Reducer.ts"
import { dual } from "../Function.ts"

/**
 * The global `Number` constructor.
 *
 * @example
 * ```ts
 * import * as N from "effect/primitives/Number"
 *
 * const num = N.Number("42")
 * console.log(num) // 42
 *
 * const float = N.Number("3.14")
 * console.log(float) // 3.14
 * ```
 *
 * @category constructors
 * @since 4.0.0
 */
export const Number = globalThis.Number

/**
 * Tests if a value is a `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNumber } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(isNumber(2), true)
 * assert.deepStrictEqual(isNumber("2"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isNumber: (input: unknown) => input is number = predicate.isNumber

/**
 * Provides an addition operation on `number`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { sum } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(sum(2, 3), 5)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const sum: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = dual(2, (self: number, that: number): number => self + that)

/**
 * Provides a multiplication operation on `number`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { multiply } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(multiply(2, 3), 6)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const multiply: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = dual(2, (self: number, that: number): number => self * that)

/**
 * Provides a subtraction operation on `number`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { subtract } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(subtract(2, 3), -1)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const subtract: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = dual(2, (self: number, that: number): number => self - that)

/**
 * Provides a division operation on `number`s.
 *
 * Returns `undefined` if the divisor is `0`.
 *
 * **Example**
 *
 * ```ts
 * import { Number } from "effect/primitives"
 *
 * Number.divide(6, 3) // 2
 * Number.divide(6, 0) // undefined
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const divide: {
  (that: number): (self: number) => number | undefined
  (self: number, that: number): number | undefined
} = dual(
  2,
  (self: number, that: number): number | undefined => that === 0 ? undefined : self / that
)

/**
 * Returns the result of adding `1` to a given number.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { increment } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(increment(2), 3)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const increment = (n: number): number => n + 1

/**
 * Decrements a number by `1`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { decrement } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(decrement(3), 2)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const decrement = (n: number): number => n - 1

/**
 * An `Order` instance for `number` values.
 *
 * @example
 * ```ts
 * import * as Number from "effect/primitives/Number"
 *
 * console.log(Number.Order(1, 2)) // -1
 * console.log(Number.Order(2, 1)) // 1
 * console.log(Number.Order(1, 1)) // 0
 * ```
 *
 * @category instances
 * @since 2.0.0
 */
export const Order: order.Order<number> = order.number

/**
 * Returns `true` if the first argument is less than the second, otherwise `false`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { lessThan } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(lessThan(2, 3), true)
 * assert.deepStrictEqual(lessThan(3, 3), false)
 * assert.deepStrictEqual(lessThan(4, 3), false)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const lessThan: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
} = order.lessThan(Order)

/**
 * Returns a function that checks if a given `number` is less than or equal to the provided one.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { lessThanOrEqualTo } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(lessThanOrEqualTo(2, 3), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(3, 3), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(4, 3), false)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const lessThanOrEqualTo: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
} = order.lessThanOrEqualTo(Order)

/**
 * Returns `true` if the first argument is greater than the second, otherwise `false`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { greaterThan } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(greaterThan(2, 3), false)
 * assert.deepStrictEqual(greaterThan(3, 3), false)
 * assert.deepStrictEqual(greaterThan(4, 3), true)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const greaterThan: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
} = order.greaterThan(Order)

/**
 * Returns a function that checks if a given `number` is greater than or equal to the provided one.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { greaterThanOrEqualTo } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(greaterThanOrEqualTo(2, 3), false)
 * assert.deepStrictEqual(greaterThanOrEqualTo(3, 3), true)
 * assert.deepStrictEqual(greaterThanOrEqualTo(4, 3), true)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const greaterThanOrEqualTo: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
} = order.greaterThanOrEqualTo(Order)

/**
 * Checks if a `number` is between a `minimum` and `maximum` value (inclusive).
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Number from "effect/primitives/Number"
 *
 * const between = Number.between({ minimum: 0, maximum: 5 })
 *
 * assert.deepStrictEqual(between(3), true)
 * assert.deepStrictEqual(between(-1), false)
 * assert.deepStrictEqual(between(6), false)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const between: {
  (options: {
    minimum: number
    maximum: number
  }): (self: number) => boolean
  (self: number, options: {
    minimum: number
    maximum: number
  }): boolean
} = order.between(Order)

/**
 * Restricts the given `number` to be within the range specified by the `minimum` and `maximum` values.
 *
 * - If the `number` is less than the `minimum` value, the function returns the `minimum` value.
 * - If the `number` is greater than the `maximum` value, the function returns the `maximum` value.
 * - Otherwise, it returns the original `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Number from "effect/primitives/Number"
 *
 * const clamp = Number.clamp({ minimum: 1, maximum: 5 })
 *
 * assert.equal(clamp(3), 3)
 * assert.equal(clamp(0), 1)
 * assert.equal(clamp(6), 5)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const clamp: {
  (options: {
    minimum: number
    maximum: number
  }): (self: number) => number
  (self: number, options: {
    minimum: number
    maximum: number
  }): number
} = order.clamp(Order)

/**
 * Returns the minimum between two `number`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { min } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(min(2, 3), 2)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const min: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = order.min(Order)

/**
 * Returns the maximum between two `number`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { max } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(max(2, 3), 3)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const max: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = order.max(Order)

/**
 * Determines the sign of a given `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { sign } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(sign(-5), -1)
 * assert.deepStrictEqual(sign(0), 0)
 * assert.deepStrictEqual(sign(5), 1)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const sign = (n: number): Ordering => Order(n, 0)

/**
 * Takes an `Iterable` of `number`s and returns their sum as a single `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { sumAll } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(sumAll([2, 3, 4]), 9)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const sumAll = (collection: Iterable<number>): number => {
  let out = 0
  for (const n of collection) {
    out += n
  }
  return out
}

/**
 * Takes an `Iterable` of `number`s and returns their multiplication as a single `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { multiplyAll } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(multiplyAll([2, 3, 4]), 24)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const multiplyAll = (collection: Iterable<number>): number => {
  let out = 1
  for (const n of collection) {
    if (n === 0) {
      return 0
    }
    out *= n
  }
  return out
}

/**
 * Returns the remainder left over when one operand is divided by a second operand.
 *
 * It always takes the sign of the dividend.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { remainder } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(remainder(2, 2), 0)
 * assert.deepStrictEqual(remainder(3, 2), 1)
 * assert.deepStrictEqual(remainder(-4, 2), -0)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const remainder: {
  (divisor: number): (self: number) => number
  (self: number, divisor: number): number
} = dual(2, (self: number, divisor: number): number => {
  // https://stackoverflow.com/questions/3966484/why-does-modulus-operator-return-fractional-number-in-javascript/31711034#31711034
  const selfDecCount = (self.toString().split(".")[1] || "").length
  const divisorDecCount = (divisor.toString().split(".")[1] || "").length
  const decCount = selfDecCount > divisorDecCount ? selfDecCount : divisorDecCount
  const selfInt = parseInt(self.toFixed(decCount).replace(".", ""))
  const divisorInt = parseInt(divisor.toFixed(decCount).replace(".", ""))
  return (selfInt % divisorInt) / Math.pow(10, decCount)
})

/**
 * Returns the next power of 2 from the given number.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { nextPow2 } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(nextPow2(5), 8)
 * assert.deepStrictEqual(nextPow2(17), 32)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const nextPow2 = (n: number): number => {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2))
  return Math.max(Math.pow(2, nextPow), 2)
}

/**
 * Tries to parse a `number` from a `string` using the `Number()` function.
 * The following special string values are supported: "NaN", "Infinity", "-Infinity".
 *
 * **Example**
 *
 * ```ts
 * import { Number } from "effect/primitives"
 *
 * Number.parse("42") // 42
 * Number.parse("3.14") // 3.14
 * Number.parse("NaN") // NaN
 * Number.parse("Infinity") // Infinity
 * Number.parse("-Infinity") // -Infinity
 * Number.parse("not a number") // undefined
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const parse = (s: string): number | undefined => {
  if (s === "NaN") {
    return NaN
  }
  if (s === "Infinity") {
    return Infinity
  }
  if (s === "-Infinity") {
    return -Infinity
  }
  if (s.trim() === "") {
    return undefined
  }
  const n = Number(s)
  return Number.isNaN(n) ?
    undefined
    : n
}

/**
 * Returns the number rounded with the given precision.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { round } from "effect/primitives/Number"
 *
 * assert.deepStrictEqual(round(1.1234, 2), 1.12)
 * assert.deepStrictEqual(round(1.567, 2), 1.57)
 * ```
 *
 * @category math
 * @since 3.8.0
 */
export const round: {
  (precision: number): (self: number) => number
  (self: number, precision: number): number
} = dual(2, (self: number, precision: number): number => {
  const factor = Math.pow(10, precision)
  return Math.round(self * factor) / factor
})

/**
 * A `Reducer` for combining `number`s using addition.
 *
 * @since 4.0.0
 */
export const ReducerSum: Reducer.Reducer<number> = Reducer.make((a, b) => a + b, 0)

/**
 * A `Reducer` for combining `number`s using multiplication.
 *
 * @since 4.0.0
 */
export const ReducerMultiply: Reducer.Reducer<number> = Reducer.make((a, b) => a * b, 1, (collection) => {
  let acc = 1
  for (const n of collection) {
    if (n === 0) return 0
    acc *= n
  }
  return acc
})

/**
 * A `Combiner` that returns the maximum `number`.
 *
 * @since 4.0.0
 */
export const ReducerMax: Reducer.Reducer<number> = Reducer.make((a, b) => Math.max(a, b), -Infinity)

/**
 * A `Combiner` that returns the minimum `number`.
 *
 * @since 4.0.0
 */
export const ReducerMin: Reducer.Reducer<number> = Reducer.make((a, b) => Math.min(a, b), Infinity)
