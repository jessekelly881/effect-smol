/**
 * This module provides utilities for hashing values in TypeScript.
 *
 * Hashing is the process of converting data into a fixed-size numeric value,
 * typically used for data structures like hash tables, equality comparisons,
 * and efficient data storage.
 *
 * @since 2.0.0
 */
import { hasProperty } from "../data/Predicate.ts"
import { dual, pipe } from "../Function.ts"
import { byReferenceInstances, getAllObjectKeys } from "../internal/equal.ts"

/** @internal */
const randomHashCache = new WeakMap<any, number>()

/** @internal */
const hashCache = new WeakMap<any, number>()

/** @internal */
const visitedObjects = new WeakSet<object>()

function withVisitedTracking<T>(obj: object, fn: () => T): T {
  if (visitedObjects.has(obj)) {
    return string("[Circular]") as T
  }
  visitedObjects.add(obj)
  const result = fn()
  visitedObjects.delete(obj)
  return result
}

/**
 * The unique identifier used to identify objects that implement the Hash interface.
 *
 * @since 2.0.0
 */
export const symbol = "~effect/interfaces/Hash"

/**
 * A type that represents an object that can be hashed.
 *
 * Objects implementing this interface provide a method to compute their hash value,
 * which is used for efficient comparison and storage operations. The hash method
 * receives a HashContext that provides access to all hashing functionality.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * class MyClass implements Hash.Hash {
 *   constructor(private value: number) {}
 *
 *   [Hash.symbol](context: Hash.HashContext): number {
 *     return context.hash(this.value)
 *   }
 * }
 *
 * const instance = new MyClass(42)
 * console.log(Hash.hash(instance)) // hash value of 42
 * ```
 *
 * @category models
 * @since 2.0.0
 */
export interface Hash {
  [symbol](context: HashContext): number
}

/**
 * A context interface that provides access to all hashing functionality.
 *
 * This interface represents a service that can be used to compute hash values
 * for various types of data. It includes all the hashing functions available
 * in the Hash module, making it useful for dependency injection scenarios
 * where you need to provide hashing capabilities as a service.
 *
 * @category models
 * @since 2.0.0
 */
export interface HashContext {
  /**
   * Computes a hash value for any given value.
   */
  readonly hash: <A>(self: A) => number

  /**
   * Generates a random hash value for an object and caches it.
   */
  readonly random: <A extends object>(self: A) => number

  /**
   * Combines two hash values into a single hash value.
   */
  readonly combine: {
    (b: number): (self: number) => number
    (self: number, b: number): number
  }

  /**
   * Optimizes a hash value by applying bit manipulation techniques.
   */
  readonly optimize: (n: number) => number

  /**
   * Checks if a value implements the Hash interface.
   */
  readonly isHash: (u: unknown) => u is Hash

  /**
   * Computes a hash value for a number.
   */
  readonly number: (n: number) => number

  /**
   * Computes a hash value for a string using the djb2 algorithm.
   */
  readonly string: (str: string) => number

  /**
   * Computes a hash value for an object using only the specified keys.
   */
  readonly structureKeys: <A extends object>(o: A, keys: ReadonlyArray<keyof A>) => number

  /**
   * Computes a hash value for an object using all of its enumerable keys.
   */
  readonly structure: <A extends object>(o: A) => number

  /**
   * Computes a hash value for an array by hashing all of its elements.
   */
  readonly array: <A>(arr: Iterable<A>) => number

  /**
   * Computes a hash value for a Map by hashing all of its key-value pairs.
   */
  readonly map: <K, V>(map: Iterable<readonly [K, V]>) => number

  /**
   * Computes a hash value for a Set by hashing all of its values.
   */
  readonly set: <V>(set: Iterable<V>) => number
}

