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
      // 토큰 검증이 이미 완료되었거나, 검증 중일 때는 다시 실행하지 않도록 함
      if (isVerified || isChecking.current) return;

      isChecking.current = true; // 검증 시작

      const token = cookies.authToken;
      if (!token) {
        navigate('/'); // 토큰이 없으면 로그인 페이지로 리디렉션
        return;
      }

      fetch(`${apiUrl}/vos/oog/v1/usr/verify-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(response => response.json())
        .then(data => {
            console.log(data);
          if ('S'===data.code) {
            setIsVerified(true); // 토큰 검증 완료
            navigate('/mainPage');
          } else {
            navigate('/'); // 토큰이 유효하지 않으면 로그인 페이지로 리디렉션
          }
        })
        .catch(() => {
          navigate('/'); // 요청 실패 시 로그인 페이지로 리디렉션
        })
        .finally(() => {
          isChecking.current = false; // 검증 완료 후 상태 변경
        });
    }, [cookies.authToken, navigate]); // 최초 렌더링 시 한 번만 실행되도록 설정

    // 검증 완료되기 전에는 화면을 렌더링하지 않음
    if (!isVerified) {
      return null; // 또는 로딩 스피너나 다른 UI를 보여줄 수 있습니다.
    }

    return <WrappedComponent {...props} />;
  };
};

export default withAuth;
