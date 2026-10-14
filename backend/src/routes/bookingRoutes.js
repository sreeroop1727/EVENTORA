import { Router } from 'express'
import { cancelMyBooking, createReservation, getMyBooking, listMyBookings } from '../controllers/bookingController.js'
import { requireAuth, requireRole } from '../middleware/authenticate.js'
import { requireDatabase } from '../middleware/requireDatabase.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { bookingInputSchema } from '../validators/bookingSchemas.js'

const router = Router()

router.use(requireAuth, requireRole('user', 'organizer'), requireDatabase)
router.get('/mine', asyncHandler(listMyBookings))
router.post('/events/:eventId', validate(bookingInputSchema), asyncHandler(createReservation))
router.get('/:reference', asyncHandler(getMyBooking))
router.post('/:reference/cancel', asyncHandler(cancelMyBooking))

export default router