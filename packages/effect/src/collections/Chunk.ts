/**
 * The `Chunk` module provides an immutable, high-performance sequence data structure
 * optimized for functional programming patterns. A `Chunk` is a persistent data structure
 * that supports efficient append, prepend, and concatenation operations.
 *
 * ## What is a Chunk?
 *
 * A `Chunk<A>` is an immutable sequence of elements of type `A` that provides:
 * - **O(1) append and prepend operations**
 * - **Efficient concatenation** through tree-like structure
 * - **Memory efficiency** with structural sharing
 * - **Rich API** with functional programming operations
 * - **Type safety** with full TypeScript integration
 *
 * ## Key Features
 *
 * - **Immutable**: All operations return new chunks without modifying the original
 * - **Efficient**: Optimized data structure with logarithmic complexity for most operations
 * - **Functional**: Rich set of transformation and combination operators
 * - **Lazy evaluation**: Many operations are deferred until needed
 * - **Interoperable**: Easy conversion to/from arrays and other collections
 *
 * ## Performance Characteristics
 *
 * - **Append/Prepend**: O(1) amortized
 * - **Random Access**: O(log n)
 * - **Concatenation**: O(log min(m, n))
 * - **Iteration**: O(n)
 * - **Memory**: Structural sharing minimizes allocation
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * // Creating chunks
 * const chunk1 = Chunk.fromIterable([1, 2, 3])
 * const chunk2 = Chunk.fromIterable([4, 5, 6])
 * const empty = Chunk.empty<number>()
 *
 * // Combining chunks
 * const combined = Chunk.appendAll(chunk1, chunk2)
 * console.log(Chunk.toReadonlyArray(combined)) // [1, 2, 3, 4, 5, 6]
 * ```
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * // Functional transformations
 * const numbers = Chunk.range(1, 5) // [1, 2, 3, 4, 5]
 * const doubled = Chunk.map(numbers, (n) => n * 2) // [2, 4, 6, 8, 10]
 * const evens = Chunk.filter(doubled, (n) => n % 4 === 0) // [4, 8]
 * const sum = Chunk.reduce(evens, 0, (acc, n) => acc + n) // 12
 * ```
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
import { Effect } from "effect"
 *
 * // Working with Effects
 * const processChunk = (chunk: Chunk.Chunk<number>) =>
 *   Effect.gen(function* () {
 *     const mapped = Chunk.map(chunk, (n) => n * 2)
 *     const filtered = Chunk.filter(mapped, (n) => n > 5)
 *     return Chunk.toReadonlyArray(filtered)
 *   })
 * ```
 *
 * @since 2.0.0
 */
import * as RA from "../collections/Array.ts"
import type { NonEmptyReadonlyArray } from "../collections/Array.ts"
import type { NonEmptyIterable } from "../collections/NonEmptyIterable.ts"
import * as Equivalence from "../data/Equivalence.ts"
import type { Option } from "../data/Option.ts"
import * as O from "../data/Option.ts"
import * as Order from "../data/Order.ts"
import { hasProperty, type Predicate, type Refinement } from "../data/Predicate.ts"
import type { Result } from "../data/Result.ts"
import * as UndefinedOr from "../data/UndefinedOr.ts"
import { dual, identity, pipe } from "../Function.ts"
import * as Equal from "../interfaces/Equal.ts"
import * as Hash from "../interfaces/Hash.ts"
import { format, type Inspectable, NodeInspectSymbol, toJson } from "../interfaces/Inspectable.ts"
import type { Pipeable } from "../interfaces/Pipeable.ts"
import { pipeArguments } from "../interfaces/Pipeable.ts"
import type { TypeLambda } from "../types/HKT.ts"
import type { Covariant, NoInfer } from "../types/Types.ts"

const TypeId = "~effect/collections/Chunk"

/**
 * A Chunk is an immutable, ordered collection optimized for efficient concatenation and access patterns.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk: Chunk.Chunk<number> = Chunk.make(1, 2, 3)
 * console.log(chunk.length) // 3
 * console.log(Chunk.toArray(chunk)) // [1, 2, 3]
 * ```
 *
 * @category models
 * @since 2.0.0
 */
export interface Chunk<out A> extends Iterable<A>, Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _A: Covariant<A>
  }
  readonly length: number
  /** @internal */
  right: Chunk<A>
  /** @internal */
  left: Chunk<A>
  /** @internal */
  backing: Backing<A>
  /** @internal */
  depth: number
}

/**
 * A non-empty Chunk guaranteed to contain at least one element.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const nonEmptyChunk: Chunk.NonEmptyChunk<number> = Chunk.make(1, 2, 3)
 * console.log(Chunk.headNonEmpty(nonEmptyChunk)) // 1
 * console.log(Chunk.lastNonEmpty(nonEmptyChunk)) // 3
 * ```
 *
 * @category models
 * @since 2.0.0
 */
export interface NonEmptyChunk<out A> extends Chunk<A>, NonEmptyIterable<A> {}

/**
 * Type lambda for Chunk, used for higher-kinded type operations.
 *
 * @example
 * ```ts
 * import type { Kind } from "effect/types/HKT"
 * import type { ChunkTypeLambda } from "effect/collections/Chunk"
 *
 * // Create a Chunk type using the type lambda
 * type NumberChunk = Kind<ChunkTypeLambda, never, never, never, number>
 * // Equivalent to: Chunk<number>
 * ```
 *
 * @category type lambdas
 * @since 2.0.0
 */
export interface ChunkTypeLambda extends TypeLambda {
  readonly type: Chunk<this["Target"]>
}

type Backing<A> =
  | IArray<A>
  | IConcat<A>
  | ISingleton<A>
  | IEmpty
  | ISlice<A>

interface IArray<A> {
  readonly _tag: "IArray"
  readonly array: ReadonlyArray<A>
}

interface IConcat<A> {
  readonly _tag: "IConcat"
  readonly left: Chunk<A>
  readonly right: Chunk<A>
}

interface ISingleton<A> {
  readonly _tag: "ISingleton"
  readonly a: A
}

interface IEmpty {
  readonly _tag: "IEmpty"
}

interface ISlice<A> {
  readonly _tag: "ISlice"
  readonly chunk: Chunk<A>
  readonly offset: number
  readonly length: number
}

function copy<A>(
  src: ReadonlyArray<A>,
  srcPos: number,
  dest: Array<A>,
  destPos: number,
  len: number
) {
  for (let i = srcPos; i < Math.min(src.length, srcPos + len); i++) {
    dest[destPos + i - srcPos] = src[i]!
  }
  return dest
}

const emptyArray: ReadonlyArray<never> = []

/**
 * Compares the two chunks of equal length using the specified function
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
import * as Equivalence from "effect/data/Equivalence"
 *
 * const chunk1 = Chunk.make(1, 2, 3)
 * const chunk2 = Chunk.make(1, 2, 3)
 * const chunk3 = Chunk.make(1, 2, 4)
 *
 * const eq = Chunk.getEquivalence(Equivalence.strict<number>())
 * console.log(eq(chunk1, chunk2)) // true
 * console.log(eq(chunk1, chunk3)) // false
 * ```
 *
 * @category equivalence
 * @since 2.0.0
 */
export const getEquivalence = <A>(isEquivalent: Equivalence.Equivalence<A>): Equivalence.Equivalence<Chunk<A>> =>
  Equivalence.make((self, that) =>
    self.length === that.length && toReadonlyArray(self).every((value, i) => isEquivalent(value, getUnsafe(that, i)))
  )

const _equivalence = getEquivalence(Equal.equals)

const ChunkProto: Omit<Chunk<unknown>, "backing" | "depth" | "left" | "length" | "right"> = {
  [TypeId]: {
    _A: (_: never) => _
  },
  toString<A>(this: Chunk<A>) {
    return `Chunk(${format(toReadonlyArray(this))})`
  },
  toJSON<A>(this: Chunk<A>) {
    return {
      _id: "Chunk",
      values: toJson(toReadonlyArray(this))
    }
  },
  [NodeInspectSymbol]<A>(this: Chunk<A>) {
    return this.toJSON()
  },
  [Equal.symbol]<A>(this: Chunk<A>, that: unknown): boolean {
    return isChunk(that) && _equivalence(this, that)
  },
  [Hash.symbol]<A>(this: Chunk<A>): number {
    return Hash.array(toReadonlyArray(this))
  },
  [Symbol.iterator]<A>(this: Chunk<A>): Iterator<A> {
    switch (this.backing._tag) {
      case "IArray": {
        return this.backing.array[Symbol.iterator]()
      }
      case "IEmpty": {
        return emptyArray[Symbol.iterator]()
      }
      default: {
        return toReadonlyArray(this)[Symbol.iterator]()
      }
    }
  },
  pipe<A>(this: Chunk<A>) {
    return pipeArguments(this, arguments)
  }
}

const makeChunk = <A>(backing: Backing<A>): Chunk<A> => {
  const chunk = Object.create(ChunkProto)
  chunk.backing = backing
  switch (backing._tag) {
    case "IEmpty": {
      chunk.length = 0
      chunk.depth = 0
      chunk.left = chunk
      chunk.right = chunk
      break
    }
    case "IConcat": {
      chunk.length = backing.left.length + backing.right.length
      chunk.depth = 1 + Math.max(backing.left.depth, backing.right.depth)
      chunk.left = backing.left
      chunk.right = backing.right
      break
    }
    case "IArray": {
      chunk.length = backing.array.length
      chunk.depth = 0
      chunk.left = _empty
      chunk.right = _empty
      break
    }
    case "ISingleton": {
      chunk.length = 1
      chunk.depth = 0
      chunk.left = _empty
      chunk.right = _empty
      break
    }
    case "ISlice": {
      chunk.length = backing.length
      chunk.depth = backing.chunk.depth + 1
      chunk.left = _empty
      chunk.right = _empty
      break
    }
  }
  return chunk
}

