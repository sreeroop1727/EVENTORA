import { z } from 'zod'

const ticketTypeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.coerce.number().min(0).max(10000000),
  capacity: z.coerce.number().int().min(1).max(1000000),
  salesStart: z.coerce.date().optional(),
  salesEnd: z.coerce.date().optional(),
}).strict()

export const eventInputSchema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(12000),
  category: z.string().trim().min(2).max(80),
  coverImage: z.string().trim().max(2000).optional().default(''),
  gallery: z.array(z.string().trim().max(2000)).max(12).optional().default([]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  venue: z.string().trim().min(2).max(200),
  address: z.string().trim().max(500).optional().default(''),
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().max(24).optional().default(''),
  venueLocation: z.object({
    type: z.literal('Point').default('Point'),
    coordinates: z.tuple([z.coerce.number().min(-180).max(180), z.coerce.number().min(-90).max(90)]),
  }).strict().optional(),
  ticketTypes: z.array(ticketTypeSchema).min(1).max(10),
  cancellationPolicy: z.string().trim().max(3000).optional().default(''),
}).strict().refine((event) => event.endsAt > event.startsAt, {
  message: 'The event end time must be after its start time.',
  path: ['endsAt'],
})

export const eventReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend', 'cancel']),
  reason: z.string().trim().max(2000).optional().default(''),
}).strict().refine((review) => review.action !== 'reject' || review.reason.length >= 3, {
  message: 'A reason is required when rejecting an event.',
  path: ['reason'],
})