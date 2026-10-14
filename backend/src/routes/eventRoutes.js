import { Router } from 'express'
import { getPublicEvent, listPublicEvents } from '../controllers/eventController.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/', asyncHandler(listPublicEvents))
router.get('/:eventId', asyncHandler(getPublicEvent))

export default router