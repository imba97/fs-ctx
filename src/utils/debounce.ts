/**
 * Creates a debounced function that delays invoking the provided function
 * until after wait milliseconds have elapsed since the last time it was invoked.
 *
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined

  return function (this: any, ...args: Parameters<T>) {
    const later = () => {
      timeoutId = undefined
      func.apply(this, args)
    }

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(later, wait)
  }
}

/**
 * Creates a debounced function with immediate execution option.
 * If immediate is true, the function will be called immediately on the first invocation,
 * then debounced for subsequent calls.
 *
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @param immediate Whether to execute immediately on first call
 * @returns A debounced version of the function
 */
export function debounceImmediate<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined

  return function (this: any, ...args: Parameters<T>) {
    const callNow = immediate && timeoutId === undefined

    const later = () => {
      timeoutId = undefined
      if (!immediate) {
        func.apply(this, args)
      }
    }

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(later, wait)

    if (callNow) {
      func.apply(this, args)
    }
  }
}
