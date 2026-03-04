-- Phase 6: Seed pilot institutions
-- 4 institutions from the pilot program cohort

INSERT INTO institutions (
  institution_code, legal_name, trading_name, institution_type,
  country_code, verification_level, status, primary_email,
  technical_email, billing_plan, monthly_document_quota
) VALUES
  (
    'NOUN-PILOT',
    'National Open University of Nigeria',
    'NOUN',
    'university',
    'NG',
    2,
    'active',
    'registrar@noun.edu.ng',
    'tech@noun.edu.ng',
    'pilot',
    10000
  ),
  (
    'MDCN-PILOT',
    'Medical and Dental Council of Nigeria',
    'MDCN',
    'professional_body',
    'NG',
    2,
    'active',
    'registrar@mdcn.gov.ng',
    'it@mdcn.gov.ng',
    'pilot',
    10000
  ),
  (
    'KPSC-PILOT',
    'Kenya Public Service Commission',
    'KPSC',
    'government',
    'KE',
    2,
    'active',
    'info@publicservice.go.ke',
    'ict@publicservice.go.ke',
    'pilot',
    10000
  ),
  (
    'DCM-PILOT',
    'DCM Corporate',
    'DCM Corp',
    'corporate',
    'ZA',
    2,
    'active',
    'hr@dcmcorporate.co.za',
    'dev@dcmcorporate.co.za',
    'pilot',
    10000
  )
ON CONFLICT (institution_code) DO NOTHING;
