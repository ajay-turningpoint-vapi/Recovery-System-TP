const sql = require('mssql');
const prisma = require('../config/db');

/**
 * Fetch active MSSQL config from Database or fallback to .env
 */
async function getMssqlConfig() {
  let dbConfig = await prisma.mssqlConfig.findFirst({ where: { id: 1 } });

  if (!dbConfig) {
    dbConfig = {
      host: process.env.MSSQL_SERVER || 'localhost',
      port: parseInt(process.env.MSSQL_PORT || '1433', 10),
      database_name: process.env.MSSQL_DATABASE || 'BUSY_ERP_DB',
      username: process.env.MSSQL_USER || 'sa',
      password_encrypted: process.env.MSSQL_PASSWORD || '',
      encrypt: process.env.MSSQL_ENCRYPT === 'true',
      trust_server_certificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE === 'true',
      import_sql: `SELECT VOU_NO, VOUCHER_DATE, PARTY, ALIAS, ADDRESS, CITY, STATE, GSTIN, MOBILE, SALESMAN, ITEM_NAME, HSN, QTY, RATE, TAX, DISC, TOTAL_AMOUNT, DUE_DATE FROM VOUCHERS WHERE VOUCHER_DATE >= @startdate@ AND VOUCHER_DATE <= @enddate@`
    };
  }

  return dbConfig;
}

/**
 * Executes MSSQL query with dynamic @startdate@ and @enddate@ values
 */
async function fetchMssqlData(startDate, endDate) {
  const config = await getMssqlConfig();

  // Substitute query dates
  const sqlQuery = config.import_sql
    .replace(/@startdate@/g, `'${startDate}'`)
    .replace(/@enddate@/g, `'${endDate}'`);

  const mssqlConnectionConfig = {
    user: config.username,
    password: config.password_encrypted,
    server: config.host,
    port: config.port,
    database: config.database_name,
    options: {
      encrypt: config.encrypt,
      trustServerCertificate: config.trust_server_certificate,
    },
    connectionTimeout: 10000,
    requestTimeout: 30000,
  };

  try {
    // Attempt actual MSSQL connection
    console.log(`Connecting to MSSQL at ${config.host}:${config.port}/${config.database_name}...`);
    const pool = await sql.connect(mssqlConnectionConfig);
    const result = await pool.request().query(sqlQuery);
    await pool.close();

    return {
      success: true,
      records: result.recordset || [],
      isMock: false
    };
  } catch (err) {
    console.warn('MSSQL Server direct connection unavailable or failed:', err.message);
    console.log('Using simulated ERP import payload for validation & import verification.');

    // Mock/Demo payload structured according to typical MSSQL source query output
    const sampleRows = generateMockMssqlPayload(startDate, endDate);
    return {
      success: true,
      records: sampleRows,
      isMock: true,
      warning: `MSSQL server (${config.host}) could not be reached directly (${err.message}). Sample data used to verify import pipeline.`
    };
  }
}

/**
 * Generates sample records matching standard ERP VOUCHER schemas
 */
function generateMockMssqlPayload(startDate, endDate) {
  const mockPartyList = [
    { name: 'Acme Traders Ltd', alias: 'ACME', city: 'Mumbai', state: 'Maharashtra', gstin: '27AAAAA0000A1Z5', mobile: '9876543210', salesman: 'SM-001', credit_limit: 500100, credit_days: 30 },
    { name: 'Apex Logistics Pvt Ltd', alias: 'APEX', city: 'Delhi', state: 'Delhi', gstin: '07BBBBB1111B1Z2', mobile: '9820011223', salesman: 'SM-001', credit_limit: 300000, credit_days: 15 },
    { name: 'Bharat Hardware & Co', alias: 'BHARAT', city: 'Pune', state: 'Maharashtra', gstin: '27CCCCC2222C1Z8', mobile: '9988776655', salesman: 'SM-002', credit_limit: 250010, credit_days: 30 },
    { name: 'Zenith Electronics', alias: 'ZENITH', city: 'Bengaluru', state: 'Karnataka', gstin: '29DDDDD3333D1Z4', mobile: '9123456789', salesman: 'SM-002', credit_limit: 400000, credit_days: 45 },
    { name: 'Global Industrial Supplies', alias: 'GLOBAL', city: 'Ahmedabad', state: 'Gujarat', gstin: '24EEEEE4444E1Z1', mobile: '9898989898', salesman: 'SM-003', credit_limit: 600000, credit_days: 30 },
  ];

  const mockItems = [
    { name: 'Industrial Valve 2-Inch', hsn: '8481', qty: 10, rate: 2500, tax: 18, disc: 5 },
    { name: 'Heavy Duty Bearing 6205', hsn: '8482', qty: 25, rate: 450, tax: 18, disc: 0 },
    { name: 'Stainless Steel Fasteners', hsn: '7318', qty: 100, rate: 35, tax: 18, disc: 2 },
    { name: 'Hydraulic Cylinder Pack', hsn: '8412', qty: 2, rate: 12000, tax: 18, disc: 10 },
  ];

  const rows = [];
  const start = new Date(startDate || '2026-06-01');
  const end = new Date(endDate || '2026-08-01');
  let currentInvoiceIndex = 2001;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 5)) {
    const party = mockPartyList[(currentInvoiceIndex) % mockPartyList.length];
    const item = mockItems[(currentInvoiceIndex) % mockItems.length];
    const invDate = new Date(d).toISOString().split('T')[0];

    // Due date based on credit days
    const dueDateObj = new Date(d);
    dueDateObj.setDate(dueDateObj.getDate() + party.credit_days);
    const dueDate = dueDateObj.toISOString().split('T')[0];

    const baseAmount = item.qty * item.rate;
    const discAmount = (baseAmount * item.disc) / 100;
    const taxAmount = ((baseAmount - discAmount) * item.tax) / 100;
    const totalAmount = baseAmount - discAmount + taxAmount;

    rows.push({
      VOU_NO: `INV-${currentInvoiceIndex}`,
      VOUCHER_DATE: invDate,
      PARTY: party.name,
      ALIAS: party.alias,
      ADDRESS: `${currentInvoiceIndex} Commercial Enclave, Industrial Zone`,
      CITY: party.city,
      STATE: party.state,
      GSTIN: party.gstin,
      MOBILE: party.mobile,
      SALESMAN: party.salesman,
      CREDIT_LIMIT: party.credit_limit,
      CREDIT_DAYS: party.credit_days,
      ITEM_NAME: item.name,
      HSN: item.hsn,
      QTY: item.qty,
      RATE: item.rate,
      TAX: item.tax,
      DISC: item.disc,
      TOTAL_AMOUNT: Math.round(totalAmount),
      DUE_DATE: dueDate
    });

    currentInvoiceIndex++;
  }

  return rows;
}

module.exports = {
  getMssqlConfig,
  fetchMssqlData
};
