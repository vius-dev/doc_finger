import 'dart:convert';
import 'package:crypto/crypto.dart';

/// HMAC-SHA256 request signer for API authentication.
class HmacSigner {
  final String apiKey;

  const HmacSigner(this.apiKey);

  /// Generate authentication headers for a request.
  ///
  /// Returns a map with Authorization, X-Timestamp, and X-Signature headers.
  Map<String, String> sign({
    required String method,
    required String path,
    String? body,
  }) {
    final timestamp = DateTime.now().toUtc().toIso8601String();

    // Build the message to sign: timestamp\nMETHOD\n/path\nbody
    final message = '$timestamp\n$method\n$path\n${body ?? ''}';

    // HMAC-SHA256 signature
    final hmacSha256 = Hmac(sha256, utf8.encode(apiKey));
    final digest = hmacSha256.convert(utf8.encode(message));
    final signature = base64Encode(digest.bytes);

    return {
      'Authorization': 'Bearer $apiKey',
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'DocFingerprint-Dart-SDK/1.0.0',
    };
  }
}
