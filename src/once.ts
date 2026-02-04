export function once<Args extends unknown[], Ret>(fn: (...args: Args) => Ret) {
  let result: [Ret] | undefined
  return (...args: Args) => {
    if (!result) result = [fn(...args)]
    return result[0]
  }
}
