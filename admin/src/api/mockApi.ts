export interface Institution {
    id: string;
    institution_code: string;
    legal_name: string;
    institution_type: 'university' | 'professional_body' | 'government' | 'corporate';
    country_code: string;
    verification_level: number;
    status: 'pending' | 'active' | 'suspended' | 'terminated';
    created_at: string;
    primary_email: string;
    document_count: number;
    verification_count: number;
}

export interface DashboardStats {
    total_institutions: number;
    active_institutions: number;
    pending_applications: number;
    total_documents: number;
    total_verifications: number;
    growth_rate: number;
}

const MOCK_INSTITUTIONS: Institution[] = [
    {
        id: '1',
        institution_code: 'NOUN-PILOT',
        legal_name: 'National Open University of Nigeria',
        institution_type: 'university',
        country_code: 'NG',
        verification_level: 2,
        status: 'active',
        created_at: '2026-03-01T10:00:00Z',
        primary_email: 'registrar@noun.edu.ng',
        document_count: 845,
        verification_count: 2345
    },
    {
        id: '2',
        institution_code: 'MDCN-PILOT',
        legal_name: 'Medical and Dental Council of Nigeria',
        institution_type: 'professional_body',
        country_code: 'NG',
        verification_level: 2,
        status: 'active',
        created_at: '2026-03-02T11:30:00Z',
        primary_email: 'it@mdcn.gov.ng',
        document_count: 156,
        verification_count: 890
    },
    {
        id: '3',
        institution_code: 'KPSC-PILOT',
        legal_name: 'Kenya Public Service Commission',
        institution_type: 'government',
        country_code: 'KE',
        verification_level: 2,
        status: 'pending',
        created_at: '2026-03-04T09:15:00Z',
        primary_email: 'ict@publicservice.go.ke',
        document_count: 124,
        verification_count: 456
    },
    {
        id: '4',
        institution_code: 'DCM-PILOT',
        legal_name: 'DCM Corporate',
        institution_type: 'corporate',
        country_code: 'ZA',
        verification_level: 1,
        status: 'suspended',
        created_at: '2026-02-28T16:45:00Z',
        primary_email: 'dev@dcmcorporate.co.za',
        document_count: 122,
        verification_count: 201
    }
];

export const mockApi = {
    getStats: (): Promise<DashboardStats> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    total_institutions: 48,
                    active_institutions: 42,
                    pending_applications: 3,
                    total_documents: 12450,
                    total_verifications: 38920,
                    growth_rate: 15.4
                });
            }, 500);
        });
    },

    getInstitutions: (): Promise<Institution[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(MOCK_INSTITUTIONS);
            }, 500);
        });
    },

    getInstitution: (id: string): Promise<Institution | undefined> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(MOCK_INSTITUTIONS.find(i => i.id === id));
            }, 300);
        });
    }
};