/**
 * Checks if `u` is a `Chunk<unknown>`
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3)
 * const array = [1, 2, 3]
 *
 * console.log(Chunk.isChunk(chunk)) // true
 * console.log(Chunk.isChunk(array)) // false
 * console.log(Chunk.isChunk("string")) // false
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const isChunk: {
  <A>(u: Iterable<A>): u is Chunk<A>
  (u: unknown): u is Chunk<unknown>
} = (u: unknown): u is Chunk<unknown> => hasProperty(u, TypeId)

const _empty = makeChunk<never>({ _tag: "IEmpty" })

/**
 * Creates an empty `Chunk`.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const emptyChunk = Chunk.empty()
 * console.log(Chunk.size(emptyChunk)) // 0
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const empty: <A = never>() => Chunk<A> = () => _empty

/**
 * Builds a `NonEmptyChunk` from an non-empty collection of elements.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4)
 * console.log(chunk)
 * // { _id: 'Chunk', values: [ 1, 2, 3, 4 ] }
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const make = <As extends readonly [any, ...Array<any>]>(...as: As): NonEmptyChunk<As[number]> =>
  fromNonEmptyArrayUnsafe(as)

/**
 * Builds a `NonEmptyChunk` from a single element.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.of("hello")
 * console.log(chunk)
 * // { _id: 'Chunk', values: [ "hello" ] }
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const of = <A>(a: A): NonEmptyChunk<A> => makeChunk({ _tag: "ISingleton", a }) as any

/**
 * Creates a new `Chunk` from an iterable collection of values.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.fromIterable([1, 2, 3])
 * console.log(chunk)
 * // { _id: 'Chunk', values: [ 1, 2, 3 ] }
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const fromIterable = <A>(self: Iterable<A>): Chunk<A> =>
  isChunk(self) ? self : fromArrayUnsafe(RA.fromIterable(self))

const copyToArray = <A>(self: Chunk<A>, array: Array<any>, initial: number): void => {
  switch (self.backing._tag) {
    case "IArray": {
      copy(self.backing.array, 0, array, initial, self.length)
      break
    }
    case "IConcat": {
      copyToArray(self.left, array, initial)
      copyToArray(self.right, array, initial + self.left.length)
      break
    }
    case "ISingleton": {
      array[initial] = self.backing.a
      break
    }
    case "ISlice": {
      let i = 0
      let j = initial
      while (i < self.length) {
        array[j] = getUnsafe(self, i)
        i += 1
        j += 1
      }
      break
    }
  }
}

const toArray_ = <A>(self: Chunk<A>): Array<A> => toReadonlyArray(self).slice()

/**
 * Converts a `Chunk` into an `Array`. If the provided `Chunk` is non-empty
 * (`NonEmptyChunk`), the function will return a `NonEmptyArray`, ensuring the
 * non-empty property is preserved.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3)
 * const array = Chunk.toArray(chunk)
 * console.log(array) // [1, 2, 3]
 * console.log(Array.isArray(array)) // true
 *
 * // With empty chunk
 * const emptyChunk = Chunk.empty<number>()
 * console.log(Chunk.toArray(emptyChunk)) // []
 * ```
 *
 * @category conversions
 * @since 2.0.0
 */
export const toArray: <S extends Chunk<any>>(
  self: S
) => S extends NonEmptyChunk<any> ? RA.NonEmptyArray<Chunk.Infer<S>> : Array<Chunk.Infer<S>> = toArray_ as any

const toReadonlyArray_ = <A>(self: Chunk<A>): ReadonlyArray<A> => {
  switch (self.backing._tag) {
    case "IEmpty": {
      return emptyArray
    }
    case "IArray": {
      return self.backing.array
    }
    default: {
      const arr = new Array<A>(self.length)
      copyToArray(self, arr, 0)
      self.backing = {
        _tag: "IArray",
        array: arr
      }
      self.left = _empty
      self.right = _empty
      self.depth = 0
      return arr
    }
  }
}

/**
 * Converts a `Chunk` into a `ReadonlyArray`. If the provided `Chunk` is
 * non-empty (`NonEmptyChunk`), the function will return a
 * `NonEmptyReadonlyArray`, ensuring the non-empty property is preserved.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3)
 * const readonlyArray = Chunk.toReadonlyArray(chunk)
 * console.log(readonlyArray) // [1, 2, 3]
 *
 * // The result is read-only, modifications would cause TypeScript errors
 * // readonlyArray[0] = 10 // TypeScript error
 *
 * // With empty chunk
 * const emptyChunk = Chunk.empty<number>()
 * console.log(Chunk.toReadonlyArray(emptyChunk)) // []
 * ```
 *
 * @category conversions
 * @since 2.0.0
 */
export const toReadonlyArray: <S extends Chunk<any>>(
  self: S
) => S extends NonEmptyChunk<any> ? RA.NonEmptyReadonlyArray<Chunk.Infer<S>> : ReadonlyArray<Chunk.Infer<S>> =
  toReadonlyArray_ as any

const reverseChunk = <A>(self: Chunk<A>): Chunk<A> => {
  switch (self.backing._tag) {
    case "IEmpty":
    case "ISingleton":
      return self
    case "IArray": {
      return makeChunk({ _tag: "IArray", array: RA.reverse(self.backing.array) })
    }
    case "IConcat": {
      return makeChunk({ _tag: "IConcat", left: reverse(self.backing.right), right: reverse(self.backing.left) })
    }
    case "ISlice":
      return fromArrayUnsafe(RA.reverse(toReadonlyArray(self)))
  }
}

/**
 * Reverses the order of elements in a `Chunk`.
 * Importantly, if the input chunk is a `NonEmptyChunk`, the reversed chunk will also be a `NonEmptyChunk`.
 *
 * @example
 *
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3)
 * const result = Chunk.reverse(chunk)
 *
 * console.log(result)
 * // { _id: 'Chunk', values: [ 3, 2, 1 ] }
 * ```
 *
 * @since 2.0.0
 * @category elements
 */
export const reverse: <S extends Chunk<any>>(self: S) => Chunk.With<S, Chunk.Infer<S>> = reverseChunk as any

/**
 * This function provides a safe way to read a value at a particular index from a `Chunk`.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 * import * as Option from "effect/data/Option"
 *
 * const chunk = Chunk.make("a", "b", "c", "d")
 *
 * console.log(Chunk.get(chunk, 1)) // Option.some("b")
 * console.log(Chunk.get(chunk, 10)) // Option.none()
 * console.log(Chunk.get(chunk, -1)) // Option.none()
 *
 * // Using pipe syntax
 * const result = chunk.pipe(Chunk.get(2))
 * console.log(result) // Option.some("c")
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const get: {
  (index: number): <A>(self: Chunk<A>) => Option<A>
  <A>(self: Chunk<A>, index: number): Option<A>
} = dual(
  2,
  <A>(self: Chunk<A>, index: number): Option<A> =>
    index < 0 || index >= self.length ? O.none() : O.some(getUnsafe(self, index))
)

/**
 * Wraps an array into a chunk without copying, unsafe on mutable arrays
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const array = [1, 2, 3, 4, 5]
 * const chunk = Chunk.fromArrayUnsafe(array)
 * console.log(Chunk.toArray(chunk)) // [1, 2, 3, 4, 5]
 *
 * // Warning: Since this doesn't copy the array, mutations affect the chunk
 * array[0] = 999
 * console.log(Chunk.toArray(chunk)) // [999, 2, 3, 4, 5]
 * ```
 *
 * @since 2.0.0
 * @category unsafe
 */
export const fromArrayUnsafe = <A>(self: ReadonlyArray<A>): Chunk<A> =>
  self.length === 0 ? empty() : self.length === 1 ? of(self[0]) : makeChunk({ _tag: "IArray", array: self })

/**
 * Wraps an array into a chunk without copying, unsafe on mutable arrays
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
import * as Array from "effect/collections/Array"
 *
 * const nonEmptyArray = Array.make(1, 2, 3, 4, 5)
 * const chunk = Chunk.fromNonEmptyArrayUnsafe(nonEmptyArray)
 * console.log(Chunk.toArray(chunk)) // [1, 2, 3, 4, 5]
 *
 * // The result is guaranteed to be non-empty
 * console.log(Chunk.isNonEmpty(chunk)) // true
 * ```
 *
 * @since 2.0.0
 * @category unsafe
 */
export const fromNonEmptyArrayUnsafe = <A>(self: NonEmptyReadonlyArray<A>): NonEmptyChunk<A> =>
  fromArrayUnsafe(self) as any

/**
 * Gets an element unsafely, will throw on out of bounds
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make("a", "b", "c", "d")
 *
 * console.log(Chunk.getUnsafe(chunk, 1)) // "b"
 * console.log(Chunk.getUnsafe(chunk, 3)) // "d"
 *
 * // Warning: This will throw an error for invalid indices
 * try {
 *   Chunk.getUnsafe(chunk, 10) // throws "Index out of bounds"
 * } catch (error) {
 *   console.log((error as Error).message) // "Index out of bounds"
 * }
 * ```
 *
 * @since 2.0.0
 * @category unsafe
 */
export const getUnsafe: {
  (index: number): <A>(self: Chunk<A>) => A
  <A>(self: Chunk<A>, index: number): A
} = dual(2, <A>(self: Chunk<A>, index: number): A => {
  switch (self.backing._tag) {
    case "IEmpty": {
      throw new Error(`Index out of bounds`)
    }
    case "ISingleton": {
      if (index !== 0) {
        throw new Error(`Index out of bounds`)
      }
      return self.backing.a
    }
    case "IArray": {
      if (index >= self.length || index < 0) {
        throw new Error(`Index out of bounds`)
      }
      return self.backing.array[index]!
    }
    case "IConcat": {
      return index < self.left.length
        ? getUnsafe(self.left, index)
        : getUnsafe(self.right, index - self.left.length)
    }
    case "ISlice": {
      return getUnsafe(self.backing.chunk, index + self.backing.offset)
    }
  }
})

/**
 * Appends the specified element to the end of the `Chunk`.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3)
 * const newChunk = Chunk.append(chunk, 4)
 * console.log(Chunk.toArray(newChunk)) // [1, 2, 3, 4]
 *
 * // Appending to empty chunk
 * const emptyChunk = Chunk.empty<number>()
 * const singleElement = Chunk.append(emptyChunk, 42)
 * console.log(Chunk.toArray(singleElement)) // [42]
 * ```
 *
 * @category concatenating
 * @since 2.0.0
 */
export const append: {
  <A2>(a: A2): <A>(self: Chunk<A>) => NonEmptyChunk<A2 | A>
  <A, A2>(self: Chunk<A>, a: A2): NonEmptyChunk<A | A2>
} = dual(2, <A, A2>(self: Chunk<A>, a: A2): NonEmptyChunk<A | A2> => appendAll(self, of(a)))

/**
 * Prepend an element to the front of a `Chunk`, creating a new `NonEmptyChunk`.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(2, 3, 4)
 * const newChunk = Chunk.prepend(chunk, 1)
 * console.log(Chunk.toArray(newChunk)) // [1, 2, 3, 4]
 *
 * // Prepending to empty chunk
 * const emptyChunk = Chunk.empty<string>()
 * const singleElement = Chunk.prepend(emptyChunk, "first")
 * console.log(Chunk.toArray(singleElement)) // ["first"]
 * ```
 *
 * @category concatenating
 * @since 2.0.0
 */
export const prepend: {
  <B>(elem: B): <A>(self: Chunk<A>) => NonEmptyChunk<B | A>
  <A, B>(self: Chunk<A>, elem: B): NonEmptyChunk<A | B>
} = dual(2, <A, B>(self: Chunk<A>, elem: B): NonEmptyChunk<A | B> => appendAll(of(elem), self))

