import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/theme/app_theme.dart';
import 'core/services/api_service.dart';
import 'core/constants/api_constants.dart';
import 'models/app_models.dart';
import 'screens/auth/login_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';

import 'core/widgets/smooth_widgets.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const RecoveryMobileApp());
}

class RecoveryMobileApp extends StatelessWidget {
  const RecoveryMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Turning Point Recovery',
      debugShowCheckedModeBanner: false,
      scrollBehavior: const AppScrollBehavior(),
      theme: AppTheme.lightTheme,
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _checkingAuth = true;
  User? _user;

  @override
  void initState() {
    super.initState();
    _checkExistingToken();
  }

  Future<void> _checkExistingToken() async {
    final prefs = await SharedPreferences.getInstance();
    const String currentVersion = '1.0.0';
    final savedVersion = prefs.getString('app_version');

    // Detect App Update Scenario
    if (savedVersion != null && savedVersion != currentVersion) {
      debugPrint('[App Update detected] Migrating from $savedVersion to $currentVersion');
      // Force token re-sync upon dashboard mount
      await prefs.remove('fcm_permission_asked');
      // Save new version
      await prefs.setString('app_version', currentVersion);
    } else if (savedVersion == null) {
      // Fresh install scenario
      await prefs.setString('app_version', currentVersion);
    }

    final token = prefs.getString('token');

    if (token != null && token.isNotEmpty) {
      try {
        final res = await ApiService.get('${ApiConstants.baseUrl}/auth/me');
        if (res['success'] == true && res['user'] != null) {
          setState(() {
            _user = User.fromJson(res['user']);
          });
        } else {
          // Token invalid, clear all but keep version
          final version = prefs.getString('app_version');
          await prefs.clear();
          if (version != null) await prefs.setString('app_version', version);
        }
      } catch (e) {
        // Network failure or token expired
        final version = prefs.getString('app_version');
        await prefs.clear();
        if (version != null) await prefs.setString('app_version', version);
      }
    } else {
      final version = prefs.getString('app_version');
      await prefs.clear();
      if (version != null) await prefs.setString('app_version', version);
    }

    setState(() => _checkingAuth = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_checkingAuth) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_user != null) {
      return DashboardScreen(user: _user!);
    }

    return const LoginScreen();
  }
}
