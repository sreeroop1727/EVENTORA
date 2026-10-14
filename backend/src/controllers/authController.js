import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
}

function setSession(response, user) {
  if (env.jwtSecret.length < 32) throw new AppError(503, 'Authentication is not configured on this server.')
  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { algorithm: 'HS256', expiresIn: '8h' })
  response.cookie(env.cookieName, token, cookieOptions)
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status }
}

export async function register(request, response) {
  const { name, email, password, phone } = request.body
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await User.create({ name, email, passwordHash, phone })
  setSession(response, user)
  response.status(201).json({ data: { user: publicUser(user) } })
}

export async function login(request, response) {
  const { email, password } = request.body
  const user = await User.findOne({ email }).select('+passwordHash')
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false
  if (!user || !passwordMatches || user.status !== 'active') throw new AppError(401, 'Email or password is incorrect.')
  setSession(response, user)
  response.json({ data: { user: publicUser(user) } })
}

export function logout(request, response) {
  response.clearCookie(env.cookieName, { ...cookieOptions, maxAge: undefined })
  response.status(204).end()
}

export function currentUser(request, response) {
  response.json({ data: { user: publicUser(request.user) } })
}