/**
 * Takes the first up to `n` elements from the chunk.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5)
 * const result = Chunk.take(chunk, 3)
 * console.log(result)
 * // { _id: 'Chunk', values: [ 1, 2, 3 ] }
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const take: {
  (n: number): <A>(self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, n: number): Chunk<A>
} = dual(2, <A>(self: Chunk<A>, n: number): Chunk<A> => {
  if (n <= 0) {
    return _empty
  } else if (n >= self.length) {
    return self
  } else {
    switch (self.backing._tag) {
      case "ISlice": {
        return makeChunk({
          _tag: "ISlice",
          chunk: self.backing.chunk,
          length: n,
          offset: self.backing.offset
        })
      }
      case "IConcat": {
        if (n > self.left.length) {
          return makeChunk({
            _tag: "IConcat",
            left: self.left,
            right: take(self.right, n - self.left.length)
          })
        }

        return take(self.left, n)
      }
      default: {
        return makeChunk({
          _tag: "ISlice",
          chunk: self,
          offset: 0,
          length: n
        })
      }
    }
  }
})

/**
 * Drops the first up to `n` elements from the chunk.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5)
 * const result = Chunk.drop(chunk, 2)
 * console.log(result)
 * // { _id: 'Chunk', values: [ 3, 4, 5 ] }
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const drop: {
  (n: number): <A>(self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, n: number): Chunk<A>
} = dual(2, <A>(self: Chunk<A>, n: number): Chunk<A> => {
  if (n <= 0) {
    return self
  } else if (n >= self.length) {
    return _empty
  } else {
    switch (self.backing._tag) {
      case "ISlice": {
        return makeChunk({
          _tag: "ISlice",
          chunk: self.backing.chunk,
          offset: self.backing.offset + n,
          length: self.backing.length - n
        })
      }
      case "IConcat": {
        if (n > self.left.length) {
          return drop(self.right, n - self.left.length)
        }
        return makeChunk({
          _tag: "IConcat",
          left: drop(self.left, n),
          right: self.right
        })
      }
      default: {
        return makeChunk({
          _tag: "ISlice",
          chunk: self,
          offset: n,
          length: self.length - n
        })
      }
    }
  }
})

/**
 * Drops the last `n` elements.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5)
 * const result = Chunk.dropRight(chunk, 2)
 * console.log(result)
 * // { _id: 'Chunk', values: [ 1, 2, 3 ] }
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const dropRight: {
  (n: number): <A>(self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, n: number): Chunk<A>
} = dual(2, <A>(self: Chunk<A>, n: number): Chunk<A> => take(self, Math.max(0, self.length - n)))

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5)
 * const result = Chunk.dropWhile(chunk, (n) => n < 3)
 * console.log(result)
 * // { _id: 'Chunk', values: [ 3, 4, 5 ] }
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const dropWhile: {
  <A>(predicate: Predicate<NoInfer<A>>): (self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, predicate: Predicate<A>): Chunk<A>
} = dual(2, <A>(self: Chunk<A>, predicate: Predicate<A>): Chunk<A> => {
  const arr = toReadonlyArray(self)
  const len = arr.length
  let i = 0
  while (i < len && predicate(arr[i]!)) {
    i++
  }
  return drop(self, i)
})

/**
 * Prepends the specified prefix chunk to the beginning of the specified chunk.
 * If either chunk is non-empty, the result is also a non-empty chunk.
 *
 * @example
 *
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const result = Chunk.make(1, 2).pipe(Chunk.prependAll(Chunk.make("a", "b")), Chunk.toArray)
 *
 * console.log(result)
 * // [ "a", "b", 1, 2 ]
 * ```
 *
 * @category concatenating
 * @since 2.0.0
 */
export const prependAll: {
  <S extends Chunk<any>, T extends Chunk<any>>(
    that: T
  ): (self: S) => Chunk.OrNonEmpty<S, T, Chunk.Infer<S> | Chunk.Infer<T>>
  <A, B>(self: Chunk<A>, that: NonEmptyChunk<B>): NonEmptyChunk<A | B>
  <A, B>(self: NonEmptyChunk<A>, that: Chunk<B>): NonEmptyChunk<A | B>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A | B>
} = dual(2, <A, B>(self: NonEmptyChunk<A>, that: Chunk<B>): Chunk<A | B> => appendAll(that, self))

/**
 * Concatenates two chunks, combining their elements.
 * If either chunk is non-empty, the result is also a non-empty chunk.
 *
 * @example
 *
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const result = Chunk.make(1, 2).pipe(Chunk.appendAll(Chunk.make("a", "b")), Chunk.toArray)
 *
 * console.log(result)
 * // [ 1, 2, "a", "b" ]
 * ```
 *
 * @category concatenating
 * @since 2.0.0
 */
export const appendAll: {
  <S extends Chunk<any>, T extends Chunk<any>>(
    that: T
  ): (self: S) => Chunk.OrNonEmpty<S, T, Chunk.Infer<S> | Chunk.Infer<T>>
  <A, B>(self: Chunk<A>, that: NonEmptyChunk<B>): NonEmptyChunk<A | B>
  <A, B>(self: NonEmptyChunk<A>, that: Chunk<B>): NonEmptyChunk<A | B>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A | B>
} = dual(2, <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A | B> => {
  if (self.backing._tag === "IEmpty") {
    return that
  }
  if (that.backing._tag === "IEmpty") {
    return self
  }
  const diff = that.depth - self.depth
  if (Math.abs(diff) <= 1) {
    return makeChunk<A | B>({ _tag: "IConcat", left: self, right: that })
  } else if (diff < -1) {
    if (self.left.depth >= self.right.depth) {
      const nr = appendAll(self.right, that)
      return makeChunk({ _tag: "IConcat", left: self.left, right: nr })
    } else {
      const nrr = appendAll(self.right.right, that)
      if (nrr.depth === self.depth - 3) {
        const nr = makeChunk({ _tag: "IConcat", left: self.right.left, right: nrr })
        return makeChunk({ _tag: "IConcat", left: self.left, right: nr })
      } else {
        const nl = makeChunk({ _tag: "IConcat", left: self.left, right: self.right.left })
        return makeChunk({ _tag: "IConcat", left: nl, right: nrr })
      }
    }
  } else {
    if (that.right.depth >= that.left.depth) {
      const nl = appendAll(self, that.left)
      return makeChunk({ _tag: "IConcat", left: nl, right: that.right })
    } else {
      const nll = appendAll(self, that.left.left)
      if (nll.depth === that.depth - 3) {
        const nl = makeChunk({ _tag: "IConcat", left: nll, right: that.left.right })
        return makeChunk({ _tag: "IConcat", left: nl, right: that.right })
      } else {
        const nr = makeChunk({ _tag: "IConcat", left: that.left.right, right: that.right })
        return makeChunk({ _tag: "IConcat", left: nll, right: nr })
      }
    }
  }
})

/**
 * Returns a filtered and mapped subset of the elements.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 * import * as Option from "effect/data/Option"
 *
 * const chunk = Chunk.make("1", "2", "hello", "3", "world")
 * const numbers = Chunk.filterMap(chunk, (str) => {
 *   const num = parseInt(str)
 *   return isNaN(num) ? Option.none() : Option.some(num)
 * })
 * console.log(Chunk.toArray(numbers)) // [1, 2, 3]
 *
 * // With index parameter
 * const evenIndexNumbers = Chunk.filterMap(chunk, (str, i) => {
 *   const num = parseInt(str)
 *   return isNaN(num) || i % 2 !== 0 ? Option.none() : Option.some(num)
 * })
 * console.log(Chunk.toArray(evenIndexNumbers)) // [1]
 * ```
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterMap: {
  <A, B>(f: (a: A, i: number) => Option<B>): (self: Chunk<A>) => Chunk<B>
  <A, B>(self: Chunk<A>, f: (a: A, i: number) => Option<B>): Chunk<B>
} = dual(
  2,
  <A, B>(self: Chunk<A>, f: (a: A, i: number) => Option<B>): Chunk<B> => fromArrayUnsafe(RA.filterMap(self, f))
)

/**
 * Returns a filtered subset of the elements.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5, 6)
 * const evenNumbers = Chunk.filter(chunk, (n) => n % 2 === 0)
 * console.log(Chunk.toArray(evenNumbers)) // [2, 4, 6]
 *
 * // With refinement
 * const mixed = Chunk.make("hello", 42, "world", 100)
 * const numbers = Chunk.filter(mixed, (x): x is number => typeof x === "number")
 * console.log(Chunk.toArray(numbers)) // [42, 100]
 * ```
 *
 * @since 2.0.0
 * @category filtering
 */
export const filter: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>): (self: Chunk<A>) => Chunk<B>
  <A>(predicate: Predicate<NoInfer<A>>): (self: Chunk<A>) => Chunk<A>
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): Chunk<B>
  <A>(self: Chunk<A>, predicate: Predicate<A>): Chunk<A>
} = dual(
  2,
  <A>(self: Chunk<A>, predicate: Predicate<A>): Chunk<A> => fromArrayUnsafe(RA.filter(self, predicate))
)

/**
 * Transforms all elements of the chunk for as long as the specified function returns some value
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 * import * as Option from "effect/data/Option"
 *
 * const chunk = Chunk.make("1", "2", "hello", "3", "4")
 * const result = Chunk.filterMapWhile(chunk, (s) => {
 *   const num = parseInt(s)
 *   return isNaN(num) ? Option.none() : Option.some(num)
 * })
 * console.log(Chunk.toArray(result)) // [1, 2]
 * // Stops at "hello" and doesn't process "3", "4"
 *
 * // Compare with regular filterMap
 * const allNumbers = Chunk.filterMap(chunk, (s) => {
 *   const num = parseInt(s)
 *   return isNaN(num) ? Option.none() : Option.some(num)
 * })
 * console.log(Chunk.toArray(allNumbers)) // [1, 2, 3, 4]
 * ```
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterMapWhile: {
  <A, B>(f: (a: A) => Option<B>): (self: Chunk<A>) => Chunk<B>
  <A, B>(self: Chunk<A>, f: (a: A) => Option<B>): Chunk<B>
} = dual(2, <A, B>(self: Chunk<A>, f: (a: A) => Option<B>) => fromArrayUnsafe(RA.filterMapWhile(self, f)))

/**
 * Filter out optional values
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 * import * as Option from "effect/data/Option"
 *
 * const chunk = Chunk.make(Option.some(1), Option.none(), Option.some(3))
 * const result = Chunk.compact(chunk)
 * console.log(result)
 * // { _id: 'Chunk', values: [ 1, 3 ] }
 * ```
 *
 * @category filtering
 * @since 2.0.0
 */
export const compact = <A>(self: Chunk<Option<A>>): Chunk<A> => filterMap(self, identity)

/**
 * Applies a function to each element in a chunk and returns a new chunk containing the concatenated mapped elements.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3)
 * const duplicated = Chunk.flatMap(chunk, (n) => Chunk.make(n, n))
 * console.log(Chunk.toArray(duplicated)) // [1, 1, 2, 2, 3, 3]
 *
 * // Flattening nested arrays
 * const words = Chunk.make("hello", "world")
 * const letters = Chunk.flatMap(words, (word) => Chunk.fromIterable(word.split("")))
 * console.log(Chunk.toArray(letters)) // ["h", "e", "l", "l", "o", "w", "o", "r", "l", "d"]
 *
 * // With index parameter
 * const indexed = Chunk.flatMap(chunk, (n, i) => Chunk.make(n + i))
 * console.log(Chunk.toArray(indexed)) // [1, 3, 5]
 * ```
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <S extends Chunk<any>, T extends Chunk<any>>(
    f: (a: Chunk.Infer<S>, i: number) => T
  ): (self: S) => Chunk.AndNonEmpty<S, T, Chunk.Infer<T>>
  <A, B>(self: NonEmptyChunk<A>, f: (a: A, i: number) => NonEmptyChunk<B>): NonEmptyChunk<B>
  <A, B>(self: Chunk<A>, f: (a: A, i: number) => Chunk<B>): Chunk<B>
} = dual(2, <A, B>(self: Chunk<A>, f: (a: A, i: number) => Chunk<B>) => {
  if (self.backing._tag === "ISingleton") {
    return f(self.backing.a, 0)
  }
  let out: Chunk<B> = _empty
  let i = 0
  for (const k of self) {
    out = appendAll(out, f(k, i++))
  }
  return out
})

/**
 * Iterates over each element of a `Chunk` and applies a function to it.
 *
 * **Details**
 *
 * This function processes every element of the given `Chunk`, calling the
 * provided function `f` on each element. It does not return a new value;
 * instead, it is primarily used for side effects, such as logging or
 * accumulating data in an external variable.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4)
 *
 * // Log each element
 * Chunk.forEach(chunk, (n) => console.log(`Value: ${n}`))
 * // Output:
 * // Value: 1
 * // Value: 2
 * // Value: 3
 * // Value: 4
 *
 * // With index parameter
 * Chunk.forEach(chunk, (n, i) => console.log(`Index ${i}: ${n}`))
 * // Output:
 * // Index 0: 1
 * // Index 1: 2
 * // Index 2: 3
 * // Index 3: 4
 * ```
 *
 * @since 2.0.0
 * @category combinators
 */
