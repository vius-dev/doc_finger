// ignore_for_file: avoid_print

import 'package:doc_fingerprint_sdk/doc_fingerprint_sdk.dart';

/// Example usage of the Document Fingerprint SDK.
void main() async {
  // Initialize the client
  final client = DocFingerprintClient(
    apiKey: 'your_api_key_here',
    baseUrl: 'https://tzulhmrmscedulpldvnk.supabase.co/functions/v1',
  );

  try {
    // ---- Register a document ----
    final registration = await client.registerDocument(
      recipientName: 'John Doe',
      documentType: 'degree_certificate',
      issueDate: '2024-06-15',
      metadata: {
        'degree': 'Bachelor of Science',
        'class': 'First Class',
        'department': 'Computer Science',
      },
    );

    print('✅ Document registered!');
    print('   Fingerprint: ${registration.fingerprintId}');
    print('   Hash: ${registration.sha256Hash}');

    // ---- Verify the document (public, no auth) ----
    final result = await client.verifyDocument(registration.fingerprintId);

    if (result.verified) {
      print('✅ Document verified!');
      print('   Recipient: ${result.document?.recipientName}');
      print('   Issued by: ${result.issuer?.name}');
    } else {
      print('❌ Verification failed: ${result.statusMessage}');
    }

    // ---- List all documents ----
    final docs = await client.listDocuments(status: 'active', limit: 10);
    print('\n📄 Active documents: ${docs.length}');

    for (final doc in docs) {
      final days = doc.daysUntilExpiry;
      print('   ${doc.fingerprintId} → ${doc.recipientName}'
          '${days != null ? " (${days}d left)" : ""}');
    }

    // ---- List API keys ----
    final keys = await client.listApiKeys();
    print('\n🔑 API Keys: ${keys.length}');
    for (final key in keys) {
      print('   ${key.keyPreview} [${key.environment}] ${key.status}');
    }
  } on AuthenticationException catch (e) {
    print('🔒 Auth error: ${e.message}');
  } on NotFoundException catch (e) {
    print('❓ Not found: ${e.message}');
  } on ApiException catch (e) {
    print('⚠️ API error: ${e.message} (${e.code})');
  } finally {
    client.close();
  }
}
