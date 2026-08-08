import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const Duration _timeout = Duration(seconds: 18);

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<Map<String, String>> getHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<dynamic> get(String url) async {
    final headers = await getHeaders();
    try {
      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(_timeout);
      return _processResponse(response);
    } on SocketException {
      throw Exception('No internet connection. Please check your network.');
    } on http.ClientException {
      throw Exception('Could not connect to server. Please try again.');
    }
  }

  static Future<dynamic> post(String url, Map<String, dynamic> body) async {
    final headers = await getHeaders();
    try {
      final response = await http
          .post(Uri.parse(url), headers: headers, body: jsonEncode(body))
          .timeout(_timeout);
      return _processResponse(response);
    } on SocketException {
      throw Exception('No internet connection. Please check your network.');
    } on http.ClientException {
      throw Exception('Could not connect to server. Please try again.');
    }
  }

  static Future<dynamic> put(String url, Map<String, dynamic> body) async {
    final headers = await getHeaders();
    try {
      final response = await http
          .put(Uri.parse(url), headers: headers, body: jsonEncode(body))
          .timeout(_timeout);
      return _processResponse(response);
    } on SocketException {
      throw Exception('No internet connection. Please check your network.');
    } on http.ClientException {
      throw Exception('Could not connect to server. Please try again.');
    }
  }

  static Future<dynamic> patch(String url, Map<String, dynamic> body) async {
    final headers = await getHeaders();
    try {
      final response = await http
          .patch(Uri.parse(url), headers: headers, body: jsonEncode(body))
          .timeout(_timeout);
      return _processResponse(response);
    } on SocketException {
      throw Exception('No internet connection. Please check your network.');
    } on http.ClientException {
      throw Exception('Could not connect to server. Please try again.');
    }
  }

  static dynamic _processResponse(http.Response response) {
    if (response.body.isEmpty) {
      throw Exception('Empty response from server');
    }
    final body = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    } else if (response.statusCode == 401) {
      throw Exception('Session expired. Please log in again.');
    } else if (response.statusCode == 403) {
      throw Exception('Access denied. Insufficient permissions.');
    } else if (response.statusCode >= 500) {
      throw Exception('Server error. Please try again later.');
    } else {
      throw Exception(body['message'] ?? 'Request failed (${response.statusCode})');
    }
  }
}
