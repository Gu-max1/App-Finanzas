import { z } from 'zod';

const PANAMA_BANKS = [
  'Banistmo', 'BAC Credomatic', 'Banco General', 'Global Bank',
  'Multibank', 'Scotiabank', 'Caja de Ahorros', 'Banco Nacional de Panamá',
  'Credicorp Bank', 'Banco Aliado', 'Metrobank', 'Otro',
] as const;

export const createBankAccountSchema = z.object({
  bankName: z.string().min(1, 'Nombre del banco requerido').max(100),
  accountType: z.enum(['CORRIENTE', 'AHORROS', 'INVERSION']),
  balance: z.coerce.number().min(0, 'El saldo no puede ser negativo').default(0),
  currency: z.string().length(3).default('USD'),
  alias: z.string().max(80).optional(),
  isPrimary: z.boolean().default(false),
});

export const updateBankAccountSchema = createBankAccountSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const updateBalanceSchema = z.object({
  balance: z.coerce.number().min(0, 'El saldo no puede ser negativo'),
  notes: z.string().max(200).optional(),
});

export const SUGGESTED_BANKS = PANAMA_BANKS;

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
export type UpdateBalanceInput = z.infer<typeof updateBalanceSchema>;
