import 'dart:convert';
import 'package:http/http.dart' as http;

import 'auth.dart';
import 'exceptions.dart';
import 'models/document.dart';
import 'models/verification.dart';
import 'models/institution.dart';
import 'models/api_key.dart';

/// Main client for the Document Fingerprint API.
///
/// ```dart
/// final client = DocFingerprintClient(
///   apiKey: 'your_api_key',
///   baseUrl: 'https://your-project.supabase.co/functions/v1',
/// );
/// ```
class DocFingerprintClient {
  final String apiKey;
  final String baseUrl;
  final Duration timeout;
  final http.Client _httpClient;
  final HmacSigner _signer;

  DocFingerprintClient({
    required this.apiKey,
    required this.baseUrl,
    this.timeout = const Duration(seconds: 30),
    http.Client? httpClient,
  })  : _httpClient = httpClient ?? http.Client(),
        _signer = HmacSigner(apiKey);

  // ==================== DOCUMENTS ====================

  /// Register a new document.
  ///
  /// Returns a [RegistrationResult] with the fingerprint ID and verification URL.
  Future<RegistrationResult> registerDocument({
    required String recipientName,
    required String documentType,
    required String issueDate,
    String? documentSubtype,
    String? documentNumber,
    String? expiryDate,
    Map<String, dynamic>? metadata,
  }) async {
    final body = <String, dynamic>{
      'recipient_name': recipientName,
      'document_type': documentType,
      'issue_date': issueDate,
    };
    if (documentSubtype != null) body['document_subtype'] = documentSubtype;
    if (documentNumber != null) body['document_number'] = documentNumber;
    if (expiryDate != null) body['expiry_date'] = expiryDate;
    if (metadata != null) body['document_metadata'] = metadata;

    final data = await _request('POST', '/documents/', body: body);
    return RegistrationResult.fromJson(data as Map<String, dynamic>);
  }

  /// Get a document by fingerprint ID.
  Future<Document> getDocument(String fingerprintId) async {
    final data = await _request('GET', '/documents/$fingerprintId');
    return Document.fromJson(data as Map<String, dynamic>);
  }

  /// List documents with optional filters.
  Future<List<Document>> listDocuments({
    String? status,
    String? documentType,
    int limit = 20,
    int offset = 0,
  }) async {
    final params = <String, String>{
      'limit': '$limit',
      'offset': '$offset',
    };
    if (status != null && status != 'all') params['status'] = status;
    if (documentType != null) params['type'] = documentType;

    final data = await _request('GET', '/documents/', queryParams: params);
    if (data is List) {
      return data
          .map((d) => Document.fromJson(d as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Revoke a document.
  Future<void> revokeDocument(String fingerprintId, {String? reason}) async {
    await _request(
      'DELETE',
      '/documents/$fingerprintId',
      body: reason != null ? {'reason': reason} : null,
    );
  }

  // ==================== VERIFICATION (PUBLIC) ====================

  /// Verify a document by fingerprint ID.
  ///
  /// This is a public endpoint and does not require authentication.
  Future<VerificationResult> verifyDocument(String fingerprintId) async {
    final data = await _request(
      'GET',
      '/verify/$fingerprintId',
      authenticated: false,
    );
    return VerificationResult.fromJson(data as Map<String, dynamic>);
  }

  /// Bulk verify multiple documents.
  ///
  /// Maximum 50 IDs per request. Public endpoint.
  Future<List<VerificationResult>> verifyBulk(
    List<String> fingerprintIds,
  ) async {
    final data = await _request(
      'POST',
      '/verify/bulk',
      body: {'fingerprint_ids': fingerprintIds},
      authenticated: false,
    );
    if (data is Map && data['results'] is List) {
      return (data['results'] as List)
          .map((r) => VerificationResult.fromJson(r as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  // ==================== INSTITUTIONS ====================

  /// Get institution details by ID.
  Future<Institution> getInstitution(String institutionId) async {
    final data = await _request('GET', '/institutions/$institutionId');
    return Institution.fromJson(data as Map<String, dynamic>);
  }

  /// Update institution settings.
  Future<Institution> updateInstitution(
    String institutionId,
    Map<String, dynamic> fields,
  ) async {
    final data = await _request(
      'PATCH',
      '/institutions/$institutionId',
      body: fields,
    );
    return Institution.fromJson(data as Map<String, dynamic>);
  }

  // ==================== API KEYS ====================

  /// List all API keys for the institution.
  Future<List<ApiKey>> listApiKeys() async {
    final data = await _request('GET', '/auth/keys');
    if (data is List) {
      return data
          .map((k) => ApiKey.fromJson(k as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Revoke an API key.
  Future<void> revokeApiKey(String keyId) async {
    await _request('DELETE', '/auth/keys/$keyId');
  }

  /// Validate the current API key.
  Future<Map<String, dynamic>> validateKey() async {
    final data = await _request('POST', '/auth/keys/validate', body: {});
    return data as Map<String, dynamic>;
  }

  // ==================== INTERNAL ====================

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
    bool authenticated = true,
  }) async {
    // Determine which function to call from the path
    final functionName = _extractFunctionName(path);
    final functionPath = path.replaceFirst('/$functionName', '');

    final uri = Uri.parse('$baseUrl/$functionName$functionPath').replace(
      queryParameters: queryParams?.isNotEmpty == true ? queryParams : null,
    );

    final bodyStr = body != null ? jsonEncode(body) : null;

    final headers = authenticated
        ? _signer.sign(method: method, path: path, body: bodyStr)
        : {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          };

    http.Response response;

    try {
      switch (method) {
        case 'GET':
          response = await _httpClient
              .get(uri, headers: headers)
              .timeout(timeout);
          break;
        case 'POST':
          response = await _httpClient
              .post(uri, headers: headers, body: bodyStr)
              .timeout(timeout);
          break;
        case 'PATCH':
          response = await _httpClient
              .patch(uri, headers: headers, body: bodyStr)
              .timeout(timeout);
          break;
        case 'DELETE':
          response = await _httpClient
              .delete(uri, headers: headers, body: bodyStr)
              .timeout(timeout);
          break;
        default:
          throw ApiException(
            message: 'Unsupported method: $method',
            code: 'INTERNAL',
            statusCode: 0,
          );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw NetworkException(message: 'Request failed: $e');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode >= 400 || json['status'] == 'error') {
      _throwApiException(response.statusCode, json);
    }

    return json['data'];
  }

  String _extractFunctionName(String path) {
    // /documents/xxx → documents
    // /verify/xxx → verify
    // /auth/keys → auth
    // /institutions/xxx → institutions
    final parts = path.split('/').where((p) => p.isNotEmpty).toList();
    return parts.isNotEmpty ? parts.first : '';
  }

  Never _throwApiException(int statusCode, Map<String, dynamic> json) {
    final error = json['error'] as Map<String, dynamic>? ?? {};
    final message = error['message'] as String? ?? 'Unknown error';
    final code = error['code'] as String? ?? 'UNKNOWN';

    switch (statusCode) {
      case 401:
        throw AuthenticationException(message: message);
      case 403:
        throw ForbiddenException(message: message);
      case 404:
        throw NotFoundException(message: message);
      case 422:
      case 400:
        throw ValidationException(message: message, details: error);
      case 429:
        throw RateLimitException(message: message);
      default:
        throw ApiException(
          message: message,
          code: code,
          statusCode: statusCode,
        );
    }
  }

  /// Close the HTTP client. Call when done using the SDK.
  void close() {
    _httpClient.close();
  }
}
