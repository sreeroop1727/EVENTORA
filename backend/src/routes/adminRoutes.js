import { Router } from 'express'
import { changeUserStatus, getAdminOverview, getAuditLogs, getVerificationDetails, downloadVerificationDocument, listPendingEvents, listUsers, listVerificationQueue, reviewEvent, reviewOrganizer } from '../controllers/adminController.js'
import { requireAuth, requireRole } from '../middleware/authenticate.js'
import { requireDatabase } from '../middleware/requireDatabase.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { organizerReviewSchema } from '../validators/organizerSchemas.js'
import { eventReviewSchema } from '../validators/eventSchemas.js'
import { accountStatusSchema } from '../validators/userSchemas.js'

const router = Router()

router.use(requireAuth, requireRole('admin'), requireDatabase)
router.get('/overview', asyncHandler(getAdminOverview))
router.get('/users', asyncHandler(listUsers))
router.patch('/users/:userId/status', validate(accountStatusSchema), asyncHandler(changeUserStatus))
router.get('/organizers/verification', asyncHandler(listVerificationQueue))
router.get('/organizers/verification/:profileId', asyncHandler(getVerificationDetails))
router.get('/organizers/verification/:profileId/documents/:storageName', asyncHandler(downloadVerificationDocument))
router.patch('/organizers/verification/:profileId', validate(organizerReviewSchema), asyncHandler(reviewOrganizer))
router.get('/events/pending', asyncHandler(listPendingEvents))
router.patch('/events/:eventId/review', validate(eventReviewSchema), asyncHandler(reviewEvent))
router.get('/audit-logs', asyncHandler(getAuditLogs))

export default router