/**
 * Computes a hash value for any given value.
 *
 * This function can hash primitives (numbers, strings, booleans, etc.) as well as
 * objects, arrays, and other complex data structures. It automatically handles
 * different types and provides a consistent hash value for equivalent inputs.
 *
 * **⚠️ CRITICAL IMMUTABILITY REQUIREMENT**: Objects being hashed must be treated as
 * immutable after their first hash computation. Hash results are cached, so mutating
 * an object after hashing will lead to stale cached values and broken hash-based
 * operations. For mutable objects, use referential equality by implementing custom
 * `Hash` interface that hashes the object reference, not its content.
 *
 * **FORBIDDEN**: Modifying objects after `Hash.hash()` has been called on them
 * **ALLOWED**: Using immutable objects, or mutable objects with custom `Hash` interface
 * that uses referential equality (hashes the object reference, not content)
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * // Hash primitive values
 * console.log(Hash.hash(42)) // numeric hash
 * console.log(Hash.hash("hello")) // string hash
 * console.log(Hash.hash(true)) // boolean hash
 *
 * // Hash objects and arrays
 * console.log(Hash.hash({ name: "John", age: 30 }))
 * console.log(Hash.hash([1, 2, 3]))
 * console.log(Hash.hash(new Date("2023-01-01")))
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const hash: <A>(self: A) => number = <A>(self: A) => {
  switch (typeof self) {
    case "number":
      return number(self)
    case "bigint":
      return string(self.toString(10))
    case "boolean":
      return string(String(self))
    case "symbol":
      return string(String(self))
    case "string":
      return string(self)
    case "undefined":
      return string("undefined")
    case "function":
    case "object": {
      if (self === null) {
        return string("null")
      } else if (self instanceof Date) {
        return string(self.toISOString())
      } else if (self instanceof RegExp) {
        return string(self.toString())
      } else {
        if (byReferenceInstances.has(self)) {
          return random(self)
        }
        if (hashCache.has(self)) {
          return hashCache.get(self)!
        }
        const h = withVisitedTracking(self, () => {
          if (isHash(self)) {
            return self[symbol](hashContext)
          } else if (typeof self === "function") {
            return random(self)
          } else if (Array.isArray(self)) {
            return array(self)
          } else if (self instanceof Map) {
            return map(self)
          } else if (self instanceof Set) {
            return set(self)
          }
          return structure(self)
        })
        hashCache.set(self, h)
        return h
      }
    }
    default:
      throw new Error(
        `BUG: unhandled typeof ${typeof self} - please report an issue at https://github.com/Effect-TS/effect/issues`
      )
  }
}

/**
 * Generates a random hash value for an object and caches it.
 *
 * This function creates a random hash value for objects that don't have their own
 * hash implementation. The hash value is cached using a WeakMap, so the same object
 * will always return the same hash value during its lifetime.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * const obj1 = { a: 1 }
 * const obj2 = { a: 1 }
 *
 * // Same object always returns the same hash
 * console.log(Hash.random(obj1) === Hash.random(obj1)) // true
 *
 * // Different objects get different hashes
 * console.log(Hash.random(obj1) === Hash.random(obj2)) // false
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const random: <A extends object>(self: A) => number = (self) => {
  if (!randomHashCache.has(self)) {
    randomHashCache.set(self, number(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)))
  }
  return randomHashCache.get(self)!
}

/**
 * Combines two hash values into a single hash value.
 *
 * This function takes two hash values and combines them using a mathematical
 * operation to produce a new hash value. It's useful for creating hash values
 * of composite structures.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * const hash1 = Hash.hash("hello")
 * const hash2 = Hash.hash("world")
 *
 * // Combine two hash values
 * const combined = Hash.combine(hash2)(hash1)
 * console.log(combined) // combined hash value
 *
 * // Can also be used with pipe
 * import { pipe } from "effect"
 * const result = pipe(hash1, Hash.combine(hash2))
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const combine: {
  (b: number): (self: number) => number
  (self: number, b: number): number
} = dual(2, (self: number, b: number): number => (self * 53) ^ b)

/**
 * Optimizes a hash value by applying bit manipulation techniques.
 *
 * This function takes a hash value and applies bitwise operations to improve
 * the distribution of hash values, reducing the likelihood of collisions.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * const rawHash = 1234567890
 * const optimizedHash = Hash.optimize(rawHash)
 * console.log(optimizedHash) // optimized hash value
 *
 * // Often used internally by other hash functions
 * const stringHash = Hash.optimize(Hash.string("hello"))
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const optimize = (n: number): number => (n & 0xbfffffff) | ((n >>> 1) & 0x40000000)

/**
 * Checks if a value implements the Hash interface.
 *
 * This function determines whether a given value has the Hash symbol property,
 * indicating that it can provide its own hash value implementation.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * class MyHashable implements Hash.Hash {
 *   [Hash.symbol](context: Hash.HashContext) {
 *     return 42
 *   }
 * }
 *
 * const obj = new MyHashable()
 * console.log(Hash.isHash(obj)) // true
 * console.log(Hash.isHash({})) // false
 * console.log(Hash.isHash("string")) // false
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isHash = (u: unknown): u is Hash => hasProperty(u, symbol)

/**
 * Computes a hash value for a number.
 *
 * This function creates a hash value for numeric inputs, handling special cases
 * like NaN, Infinity, and -Infinity with distinct hash values. It uses bitwise operations to ensure good distribution
 * of hash values across different numeric inputs.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * console.log(Hash.number(42)) // hash of 42
 * console.log(Hash.number(3.14)) // hash of 3.14
 * console.log(Hash.number(NaN)) // hash of "NaN"
 * console.log(Hash.number(Infinity)) // 0 (special case)
 *
 * // Same numbers produce the same hash
 * console.log(Hash.number(100) === Hash.number(100)) // true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const number = (n: number) => {
  if (n !== n) {
    return string("NaN")
  }
  if (n === Infinity) {
    return string("Infinity")
  }
  if (n === -Infinity) {
    return string("-Infinity")
  }
  let h = n | 0
  if (h !== n) {
    h ^= n * 0xffffffff
  }
  while (n > 0xffffffff) {
    h ^= n /= 0xffffffff
  }
  return optimize(h)
}

/**
 * Computes a hash value for a string using the djb2 algorithm.
 *
 * This function implements a variation of the djb2 hash algorithm, which is
 * known for its good distribution properties and speed. It processes each
 * character of the string to produce a consistent hash value.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * console.log(Hash.string("hello")) // hash of "hello"
 * console.log(Hash.string("world")) // hash of "world"
 * console.log(Hash.string("")) // hash of empty string
 *
 * // Same strings produce the same hash
 * console.log(Hash.string("test") === Hash.string("test")) // true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const string = (str: string) => {
  let h = 5381, i = str.length
  while (i) {
    h = (h * 33) ^ str.charCodeAt(--i)
  }
  return optimize(h)
}

/**
 * Computes a hash value for an object using only the specified keys.
 *
 * This function allows you to hash an object by considering only specific keys,
 * which is useful when you want to create a hash based on a subset of an object's
 * properties.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * const person = { name: "John", age: 30, city: "New York" }
 *
 * // Hash only specific keys
 * const hash1 = Hash.structureKeys(person, ["name", "age"])
 * const hash2 = Hash.structureKeys(person, ["name", "city"])
 *
 * console.log(hash1) // hash based on name and age
 * console.log(hash2) // hash based on name and city
 *
 * // Same keys produce the same hash
 * const person2 = { name: "John", age: 30, city: "Boston" }
 * const hash3 = Hash.structureKeys(person2, ["name", "age"])
 * console.log(hash1 === hash3) // true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const structureKeys = <A extends object>(o: A, keys: ReadonlyArray<keyof A>) => {
  let h = 12289
  for (let i = 0; i < keys.length; i++) {
    h ^= pipe(hash(keys[i]!), combine(hash((o as any)[keys[i]!])))
  }
  return optimize(h)
}

/**
 * Computes a hash value for an object using all of its enumerable keys.
 *
 * This function creates a hash value based on all enumerable properties of an object.
 * It's a convenient way to hash an entire object structure when you want to consider
 * all its properties.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * const obj1 = { name: "John", age: 30 }
 * const obj2 = { name: "Jane", age: 25 }
 * const obj3 = { name: "John", age: 30 }
 *
 * console.log(Hash.structure(obj1)) // hash of obj1
 * console.log(Hash.structure(obj2)) // different hash
 * console.log(Hash.structure(obj3)) // same as obj1
 *
 * // Objects with same properties produce same hash
 * console.log(Hash.structure(obj1) === Hash.structure(obj3)) // true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const structure = <A extends object>(o: A) => {
  let h = 12289
  for (const key of getAllObjectKeys(o)) {
    h ^= pipe(hash(key), combine(hash((o as any)[key])))
  }
  return optimize(h)
}

/**
 * Computes a hash value for an array by hashing all of its elements.
 *
 * This function creates a hash value based on all elements in the array.
 * The order of elements matters, so arrays with the same elements in different
 * orders will produce different hash values.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * const arr1 = [1, 2, 3]
 * const arr2 = [1, 2, 3]
 * const arr3 = [3, 2, 1]
 *
 * console.log(Hash.array(arr1)) // hash of [1, 2, 3]
 * console.log(Hash.array(arr2)) // same hash as arr1
 * console.log(Hash.array(arr3)) // different hash (different order)
 *
 * // Arrays with same elements in same order produce same hash
 * console.log(Hash.array(arr1) === Hash.array(arr2)) // true
 * console.log(Hash.array(arr1) === Hash.array(arr3)) // false
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const array = <A>(arr: Iterable<A>) => {
  let h = 6151
  for (const value of arr) {
    h = pipe(h, combine(hash(value)))
  }
  return optimize(h)
}

/**
 * Computes a hash value for a Map by hashing all of its key-value pairs.
 *
 * This function creates a hash value based on all entries in the Map.
 * The hash combines the hashes of all keys and values. Since Map iteration
 * order is insertion order, Maps with the same entries added in the same
 * order will produce the same hash value.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * const map1 = new Map([["a", 1], ["b", 2]])
 * const map2 = new Map([["a", 1], ["b", 2]])
 * const map3 = new Map([["b", 2], ["a", 1]])
 *
 * console.log(Hash.map(map1)) // hash of map1
 * console.log(Hash.map(map2)) // same hash as map1
 * console.log(Hash.map(map3)) // potentially different hash (different insertion order)
 *
 * // Maps with same entries produce same hash
 * console.log(Hash.map(map1) === Hash.map(map2)) // true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const map = <K, V>(map: Iterable<readonly [K, V]>) => {
  let h = string("Map")
  for (const [key, value] of map) {
    h ^= combine(hash(key), hash(value))
  }
  return optimize(h)
}

/**
 * Computes a hash value for a Set by hashing all of its values.
 *
 * This function creates a hash value based on all values in the Set.
 * Since Set iteration order is insertion order, Sets with the same values
 * added in the same order will produce the same hash value.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * const set1 = new Set([1, 2, 3])
 * const set2 = new Set([1, 2, 3])
 * const set3 = new Set([3, 2, 1])
 *
 * console.log(Hash.set(set1)) // hash of set1
 * console.log(Hash.set(set2)) // same hash as set1
 * console.log(Hash.set(set3)) // potentially different hash (different insertion order)
 *
 * // Sets with same values produce same hash
 * console.log(Hash.set(set1) === Hash.set(set2)) // true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const set = <V>(set: Iterable<V>) => {
  let h = string("Set")
  for (const value of set) {
    h ^= hash(value)
  }
  return optimize(h)
}

/**
 * A default implementation of the HashContext interface.
 *
 * This constant provides a ready-to-use instance of HashContext that delegates
 * to all the hash functions available in this module. It can be used directly
 * or as a reference implementation for custom HashContext services.
 *
 * @example
 * ```ts
 * import { Hash } from "effect/interfaces"
 *
 * // Use the default hash context directly
 * const value1 = Hash.hashContext.hash("hello")
 * const value2 = Hash.hashContext.string("world")
 * const combined = Hash.hashContext.combine(value2)(value1)
 *
 * // Use it as a service implementation
 * function processData(data: unknown[], context: Hash.HashContext) {
 *   return data.map(item => context.hash(item))
 * }
 *
 * const hashes = processData(["a", "b", "c"], Hash.hashContext)
 * console.log(hashes) // array of hash values
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const hashContext: HashContext = {
  hash,
  random,
  combine,
  optimize,
  isHash,
  number,
  string,
  structureKeys,
  structure,
  array,
  map,
  set
}
