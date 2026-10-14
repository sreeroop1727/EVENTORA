import { mongoose } from '../config/database.js'
import { AppError } from '../utils/AppError.js'

export function requireDatabase(request, response, next) {
  if (mongoose.connection.readyState !== 1) {
    return next(new AppError(503, 'Database is unavailable. Configure MONGODB_URI and ensure MongoDB is running.'))
  }
  return next()
}