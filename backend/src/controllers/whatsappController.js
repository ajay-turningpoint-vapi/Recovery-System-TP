const prisma = require('../config/db');
const { formatWhatsappMessage, DEFAULT_TEMPLATES } = require('../utils/whatsappTemplates');

/**
 * Generate WhatsApp message content & link, and record log entry
 */
async function generateAndSendWhatsapp(req, res, next) {
  try {
    const {
      customer_id,
      mobile,
      template_name = 'PAYMENT_REMINDER',
      custom_text,
      invoice_ids = [],
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer ID is required' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(customer_id, 10) },
      include: {
        invoices: {
          where: { outstanding_amount: { gt: 0 } },
          orderBy: { due_date: 'asc' }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const phone = mobile || customer.mobile;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Customer has no valid mobile number' });
    }

    // Filter invoices if invoice_ids passed
    let selectedInvoices = customer.invoices;
    if (invoice_ids && invoice_ids.length > 0) {
      const selectedSet = new Set(invoice_ids.map(id => parseInt(id, 10)));
      selectedInvoices = customer.invoices.filter(inv => selectedSet.has(inv.id));
    }

    let calculatedOutstanding = 0;
    const invoiceLines = selectedInvoices.map(inv => {
      calculatedOutstanding += inv.outstanding_amount;
      const dueDateStr = new Date(inv.due_date).toLocaleDateString('en-IN');
      return `Invoice ${inv.invoice_number} - ₹${inv.outstanding_amount.toLocaleString('en-IN')} - Due: ${dueDateStr}`;
    }).join('\n');

    let templateContent = custom_text;
    if (!templateContent) {
      // Check db templates or fallback to defaults
      const dbTemplate = await prisma.whatsappTemplate.findUnique({
        where: { name: template_name }
      });
      templateContent = dbTemplate ? dbTemplate.content : (DEFAULT_TEMPLATES[template_name] || DEFAULT_TEMPLATES.PAYMENT_REMINDER);
    }

    const formattedMessage = formatWhatsappMessage(templateContent, {
      customerName: customer.customer_name,
      outstandingAmount: calculatedOutstanding || customer.credit_limit,
      salesmanName: req.user.name,
      invoiceList: invoiceLines,
    });

    // Format phone for WhatsApp URL (ensure standard India country code 91 if 10 digits)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const whatsappWebUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(formattedMessage)}`;
    const whatsappMobileUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(formattedMessage)}`;

    // Log WhatsApp activity
    const log = await prisma.whatsappLog.create({
      data: {
        customer_id: customer.id,
        mobile: cleanPhone,
        message: formattedMessage,
        invoice_ids: invoice_ids.join(','),
        sent_by: req.user.id,
        status: 'SENT',
      }
    });

    res.json({
      success: true,
      message: 'WhatsApp link generated and action logged',
      data: {
        logId: log.id,
        cleanPhone,
        formattedMessage,
        whatsappWebUrl,
        whatsappMobileUrl,
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getWhatsappLogs(req, res, next) {
  try {
    const { customer_id, page = 1, limit = 50 } = req.query;

    const where = {};
    if (customer_id) {
      where.customer_id = parseInt(customer_id, 10);
    }
    if (req.user.role === 'SALESMAN') {
      where.customer = { salesman_code: req.user.salesman_code };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [total, logs] = await Promise.all([
      prisma.whatsappLog.count({ where }),
      prisma.whatsappLog.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          customer: { select: { customer_name: true, customer_code: true } },
          user: { select: { name: true } }
        },
        orderBy: { sent_at: 'desc' }
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

async function getWhatsappTemplates(req, res, next) {
  try {
    const templates = await prisma.whatsappTemplate.findMany({
      orderBy: { id: 'asc' }
    });

    if (templates.length === 0) {
      // Seed default templates if empty
      const defaultList = [
        { name: 'PAYMENT_REMINDER', content: DEFAULT_TEMPLATES.PAYMENT_REMINDER, is_default: true },
        { name: 'PAYMENT_DUE', content: DEFAULT_TEMPLATES.PAYMENT_DUE, is_default: true },
        { name: 'PAYMENT_COMMITMENT', content: DEFAULT_TEMPLATES.PAYMENT_COMMITMENT, is_default: true },
        { name: 'INVOICE_BREAKDOWN', content: DEFAULT_TEMPLATES.INVOICE_BREAKDOWN, is_default: true },
      ];
      for (const t of defaultList) {
        await prisma.whatsappTemplate.create({ data: t });
      }
      const reFetched = await prisma.whatsappTemplate.findMany({ orderBy: { id: 'asc' } });
      return res.json({ success: true, data: reFetched });
    }

    res.json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
}

async function updateWhatsappTemplate(req, res, next) {
  try {
    const templateId = parseInt(req.params.id, 10);
    const { content } = req.body;

    const updated = await prisma.whatsappTemplate.update({
      where: { id: templateId },
      data: { content, updated_at: new Date() }
    });

    res.json({
      success: true,
      message: 'Template updated successfully',
      template: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateAndSendWhatsapp,
  getWhatsappLogs,
  getWhatsappTemplates,
  updateWhatsappTemplate,
};
