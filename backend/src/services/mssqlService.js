const sql = require('mssql');
const prisma = require('../config/db');

/**
 * Real Busy ERP outstanding balance query with enriched fields:
 * City, State, Email, WhatsApp, Salesman Name — pulled from MASTER1 & MASTERADDRESSINFO
 */
const REAL_ERP_OUTSTANDING_SQL = `
SELECT
  M1.NAME                                         AS PARTY_NAME,
  M1.I2                                           AS CREDIT_DAYS,
  M1.D1                                           AS CREDITLIMIT,
  ISNULL(MAI.Address1, '')                        AS ADDRESS,
  ISNULL(MAI.Address2, '')                        AS ADDRESS2,
  ISNULL(MAI.Address3, '')                        AS ADDRESS3,
  ISNULL(MAI.Mobile, '')                          AS MOBILE,
  ISNULL(MAI.WhatsAppNo, '')                      AS WHATSAPP_NO,
  ISNULL(MAI.Email, '')                           AS EMAIL,
  ISNULL(MAI.GSTNo, '')                           AS GSTIN,
  -- Use Address2 as city when CityCode is the generic '---Others---' (303)
  CASE
    WHEN CITY_M.NAME IS NOT NULL AND CITY_M.NAME != '---Others---'
    THEN CITY_M.NAME
    WHEN MAI.Address2 != '' THEN MAI.Address2
    ELSE ''
  END                                             AS CITY,
  ISNULL(STATE_M.NAME, '')                        AS STATE,
  ISNULL(SM.NAME, 'UNASSIGNED')                   AS SALESMAN,
  ABS(
    ISNULL(F.D1,0)
    + (F.D23+F.D24+F.D25+F.D26+F.D27+F.D28+F.D29+F.D30+F.D31+F.D32+F.D33+F.D34)
    - (F.D11+F.D12+F.D13+F.D14+F.D15+F.D16+F.D17+F.D18+F.D19+F.D20+F.D21+F.D22)
  )                                               AS CLOSING_BALANCE
FROM MASTER1 M1
LEFT JOIN MASTERADDRESSINFO MAI
       ON M1.CODE = MAI.MASTERCODE
LEFT JOIN MASTER1 STATE_M
       ON STATE_M.CODE = MAI.StateCodeLong AND STATE_M.MASTERTYPE = 56
LEFT JOIN MASTER1 CITY_M
       ON CITY_M.CODE = MAI.CityCodeLong  AND CITY_M.MASTERTYPE = 57
LEFT JOIN MASTER1 SM
       ON SM.CODE = CAST(NULLIF(MAI.OF2, '') AS INT)
LEFT JOIN Folio1 F
       ON F.MASTERCODE = M1.CODE
WHERE M1.MASTERTYPE = 2
  AND M1.parentgrp IN (574140, 574141, 258335, 577533)
  AND (
    ISNULL(F.D1,0)
    + (F.D23+F.D24+F.D25+F.D26+F.D27+F.D28+F.D29+F.D30+F.D31+F.D32+F.D33+F.D34)
    - (F.D11+F.D12+F.D13+F.D14+F.D15+F.D16+F.D17+F.D18+F.D19+F.D20+F.D21+F.D22)
  ) < 0
`;

/**
 * Real Busy ERP invoice line items query — fetches sales vouchers with item details.
 * Uses Tran1 (voucher header) + Tran2 RecType=2 (stock items) + MASTER1 (item names).
 * 
 * Filters by date range: @startdate@ to @enddate@
 */