export const forEach: {
  <A, B>(f: (a: A, index: number) => B): (self: Chunk<A>) => void
  <A, B>(self: Chunk<A>, f: (a: A, index: number) => B): void
} = dual(2, <A, B>(self: Chunk<A>, f: (a: A) => B): void => toReadonlyArray(self).forEach(f))

/**
 * Flattens a chunk of chunks into a single chunk by concatenating all chunks.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const nested = Chunk.make(
 *   Chunk.make(1, 2),
 *   Chunk.make(3, 4, 5),
 *   Chunk.make(6)
 * )
 * const flattened = Chunk.flatten(nested)
 * console.log(Chunk.toArray(flattened)) // [1, 2, 3, 4, 5, 6]
 *
 * // With empty chunks
 * const withEmpty = Chunk.make(
 *   Chunk.make(1, 2),
 *   Chunk.empty<number>(),
 *   Chunk.make(3, 4)
 * )
 * console.log(Chunk.toArray(Chunk.flatten(withEmpty))) // [1, 2, 3, 4]
 * ```
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatten: <S extends Chunk<Chunk<any>>>(self: S) => Chunk.Flatten<S> = flatMap(identity) as any

/**
 * Groups elements in chunks of up to `n` elements.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5, 6, 7, 8, 9)
 * const chunked = Chunk.chunksOf(chunk, 3)
 *
 * console.log(Chunk.toArray(chunked).map(Chunk.toArray))
 * // [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
 *
 * // When length is not evenly divisible
 * const chunk2 = Chunk.make(1, 2, 3, 4, 5)
 * const chunked2 = Chunk.chunksOf(chunk2, 2)
 * console.log(Chunk.toArray(chunked2).map(Chunk.toArray))
 * // [[1, 2], [3, 4], [5]]
 * ```
 *
 * @since 2.0.0
 * @category elements
 */
export const chunksOf: {
  (n: number): <A>(self: Chunk<A>) => Chunk<Chunk<A>>
  <A>(self: Chunk<A>, n: number): Chunk<Chunk<A>>
} = dual(2, <A>(self: Chunk<A>, n: number) => {
  const gr: Array<Chunk<A>> = []
  let current: Array<A> = []
  toReadonlyArray(self).forEach((a) => {
    current.push(a)
    if (current.length >= n) {
      gr.push(fromArrayUnsafe(current))
      current = []
    }
  })
  if (current.length > 0) {
    gr.push(fromArrayUnsafe(current))
  }
  return fromArrayUnsafe(gr)
})

/**
 * Creates a Chunk of unique values that are included in all given Chunks.
 *
 * The order and references of result values are determined by the Chunk.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk1 = Chunk.make(1, 2, 3, 4)
 * const chunk2 = Chunk.make(3, 4, 5, 6)
 * const result = Chunk.intersection(chunk1, chunk2)
 * console.log(Chunk.toArray(result)) // [3, 4]
 *
 * // With strings
 * const words1 = Chunk.make("hello", "world", "foo")
 * const words2 = Chunk.make("world", "bar", "foo")
 * console.log(Chunk.toArray(Chunk.intersection(words1, words2))) // ["world", "foo"]
 *
 * // No intersection
 * const chunk3 = Chunk.make(1, 2)
 * const chunk4 = Chunk.make(3, 4)
 * console.log(Chunk.toArray(Chunk.intersection(chunk3, chunk4))) // []
 * ```
 *
 * @since 2.0.0
 * @category elements
 */
export const intersection: {
  <A>(that: Chunk<A>): <B>(self: Chunk<B>) => Chunk<A & B>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A & B>
} = dual(
  2,
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A & B> =>
    fromArrayUnsafe(RA.intersection(toReadonlyArray(self), toReadonlyArray(that)))
)

/**
 * Determines if the chunk is empty.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * console.log(Chunk.isEmpty(Chunk.empty())) // true
 * console.log(Chunk.isEmpty(Chunk.make(1, 2, 3))) // false
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const isEmpty = <A>(self: Chunk<A>): boolean => self.length === 0

/**
 * Determines if the chunk is not empty.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * console.log(Chunk.isNonEmpty(Chunk.empty())) // false
 * console.log(Chunk.isNonEmpty(Chunk.make(1, 2, 3))) // true
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const isNonEmpty = <A>(self: Chunk<A>): self is NonEmptyChunk<A> => self.length > 0

/**
 * Returns the first element of this chunk if it exists.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 * import * as Option from "effect/data/Option"
 *
 * console.log(Chunk.head(Chunk.empty())) // { _tag: "None" }
 * console.log(Chunk.head(Chunk.make(1, 2, 3))) // { _tag: "Some", value: 1 }
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const head: <A>(self: Chunk<A>) => Option<A> = get(0)

/**
 * Returns the first element of this chunk.
 *
 * It will throw an error if the chunk is empty.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4)
 * console.log(Chunk.headUnsafe(chunk)) // 1
 *
 * const singleElement = Chunk.make("hello")
 * console.log(Chunk.headUnsafe(singleElement)) // "hello"
 *
 * // Warning: This will throw for empty chunks
 * try {
 *   Chunk.headUnsafe(Chunk.empty())
 * } catch (error) {
 *   console.log((error as Error).message) // "Index out of bounds"
 * }
 * ```
 *
 * @since 2.0.0
 * @category unsafe
 */
export const headUnsafe = <A>(self: Chunk<A>): A => getUnsafe(self, 0)

/**
 * Returns the first element of this non empty chunk.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const nonEmptyChunk = Chunk.make(1, 2, 3, 4)
 * console.log(Chunk.headNonEmpty(nonEmptyChunk)) // 1
 *
 * const singleElement = Chunk.make("hello")
 * console.log(Chunk.headNonEmpty(singleElement)) // "hello"
 *
 * // Type safety: this function only accepts NonEmptyChunk
 * // Chunk.headNonEmpty(Chunk.empty()) // TypeScript error
 * ```
 *
 * @since 2.0.0
 * @category elements
 */
export const headNonEmpty: <A>(self: NonEmptyChunk<A>) => A = headUnsafe

/**
 * Returns the last element of this chunk if it exists.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 * import * as Option from "effect/data/Option"
 *
 * console.log(Chunk.last(Chunk.empty())) // { _tag: "None" }
 * console.log(Chunk.last(Chunk.make(1, 2, 3))) // { _tag: "Some", value: 3 }
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const last = <A>(self: Chunk<A>): Option<A> => get(self, self.length - 1)

/**
 * Returns the last element of this chunk.
 *
 * It will throw an error if the chunk is empty.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4)
 * console.log(Chunk.lastUnsafe(chunk)) // 4
 *
 * const singleElement = Chunk.make("hello")
 * console.log(Chunk.lastUnsafe(singleElement)) // "hello"
 *
 * // Warning: This will throw for empty chunks
 * try {
 *   Chunk.lastUnsafe(Chunk.empty())
 * } catch (error) {
 *   console.log((error as Error).message) // "Index out of bounds"
 * }
 * ```
 *
 * @since 2.0.0
 * @category unsafe
 */
export const lastUnsafe = <A>(self: Chunk<A>): A => getUnsafe(self, self.length - 1)

/**
 * Returns the last element of this non empty chunk.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const nonEmptyChunk = Chunk.make(1, 2, 3, 4)
 * console.log(Chunk.lastNonEmpty(nonEmptyChunk)) // 4
 *
 * const singleElement = Chunk.make("hello")
 * console.log(Chunk.lastNonEmpty(singleElement)) // "hello"
 *
 * // Type safety: this function only accepts NonEmptyChunk
 * // Chunk.lastNonEmpty(Chunk.empty()) // TypeScript error
 * ```
 *
 * @since 3.4.0
 * @category elements
 */
export const lastNonEmpty: <A>(self: NonEmptyChunk<A>) => A = lastUnsafe

/**
 * A namespace containing utility types for Chunk operations.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * // Extract the element type from a Chunk
 * declare const chunk: Chunk.Chunk<string>
 * type ElementType = Chunk.Chunk.Infer<typeof chunk> // string
 *
 * // Create a preserving non-emptiness
 * declare const nonEmptyChunk: Chunk.NonEmptyChunk<number>
 * type WithString = Chunk.Chunk.With<typeof nonEmptyChunk, string> // Chunk.NonEmptyChunk<string>
 * ```
 *
 * @category types
 * @since 2.0.0
 */
export declare namespace Chunk {
  /**
   * Infers the element type of a Chunk.
   *
   * @example
   * ```ts
   * import { Chunk } from "effect/collections"
   *
   * declare const numberChunk: Chunk.Chunk<number>
   * declare const stringChunk: Chunk.Chunk<string>
   *
   * type NumberType = Chunk.Chunk.Infer<typeof numberChunk> // number
   * type StringType = Chunk.Chunk.Infer<typeof stringChunk> // string
   * ```
   *
   * @category types
   * @since 2.0.0
   */
  export type Infer<S extends Chunk<any>> = S extends Chunk<infer A> ? A : never

  /**
   * Constructs a Chunk type preserving non-emptiness.
   *
   * @example
   * ```ts
   * import { Chunk } from "effect/collections"
   *
   * declare const regularChunk: Chunk.Chunk<number>
   * declare const nonEmptyChunk: Chunk.NonEmptyChunk<number>
   *
   * type WithString1 = Chunk.Chunk.With<typeof regularChunk, string> // Chunk.Chunk<string>
   * type WithString2 = Chunk.Chunk.With<typeof nonEmptyChunk, string> // Chunk.NonEmptyChunk<string>
   * ```
   *
   * @category types
   * @since 2.0.0
   */
  export type With<S extends Chunk<any>, A> = S extends NonEmptyChunk<any> ? NonEmptyChunk<A> : Chunk<A>

  /**
   * Creates a non-empty Chunk if either input is non-empty.
   *
   * @example
   * ```ts
   * import { Chunk } from "effect/collections"
   *
   * declare const emptyChunk: Chunk.Chunk<number>
   * declare const nonEmptyChunk: Chunk.NonEmptyChunk<number>
   *
   * type Result1 = Chunk.Chunk.OrNonEmpty<typeof emptyChunk, typeof emptyChunk, string> // Chunk.Chunk<string>
   * type Result2 = Chunk.Chunk.OrNonEmpty<typeof emptyChunk, typeof nonEmptyChunk, string> // Chunk.NonEmptyChunk<string>
   * type Result3 = Chunk.Chunk.OrNonEmpty<typeof nonEmptyChunk, typeof emptyChunk, string> // Chunk.NonEmptyChunk<string>
   * ```
   *
   * @category types
   * @since 2.0.0
   */
  export type OrNonEmpty<S extends Chunk<any>, T extends Chunk<any>, A> = S extends NonEmptyChunk<any> ?
    NonEmptyChunk<A>
    : T extends NonEmptyChunk<any> ? NonEmptyChunk<A>
    : Chunk<A>

