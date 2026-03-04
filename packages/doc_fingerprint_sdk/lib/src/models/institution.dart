/// Institution model.

class Institution {
  final String id;
  final String institutionCode;
  final String legalName;
  final String? tradingName;
  final String institutionType;
  final String countryCode;
  final int verificationLevel;
  final String status;
  final String primaryEmail;
  final String? technicalEmail;
  final String billingPlan;
  final int currentMonthUsage;
  final int? monthlyDocumentQuota;

  const Institution({
    required this.id,
    required this.institutionCode,
    required this.legalName,
    this.tradingName,
    required this.institutionType,
    required this.countryCode,
    required this.verificationLevel,
    required this.status,
    required this.primaryEmail,
    this.technicalEmail,
    required this.billingPlan,
    required this.currentMonthUsage,
    this.monthlyDocumentQuota,
  });

  factory Institution.fromJson(Map<String, dynamic> json) {
    return Institution(
      id: json['id'] as String? ?? '',
      institutionCode: json['institution_code'] as String? ?? '',
      legalName: json['legal_name'] as String? ?? '',
      tradingName: json['trading_name'] as String?,
      institutionType: json['institution_type'] as String? ?? '',
      countryCode: json['country_code'] as String? ?? '',
      verificationLevel: json['verification_level'] as int? ?? 0,
      status: json['status'] as String? ?? 'pending',
      primaryEmail: json['primary_email'] as String? ?? '',
      technicalEmail: json['technical_email'] as String?,
      billingPlan: json['billing_plan'] as String? ?? 'free',
      currentMonthUsage: json['current_month_usage'] as int? ?? 0,
      monthlyDocumentQuota: json['monthly_document_quota'] as int?,
    );
  }

  /// Remaining documents in the quota for the current month.
  int? get remainingQuota {
    if (monthlyDocumentQuota == null) return null;
    return monthlyDocumentQuota! - currentMonthUsage;
  }
}
