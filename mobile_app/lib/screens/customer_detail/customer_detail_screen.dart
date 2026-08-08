import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/services/api_service.dart';
import '../../core/constants/api_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/smooth_widgets.dart';
import '../../models/app_models.dart';

class CustomerDetailScreen extends StatefulWidget {
  final Customer customer;

  const CustomerDetailScreen({super.key, required this.customer});

  @override
  State<CustomerDetailScreen> createState() => _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends State<CustomerDetailScreen>
    with WidgetsBindingObserver {
  bool _isLoading = true;
  List<Invoice> _invoices = [];

  // Auto follow-up prompt state
  bool _pendingFollowUpPrompt = false;
  String _pendingActionType = 'Phone Call';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _fetchCustomerDetails();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _pendingFollowUpPrompt) {
      _pendingFollowUpPrompt = false;
      // Slight delay to let app fully render before showing sheet
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) _showQuickFollowUpSheet();
      });
    }
  }

  void _showToast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  void _makePhoneCall(String? mobile) async {
    if (mobile == null || mobile.trim().isEmpty || mobile == 'null') {
      _showToast('No mobile number registered');
      return;
    }
    final cleanPhone = mobile.replaceAll(RegExp(r'[^0-9+]'), '');
    final Uri url = Uri.parse('tel:$cleanPhone');
    try {
      if (await canLaunchUrl(url)) {
        // Set pending follow-up prompt BEFORE launching
        setState(() {
          _pendingFollowUpPrompt = true;
          _pendingActionType = 'Phone Call';
        });
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        _showToast('Could not launch dialer for $cleanPhone');
      }
    } catch (_) {
      _showToast('Could not launch dialer for $cleanPhone');
    }
  }

  void _sendWhatsapp(Customer customer) {
    _showWhatsappTemplatePicker(customer);
  }

  void _showWhatsappTemplatePicker(Customer customer) {
    final mobile = customer.mobile;
    if (mobile == null || mobile.trim().isEmpty || mobile == 'null') {
      _showToast('No mobile number registered');
      return;
    }

    var cleanPhone = mobile.replaceAll(RegExp(r'[^0-9]'), '');
    if (cleanPhone.length == 10) {
      cleanPhone = '91$cleanPhone';
    }

    final String name = customer.customerName;
    final String outstanding = customer.totalOutstanding.toStringAsFixed(0);
    final String overdue = customer.overdueAmount.toStringAsFixed(0);
    final int invoiceCount = customer.invoiceCount;

    final List<Map<String, String>> templates = [
      {
        'title': '📌 Gentle Reminder',
        'subtitle': 'Standard payment reminder',
        'text': 'Dear $name,\n\nYour total outstanding balance is ₹$outstanding. Kindly process the payment at your earliest convenience.\n\nThank you!',
      },
      {
        'title': '⚠️ Urgent Overdue Alert',
        'subtitle': 'For overdue payment attention',
        'text': 'Dear $name,\n\nURGENT REMINDER: Your account has an overdue amount of ₹$overdue. Kindly clear the pending dues today to avoid account hold.\n\nThank you, Turning Point Team',
      },
      {
        'title': '📄 Statement Breakdown',
        'subtitle': 'Dues summary & invoice count',
        'text': 'Dear $name,\n\nGreetings from Turning Point!\nHere is your current statement summary:\n• Total Dues: ₹$outstanding\n• Pending Invoices: $invoiceCount\n\nPlease let us know if you require copies of invoices or bank details.\n\nRegards!',
      },
      {
        'title': '💳 Payment Request',
        'subtitle': 'Request screenshot/UTR after call',
        'text': 'Dear $name,\n\nAs discussed, please share the payment confirmation screenshot or UTR number once the transaction is completed.\n\nThank you for your support!',
      },
    ];

    int selectedIndex = 0;
    final messageController = TextEditingController(text: templates[0]['text']);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            top: 12,
            left: 20,
            right: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Drag handle
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),

                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F8EF),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.chat, color: Color(0xFF25D366), size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Select WhatsApp Template',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                          ),
                          Text(
                            '$name · ${customer.mobile}',
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppColors.textMuted),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Template Selection Cards
                const Text(
                  'Message Templates:',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 85,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: templates.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (ctx, idx) {
                      final t = templates[idx];
                      final isSelected = selectedIndex == idx;
                      return GestureDetector(
                        onTap: () {
                          HapticFeedback.selectionClick();
                          setSheetState(() {
                            selectedIndex = idx;
                            messageController.text = t['text']!;
                          });
                        },
                        child: Container(
                          width: 200,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFFE8F8EF) : AppColors.surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected ? const Color(0xFF25D366) : AppColors.border,
                              width: isSelected ? 1.5 : 1.0,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                t['title']!,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? const Color(0xFF1E7E44) : AppColors.textPrimary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                t['subtitle']!,
                                style: TextStyle(
                                  fontSize: 10,
                                  color: isSelected ? const Color(0xFF25D366) : AppColors.textMuted,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),

                // Live Preview & Edit Text Area
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Message Preview & Edit:',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    Text(
                      '${messageController.text.length} chars',
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: TextField(
                    controller: messageController,
                    maxLines: 5,
                    onChanged: (val) => setSheetState(() {}),
                    style: const TextStyle(fontSize: 13, height: 1.3, color: AppColors.textPrimary),
                    decoration: const InputDecoration(
                      contentPadding: EdgeInsets.all(12),
                      border: InputBorder.none,
                      hintText: 'Edit message...',
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                // Send via WhatsApp Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      Navigator.pop(ctx);
                      final finalMsg = messageController.text.trim();
                      final encodedMsg = Uri.encodeComponent(finalMsg);
                      final Uri whatsappAppUri = Uri.parse('whatsapp://send?phone=$cleanPhone&text=$encodedMsg');
                      final Uri whatsappWebUri = Uri.parse('https://api.whatsapp.com/send?phone=$cleanPhone&text=$encodedMsg');

                      try {
                        if (await canLaunchUrl(whatsappAppUri)) {
                          setState(() {
                            _pendingFollowUpPrompt = true;
                            _pendingActionType = 'WhatsApp';
                          });
                          await launchUrl(whatsappAppUri, mode: LaunchMode.externalApplication);
                        } else if (await canLaunchUrl(whatsappWebUri)) {
                          setState(() {
                            _pendingFollowUpPrompt = true;
                            _pendingActionType = 'WhatsApp';
                          });
                          await launchUrl(whatsappWebUri, mode: LaunchMode.externalApplication);
                        } else {
                          _showToast('Could not open WhatsApp for $cleanPhone');
                        }
                      } catch (_) {
                        _showToast('Could not open WhatsApp for $cleanPhone');
                      }
                    },
                    icon: const Icon(Icons.send_rounded, size: 16),
                    label: const Text(
                      'SEND VIA WHATSAPP',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF25D366),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─── Quick Follow-Up Sheet (shown on app resume after call/WhatsApp) ───────
  void _showQuickFollowUpSheet() {
    final customer = widget.customer;
    final remarkController = TextEditingController();
    final amountController = TextEditingController();
    final now = DateTime.now();
    final hour = now.hour;
    final minute = now.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final hour12 = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    final followupTimeController = TextEditingController(text: '$hour12:$minute $period');

    final actionType = _pendingActionType;
    final actionIcon = actionType == 'WhatsApp' ? '💬' : '📞';
    final accentColor = actionType == 'WhatsApp' ? const Color(0xFF25D366) : AppColors.primaryIndigo;
    final accentLight = actionType == 'WhatsApp'
        ? const Color(0xFF25D366).withOpacity(0.1)
        : AppColors.primaryIndigoLight;

    String selectedType = actionType;
    String selectedStatus = 'Pending';
    String selectedPriority = 'Medium';
    DateTime followupDate = now;
    DateTime? expectedPaymentDate;
    DateTime? nextFollowupDate = now.add(const Duration(days: 1));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            top: 12,
            left: 20,
            right: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Drag handle
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),

                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                          color: accentLight,
                          borderRadius: BorderRadius.circular(10)),
                      child: Text(actionIcon,
                          style: const TextStyle(fontSize: 22)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$actionIcon Quick Follow-Up Log',
                            style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary),
                          ),
                          Text(
                            '${customer.customerName} · $actionType',
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const Divider(height: 24),

                // 1. Follow-up Type & Status
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedType,
                        decoration: const InputDecoration(
                          labelText: 'Follow-up Type',
                          border: OutlineInputBorder(),
                        ),
                        items: [
                          'Phone Call',
                          'WhatsApp',
                          'Visit',
                          'Email',
                          'Payment Commitment',
                          'Payment Received',
                          'Other'
                        ]
                            .map((t) => DropdownMenuItem(
                                value: t,
                                child: Text(t,
                                    style:
                                        const TextStyle(fontSize: 13))))
                            .toList(),
                        onChanged: (val) =>
                            setSheetState(() => selectedType = val ?? actionType),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedStatus,
                        decoration: const InputDecoration(
                          labelText: 'Status',
                          border: OutlineInputBorder(),
                        ),
                        items: [
                          'Pending',
                          'Completed',
                          'Payment Promised',
                          'Payment Received',
                          'Customer Not Responding',
                          'Dispute',
                          'Postponed',
                          'Cancelled'
                        ]
                            .map((s) => DropdownMenuItem(
                                value: s,
                                child: Text(s,
                                    style:
                                        const TextStyle(fontSize: 12))))
                            .toList(),
                        onChanged: (val) => setSheetState(
                            () => selectedStatus = val ?? 'Pending'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 2. Follow-up Date & Time (pre-filled to current date/time)
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: ctx,
                            initialDate: followupDate,
                            firstDate: DateTime(2020),
                            lastDate: DateTime(2030),
                          );
                          if (picked != null) {
                            setSheetState(() => followupDate = picked);
                          }
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Follow-up Date',
                            border: OutlineInputBorder(),
                            prefixIcon:
                                Icon(Icons.calendar_today, size: 18),
                          ),
                          child: Text(
                            '${followupDate.day}/${followupDate.month}/${followupDate.year}',
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: followupTimeController,
                        decoration: const InputDecoration(
                          labelText: 'Time (e.g. 10:30 AM)',
                          border: OutlineInputBorder(),
                          prefixIcon:
                              Icon(Icons.access_time, size: 18),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 3. Expected Payment Amount & Date
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: amountController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Expected Payment (₹)',
                          border: OutlineInputBorder(),
                          prefixIcon:
                              Icon(Icons.currency_rupee, size: 18),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: ctx,
                            initialDate: expectedPaymentDate ??
                                DateTime.now()
                                    .add(const Duration(days: 3)),
                            firstDate: DateTime.now(),
                            lastDate: DateTime(2030),
                          );
                          if (picked != null) {
                            setSheetState(
                                () => expectedPaymentDate = picked);
                          }
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Expected Payment Date',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.event, size: 18),
                          ),
                          child: Text(
                            expectedPaymentDate != null
                                ? '${expectedPaymentDate!.day}/${expectedPaymentDate!.month}/${expectedPaymentDate!.year}'
                                : 'Select Date',
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 4. Next Follow-up Date & Priority
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: ctx,
                            initialDate: nextFollowupDate ??
                                DateTime.now()
                                    .add(const Duration(days: 1)),
                            firstDate: DateTime.now(),
                            lastDate: DateTime(2030),
                          );
                          if (picked != null) {
                            setSheetState(
                                () => nextFollowupDate = picked);
                          }
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Next Follow-up Date',
                            border: OutlineInputBorder(),
                            prefixIcon:
                                Icon(Icons.edit_calendar, size: 18),
                          ),
                          child: Text(
                            nextFollowupDate != null
                                ? '${nextFollowupDate!.day}/${nextFollowupDate!.month}/${nextFollowupDate!.year}'
                                : 'Select Date',
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedPriority,
                        decoration: const InputDecoration(
                          labelText: 'Priority',
                          border: OutlineInputBorder(),
                        ),
                        items: ['Low', 'Medium', 'High', 'Urgent']
                            .map((p) => DropdownMenuItem(
                                value: p,
                                child: Text(p,
                                    style:
                                        const TextStyle(fontSize: 13))))
                            .toList(),
                        onChanged: (val) => setSheetState(
                            () => selectedPriority = val ?? 'Medium'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 5. Remark
                TextField(
                  controller: remarkController,
                  maxLines: 3,
                  autofocus: true,
                  decoration: const InputDecoration(
                    labelText: 'Follow-up Remark / Conversation Notes *',
                    hintText:
                        'e.g. Spoke with customer, promised payment by...',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 20),

                // Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(ctx),
                        style: OutlinedButton.styleFrom(
                          padding:
                              const EdgeInsets.symmetric(vertical: 14),
                          side: const BorderSide(color: AppColors.border),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('SKIP',
                            style: TextStyle(
                                color: AppColors.textMuted,
                                fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          final remark = remarkController.text.trim();
                          if (remark.isEmpty) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              const SnackBar(
                                  content:
                                      Text('Please enter a remark')),
                            );
                            return;
                          }
                          try {
                            final payload = {
                              'customer_id': customer.id,
                              'followup_date':
                                  followupDate.toIso8601String(),
                              'followup_time':
                                  followupTimeController.text.trim(),
                              'followup_type': selectedType,
                              'status': selectedStatus,
                              'priority': selectedPriority,
                              'remark': remark,
                              if (nextFollowupDate != null)
                                'next_followup_date':
                                    nextFollowupDate!.toIso8601String(),
                              if (expectedPaymentDate != null)
                                'expected_payment_date':
                                    expectedPaymentDate!
                                        .toIso8601String(),
                              if (amountController.text
                                  .trim()
                                  .isNotEmpty)
                                'expected_payment_amount':
                                    double.tryParse(amountController
                                            .text
                                            .trim()) ??
                                        0,
                            };
                            final res = await ApiService.post(
                                ApiConstants.followupsEndpoint, payload);
                            if (res['success'] == true) {
                              if (ctx.mounted) Navigator.pop(ctx);
                              _showToast(
                                  '✅ Follow-up logged successfully!');
                              _fetchCustomerDetails();
                            } else {
                              if (ctx.mounted) {
                                ScaffoldMessenger.of(ctx).showSnackBar(
                                  SnackBar(
                                      content: Text(
                                          res['message'] ??
                                              'Failed to save')),
                                );
                              }
                            }
                          } catch (e) {
                            if (ctx.mounted) {
                              ScaffoldMessenger.of(ctx).showSnackBar(
                                SnackBar(content: Text('Error: $e')),
                              );
                            }
                          }
                        },
                        icon: const Icon(Icons.check_circle_outline,
                            size: 18),
                        label: const Text('SAVE FOLLOW-UP',
                            style:
                                TextStyle(fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          padding:
                              const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: accentColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showAddFollowupModal({required int customerId, required String customerName}) {
    final remarkController = TextEditingController();
    final amountController = TextEditingController();
    final followupTimeController = TextEditingController(text: '10:30 AM');

    DateTime followupDate = DateTime.now();
    DateTime? expectedPaymentDate;
    DateTime? nextFollowupDate;

    String selectedType = 'Phone Call';
    String selectedStatus = 'Pending';
    String selectedPriority = 'Medium';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            top: 20,
            left: 20,
            right: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'Add Daily Follow-up - $customerName',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const Divider(),
                const SizedBox(height: 10),

                // 1. Follow-up Type & Status
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedType,
                        decoration: const InputDecoration(
                          labelText: 'Follow-up Type',
                          border: OutlineInputBorder(),
                        ),
                        items: ['Phone Call', 'WhatsApp', 'Visit', 'Email', 'Payment Commitment', 'Payment Received', 'Other']
                            .map((t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 13))))
                            .toList(),
                        onChanged: (val) => setModalState(() => selectedType = val ?? 'Phone Call'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedStatus,
                        decoration: const InputDecoration(
                          labelText: 'Status',
                          border: OutlineInputBorder(),
                        ),
                        items: ['Pending', 'Completed', 'Payment Promised', 'Payment Received', 'Customer Not Responding', 'Dispute', 'Postponed', 'Cancelled']
                            .map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 12))))
                            .toList(),
                        onChanged: (val) => setModalState(() => selectedStatus = val ?? 'Pending'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 2. Follow-up Date & Time
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: followupDate,
                            firstDate: DateTime(2020),
                            lastDate: DateTime(2030),
                          );
                          if (picked != null) setModalState(() => followupDate = picked);
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Follow-up Date',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.calendar_today, size: 18),
                          ),
                          child: Text('${followupDate.day}/${followupDate.month}/${followupDate.year}', style: const TextStyle(fontSize: 13)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: followupTimeController,
                        decoration: const InputDecoration(
                          labelText: 'Time (e.g. 10:30 AM)',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.access_time, size: 18),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 3. Expected Payment Amount & Date
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: amountController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Expected Payment (₹)',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.currency_rupee, size: 18),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: expectedPaymentDate ?? DateTime.now().add(const Duration(days: 3)),
                            firstDate: DateTime.now(),
                            lastDate: DateTime(2030),
                          );
                          if (picked != null) setModalState(() => expectedPaymentDate = picked);
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Expected Payment Date',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.event, size: 18),
                          ),
                          child: Text(
                            expectedPaymentDate != null
                                ? '${expectedPaymentDate!.day}/${expectedPaymentDate!.month}/${expectedPaymentDate!.year}'
                                : 'Select Date',
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 4. Next Follow-up Date & Priority
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: nextFollowupDate ?? DateTime.now().add(const Duration(days: 7)),
                            firstDate: DateTime.now(),
                            lastDate: DateTime(2030),
                          );
                          if (picked != null) setModalState(() => nextFollowupDate = picked);
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Next Follow-up Date',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.edit_calendar, size: 18),
                          ),
                          child: Text(
                            nextFollowupDate != null
                                ? '${nextFollowupDate!.day}/${nextFollowupDate!.month}/${nextFollowupDate!.year}'
                                : 'Select Date',
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedPriority,
                        decoration: const InputDecoration(
                          labelText: 'Priority',
                          border: OutlineInputBorder(),
                        ),
                        items: ['Low', 'Medium', 'High', 'Urgent']
                            .map((p) => DropdownMenuItem(value: p, child: Text(p, style: const TextStyle(fontSize: 13))))
                            .toList(),
                        onChanged: (val) => setModalState(() => selectedPriority = val ?? 'Medium'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 5. Follow-up Remark Notes
                TextField(
                  controller: remarkController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Follow-up Remark / Conversation Notes',
                    hintText: 'Enter details of customer discussion...',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 20),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryIndigo),
                    onPressed: () async {
                      try {
                        final payload = {
                          'customer_id': customerId,
                          'followup_type': selectedType,
                          'status': selectedStatus,
                          'priority': selectedPriority,
                          'followup_date': followupDate.toIso8601String().split('T')[0],
                          'followup_time': followupTimeController.text,
                          'remark': remarkController.text,
                          if (amountController.text.isNotEmpty)
                            'expected_payment_amount': double.tryParse(amountController.text),
                          if (expectedPaymentDate != null)
                            'expected_payment_date': expectedPaymentDate!.toIso8601String().split('T')[0],
                          if (nextFollowupDate != null)
                            'next_followup_date': nextFollowupDate!.toIso8601String().split('T')[0],
                        };

                        final res = await ApiService.post(ApiConstants.followupsEndpoint, payload);

                        if (res['success'] == true) {
                          if (!ctx.mounted) return;
                          Navigator.pop(ctx);
                          _showToast('✅ Follow-up saved successfully!');
                          _fetchCustomerDetails();
                        }
                      } catch (e) {
                        _showToast('Error saving follow-up: $e');
                      }
                    },
                    child: const Text('SAVE DAILY FOLLOW-UP ENTRY', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _fetchCustomerDetails() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.get('${ApiConstants.customersEndpoint}/${widget.customer.id}');
      if (res['success'] == true && res['customer'] != null) {
        final invList = (res['customer']['invoices'] as List? ?? [])
            .map((i) => Invoice.fromJson(i))
            .toList();
        setState(() {
          _invoices = invList;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading customer invoices: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showInvoiceDetailModal(Invoice inv) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Invoice ${inv.invoiceNumber}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 10),

            // Financial Summary Cards
            Row(
              children: [
                _buildSummaryBox('Invoice Amt', '₹${inv.invoiceAmount.toStringAsFixed(0)}', AppColors.primaryIndigo),
                const SizedBox(width: 8),
                _buildSummaryBox('Paid Amt', '₹${inv.paidAmount.toStringAsFixed(0)}', AppColors.emeraldGreen),
                const SizedBox(width: 8),
                _buildSummaryBox('Outstanding', '₹${inv.outstandingAmount.toStringAsFixed(0)}', AppColors.roseOverdue),
              ],
            ),
            const SizedBox(height: 16),

            _buildDetailRow('Invoice Date:', _formatDate(inv.invoiceDate)),
            _buildDetailRow('Due Date:', _formatDate(inv.dueDate)),
            _buildDetailRow('Status:', inv.status, isBadge: true),
            _buildDetailRow('Days Overdue:', inv.overdueStatus),
            _buildDetailRow('Next Follow-up:', inv.nextFollowupDate != null ? _formatDate(inv.nextFollowupDate!) : 'None'),
            _buildDetailRow('Last Remark:', inv.lastRemark ?? 'N/A'),

            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '📦 INVOICE ITEM DETAILS',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryIndigo),
                ),
                if (inv.items != null && inv.items!.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primaryIndigoLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${inv.items!.length} Items',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryIndigo),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),

            if (inv.items == null || inv.items!.isEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text('No itemized breakdown recorded for this invoice.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
              )
            else
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: const BoxDecoration(
                        color: AppColors.primaryIndigoLight,
                        borderRadius: BorderRadius.only(topLeft: Radius.circular(7), topRight: Radius.circular(7)),
                      ),
                      child: const Row(
                        children: [
                          Expanded(flex: 4, child: Text('ITEM NAME', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primaryIndigo))),
                          Expanded(flex: 2, child: Text('QTY', textAlign: TextAlign.center, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primaryIndigo))),
                          Expanded(flex: 2, child: Text('RATE', textAlign: TextAlign.right, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primaryIndigo))),
                          Expanded(flex: 2, child: Text('AMOUNT', textAlign: TextAlign.right, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primaryIndigo))),
                        ],
                      ),
                    ),
                    ConstrainedBox(
                      constraints: const BoxConstraints(
                        maxHeight: 280,
                      ),
                      child: Scrollbar(
                        thumbVisibility: inv.items!.length > 4,
                        child: ListView.separated(
                          shrinkWrap: true,
                          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                          itemCount: inv.items!.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (ctx, idx) {
                            final item = inv.items![idx];
                            return Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              child: Row(
                                children: [
                                  Expanded(
                                    flex: 4,
                                    child: Text(
                                      item.itemName,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                    ),
                                  ),
                                  Expanded(
                                    flex: 2,
                                    child: Text(
                                      item.quantity.toStringAsFixed(1),
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                    ),
                                  ),
                                  Expanded(
                                    flex: 2,
                                    child: Text(
                                      '₹${item.rate.toStringAsFixed(0)}',
                                      textAlign: TextAlign.right,
                                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                    ),
                                  ),
                                  Expanded(
                                    flex: 2,
                                    child: Text(
                                      '₹${item.amount.toStringAsFixed(0)}',
                                      textAlign: TextAlign.right,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('CLOSE'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryBox(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color)),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isBadge = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
          isBadge
              ? Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.roseOverdueLight,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(value, style: const TextStyle(color: AppColors.roseOverdue, fontSize: 12, fontWeight: FontWeight.bold)),
                )
              : Flexible(
                  child: Text(
                    value,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    textAlign: TextAlign.end,
                  ),
                ),
        ],
      ),
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return 'N/A';
    if (date is DateTime) return '${date.day}/${date.month}/${date.year}';
    final parsed = DateTime.tryParse(date.toString());
    return parsed != null ? '${parsed.day}/${parsed.month}/${parsed.year}' : date.toString();
  }

  Widget _buildInfoCol(String label, String value, {bool isBold = false, bool isRed = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: isBold ? 14 : 12,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            color: isRed ? AppColors.roseOverdue : AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.customer;
    final location = (c.city != null && c.city!.isNotEmpty)
        ? '${c.city}${c.state != null ? ', ${c.state}' : ''}'
        : (c.state ?? 'N/A');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leadingWidth: 56,
        leading: Padding(
          padding: const EdgeInsets.only(left: 12, top: 8, bottom: 8, right: 4),
          child: Material(
            color: AppColors.primaryIndigoLight,
            borderRadius: BorderRadius.circular(10),
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () {
                HapticFeedback.selectionClick();
                Navigator.of(context).pop();
              },
              child: const Icon(
                Icons.arrow_back_rounded,
                color: AppColors.primaryIndigo,
                size: 20,
              ),
            ),
          ),
        ),
        title: Text(
          c.customerName,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
      body: _isLoading
          ? const SafeArea(
              child: Padding(
                padding: EdgeInsets.only(top: 16),
                child: SkeletonList(count: 5, itemHeight: 120),
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Customer Header Card (Matching exact user metadata requirements)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  c.customerName,
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryIndigoLight,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '${c.invoiceCount} Inv',
                                  style: const TextStyle(color: AppColors.primaryIndigo, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.badge_outlined, size: 14, color: AppColors.textMuted),
                              const SizedBox(width: 4),
                              Text('Code: ${c.customerCode}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                              const SizedBox(width: 12),
                              const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textMuted),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  location.length > 15 ? '${location.substring(0, 15)}...' : location,
                                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _buildInfoCol('Mobile', c.mobile ?? 'N/A'),
                              _buildInfoCol('Salesman', c.salesmanCode ?? 'N/A'),
                              _buildInfoCol('Credit Limit', '₹${c.creditLimit.toStringAsFixed(0)}'),
                              _buildInfoCol('Credit Days', '${c.creditDays} Days'),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Total Outstanding', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.roseOverdue)),
                                  Text(
                                    '₹${c.totalOutstanding.toStringAsFixed(0)}',
                                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.roseOverdue),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () => _makePhoneCall(c.mobile),
                                  icon: const Icon(Icons.phone, size: 16),
                                  label: const Text('CALL'),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () => _sendWhatsapp(c),
                                  icon: const Icon(Icons.message, size: 16, color: AppColors.emeraldGreen),
                                  label: const Text('WHATSAPP', style: TextStyle(color: AppColors.emeraldGreen, fontWeight: FontWeight.bold)),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: AppColors.emeraldGreen),
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: () => _showAddFollowupModal(customerId: c.id, customerName: c.customerName),
                              icon: const Icon(Icons.add_task, size: 16),
                              label: const Text('+ ADD FOLLOW-UP ENTRY', style: TextStyle(fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primaryIndigo,
                                padding: const EdgeInsets.symmetric(vertical: 10),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Invoices List Header
                  const Text(
                    'Customer Invoices Breakdown',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 10),

                  // Invoices List Table View
                  _invoices.isEmpty
                      ? const Card(
                          child: Padding(
                            padding: EdgeInsets.all(24.0),
                            child: Center(child: Text('No invoices available for this customer.')),
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _invoices.length,
                          itemBuilder: (ctx, idx) {
                            final inv = _invoices[idx];
                            return InkWell(
                              onTap: () => _showInvoiceDetailModal(inv),
                              borderRadius: BorderRadius.circular(10),
                              child: Card(
                                margin: const EdgeInsets.only(bottom: 10),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              const Icon(Icons.receipt_long, size: 16, color: AppColors.primaryIndigo),
                                              const SizedBox(width: 6),
                                              Text(
                                                inv.invoiceNumber.trim(),
                                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primaryIndigo),
                                              ),
                                            ],
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: AppColors.roseOverdueLight,
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              inv.overdueStatus,
                                              style: const TextStyle(color: AppColors.roseOverdue, fontSize: 11, fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('Inv Date: ${_formatDate(inv.invoiceDate)}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                          Text('Due Date: ${_formatDate(inv.dueDate)}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('Amount: ₹${inv.invoiceAmount.toStringAsFixed(1)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                                          Text('Paid: ₹${inv.paidAmount.toStringAsFixed(1)}', style: const TextStyle(fontSize: 13, color: AppColors.emeraldGreen, fontWeight: FontWeight.w600)),
                                          Text('Outstanding: ₹${inv.outstandingAmount.toStringAsFixed(1)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.roseOverdue)),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text('Last Remark: ${inv.lastRemark ?? 'N/A'}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted), overflow: TextOverflow.ellipsis),
                                          ),
                                          const Text('Tap for Details →', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primaryIndigo)),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ],
              ),
            ),
    );
  }

}