  /**
   * Creates a non-empty Chunk only if both inputs are non-empty.
   *
   * @example
   * ```ts
   * import { Chunk } from "effect/collections"
   *
   * declare const emptyChunk: Chunk.Chunk<number>
   * declare const nonEmptyChunk: Chunk.NonEmptyChunk<number>
   *
   * type Result1 = Chunk.Chunk.AndNonEmpty<typeof emptyChunk, typeof emptyChunk, string> // Chunk.Chunk<string>
   * type Result2 = Chunk.Chunk.AndNonEmpty<typeof emptyChunk, typeof nonEmptyChunk, string> // Chunk.Chunk<string>
   * type Result3 = Chunk.Chunk.AndNonEmpty<typeof nonEmptyChunk, typeof nonEmptyChunk, string> // Chunk.NonEmptyChunk<string>
   * ```
   *
   * @category types
   * @since 2.0.0
   */
  export type AndNonEmpty<S extends Chunk<any>, T extends Chunk<any>, A> = S extends NonEmptyChunk<any> ?
    T extends NonEmptyChunk<any> ? NonEmptyChunk<A>
    : Chunk<A> :
    Chunk<A>

  /**
   * Flattens a nested Chunk type.
   *
   * @example
   * ```ts
   * import { Chunk } from "effect/collections"
   *
   * declare const nestedChunk: Chunk.Chunk<Chunk.Chunk<number>>
   * declare const nestedNonEmpty: Chunk.NonEmptyChunk<Chunk.NonEmptyChunk<string>>
   *
   * type Flattened1 = Chunk.Chunk.Flatten<typeof nestedChunk> // Chunk.Chunk<number>
   * type Flattened2 = Chunk.Chunk.Flatten<typeof nestedNonEmpty> // Chunk.NonEmptyChunk<string>
   * ```
   *
   * @category types
   * @since 2.0.0
   */
  export type Flatten<T extends Chunk<Chunk<any>>> = T extends NonEmptyChunk<NonEmptyChunk<infer A>> ? NonEmptyChunk<A>
    : T extends Chunk<Chunk<infer A>> ? Chunk<A>
    : never
}

/**
 * Transforms the elements of a chunk using the specified mapping function.
 * If the input chunk is non-empty, the resulting chunk will also be non-empty.
 *
 * @example
 *
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const result = Chunk.map(Chunk.make(1, 2), (n) => n + 1)
 *
 * console.log(result)
 * // { _id: 'Chunk', values: [ 2, 3 ] }
 * ```
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <S extends Chunk<any>, B>(f: (a: Chunk.Infer<S>, i: number) => B): (self: S) => Chunk.With<S, B>
  <A, B>(self: NonEmptyChunk<A>, f: (a: A, i: number) => B): NonEmptyChunk<B>
  <A, B>(self: Chunk<A>, f: (a: A, i: number) => B): Chunk<B>
} = dual(2, <A, B>(self: Chunk<A>, f: (a: A, i: number) => B): Chunk<B> =>
  self.backing._tag === "ISingleton" ?
    of(f(self.backing.a, 0)) :
    fromArrayUnsafe(pipe(toReadonlyArray(self), RA.map((a, i) => f(a, i)))))

/**
 * Statefully maps over the chunk, producing new elements of type `B`.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5)
 * const [finalState, mapped] = Chunk.mapAccum(chunk, 0, (state, current) => [
 *   state + current,  // accumulate sum
 *   state + current   // output running sum
 * ])
 *
 * console.log(finalState) // 15 (final accumulated sum)
 * console.log(Chunk.toArray(mapped)) // [1, 3, 6, 10, 15] (running sums)
 *
 * // Building a string with indices
 * const words = Chunk.make("hello", "world", "effect")
 * const [count, indexed] = Chunk.mapAccum(words, 0, (index, word) => [
 *   index + 1,
 *   `${index}: ${word}`
 * ])
 * console.log(count) // 3
 * console.log(Chunk.toArray(indexed)) // ["0: hello", "1: world", "2: effect"]
 * ```
 *
 * @since 2.0.0
 * @category folding
 */
export const mapAccum: {
  <S, A, B>(s: S, f: (s: S, a: A) => readonly [S, B]): (self: Chunk<A>) => [S, Chunk<B>]
  <S, A, B>(self: Chunk<A>, s: S, f: (s: S, a: A) => readonly [S, B]): [S, Chunk<B>]
} = dual(3, <S, A, B>(self: Chunk<A>, s: S, f: (s: S, a: A) => readonly [S, B]): [S, Chunk<B>] => {
  const [s1, as] = RA.mapAccum(self, s, f)
  return [s1, fromArrayUnsafe(as)]
})

/**
 * Separate elements based on a predicate that also exposes the index of the element.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5, 6)
 * const [odds, evens] = Chunk.partition(chunk, (n) => n % 2 === 0)
 * console.log(Chunk.toArray(odds)) // [1, 3, 5]
 * console.log(Chunk.toArray(evens)) // [2, 4, 6]
 *
 * // With index parameter
 * const words = Chunk.make("a", "bb", "ccc", "dddd")
 * const [short, long] = Chunk.partition(words, (word, i) => word.length > i)
 * console.log(Chunk.toArray(short)) // ["a", "bb"]
 * console.log(Chunk.toArray(long)) // ["ccc", "dddd"]
 *
 * // With refinement
 * const mixed = Chunk.make("hello", 42, "world", 100)
 * const [strings, numbers] = Chunk.partition(mixed, (x): x is number => typeof x === "number")
 * console.log(Chunk.toArray(strings)) // ["hello", "world"]
 * console.log(Chunk.toArray(numbers)) // [42, 100]
 * ```
 *
 * @category filtering
 * @since 2.0.0
 */
export const partition: {
  <A, B extends A>(
    refinement: (a: NoInfer<A>, i: number) => a is B
  ): (self: Chunk<A>) => [excluded: Chunk<Exclude<A, B>>, satisfying: Chunk<B>]
  <A>(
    predicate: (a: NoInfer<A>, i: number) => boolean
  ): (self: Chunk<A>) => [excluded: Chunk<A>, satisfying: Chunk<A>]
  <A, B extends A>(
    self: Chunk<A>,
    refinement: (a: A, i: number) => a is B
  ): [excluded: Chunk<Exclude<A, B>>, satisfying: Chunk<B>]
  <A>(self: Chunk<A>, predicate: (a: A, i: number) => boolean): [excluded: Chunk<A>, satisfying: Chunk<A>]
} = dual(
  2,
  <A>(self: Chunk<A>, predicate: (a: A, i: number) => boolean): [excluded: Chunk<A>, satisfying: Chunk<A>] =>
    pipe(
      RA.partition(toReadonlyArray(self), predicate),
      ([l, r]) => [fromArrayUnsafe(l), fromArrayUnsafe(r)]
    )
)

/**
 * Partitions the elements of this chunk into two chunks using f.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 * import * as Result from "effect/data/Result"
 *
 * const chunk = Chunk.make("1", "hello", "2", "world", "3")
 * const [errors, numbers] = Chunk.partitionMap(chunk, (str) => {
 *   const num = parseInt(str)
 *   return isNaN(num)
 *     ? Result.fail(`"${str}" is not a number`)
 *     : Result.succeed(num)
 * })
 *
 * console.log(Chunk.toArray(errors)) // ['"hello" is not a number', '"world" is not a number']
 * console.log(Chunk.toArray(numbers)) // [1, 2, 3]
 *
 * // All successes
 * const validNumbers = Chunk.make("1", "2", "3")
 * const [noErrors, allNumbers] = Chunk.partitionMap(validNumbers, (str) =>
 *   Result.succeed(parseInt(str))
 * )
 * console.log(Chunk.toArray(noErrors)) // []
 * console.log(Chunk.toArray(allNumbers)) // [1, 2, 3]
 * ```
 *
 * @category filtering
 * @since 2.0.0
 */
export const partitionMap: {
  <A, B, C>(f: (a: A) => Result<C, B>): (self: Chunk<A>) => [left: Chunk<B>, right: Chunk<C>]
  <A, B, C>(self: Chunk<A>, f: (a: A) => Result<C, B>): [left: Chunk<B>, right: Chunk<C>]
} = dual(2, <A, B, C>(self: Chunk<A>, f: (a: A) => Result<C, B>): [left: Chunk<B>, right: Chunk<C>] =>
  pipe(
    RA.partitionMap(toReadonlyArray(self), f),
    ([l, r]) => [fromArrayUnsafe(l), fromArrayUnsafe(r)]
  ))

/**
 * Partitions the elements of this chunk into two chunks.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 * import * as Result from "effect/data/Result"
 *
 * const chunk = Chunk.make(
 *   Result.succeed(1),
 *   Result.fail("error1"),
 *   Result.succeed(2),
 *   Result.fail("error2"),
 *   Result.succeed(3)
 * )
 *
 * const [errors, values] = Chunk.separate(chunk)
 * console.log(Chunk.toArray(errors)) // ["error1", "error2"]
 * console.log(Chunk.toArray(values)) // [1, 2, 3]
 *
 * // All successes
 * const allSuccesses = Chunk.make(Result.succeed(1), Result.succeed(2))
 * const [noErrors, allValues] = Chunk.separate(allSuccesses)
 * console.log(Chunk.toArray(noErrors)) // []
 * console.log(Chunk.toArray(allValues)) // [1, 2]
 * ```
 *
 * @category filtering
 * @since 2.0.0
 */
export const separate = <A, B>(self: Chunk<Result<B, A>>): [Chunk<A>, Chunk<B>] =>
  pipe(
    RA.separate(toReadonlyArray(self)),
    ([l, r]) => [fromArrayUnsafe(l), fromArrayUnsafe(r)]
  )

/**
 * Retrieves the size of the chunk.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3)
 * console.log(Chunk.size(chunk)) // 3
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const size = <A>(self: Chunk<A>): number => self.length

/**
 * Sort the elements of a Chunk in increasing order, creating a new Chunk.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
import * as Order from "effect/data/Order"
 *
 * const numbers = Chunk.make(3, 1, 4, 1, 5, 9, 2, 6)
 * const sorted = Chunk.sort(numbers, Order.number)
 * console.log(Chunk.toArray(sorted)) // [1, 1, 2, 3, 4, 5, 6, 9]
 *
 * // Reverse order
 * const reverseSorted = Chunk.sort(numbers, Order.reverse(Order.number))
 * console.log(Chunk.toArray(reverseSorted)) // [9, 6, 5, 4, 3, 2, 1, 1]
 *
 * // String sorting
 * const words = Chunk.make("banana", "apple", "cherry")
 * const sortedWords = Chunk.sort(words, Order.string)
 * console.log(Chunk.toArray(sortedWords)) // ["apple", "banana", "cherry"]
 * ```
 *
 * @since 2.0.0
 * @category sorting
 */
