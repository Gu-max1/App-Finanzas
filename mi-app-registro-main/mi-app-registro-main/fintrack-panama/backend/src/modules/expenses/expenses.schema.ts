import { z } from 'zod';

const expenseCategoryEnum = z.enum([
  'ALIMENTACION', 'TRANSPORTE', 'SALUD', 'ENTRETENIMIENTO',
  'SERVICIOS', 'EDUCACION', 'VIVIENDA', 'ROPA', 'TECNOLOGIA', 'OTROS',
]);

const expenseTypeEnum = z.enum(['FIJO', 'VARIABLE']);

export const createExpenseSchema = z.object({
  category: expenseCategoryEnum,
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required').max(200),
  date: z.string().datetime(),
  type: expenseTypeEnum.default('VARIABLE'),
  incomeRecordId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseFiltersSchema = z.object({
  category: expenseCategoryEnum.optional(),
  type: expenseTypeEnum.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  incomeRecordId: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseFilters = z.infer<typeof expenseFiltersSchema>;
