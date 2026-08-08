const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { fetchMssqlData } = require('./mssqlService');
const { determineInvoiceStatus } = require('../utils/calculations');

/**
 * Execute full data import pipeline from MSSQL ERP to MariaDB.
 * Source of Truth: Busy ERP (MSSQL)
 * 
 * Imports exact bill-by-bill pending references (TRAN3 + TRAN2 + MASTER1)
 * directly into MariaDB customers, invoices, and invoice_items.
 */
async function processMssqlImport(startDate, endDate, mode = 'outstanding') {
  const log = await prisma.importLog.create({
    data: {
      started_at: new Date(),
      status: 'RUNNING',
    },
  });

  let totalRecords = 0;
  let insertedRecords = 0;
  let updatedRecords = 0;
  let failedRecords = 0;
  let errorMessage = null;
  let warningMessage = null;

  try {
    const fetchResult = await fetchMssqlData(startDate, endDate, mode);
    if (fetchResult.warning) {
      warningMessage = fetchResult.warning;
    }

    const records = fetchResult.records || [];
    totalRecords = records.length;

    const defaultPasswordHash = await bcrypt.hash('salesman123', 10);
    const salesmanCache = new Set();

    // ── STEP 1: ERP PENDING BILLS & CUSTOMERS (TRAN3) ─────────────────────────
    for (const rawRow of records) {
      try {
        await processOutstandingRow(rawRow, defaultPasswordHash, salesmanCache);
        insertedRecords++;
      } catch (rowErr) {
        console.error(`Error processing pending bill row:`, rowErr.message);
        failedRecords++;
      }
    }

    // ── STEP 2: ERP INVOICE LINE ITEMS (TRAN2) ───────────────────────────────
    try {
      console.log('Fetching invoice line items from Busy ERP MSSQL...');
      const itemsFetchResult = await fetchMssqlData(startDate, endDate, 'invoices');
      const itemRecords = itemsFetchResult.records || [];

      const invoiceMap = new Map();
      for (const rawRow of itemRecords) {
        const vouNo = String(rawRow.VOU_NO || rawRow.BILL_NO || '').trim();
        if (!vouNo) continue;

        if (!invoiceMap.has(vouNo)) {
          invoiceMap.set(vouNo, []);
        }
        if (rawRow.ITEM_NAME) {
          invoiceMap.get(vouNo).push({
            item_name: String(rawRow.ITEM_NAME).trim(),
            quantity: parseFloat(rawRow.QTY || 0),
            rate: parseFloat(rawRow.RATE || 0),
            discount: parseFloat(rawRow.DISC || rawRow.DISCOUNT || 0),
            amount: parseFloat(rawRow.TOTAL_AMOUNT || rawRow.AMOUNT || 0),
          });
        }
      }

      for (const [vouNo, items] of invoiceMap.entries()) {
        try {
          await processInvoiceItemsOnly(vouNo, items);
        } catch (itemErr) {
          console.error(`Error attaching invoice items for ${vouNo}:`, itemErr.message);
        }
      }
      console.log(`Successfully attached line items for ${invoiceMap.size} vouchers.`);
    } catch (itemsErr) {
      console.error('Error syncing invoice line items:', itemsErr.message);
    }

    const finalStatus = failedRecords === totalRecords && totalRecords > 0 ? 'FAILED' : 'SUCCESS';

    const updatedLog = await prisma.importLog.update({
      where: { id: log.id },
      data: {
        completed_at: new Date(),
        total_records: totalRecords,
        inserted_records: insertedRecords,
        updated_records: updatedRecords,
        failed_records: failedRecords,
        status: finalStatus,
        error_message: errorMessage || warningMessage,
      },
    });

    return {
      success: true,
      log: updatedLog,
      warning: warningMessage
    };
  } catch (err) {
    console.error('Import pipeline failed:', err);
    await prisma.importLog.update({
      where: { id: log.id },
      data: {
        completed_at: new Date(),
        status: 'FAILED',
        error_message: err.message,
      },
    });
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Atomic helper: Upsert Salesman user in MariaDB
 */
async function upsertSalesman(salesmanCode, salesmanPhone, defaultPasswordHash, salesmanCache) {
  if (!salesmanCode || salesmanCode === 'UNASSIGNED') return;

  const cleanCode = salesmanCode.trim().toUpperCase();
  if (salesmanCache.has(cleanCode)) return;

  // Extract phone number from salesman code/name if available (e.g. CHAMPALAL (8769694915))
  let extractedPhone = salesmanPhone;
  const match = cleanCode.match(/\d{10}/);
  if (match) {
    extractedPhone = match[0];
  }

  const cleanName = cleanCode.replace(/\(\s*\d+\s*\)/g, '').trim();
  const username = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!username) return;

  await prisma.user.upsert({
    where: { username },
    create: {
      username,
      password_hash: defaultPasswordHash,
      name: cleanName,
      role: 'SALESMAN',
      salesman_code: cleanCode,
      mobile: extractedPhone || null,
      status: 'ACTIVE',
    },
    update: {
      name: cleanName,
      salesman_code: cleanCode,
      ...(extractedPhone ? { mobile: extractedPhone } : {}),
    },
  });

  salesmanCache.add(cleanCode);
}

/**
 * Atomic helper: Upsert Customer in MariaDB
 */
async function upsertCustomer(customerCode, data) {
  const {
    partyName, partyAlias, address, city, state, gstin, email,
    mobile, alternate_mobile, salesmanCode, creditLimit, creditDays,
  } = data;

  return await prisma.customer.upsert({
    where: { customer_code: customerCode },
    create: {
      customer_code: customerCode,
      customer_name: partyName,
      alias: partyAlias || null,
      address: address || null,
      city: city || null,
      state: state || null,
      gstin: gstin || null,
      contact_person: partyName,
      mobile: mobile || null,
      alternate_mobile: alternate_mobile || null,
      email: email || null,
      salesman_code: salesmanCode !== 'UNASSIGNED' ? salesmanCode : null,
      credit_limit: creditLimit,
      credit_days: creditDays,
      status: 'ACTIVE',
    },
    update: {
      customer_name: partyName,
      alias: partyAlias || null,
      address: address || null,
      city: city || null,
      state: state || null,
      gstin: gstin || null,
      mobile: mobile || null,
      alternate_mobile: alternate_mobile || null,
      email: email || null,
      ...(salesmanCode !== 'UNASSIGNED' ? { salesman_code: salesmanCode } : {}),
      credit_limit: creditLimit,
      credit_days: creditDays,
    },
  });
}

/**
 * Process a row from ERP pending bills query (TRAN3 Method=1 pending references)
 */
async function processOutstandingRow(rawRow, defaultPasswordHash, salesmanCache) {
  const partyName    = String(rawRow.PARTY_NAME || rawRow.Name || '').trim();
  const partyAlias   = rawRow.ALIAS ? String(rawRow.ALIAS).trim() : null;
  const salesmanCode = String(rawRow.SALESMAN || 'UNASSIGNED').trim().toUpperCase();
  const mobile       = rawRow.MOBILE ? String(rawRow.MOBILE).trim() : null;
  const whatsappNo   = rawRow.WHATSAPP_NO ? String(rawRow.WHATSAPP_NO).trim() : null;
  const email        = rawRow.EMAIL ? String(rawRow.EMAIL).trim() : null;
  const gstin        = rawRow.GSTIN ? String(rawRow.GSTIN).trim() : null;
  const address      = rawRow.ADDRESS ? String(rawRow.ADDRESS).trim() : null;
  const city         = rawRow.CITY ? String(rawRow.CITY).trim() : null;
  const state        = rawRow.STATE ? String(rawRow.STATE).trim() : null;

  const creditLimit  = parseFloat(rawRow.CREDITLIMIT || rawRow.CR_LIMIT || 0);
  const creditDays   = parseInt(rawRow.CREDIT_DAYS || rawRow.CR_DAYS || 30, 10);

  const pendingAmount = parseFloat(rawRow.PENDING_AMOUNT || rawRow.CLOSING_BALANCE || 0);
  const originalAmount = parseFloat(rawRow.REF_AMOUNT || pendingAmount);
  
  if (!partyName || pendingAmount <= 0) return;

  const customerCode = partyAlias || partyName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 15);

  // 1. Upsert Salesman
  await upsertSalesman(salesmanCode, null, defaultPasswordHash, salesmanCache);

  // 2. Upsert Customer
  const alternate_mobile = whatsappNo !== mobile ? whatsappNo : null;
  const customer = await upsertCustomer(customerCode, {
    partyName, partyAlias, address, city, state, gstin, email,
    mobile, alternate_mobile, salesmanCode, creditLimit, creditDays,
  });

  // 3. Upsert Bill Voucher directly from ERP TRAN3
  const vouNo = String(rawRow.BILL_NO || rawRow.BILL_NUMBER || rawRow.VOU_NO || `BILL-${customerCode}`).trim();
  const vouDate = rawRow.BILL_DATE ? new Date(rawRow.BILL_DATE) : new Date();
  const dueDate = rawRow.DUE_DATE ? new Date(rawRow.DUE_DATE) : new Date(Date.now() + creditDays * 86400000);
  const invStatus = determineInvoiceStatus(dueDate, pendingAmount);

  await prisma.invoice.upsert({
    where: { invoice_number: vouNo },
    create: {
      invoice_number: vouNo,
      invoice_date: vouDate,
      customer_id: customer.id,
      salesman_code: salesmanCode !== 'UNASSIGNED' ? salesmanCode : null,
      invoice_amount: originalAmount,
      paid_amount: Math.max(0, originalAmount - pendingAmount),
      outstanding_amount: pendingAmount,
      due_date: dueDate,
      source_voucher_code: vouNo,
      status: invStatus,
    },
    update: {
      invoice_date: vouDate,
      customer_id: customer.id,
      salesman_code: salesmanCode !== 'UNASSIGNED' ? salesmanCode : null,
      invoice_amount: originalAmount,
      outstanding_amount: pendingAmount,
      due_date: dueDate,
      status: invStatus,
    },
  });
}

/**
 * Attach line items from TRAN2 to existing pending bill invoices
 */
async function processInvoiceItemsOnly(vouNo, items) {
  if (!items || items.length === 0) return;

  const cleanVouNo = String(vouNo || '').trim();
  if (!cleanVouNo) return;

  // Find matching invoice in DB
  const invoice = await prisma.invoice.findUnique({
    where: { invoice_number: cleanVouNo },
  });

  if (!invoice) return; // Skip if voucher isn't an active pending bill

  // Replace items idempotently
  await prisma.invoiceItem.deleteMany({
    where: { invoice_id: invoice.id },
  });

  await prisma.invoiceItem.createMany({
    data: items.map(item => ({
      invoice_id: invoice.id,
      item_name: item.item_name,
      quantity: item.quantity,
      rate: item.rate,
      discount: item.discount,
      amount: item.amount,
    })),
  });
}

module.exports = {
  processMssqlImport,
};
