const PROHIBITED_KEY_PATTERN = /^\$|\./

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]"

const sanitizeObject = (target) => {
  if (Array.isArray(target)) {
    target.forEach((entry) => sanitizeObject(entry))
    return target
  }

  if (!isPlainObject(target)) {
    return target
  }

  Object.keys(target).forEach((key) => {
    if (PROHIBITED_KEY_PATTERN.test(key)) {
      delete target[key]
      return
    }

    sanitizeObject(target[key])
  })

  return target
}

const assignSanitizedValue = (req, key, value) => {
  if (key === "query") {
    Object.defineProperty(req, key, {
      value,
      configurable: true,
      enumerable: true,
      writable: true
    })
    return
  }

  req[key] = value
}

export const mongoSanitizeMiddleware = (req, _res, next) => {
  ;["body", "params", "headers", "query"].forEach((key) => {
    const currentValue = req[key]
    if (!currentValue) {
      return
    }

    const sanitizedValue = sanitizeObject(currentValue)
    assignSanitizedValue(req, key, sanitizedValue)
  })

  next()
}

export default mongoSanitizeMiddleware
