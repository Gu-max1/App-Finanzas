import { PrismaClient, ExpenseCategory, ExpenseType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../src/config/constants';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('Demo1234!', BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: 'demo@fintrackpanama.com' },
    update: {},
    create: {
      email: 'demo@fintrackpanama.com',
      passwordHash,
      firstName: 'Carlos',
      lastName: 'Rodríguez',
    },
  });

  console.log('✅ Demo user created:', user.email);

  // Helper: Create biweekly period
  const createPeriod = (year: number, month: number, firstHalf: boolean) => {
    const start = new Date(year, month - 1, firstHalf ? 1 : 16);
    const end = new Date(year, month - 1, firstHalf ? 15 : new Date(year, month, 0).getDate());
    return { start, end };
  };

  // Create 6 biweekly income records
  const incomeData = [
    { year: 2024, month: 1, firstHalf: true, gross: 850 },
    { year: 2024, month: 1, firstHalf: false, gross: 850 },
    { year: 2024, month: 2, firstHalf: true, gross: 850 },
    { year: 2024, month: 2, firstHalf: false, gross: 900 },
    { year: 2024, month: 3, firstHalf: true, gross: 900 },
    { year: 2024, month: 3, firstHalf: false, gross: 900 },
  ];

  const incomeRecords = [];
  for (const d of incomeData) {
    const { start, end } = createPeriod(d.year, d.month, d.firstHalf);
    const gross = d.gross;
    const css = gross * 0.0975;
    const educativo = gross * 0.0125;
    const net = gross - css - educativo;

    const record = await prisma.incomeRecord.create({
      data: {
        userId: user.id,
        periodStart: start,
        periodEnd: end,
        grossAmount: gross,
        cssDeduction: parseFloat(css.toFixed(2)),
        educativoDeduction: parseFloat(educativo.toFixed(2)),
        netAmount: parseFloat(net.toFixed(2)),
        includesIfarhu: false,
      },
    });
    incomeRecords.push(record);
  }

  console.log('✅ 6 income records created');

  // Create sample expenses
  const expenseTemplates: Array<{
    category: ExpenseCategory;
    amount: number;
    description: string;
    type: ExpenseType;
    dayOffset: number;
  }> = [
    { category: 'ALIMENTACION', amount: 120, description: 'Supermercado El Rey', type: 'FIJO', dayOffset: 2 },
    { category: 'TRANSPORTE', amount: 45, description: 'Metro y autobús', type: 'VARIABLE', dayOffset: 3 },
    { category: 'SERVICIOS', amount: 80, description: 'Cable + Internet Claro', type: 'FIJO', dayOffset: 4 },
    { category: 'SALUD', amount: 30, description: 'Farmacia Arrocha', type: 'VARIABLE', dayOffset: 5 },
    { category: 'ENTRETENIMIENTO', amount: 25, description: 'Netflix + Spotify', type: 'FIJO', dayOffset: 6 },
    { category: 'ALIMENTACION', amount: 35, description: 'Restaurante Niko', type: 'VARIABLE', dayOffset: 7 },
    { category: 'EDUCACION', amount: 60, description: 'Curso en línea Udemy', type: 'VARIABLE', dayOffset: 8 },
  ];

  for (const record of incomeRecords) {
    for (const t of expenseTemplates) {
      const expenseDate = new Date(record.periodStart);
      expenseDate.setDate(expenseDate.getDate() + t.dayOffset);

      await prisma.expense.create({
        data: {
          userId: user.id,
          incomeRecordId: record.id,
          category: t.category,
          amount: t.amount,
          description: t.description,
          type: t.type,
          date: expenseDate,
        },
      });
    }
  }

  console.log('✅ Sample expenses created');

  // Create sample debt
  const debt = await prisma.debt.create({
    data: {
      userId: user.id,
      creditorName: 'Banco General',
      totalAmount: 5000,
      remainingAmount: 3200,
      interestRate: 0.18,
      monthlyPayment: 200,
      startDate: new Date('2023-06-01'),
    },
  });

  // Create some debt payments
  for (let i = 0; i < 6; i++) {
    const paymentDate = new Date('2023-07-01');
    paymentDate.setMonth(paymentDate.getMonth() + i);
    const interest = 3200 * (0.18 / 12);
    const principal = 200 - interest;

    await prisma.debtPayment.create({
      data: {
        debtId: debt.id,
        amount: 200,
        principalPaid: parseFloat(principal.toFixed(2)),
        interestPaid: parseFloat(interest.toFixed(2)),
        paymentDate,
      },
    });
  }

  console.log('✅ Debt and payments created');

  // Create savings goals
  await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      name: 'Fondo de emergencia',
      targetAmount: 3000,
      currentAmount: 750,
      targetDate: new Date('2024-12-31'),
      isPrimary: true,
    },
  });

  await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      name: 'Vacaciones en Colombia',
      targetAmount: 1500,
      currentAmount: 300,
      targetDate: new Date('2024-08-15'),
    },
  });

  console.log('✅ Savings goals created');
  console.log('🎉 Seed completed successfully!');
  console.log('\nDemo credentials:');
  console.log('  Email: demo@fintrackpanama.com');
  console.log('  Password: Demo1234!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