const REAL_ERP_INVOICE_SQL = `
SELECT
  LTRIM(RTRIM(T1.VchNo))            AS VOU_NO,
  CONVERT(VARCHAR, T1.Date, 23)     AS VOUCHER_DATE,
  M_PARTY.NAME                      AS PARTY_NAME,
  ISNULL(MAI.Mobile, '')            AS MOBILE,
  ISNULL(MAI.WhatsAppNo, '')        AS WHATSAPP_NO,
  ISNULL(MAI.Email, '')             AS EMAIL,
  ISNULL(MAI.GSTNo, '')             AS GSTIN,
  ISNULL(MAI.Address1, '')          AS ADDRESS,
  ISNULL(MAI.Address2, '')          AS ADDRESS2,
  CASE
    WHEN CITY_M.NAME IS NOT NULL AND CITY_M.NAME != '---Others---'
    THEN CITY_M.NAME
    WHEN MAI.Address2 != '' THEN MAI.Address2
    ELSE ''
  END                               AS CITY,
  ISNULL(STATE_M.NAME, '')          AS STATE,
  ISNULL(SM.NAME, 'UNASSIGNED')     AS SALESMAN,
  M_ITEM.NAME                       AS ITEM_NAME,
  ABS(T2.Value1)                    AS QTY,
  ABS(T2.D2)                        AS RATE,
  ABS(T2.D1)                        AS DISC,
  ABS(T2.Value1 * T2.D2)            AS TOTAL_AMOUNT,
  M1_PARTY.I2                       AS CREDIT_DAYS,
  M1_PARTY.D1                       AS CREDITLIMIT,
  DATEADD(DAY, ISNULL(M1_PARTY.I2, 30), T1.Date) AS DUE_DATE
FROM Tran1 T1
JOIN MASTER1 M_PARTY
     ON M_PARTY.CODE = T1.MasterCode1
     AND M_PARTY.MASTERTYPE = 2
     AND M_PARTY.parentgrp IN (574140, 574141, 258335, 577533)
JOIN MASTER1 M1_PARTY
     ON M1_PARTY.CODE = T1.MasterCode1
JOIN Tran2 T2
     ON T2.VchCode = T1.VchCode AND T2.RecType = 2
JOIN MASTER1 M_ITEM
     ON M_ITEM.CODE = T2.MasterCode1 AND M_ITEM.MASTERTYPE = 6
LEFT JOIN MASTERADDRESSINFO MAI
       ON MAI.MASTERCODE = T1.MasterCode1
LEFT JOIN MASTER1 STATE_M
       ON STATE_M.CODE = MAI.StateCodeLong AND STATE_M.MASTERTYPE = 56
LEFT JOIN MASTER1 CITY_M
       ON CITY_M.CODE = MAI.CityCodeLong AND CITY_M.MASTERTYPE = 57
LEFT JOIN MASTER1 SM
       ON SM.CODE = CAST(NULLIF(MAI.OF2, '') AS INT)
WHERE T1.VchType IN (9, 14, 15)
  AND T1.Date >= '@startdate@'
  AND T1.Date <= '@enddate@'
ORDER BY T1.Date DESC
`;

/**
 * Fetch active MSSQL config from Database or fallback to .env
 */
async function getMssqlConfig() {
  let dbConfig = await prisma.mssqlConfig.findFirst({ where: { id: 1 } });

  const envServer = process.env.DB_SERVER || process.env.MSSQL_SERVER || 'localhost';
  const envPort = parseInt(process.env.DB_PORT || process.env.MSSQL_PORT || '1433', 10);
  const envDb = process.env.DB_DATABASE || process.env.MSSQL_DATABASE || 'BUSY_ERP_DB';
  const envUser = process.env.DB_USER || process.env.MSSQL_USER || 'sa';
  const envPass = process.env.DB_PASSWORD || process.env.MSSQL_PASSWORD || '';
  const envEncrypt = (process.env.DB_ENCRYPT || process.env.MSSQL_ENCRYPT) === 'true';
  const envTrust = (process.env.DB_TRUST_SERVER_CERTIFICATE || process.env.MSSQL_TRUST_SERVER_CERTIFICATE) !== 'false';

  if (!dbConfig) {
    dbConfig = {
      host: envServer,
      port: envPort,
      database_name: envDb,
      username: envUser,
      password_encrypted: envPass,
      encrypt: envEncrypt,
      trust_server_certificate: envTrust,
      import_sql: REAL_ERP_OUTSTANDING_SQL,
    };
  }

  // If stored SQL is still the old placeholder or empty, replace with real query
  if (!dbConfig.import_sql || dbConfig.import_sql.includes('FROM VOUCHERS') || dbConfig.import_sql.trim().length < 50) {
    dbConfig.import_sql = REAL_ERP_OUTSTANDING_SQL;
  }

  return dbConfig;
}

/**
 * Bulk ERP Query: Fetch Pending Bills across ALL Customers via TRAN3 Bill References
 */
