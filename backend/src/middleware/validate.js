import { rm } from 'node:fs/promises'
import { AppError } from '../utils/AppError.js'

export function validate(schema, source = 'body') {
  return async function validateRequest(request, response, next) {
    const result = schema.safeParse(request[source])
    if (!result.success) {
      if (Array.isArray(request.files)) {
        await Promise.allSettled(request.files.map((file) => rm(file.path, { force: true })))
      }
      return next(new AppError(400, 'Please check the submitted fields.', result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))))
    }
    request[source] = result.data
    return next()
  }
}