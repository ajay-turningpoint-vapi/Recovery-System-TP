class User {
  final int id;
  final String username;
  final String name;
  final String role;
  final String? salesmanCode;
  final String? mobile;
  final String? email;

  User({
    required this.id,
    required this.username,
    required this.name,
    required this.role,
    this.salesmanCode,
    this.mobile,
    this.email,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      username: json['username'] ?? '',
      name: json['name'] ?? '',
      role: json['role'] ?? 'SALESMAN',
      salesmanCode: json['salesman_code'],
      mobile: json['mobile'],
      email: json['email'],
    );
  }

  bool get isAdmin => role.toUpperCase() == 'ADMIN';
}

class Customer {
  final int id;
  final String customerCode;
  final String customerName;
  final String? city;
  final String? state;
  final String? address;
  final String? mobile;
  final String? alternateMobile;
  final String? email;
  final String? salesmanCode;
  final double creditLimit;
  final int creditDays;
  final double openingBalance;
  final double totalOutstanding;
  final double overdueAmount;
  final int invoiceCount;

  Customer({
    required this.id,
    required this.customerCode,
    required this.customerName,
    this.city,
    this.state,
    this.address,
    this.mobile,
    this.alternateMobile,
    this.email,
    this.salesmanCode,
    required this.creditLimit,
    required this.creditDays,
    this.openingBalance = 0,
    required this.totalOutstanding,
    required this.overdueAmount,
    required this.invoiceCount,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'],
      customerCode: json['customer_code'] ?? '',
      customerName: json['customer_name'] ?? '',
      city: json['city'],
      state: json['state'],
      address: json['address'],
      mobile: json['mobile'],
      alternateMobile: json['alternate_mobile'],
      email: json['email'],
      salesmanCode: json['salesman_code'],
      creditLimit: (json['credit_limit'] ?? 0).toDouble(),
      creditDays: json['credit_days'] ?? 0,
      openingBalance: (json['opening_balance'] ?? 0).toDouble(),
      totalOutstanding: (json['total_outstanding'] ?? 0).toDouble(),
      overdueAmount: (json['overdue_amount'] ?? 0).toDouble(),
      invoiceCount: json['invoice_count'] ?? 0,
    );
  }
}

class Invoice {
  final int id;
  final String invoiceNumber;
  final String invoiceDate;
  final double invoiceAmount;
  final double paidAmount;
  final double outstandingAmount;
  final String dueDate;
  final String status;
  final int daysOverdue;
  final String overdueStatus;
  final String? nextFollowupDate;
  final String? lastRemark;
  final List<InvoiceItem>? items;

  Invoice({
    required this.id,
    required this.invoiceNumber,
    required this.invoiceDate,
    required this.invoiceAmount,
    required this.paidAmount,
    required this.outstandingAmount,
    required this.dueDate,
    required this.status,
    required this.daysOverdue,
    required this.overdueStatus,
    this.nextFollowupDate,
    this.lastRemark,
    this.items,
  });

  factory Invoice.fromJson(Map<String, dynamic> json) {
    return Invoice(
      id: json['id'],
      invoiceNumber: json['invoice_number'] ?? '',
      invoiceDate: json['invoice_date'] ?? '',
      invoiceAmount: (json['invoice_amount'] ?? 0).toDouble(),
      paidAmount: (json['paid_amount'] ?? 0).toDouble(),
      outstandingAmount: (json['outstanding_amount'] ?? 0).toDouble(),
      dueDate: json['due_date'] ?? '',
      status: json['status'] ?? '',
      daysOverdue: json['days_overdue'] ?? 0,
      overdueStatus: json['overdue_status'] ?? '',
      nextFollowupDate: json['next_followup_date'],
      lastRemark: json['last_remark'] ?? 'N/A',
      items: json['items'] != null
          ? (json['items'] as List).map((i) => InvoiceItem.fromJson(i)).toList()
          : null,
    );
  }
}

class InvoiceItem {
  final int id;
  final String itemName;
  final double quantity;
  final double rate;
  final double discount;
  final double amount;

  InvoiceItem({
    required this.id,
    required this.itemName,
    required this.quantity,
    required this.rate,
    required this.discount,
    required this.amount,
  });

  factory InvoiceItem.fromJson(Map<String, dynamic> json) {
    return InvoiceItem(
      id: json['id'],
      itemName: json['item_name'] ?? '',
      quantity: (json['quantity'] ?? 0).toDouble(),
      rate: (json['rate'] ?? 0).toDouble(),
      discount: (json['discount'] ?? 0).toDouble(),
      amount: (json['amount'] ?? 0).toDouble(),
    );
  }
}

class DailyTask {
  final dynamic id;
  final int? customerId;
  final String customerName;
  final String customerCode;
  final String mobile;
  final double totalOutstanding;
  final double overdueAmount;
  final int invoiceCount;
  final String followupDate;
  final String followupTime;
  final String followupType;
  final String status;
  final String priority;
  final String previousRemark;
  final String? remark;
  final double? expectedPaymentAmount;
  final String? expectedPaymentDate;

  DailyTask({
    required this.id,
    this.customerId,
    required this.customerName,
    required this.customerCode,
    required this.mobile,
    required this.totalOutstanding,
    required this.overdueAmount,
    required this.invoiceCount,
    required this.followupDate,
    required this.followupTime,
    required this.followupType,
    required this.status,
    required this.priority,
    required this.previousRemark,
    this.remark,
    this.expectedPaymentAmount,
    this.expectedPaymentDate,
  });

  factory DailyTask.fromJson(Map<String, dynamic> json) {
    return DailyTask(
      id: json['id'],
      customerId: json['customer_id'],
      customerName: json['customer_name'] ?? json['customer']?['customer_name'] ?? 'Customer',
      customerCode: json['customer_code'] ?? json['customer']?['customer_code'] ?? '',
      mobile: json['mobile'] ?? json['customer']?['mobile'] ?? '',
      totalOutstanding: (json['total_outstanding'] ?? 0).toDouble(),
      overdueAmount: (json['overdue_amount'] ?? 0).toDouble(),
      invoiceCount: json['invoice_count'] ?? 0,
      followupDate: json['followup_date'] ?? '',
      followupTime: json['followup_time'] ?? '10:00 AM',
      followupType: json['followup_type'] ?? 'Phone Call',
      status: json['status'] ?? 'Pending',
      priority: json['priority'] ?? 'Medium',
      previousRemark: json['previous_remark'] ?? 'Pending initial call',
      remark: json['remark'],
      expectedPaymentAmount: json['expected_payment_amount'] != null
          ? (json['expected_payment_amount']).toDouble()
          : (json['promise_to_pay_amount'] != null ? (json['promise_to_pay_amount']).toDouble() : null),
      expectedPaymentDate: json['expected_payment_date'],
    );
  }
}
