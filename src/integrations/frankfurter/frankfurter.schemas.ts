import { z } from 'zod';

export const rateRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  base: z.string(),
  quote: z.string(),
  rate: z.number().positive(),
});

export const ratesResponseSchema = z.array(rateRowSchema);

export type RatesResponse = z.infer<typeof ratesResponseSchema>;
