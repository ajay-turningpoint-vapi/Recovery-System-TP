/**
 * WhatsApp message template formatters
 */

const DEFAULT_TEMPLATES = {
  PAYMENT_REMINDER: `Dear {CustomerName},

This is a reminder regarding your outstanding payment of ₹{OutstandingAmount}.

Kindly arrange the payment at the earliest.

Regards,
{SalesmanName}`,

  PAYMENT_DUE: `Dear {CustomerName},

Your payment of ₹{OutstandingAmount} is due.

Kindly arrange the payment as per the agreed terms.

Regards,
{SalesmanName}`,

  PAYMENT_COMMITMENT: `Dear {CustomerName},

Thank you for your commitment to pay ₹{PromisedAmount} on {PromisedDate}.

Please let us know if you need any assistance with payment details.

Regards,
{SalesmanName}`,

  INVOICE_BREAKDOWN: `Dear {CustomerName},

Here is the details of your outstanding invoices:

{InvoiceList}

Total Outstanding: ₹{OutstandingAmount}

Kindly process the payment at your earliest convenience.

Regards,
{SalesmanName}`
};

function formatWhatsappMessage(templateText, variables) {
  let message = templateText;
  const map = {
    '{CustomerName}': variables.customerName || '',
    '{OutstandingAmount}': (variables.outstandingAmount || 0).toLocaleString('en-IN'),
    '{SalesmanName}': variables.salesmanName || '',
    '{PromisedAmount}': (variables.promisedAmount || 0).toLocaleString('en-IN'),
    '{PromisedDate}': variables.promisedDate || '',
    '{InvoiceList}': variables.invoiceList || '',
    '{InvoiceNumber}': variables.invoiceNumber || '',
    '{DueDate}': variables.dueDate || ''
  };

  for (const [key, val] of Object.entries(map)) {
    message = message.replaceAll(key, val);
  }

  return message;
}

module.exports = {
  DEFAULT_TEMPLATES,
  formatWhatsappMessage
};
