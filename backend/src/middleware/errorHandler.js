import { AppError } from '../utils/AppError.js'

export function notFoundHandler(request, response, next) {
  next(new AppError(404, `Route not found: ${request.method} ${request.path}`))
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error)

  const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500)
  const message = error.isOperational ? error.message : 'An unexpected server error occurred.'
  const payload = { error: { message } }

  if (error.details) payload.error.details = error.details
  if (error.name === 'ValidationError') payload.error.details = error.message
  if (error.name === 'MulterError' || error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT') {
    payload.error.message = 'The uploaded files are invalid or exceed the configured limits.'
    return response.status(400).json(payload)
  }
  if (error.name === 'CastError') console.error('MONGOOSE CAST ERROR:', error.path, error.value, error.stack)
    
if (error.name === 'CastError') {
  console.error('MONGOOSE CAST ERROR:', error.path, error.value, error.stack)
  return response.status(400).json({
    error: { message: 'A submitted identifier is invalid.' },
  })
}

   if (error.code === 11000) {
    payload.error.message = 'A record with that value already exists.'
    return response.status(409).json(payload)
  }

  if (statusCode >= 500 && !error.isOperational) console.error(error)
  return response.status(statusCode).json(payload)
}