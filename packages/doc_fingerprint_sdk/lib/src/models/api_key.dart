/// API Key model.

class ApiKey {
  final String keyId;
  final String keyPreview;
  final String? name;
  final String environment;
  final String status;
  final String createdAt;
  final String expiresAt;
  final String? lastUsedAt;
  final String? fullKey; // Only returned on creation

  const ApiKey({
    required this.keyId,
    required this.keyPreview,
    this.name,
    required this.environment,
    required this.status,
    required this.createdAt,
    required this.expiresAt,
    this.lastUsedAt,
    this.fullKey,
  });

  factory ApiKey.fromJson(Map<String, dynamic> json) {
    return ApiKey(
      keyId: json['key_id'] as String? ?? '',
      keyPreview: json['key_preview'] as String? ?? '',
      name: json['name'] as String?,
      environment: json['environment'] as String? ?? 'test',
      status: json['status'] as String? ?? 'active',
      createdAt: json['created_at'] as String? ?? '',
      expiresAt: json['expires_at'] as String? ?? '',
      lastUsedAt: json['last_used_at'] as String?,
      fullKey: json['full_key'] as String?,
    );
  }

  /// Whether this key is currently active and not expired.
  bool get isActive => status == 'active';
}
