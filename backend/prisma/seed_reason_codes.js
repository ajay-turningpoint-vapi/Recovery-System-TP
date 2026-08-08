const prisma = require('../src/config/db');

async function seedReasonCodes() {
  const codes = [
    { code: 'WAITING_FOR_ARCHITECT', category: 'DELAY', label: 'Waiting for architect / client payment', description: 'Customer waiting for third party clearance' },
    { code: 'LEDGER_DISPUTE', category: 'DISPUTE', label: 'Ledger or invoice dispute', description: 'Invoice breakdown or ledger mismatch' },
    { code: 'MATERIAL_ISSUE', category: 'OPERATIONAL', label: 'Material or service issue', description: 'Quality or delivery concern' },
    { code: 'CASH_FLOW_DIFFICULTY', category: 'FINANCIAL', label: 'Temporary cash-flow difficulty', description: 'Short-term funds issue' },
    { code: 'HABITUAL_DELAY', category: 'DELAY', label: 'Habitual payment delay', description: 'Routine delay behavior' },
    { code: 'WAITING_FOR_CUSTOMER_PAYMENT', category: 'DELAY', label: 'Waiting for customer’s buyer payment', description: 'Downstream payment chain delay' },
  ];

  console.log('Seeding Reason Codes...');
  for (const item of codes) {
    await prisma.reasonCode.upsert({
      where: { code: item.code },
      update: item,
      create: item,
    });
  }
  console.log('✅ Reason Codes seeded successfully.');
  process.exit(0);
}

seedReasonCodes().catch((err) => {
  console.error(err);
  process.exit(1);
});
