import { useEffect, useState, useRef, ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';

const withAuth = (WrappedComponent: ComponentType) => {
  return function ProtectedComponent(props: any) {
    const apiUrl = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const [cookies] = useCookies(['authToken']);
    const [isVerified, setIsVerified] = useState<boolean>(false); // 토큰 검증 상태
    const isChecking = useRef<boolean>(false); // 검증 중인 상태 방지

    useEffect(() => {
      if (isVerified || isChecking.current) {
        return;
      }

      const token = cookies.authToken;
      if (!token) {
        navigate('/'); // 토큰이 없으면 로그인 페이지로 이동
        return;
      }

      isChecking.current = true;
      console.log("location.pathname:", location.pathname);

      fetch(`${apiUrl}/vos/oog/v1/usr/verify-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(response => response.json())
        .then(data => {
          console.log(data);
          if (data.code === 'S') {
            setIsVerified(true);
            if (location.pathname !== '/mainPage') {
              navigate('/mainPage');
            }
           else if (location.pathname == '/mainPage') {
              navigate('/exportGrid');
           }
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
    }, [cookies.authToken, apiUrl, navigate, isVerified]);

    // ✅ 인증 여부와 상관없이 WrappedComponent를 렌더링
    return <WrappedComponent {...props} />;
  };
};

export default withAuth;
