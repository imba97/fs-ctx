type EffectFn = () => void
const effects = new Set<EffectFn>()

export function effect(fn: EffectFn): void {
  effects.add(fn)
  fn()
}

export function reactive<T extends object>(obj: T): T {
  return new Proxy(obj, {
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver)
      effects.forEach(fn => fn())
      return result
    },
    deleteProperty(target, key) {
      const result = Reflect.deleteProperty(target, key)
      effects.forEach(fn => fn())
      return result
    }
  })
}
