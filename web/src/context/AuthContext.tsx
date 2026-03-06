import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { setApiKey, getApiKey, validateKey, type Institution, getInstitution } from '../services/api';

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    institutionId: string | null;
    institution: Institution | null;
    keyId: string | null;
    permissions: Record<string, boolean>;
    environment: string;
}

interface AuthContextType extends AuthState {
    login: (apiKey: string) => Promise<void>;
    logout: () => void;
    refreshInstitution: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
        isAuthenticated: false,
        isLoading: true,
        institutionId: null,
        institution: null,
        keyId: null,
        permissions: {},
        environment: 'test',
    });

    // Check for existing key on mount
    useEffect(() => {
        const existingKey = getApiKey();
        if (existingKey) {
            validateAndSetSession(existingKey).catch(() => {
                setApiKey(null);
                setState((s) => ({ ...s, isLoading: false }));
            });
        } else {
            setState((s) => ({ ...s, isLoading: false }));
        }
    }, []);

    async function validateAndSetSession(apiKey: string) {
        setApiKey(apiKey);
        try {
            const result = await validateKey();
            const institution = await getInstitution(result.institution_id);

            setState({
                isAuthenticated: true,
                isLoading: false,
                institutionId: result.institution_id,
                institution,
                keyId: result.key_id,
                permissions: result.permissions,
                environment: result.environment,
            });
        } catch (err) {
            setApiKey(null);
            setState({
                isAuthenticated: false,
                isLoading: false,
                institutionId: null,
                institution: null,
                keyId: null,
                permissions: {},
                environment: 'test',
            });
            throw err instanceof Error ? err : new Error('Invalid API key');
        }
    }

    async function login(apiKey: string) {
        setState((s) => ({ ...s, isLoading: true }));
        await validateAndSetSession(apiKey);
    }

    function logout() {
        setApiKey(null);
        setState({
            isAuthenticated: false,
            isLoading: false,
            institutionId: null,
            institution: null,
            keyId: null,
            permissions: {},
            environment: 'test',
        });
    }

    async function refreshInstitution() {
        if (!state.institutionId) return;
        try {
            const institution = await getInstitution(state.institutionId);
            setState((s) => ({ ...s, institution }));
        } catch (err) {
            console.error('Failed to refresh institution:', err);
        }
    }

    return (
        <AuthContext.Provider value={{ ...state, login, logout, refreshInstitution }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
