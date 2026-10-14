import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const requireAuth = asyncHandler(async (request, response, next) => {
  const token = request.cookies[env.cookieName]
  if (!token) throw new AppError(401, 'Please sign in to continue.')
  if (env.jwtSecret.length < 32) throw new AppError(503, 'Authentication is not configured on this server.')

  let session
  try {
    session = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] })
  } catch {
    throw new AppError(401, 'Your session has expired. Please sign in again.')
  }

  const user = await User.findById(session.sub).select('_id name email role status phone wishlist')
  if (!user || user.status !== 'active') throw new AppError(401, 'This account cannot access the platform.')
  request.user = user
  return next()
})

export function requireRole(...roles) {
  return function authorizeRole(request, response, next) {
    if (!request.user) return next(new AppError(401, 'Please sign in to continue.'))
    if (!roles.includes(request.user.role)) return next(new AppError(403, 'You do not have permission to perform this action.'))
    return next()
  }
}