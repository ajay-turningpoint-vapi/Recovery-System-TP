import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/services/api_service.dart';
import '../../core/constants/api_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/smooth_widgets.dart';
import '../../models/app_models.dart';
import '../auth/login_screen.dart';
import '../customer_detail/customer_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  final User user;
  const DashboardScreen({super.key, required this.user});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with WidgetsBindingObserver {
  int _selectedCategoryIndex = 0; // 0: Customers, 1: Daily Tasks, 2: Recent Collections, 3: Overdue, 4: Salesman Breakdown
  String _searchQuery = '';
  Timer? _debounceTimer;

  // Auto follow-up prompt (triggered when user returns from call/WhatsApp)
  bool _pendingFollowUpPrompt = false;
  String _pendingActionType = 'Phone Call';
  Customer? _pendingCustomer;

  bool _isLoading = true;
  bool _isLoadingMore = false;

  // Pagination states
  int _customerPage = 1;
  bool _hasMoreCustomers = true;
  int _totalCustomersCount = 0;
  final int _pageSize = 20;

  int _taskPage = 1;
  bool _hasMoreTasks = true;
  int _totalTasksCount = 0;

  int _collectionPage = 1;
  bool _hasMoreCollections = true;
  int _totalCollectionsCount = 0;

  int _overduePage = 1;
  bool _hasMoreOverdue = true;

  double _totalDues = 0;
  double _urgentOverdue = 0;

  List<Customer> _customers = [];
  List<DailyTask> _dailyTasks = [];
  List<dynamic> _recentCollections = [];
  List<dynamic> _overdueInvoices = [];
  List<dynamic> _salesmen = [];
  List<dynamic> _salesmanWiseSummary = [];

  // Daily Tasks Filters
  String _taskFilter = 'TODAY'; // TODAY, OVERDUE, TOMORROW, THIS_WEEK, PENDING, COMPLETED
  String _selectedSalesmanCode = '';
  bool _isLoadingTasks = false;

  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scrollController.addListener(_onScroll);
    _fetchDashboardData();
    _fetchSalesmen();
    _fetchSalesmanWiseSummary();
    // Check if app was killed while a call/WhatsApp was in progress
    Future.delayed(const Duration(milliseconds: 800), _checkPendingFollowUp);
  }

  // ─── Persistent Follow-Up Helpers (survive app kill) ────────────────────────
  static const String _pfKey = 'pending_followup';
  static const String _pfCustomerId = 'pf_customer_id';
  static const String _pfCustomerName = 'pf_customer_name';
  static const String _pfCustomerOutstanding = 'pf_customer_outstanding';
  static const String _pfCustomerMobile = 'pf_customer_mobile';
  static const String _pfActionType = 'pf_action_type';
  static const String _pfTimestamp = 'pf_timestamp';

  Future<void> _savePendingFollowUp(Customer customer, String actionType) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_pfKey, true);
    await prefs.setInt(_pfCustomerId, customer.id);
    await prefs.setString(_pfCustomerName, customer.customerName);
    await prefs.setDouble(_pfCustomerOutstanding, customer.totalOutstanding);
    await prefs.setString(_pfCustomerMobile, customer.mobile ?? '');
    await prefs.setString(_pfActionType, actionType);
    await prefs.setInt(_pfTimestamp, DateTime.now().millisecondsSinceEpoch);
  }

  Future<void> _clearPendingFollowUp() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pfKey);
    await prefs.remove(_pfCustomerId);
    await prefs.remove(_pfCustomerName);
    await prefs.remove(_pfCustomerOutstanding);
    await prefs.remove(_pfCustomerMobile);
    await prefs.remove(_pfActionType);
    await prefs.remove(_pfTimestamp);
  }

  Future<void> _checkPendingFollowUp() async {
    if (!mounted) return;
    final prefs = await SharedPreferences.getInstance();
    final hasPending = prefs.getBool(_pfKey) ?? false;
    if (!hasPending) return;

    final timestamp = prefs.getInt(_pfTimestamp) ?? 0;
    final elapsed = DateTime.now().millisecondsSinceEpoch - timestamp;
    // Only prompt if the action happened within the last 24 hours
    if (elapsed > const Duration(hours: 24).inMilliseconds) {
      await _clearPendingFollowUp();
      return;
    }

    final customerId = prefs.getInt(_pfCustomerId) ?? 0;
    final customerName = prefs.getString(_pfCustomerName) ?? 'Customer';
    final outstanding = prefs.getDouble(_pfCustomerOutstanding) ?? 0.0;
    final mobile = prefs.getString(_pfCustomerMobile) ?? '';
    final actionType = prefs.getString(_pfActionType) ?? 'Phone Call';

    // Build a minimal Customer object from persisted data (with required field defaults)
    final customer = Customer(
      id: customerId,
      customerCode: '',
      customerName: customerName,
      totalOutstanding: outstanding,
      overdueAmount: 0,
      creditLimit: 0,
      creditDays: 0,
      invoiceCount: 0,
      mobile: mobile.isEmpty ? null : mobile,
    );

    if (mounted) {
      Future.delayed(const Duration(milliseconds: 300), () {
        if (mounted) _showQuickFollowUpSheet(customer, actionType);
      });
    }
  }

  Future<void> _fetchSalesmanWiseSummary() async {
    try {
      final res = await ApiService.get('${ApiConstants.baseUrl}/dashboard/salesman-wise');
      if (res['success'] == true) {
        setState(() => _salesmanWiseSummary = res['data'] ?? []);
      }
    } catch (e) {
      debugPrint('Salesman-wise fetch error: $e');
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _debounceTimer?.cancel();
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Check both in-memory flag AND persisted state (covers app-killed scenario)
      if (_pendingFollowUpPrompt && _pendingCustomer != null) {
        _pendingFollowUpPrompt = false;
        final customer = _pendingCustomer!;
        final actionType = _pendingActionType;
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) _showQuickFollowUpSheet(customer, actionType);
        });
      } else {
        // App was killed and restarted — check SharedPreferences
        _checkPendingFollowUp();
      }
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      if (_isLoadingMore) return;
      if (_selectedCategoryIndex == 0 && _hasMoreCustomers) {
        _loadMoreCustomers();
      } else if (_selectedCategoryIndex == 1 && _hasMoreTasks) {
        _loadMoreDailyTasks();
      } else if (_selectedCategoryIndex == 2 && _hasMoreCollections) {
        _loadMoreCollections();
      } else if (_selectedCategoryIndex == 3 && _hasMoreOverdue) {
        _loadMoreOverdueInvoices();
      }
    }
  }

  void _onSearchChanged(String val) {
    if (_debounceTimer?.isActive ?? false) _debounceTimer!.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 400), () {
      setState(() {
        _searchQuery = val.trim();
      });
      _fetchDashboardData();
    });
  }

  Future<void> _fetchSalesmen() async {
    try {
      final res = await ApiService.get(ApiConstants.salesmenEndpoint);
      if (res['success'] == true) {
        setState(() => _salesmen = res['data'] ?? []);
      }
    } catch (_) {}
  }

  Future<void> _fetchDashboardData() async {
    setState(() {
      _isLoading = true;
      _customerPage = 1;
      _hasMoreCustomers = true;
      _taskPage = 1;
      _hasMoreTasks = true;
      _collectionPage = 1;
      _hasMoreCollections = true;
      _overduePage = 1;
      _hasMoreOverdue = true;
    });

    try {
      await Future.wait([
        _fetchCustomers(resetPage: true),
        _fetchDailyTasks(resetPage: true),
        _fetchRecentCollections(resetPage: true),
        _fetchOverdueInvoices(resetPage: true),
      ]);
    } catch (e) {
      _showToast('Error loading dashboard data: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // 1. Customers Tab (Server-Side)
  Future<void> _fetchCustomers({bool resetPage = false}) async {
    final page = resetPage ? 1 : _customerPage;
    String custUrl = '${ApiConstants.customersEndpoint}?page=$page&limit=$_pageSize';
    if (_selectedSalesmanCode.isNotEmpty) {
      custUrl += '&salesman_code=${Uri.encodeComponent(_selectedSalesmanCode)}';
    }
    if (_searchQuery.isNotEmpty) {
      custUrl += '&search=${Uri.encodeComponent(_searchQuery)}';
    }

    try {
      final custRes = await ApiService.get(custUrl);
      if (custRes['success'] == true) {
        final list = (custRes['data'] as List).map((c) => Customer.fromJson(c)).toList();
        final totalRecs = custRes['pagination']?['totalRecords'] ?? list.length;

        double total = 0;
        double overdue = 0;
        for (var c in list) {
          total += c.totalOutstanding;
          overdue += c.overdueAmount;
        }

        setState(() {
          _customers = resetPage ? list : [..._customers, ...list];
          _totalDues = total;
          _urgentOverdue = overdue;
          _totalCustomersCount = totalRecs;
          _hasMoreCustomers = _customers.length < totalRecs;
          _customerPage = page;
        });
      }
    } catch (e) {
      _showToast('Failed to load customers');
    }
  }

  Future<void> _loadMoreCustomers() async {
    if (_isLoadingMore || !_hasMoreCustomers) return;
    setState(() => _isLoadingMore = true);
    _customerPage++;
    await _fetchCustomers(resetPage: false);
    setState(() => _isLoadingMore = false);
  }

  // 2. Daily Tasks Tab (Server-Side)
  Future<void> _fetchDailyTasks({bool resetPage = false}) async {
    final page = resetPage ? 1 : _taskPage;
    if (resetPage) {
      setState(() {
        _dailyTasks = [];
        _isLoadingTasks = true;
      });
    }
    String query = 'filter=$_taskFilter&page=$page&limit=$_pageSize';
    if (_selectedSalesmanCode.isNotEmpty) {
      query += '&salesman_code=${Uri.encodeComponent(_selectedSalesmanCode)}';
    }
    if (_searchQuery.isNotEmpty) {
      query += '&search=${Uri.encodeComponent(_searchQuery)}';
    }

    try {
      final taskRes = await ApiService.get('${ApiConstants.followupsEndpoint}/daily-tasks?$query');
      if (taskRes['success'] == true) {
        final list = (taskRes['tasks'] ?? taskRes['data'] ?? []) as List;
        final tasks = list.map((t) => DailyTask.fromJson(t)).toList();
        final totalRecs = taskRes['pagination']?['totalRecords'] ?? tasks.length;

        setState(() {
          _dailyTasks = resetPage ? tasks : [..._dailyTasks, ...tasks];
          _totalTasksCount = totalRecs;
          _hasMoreTasks = _dailyTasks.length < totalRecs;
          _taskPage = page;
        });
      }
    } catch (e) {
      _showToast('Error loading tasks: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoadingTasks = false);
      }
    }
  }

  Future<void> _loadMoreDailyTasks() async {
    if (_isLoadingMore || !_hasMoreTasks) return;
    setState(() => _isLoadingMore = true);
    _taskPage++;
    await _fetchDailyTasks(resetPage: false);
    setState(() => _isLoadingMore = false);
  }

  // 3. Recent Collections Tab (Server-Side)
  Future<void> _fetchRecentCollections({bool resetPage = false}) async {
    final page = resetPage ? 1 : _collectionPage;
    String query = 'page=$page&limit=$_pageSize';
    if (_selectedSalesmanCode.isNotEmpty) {
      query += '&salesman_code=${Uri.encodeComponent(_selectedSalesmanCode)}';
    }
    if (_searchQuery.isNotEmpty) {
      query += '&search=${Uri.encodeComponent(_searchQuery)}';
    }

    try {
      final pymtRes = await ApiService.get('${ApiConstants.paymentsEndpoint}?$query');
      if (pymtRes['success'] == true) {
        final list = pymtRes['data'] ?? [];
        final totalRecs = pymtRes['pagination']?['totalRecords'] ?? list.length;

        setState(() {
          _recentCollections = resetPage ? list : [..._recentCollections, ...list];
          _totalCollectionsCount = totalRecs;
          _hasMoreCollections = _recentCollections.length < totalRecs;
          _collectionPage = page;
        });
      }
    } catch (e) {
      _showToast('Error loading collections: $e');
    }
  }

  Future<void> _loadMoreCollections() async {
    if (_isLoadingMore || !_hasMoreCollections) return;
    setState(() => _isLoadingMore = true);
    _collectionPage++;
    await _fetchRecentCollections(resetPage: false);
    setState(() => _isLoadingMore = false);
  }

  // 4. Overdue Dues Tab (Server-Side)
  Future<void> _fetchOverdueInvoices({bool resetPage = false}) async {
    final page = resetPage ? 1 : _overduePage;
    String query = 'status=OVERDUE&page=$page&limit=$_pageSize';
    if (_selectedSalesmanCode.isNotEmpty) {
      query += '&salesman_code=${Uri.encodeComponent(_selectedSalesmanCode)}';
    }
    if (_searchQuery.isNotEmpty) {
      query += '&search=${Uri.encodeComponent(_searchQuery)}';
    }

    try {
      final invRes = await ApiService.get('${ApiConstants.invoicesEndpoint}?$query');
      if (invRes['success'] == true) {
        final list = invRes['data'] ?? [];
        final totalRecs = invRes['pagination']?['totalRecords'] ?? list.length;

        setState(() {
          _overdueInvoices = resetPage ? list : [..._overdueInvoices, ...list];
          _hasMoreOverdue = _overdueInvoices.length < totalRecs;
          _overduePage = page;
        });
      }
    } catch (e) {
      _showToast('Error loading overdue invoices: $e');
    }
  }

  Future<void> _loadMoreOverdueInvoices() async {
    if (_isLoadingMore || !_hasMoreOverdue) return;
    setState(() => _isLoadingMore = true);
    _overduePage++;
    await _fetchOverdueInvoices(resetPage: false);
    setState(() => _isLoadingMore = false);
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      SmoothPageRoute(page: const LoginScreen()),
    );
  }

  void _makePhoneCall(String? mobile, Customer customer) async {
    if (mobile == null || mobile.trim().isEmpty || mobile == 'null') {
      _showToast('No mobile number registered');
      return;
    }
    final cleanPhone = mobile.replaceAll(RegExp(r'[^0-9+]'), '');
    final Uri url = Uri.parse('tel:$cleanPhone');
    try {
      if (await canLaunchUrl(url)) {
        // Persist to SharedPreferences so it survives app kill
        await _savePendingFollowUp(customer, 'Phone Call');
        setState(() {
          _pendingFollowUpPrompt = true;
          _pendingActionType = 'Phone Call';
          _pendingCustomer = customer;
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
                          await _savePendingFollowUp(customer, 'WhatsApp');
                          setState(() {
                            _pendingFollowUpPrompt = true;
                            _pendingActionType = 'WhatsApp';
                            _pendingCustomer = customer;
                          });
                          await launchUrl(whatsappAppUri, mode: LaunchMode.externalApplication);
                        } else if (await canLaunchUrl(whatsappWebUri)) {
                          await _savePendingFollowUp(customer, 'WhatsApp');
                          setState(() {
                            _pendingFollowUpPrompt = true;
                            _pendingActionType = 'WhatsApp';
                            _pendingCustomer = customer;
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

  // ─── Quick Follow-Up Sheet (shown on resume after call/WhatsApp from dashboard)
  void _showQuickFollowUpSheet(Customer customer, String actionType) {
    final remarkController = TextEditingController();
    final amountController = TextEditingController();
    final now = DateTime.now();
    final hour = now.hour;
    final minute = now.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final hour12 = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    final followupTimeController = TextEditingController(text: '$hour12:$minute $period');

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
                    width: 40, height: 4,
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
                      decoration: BoxDecoration(color: accentLight, borderRadius: BorderRadius.circular(10)),
                      child: Text(actionIcon, style: const TextStyle(fontSize: 22)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('$actionIcon Quick Follow-Up Log',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                          Text('${customer.customerName} · $actionType',
                              style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
                const Divider(height: 24),
                // 1. Type & Status
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedType,
                        decoration: const InputDecoration(labelText: 'Follow-up Type', border: OutlineInputBorder()),
                        items: ['Phone Call', 'WhatsApp', 'Visit', 'Email', 'Payment Commitment', 'Payment Received', 'Other']
                            .map((t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 13))))
                            .toList(),
                        onChanged: (val) => setSheetState(() => selectedType = val ?? actionType),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedStatus,
                        decoration: const InputDecoration(labelText: 'Status', border: OutlineInputBorder()),
                        items: ['Pending', 'Completed', 'Payment Promised', 'Payment Received', 'Customer Not Responding', 'Dispute', 'Postponed', 'Cancelled']
                            .map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 12))))
                            .toList(),
                        onChanged: (val) => setSheetState(() => selectedStatus = val ?? 'Pending'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // 2. Date & Time
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: ctx, initialDate: followupDate,
                            firstDate: DateTime(2020), lastDate: DateTime(2030),
                          );
                          if (picked != null) setSheetState(() => followupDate = picked);
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Follow-up Date', border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.calendar_today, size: 18),
                          ),
                          child: Text('${followupDate.day}/${followupDate.month}/${followupDate.year}',
                              style: const TextStyle(fontSize: 13)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: followupTimeController,
                        decoration: const InputDecoration(
                          labelText: 'Time (e.g. 10:30 AM)', border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.access_time, size: 18),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // 3. Expected Payment
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: amountController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Expected Payment (₹)', border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.currency_rupee, size: 18),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: ctx,
                            initialDate: expectedPaymentDate ?? DateTime.now().add(const Duration(days: 3)),
                            firstDate: DateTime.now(), lastDate: DateTime(2030),
                          );
                          if (picked != null) setSheetState(() => expectedPaymentDate = picked);
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Expected Payment Date', border: OutlineInputBorder(),
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
                // 4. Next Follow-up & Priority
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: ctx,
                            initialDate: nextFollowupDate ?? DateTime.now().add(const Duration(days: 1)),
                            firstDate: DateTime.now(), lastDate: DateTime(2030),
                          );
                          if (picked != null) setSheetState(() => nextFollowupDate = picked);
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Next Follow-up Date', border: OutlineInputBorder(),
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
                        decoration: const InputDecoration(labelText: 'Priority', border: OutlineInputBorder()),
                        items: ['Low', 'Medium', 'High', 'Urgent']
                            .map((p) => DropdownMenuItem(value: p, child: Text(p, style: const TextStyle(fontSize: 13))))
                            .toList(),
                        onChanged: (val) => setSheetState(() => selectedPriority = val ?? 'Medium'),
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
                    hintText: 'e.g. Spoke with customer, promised payment by...',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 20),
                // Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          _clearPendingFollowUp(); // Clear persisted state on skip
                          Navigator.pop(ctx);
                        },
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: const BorderSide(color: AppColors.border),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('SKIP', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.bold)),
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
                              const SnackBar(content: Text('Please enter a remark')),
                            );
                            return;
                          }
                          try {
                            final payload = {
                              'customer_id': customer.id,
                              'followup_date': followupDate.toIso8601String(),
                              'followup_time': followupTimeController.text.trim(),
                              'followup_type': selectedType,
                              'status': selectedStatus,
                              'priority': selectedPriority,
                              'remark': remark,
                              if (nextFollowupDate != null)
                                'next_followup_date': nextFollowupDate!.toIso8601String(),
                              if (expectedPaymentDate != null)
                                'expected_payment_date': expectedPaymentDate!.toIso8601String(),
                              if (amountController.text.trim().isNotEmpty)
                                'expected_payment_amount': double.tryParse(amountController.text.trim()) ?? 0,
                            };
                            final res = await ApiService.post(ApiConstants.followupsEndpoint, payload);
                            if (res['success'] == true) {
                              await _clearPendingFollowUp(); // Clear persisted state on success
                              if (ctx.mounted) Navigator.pop(ctx);
                              _showToast('✅ Follow-up logged successfully!');
                            } else {
                              if (ctx.mounted) {
                                ScaffoldMessenger.of(ctx).showSnackBar(
                                  SnackBar(content: Text(res['message'] ?? 'Failed to save')),
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
                        icon: const Icon(Icons.check_circle_outline, size: 18),
                        label: const Text('SAVE FOLLOW-UP', style: TextStyle(fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: accentColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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

  void _showCollectModal(Customer customer) {
    final amountController = TextEditingController(text: customer.totalOutstanding.toStringAsFixed(0));
    final refController = TextEditingController();
    String selectedMode = 'UPI';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          top: 20,
          left: 20,
          right: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Record Collection - ${customer.customerName}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 10),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Amount Received (₹)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.currency_rupee),
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: selectedMode,
              decoration: const InputDecoration(
                labelText: 'Payment Mode',
                border: OutlineInputBorder(),
              ),
              items: ['Cash', 'UPI', 'Cheque', 'NEFT', 'RTGS']
                  .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                  .toList(),
              onChanged: (val) => selectedMode = val ?? 'UPI',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: refController,
              decoration: const InputDecoration(
                labelText: 'Reference No / UTR / Remarks',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.emeraldGreen),
                onPressed: () async {
                  final amount = double.tryParse(amountController.text) ?? 0;
                  if (amount <= 0) {
                    _showToast('Enter valid amount');
                    return;
                  }
                  try {
                    final res = await ApiService.post(ApiConstants.paymentsEndpoint, {
                      'customer_id': customer.id,
                      'amount': amount,
                      'payment_mode': selectedMode,
                      'reference_number': refController.text,
                    });
                    if (res['success'] == true) {
                      if (!ctx.mounted) return;
                      Navigator.pop(ctx);
                      _showToast('✅ Collection recorded successfully!');
                      _fetchDashboardData();
                    }
                  } catch (e) {
                    _showToast('Error: $e');
                  }
                },
                child: const Text('SAVE PAYMENT COLLECTION', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showToast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    List<Customer> filteredCustomers = _customers.where((c) {
      final q = _searchQuery.toLowerCase();
      final matchSearch = c.customerName.toLowerCase().contains(q) ||
          (c.city != null && c.city!.toLowerCase().contains(q)) ||
          c.customerCode.toLowerCase().contains(q);

      if (_selectedCategoryIndex == 3) {
        return matchSearch && c.overdueAmount > 0;
      }
      return matchSearch;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              backgroundColor: AppColors.primaryIndigoLight,
              child: Text(
                widget.user.name.substring(0, 1).toUpperCase(),
                style: const TextStyle(color: AppColors.primaryIndigo, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.user.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                Text(
                  'Salesman Code: ${widget.user.salesmanCode ?? 'N/A'}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.primaryIndigo),
            onPressed: _fetchDashboardData,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.roseOverdue),
            onPressed: _logout,
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
              onRefresh: _fetchDashboardData,
              child: SingleChildScrollView(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Dual Metric Summary Cards
                    Row(
                      children: [
                        Expanded(
                          child: _buildMetricCard(
                            title: 'Assigned Dues',
                            amount: _totalDues,
                            bgColor: AppColors.primaryIndigoLight,
                            textColor: AppColors.primaryIndigo,
                            icon: Icons.account_balance_wallet,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildMetricCard(
                            title: 'Urgent Overdue',
                            amount: _urgentOverdue,
                            bgColor: AppColors.roseOverdueLight,
                            textColor: AppColors.roseOverdue,
                            icon: Icons.warning_amber_rounded,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // 2. Horizontal Scroll Category Filter Chips
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildCategoryChip(0, 'My Customers', Icons.people, (_totalCustomersCount > 0 ? _totalCustomersCount : _customers.length).toString()),
                          const SizedBox(width: 8),
                          _buildCategoryChip(1, 'My Daily Tasks', Icons.task_alt, (_totalTasksCount > 0 ? _totalTasksCount : _dailyTasks.length).toString()),
                          const SizedBox(width: 8),
                          _buildCategoryChip(2, 'Recent Collections', Icons.receipt_long, (_totalCollectionsCount > 0 ? _totalCollectionsCount : _recentCollections.length).toString()),
                          const SizedBox(width: 8),
                          _buildCategoryChip(4, 'Salesman Breakdown', Icons.badge_outlined, _salesmanWiseSummary.isNotEmpty ? _salesmanWiseSummary.length.toString() : ''),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 3. Search Bar
                    TextField(
                      controller: _searchController,
                      onChanged: _onSearchChanged,
                      decoration: InputDecoration(
                        hintText: 'Search customer, code, voucher, remark...',
                        prefixIcon: const Icon(Icons.search, color: AppColors.textMuted),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  _searchController.clear();
                                  _onSearchChanged('');
                                },
                              )
                            : null,
                        filled: true,
                        fillColor: AppColors.surface,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 3.5. Daily Tasks Filters Sub-Bar (Visible when My Daily Tasks tab is selected)
                    if (_selectedCategoryIndex == 1) ...[
                      // Salesmen Dropdown Filter
                      Row(
                        children: [
                          const Icon(Icons.filter_list, size: 16, color: AppColors.textMuted),
                          const SizedBox(width: 6),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _selectedSalesmanCode.isEmpty ? '' : _selectedSalesmanCode,
                              isDense: true,
                              decoration: InputDecoration(
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                fillColor: AppColors.surface,
                                filled: true,
                              ),
                              items: [
                                const DropdownMenuItem(value: '', child: Text('All Salesmen / Accounts', style: TextStyle(fontSize: 13))),
                                ..._salesmen.map((sm) => DropdownMenuItem<String>(
                                      value: sm['code'],
                                      child: Text('${sm['name']} (${sm['count']})', style: const TextStyle(fontSize: 13)),
                                    )),
                              ],
                              onChanged: (val) {
                                HapticFeedback.selectionClick();
                                setState(() => _selectedSalesmanCode = val ?? '');
                                _fetchDailyTasks(resetPage: true);
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Task Time & Status Filter Pills
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildTaskFilterChip('TODAY', "Today's Tasks", AppColors.primaryIndigo),
                            const SizedBox(width: 6),
                            _buildTaskFilterChip('OVERDUE', 'Overdue Tasks', AppColors.roseOverdue),
                            const SizedBox(width: 6),
                            _buildTaskFilterChip('TOMORROW', 'Tomorrow', AppColors.primaryIndigo),
                            const SizedBox(width: 6),
                            _buildTaskFilterChip('THIS_WEEK', 'This Week', AppColors.primaryIndigo),
                            const SizedBox(width: 6),
                            _buildTaskFilterChip('PENDING', 'All Pending', AppColors.amberWarning),
                            const SizedBox(width: 6),
                            _buildTaskFilterChip('COMPLETED', 'Completed', AppColors.emeraldGreen),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // 4. Main Body Content Based on Selected Tab
                    if (_selectedCategoryIndex == 0 || _selectedCategoryIndex == 3) ...[
                      // Customers View with Infinite Scroll
                      if (filteredCustomers.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(32),
                          child: Center(child: Text('No matching customer records found.')),
                        )
                      else
                        Column(
                          children: [
                            ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: filteredCustomers.length,
                              itemBuilder: (ctx, idx) {
                                final c = filteredCustomers[idx];
                                return FadeSlideIn(
                                  index: idx,
                                  child: _buildCustomerCard(c),
                                );
                              },
                            ),
                            if (_isLoadingMore)
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 16),
                                child: Center(
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                                      SizedBox(width: 10),
                                      Text('Loading more customers...', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                    ] else if (_selectedCategoryIndex == 1) ...[
                      // Daily Tasks View
                      if (_isLoadingTasks && _dailyTasks.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(40),
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(strokeWidth: 2.5),
                                ),
                                SizedBox(height: 12),
                                Text(
                                  'Loading task list...',
                                  style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                                ),
                              ],
                            ),
                          ),
                        )
                      else if (_dailyTasks.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(40),
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.task_alt_outlined, size: 48, color: AppColors.textMuted.withOpacity(0.5)),
                                const SizedBox(height: 12),
                                Text(
                                  _taskFilter == 'OVERDUE'
                                      ? 'No overdue tasks!'
                                      : _taskFilter == 'COMPLETED'
                                          ? 'No completed tasks recorded yet.'
                                          : 'No tasks matching this filter.',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.textMuted),
                                ),
                              ],
                            ),
                          ),
                        )
                      else
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _dailyTasks.length,
                          itemBuilder: (ctx, idx) {
                            final task = _dailyTasks[idx];
                            return FadeSlideIn(
                              index: idx,
                              child: _buildTaskCard(task),
                            );
                          },
                        ),
                    ] else if (_selectedCategoryIndex == 2) ...[
                      // Recent Collections View
                      if (_recentCollections.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(32),
                          child: Center(child: Text('No collections recorded today.')),
                        )
                      else
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _recentCollections.length,
                          itemBuilder: (ctx, idx) {
                            final item = _recentCollections[idx];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              child: ListTile(
                                leading: const CircleAvatar(
                                  backgroundColor: AppColors.emeraldGreenLight,
                                  child: Icon(Icons.check, color: AppColors.emeraldGreen),
                                ),
                                title: Text(item['customer']?['customer_name'] ?? 'Customer', style: const TextStyle(fontWeight: FontWeight.bold)),
                                subtitle: Text('Mode: ${item['payment_mode']} · Ref: ${item['reference_number'] ?? 'N/A'}'),
                                trailing: Text('₹${item['amount']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.emeraldGreen)),
                              ),
                            );
                          },
                        ),
                    ] else if (_selectedCategoryIndex == 4) ...[
                      // Salesman Breakdown View
                      if (_salesmanWiseSummary.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(32),
                          child: Center(child: Text('No salesman data available.')),
                        )
                      else
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _salesmanWiseSummary.length,
                          itemBuilder: (ctx, idx) {
                            final s = _salesmanWiseSummary[idx];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              elevation: 2,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            CircleAvatar(
                                              radius: 18,
                                              backgroundColor: AppColors.primaryIndigoLight,
                                              child: Text(
                                                s['name'] != null && s['name'].toString().isNotEmpty ? s['name'].toString()[0] : 'S',
                                                style: const TextStyle(color: AppColors.primaryIndigo, fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                            const SizedBox(width: 10),
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  s['name'] ?? 'Salesman',
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
                                                ),
                                                Text(
                                                  '${s['salesman_code']} · 📱 ${s['mobile'] ?? 'N/A'}',
                                                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: AppColors.primaryIndigoLight,
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            '${s['total_customers']} Cust',
                                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryIndigo),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const Divider(height: 16),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Total Outstanding', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                            const SizedBox(height: 2),
                                            Text(
                                              '₹${(s['total_outstanding'] ?? 0).toString()}',
                                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.roseOverdue),
                                            ),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Overdue Amount', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                            const SizedBox(height: 2),
                                            Text(
                                              '₹${(s['overdue_amount'] ?? 0).toString()}',
                                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.amberWarning),
                                            ),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Unpaid Bills', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                            const SizedBox(height: 2),
                                            Text(
                                              '${s['total_invoices'] ?? 0} Invoices',
                                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    SizedBox(
                                      width: double.infinity,
                                      child: OutlinedButton.icon(
                                        onPressed: () => _showSalesmanDetailModal(s),
                                        icon: const Icon(Icons.account_circle_outlined, size: 14),
                                        label: const Text('VIEW ALL ACCOUNTS & DETAILS →', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                                        style: OutlinedButton.styleFrom(
                                          padding: const EdgeInsets.symmetric(vertical: 8),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),

                      if (_isLoadingMore)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                    ],
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required double amount,
    required Color bgColor,
    required Color textColor,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: textColor.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: textColor),
              const SizedBox(width: 6),
              Text(title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textColor)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '₹${amount.toStringAsFixed(0)}',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: textColor),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(int index, String label, IconData icon, String badge) {
    final isSelected = _selectedCategoryIndex == index;
    return SmoothTap(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _selectedCategoryIndex = index);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryIndigo : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? AppColors.primaryIndigo : AppColors.border),
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: isSelected ? Colors.white : AppColors.textSecondary),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: isSelected ? Colors.white : AppColors.textPrimary,
              ),
            ),
            if (badge.isNotEmpty) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white.withOpacity(0.2) : AppColors.primaryIndigoLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  badge,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : AppColors.primaryIndigo,
                  ),
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildTaskFilterChip(String filterKey, String label, Color accentColor) {
    final isSelected = _taskFilter == filterKey;
    return GestureDetector(
      onTap: () {
        if (_taskFilter == filterKey && !_isLoadingTasks) return;
        HapticFeedback.selectionClick();
        setState(() {
          _taskFilter = filterKey;
        });
        _fetchDailyTasks(resetPage: true);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? accentColor : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? accentColor : AppColors.border,
            width: isSelected ? 1.5 : 1.0,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: accentColor.withOpacity(0.35),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: AnimatedDefaultTextStyle(
          duration: const Duration(milliseconds: 200),
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : AppColors.textPrimary,
          ),
          child: Text(label),
        ),
      ),
    );
  }

  Widget _buildCustomerCard(Customer c) {
    return RepaintBoundary(
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: InkWell(
          onTap: () {
            HapticFeedback.selectionClick();
            Navigator.push(
              context,
              SmoothPageRoute(page: CustomerDetailScreen(customer: c)),
            );
          },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Customer Name & Overdue Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          c.customerName,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primaryIndigo),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Salesman: ${c.salesmanCode ?? 'N/A'}',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (c.overdueAmount > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.roseOverdueLight,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Overdue ₹${c.overdueAmount.toStringAsFixed(0)}',
                        style: const TextStyle(color: AppColors.roseOverdue, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                ],
              ),
              const Divider(height: 16),

              // Invoices Count & Total Outstanding in RED
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primaryIndigoLight,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${c.invoiceCount} Invoices',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryIndigo),
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('Total Outstanding', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.roseOverdue)),
                      Text(
                        '₹${c.totalOutstanding.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.roseOverdue),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Action Buttons - Row 1: Quick Connect & Followup
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _makePhoneCall(c.mobile, c),
                      icon: const Icon(Icons.phone, size: 14),
                      label: const Text('Call'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _sendWhatsapp(c),
                      icon: const Icon(Icons.message, size: 14, color: AppColors.emeraldGreen),
                      label: const Text('WhatsApp', style: TextStyle(color: AppColors.emeraldGreen, fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.emeraldGreen),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _showAddFollowupModal(customerId: c.id, customerName: c.customerName),
                      icon: const Icon(Icons.add_task, size: 14),
                      label: const Text('Follow-up', style: TextStyle(fontSize: 11)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              // Action Buttons - Row 2: Collect Payment
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _showCollectModal(c),
                  icon: const Icon(Icons.credit_card, size: 14),
                  label: const Text('COLLECT PAYMENT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.emeraldGreen,
                    padding: const EdgeInsets.symmetric(vertical: 8),
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

  void _showAddFollowupModal({int? customerId, required String customerName, dynamic taskId}) {
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
                        isExpanded: true,
                        decoration: const InputDecoration(
                          labelText: 'Follow-up Type',
                          border: OutlineInputBorder(),
                        ),
                        items: ['Phone Call', 'WhatsApp', 'Visit', 'Email', 'Payment Commitment', 'Payment Received', 'Other']
                            .map((t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis)))
                            .toList(),
                        onChanged: (val) => setModalState(() => selectedType = val ?? 'Phone Call'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedStatus,
                        isExpanded: true,
                        decoration: const InputDecoration(
                          labelText: 'Status',
                          border: OutlineInputBorder(),
                        ),
                        items: ['Pending', 'Completed', 'Payment Promised', 'Payment Received', 'Customer Not Responding', 'Dispute', 'Postponed', 'Cancelled']
                            .map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 11), overflow: TextOverflow.ellipsis)))
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
                          _fetchDashboardData();
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

  Widget _buildTaskCard(DailyTask task) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Row 1: Scheduled Date & Time + Status / Priority Badges
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      const Icon(Icons.schedule, size: 14, color: AppColors.primaryIndigo),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${task.followupDate} (${task.followupTime})',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.primaryIndigo),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                Row(
                  children: [
                    task.priority == 'High' || task.priority == 'HIGH'
                        ? PulsingBadge(
                            pulseColor: AppColors.roseOverdue,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.roseOverdueLight,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                task.priority,
                                style: const TextStyle(
                                  color: AppColors.roseOverdue,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          )
                        : Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primaryIndigoLight,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              task.priority,
                              style: const TextStyle(
                                color: AppColors.primaryIndigo,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.amberWarningLight,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        task.status,
                        style: const TextStyle(color: AppColors.amberWarning, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Row 2: Customer Name & Code
            Text(
              task.customerName,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                Text('Code: ${task.customerCode}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                const SizedBox(width: 8),
                Text('· 📱 ${task.mobile}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
              ],
            ),
            const Divider(height: 16),

            // Row 3: Financials & Invoices Count
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Outstanding', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.roseOverdue)),
                    Text(
                      '₹${task.totalOutstanding.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.roseOverdue),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primaryIndigoLight,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${task.invoiceCount} Invoices',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryIndigo),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Previous Remark: ${task.previousRemark}',
                    style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  'Expected: ${task.expectedPaymentAmount != null ? "₹${task.expectedPaymentAmount!.toStringAsFixed(0)}" : "N/A"}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.emeraldGreen),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Action Buttons - Row 1: Quick Connect (Call, WhatsApp, Follow-up)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      HapticFeedback.selectionClick();
                      final c = Customer(
                        id: task.customerId ?? 0,
                        customerCode: task.customerCode,
                        customerName: task.customerName,
                        mobile: task.mobile,
                        creditLimit: 0,
                        creditDays: 0,
                        totalOutstanding: task.totalOutstanding,
                        overdueAmount: task.overdueAmount,
                        invoiceCount: task.invoiceCount,
                      );
                      _makePhoneCall(task.mobile, c);
                    },
                    icon: const Icon(Icons.phone, size: 14),
                    label: const Text('Call'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      HapticFeedback.selectionClick();
                      final c = Customer(
                        id: task.customerId ?? 0,
                        customerCode: task.customerCode,
                        customerName: task.customerName,
                        mobile: task.mobile,
                        creditLimit: 0,
                        creditDays: 0,
                        totalOutstanding: task.totalOutstanding,
                        overdueAmount: task.overdueAmount,
                        invoiceCount: task.invoiceCount,
                      );
                      _sendWhatsapp(c);
                    },
                    icon: const Icon(Icons.message, size: 14, color: AppColors.emeraldGreen),
                    label: const Text('WhatsApp', style: TextStyle(color: AppColors.emeraldGreen, fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.emeraldGreen),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showAddFollowupModal(
                      customerId: task.customerId,
                      customerName: task.customerName,
                      taskId: task.id,
                    ),
                    icon: const Icon(Icons.add_task, size: 14),
                    label: const Text('Follow-up', style: TextStyle(fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            // Action Buttons - Row 2: Collect Payment
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _showCollectModalForTask(task),
                icon: const Icon(Icons.credit_card, size: 14),
                label: const Text('COLLECT PAYMENT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.emeraldGreen,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCollectModalForTask(DailyTask task) {
    final amountController = TextEditingController(text: task.totalOutstanding.toStringAsFixed(0));
    final refController = TextEditingController();
    String selectedMode = 'UPI';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          top: 20,
          left: 20,
          right: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Record Payment - ${task.customerName}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
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
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Collected Amount (₹)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.currency_rupee),
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: selectedMode,
              decoration: const InputDecoration(
                labelText: 'Payment Mode',
                border: OutlineInputBorder(),
              ),
              items: ['Cash', 'UPI', 'Cheque', 'Bank Transfer']
                  .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                  .toList(),
              onChanged: (val) => selectedMode = val ?? 'UPI',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: refController,
              decoration: const InputDecoration(
                labelText: 'Txn Ref / Cheque No / Remarks',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.emeraldGreen),
                onPressed: () async {
                  try {
                    final res = await ApiService.post(ApiConstants.paymentsEndpoint, {
                      'customer_id': task.customerId,
                      'amount': double.tryParse(amountController.text) ?? 0,
                      'payment_mode': selectedMode,
                      'reference_number': refController.text,
                      'payment_date': DateTime.now().toIso8601String().split('T')[0],
                    });
                    if (res['success'] == true) {
                      if (!ctx.mounted) return;
                      Navigator.pop(ctx);
                      _showToast('✅ Payment recorded successfully!');
                      _fetchDashboardData();
                    }
                  } catch (e) {
                    _showToast('Payment error: $e');
                  }
                },
                child: const Text('SUBMIT PAYMENT ENTRY', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSalesmanDetailModal(dynamic s) {
    final String salesmanCode = s['salesman_code'] ?? '';
    final String salesmanName = s['name'] ?? 'Salesman';

    setState(() {
      _selectedCategoryIndex = 0; // Switch tab to My Customers
      _selectedSalesmanCode = salesmanCode;
    });

    _fetchDashboardData();
    _showToast('Showing accounts for $salesmanName ($salesmanCode)');
  }
}
