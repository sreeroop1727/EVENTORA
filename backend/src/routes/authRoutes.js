import { Router } from 'express'
import { currentUser, login, logout, register } from '../controllers/authController.js'
import { requireAuth } from '../middleware/authenticate.js'
import { requireDatabase } from '../middleware/requireDatabase.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { loginSchema, registerSchema } from '../validators/authSchemas.js'

const router = Router()

router.post('/register', validate(registerSchema), requireDatabase, asyncHandler(register))
router.post('/login', validate(loginSchema), requireDatabase, asyncHandler(login))
router.post('/logout', logout)
router.get('/me', requireAuth, currentUser)

export default router