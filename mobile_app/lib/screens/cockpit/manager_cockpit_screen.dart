import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/services/api_service.dart';
import '../../core/constants/api_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/smooth_widgets.dart';
import '../../models/app_models.dart';
import '../customer_detail/customer_detail_screen.dart';

class ManagerCockpitScreen extends StatefulWidget {
  final User user;

  const ManagerCockpitScreen({super.key, required this.user});

  @override
  State<ManagerCockpitScreen> createState() => _ManagerCockpitScreenState();
}

class _ManagerCockpitScreenState extends State<ManagerCockpitScreen>
    with SingleTickerProviderStateMixin {
  bool _isLoading = true;
  late TabController _tabController;

  List<dynamic> _brokenPromises = [];
  List<dynamic> _escalatedAccounts = [];
  List<dynamic> _disputedInvoices = [];

  int _brokenCount = 0;
  int _escalatedCount = 0;
  int _disputeCount = 0;
  int _avgRcsScore = 85;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    if (widget.user.isAdmin) {
      _fetchCockpitData();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showToast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _fetchCockpitData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        ApiService.get('${ApiConstants.followupsEndpoint}?limit=100'),
        ApiService.get('${ApiConstants.customersEndpoint}?limit=100'),
      ]);

      final followupsRes = results[0];
      final customersRes = results[1];

      final List followups = (followupsRes['data'] ?? []) as List;
      final List customers = (customersRes['data'] ?? []) as List;

      final nowStr = DateTime.now().toIso8601String().split('T')[0];

      // 1. Broken promises filter
      final broken = followups.where((f) {
        final String? status = f['status'];
        final String? expDate = f['expected_payment_date'] ?? f['promise_to_pay_date'];
        if (expDate != null && expDate.isNotEmpty) {
          final pDate = expDate.split('T')[0];
          if (pDate.compareTo(nowStr) < 0 && (status == 'Pending' || status == 'Payment Promised')) {
            return true;
          }
        }
        return status == 'Payment Promised' && expDate != null && expDate.split('T')[0].compareTo(nowStr) < 0;
      }).toList();

      // 2. Escalated accounts filter (L1 - L4 or high overdue)
      final escalated = customers.where((c) {
        final level = c['escalation_level'];
        final status = c['current_status'];
        final overdue = (c['overdue_amount'] ?? 0).toDouble();
        return level == 'L1' ||
            level == 'L2' ||
            level == 'L3' ||
            level == 'L4' ||
            status == 'OVERDUE_8_30' ||
            overdue > 50000;
      }).toList();

      // 3. Disputed followups filter
      final disputes = followups.where((f) => f['status'] == 'Dispute').toList();

      // 4. Calculate average RCS score
      double totalRcs = 0;
      for (var c in customers) {
        totalRcs += (c['rcs_score'] ?? 85).toDouble();
      }
      final avgRcs = customers.isNotEmpty ? (totalRcs / customers.length).round() : 85;

      setState(() {
        _brokenPromises = broken;
        _escalatedAccounts = escalated;
        _disputedInvoices = disputes;
        _brokenCount = broken.length;
        _escalatedCount = escalated.length;
        _disputeCount = disputes.length;
        _avgRcsScore = avgRcs;
      });
    } catch (e) {
      _showToast('Error loading cockpit data: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
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
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        _showToast('Could not launch dialer for $cleanPhone');
      }
    } catch (_) {
      _showToast('Could not launch dialer for $cleanPhone');
    }
  }

  void _sendWhatsapp(String? mobile, String name) async {
    if (mobile == null || mobile.trim().isEmpty || mobile == 'null') {
      _showToast('No mobile number registered');
      return;
    }
    var cleanPhone = mobile.replaceAll(RegExp(r'[^0-9]'), '');
    if (cleanPhone.length == 10) cleanPhone = '91$cleanPhone';

    final text = Uri.encodeComponent('Dear $name,\n\nUrgent follow-up regarding pending account commitments. Kindly update payment status.\n\nRegards, Recovery Management Team');
    final appUri = Uri.parse('whatsapp://send?phone=$cleanPhone&text=$text');
    final webUri = Uri.parse('https://api.whatsapp.com/send?phone=$cleanPhone&text=$text');

    try {
      if (await canLaunchUrl(appUri)) {
        await launchUrl(appUri, mode: LaunchMode.externalApplication);
      } else if (await canLaunchUrl(webUri)) {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      } else {
        _showToast('Could not open WhatsApp for $cleanPhone');
      }
    } catch (_) {
      _showToast('Could not open WhatsApp for $cleanPhone');
    }
  }

  String _formatDate(dynamic date) {
    if (date == null) return 'N/A';
    final parsed = DateTime.tryParse(date.toString());
    return parsed != null ? '${parsed.day}/${parsed.month}/${parsed.year}' : date.toString();
  }

  @override
  Widget build(BuildContext context) {
    // SECURITY GUARD: Admin-only access restriction
    if (!widget.user.isAdmin) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('Manager Cockpit', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: AppColors.roseOverdueLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.admin_panel_settings_outlined,
                    size: 56,
                    color: AppColors.roseOverdue,
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Access Restricted',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 10),
                const Text(
                  'The Manager Cockpit exception dashboard is strictly reserved for Admin accounts.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: AppColors.textMuted, height: 1.4),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back, size: 18),
                  label: const Text('RETURN TO DASHBOARD'),
                ),
              ],
            ),
          ),
        ),
      );
    }

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
        title: Row(
          children: [
            const Icon(Icons.shield_outlined, color: AppColors.primaryIndigo, size: 22),
            const SizedBox(width: 8),
            const Text('Manager Cockpit', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primaryIndigo,
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text('ADMIN', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.primaryIndigo),
            tooltip: 'Refresh Cockpit',
            onPressed: _fetchCockpitData,
          ),
        ],
      ),
      body: _isLoading
          ? const SafeArea(
              child: Padding(
                padding: EdgeInsets.only(top: 16),
                child: SkeletonList(count: 6, itemHeight: 110),
              ),
            )
          : RefreshIndicator(
              onRefresh: _fetchCockpitData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Subheader Title
                    const Text(
                      'Management By Exception',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primaryIndigo, letterSpacing: 0.5),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Real-time exception tracking for broken promises, SLA escalations, and disputed accounts.',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 16),

                    // Top 4 Exception KPI Cards Grid
                    Row(
                      children: [
                        Expanded(
                          child: _buildCockpitKpiCard(
                            title: 'Broken Promises',
                            value: '$_brokenCount',
                            subtitle: 'Missed commitments',
                            color: AppColors.roseOverdue,
                            bgColor: AppColors.roseOverdueLight,
                            icon: Icons.warning_amber_rounded,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildCockpitKpiCard(
                            title: 'SLA Escalations',
                            value: '$_escalatedCount',
                            subtitle: 'L1 - L4 accounts',
                            color: AppColors.amberWarning,
                            bgColor: AppColors.amberWarningLight,
                            icon: Icons.shield_moon_outlined,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _buildCockpitKpiCard(
                            title: 'Disputed Invoices',
                            value: '$_disputeCount',
                            subtitle: 'Ledger/bill disputes',
                            color: const Color(0xFF0EA5E9),
                            bgColor: const Color(0xFFE0F2FE),
                            icon: Icons.assignment_late_outlined,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildCockpitKpiCard(
                            title: 'Team Avg RCS',
                            value: '$_avgRcsScore / 100',
                            subtitle: 'Risk intelligence score',
                            color: AppColors.emeraldGreen,
                            bgColor: AppColors.emeraldGreenLight,
                            icon: Icons.verified_user_outlined,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Tab Navigation Container
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TabBar(
                            controller: _tabController,
                            labelColor: AppColors.primaryIndigo,
                            unselectedLabelColor: AppColors.textMuted,
                            indicatorColor: AppColors.primaryIndigo,
                            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                            tabs: [
                              Tab(
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.error_outline, size: 14, color: AppColors.roseOverdue),
                                    const SizedBox(width: 4),
                                    Flexible(child: Text('Promises ($_brokenCount)', overflow: TextOverflow.ellipsis)),
                                  ],
                                ),
                              ),
                              Tab(
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.shield_outlined, size: 14, color: AppColors.amberWarning),
                                    const SizedBox(width: 4),
                                    Flexible(child: Text('SLA ($_escalatedCount)', overflow: TextOverflow.ellipsis)),
                                  ],
                                ),
                              ),
                              Tab(
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.gavel_outlined, size: 14, color: Color(0xFF0EA5E9)),
                                    const SizedBox(width: 4),
                                    Flexible(child: Text('Disputes ($_disputeCount)', overflow: TextOverflow.ellipsis)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 1),

                          AnimatedBuilder(
                            animation: _tabController,
                            builder: (context, _) {
                              final idx = _tabController.index;
                              if (idx == 0) {
                                return _buildBrokenPromisesTab();
                              } else if (idx == 1) {
                                return _buildEscalationsTab();
                              } else {
                                return _buildDisputesTab();
                              }
                            },
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildCockpitKpiCard({
    required String title,
    required String value,
    required String subtitle,
    required Color color,
    required Color bgColor,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title.toUpperCase(),
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: color, letterSpacing: 0.5),
              ),
              Icon(icon, size: 16, color: color),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: color),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }

  // ─── Tab 1: Broken Commitments Queue ──────────────────────────────────────
  Widget _buildBrokenPromisesTab() {
    if (_brokenPromises.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(32),
        child: Center(
          child: Column(
            children: [
              Icon(Icons.check_circle_outline_rounded, size: 44, color: AppColors.emeraldGreen),
              SizedBox(height: 10),
              Text('No Broken Promises!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.emeraldGreen)),
              SizedBox(height: 4),
              Text('All customer payment promises are currently on track.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _brokenPromises.length,
      itemBuilder: (ctx, idx) {
        final item = _brokenPromises[idx];
        final custName = item['customer']?['customer_name'] ?? item['customer_name'] ?? 'Customer';
        final custMobile = item['customer']?['mobile'] ?? item['mobile'] ?? '';
        final custCode = item['customer']?['customer_code'] ?? item['customer_code'] ?? '';
        final expDate = item['expected_payment_date'] ?? item['promise_to_pay_date'];
        final expAmt = item['expected_payment_amount'] ?? item['promise_to_pay_amount'] ?? 0;
        final remark = item['remark'] ?? item['previous_remark'] ?? 'No remark notes';

        return FadeSlideIn(
          index: idx,
          child: Container(
            margin: const EdgeInsets.all(10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.roseOverdueLight.withOpacity(0.3),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.roseOverdue.withOpacity(0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(custName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                          Text('Code: $custCode', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.roseOverdue,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('MISSED PROMISE', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const Divider(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Promised Date: ${_formatDate(expDate)}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.roseOverdue)),
                    Text('Expected: ₹${expAmt.toString()}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppColors.roseOverdue)),
                  ],
                ),
                const SizedBox(height: 6),
                Text('Remark: $remark', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, height: 1.3)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _makePhoneCall(custMobile),
                        icon: const Icon(Icons.phone, size: 14),
                        label: const Text('Call'),
                        style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 6)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _sendWhatsapp(custMobile, custName),
                        icon: const Icon(Icons.message, size: 14, color: AppColors.emeraldGreen),
                        label: const Text('WhatsApp', style: TextStyle(color: AppColors.emeraldGreen)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.emeraldGreen),
                          padding: const EdgeInsets.symmetric(vertical: 6),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ─── Tab 2: SLA Escalated Accounts Queue ──────────────────────────────────
  Widget _buildEscalationsTab() {
    if (_escalatedAccounts.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(32),
        child: Center(
          child: Column(
            children: [
              Icon(Icons.shield_outlined, size: 44, color: AppColors.emeraldGreen),
              SizedBox(height: 10),
              Text('No SLA Escalations!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.emeraldGreen)),
              SizedBox(height: 4),
              Text('No accounts are currently in high SLA risk tiers.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _escalatedAccounts.length,
      itemBuilder: (ctx, idx) {
        final c = _escalatedAccounts[idx];
        final name = c['customer_name'] ?? 'Customer';
        final code = c['customer_code'] ?? '';
        final level = c['escalation_level'] ?? 'L1';
        final totalOut = (c['total_outstanding'] ?? 0).toDouble();
        final overdue = (c['overdue_amount'] ?? 0).toDouble();

        return FadeSlideIn(
          index: idx,
          child: InkWell(
            onTap: () {
              final custObj = Customer.fromJson(c);
              Navigator.push(
                context,
                SmoothPageRoute(page: CustomerDetailScreen(customer: custObj)),
              );
            },
            child: Container(
              margin: const EdgeInsets.all(10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                            Text('Code: $code · Salesman: ${c['salesman_code'] ?? 'N/A'}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.amberWarningLight,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: AppColors.amberWarning),
                        ),
                        child: Text(
                          'TIER $level',
                          style: const TextStyle(color: AppColors.amberWarning, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Total Dues', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                          Text('₹${totalOut.toStringAsFixed(0)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.roseOverdue)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Overdue Amt', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                          Text('₹${overdue.toStringAsFixed(0)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.amberWarning)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ─── Tab 3: Disputed Invoices Queue ───────────────────────────────────────
  Widget _buildDisputesTab() {
    if (_disputedInvoices.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(32),
        child: Center(
          child: Column(
            children: [
              Icon(Icons.gavel_outlined, size: 44, color: AppColors.emeraldGreen),
              SizedBox(height: 10),
              Text('No Disputed Invoices!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.emeraldGreen)),
              SizedBox(height: 4),
              Text('No open invoice ledger disputes recorded.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _disputedInvoices.length,
      itemBuilder: (ctx, idx) {
        final d = _disputedInvoices[idx];
        final custName = d['customer']?['customer_name'] ?? 'Customer';
        final custCode = d['customer']?['customer_code'] ?? '';
        final remark = d['remark'] ?? 'Dispute logged without remark';
        final date = d['followup_date'];

        return FadeSlideIn(
          index: idx,
          child: Container(
            margin: const EdgeInsets.all(10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF0F9FF),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFBAE6FD)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(custName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0EA5E9),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('DISPUTE', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text('Code: $custCode · Logged: ${_formatDate(date)}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                const Divider(height: 14),
                Text('Dispute Details: $remark', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.3)),
              ],
            ),
          ),
        );
      },
    );
  }
}
