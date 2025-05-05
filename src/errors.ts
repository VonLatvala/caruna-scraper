type Error = {
  message: string,
  name: string,
}

function isErrorWithMessageAndName(error: unknown): error is Error {
  return (
    typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      'name' in error &&
      typeof (error as Record<string, unknown>).message === 'string' &&
      typeof (error as Record<string, unknown>).name === 'string'
  )
}

export function toError(maybeError: unknown): Error {
  if (isErrorWithMessageAndName(maybeError)) return maybeError

    try {
      return new Error(JSON.stringify(maybeError))
    } catch {
      // fallback in case there's an error stringifying the maybeError
      // like with circular references for example.
      return new Error(String(maybeError))
    }
}

export function getErrorMessage(error: unknown) {
  return toError(error).message
}