export const sort: {
  <B>(O: Order.Order<B>): <A extends B>(self: Chunk<A>) => Chunk<A>
  <A extends B, B>(self: Chunk<A>, O: Order.Order<B>): Chunk<A>
} = dual(
  2,
  <A extends B, B>(self: Chunk<A>, O: Order.Order<B>): Chunk<A> => fromArrayUnsafe(RA.sort(toReadonlyArray(self), O))
)

/**
 * Sorts the elements of a Chunk based on a projection function.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
import * as Order from "effect/data/Order"
 *
 * const people = Chunk.make(
 *   { name: "Alice", age: 30 },
 *   { name: "Bob", age: 25 },
 *   { name: "Charlie", age: 35 }
 * )
 *
 * // Sort by age
 * const byAge = Chunk.sortWith(people, (person) => person.age, Order.number)
 * console.log(Chunk.toArray(byAge))
 * // [{ name: "Bob", age: 25 }, { name: "Alice", age: 30 }, { name: "Charlie", age: 35 }]
 *
 * // Sort by name
 * const byName = Chunk.sortWith(people, (person) => person.name, Order.string)
 * console.log(Chunk.toArray(byName))
 * // [{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }, { name: "Charlie", age: 35 }]
 *
 * // Sort by string length
 * const words = Chunk.make("a", "abc", "ab")
 * const byLength = Chunk.sortWith(words, (word) => word.length, Order.number)
 * console.log(Chunk.toArray(byLength)) // ["a", "ab", "abc"]
 * ```
 *
 * @since 2.0.0
 * @category sorting
 */
export const sortWith: {
  <A, B>(f: (a: A) => B, order: Order.Order<B>): (self: Chunk<A>) => Chunk<A>
  <A, B>(self: Chunk<A>, f: (a: A) => B, order: Order.Order<B>): Chunk<A>
} = dual(
  3,
  <A, B>(self: Chunk<A>, f: (a: A) => B, order: Order.Order<B>): Chunk<A> => sort(self, Order.mapInput(order, f))
)

/**
 *  Returns two splits of this chunk at the specified index.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5, 6)
 * const [before, after] = Chunk.splitAt(chunk, 3)
 * console.log(Chunk.toArray(before)) // [1, 2, 3]
 * console.log(Chunk.toArray(after)) // [4, 5, 6]
 *
 * // Split at index 0
 * const [empty, all] = Chunk.splitAt(chunk, 0)
 * console.log(Chunk.toArray(empty)) // []
 * console.log(Chunk.toArray(all)) // [1, 2, 3, 4, 5, 6]
 *
 * // Split beyond length
 * const [allElements, empty2] = Chunk.splitAt(chunk, 10)
 * console.log(Chunk.toArray(allElements)) // [1, 2, 3, 4, 5, 6]
 * console.log(Chunk.toArray(empty2)) // []
 * ```
 *
 * @since 2.0.0
 * @category splitting
 */
export const splitAt: {
  (n: number): <A>(self: Chunk<A>) => [beforeIndex: Chunk<A>, fromIndex: Chunk<A>]
  <A>(self: Chunk<A>, n: number): [beforeIndex: Chunk<A>, fromIndex: Chunk<A>]
} = dual(2, <A>(self: Chunk<A>, n: number): [Chunk<A>, Chunk<A>] => [take(self, n), drop(self, n)])

/**
 * Splits a `NonEmptyChunk` into two segments, with the first segment containing a maximum of `n` elements.
 * The value of `n` must be `>= 1`.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const nonEmptyChunk = Chunk.make(1, 2, 3, 4, 5, 6)
 * const [before, after] = Chunk.splitNonEmptyAt(nonEmptyChunk, 3)
 * console.log(Chunk.toArray(before)) // [1, 2, 3]
 * console.log(Chunk.toArray(after)) // [4, 5, 6]
 *
 * // Split at 1 (minimum)
 * const [first, rest] = Chunk.splitNonEmptyAt(nonEmptyChunk, 1)
 * console.log(Chunk.toArray(first)) // [1]
 * console.log(Chunk.toArray(rest)) // [2, 3, 4, 5, 6]
 *
 * // The first part is guaranteed to be NonEmptyChunk
 * // while the second part may be empty
 * ```
 *
 * @category splitting
 * @since 2.0.0
 */
export const splitNonEmptyAt: {
  (n: number): <A>(self: NonEmptyChunk<A>) => [beforeIndex: NonEmptyChunk<A>, fromIndex: Chunk<A>]
  <A>(self: NonEmptyChunk<A>, n: number): [beforeIndex: NonEmptyChunk<A>, fromIndex: Chunk<A>]
} = dual(2, <A>(self: NonEmptyChunk<A>, n: number): [Chunk<A>, Chunk<A>] => {
  const _n = Math.max(1, Math.floor(n))
  return _n >= self.length ?
    [self, empty()] :
    [take(self, _n), drop(self, _n)]
})

/**
 * Splits this chunk into `n` equally sized chunks.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5, 6, 7, 8, 9)
 * const chunks = Chunk.split(chunk, 3)
 * console.log(Chunk.toArray(chunks).map(Chunk.toArray))
 * // [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
 *
 * // Uneven split
 * const chunk2 = Chunk.make(1, 2, 3, 4, 5, 6, 7, 8)
 * const chunks2 = Chunk.split(chunk2, 3)
 * console.log(Chunk.toArray(chunks2).map(Chunk.toArray))
 * // [[1, 2, 3], [4, 5, 6], [7, 8]]
 *
 * // Split into 1 chunk
 * const chunks3 = Chunk.split(chunk, 1)
 * console.log(Chunk.toArray(chunks3).map(Chunk.toArray))
 * // [[1, 2, 3, 4, 5, 6, 7, 8, 9]]
 * ```
 *
 * @since 2.0.0
 * @category splitting
 */
export const split: {
  (n: number): <A>(self: Chunk<A>) => Chunk<Chunk<A>>
  <A>(self: Chunk<A>, n: number): Chunk<Chunk<A>>
} = dual(2, <A>(self: Chunk<A>, n: number) => chunksOf(self, Math.ceil(self.length / Math.floor(n))))

/**
 * Splits this chunk on the first element that matches this predicate.
 * Returns a tuple containing two chunks: the first one is before the match, and the second one is from the match onward.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5, 6)
 * const [before, fromMatch] = Chunk.splitWhere(chunk, (n) => n > 3)
 * console.log(Chunk.toArray(before)) // [1, 2, 3]
 * console.log(Chunk.toArray(fromMatch)) // [4, 5, 6]
 *
 * // No match found
 * const [all, empty] = Chunk.splitWhere(chunk, (n) => n > 10)
 * console.log(Chunk.toArray(all)) // [1, 2, 3, 4, 5, 6]
 * console.log(Chunk.toArray(empty)) // []
 *
 * // Match on first element
 * const [emptyBefore, allFromFirst] = Chunk.splitWhere(chunk, (n) => n === 1)
 * console.log(Chunk.toArray(emptyBefore)) // []
 * console.log(Chunk.toArray(allFromFirst)) // [1, 2, 3, 4, 5, 6]
 * ```
 *
 * @category splitting
 * @since 2.0.0
 */
export const splitWhere: {
  <A>(predicate: Predicate<NoInfer<A>>): (self: Chunk<A>) => [beforeMatch: Chunk<A>, fromMatch: Chunk<A>]
  <A>(self: Chunk<A>, predicate: Predicate<A>): [beforeMatch: Chunk<A>, fromMatch: Chunk<A>]
} = dual(2, <A>(self: Chunk<A>, predicate: Predicate<A>): [beforeMatch: Chunk<A>, fromMatch: Chunk<A>] => {
  let i = 0
  for (const a of toReadonlyArray(self)) {
    if (predicate(a)) {
      break
    } else {
      i++
    }
  }
  return splitAt(self, i)
})

/**
 * Returns every elements after the first.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 * import * as Option from "effect/data/Option"
 *
 * const chunk = Chunk.make(1, 2, 3, 4)
 * console.log(Chunk.tail(chunk)) // Option.some(Chunk.make(2, 3, 4))
 *
 * const singleElement = Chunk.make(1)
 * console.log(Chunk.tail(singleElement)) // Option.some(Chunk.empty())
 *
 * const empty = Chunk.empty<number>()
 * console.log(Chunk.tail(empty)) // Option.none()
 * ```
 *
 * @since 2.0.0
 * @category elements
 */
export const tail = <A>(self: Chunk<A>): Chunk<A> | undefined => self.length > 0 ? drop(self, 1) : undefined

/**
 * Returns every elements after the first.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const nonEmptyChunk = Chunk.make(1, 2, 3, 4)
 * const result = Chunk.tailNonEmpty(nonEmptyChunk)
 * console.log(Chunk.toArray(result)) // [2, 3, 4]
 *
 * const singleElement = Chunk.make(1)
 * const resultSingle = Chunk.tailNonEmpty(singleElement)
 * console.log(Chunk.toArray(resultSingle)) // []
 *
 * // Type safety: this function only accepts NonEmptyChunk
 * // Chunk.tailNonEmpty(Chunk.empty()) // TypeScript error
 * ```
 *
 * @since 2.0.0
 * @category elements
 */
export const tailNonEmpty = <A>(self: NonEmptyChunk<A>): Chunk<A> => drop(self, 1)

/**
 * Takes the last `n` elements.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5, 6)
 * const lastThree = Chunk.takeRight(chunk, 3)
 * console.log(Chunk.toArray(lastThree)) // [4, 5, 6]
 *
 * // Take more than available
 * const all = Chunk.takeRight(chunk, 10)
 * console.log(Chunk.toArray(all)) // [1, 2, 3, 4, 5, 6]
 *
 * // Take zero
 * const none = Chunk.takeRight(chunk, 0)
 * console.log(Chunk.toArray(none)) // []
 * ```
 *
 * @since 2.0.0
 * @category elements
 */
export const takeRight: {
  (n: number): <A>(self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, n: number): Chunk<A>
} = dual(2, <A>(self: Chunk<A>, n: number): Chunk<A> => drop(self, self.length - n))

/**
 * Takes all elements so long as the predicate returns true.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 3, 2, 1)
 * const result = Chunk.takeWhile(chunk, (n) => n < 4)
 * console.log(Chunk.toArray(result)) // [1, 2, 3]
 *
 * // Empty if first element doesn't match
 * const none = Chunk.takeWhile(chunk, (n) => n > 5)
 * console.log(Chunk.toArray(none)) // []
 *
 * // Takes all if all match
 * const small = Chunk.make(1, 2, 3)
 * const all = Chunk.takeWhile(small, (n) => n < 10)
 * console.log(Chunk.toArray(all)) // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 * @category elements
 */
export const takeWhile: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>): (self: Chunk<A>) => Chunk<B>
  <A>(predicate: Predicate<NoInfer<A>>): (self: Chunk<A>) => Chunk<A>
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): Chunk<B>
  <A>(self: Chunk<A>, predicate: Predicate<A>): Chunk<A>
} = dual(2, <A>(self: Chunk<A>, predicate: Predicate<A>): Chunk<A> => {
  const out: Array<A> = []
  for (const a of toReadonlyArray(self)) {
    if (predicate(a)) {
      out.push(a)
    } else {
      break
    }
  }
  return fromArrayUnsafe(out)
})

