const prisma = require('../config/db');
const { fetchMssqlData } = require('./mssqlService');
const { determineInvoiceStatus } = require('../utils/calculations');

/**
 * Execute full data import pipeline from MSSQL to MariaDB
 */
async function processMssqlImport(startDate, endDate) {
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
    const fetchResult = await fetchMssqlData(startDate, endDate);
    if (fetchResult.warning) {
      warningMessage = fetchResult.warning;
    }

    const records = fetchResult.records || [];
    totalRecords = records.length;

    for (const rawRow of records) {
      try {
        // Map raw MSSQL record fields
        const vouNo = String(rawRow.VOU_NO || rawRow.VOUCHER_NO || '').trim();
        const vouDate = rawRow.VOUCHER_DATE ? new Date(rawRow.VOUCHER_DATE) : new Date();
        const partyName = String(rawRow.PARTY || rawRow.CUSTOMER || rawRow.PARTY_NAME || 'Unknown Customer').trim();
        const partyAlias = rawRow.ALIAS ? String(rawRow.ALIAS).trim() : null;
        const address = rawRow.ADDRESS ? String(rawRow.ADDRESS).trim() : 'Commercial Office';
        const city = rawRow.CITY ? String(rawRow.CITY).trim() : 'City Area';
        const state = rawRow.STATE ? String(rawRow.STATE).trim() : 'State';
        const gstin = rawRow.GSTIN ? String(rawRow.GSTIN).trim() : null;
        const mobile = rawRow.MOBILE ? String(rawRow.MOBILE).replace(/\D/g, '') : '9876543210';
        const salesmanCode = rawRow.SALESMAN ? String(rawRow.SALESMAN).trim() : 'SM-001';
        const creditLimit = parseFloat(rawRow.CREDIT_LIMIT || 100000);
        const creditDays = parseInt(rawRow.CREDIT_DAYS || 30, 10);
        
        const totalAmount = parseFloat(rawRow.TOTAL_AMOUNT || rawRow.AMOUNT || 0);

        let dueDate = rawRow.DUE_DATE ? new Date(rawRow.DUE_DATE) : null;
        if (!dueDate || isNaN(dueDate.getTime())) {
          dueDate = new Date(vouDate);
          dueDate.setDate(dueDate.getDate() + creditDays);
        }

        if (!vouNo || totalAmount <= 0) {
          failedRecords++;
          continue;
        }

        // Generate customer code from name/alias if missing
        const customerCode = partyAlias || partyName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 12);

        // 1. Upsert Customer
        let customer = await prisma.customer.findUnique({
          where: { customer_code: customerCode },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              customer_code: customerCode,
              customer_name: partyName,
              alias: partyAlias,
              address: address,
              city: city,
              state: state,
              gstin: gstin,
              mobile: mobile,
              contact_person: partyName,
              salesman_code: salesmanCode,
              credit_limit: creditLimit,
              credit_days: creditDays,
              status: 'ACTIVE',
            },
          });
        } else {
          // Update existing customer contact/credit details if changed
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              customer_name: partyName,
              address: address || customer.address,
              city: city || customer.city,
              salesman_code: salesmanCode || customer.salesman_code,
              credit_limit: creditLimit || customer.credit_limit,
              credit_days: creditDays || customer.credit_days,
            },
          });
        }

        // 2. Upsert Invoice
        const existingInvoice = await prisma.invoice.findUnique({
          where: { invoice_number: vouNo },
          include: { payments: true }
        });

        const paidAmount = existingInvoice ? existingInvoice.paid_amount : 0;
        const outstandingAmount = Math.max(0, totalAmount - paidAmount);
        const invStatus = determineInvoiceStatus(dueDate, outstandingAmount);

        if (existingInvoice) {
          await prisma.invoice.update({
            where: { id: existingInvoice.id },
            data: {
              invoice_date: vouDate,
              customer_id: customer.id,
              salesman_code: salesmanCode,
              invoice_amount: totalAmount,
              outstanding_amount: outstandingAmount,
              due_date: dueDate,
              status: invStatus,
              updated_at: new Date(),
            },
          });

          // Add invoice line item if provided
          if (rawRow.ITEM_NAME) {
            const existingItem = await prisma.invoiceItem.findFirst({
              where: { invoice_id: existingInvoice.id, item_name: String(rawRow.ITEM_NAME) }
            });
            if (!existingItem) {
              await prisma.invoiceItem.create({
                data: {
                  invoice_id: existingInvoice.id,
                  item_name: String(rawRow.ITEM_NAME),
                  hsn: rawRow.HSN ? String(rawRow.HSN) : null,
                  quantity: parseFloat(rawRow.QTY || 1),
                  rate: parseFloat(rawRow.RATE || totalAmount),
                  tax: parseFloat(rawRow.TAX || 18),
                  discount: parseFloat(rawRow.DISC || 0),
                  amount: totalAmount,
                }
              });
            }
          }

          updatedRecords++;
        } else {
          const newInv = await prisma.invoice.create({
            data: {
              invoice_number: vouNo,
              invoice_date: vouDate,
              customer_id: customer.id,
              salesman_code: salesmanCode,
              invoice_amount: totalAmount,
              paid_amount: 0,
              outstanding_amount: totalAmount,
              due_date: dueDate,
              source_voucher_code: vouNo,
              status: invStatus,
              imported_at: new Date(),
            },
          });

          if (rawRow.ITEM_NAME) {
            await prisma.invoiceItem.create({
              data: {
                invoice_id: newInv.id,
                item_name: String(rawRow.ITEM_NAME),
                hsn: rawRow.HSN ? String(rawRow.HSN) : null,
                quantity: parseFloat(rawRow.QTY || 1),
                rate: parseFloat(rawRow.RATE || totalAmount),
                tax: parseFloat(rawRow.TAX || 18),
                discount: parseFloat(rawRow.DISC || 0),
                amount: totalAmount,
              }
            });
          }

          insertedRecords++;
        }
      } catch (rowErr) {
        console.error(`Error processing row ${rawRow.VOU_NO}:`, rowErr.message);
        failedRecords++;
      }
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

    throw err;
  }
}

module.exports = {
  processMssqlImport,
};
