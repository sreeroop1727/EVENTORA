import { z } from 'zod'

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(32).optional(),
}).strict().refine((profile) => Object.keys(profile).length > 0, {
  message: 'Provide at least one profile field to update.',
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(10).max(128),
}).strict()

export const accountStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
  reason: z.string().trim().max(1000).optional().default(''),
}).strict()