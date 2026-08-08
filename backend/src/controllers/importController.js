const prisma = require('../config/db');
const { processMssqlImport } = require('../services/importService');
const { getMssqlConfig } = require('../services/mssqlService');

async function triggerMssqlImport(req, res, next) {
  try {
    const { startDate, endDate, mode = 'outstanding' } = req.body;

    const start = startDate || '2026-06-01';
    const end = endDate || new Date().toISOString().split('T')[0];

    const validModes = ['outstanding', 'invoices'];
    const importMode = validModes.includes(mode) ? mode : 'outstanding';

    const result = await processMssqlImport(start, end, importMode);

    res.json({
      success: true,
      message: `MSSQL Import (${importMode} mode) completed successfully`,
      log: result.log,
      warning: result.warning,
    });
  } catch (err) {
    next(err);
  }
}

async function getImportHistory(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [total, logs] = await Promise.all([
      prisma.importLog.count(),
      prisma.importLog.findMany({
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { started_at: 'desc' },
      })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        totalRecords: total,
        totalPages: Math.ceil(total / limitNum) || 1,
        currentPage: pageNum,
        limit: limitNum,
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getConfig(req, res, next) {
  try {
    const config = await getMssqlConfig();
    // Mask password in response for UI security
    res.json({
      success: true,
      config: {
        ...config,
        password_encrypted: '••••••••',
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updateConfig(req, res, next) {
  try {
    const {
      host,
      port,
      database_name,
      username,
      password,
      encrypt,
      trust_server_certificate,
      import_sql,
    } = req.body;

    let existing = await prisma.mssqlConfig.findFirst({ where: { id: 1 } });

    const dataToUpdate = {
      host: host || 'localhost',
      port: parseInt(port || '1433', 10),
      database_name: database_name || 'BUSY_ERP_DB',
      username: username || 'sa',
      encrypt: Boolean(encrypt),
      trust_server_certificate: Boolean(trust_server_certificate),
      import_sql: import_sql || `SELECT M1.NAME AS PARTY_NAME, M1.I2 AS CREDIT_DAYS, M1.D1 AS CREDITLIMIT, MAI.Address1 AS ADDRESS, MAI.Mobile AS MOBILE, ISNULL(MAI.WhatsAppNo,'') AS WHATSAPP_NO, ISNULL(MAI.Email,'') AS EMAIL, ISNULL(MAI.GSTNo,'') AS GSTIN, ISNULL(CITY_M.NAME,'') AS CITY, ISNULL(STATE_M.NAME,'') AS STATE, ISNULL(SM.NAME,'UNASSIGNED') AS SALESMAN, ABS(ISNULL(F.D1,0)+(F.D23+F.D24+F.D25+F.D26+F.D27+F.D28+F.D29+F.D30+F.D31+F.D32+F.D33+F.D34)-(F.D11+F.D12+F.D13+F.D14+F.D15+F.D16+F.D17+F.D18+F.D19+F.D20+F.D21+F.D22)) AS CLOSING_BALANCE FROM MASTER1 M1 LEFT JOIN MASTERADDRESSINFO MAI ON M1.CODE=MAI.MASTERCODE LEFT JOIN MASTER1 STATE_M ON STATE_M.CODE=MAI.StateCodeLong AND STATE_M.MASTERTYPE=56 LEFT JOIN MASTER1 CITY_M ON CITY_M.CODE=MAI.CityCodeLong AND CITY_M.MASTERTYPE=57 AND CITY_M.NAME!='---Others---' LEFT JOIN MASTER1 SM ON SM.CODE=CAST(NULLIF(MAI.OF2,'') AS INT) LEFT JOIN Folio1 F ON F.MASTERCODE=M1.CODE WHERE M1.MASTERTYPE=2 AND M1.parentgrp IN(574140,574141,258335,577533) AND (ISNULL(F.D1,0)+(F.D23+F.D24+F.D25+F.D26+F.D27+F.D28+F.D29+F.D30+F.D31+F.D32+F.D33+F.D34)-(F.D11+F.D12+F.D13+F.D14+F.D15+F.D16+F.D17+F.D18+F.D19+F.D20+F.D21+F.D22))<0`,
      updated_at: new Date(),
    };

    if (password && password !== '••••••••') {
      dataToUpdate.password_encrypted = password;
    }

    let updated;
    if (!existing) {
      updated = await prisma.mssqlConfig.create({
        data: { id: 1, ...dataToUpdate }
      });
    } else {
      updated = await prisma.mssqlConfig.update({
        where: { id: 1 },
        data: dataToUpdate
      });
    }

    res.json({
      success: true,
      message: 'MSSQL Configuration updated successfully',
      config: {
        ...updated,
        password_encrypted: '••••••••',
      }
    });
  } catch (err) {
    next(err);
  }
}

async function queryCustomerInvoiceItemsController(req, res, next) {
  try {
    const { customerName, startDate = '2024-01-01', endDate = '2026-12-31' } = req.query;
    if (!customerName) {
      return res.status(400).json({ success: false, message: 'customerName search parameter is required' });
    }

    const { queryCustomerInvoiceItems } = require('../services/mssqlService');
    const result = await queryCustomerInvoiceItems(customerName, startDate, endDate);

    res.json({
      success: result.success,
      count: result.records ? result.records.length : 0,
      records: result.records || [],
      message: result.message || 'Customer invoice item query executed successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  triggerMssqlImport,
  getImportHistory,
  getConfig,
  updateConfig,
  queryCustomerInvoiceItemsController,
};
