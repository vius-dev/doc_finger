/// Document model for the Document Fingerprint API.

class Document {
  final String id;
  final String fingerprintId;
  final String documentType;
  final String? documentSubtype;
  final String? documentNumber;
  final String recipientName;
  final String issueDate;
  final String? expiryDate;
  final String status;
  final String createdAt;
  final String? sha256Hash;
  final String? institutionId;
  final String? issuingDepartment;
  final Map<String, dynamic> documentMetadata;
  final Map<String, dynamic>? publicDisplay;
  final bool? gracePeriodActive;
  final String? gracePeriodEnd;
  final String? verificationUrl;

  const Document({
    required this.id,
    required this.fingerprintId,
    required this.documentType,
    this.documentSubtype,
    this.documentNumber,
    required this.recipientName,
    required this.issueDate,
    this.expiryDate,
    required this.status,
    required this.createdAt,
    this.sha256Hash,
    this.institutionId,
    this.issuingDepartment,
    this.documentMetadata = const {},
    this.publicDisplay,
    this.gracePeriodActive,
    this.gracePeriodEnd,
    this.verificationUrl,
  });

  factory Document.fromJson(Map<String, dynamic> json) {
    return Document(
      id: json['id'] as String? ?? '',
      fingerprintId: json['fingerprint_id'] as String? ?? '',
      documentType: json['document_type'] as String? ?? '',
      documentSubtype: json['document_subtype'] as String?,
      documentNumber: json['document_number'] as String?,
      recipientName: json['recipient_name'] as String? ?? '',
      issueDate: json['issue_date'] as String? ?? '',
      expiryDate: json['expiry_date'] as String?,
      status: json['status'] as String? ?? 'active',
      createdAt: json['created_at'] as String? ?? '',
      sha256Hash: json['sha256_hash'] as String?,
      institutionId: json['institution_id'] as String?,
      issuingDepartment: json['issuing_department'] as String?,
      documentMetadata:
          (json['document_metadata'] as Map<String, dynamic>?) ?? {},
      publicDisplay: json['public_display'] as Map<String, dynamic>?,
      gracePeriodActive: json['grace_period_active'] as bool?,
      gracePeriodEnd: json['grace_period_end'] as String?,
      verificationUrl: json['verification_url'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'fingerprint_id': fingerprintId,
        'document_type': documentType,
        if (documentSubtype != null) 'document_subtype': documentSubtype,
        if (documentNumber != null) 'document_number': documentNumber,
        'recipient_name': recipientName,
        'issue_date': issueDate,
        if (expiryDate != null) 'expiry_date': expiryDate,
        'status': status,
        'created_at': createdAt,
      };

  /// Whether this document is currently active.
  bool get isActive => status == 'active';

  /// Whether this document is in a grace period.
  bool get isInGracePeriod => status == 'expired_grace' && (gracePeriodActive ?? false);

  /// Days remaining until expiry. Null if no expiry date.
  int? get daysUntilExpiry {
    if (expiryDate == null) return null;
    final expiry = DateTime.tryParse(expiryDate!);
    if (expiry == null) return null;
    return expiry.difference(DateTime.now()).inDays;
  }
}

/// Registration response from the API.
class RegistrationResult {
  final String fingerprintId;
  final String sha256Hash;
  final String status;
  final String? expiryDate;
  final String? verificationUrl;

  const RegistrationResult({
    required this.fingerprintId,
    required this.sha256Hash,
    required this.status,
    this.expiryDate,
    this.verificationUrl,
  });

  factory RegistrationResult.fromJson(Map<String, dynamic> json) {
    return RegistrationResult(
      fingerprintId: json['fingerprint_id'] as String? ?? '',
      sha256Hash: json['sha256_hash'] as String? ?? '',
      status: json['status'] as String? ?? 'active',
      expiryDate: json['expiry_date'] as String?,
      verificationUrl: json['verification_url'] as String?,
    );
  }
}