/**
 * Creates a Chunks of unique values, in order, from all given Chunks.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk1 = Chunk.make(1, 2, 3)
 * const chunk2 = Chunk.make(3, 4, 5)
 * const result = Chunk.union(chunk1, chunk2)
 * console.log(Chunk.toArray(result)) // [1, 2, 3, 4, 5]
 *
 * // Handles duplicates within the same chunk
 * const withDupes1 = Chunk.make(1, 1, 2)
 * const withDupes2 = Chunk.make(2, 3, 3)
 * const unified = Chunk.union(withDupes1, withDupes2)
 * console.log(Chunk.toArray(unified)) // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 * @category elements
 */
export const union: {
  <A>(that: Chunk<A>): <B>(self: Chunk<B>) => Chunk<A | B>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A | B>
} = dual(
  2,
  <A, B>(self: Chunk<A>, that: Chunk<B>) => fromArrayUnsafe(RA.union(toReadonlyArray(self), toReadonlyArray(that)))
)

/**
 * Remove duplicates from an array, keeping the first occurrence of an element.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 2, 3, 1, 4, 3)
 * const result = Chunk.dedupe(chunk)
 * console.log(Chunk.toArray(result)) // [1, 2, 3, 4]
 *
 * // Empty chunk
 * const empty = Chunk.empty<number>()
 * const emptyDeduped = Chunk.dedupe(empty)
 * console.log(Chunk.toArray(emptyDeduped)) // []
 *
 * // No duplicates
 * const unique = Chunk.make(1, 2, 3)
 * const uniqueDeduped = Chunk.dedupe(unique)
 * console.log(Chunk.toArray(uniqueDeduped)) // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 * @category elements
 */
export const dedupe = <A>(self: Chunk<A>): Chunk<A> => fromArrayUnsafe(RA.dedupe(toReadonlyArray(self)))

/**
 * Deduplicates adjacent elements that are identical.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 1, 2, 2, 2, 3, 1, 1)
 * const result = Chunk.dedupeAdjacent(chunk)
 * console.log(Chunk.toArray(result)) // [1, 2, 3, 1]
 *
 * // Only removes adjacent duplicates, not all duplicates
 * const mixed = Chunk.make("a", "a", "b", "a", "a")
 * const mixedResult = Chunk.dedupeAdjacent(mixed)
 * console.log(Chunk.toArray(mixedResult)) // ["a", "b", "a"]
 * ```
 *
 * @since 2.0.0
 * @category filtering
 */
export const dedupeAdjacent = <A>(self: Chunk<A>): Chunk<A> => fromArrayUnsafe(RA.dedupeAdjacent(self))

/**
 * Takes a `Chunk` of pairs and return two corresponding `Chunk`s.
 *
 * Note: The function is reverse of `zip`.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const pairs = Chunk.make([1, "a"] as const, [2, "b"] as const, [3, "c"] as const)
 * const [numbers, letters] = Chunk.unzip(pairs)
 * console.log(Chunk.toArray(numbers)) // [1, 2, 3]
 * console.log(Chunk.toArray(letters)) // ["a", "b", "c"]
 *
 * // Empty chunk
 * const empty = Chunk.empty<[number, string]>()
 * const [emptyNums, emptyStrs] = Chunk.unzip(empty)
 * console.log(Chunk.toArray(emptyNums)) // []
 * console.log(Chunk.toArray(emptyStrs)) // []
 * ```
 *
 * @since 2.0.0
 * @category elements
 */
export const unzip = <A, B>(self: Chunk<readonly [A, B]>): [Chunk<A>, Chunk<B>] => {
  const [left, right] = RA.unzip(self)
  return [fromArrayUnsafe(left), fromArrayUnsafe(right)]
}

/**
 * Zips this chunk pointwise with the specified chunk using the specified combiner.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const numbers = Chunk.make(1, 2, 3)
 * const letters = Chunk.make("a", "b", "c")
 * const result = Chunk.zipWith(numbers, letters, (n, l) => `${n}-${l}`)
 * console.log(Chunk.toArray(result)) // ["1-a", "2-b", "3-c"]
 *
 * // Different lengths - takes minimum
 * const short = Chunk.make(1, 2)
 * const long = Chunk.make("a", "b", "c", "d")
 * const mixed = Chunk.zipWith(short, long, (n, l) => [n, l])
 * console.log(Chunk.toArray(mixed)) // [[1, "a"], [2, "b"]]
 * ```
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWith: {
  <A, B, C>(that: Chunk<B>, f: (a: A, b: B) => C): (self: Chunk<A>) => Chunk<C>
  <A, B, C>(self: Chunk<A>, that: Chunk<B>, f: (a: A, b: B) => C): Chunk<C>
} = dual(
  3,
  <A, B, C>(self: Chunk<A>, that: Chunk<B>, f: (a: A, b: B) => C): Chunk<C> =>
    fromArrayUnsafe(RA.zipWith(self, that, f))
)

/**
 * Zips this chunk pointwise with the specified chunk.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const numbers = Chunk.make(1, 2, 3)
 * const letters = Chunk.make("a", "b", "c")
 * const result = Chunk.zip(numbers, letters)
 * console.log(Chunk.toArray(result)) // [[1, "a"], [2, "b"], [3, "c"]]
 *
 * // Different lengths - takes minimum length
 * const short = Chunk.make(1, 2)
 * const long = Chunk.make("a", "b", "c", "d")
 * const zipped = Chunk.zip(short, long)
 * console.log(Chunk.toArray(zipped)) // [[1, "a"], [2, "b"]]
 * ```
 *
 * @since 2.0.0
 * @category zipping
 */
export const zip: {
  <B>(that: Chunk<B>): <A>(self: Chunk<A>) => Chunk<[A, B]>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<[A, B]>
} = dual(
  2,
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<[A, B]> => zipWith(self, that, (a, b) => [a, b])
)

/**
 * Delete the element at the specified index, creating a new `Chunk`.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make("a", "b", "c", "d")
 * const result = Chunk.remove(chunk, 1)
 * console.log(Chunk.toArray(result)) // ["a", "c", "d"]
 *
 * // Remove first element
 * const removeFirst = Chunk.remove(chunk, 0)
 * console.log(Chunk.toArray(removeFirst)) // ["b", "c", "d"]
 *
 * // Index out of bounds returns same chunk
 * const outOfBounds = Chunk.remove(chunk, 10)
 * console.log(Chunk.toArray(outOfBounds)) // ["a", "b", "c", "d"]
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const remove: {
  (i: number): <A>(self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, i: number): Chunk<A>
} = dual(
  2,
  <A>(self: Chunk<A>, i: number): Chunk<A> => fromArrayUnsafe(RA.remove(toReadonlyArray(self), i))
)

/**
 * Applies a function to the element at the specified index, creating a new `Chunk`,
 * or returns `None` if the index is out of bounds.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4)
 * const result = Chunk.modify(chunk, 1, (n) => n * 10)
 * console.log(result) // { _id: 'Chunk', values: [ 1, 20, 3, 4 ] }
 *
 * // Index out of bounds returns None
 * const outOfBounds = chunk?.pipe(Chunk.modify(10, (n) => n * 10))
 * console.log(outOfBounds === undefined) // true
 *
 * // Negative index returns None
 * const negative = chunk?.pipe(Chunk.modify(-1, (n) => n * 10))
 * console.log(negative === undefined) // true
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const modify: {
  <A, B>(i: number, f: (a: A) => B): (self: Chunk<A>) => Chunk<A | B> | undefined
  <A, B>(self: Chunk<A>, i: number, f: (a: A) => B): Chunk<A | B> | undefined
} = dual(
  3,
  <A, B>(self: Chunk<A>, i: number, f: (a: A) => B): Chunk<A | B> | undefined =>
    UndefinedOr.map(RA.modify(toReadonlyArray(self), i, f), fromArrayUnsafe)
)

/**
 * Change the element at the specified index, creating a new `Chunk`,
 * or returns `None` if the index is out of bounds.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make("a", "b", "c", "d")
 * const result = Chunk.replace(chunk, 1, "X")
 * console.log(result) // { _id: 'Chunk', values: [ 'a', 'X', 'c', 'd' ] }
 *
 * // Index out of bounds returns None
 * const outOfBounds = chunk?.pipe(Chunk.replace(10, "Y"))
 * console.log(outOfBounds === undefined) // true
 *
 * // Negative index returns None
 * const negative = chunk?.pipe(Chunk.replace(-1, "Z"))
 * console.log(negative === undefined) // true
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const replace: {
  <B>(i: number, b: B): <A>(self: Chunk<A>) => Chunk<B | A> | undefined
  <A, B>(self: Chunk<A>, i: number, b: B): Chunk<B | A> | undefined
} = dual(3, <A, B>(self: Chunk<A>, i: number, b: B): Chunk<B | A> | undefined => modify(self, i, () => b))

/**
 * Return a Chunk of length n with element i initialized with f(i).
 *
 * **Note**. `n` is normalized to an integer >= 1.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.makeBy(5, (i) => i * 2)
 * console.log(chunk)
 * // { _id: 'Chunk', values: [ 0, 2, 4, 6, 8 ] }
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const makeBy: {
  <A>(f: (i: number) => A): (n: number) => NonEmptyChunk<A>
  <A>(n: number, f: (i: number) => A): NonEmptyChunk<A>
} = dual(2, (n, f) => fromIterable(RA.makeBy(n, f)))

/**
 * Create a non empty `Chunk` containing a range of integers, including both endpoints.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.range(1, 5)
 * console.log(chunk)
 * // { _id: 'Chunk', values: [ 1, 2, 3, 4, 5 ] }
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const range = (start: number, end: number): NonEmptyChunk<number> =>
  start <= end ? makeBy(end - start + 1, (i) => start + i) : of(start)

// -------------------------------------------------------------------------------------
// re-exports from ReadonlyArray
// -------------------------------------------------------------------------------------

/**
 * Returns a function that checks if a `Chunk` contains a given value using the default `Equivalence`.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5)
 * console.log(Chunk.contains(chunk, 3)) // true
 * console.log(Chunk.contains(chunk, 6)) // false
 *
 * // Works with strings
 * const words = Chunk.make("apple", "banana", "cherry")
 * console.log(Chunk.contains(words, "banana")) // true
 * console.log(Chunk.contains(words, "grape")) // false
 *
 * // Empty chunk
 * const empty = Chunk.empty<number>()
 * console.log(Chunk.contains(empty, 1)) // false
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const contains: {
  <A>(a: A): (self: Chunk<A>) => boolean
  <A>(self: Chunk<A>, a: A): boolean
} = RA.contains

/**
 * Returns a function that checks if a `Chunk` contains a given value using a provided `isEquivalent` function.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make({ id: 1, name: "Alice" }, { id: 2, name: "Bob" })
 *
 * // Custom equivalence by id
 * const containsById = Chunk.containsWith<{ id: number; name: string }>((a, b) => a.id === b.id)
 * console.log(containsById(chunk, { id: 1, name: "Different" })) // true
 * console.log(containsById(chunk, { id: 3, name: "Charlie" })) // false
 *
 * // Case-insensitive string comparison
 * const words = Chunk.make("Apple", "Banana", "Cherry")
 * const containsCaseInsensitive = Chunk.containsWith<string>((a, b) => a.toLowerCase() === b.toLowerCase())
 * console.log(containsCaseInsensitive(words, "apple")) // true
 * console.log(containsCaseInsensitive(words, "grape")) // false
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const containsWith: <A>(
  isEquivalent: (self: A, that: A) => boolean
) => {
  (a: A): (self: Chunk<A>) => boolean
  (self: Chunk<A>, a: A): boolean
} = RA.containsWith

/**
 * Returns the first element that satisfies the specified
 * predicate, or `None` if no such element exists.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 * import { Option } from "effect/data"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5)
 * const result = Chunk.findFirst(chunk, (n) => n > 3)
 * console.log(Option.isSome(result)) // true
 * console.log(Option.getOrElse(result, () => 0)) // 4
 *
 * // No match found
 * const notFound = Chunk.findFirst(chunk, (n) => n > 10)
 * console.log(Option.isNone(notFound)) // true
 *
 * // With type refinement
 * const mixed = Chunk.make(1, "hello", 2, "world", 3)
 * const firstString = Chunk.findFirst(mixed, (x): x is string => typeof x === "string")
 * console.log(Option.getOrElse(firstString, () => "")) // "hello"
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const findFirst: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>): (self: Chunk<A>) => Option<B>
  <A>(predicate: Predicate<NoInfer<A>>): (self: Chunk<A>) => Option<A>
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): Option<B>
  <A>(self: Chunk<A>, predicate: Predicate<A>): Option<A>
} = RA.findFirst

/**
 * Return the first index for which a predicate holds.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5)
 * const result = Chunk.findFirstIndex(chunk, (n) => n > 3)
 * console.log(result) // 3
 *
 * // No match found
 * const notFound = Chunk.findFirstIndex(chunk, (n) => n > 10)
 * console.log(notFound) // undefined
 *
 * // Find first even number
 * const firstEven = Chunk.findFirstIndex(chunk, (n) => n % 2 === 0)
 * console.log(firstEven) // 1
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const findFirstIndex: {
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => number | undefined
  <A>(self: Chunk<A>, predicate: Predicate<A>): number | undefined
} = RA.findFirstIndex

/**
 * Find the last element for which a predicate holds.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 * import * as Option from "effect/data/Option"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5)
 * const result = Chunk.findLast(chunk, (n) => n < 4)
 * console.log(Option.isSome(result)) // true
 * console.log(Option.getOrElse(result, () => 0)) // 3
 *
 * // No match found
 * const notFound = Chunk.findLast(chunk, (n) => n > 10)
 * console.log(Option.isNone(notFound)) // true
 *
 * // Find last even number
 * const lastEven = Chunk.findLast(chunk, (n) => n % 2 === 0)
 * console.log(Option.getOrElse(lastEven, () => 0)) // 4
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const findLast: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>): (self: Chunk<A>) => Option<B>
  <A>(predicate: Predicate<NoInfer<A>>): (self: Chunk<A>) => Option<A>
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): Option<B>
  <A>(self: Chunk<A>, predicate: Predicate<A>): Option<A>
} = RA.findLast

/**
 * Return the last index for which a predicate holds.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5)
 * const result = Chunk.findLastIndex(chunk, (n) => n < 4)
 * console.log(result) // 2
 *
 * // No match found
 * const notFound = Chunk.findLastIndex(chunk, (n) => n > 10)
 * console.log(notFound) // undefined
 *
 * // Find last even number index
 * const lastEven = Chunk.findLastIndex(chunk, (n) => n % 2 === 0)
 * console.log(lastEven) // 3
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const findLastIndex: {
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => number | undefined
  <A>(self: Chunk<A>, predicate: Predicate<A>): number | undefined
} = RA.findLastIndex

/**
 * Check if a predicate holds true for every `Chunk` element.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const allPositive = Chunk.make(1, 2, 3, 4, 5)
 * console.log(Chunk.every(allPositive, (n) => n > 0)) // true
 * console.log(Chunk.every(allPositive, (n) => n > 3)) // false
 *
 * // Empty chunk returns true
 * const empty = Chunk.empty<number>()
 * console.log(Chunk.every(empty, (n) => n > 0)) // true
 *
 * // Type refinement
 * const mixed = Chunk.make(1, 2, 3)
 * if (Chunk.every(mixed, (x): x is number => typeof x === "number")) {
 *   // mixed is now typed as Chunk<number>
 *   console.log("All elements are numbers")
 * }
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const every: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>): (self: Chunk<A>) => self is Chunk<B>
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => boolean
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): self is Chunk<B>
  <A>(self: Chunk<A>, predicate: Predicate<A>): boolean
} = dual(
  2,
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): self is Chunk<B> =>
    RA.fromIterable(self).every(refinement)
)

/**
 * Check if a predicate holds true for some `Chunk` element.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5)
 * console.log(Chunk.some(chunk, (n) => n > 4)) // true
 * console.log(Chunk.some(chunk, (n) => n > 10)) // false
 *
 * // Empty chunk returns false
 * const empty = Chunk.empty<number>()
 * console.log(Chunk.some(empty, (n) => n > 0)) // false
 *
 * // Check for specific value
 * const words = Chunk.make("apple", "banana", "cherry")
 * console.log(Chunk.some(words, (word) => word.includes("ban"))) // true
 * ```
 *
 * @category elements
 * @since 2.0.0
 */