const REAL_ERP_ALL_PENDING_BILLS_SQL = `
SELECT
    B.RefCode,
    B.VchType,
    B.Date AS BILL_DATE,
    B.DueDate AS DUE_DATE,
    ABS(B.BillAmount) AS REF_AMOUNT,
    ABS(B.BillAmount) - ISNULL(A.AdjAmount,0) AS PENDING_AMOUNT,
    B.BILL_NO,
    B.MasterCode1,
    M.Name AS PARTY_NAME,
    ISNULL(MA.Mobile, '') AS MOBILE,
    ISNULL(MA.WhatsAppNo, '') AS WHATSAPP_NO,
    ISNULL(MA.Email, '') AS EMAIL,
    ISNULL(MA.GSTNo, '') AS GSTIN,
    ISNULL(MA.Address1, '') AS ADDRESS,
    CASE
      WHEN CITY_M.NAME IS NOT NULL AND CITY_M.NAME != '---Others---' THEN CITY_M.NAME
      WHEN MA.Address2 != '' THEN MA.Address2
      ELSE ''
    END AS CITY,
    ISNULL(STATE_M.NAME, '') AS STATE,
    ISNULL(SM.Name, 'UNASSIGNED') AS SALESMAN,
    M.I2 AS CR_DAYS,
    M.D1 AS CR_LIMIT,
    DATEDIFF(DAY, B.DueDate, GETDATE()) AS DUE_DAYS,
    CASE
        WHEN DATEDIFF(DAY, B.DueDate, GETDATE()) > M.I2
             THEN 'EXCEEDED CREDIT DAYS'
        ELSE 'WITHIN CREDIT DAYS'
    END AS MESSAGE
FROM
(
    SELECT RefCode, Date, DueDate, LTRIM(RTRIM(No)) AS BILL_NO, No, MasterCode1, VchType, Value1 AS BillAmount
    FROM TRAN3
    WHERE Method = 1 AND Type = 1 AND VchType IN (1, 9)
) B
LEFT JOIN
(
    SELECT RefCode, SUM(ABS(Value1)) AS AdjAmount
    FROM TRAN3
    WHERE Method = 2 AND Type = 2
    GROUP BY RefCode
) A ON B.RefCode = A.RefCode
INNER JOIN MASTER1 M ON M.Code = B.MasterCode1
LEFT JOIN MASTERADDRESSINFO MA ON MA.MASTERCODE = M.CODE
LEFT JOIN MASTER1 STATE_M ON STATE_M.CODE = MA.StateCodeLong AND STATE_M.MASTERTYPE = 56
LEFT JOIN MASTER1 CITY_M ON CITY_M.CODE = MA.CityCodeLong AND CITY_M.MASTERTYPE = 57
LEFT JOIN MASTER1 SM ON SM.CODE = CAST(NULLIF(MA.OF2, '') AS INT)
WHERE M.MasterType = 2
  AND M.ParentGrp IN (574140, 574141, 258335, 577533)
  AND (ABS(B.BillAmount) - ISNULL(A.AdjAmount,0)) > 0
ORDER BY B.DueDate ASC
`;

/**
 * Executes MSSQL query with dynamic @startdate@ and @enddate@ values.
 * Mode: 'outstanding' (default) | 'invoices'
 */
async function fetchMssqlData(startDate, endDate, mode = 'outstanding') {
  const config = await getMssqlConfig();

  // Select verified ERP query based on mode
  let baseQuery = mode === 'invoices' ? REAL_ERP_INVOICE_SQL : REAL_ERP_ALL_PENDING_BILLS_SQL;

  // Substitute query dates
  const sqlQuery = baseQuery
    .replace(/@startdate@/g, startDate || '2020-01-01')
    .replace(/@enddate@/g, endDate || new Date().toISOString().split('T')[0]);

  const serverHost = config.host || process.env.DB_SERVER || 'localhost';
  const serverPort = parseInt(config.port || process.env.DB_PORT || '1433', 10);

  const mssqlConnectionConfig = {
    user: config.username || process.env.DB_USER,
    password: config.password_encrypted || process.env.DB_PASSWORD,
    server: serverHost,
    port: serverPort,
    database: config.database_name || process.env.DB_DATABASE,
    options: {
      encrypt: config.encrypt ?? (process.env.DB_ENCRYPT === 'true'),
      trustServerCertificate: config.trust_server_certificate ?? true,
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    },
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '120000', 10),
  };

  try {
    console.log(`Connecting to MSSQL at ${serverHost}:${serverPort}/${config.database_name} [mode: ${mode}]...`);
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

    const sampleRows = generateMockMssqlPayload(startDate, endDate, mode);
    return {
      success: true,
      records: sampleRows,
      isMock: true,
      warning: `MSSQL server (${serverHost}) could not be reached directly (${err.message}). Sample data used to verify import pipeline.`
    };
  }
}

