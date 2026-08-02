const prisma = require('../config/db');
const { processMssqlImport } = require('../services/importService');
const { getMssqlConfig } = require('../services/mssqlService');

async function triggerMssqlImport(req, res, next) {
  try {
    const { startDate, endDate } = req.body;

    const start = startDate || '2026-06-01';
    const end = endDate || '2026-08-01';

    // Run import processing pipeline asynchronously / non-blocking response with progress tracking
    const result = await processMssqlImport(start, end);

    res.json({
      success: true,
      message: 'MSSQL Import completed successfully',
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
      import_sql: import_sql || `SELECT VOU_NO, VOUCHER_DATE, PARTY, ALIAS, ADDRESS, CITY, STATE, GSTIN, MOBILE, SALESMAN, ITEM_NAME, HSN, QTY, RATE, TAX, DISC, TOTAL_AMOUNT, DUE_DATE FROM VOUCHERS WHERE VOUCHER_DATE >= @startdate@ AND VOUCHER_DATE <= @enddate@`,
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

module.exports = {
  triggerMssqlImport,
  getImportHistory,
  getConfig,
  updateConfig,
};