export const some: {
  <A>(predicate: Predicate<NoInfer<A>>): (self: Chunk<A>) => self is NonEmptyChunk<A>
  <A>(self: Chunk<A>, predicate: Predicate<A>): self is NonEmptyChunk<A>
} = dual(
  2,
  <A>(self: Chunk<A>, predicate: Predicate<A>): self is NonEmptyChunk<A> => RA.fromIterable(self).some(predicate)
)

/**
 * Joins the elements together with "sep" in the middle.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make("apple", "banana", "cherry")
 * const result = Chunk.join(chunk, ", ")
 * console.log(result) // "apple, banana, cherry"
 *
 * // With different separator
 * const withPipe = Chunk.join(chunk, " | ")
 * console.log(withPipe) // "apple | banana | cherry"
 *
 * // Empty chunk
 * const empty = Chunk.empty<string>()
 * console.log(Chunk.join(empty, ", ")) // ""
 *
 * // Single element
 * const single = Chunk.make("hello")
 * console.log(Chunk.join(single, ", ")) // "hello"
 * ```
 *
 * @category folding
 * @since 2.0.0
 */
export const join: {
  (sep: string): (self: Chunk<string>) => string
  (self: Chunk<string>, sep: string): string
} = RA.join

/**
 * Reduces the elements of a chunk from left to right.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4, 5)
 * const sum = Chunk.reduce(chunk, 0, (acc, n) => acc + n)
 * console.log(sum) // 15
 *
 * // String concatenation with index
 * const words = Chunk.make("a", "b", "c")
 * const result = Chunk.reduce(words, "", (acc, word, i) => acc + `${i}:${word} `)
 * console.log(result) // "0:a 1:b 2:c "
 *
 * // Find maximum
 * const max = Chunk.reduce(chunk, -Infinity, (acc, n) => Math.max(acc, n))
 * console.log(max) // 5
 * ```
 *
 * @category folding
 * @since 2.0.0
 */
export const reduce: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Chunk<A>) => B
  <A, B>(self: Chunk<A>, b: B, f: (b: B, a: A, i: number) => B): B
} = RA.reduce

/**
 * Reduces the elements of a chunk from right to left.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk = Chunk.make(1, 2, 3, 4)
 * const result = Chunk.reduceRight(chunk, 0, (acc, n) => acc + n)
 * console.log(result) // 10
 *
 * // String building (right to left)
 * const words = Chunk.make("a", "b", "c")
 * const reversed = Chunk.reduceRight(words, "", (acc, word, i) => acc + `${i}:${word} `)
 * console.log(reversed) // "2:c 1:b 0:a "
 *
 * // Subtract from right to left
 * const subtraction = Chunk.reduceRight(chunk, 0, (acc, n) => n - acc)
 * console.log(subtraction) // -2 (4 - (3 - (2 - (1 - 0))))
 * ```
 *
 * @category folding
 * @since 2.0.0
 */
export const reduceRight: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Chunk<A>) => B
  <A, B>(self: Chunk<A>, b: B, f: (b: B, a: A, i: number) => B): B
} = RA.reduceRight

/**
 * Creates a `Chunk` of values not included in the other given `Chunk` using the provided `isEquivalent` function.
 * The order and references of result values are determined by the first `Chunk`.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk1 = Chunk.make({ id: 1, name: "Alice" }, { id: 2, name: "Bob" })
 * const chunk2 = Chunk.make({ id: 1, name: "Alice" }, { id: 3, name: "Charlie" })
 *
 * // Custom equivalence by id
 * const byId = Chunk.differenceWith<{ id: number; name: string }>((a, b) => a.id === b.id)
 * const result = byId(chunk1, chunk2)
 * console.log(Chunk.toArray(result)) // [{ id: 2, name: "Bob" }]
 *
 * // String comparison case-insensitive
 * const words1 = Chunk.make("Apple", "Banana", "Cherry")
 * const words2 = Chunk.make("apple", "grape")
 * const caseInsensitive = Chunk.differenceWith<string>((a, b) => a.toLowerCase() === b.toLowerCase())
 * const wordDiff = caseInsensitive(words1, words2)
 * console.log(Chunk.toArray(wordDiff)) // ["Banana", "Cherry"]
 * ```
 *
 * @category filtering
 * @since 3.2.0
 */
export const differenceWith = <A>(isEquivalent: (self: A, that: A) => boolean): {
  (that: Chunk<A>): (self: Chunk<A>) => Chunk<A>
  (self: Chunk<A>, that: Chunk<A>): Chunk<A>
} => {
  return dual(
    2,
    (self: Chunk<A>, that: Chunk<A>): Chunk<A> => fromArrayUnsafe(RA.differenceWith(isEquivalent)(that, self))
  )
}

/**
 * Creates a `Chunk` of values not included in the other given `Chunk`.
 * The order and references of result values are determined by the first `Chunk`.
 *
 * @example
 * ```ts
 * import { Chunk } from "effect/collections"
 *
 * const chunk1 = Chunk.make(1, 2, 3, 4, 5)
 * const chunk2 = Chunk.make(3, 4, 6, 7)
 * const result = Chunk.difference(chunk1, chunk2)
 * console.log(Chunk.toArray(result)) // [1, 2, 5]
 *
 * // String difference
 * const words1 = Chunk.make("apple", "banana", "cherry")
 * const words2 = Chunk.make("banana", "grape")
 * const wordDiff = Chunk.difference(words1, words2)
 * console.log(Chunk.toArray(wordDiff)) // ["apple", "cherry"]
 *
 * // Empty second chunk returns original
 * const empty = Chunk.empty<number>()
 * const unchanged = Chunk.difference(chunk1, empty)
 * console.log(Chunk.toArray(unchanged)) // [1, 2, 3, 4, 5]
 * ```
 *
 * @category filtering
 * @since 3.2.0
 */
export const difference: {
  <A>(that: Chunk<A>): (self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, that: Chunk<A>): Chunk<A>
} = dual(
  2,
  <A>(self: Chunk<A>, that: Chunk<A>): Chunk<A> => fromArrayUnsafe(RA.difference(that, self))
)