/**
 * Generates sample records matching standard ERP VOUCHER schemas
 */
function generateMockMssqlPayload(startDate, endDate, mode = 'outstanding') {
  const mockPartyList = [
    { name: 'Acme Traders Ltd', alias: 'ACME', city: 'Vapi', state: 'Gujarat', gstin: '24AAAAA0000A1Z5', mobile: '9876543210', whatsapp: '919876543210', email: 'acme@example.com', salesman: 'ASHVINI', credit_limit: 500100, credit_days: 30 },
    { name: 'Apex Logistics Pvt Ltd', alias: 'APEX', city: 'Surat', state: 'Gujarat', gstin: '24BBBBB1111B1Z2', mobile: '9820011223', whatsapp: '919820011223', email: '', salesman: 'JIGNESH', credit_limit: 300000, credit_days: 15 },
    { name: 'Bharat Hardware & Co', alias: 'BHARAT', city: 'Vapi', state: 'Gujarat', gstin: '24CCCCC2222C1Z8', mobile: '9988776655', whatsapp: '919988776655', email: 'bharat@example.com', salesman: 'PATRAKAR', credit_limit: 250010, credit_days: 30 },
    { name: 'Zenith Electronics', alias: 'ZENITH', city: 'Surat', state: 'Gujarat', gstin: '24DDDDD3333D1Z4', mobile: '9123456789', whatsapp: '919123456789', email: '', salesman: 'HAMEER', credit_limit: 400000, credit_days: 45 },
    { name: 'Global Industrial Supplies', alias: 'GLOBAL', city: 'Daman', state: 'Dadra And Nagar Haveli & Daman & DIU', gstin: '25EEEEE4444E1Z1', mobile: '9898989898', whatsapp: '919898989898', email: 'global@example.com', salesman: 'SAGAR', credit_limit: 600000, credit_days: 30 },
  ];

  const mockItems = [
    { name: 'Industrial Valve 2-Inch', hsn: '8481', qty: 10, rate: 2500, tax: 18, disc: 5 },
    { name: 'Heavy Duty Bearing 6205', hsn: '8482', qty: 25, rate: 450, tax: 18, disc: 0 },
    { name: 'Stainless Steel Fasteners', hsn: '7318', qty: 100, rate: 35, tax: 18, disc: 2 },
    { name: 'Hydraulic Cylinder Pack', hsn: '8412', qty: 2, rate: 12000, tax: 18, disc: 10 },
  ];

  const rows = [];
  const start = new Date(startDate || '2026-01-01');
  const end = new Date(endDate || new Date().toISOString().split('T')[0]);
  let idx = 2001;

  if (mode === 'outstanding') {
    // Outstanding balance mode — one record per customer
    return mockPartyList.map((party, i) => ({
      PARTY_NAME: party.name,
      CREDIT_DAYS: party.credit_days,
      CREDITLIMIT: party.credit_limit,
      ADDRESS: `${100 + i} Commercial Enclave`,
      MOBILE: party.mobile,
      WHATSAPP_NO: party.whatsapp,
      EMAIL: party.email,
      GSTIN: party.gstin,
      CITY: party.city,
      STATE: party.state,
      SALESMAN: party.salesman,
      CLOSING_BALANCE: (party.credit_limit * 0.4).toFixed(0),
    }));
  }

  // Invoice line items mode
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
    const party = mockPartyList[idx % mockPartyList.length];
    const item = mockItems[idx % mockItems.length];
    const invDate = new Date(d).toISOString().split('T')[0];
    const dueDateObj = new Date(d);
    dueDateObj.setDate(dueDateObj.getDate() + party.credit_days);
    const dueDate = dueDateObj.toISOString().split('T')[0];
    const baseAmount = item.qty * item.rate;
    const discAmount = (baseAmount * item.disc) / 100;
    const totalAmount = baseAmount - discAmount;

    rows.push({
      VOU_NO: `TVSRC/${idx}/26-27`,
      VOUCHER_DATE: invDate,
      PARTY_NAME: party.name,
      MOBILE: party.mobile,
      WHATSAPP_NO: party.whatsapp,
      EMAIL: party.email,
      GSTIN: party.gstin,
      ADDRESS: `${idx} Commercial Enclave, Industrial Zone`,
      CITY: party.city,
      STATE: party.state,
      SALESMAN: party.salesman,
      ITEM_NAME: item.name,
      QTY: item.qty,
      RATE: item.rate,
      DISC: item.disc,
      TOTAL_AMOUNT: Math.round(totalAmount),
      CREDIT_DAYS: party.credit_days,
      CREDITLIMIT: party.credit_limit,
      DUE_DATE: dueDate,
    });
    idx++;
  }

  return rows;
}

