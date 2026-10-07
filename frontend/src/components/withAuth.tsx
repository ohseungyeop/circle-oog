import { createContext, useContext, useEffect, useState, ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';

export interface AuthUser {
    email: string;
    admin: boolean;
}

const AuthContext = createContext<AuthUser | null>(null);

/** withAuth 로 감싼 페이지 안에서 현재 로그인한 사용자 */
export const useAuth = () => useContext(AuthContext);

/** 현재 로그인한 사용자를 조회합니다. 로그인 안 되어 있으면 null */
export const fetchMe = async (apiUrl: string): Promise<AuthUser | null> => {
    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/auth/me`, { credentials: 'include' });
        if (!response.ok) return null;
        const result = await response.json();
        return result.code === 'S' ? result.data : null;
    } catch {
        return null;
    }
};

// 세션은 httpOnly 쿠키라 브라우저에서 읽을 수 없으므로 서버(/auth/me)에 확인합니다.
const withAuth = <P extends object>(WrappedComponent: ComponentType<P>) => {
    return function ProtectedComponent(props: P) {
        const apiUrl = import.meta.env.VITE_API_URL;
        const navigate = useNavigate();
        const [user, setUser] = useState<AuthUser | null>(null);

        useEffect(() => {
            let cancelled = false;
            fetchMe(apiUrl).then((me) => {
                if (cancelled) return;
                if (me) {
                    setUser(me);
                } else {
                    navigate('/'); // 로그인 안 되어 있으면 로그인 페이지로 이동
                }
            });
            return () => {
                cancelled = true;
            };
        }, [apiUrl, navigate]);

        // 인증이 확인된 뒤에만 렌더링
        if (!user) return null;
        return (
            <AuthContext.Provider value={user}>
                <WrappedComponent {...props} />
            </AuthContext.Provider>
        );
    };
};

export default withAuth;
