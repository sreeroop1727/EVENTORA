import { z } from 'zod'

export const verificationSubmissionSchema = z.object({
  organizationName: z.string().trim().min(2).max(160),
  description: z.string().trim().min(20).max(3000),
  contactPhone: z.string().trim().min(7).max(32),
}).strict()

export const organizerReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'request-info', 'suspend']),
  reason: z.string().trim().max(2000).optional().default(''),
}).strict().refine((review) => !['reject', 'request-info'].includes(review.action) || review.reason.length >= 3, {
  message: 'A reason is required for rejection or an information request.',
  path: ['reason'],
})