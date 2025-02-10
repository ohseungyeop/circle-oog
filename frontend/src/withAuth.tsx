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
      console.log(isVerified + ":" + isChecking.current);
      
      // 검증이 완료된 후에는 리디렉션을 하지 않음
      if (isVerified || isChecking.current) {
        return; // 인증이 완료되었으면 더 이상 인증을 시도하지 않음
      }

      isChecking.current = true; // 검증 시작

      const token = cookies.authToken;
      if (!token) {
        return; // 토큰이 없으면 아무 작업도 안 함 (로그인 페이지 그대로 보여줘야 함)
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
          if ('S' === data.code) {
            setIsVerified(true); // 토큰 검증 완료
            navigate('/mainPage'); // 인증 성공 시 mainPage로 리디렉션
          } else {
            navigate('/'); // 인증 실패 시 로그인 페이지로 리디렉션
          }
        })
        .catch(() => {
          navigate('/'); // 요청 실패 시 로그인 페이지로 리디렉션
        })
        .finally(() => {
          isChecking.current = false; // 검증 완료 후 상태 변경
        });
    }, [cookies.authToken, navigate]); // 최초 렌더링 시 한 번만 실행되도록 설정

    // 인증이 완료되기 전까지는 SignIn 화면을 보여주어야 하므로,
    // 화면을 렌더링하거나 로딩 UI를 표시합니다.
    if (!isVerified) {
      return <WrappedComponent {...props} />;
    }

    // 인증이 완료되었을 때는 WrappedComponent를 렌더링하지 않음
    return null;
  };
};

export default withAuth;
