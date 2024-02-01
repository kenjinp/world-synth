export class MapSet<K, T> {
  #map = new Map<K, Set<T>>()
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
