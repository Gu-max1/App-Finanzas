import { z } from 'zod';

export const createDebtSchema = z.object({
  creditorName: z.string().min(1).max(100),
  totalAmount: z.number().positive(),
  remainingAmount: z.number().min(0),
  interestRate: z.number().min(0).max(1, 'Interest rate must be between 0 and 1 (e.g. 0.18 for 18%)'),
  monthlyPayment: z.number().positive(),
  startDate: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const updateDebtSchema = createDebtSchema.partial().extend({
  isPaid: z.boolean().optional(),
});

export const addPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