/**
 * Tested ERP Query 1: Fetch Pending Bills via TRAN3 Bill References (Method=1 vs Method=2)
 */
const REAL_ERP_PENDING_BILLS_SQL = `
SELECT
    B.RefCode,
    B.VchType,
    B.Date AS BILL_DATE,
    B.DueDate AS DUE_DATE,
    ABS(B.BillAmount) AS REF_AMOUNT,
    ABS(B.BillAmount) - ISNULL(A.AdjAmount,0) AS PENDING_AMOUNT,
    B.BILL_NO,
    B.MasterCode1,
    M.Name AS PARTY_NAME,
    ISNULL(MA.Mobile, '') AS MOBILE,
    ISNULL(MA.WhatsAppNo, '') AS WHATSAPP_NO,
    ISNULL(MA.Email, '') AS EMAIL,
    ISNULL(MA.GSTNo, '') AS GSTIN,
    ISNULL(MA.Address1, '') AS ADDRESS,
    CASE
      WHEN CITY_M.NAME IS NOT NULL AND CITY_M.NAME != '---Others---' THEN CITY_M.NAME
      WHEN MA.Address2 != '' THEN MA.Address2
      ELSE ''
    END AS CITY,
    ISNULL(STATE_M.NAME, '') AS STATE,
    ISNULL(SM.Name, 'UNASSIGNED') AS SALESMAN,
    M.I2 AS CR_DAYS,
    M.D1 AS CR_LIMIT,
    DATEDIFF(DAY, B.DueDate, GETDATE()) AS DUE_DAYS,
    CASE
        WHEN DATEDIFF(DAY, B.DueDate, GETDATE()) > M.I2
             THEN 'EXCEEDED CREDIT DAYS'
        ELSE 'WITHIN CREDIT DAYS'
    END AS MESSAGE
FROM
(
    SELECT RefCode, Date, DueDate, LTRIM(RTRIM(No)) AS BILL_NO, No, MasterCode1, VchType, Value1 AS BillAmount
    FROM TRAN3
    WHERE Method = 1 AND Type = 1 AND VchType IN (1, 9)
) B
LEFT JOIN
(
    SELECT RefCode, SUM(ABS(Value1)) AS AdjAmount
    FROM TRAN3
    WHERE Method = 2 AND Type = 2
    GROUP BY RefCode
) A ON B.RefCode = A.RefCode
INNER JOIN MASTER1 M ON M.Code = B.MasterCode1
LEFT JOIN MASTERADDRESSINFO MA ON MA.MASTERCODE = M.CODE
LEFT JOIN MASTER1 STATE_M ON STATE_M.CODE = MA.StateCodeLong AND STATE_M.MASTERTYPE = 56
LEFT JOIN MASTER1 CITY_M ON CITY_M.CODE = MA.CityCodeLong AND CITY_M.MASTERTYPE = 57
LEFT JOIN MASTER1 SM ON SM.CODE = CAST(NULLIF(MA.OF2, '') AS INT)
WHERE M.MasterType = 2
  AND M.ParentGrp IN (574140, 574141, 258335, 577533)
  AND M.Name = '@customerName@'
  AND (ABS(B.BillAmount) - ISNULL(A.AdjAmount,0)) > 0
ORDER BY B.DueDate ASC
`;

