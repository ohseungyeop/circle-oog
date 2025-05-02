import { useEffect, useState, useRef, ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';

const withAuth = (WrappedComponent: ComponentType) => {
    return function ProtectedComponent(props: any) {
        const apiUrl = import.meta.env.VITE_API_URL;
        const navigate = useNavigate();
        const [cookies] = useCookies(['authToken']);
        const [isVerified, setIsVerified] = useState<boolean>(false); // 토큰 검증 상태
        const isChecking = useRef<boolean>(false); // 검증 중인 상태 방지

        useEffect(() => {
            if (isVerified || isChecking.current) {
                return;
            }

            console.log('Current cookies:', cookies);
            console.log('Auth token:', cookies.authToken);

            const token = cookies.authToken;
            if (!token) {
                console.log('No token found');
                navigate('/'); // 토큰이 없으면 로그인 페이지로 이동
                return;
            }

            isChecking.current = true;
            fetch(`${apiUrl}/vos/oog/v1/users/verify`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            .then(response => {
                if (response.status === 401) {
                    // 토큰 만료 시 자동 재발급 시도
                    return fetch(`${apiUrl}/vos/oog/v1/users/refresh`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                }
                return response;
            })
            .then(response => response.json())
            .then(result => {
                if (result.code === 'S') {
                    setIsVerified(true);
                    navigate('/mainPage'); // 인증 성공 시 메인 페이지로 이동
                } else {
                    navigate('/'); // 인증 실패 시 로그인 페이지로 이동
                }
            })
            .catch(() => {
                navigate('/'); // 요청 실패 시 로그인 페이지로 이동
            })
            .finally(() => {
                isChecking.current = false;
            });
        }, [cookies.authToken, apiUrl, isVerified]);

        // 인증 여부와 상관없이 WrappedComponent를 렌더링
        return <WrappedComponent {...props} />;
    };
};

export default withAuth;
