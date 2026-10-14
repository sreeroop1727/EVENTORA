import { z } from 'zod'

export const bookingInputSchema = z.object({
  ticketTypeId: z.string().regex(/^[a-f\d]{24}$/i),
  quantity: z.coerce.number().int().min(1).max(10),
}).strict()