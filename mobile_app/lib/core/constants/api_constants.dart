class ApiConstants {
  // Use 10.0.2.2 for Android Emulator, or 192.168.1.127 for Physical Phone on Wi-Fi
  static const String emulatorIp = '10.0.2.2';
  static const String localWifiIp = '192.168.1.127';

  // Active base URL configuration (Defaults to local Wi-Fi IP for APK / physical phone testing, fallback emulator)
  static const String baseUrl = 'http://$localWifiIp:5001/api';

  static const String loginEndpoint = '$baseUrl/auth/login';
  static const String customersEndpoint = '$baseUrl/customers';
  static const String invoicesEndpoint = '$baseUrl/invoices';
  static const String paymentsEndpoint = '$baseUrl/payments';
  static const String followupsEndpoint = '$baseUrl/followups';
  static const String whatsappEndpoint = '$baseUrl/whatsapp/send';
  static const String salesmenEndpoint = '$baseUrl/users/salesmen';
}
