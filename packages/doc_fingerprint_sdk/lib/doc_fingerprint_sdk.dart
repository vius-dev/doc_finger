/// Document Fingerprint API — Dart SDK
///
/// Official Dart client for the Document Fingerprint API.
/// Provides document registration, verification, and management.
///
/// ```dart
/// import 'package:doc_fingerprint_sdk/doc_fingerprint_sdk.dart';
///
/// final client = DocFingerprintClient(
///   apiKey: 'your_api_key',
///   baseUrl: 'https://your-project.supabase.co/functions/v1',
/// );
///
/// // Register a document
/// final doc = await client.registerDocument(
///   recipientName: 'John Doe',
///   documentType: 'degree_certificate',
///   issueDate: '2024-01-01',
/// );
///
/// // Verify a document
/// final result = await client.verifyDocument(doc.fingerprintId);
/// print(result.verified);
/// ```
library doc_fingerprint_sdk;

export 'src/client.dart';
export 'src/auth.dart' show HmacSigner;
export 'src/exceptions.dart';
export 'src/models/document.dart';
export 'src/models/verification.dart';
export 'src/models/institution.dart';
export 'src/models/api_key.dart';
