import { z } from 'zod';

export const createSavingsGoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  targetDate: z.string().datetime(),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

export const updateSavingsGoalSchema = createSavingsGoalSchema.partial().extend({
  isCompleted: z.boolean().optional(),
});

export const addContributionSchema = z.object({
  amount: z.number().positive(),
  date: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>;
export type AddContributionInput = z.infer<typeof addContributionSchema>;
