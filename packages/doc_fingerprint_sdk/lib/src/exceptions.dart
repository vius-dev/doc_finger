/// API error hierarchy for the Document Fingerprint SDK.

class ApiException implements Exception {
  final String message;
  final String code;
  final int statusCode;
  final Map<String, dynamic>? details;

  const ApiException({
    required this.message,
    required this.code,
    required this.statusCode,
    this.details,
  });

  @override
  String toString() => 'ApiException($code): $message [HTTP $statusCode]';
}

class AuthenticationException extends ApiException {
  const AuthenticationException({
    required super.message,
    super.code = 'AUTHENTICATION_ERROR',
    super.statusCode = 401,
  });
}

class ForbiddenException extends ApiException {
  const ForbiddenException({
    required super.message,
    super.code = 'FORBIDDEN',
    super.statusCode = 403,
  });
}

class NotFoundException extends ApiException {
  const NotFoundException({
    required super.message,
    super.code = 'NOT_FOUND',
    super.statusCode = 404,
  });
}

class ValidationException extends ApiException {
  const ValidationException({
    required super.message,
    super.code = 'VALIDATION_ERROR',
    super.statusCode = 400,
    super.details,
  });
}

class RateLimitException extends ApiException {
  final DateTime? retryAfter;

  const RateLimitException({
    required super.message,
    super.code = 'RATE_LIMIT_EXCEEDED',
    super.statusCode = 429,
    this.retryAfter,
  });
}

class NetworkException extends ApiException {
  const NetworkException({
    required super.message,
    super.code = 'NETWORK_ERROR',
    super.statusCode = 0,
  });
}
