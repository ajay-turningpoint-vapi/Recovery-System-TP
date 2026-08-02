const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Payment Collection Management System database...');

  // 1. Create Users (Admin & Salesmen)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const salesmanPassword = await bcrypt.hash('salesman123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password_hash: adminPassword,
      name: 'System Admin',
      role: 'ADMIN',
      mobile: '9800000000',
      email: 'admin@recoverytp.com',
      status: 'ACTIVE',
    },
  });

  const salesman1 = await prisma.user.upsert({
    where: { username: 'salesman1' },
    update: {},
    create: {
      username: 'salesman1',
      password_hash: salesmanPassword,
      name: 'Rajesh Kumar',
      role: 'SALESMAN',
      salesman_code: 'SM-001',
      mobile: '9876543210',
      email: 'rajesh.kumar@recoverytp.com',
      status: 'ACTIVE',
    },
  });

  const salesman2 = await prisma.user.upsert({
    where: { username: 'salesman2' },
    update: {},
    create: {
      username: 'salesman2',
      password_hash: salesmanPassword,
      name: 'Amit Sharma',
      role: 'SALESMAN',
      salesman_code: 'SM-002',
      mobile: '9820011223',
      email: 'amit.sharma@recoverytp.com',
      status: 'ACTIVE',
    },
  });

  console.log('Users created: admin, salesman1, salesman2');

  // 2. Create Customers
  const customersData = [
    {
      customer_code: 'CUST-101',
      customer_name: 'Acme Enterprises Ltd',
      alias: 'ACME',
      address: 'Plot 45, MIDC Industrial Area, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      gstin: '27AAAAA1234A1Z5',
      contact_person: 'Suresh Patel',
      mobile: '9876543210',
      alternate_mobile: '9876543211',
      email: 'suresh@acme.com',
      salesman_code: 'SM-001',
      credit_limit: 500100,
      credit_days: 30,
      status: 'ACTIVE',
    },
    {
      customer_code: 'CUST-102',
      customer_name: 'Apex Logistics & Freight',
      alias: 'APEX',
      address: 'Suite 204, Connaught Place Building',
      city: 'Delhi',
      state: 'Delhi',
      gstin: '07BBBBB5678B1Z2',
      contact_person: 'Vikram Singh',
      mobile: '9820011223',
      alternate_mobile: '9820011224',
      email: 'vikram@apexlogistics.in',
      salesman_code: 'SM-001',
      credit_limit: 350010,
      credit_days: 15,
      status: 'ACTIVE',
    },
    {
      customer_code: 'CUST-103',
      customer_name: 'Bharat Hardware Components',
      alias: 'BHARAT',
      address: '78 GIDC Estate Phase 2',
      city: 'Pune',
      state: 'Maharashtra',
      gstin: '27CCCCC9012C1Z8',
      contact_person: 'Ramesh Mehta',
      mobile: '9988776655',
      email: 'ramesh@bharathardware.com',
      salesman_code: 'SM-002',
      credit_limit: 250010,
      credit_days: 30,
      status: 'ACTIVE',
    },
    {
      customer_code: 'CUST-104',
      customer_name: 'Zenith Electronics Solutions',
      alias: 'ZENITH',
      address: '12 Electronic City Phase 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      gstin: '29DDDDD3456D1Z4',
      contact_person: 'Ankit Rao',
      mobile: '9123456789',
      email: 'ankit@zenithelec.com',
      salesman_code: 'SM-002',
      credit_limit: 450010,
      credit_days: 45,
      status: 'ACTIVE',
    },
    {
      customer_code: 'CUST-105',
      customer_name: 'Global Industrial Supplies',
      alias: 'GLOBAL',
      address: 'Ring Road Industrial Complex',
      city: 'Ahmedabad',
      state: 'Gujarat',
      gstin: '24EEEEE7890E1Z1',
      contact_person: 'Pankaj Shah',
      mobile: '9898989898',
      email: 'pankaj@globalsupplies.co.in',
      salesman_code: 'SM-001',
      credit_limit: 600000,
      credit_days: 30,
      status: 'ACTIVE',
    },
  ];

  const createdCustomers = [];
  for (const cData of customersData) {
    const cust = await prisma.customer.upsert({
      where: { customer_code: cData.customer_code },
      update: cData,
      create: cData,
    });
    createdCustomers.push(cust);
  }

  console.log(`Created ${createdCustomers.length} customers.`);

  // 3. Create Invoices & Line Items
  const today = new Date();

  // Date calculation helpers
  const pastDays = (d) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - d);
    return dt;
  };

  const futureDays = (d) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    return dt;
  };

  const invoicesData = [
    // Customer 1 (Acme) - SM-001
    {
      invoice_number: 'INV-2026-001',
      invoice_date: pastDays(45),
      customer_id: createdCustomers[0].id,
      salesman_code: 'SM-001',
      invoice_amount: 125001,
      paid_amount: 25001,
      outstanding_amount: 100000,
      due_date: pastDays(15), // 15 Days Overdue
      status: 'Overdue',
      source_voucher_code: 'VOU-1001',
      items: [
        { item_name: 'Heavy Duty Steel Valves', hsn: '8481', quantity: 20, rate: 5001, tax: 18, discount: 5, amount: 100000 },
        { item_name: 'Pressure Gauges 10 Bar', hsn: '9026', quantity: 10, rate: 2500, tax: 18, discount: 0, amount: 25001 },
      ]
    },
    {
      invoice_number: 'INV-2026-002',
      invoice_date: pastDays(10),
      customer_id: createdCustomers[0].id,
      salesman_code: 'SM-001',
      invoice_amount: 75001,
      paid_amount: 0,
      outstanding_amount: 75001,
      due_date: today, // Due Today
      status: 'Due Today',
      source_voucher_code: 'VOU-1002',
      items: [
        { item_name: 'Hydraulic Cylinder Pack', hsn: '8412', quantity: 5, rate: 15001, tax: 18, discount: 0, amount: 75001 },
      ]
    },
    {
      invoice_number: 'INV-2026-003',
      invoice_date: pastDays(5),
      customer_id: createdCustomers[0].id,
      salesman_code: 'SM-001',
      invoice_amount: 50010,
      paid_amount: 0,
      outstanding_amount: 50010,
      due_date: futureDays(25), // Not Due
      status: 'Not Due',
      source_voucher_code: 'VOU-1003',
      items: [
        { item_name: 'Stainless Steel Fasteners Set', hsn: '7318', quantity: 100, rate: 500, tax: 18, discount: 0, amount: 50010 },
      ]
    },

    // Customer 2 (Apex) - SM-001
    {
      invoice_number: 'INV-2026-004',
      invoice_date: pastDays(60),
      customer_id: createdCustomers[1].id,
      salesman_code: 'SM-001',
      invoice_amount: 180000,
      paid_amount: 50010,
      outstanding_amount: 130000,
      due_date: pastDays(45), // 45 Days Overdue
      status: 'Overdue',
      source_voucher_code: 'VOU-1004',
      items: [
        { item_name: 'Logistics Tracking Sensors', hsn: '8526', quantity: 30, rate: 6000, tax: 18, discount: 10, amount: 180000 },
      ]
    },

    // Customer 3 (Bharat) - SM-002
    {
      invoice_number: 'INV-2026-005',
      invoice_date: pastDays(75),
      customer_id: createdCustomers[2].id,
      salesman_code: 'SM-002',
      invoice_amount: 210000,
      paid_amount: 0,
      outstanding_amount: 210000,
      due_date: pastDays(45), // 45 Days Overdue
      status: 'Overdue',
      source_voucher_code: 'VOU-1005',
      items: [
        { item_name: 'CNC Milling Cutters', hsn: '8207', quantity: 50, rate: 4200, tax: 18, discount: 0, amount: 210000 },
      ]
    },

    // Customer 4 (Zenith) - SM-002
    {
      invoice_number: 'INV-2026-006',
      invoice_date: pastDays(15),
      customer_id: createdCustomers[3].id,
      salesman_code: 'SM-002',
      invoice_amount: 95001,
      paid_amount: 95001,
      outstanding_amount: 0,
      due_date: futureDays(30),
      status: 'Paid',
      source_voucher_code: 'VOU-1006',
      items: [
        { item_name: 'Microcontroller Boards', hsn: '8542', quantity: 100, rate: 950, tax: 18, discount: 0, amount: 95001 },
      ]
    },
  ];

  for (const invData of invoicesData) {
    const items = invData.items;
    delete invData.items;

    const invoice = await prisma.invoice.upsert({
      where: { invoice_number: invData.invoice_number },
      update: invData,
      create: invData,
    });

    for (const item of items) {
      await prisma.invoiceItem.create({
        data: {
          invoice_id: invoice.id,
          ...item,
        }
      });
    }
  }

  console.log('Invoices and line items created.');

  // 4. Create Followups
  const inv1 = await prisma.invoice.findUnique({ where: { invoice_number: 'INV-2026-001' } });
  const inv4 = await prisma.invoice.findUnique({ where: { invoice_number: 'INV-2026-004' } });

  await prisma.followup.createMany({
    data: [
      {
        customer_id: createdCustomers[0].id,
        invoice_id: inv1?.id,
        salesman_code: 'SM-001',
        followup_date: pastDays(2),
        followup_time: '11:30 AM',
        followup_type: 'Phone Call',
        status: 'Payment Promised',
        expected_payment_date: futureDays(3),
        expected_payment_amount: 50010,
        promise_to_pay_date: futureDays(3),
        promise_to_pay_amount: 50010,
        remark: 'Spoke with Mr. Suresh. Promised to release ₹50,000 via NEFT by this Friday.',
        next_followup_date: futureDays(3),
        next_followup_time: '02:00 PM',
        priority: 'High',
        created_by: salesman1.id,
      },
      {
        customer_id: createdCustomers[1].id,
        invoice_id: inv4?.id,
        salesman_code: 'SM-001',
        followup_date: today,
        followup_time: '10:00 AM',
        followup_type: 'WhatsApp',
        status: 'Pending',
        remark: 'Sent payment reminder on WhatsApp for overdue invoice INV-2026-004.',
        next_followup_date: today,
        next_followup_time: '04:00 PM',
        priority: 'Urgent',
        created_by: salesman1.id,
      },
      {
        customer_id: createdCustomers[2].id,
        salesman_code: 'SM-002',
        followup_date: pastDays(5),
        followup_time: '03:00 PM',
        followup_type: 'Visit',
        status: 'Dispute',
        remark: 'Visited factory. Customer requested 5% additional discount on older batch.',
        next_followup_date: futureDays(2),
        next_followup_time: '11:00 AM',
        priority: 'Medium',
        created_by: salesman2.id,
      }
    ]
  });

  console.log('Follow-ups logged.');

  // 5. Create Payments
  if (inv1) {
    await prisma.payment.create({
      data: {
        customer_id: createdCustomers[0].id,
        invoice_id: inv1.id,
        payment_date: pastDays(10),
        amount: 25001,
        payment_mode: 'NEFT',
        reference_number: 'UTR998877661122',
        bank: 'HDFC Bank',
        remark: 'Part payment for INV-2026-001',
        created_by: salesman1.id,
      }
    });
  }

  // 6. WhatsApp default templates
  const templates = [
    {
      name: 'PAYMENT_REMINDER',
      content: `Dear {CustomerName},\n\nThis is a reminder regarding your outstanding payment of ₹{OutstandingAmount}.\n\nKindly arrange the payment at the earliest.\n\nRegards,\n{SalesmanName}`,
      is_default: true,
    },
    {
      name: 'PAYMENT_DUE',
      content: `Dear {CustomerName},\n\nYour payment of ₹{OutstandingAmount} is due.\n\nKindly arrange the payment as per the agreed terms.\n\nRegards,\n{SalesmanName}`,
      is_default: true,
    },
    {
      name: 'PAYMENT_COMMITMENT',
      content: `Dear {CustomerName},\n\nThank you for your commitment to pay ₹{PromisedAmount} on {PromisedDate}.\n\nPlease let us know if you need any assistance.\n\nRegards,\n{SalesmanName}`,
      is_default: true,
    },
    {
      name: 'INVOICE_BREAKDOWN',
      content: `Dear {CustomerName},\n\nHere are the details of your outstanding invoices:\n\n{InvoiceList}\n\nTotal Outstanding: ₹{OutstandingAmount}\n\nKindly process the payment at your earliest convenience.\n\nRegards,\n{SalesmanName}`,
      is_default: true,
    }
  ];

  for (const t of templates) {
    await prisma.whatsappTemplate.upsert({
      where: { name: t.name },
      update: { content: t.content },
      create: t,
    });
  }

  // 7. MSSQL Default Config
  await prisma.mssqlConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      host: 'localhost',
      port: 1433,
      database_name: 'BUSY_ERP_DB',
      username: 'sa',
      password_encrypted: 'ERPSecretPass123',
      encrypt: false,
      trust_server_certificate: true,
      import_sql: `SELECT VOU_NO, VOUCHER_DATE, PARTY, ALIAS, ADDRESS, CITY, STATE, GSTIN, MOBILE, SALESMAN, ITEM_NAME, HSN, QTY, RATE, TAX, DISC, TOTAL_AMOUNT, DUE_DATE FROM VOUCHERS WHERE VOUCHER_DATE >= @startdate@ AND VOUCHER_DATE <= @enddate@`,
    }
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
