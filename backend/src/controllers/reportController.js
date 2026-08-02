const {
  getCustomerOutstandingReport,
  getSalesmanCollectionReport,
  getOverdueAgingReport,
  getFollowupReport,
} = require('../services/reportService');
const { convertToCSV } = require('../utils/calculations');

async function getOutstandingReport(req, res, next) {
  try {
    const data = await getCustomerOutstandingReport(req.user, req.query);

    if (req.query.format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="customer_outstanding_report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getCollectionReport(req, res, next) {
  try {
    const data = await getSalesmanCollectionReport(req.user, req.query);

    if (req.query.format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="salesman_collection_report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getOverdueReport(req, res, next) {
  try {
    const data = await getOverdueAgingReport(req.user, req.query);

    if (req.query.format === 'csv') {
      const flattened = [];
      for (const [bucket, list] of Object.entries(data.agingBuckets)) {
        for (const item of list) {
          flattened.push({
            Bucket: bucket,
            InvoiceNumber: item.invoiceNumber,
            InvoiceDate: item.invoiceDate,
            DueDate: item.dueDate,
            CustomerName: item.customerName,
            CustomerCode: item.customerCode,
            SalesmanCode: item.salesmanCode,
            InvoiceAmount: item.invoiceAmount,
            OutstandingAmount: item.outstandingAmount,
            DaysOverdue: item.daysOverdue,
          });
        }
      }
      const csv = convertToCSV(flattened);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="overdue_aging_report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getFollowupsReport(req, res, next) {
  try {
    const data = await getFollowupReport(req.user, req.query);

    if (req.query.format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="followup_activity_report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOutstandingReport,
  getCollectionReport,
  getOverdueReport,
  getFollowupsReport,
};
