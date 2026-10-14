import { Router } from 'express'
import { addWishlistEvent, changeMyPassword, listMyWishlist, removeWishlistEvent, updateMyProfile } from '../controllers/userController.js'
import { requireAuth, requireRole } from '../middleware/authenticate.js'
import { requireDatabase } from '../middleware/requireDatabase.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { passwordChangeSchema, profileUpdateSchema } from '../validators/userSchemas.js'

const router = Router()

router.use(requireAuth, requireRole('user', 'organizer'), requireDatabase)
router.patch('/me', validate(profileUpdateSchema), asyncHandler(updateMyProfile))
router.patch('/me/password', validate(passwordChangeSchema), asyncHandler(changeMyPassword))
router.get('/me/wishlist', asyncHandler(listMyWishlist))
router.post('/me/wishlist/:eventId', asyncHandler(addWishlistEvent))
router.delete('/me/wishlist/:eventId', asyncHandler(removeWishlistEvent))

export default router