const REAL_ERP_PENDING_BILL_ITEMS_SQL = `
SELECT
    P.NAME AS PARTY_NAME,
    LTRIM(RTRIM(R.NO)) AS BILL_NO,
    R.DATE AS BILL_DATE,
    R.DUEDATE AS DUE_DATE,
    I.NAME AS ITEM_NAME,
    I.ALIAS,
    ISNULL(U.NAME, 'PCS') AS UNIT,
    ABS(T.D1) AS QTY,
    T.D2 AS RATE,
    T.D9 AS DISCOUNT,
    T.D5 AS AMOUNT,
    T.D18 AS MRP
FROM
(
    SELECT B.RefCode, B.No, B.Date, B.DueDate, B.MasterCode1
    FROM
    (
        SELECT RefCode, No, Date, DueDate, MasterCode1, Value1 AS BillAmount
        FROM TRAN3
        WHERE Method = 1 AND Type = 1 AND VchType = 9
    ) B
    LEFT JOIN
    (
        SELECT RefCode, SUM(ABS(Value1)) AS AdjAmount
        FROM TRAN3
        WHERE Method = 2 AND Type = 2
        GROUP BY RefCode
    ) A ON B.RefCode = A.RefCode
    WHERE (ABS(B.BillAmount) - ISNULL(A.AdjAmount, 0)) > 0
) R
INNER JOIN TRAN2 T ON LTRIM(RTRIM(T.VCHNO)) = LTRIM(RTRIM(R.NO)) AND T.VCHTYPE = 9
INNER JOIN MASTER1 I ON I.CODE = T.MASTERCODE1 AND I.MASTERTYPE = 6
INNER JOIN MASTER1 P ON P.CODE = T.CM1 AND P.MASTERTYPE = 2
LEFT JOIN MASTER1 U ON U.CODE = T.CM2
WHERE P.NAME = '@customerName@'
ORDER BY R.DATE, R.NO, T.SRNO
`;

/**
 * Execute Query 1: Fetch Pending Bills directly from Busy MSSQL
 */
async function queryPendingBills(customerName) {
  const mssqlConfig = await getMssqlConfig();
  const config = {
    user: mssqlConfig.username || mssqlConfig.user || process.env.DB_USER || 'sa',
    password: mssqlConfig.password_encrypted || mssqlConfig.password || process.env.DB_PASSWORD || '',
    server: mssqlConfig.host || mssqlConfig.server || process.env.DB_SERVER || 'localhost',
    port: mssqlConfig.port || parseInt(process.env.DB_PORT || '1433', 10),
    database: mssqlConfig.database_name || mssqlConfig.database || process.env.DB_DATABASE || 'BUSY_ERP_DB',
    options: { encrypt: mssqlConfig.encrypt, trustServerCertificate: mssqlConfig.trust_server_certificate !== false },
    connectionTimeout: 30000,
    requestTimeout: 60000,
  };

  const formattedSql = REAL_ERP_PENDING_BILLS_SQL.replace(/@customerName@/g, customerName);

  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(formattedSql);
    await pool.close();
    return { success: true, records: result.recordset };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Execute Query 2: Fetch Line Item Breakdown for Pending Bills from Busy MSSQL
 */
async function queryPendingBillItems(customerName) {
  const mssqlConfig = await getMssqlConfig();
  const config = {
    user: mssqlConfig.username || mssqlConfig.user || process.env.DB_USER || 'sa',
    password: mssqlConfig.password_encrypted || mssqlConfig.password || process.env.DB_PASSWORD || '',
    server: mssqlConfig.host || mssqlConfig.server || process.env.DB_SERVER || 'localhost',
    port: mssqlConfig.port || parseInt(process.env.DB_PORT || '1433', 10),
    database: mssqlConfig.database_name || mssqlConfig.database || process.env.DB_DATABASE || 'BUSY_ERP_DB',
    options: { encrypt: mssqlConfig.encrypt, trustServerCertificate: mssqlConfig.trust_server_certificate !== false },
    connectionTimeout: 30000,
    requestTimeout: 60000,
  };

  const formattedSql = REAL_ERP_PENDING_BILL_ITEMS_SQL.replace(/@customerName@/g, customerName);

  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(formattedSql);
    await pool.close();
    return { success: true, records: result.recordset };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Legacy/General query for customer invoice items
 */
async function queryCustomerInvoiceItems(customerName, startDate = '2024-01-01', endDate = '2026-12-31') {
  return queryPendingBillItems(customerName);
}

module.exports = {
  getMssqlConfig,
  fetchMssqlData,
  queryCustomerInvoiceItems,
  queryPendingBills,
  queryPendingBillItems,
  REAL_ERP_OUTSTANDING_SQL,
  REAL_ERP_INVOICE_SQL,
  REAL_ERP_PENDING_BILLS_SQL,
  REAL_ERP_PENDING_BILL_ITEMS_SQL,
};
