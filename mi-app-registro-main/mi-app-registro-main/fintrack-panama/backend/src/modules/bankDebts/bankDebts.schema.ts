import { z } from 'zod';

export const debtTypeEnum = z.enum([
  'PRESTAMO_PERSONAL',
  'HIPOTECA',
  'PRESTAMO_AUTO',
  'TARJETA_CREDITO',
  'LINEA_CREDITO',
]);

const baseBankDebtSchema = z.object({
  bankAccountId: z.string().optional(),
  debtType: debtTypeEnum,
  creditorBank: z.string().min(1, 'Banco acreedor requerido').max(100),
  originalAmount: z.coerce.number().positive('Monto original positivo requerido'),
  remainingBalance: z.coerce.number().min(0),
  annualRate: z.coerce.number().min(0).max(1, 'Tasa anual como decimal (ej: 0.15 para 15%)'),
  monthlyPayment: z.coerce.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  paymentDay: z.coerce.number().int().min(1).max(31).default(1),
  notes: z.string().max(500).optional(),
});

const creditCardFields = z.object({
  creditLimit: z.coerce.number().positive().optional(),
  currentBalance: z.coerce.number().min(0).optional(),
  minimumPayment: z.coerce.number().positive().optional(),
  cutoffDay: z.coerce.number().int().min(1).max(31).optional(),
  paymentDueDay: z.coerce.number().int().min(1).max(31).optional(),
});

export const createBankDebtSchema = baseBankDebtSchema.merge(creditCardFields);

export const updateBankDebtSchema = createBankDebtSchema.partial().extend({
  isPaid: z.boolean().optional(),
});

export const addBankDebtPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentDate: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const extraPaymentSimulationSchema = z.object({
  extraMonthlyAmount: z.coerce.number().positive('Monto extra debe ser positivo'),
});

export type CreateBankDebtInput = z.infer<typeof createBankDebtSchema>;
export type UpdateBankDebtInput = z.infer<typeof updateBankDebtSchema>;
export type AddBankDebtPaymentInput = z.infer<typeof addBankDebtPaymentSchema>;
export type ExtraPaymentSimulationInput = z.infer<typeof extraPaymentSimulationSchema>;
