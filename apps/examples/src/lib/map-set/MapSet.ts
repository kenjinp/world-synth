function isIterable(obj: any) {
  // checks for null and undefined
  if (obj == null) {
    return false
  }
  return typeof obj[Symbol.iterator] === "function"
}

export class MapSet<K, T> {
  #map = new Map<K, Set<T>>()
  constructor(mapSet?: MapSet<K, T>) {
    if (mapSet && isIterable(mapSet.entries)) {
      for (const [key, value] of mapSet.entries) {
        this.#map.set(key, new Set(value))
      }
    }
  }
  add(key: K, value: T) {
    if (!this.#map.has(key)) {
      this.#map.set(key, new Set())
    }
    this.#map.get(key)?.add(value)
  }
  get(key: K) {
    return this.#map.get(key)
  }
  get size() {
    return this.#map.size
  }
  get keys() {
    return this.#map.keys()
  }
  get values() {
    return this.#map.values()
  }
  get entries() {
    return this.#map.entries()
  }
}

export const findInSet = <T>(set: Set<T>, predicate: (value: T) => boolean) => {
  for (const value of set) {
    if (predicate(value)) {
      return value
    }
  }
  return undefined
}

export const findAllInSet = <T>(
  set: Set<T>,
  predicate: (value: T) => boolean,
) => {
  const found = []
  for (const value of set) {
    if (predicate(value)) {
      found.push(value)
    }
  }
  return found
}
