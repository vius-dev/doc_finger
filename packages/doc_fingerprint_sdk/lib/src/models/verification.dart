/// Verification result model.

class VerificationResult {
  final bool verified;
  final String fingerprintId;
  final String status;
  final String statusMessage;
  final VerifiedDocument? document;
  final VerifiedIssuer? issuer;
  final String checkedAt;
  final int responseTimeMs;

  const VerificationResult({
    required this.verified,
    required this.fingerprintId,
    required this.status,
    required this.statusMessage,
    this.document,
    this.issuer,
    required this.checkedAt,
    required this.responseTimeMs,
  });

  factory VerificationResult.fromJson(Map<String, dynamic> json) {
    return VerificationResult(
      verified: json['verified'] as bool? ?? false,
      fingerprintId: json['fingerprint_id'] as String? ?? '',
      status: json['status'] as String? ?? 'unknown',
      statusMessage: json['status_message'] as String? ?? '',
      document: json['document'] != null
          ? VerifiedDocument.fromJson(json['document'] as Map<String, dynamic>)
          : null,
      issuer: json['issuer'] != null
          ? VerifiedIssuer.fromJson(json['issuer'] as Map<String, dynamic>)
          : null,
      checkedAt: json['checked_at'] as String? ?? '',
      responseTimeMs: json['response_time_ms'] as int? ?? 0,
    );
  }
}

class VerifiedDocument {
  final String type;
  final String? subtype;
  final String recipientName;
  final String issueDate;
  final String? expiryDate;

  const VerifiedDocument({
    required this.type,
    this.subtype,
    required this.recipientName,
    required this.issueDate,
    this.expiryDate,
  });

  factory VerifiedDocument.fromJson(Map<String, dynamic> json) {
    return VerifiedDocument(
      type: json['type'] as String? ?? '',
      subtype: json['subtype'] as String?,
      recipientName: json['recipient_name'] as String? ?? '',
      issueDate: json['issue_date'] as String? ?? '',
      expiryDate: json['expiry_date'] as String?,
    );
  }
}

class VerifiedIssuer {
  final String code;
  final String name;
  final String? tradingName;
  final String type;
  final String country;
  final int verificationLevel;

  const VerifiedIssuer({
    required this.code,
    required this.name,
    this.tradingName,
    required this.type,
    required this.country,
    required this.verificationLevel,
  });

  factory VerifiedIssuer.fromJson(Map<String, dynamic> json) {
    return VerifiedIssuer(
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      tradingName: json['trading_name'] as String?,
      type: json['type'] as String? ?? '',
      country: json['country'] as String? ?? '',
      verificationLevel: json['verification_level'] as int? ?? 0,
    );
  }
}
