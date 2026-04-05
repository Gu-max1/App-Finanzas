import { z } from 'zod';

export const createIncomeSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  grossAmount: z.number().positive('Gross amount must be positive'),
  includesIfarhu: z.boolean().default(false),
  otherDeductions: z.number().min(0).default(0),
  notes: z.string().max(500).optional(),
});

export const updateIncomeSchema = createIncomeSchema.partial();

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
