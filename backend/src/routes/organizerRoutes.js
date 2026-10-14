import { Router } from 'express'
import { createDraft, submitForApproval, updateDraft } from '../controllers/eventController.js'
import { checkInAttendee, exportEventAttendees, getMyVerification, listEventAttendees, listMyEvents, submitVerification } from '../controllers/organizerController.js'
import { requireAuth, requireRole } from '../middleware/authenticate.js'
import { requireDatabase } from '../middleware/requireDatabase.js'
import { uploadVerificationDocuments } from '../middleware/privateDocuments.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { eventInputSchema } from '../validators/eventSchemas.js'
import { verificationSubmissionSchema } from '../validators/organizerSchemas.js'

const router = Router()

router.use(requireAuth, requireDatabase)
router.get('/verification', asyncHandler(getMyVerification))
router.post('/verification', uploadVerificationDocuments, validate(verificationSubmissionSchema), asyncHandler(submitVerification))
router.get('/events', asyncHandler(listMyEvents))
router.post('/events', validate(eventInputSchema), asyncHandler(createDraft))
router.patch('/events/:eventId', validate(eventInputSchema), asyncHandler(updateDraft))
router.post('/events/:eventId/submit', asyncHandler(submitForApproval))
router.get('/events/:eventId/attendees.csv', asyncHandler(exportEventAttendees))
router.get('/events/:eventId/attendees', asyncHandler(listEventAttendees))
router.post('/events/:eventId/attendees/:reference/check-in', requireRole('organizer'), asyncHandler(checkInAttendee))

export default router